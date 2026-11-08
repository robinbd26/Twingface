'use client';

import { useEffect, useRef } from 'react';
import { useCall } from './call-context';
import { PhoneIcon, VideoIcon, MicIcon, MicOffIcon, CameraOffIcon } from '@/components/dashboard/icons';

// Bind a MediaStream to a <video>/<audio> element and keep it in sync.
function useMediaStream(stream: MediaStream | null, muted: boolean) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.srcObject = stream;
    if (stream) void element.play().catch(() => { /* autoplay may need a gesture; media still flows */ });
  }, [stream]);
  return { ref, muted };
}

// Bind a MediaStream to an <audio> element for voice calls. A dedicated hook
// (separate from the <video> one above) because audio-only calls never mount
// a <video> tag — without this the remote voice had nowhere to play, so the
// overlay showed "Connected" while staying silent.
function useAudioStream(stream: MediaStream | null) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.srcObject = stream;
    if (stream) void element.play().catch(() => { /* autoplay may need a gesture; media still flows */ });
  }, [stream]);
  return ref;
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'T';
}

function statusLabel(status: string, mediaType: string): string {
  switch (status) {
    case 'outgoing': return `Ringing… (${mediaType === 'video' ? 'video' : 'voice'} call)`;
    case 'incoming': return `Incoming ${mediaType === 'video' ? 'video' : 'voice'} call`;
    case 'connecting': return 'Connecting…';
    case 'active': return 'Connected';
    case 'ended': return 'Call ended';
    default: return '';
  }
}

// The full-screen call overlay shown for every non-idle call state. Audio-only
// calls render the remote peer's avatar; video calls render live <video> tiles.
export default function CallOverlay() {
  const { status, peer, mediaType, localStream, remoteStream, micEnabled, cameraEnabled, error, acceptCall, rejectCall, endCall, toggleMic, toggleCamera } = useCall();

  const remote = useMediaStream(remoteStream, false);
  const local = useMediaStream(localStream, true);
  const remoteAudioRef = useAudioStream(remoteStream);

  if (status === 'idle') return null;

  const isVideo = mediaType === 'video';
  const incoming = status === 'incoming';

  return (
    <div className='call-overlay' role='dialog' aria-modal='true' aria-label={peer ? `Call with ${peer.name}` : 'Call'} data-testid='call-overlay' data-status={status}>
      <div className={`call-stage${isVideo ? ' video' : ''}`}>
        {isVideo ? (
          <video ref={remote.ref} className='call-remote-video' autoPlay playsInline muted={remote.muted} />
        ) : (
          <div className='call-peer'>
            {peer?.profileImage ? (
              <img className='call-peer-avatar' src={peer.profileImage} alt='' />
            ) : (
              <span className='call-peer-avatar call-peer-fallback' aria-hidden='true'>{peer ? initials(peer.name) : 'T'}</span>
            )}
            <strong>{peer?.name ?? 'Unknown'}</strong>
            <span className='call-status-text'>{statusLabel(status, mediaType)}</span>
          </div>
        )}

        {isVideo ? (
          <video ref={local.ref} className='call-local-video' autoPlay playsInline muted={local.muted} data-testid='call-local-video' />
        ) : null}

        {isVideo ? (
          <div className='call-video-caption'>
            <strong>{peer?.name ?? 'Unknown'}</strong>
            <span>{statusLabel(status, mediaType)}</span>
          </div>
        ) : null}

        {/* Voice calls have no <video> tile, so the remote audio needs its own
            element — this is what actually plays the other person's voice. */}
        {isVideo ? null : <audio ref={remoteAudioRef} autoPlay playsInline data-testid='call-remote-audio' />}

        {error ? <p className='call-error' role='alert'>{error}</p> : null}
      </div>

      <div className='call-controls'>
        {incoming ? (
          <>
            <button type='button' className='call-btn call-accept' onClick={acceptCall} aria-label='Accept call' title='Accept' data-testid='button-accept-call'>
              {mediaType === 'video' ? <VideoIcon size={22} /> : <PhoneIcon size={22} />}
            </button>
            <button type='button' className='call-btn call-reject' onClick={rejectCall} aria-label='Decline call' title='Decline' data-testid='button-reject-call'>
              <PhoneIcon size={22} />
            </button>
          </>
        ) : (
          <>
            <button type='button' className={`call-btn${micEnabled ? '' : ' off'}`} onClick={toggleMic} aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={!micEnabled} title='Mute' data-testid='button-toggle-mic'>
              {micEnabled ? <MicIcon size={20} /> : <MicOffIcon size={20} />}
            </button>
            {isVideo ? (
              <button type='button' className={`call-btn${cameraEnabled ? '' : ' off'}`} onClick={toggleCamera} aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'} aria-pressed={!cameraEnabled} title='Camera' data-testid='button-toggle-camera'>
                {cameraEnabled ? <VideoIcon size={20} /> : <CameraOffIcon size={20} />}
              </button>
            ) : null}
            <button type='button' className='call-btn call-reject' onClick={endCall} aria-label='End call' title='End call' data-testid='button-end-call'>
              <PhoneIcon size={22} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
