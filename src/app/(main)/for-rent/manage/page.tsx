import { redirect } from 'next/navigation';

/**
 * The listings + inquiries panel moved into the rental dashboard, which now owns
 * that row logic. The old URL stays alive so bookmarks and shared links land right.
 */
export default function ForRentManagePage() {
  redirect('/for-rent/dashboard');
}
