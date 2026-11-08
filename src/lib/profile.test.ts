import { describe, expect, it } from 'vitest';
import { safeProfileSelect } from './profile';

describe('safeProfileSelect', () => {
  it('includes public intro fields without selecting credentials or contact data', () => {
    expect(safeProfileSelect).toMatchObject({
      profession: true,
      education: true,
      currentCity: true,
      hometown: true,
    });
    expect(safeProfileSelect).not.toHaveProperty('email');
    expect(safeProfileSelect).not.toHaveProperty('phone');
    expect(safeProfileSelect).not.toHaveProperty('passwordHash');
    expect(safeProfileSelect).not.toHaveProperty('sessions');
  });
});
