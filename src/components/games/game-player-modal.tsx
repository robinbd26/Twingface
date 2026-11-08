'use client';

import { useState } from 'react';
import { toEmbeddableGameUrl, type SafeGame } from '@/lib/game';

export default function GamePlayerModal({ game, onClose }: { game: SafeGame; onClose: () => void }) {
  const embedUrl = toEmbeddableGameUrl(game.playUrl);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  return <div className='games-modal-backdrop' role='presentation' onMouseDown={onClose}>
    <section className='games-player-modal' role='dialog' aria-modal='true' aria-label={`Play ${game.title}`} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>{game.genre.replace('_', ' ')}</small><h2>{game.title}</h2></div><div className='games-player-actions'><a className='games-player-open' href={game.playUrl} target='_blank' rel='noopener noreferrer'>↗ New tab</a><button type='button' onClick={onClose} aria-label='Close game player'>×</button></div></header>
      {failed ? <div className='games-player-fallback'><p>This game refused to load inside Twingface.</p><a href={game.playUrl} target='_blank' rel='noopener noreferrer'>Open {game.title} in a new tab →</a></div>
      : <div className='games-player-frame'>{loading ? <p className='games-player-loading'>Loading game…</p> : null}<iframe title={game.title} src={embedUrl} sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock' allow='fullscreen; autoplay; gamepad' allowFullScreen onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} /></div>}
    </section>
  </div>;
}
