'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ChatFriend = { id: string; name: string; username: string; profileImage: string | null };

type MessengerState = {
  openWindows: ChatFriend[];
  openChat: (friend: ChatFriend) => void;
  closeChat: (id: string) => void;
  isOpen: (id: string) => boolean;
};

const MessengerContext = createContext<MessengerState | null>(null);

export const MESSENGER_OPEN_EVENT = 'twingface:messenger-open';

// External trigger (e.g. a profile "Message" button) without needing context wiring.
export function requestOpenChat(friend: ChatFriend): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ChatFriend>(MESSENGER_OPEN_EVENT, { detail: friend }));
}

export function MessengerProvider({ children }: { children: React.ReactNode }) {
  const [openWindows, setOpenWindows] = useState<ChatFriend[]>([]);

  const openChat = useCallback((friend: ChatFriend) => {
    setOpenWindows((current) => (current.some((entry) => entry.id === friend.id) ? current : [...current, friend]));
  }, []);

  const closeChat = useCallback((id: string) => {
    setOpenWindows((current) => current.filter((entry) => entry.id !== id));
  }, []);

  useEffect(() => {
    function onOpen(event: Event) {
      const friend = (event as CustomEvent<ChatFriend>).detail;
      if (friend?.id) openChat(friend);
    }
    window.addEventListener(MESSENGER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(MESSENGER_OPEN_EVENT, onOpen);
  }, [openChat]);

  const value = useMemo<MessengerState>(
    () => ({ openWindows, openChat, closeChat, isOpen: (id) => openWindows.some((entry) => entry.id === id) }),
    [openWindows, openChat, closeChat],
  );

  return <MessengerContext.Provider value={value}>{children}</MessengerContext.Provider>;
}

export function useMessenger(): MessengerState {
  const context = useContext(MessengerContext);
  if (!context) throw new Error('useMessenger must be used within a MessengerProvider.');
  return context;
}
