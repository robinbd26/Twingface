import { describe, expect, it } from 'vitest';
import { generateStrongPassword } from './strong-password';

describe('generateStrongPassword', () => {
  it('meets the account password policy', () => {
    for (let i = 0; i < 50; i += 1) {
      const value = generateStrongPassword();
      expect(value).toHaveLength(16);
      expect(value).toMatch(/[a-z]/);
      expect(value).toMatch(/[A-Z]/);
      expect(value).toMatch(/\d/);
      expect(value).toMatch(/[!@#$%&*?+]/);
    }
  });

  it('stays inside the ambiguous-character-free alphabet', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateStrongPassword()).toMatch(/^[abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?+]+$/);
    }
  });

  it('does not repeat itself', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(generateStrongPassword());
    expect(seen.size).toBe(200);
  });
});
