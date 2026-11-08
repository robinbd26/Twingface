'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CallMediaType, CallPeer } from '@/lib/realtime';
import { buildIceServers, createCallId, isCallSupported } from '@/lib/webrtc';
import { startRinging, type ToneHandle } from '@/lib/ringtone';

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended';

export type CallState = {
  status: CallStatus;
  callId: string | null;
  peer: CallPeer | null;
  mediaType: CallMediaType;
  micEnabled: boolean;
  cameraEnabled: boolean;
  error: string | null;
};

type IncomingCall = { callId: string; peer: CallPeer; mediaType: CallMediaType; sdp: RTCSessionDescriptionInit };

type CallContextValue = CallState & {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  supported: boolean;
  startCall: (peer: CallPeer, mediaType: CallMediaType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
};

const initial: CallState = {
  status: 'idle',
  callId: null,
  peer: null,
  mediaType: 'audio',
  micEnabled: true,
  cameraEnabled: true,
  error: null,
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const [state, setState] = useState<CallState>(initial);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const supported = useMemo(() => isCallSupported(), []);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  const ringToneRef = useRef<ToneHandle | null>(null);
  // The current call id, mirrored into a ref so async ICE/answer handlers can
  // read it without closing over stale state.
  const callIdRef = useRef<string | null>(null);
  const peerRef = useRef<CallPeer | null>(null);
  // Guard against answering a call the local user is already on.
  const busyRef = useRef(false);
  // Fires "no answer" if the callee never picks up, so the caller isn't stuck
  // on "Ringing…" forever. Cleared on answer / reject / end / cleanup.
  const noAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ICE candidates that arrive before the remote description is set are
  // queued here and flushed once setRemoteDescription succeeds. Without this,
  // early trickle candidates are silently dropped and the call never connects.
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  // Set once we attempt an ICE restart on a failing connection, so a stubborn
  // network fails exactly once into the error state instead of restart-looping.
  const restartAttemptedRef = useRef(false);

  const stopRingTone = useCallback(() => {
    ringToneRef.current?.stop();
    ringToneRef.current = null;
  }, []);

  const clearNoAnswerTimer = useCallback(() => {
    if (noAnswerTimerRef.current) {
      clearTimeout(noAnswerTimerRef.current);
      noAnswerTimerRef.current = null;
    }
  }, []);

  const sendSignal = useCallback(async (kind: string, toUserId: string, extra: Record<string, unknown>) => {
    try {
      await fetch('/api/calls/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, toUserId, ...extra }),
      });
    } catch {
      /* signalling is best-effort; the call will time out on the other side */
    }
  }, []);

  // Stop all media and close the connection WITHOUT touching call state.
  // Used on unmount (including React StrictMode's simulated remount) so a
  // teardown never manufactures a phantom "Unknown / Call ended" screen.
  const teardownMedia = useCallback(() => {
    stopRingTone();
    clearNoAnswerTimer();
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    incomingRef.current = null;
    callIdRef.current = null;
    peerRef.current = null;
    busyRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
  }, [clearNoAnswerTimer, stopRingTone]);

  const cleanup = useCallback((next: CallStatus = 'ended') => {
    teardownMedia();
    // Preserve any error already in state (e.g. "Call declined"); only the
    // status changes here so the overlay can show the outcome before it resets.
    setState((current) => ({ ...current, status: next }));
  }, [teardownMedia]);

  const createPeerConnection = useCallback((callId: string, peer: CallPeer) => {
    // Close any leftover connection from a previous attempt first — a stale
    // RTCPeerConnection holds the mic/camera tracks and ICE agent, which is
    // why a 2nd call right after a failed one could never connect.
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    pendingIceRef.current = [];
    restartAttemptedRef.current = false;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    // Ensure a remote MediaStream exists so <video> can bind even before the
    // first track arrives.
    const stream = new MediaStream();
    remoteStreamRef.current = stream;
    setRemoteStream(stream);

    pc.ontrack = (event) => {
      const current = remoteStreamRef.current;
      if (current) {
        current.addTrack(event.track);
        setRemoteStream(new MediaStream(current.getTracks()));
      }
      setState((prev) => (prev.status === 'connecting' ? { ...prev, status: 'active' } : prev));
    };

    pc.onicecandidate = (event) => {
      void sendSignal('ice', peer.id, { callId, candidate: event.candidate ? event.candidate.toJSON() : null });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setState((prev) => ({ ...prev, status: 'active' }));
      } else if (pc.connectionState === 'failed') {
        // Single ICE-restart attempt before surfacing failure — transient NAT
        // issues (typical on localhost ↔ ngrok pairs) often heal here.
        if (!restartAttemptedRef.current) {
          restartAttemptedRef.current = true;
          try {
            void (async () => {
              try {
                const restartOffer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(restartOffer);
                await sendSignal('offer-restart', peer.id, { callId, sdp: pc.localDescription?.toJSON() ?? restartOffer });
              } catch { /* restart failed; the failed state fires again below */ }
            })();
            return;
          } catch { /* fall through to the error state */ }
        }
        setState((prev) => (prev.status === 'idle' || prev.status === 'ended' ? prev : { ...prev, error: 'The call could not connect. Check that both devices are on the internet and try again.' }));
      } else if (pc.connectionState === 'closed') {
        setState((prev) => (prev.status === 'idle' || prev.status === 'ended' ? prev : { ...prev, error: 'The call could not connect.' }));
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sendSignal]);

  const acquireMedia = useCallback(async (mediaType: CallMediaType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mediaType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    // A re-used OS-level track can come back disabled; force it on so the
    // first call after a previous mute/camera-off isn't silently one-way.
    stream.getTracks().forEach((track) => { track.enabled = true; });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const startCall = useCallback(async (peer: CallPeer, mediaType: CallMediaType) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const callId = createCallId();
    callIdRef.current = callId;
    peerRef.current = peer;
    setState({ status: 'outgoing', callId, peer, mediaType, micEnabled: true, cameraEnabled: mediaType === 'video', error: null });

    try {
      const stream = await acquireMedia(mediaType);
      const pc = createPeerConnection(callId, peer);
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal('offer', peer.id, { callId, mediaType, sdp: pc.localDescription?.toJSON() ?? offer });

      // Outgoing ringback tone until the call connects.
      ringToneRef.current = startRinging();

      // If the callee never answers, stop ringing after 45s with a clear
      // message instead of hanging on "Ringing…" forever.
      clearNoAnswerTimer();
      noAnswerTimerRef.current = setTimeout(() => {
        noAnswerTimerRef.current = null;
        if (callIdRef.current !== callId) return;
        setState((prev) => (prev.callId !== callId || prev.status === 'idle' || prev.status === 'ended' ? prev : { ...prev, status: 'ended', error: 'No answer. They did not pick up.' }));
        cleanup('ended');
      }, 45_000);
    } catch {
      setState((prev) => ({ ...prev, status: 'ended', error: 'Could not access your microphone or camera.' }));
      cleanup('ended');
    }
  }, [acquireMedia, cleanup, clearNoAnswerTimer, createPeerConnection, sendSignal]);

  const acceptCall = useCallback(async () => {
    const incoming = incomingRef.current;
    if (!incoming) return;
    busyRef.current = true;
    stopRingTone();
    try {
      const stream = await acquireMedia(incoming.mediaType);
      const pc = createPeerConnection(incoming.callId, incoming.peer);
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      await pc.setRemoteDescription(new RTCSessionDescription(incoming.sdp));
      // Flush candidates that trickled in while the callee was deciding.
      const queued = pendingIceRef.current;
      pendingIceRef.current = [];
      for (const init of queued) {
        pc.addIceCandidate(new RTCIceCandidate(init)).catch(() => { /* stale candidate; ignore */ });
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal('answer', incoming.peer.id, { callId: incoming.callId, sdp: pc.localDescription?.toJSON() ?? answer });

      callIdRef.current = incoming.callId;
      peerRef.current = incoming.peer;
      incomingRef.current = null;
      setState({ status: 'connecting', callId: incoming.callId, peer: incoming.peer, mediaType: incoming.mediaType, micEnabled: true, cameraEnabled: incoming.mediaType === 'video', error: null });
    } catch {
      setState((prev) => ({ ...prev, status: 'ended', error: 'Could not access your microphone or camera.' }));
      cleanup('ended');
    }
  }, [acquireMedia, cleanup, createPeerConnection, sendSignal, stopRingTone]);

  const rejectCall = useCallback(() => {
    const incoming = incomingRef.current;
    stopRingTone();
    if (incoming) void sendSignal('reject', incoming.peer.id, { callId: incoming.callId });
    incomingRef.current = null;
    cleanup('ended');
  }, [cleanup, sendSignal, stopRingTone]);

  const endCall = useCallback(() => {
    const callId = callIdRef.current;
    const peer = peerRef.current;
    if (callId && peer) void sendSignal('end', peer.id, { callId });
    cleanup('ended');
  }, [cleanup, sendSignal]);

  const toggleMic = useCallback(() => {
    setState((prev) => {
      const next = !prev.micEnabled;
      localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
      return { ...prev, micEnabled: next };
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setState((prev) => {
      const next = !prev.cameraEnabled;
      localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
      return { ...prev, cameraEnabled: next };
    });
  }, []);

  // Listen for signalling events over SSE. Disabled for a visitor: the stream requires a
  // session, so opening it anyway fails with 401 on every public page.
  useEffect(() => {
    if (!enabled) return;
    const source = new EventSource('/api/calls/stream');
    source.onmessage = async (event) => {
      let parsed: ({ type?: string } & Record<string, unknown>) | null = null;
      try { parsed = JSON.parse(event.data); } catch { return; }
      if (!parsed?.type) return;

      switch (parsed.type) {
        case 'call-offer': {
          const callId = parsed.callId as string | undefined;
          const from = parsed.from as CallPeer | undefined;
          const sdp = parsed.sdp as RTCSessionDescriptionInit | undefined;
          if (!callId || !from?.id || !sdp) return;
          if (busyRef.current || incomingRef.current) {
            // Already on a call (or already ringing) — auto-decline a second incoming call.
            void sendSignal('reject', from.id, { callId });
            return;
          }
          incomingRef.current = {
            callId,
            peer: from,
            mediaType: (parsed.mediaType as CallMediaType) ?? 'audio',
            sdp,
          };
          callIdRef.current = callId;
          peerRef.current = from;
          setState({ status: 'incoming', callId, peer: from, mediaType: (parsed.mediaType as CallMediaType) ?? 'audio', micEnabled: true, cameraEnabled: (parsed.mediaType as CallMediaType) === 'video', error: null });
          ringToneRef.current = startRinging();
          break;
        }
        case 'call-offer-restart': {
          const pc = pcRef.current;
          const sdp = parsed.sdp as RTCSessionDescriptionInit | undefined;
          if (!pc || (parsed.callId as string) !== callIdRef.current || !sdp) return;
          // Mid-call ICE restart: the other side generated fresh ICE
          // credentials. Apply as a remote offer, answer, and set local —
          // both sides then re-gather candidates on the new ufrag.
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            // Flush any candidates queued while the restart was in flight.
            const queued = pendingIceRef.current;
            pendingIceRef.current = [];
            for (const init of queued) {
              pc.addIceCandidate(new RTCIceCandidate(init)).catch(() => { /* stale candidate; ignore */ });
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            const peer = peerRef.current;
            if (peer) await sendSignal('answer', peer.id, { callId: parsed.callId as string, sdp: pc.localDescription?.toJSON() ?? answer });
          } catch {
            setState((prev) => (prev.status === 'idle' || prev.status === 'ended' ? prev : { ...prev, error: 'The call could not connect. Check that both devices are on the internet and try again.' }));
          }
          break;
        }
        case 'call-answer': {
          const pc = pcRef.current;
          if (!pc || (parsed.callId as string) !== callIdRef.current) return;
          stopRingTone();
          clearNoAnswerTimer();
          pc.setRemoteDescription(new RTCSessionDescription(parsed.sdp as RTCSessionDescriptionInit))
            .then(() => {
              const queued = pendingIceRef.current;
              pendingIceRef.current = [];
              for (const init of queued) {
                pc.addIceCandidate(new RTCIceCandidate(init)).catch(() => { /* stale candidate; ignore */ });
              }
              setState((prev) => {
                if (prev.status === 'idle' || prev.status === 'ended' || prev.callId !== callIdRef.current) return prev;
                // If the tracks are already flowing, skip 'connecting' and show
                // Connected immediately; otherwise onconnectionstatechange /
                // ontrack promotes us as soon as media arrives.
                const flowing = pc.getReceivers().some((receiver) => receiver.track?.readyState === 'live');
                return { ...prev, status: flowing ? 'active' : 'connecting', error: null };
              });
            })
            .catch(() => setState((prev) => (prev.status === 'idle' || prev.status === 'ended' ? prev : { ...prev, error: 'The call could not connect. Check that both devices are on the internet and try again.' })));
          break;
        }
        case 'call-ice': {
          const candidate = parsed.candidate as RTCIceCandidateInit | null;
          if (!candidate || (parsed.callId as string) !== callIdRef.current) return;
          const pc = pcRef.current;
          if (!pc || !pc.remoteDescription) {
            // Remote description not set yet (e.g. callee hasn't accepted, or
            // the answer is still in flight) — queue for the flush above.
            pendingIceRef.current.push(candidate);
            return;
          }
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => { /* stale candidate; ignore */ });
          break;
        }
        case 'call-reject': {
          if (callIdRef.current === null || (parsed.callId as string) !== callIdRef.current) return;
          stopRingTone();
          clearNoAnswerTimer();
          setState((prev) => (prev.status === 'idle' ? prev : { ...prev, status: 'ended', error: 'Call declined.' }));
          cleanup('ended');
          break;
        }
        case 'call-end': {
          if (callIdRef.current === null || (parsed.callId as string) !== callIdRef.current) return;
          stopRingTone();
          clearNoAnswerTimer();
          setState((prev) => (prev.status === 'idle' ? prev : { ...prev, status: 'ended', error: null }));
          cleanup('ended');
          break;
        }
      }
    };
    return () => source.close();
  }, [cleanup, clearNoAnswerTimer, sendSignal, stopRingTone, enabled]);

  // After a call ends, briefly show the outcome ("Call ended" / "Call
  // declined") and then reset to idle so the overlay dismisses automatically.
  useEffect(() => {
    if (state.status !== 'ended') return;
    const timer = setTimeout(() => {
      setState(initial);
    }, 1800);
    return () => clearTimeout(timer);
  }, [state.status]);

  // Tear down media silently on unmount (navigation, logout). This must NOT
  // touch call state — a state change here is what manufactured the phantom
  // "Unknown / Call ended" screen under React StrictMode's simulated remount.
  useEffect(() => () => { teardownMedia(); }, [teardownMedia]);

  const value = useMemo<CallContextValue>(
    () => ({ ...state, localStream, remoteStream, supported, startCall, acceptCall, rejectCall, endCall, toggleMic, toggleCamera }),
    [state, localStream, remoteStream, supported, startCall, acceptCall, rejectCall, endCall, toggleMic, toggleCamera],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider.');
  return context;
}
