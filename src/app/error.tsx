'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className='container'>
      <h1>Something went wrong</h1>
      <p style={{ fontSize: 13, opacity: 0.7, margin: '8px 0' }}>{error?.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
