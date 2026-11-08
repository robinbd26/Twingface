import { redirect } from 'next/navigation';

export default function FriendRequestsPage() {
  // /friends already opens on the pending requests tab.
  redirect('/friends');
}
