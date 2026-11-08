export type PostLoginUser = {
  role?: string | null;
  username?: string | null;
  accountType?: string | null;
};

/**
 * Destination after a successful sign-in through the Media World login modal.
 * Rental accounts land on their own rental dashboard, other media accounts on
 * their own public profile; plain accounts have no Media World page, so they
 * keep the usual dashboard default.
 */
export function mediaWorldPostLoginPath(user: PostLoginUser | null | undefined): string {
  if (!user) return '/mediaworld';
  if (user.role === 'SUPER_ADMIN') return '/super_admin';
  // A For Rent account is not listed in the talent directory, so it gets the rental dashboard.
  if (user.accountType === 'RENTAL') return '/for-rent/dashboard';
  if (user.username && user.accountType) return `/mediaworld/talent/${user.username}`;
  return '/dashboard';
}
