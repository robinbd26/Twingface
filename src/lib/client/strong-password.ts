const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGIT = '23456789';
const SYMBOL = '!@#$%&*?+';
const ALL = LOWER + UPPER + DIGIT + SYMBOL;
const LENGTH = 16;

function randomInt(bound: number): number {
  const buffer = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / bound) * bound;
  let value = 0;
  do {
    globalThis.crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % bound;
}

function pick(pool: string): string {
  return pool[randomInt(pool.length)];
}

/** Password that always satisfies the account policy: upper, lower, digit and a symbol. */
export function generateStrongPassword(): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < LENGTH) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
