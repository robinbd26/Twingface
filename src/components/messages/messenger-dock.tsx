'use client';

import { useMessenger } from './messenger-context';
import ChatWindow from './chat-window';

export default function MessengerDock() {
  const { openWindows, closeChat } = useMessenger();
  if (!openWindows.length) return null;
  return (
    <div className='messenger-dock' aria-label='Open chats' data-testid='messenger-dock'>
      {openWindows.map((friend) => (
        <ChatWindow key={friend.id} friend={friend} onClose={() => closeChat(friend.id)} />
      ))}
    </div>
  );
}
