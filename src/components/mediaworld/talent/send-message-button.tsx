'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { NETWORK_ERROR } from '@/lib/client/forms';

export default function SendMessageButton({
  username,
  variant = 'primary',
  label,
}: {
  username: string;
  variant?: 'primary' | 'secondary';
  label?: string;
}) {
  const router = useRouter();
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function startConversation() {
    if (busy) return;
    setBusy(true);
    setError('');
    const response = await fetch(`/api/mediaworld/talent/${encodeURIComponent(username)}/message`, { method: 'POST' }).catch(() => null);
    if (!response) {
      setBusy(false);
      setError(bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en);
      return;
    }
    const data = await response.json().catch(() => null) as { conversationId?: string; error?: string } | null;
    if (!response.ok || !data?.conversationId) {
      setBusy(false);
      setError(data?.error || (bn ? 'কথোপকথন শুরু করা যায়নি।' : 'Unable to start the conversation.'));
      return;
    }
    router.push(`/messages/${data.conversationId}`);
  }

  return (
    <span className='mw-talent-message'>
      <button
        type='button'
        className={`mw-btn ${variant === 'secondary' ? 'mw-btn-secondary' : 'mw-btn-primary'}`}
        onClick={startConversation}
        disabled={busy}
      >
        <span aria-hidden='true'>✉</span> {busy ? (bn ? 'খোলা হচ্ছে…' : 'Opening…') : (label ?? (bn ? 'মেসেজ পাঠান' : 'Send message'))}
      </button>
      {error ? <span className='mw-talent-message-error' role='alert'>{error}</span> : null}
    </span>
  );
}
