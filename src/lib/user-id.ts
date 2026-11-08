const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomCharacters(length: number): string {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
  }
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

export function createSuggestedUserId(name: string, suffix = randomCharacters(6)): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 23) || 'user';
  return `${base}-${suffix}`.slice(0, 30);
}

export function createStrongPassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?';
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  const value = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  value[0] = 'A'; value[1] = 'a'; value[2] = '7'; value[3] = '!';
  return value.join('');
}
