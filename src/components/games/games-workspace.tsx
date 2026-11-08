'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SafeGame } from '@/lib/game';
import GamePlayerModal from './game-player-modal';

const genres = ['All', 'Action', 'Horror', 'Racing', 'Puzzle & Strategy', 'Sports & Fighting', 'Arcade', 'RPG'] as const;
const genreKey = (genre: string) => genre === 'All' ? '' : genre.toUpperCase().replace(/ & /g, '_').replace(/ /g, '_');

export default function GamesWorkspace() {
  const [games, setGames] = useState<SafeGame[]>([]); const [query, setQuery] = useState(''); const [genre, setGenre] = useState('All');
  const [selected, setSelected] = useState<SafeGame | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); const params = new URLSearchParams(); if (query) params.set('query', query); if (genreKey(genre)) params.set('genre', genreKey(genre)); fetch(`/api/games?${params}`, { signal: controller.signal }).then(async (res) => { if (!res.ok) throw new Error('Unable to load games.'); return res.json() as Promise<{ games: SafeGame[] }>; }).then((data) => setGames(data.games)).catch((cause) => { if (cause.name !== 'AbortError') setError('Unable to load games right now.'); }).finally(() => setLoading(false)); return () => controller.abort(); }, [query, genre]);
  const featured = useMemo(() => games.find((game) => game.isFeatured) ?? games[0], [games]);
  async function play(gameId: string) { setError(''); try { const response = await fetch(`/api/games/${gameId}/play`, { method: 'POST' }); const data = await response.json() as { game?: SafeGame; error?: string }; if (!response.ok || !data.game) throw new Error(data.error); setSelected(data.game); } catch { setError('This game is unavailable right now.'); } }
  return <main className='games-page'>
    <aside className='games-sidebar'><h2>🎮 Play Games</h2><h3>Genres</h3><div className='games-side-genres'>{genres.slice(1).map((item) => <button key={item} type='button' onClick={() => setGenre(item)}>{item}</button>)}</div></aside>
    <section className='games-main'>
      {featured ? <section className='games-hero' style={{ backgroundImage: `linear-gradient(90deg,#07111bf2 5%,#07111b66 63%,#07111bee), url(${featured.thumbnailUrl})` }}><div><span>FEATURED GAME</span><h1>{featured.title}</h1><p>{featured.description}</p><button type='button' className='game-play-btn game-play-btn-hero' onClick={() => void play(featured.id)}>▶ Play Now</button></div></section> : <section className='games-hero games-hero-empty'><div><span>TWINGFACE GAMES</span><h1>Find your next game</h1><p>New trusted games will appear here when an administrator adds them.</p></div></section>}
      <div className='games-filter-bar'><input aria-label='Search games' value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search games by name or keyword' /><div>{genres.map((item) => <button className={genre === item ? 'active' : ''} type='button' key={item} onClick={() => setGenre(item)}>{item}</button>)}</div></div>
      <div className='games-section-head'><div><h2>Discover games</h2><p>{loading ? 'Loading games…' : `${games.length} games available`}</p></div></div>
      {error ? <p className='games-error' role='alert'>{error}</p> : null}
      {!loading && !error && games.length === 0 ? <div className='games-empty'>No games found. Try another genre or check back soon.</div> : null}
      <div className='games-grid'>{games.map((game) => <article className='game-card' key={game.id}><img src={game.thumbnailUrl} alt={game.title} /><div><span>{game.genre.replace('_', ' ')}</span><h3>{game.title}</h3><p>★ {game.rating.toFixed(1)} · {game.playCount.toLocaleString()} plays</p><button className='game-play-btn' type='button' onClick={() => void play(game.id)}>🎮 Play Game</button></div></article>)}</div>
    </section>{selected ? <GamePlayerModal game={selected} onClose={() => setSelected(null)} /> : null}
  </main>;
}
