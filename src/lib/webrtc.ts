// Client-side WebRTC helpers shared by the call context.

// Public Google STUN servers are enough for most home/office networks where at
// least one side has an open port. Symmetric NAT / strict corporate firewalls
// need a TURN relay; supply credentials via environment variables so nothing
// secret is committed.
export type IceServerConfig = RTCIceServer;

export function buildIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl && turnUsername && turnCredential) {
    servers.push({ urls: turnUrl.split(',').map((value) => value.trim()).filter(Boolean), username: turnUsername, credential: turnCredential });
  }

  return servers;
}

export function isCallSupported(): boolean {
  return typeof window !== 'undefined' && 'RTCPeerConnection' in window && !!navigator.mediaDevices?.getUserMedia;
}

// Generate a call id in the browser (Web Crypto when available, with a
// crypto-strong fallback). This is an opaque correlation token only.
export function createCallId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
