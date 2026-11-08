'use client';

import { useEffect, useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { showcaseVideoEmbed, showcaseVideoHost, showcaseVideoThumbnail } from '@/lib/mediaworld/showcase';
import type { ShowcaseItemView } from '@/lib/mediaworld/showcase-data';

type Filter = 'all' | 'photo' | 'video';

const TEXT = {
  en: {
    tabsLabel: 'Filter portfolio media',
    all: 'All',
    photos: 'Photos',
    videos: 'Videos',
    photoBadge: 'Photo',
    videoBadge: 'Video',
    close: 'Close',
    previous: 'Previous photo',
    next: 'Next photo',
    play: 'Play video',
    external: 'Open video',
    photoCount: (index: number, total: number) => `Photo ${index} of ${total}`,
    emptyPhotos: 'No photos have been added yet.',
    emptyVideos: 'No videos have been added yet.',
    noMedia: 'No portfolio media has been added yet.',
  },
  bn: {
    tabsLabel: 'পোর্টফোলিও ফিল্টার করুন',
    all: 'সব',
    photos: 'ছবি',
    videos: 'ভিডিও',
    photoBadge: 'ছবি',
    videoBadge: 'ভিডিও',
    close: 'বন্ধ করুন',
    previous: 'আগের ছবি',
    next: 'পরের ছবি',
    play: 'ভিডিও চালান',
    external: 'ভিডিও খুলুন',
    photoCount: (index: number, total: number) => `${total}টির মধ্যে ${index} নম্বর ছবি`,
    emptyPhotos: 'এখনও কোনো ছবি যোগ করা হয়নি।',
    emptyVideos: 'এখনও কোনো ভিডিও যোগ করা হয়নি।',
    noMedia: 'এখনও কোনো পোর্টফোলিও যোগ করা হয়নি।',
  },
} as const;

function PlayGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' aria-hidden='true'>
      <path d='M8 5.5v13l11-6.5Z' fill='currentColor' />
    </svg>
  );
}

function ImageGlyph({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      <rect x='3' y='4' width='18' height='16' rx='2' />
      <circle cx='8.5' cy='9.5' r='1.6' />
      <path d='m4 17 5-5 4 4 3-3 4 4' />
    </svg>
  );
}

export default function TalentShowcaseGallery({ items }: { items: ShowcaseItemView[] }) {
  const { language } = useMediaWorldLanguage();
  const t = TEXT[language];
  const photos = items.filter((item) => item.kind === 'PHOTO');
  const videos = items.filter((item) => item.kind === 'VIDEO');
  const [filter, setFilter] = useState<Filter>('all');
  const [activePhoto, setActivePhoto] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<ShowcaseItemView | null>(null);

  useEffect(() => {
    if (activePhoto === null && !activeVideo) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActivePhoto(null);
        setActiveVideo(null);
      }
      if (activePhoto !== null && event.key === 'ArrowRight') setActivePhoto((current) => (current === null ? null : (current + 1) % photos.length));
      if (activePhoto !== null && event.key === 'ArrowLeft') setActivePhoto((current) => (current === null ? null : (current - 1 + photos.length) % photos.length));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePhoto, activeVideo, photos.length]);

  if (!photos.length && !videos.length) {
    return <p className='mw-talent-muted'>{t.noMedia}</p>;
  }

  const visible = items.filter((item) => filter === 'all' || (filter === 'photo' ? item.kind === 'PHOTO' : item.kind === 'VIDEO'));
  const activeVideoEmbed = activeVideo ? showcaseVideoEmbed(activeVideo.url) : null;
  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t.all, count: items.length },
    { key: 'photo', label: t.photos, count: photos.length },
    { key: 'video', label: t.videos, count: videos.length },
  ];

  function openPhoto(id: string) {
    const index = photos.findIndex((photo) => photo.id === id);
    if (index >= 0) setActivePhoto(index);
  }

  return (
    <div className='mw-showcase'>
      <div className='mw-showcase-tabs' role='tablist' aria-label={t.tabsLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type='button'
            role='tab'
            aria-selected={filter === tab.key}
            aria-controls='mw-showcase-panel'
            className={`mw-showcase-tab${filter === tab.key ? ' is-active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            <span className='mw-showcase-tab-count'>{tab.count}</span>
          </button>
        ))}
      </div>

      {visible.length ? (
        <div className='mw-showcase-grid' id='mw-showcase-panel' role='tabpanel'>
          {visible.map((item) => {
            if (item.kind === 'PHOTO') {
              const label = item.title || t.photoBadge;
              return (
                <button
                  key={item.id}
                  type='button'
                  className='mw-showcase-card'
                  onClick={() => openPhoto(item.id)}
                  aria-label={item.title || t.photoCount(photos.findIndex((photo) => photo.id === item.id) + 1, photos.length)}
                >
                  <span className='mw-showcase-thumb'>
                    <img src={item.url} alt={item.title || ''} loading='lazy' />
                  </span>
                  <span className='mw-showcase-card-copy'>
                    <strong>{label}</strong>
                    <span className='mw-showcase-badge'><ImageGlyph /> {t.photoBadge}</span>
                  </span>
                </button>
              );
            }

            const embed = showcaseVideoEmbed(item.url);
            const thumbnail = showcaseVideoThumbnail(item.url);
            const label = item.title || showcaseVideoHost(item.url) || t.videoBadge;
            return (
              <button
                key={item.id}
                type='button'
                className='mw-showcase-card'
                onClick={() => setActiveVideo(item)}
                aria-label={`${t.play}: ${label}`}
              >
                <span className='mw-showcase-thumb'>
                  {thumbnail ? <img src={thumbnail} alt='' loading='lazy' /> : <span className='mw-showcase-thumb-fallback' aria-hidden='true'><PlayGlyph size={22} /></span>}
                  <span className='mw-showcase-play-badge' aria-hidden='true'><PlayGlyph /></span>
                </span>
                <span className='mw-showcase-card-copy'>
                  <strong>{label}</strong>
                  <span className='mw-showcase-badge mw-showcase-badge-video'>
                    <PlayGlyph size={10} /> {t.videoBadge}
                    {!embed ? <em aria-hidden='true'>↗</em> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className='mw-talent-muted'>{filter === 'photo' ? t.emptyPhotos : t.emptyVideos}</p>
      )}

      {activePhoto !== null && photos[activePhoto] ? (
        <div className='mw-lightbox' role='dialog' aria-modal='true' aria-label={photos[activePhoto].title || t.photos} onClick={() => setActivePhoto(null)}>
          <div className='mw-lightbox-inner' onClick={(event) => event.stopPropagation()}>
            <button type='button' className='mw-lightbox-close' onClick={() => setActivePhoto(null)} aria-label={t.close}>✕</button>
            <img src={photos[activePhoto].url} alt={photos[activePhoto].title || ''} />
            {photos.length > 1 ? (
              <>
                <button type='button' className='mw-lightbox-nav prev' onClick={() => setActivePhoto((activePhoto - 1 + photos.length) % photos.length)} aria-label={t.previous}>‹</button>
                <button type='button' className='mw-lightbox-nav next' onClick={() => setActivePhoto((activePhoto + 1) % photos.length)} aria-label={t.next}>›</button>
              </>
            ) : null}
            <p className='mw-lightbox-caption'>
              {photos[activePhoto].title || t.photoCount(activePhoto + 1, photos.length)}
            </p>
          </div>
        </div>
      ) : null}

      {activeVideo ? (
        <div className='mw-lightbox' role='dialog' aria-modal='true' aria-label={activeVideo.title || t.videos} onClick={() => setActiveVideo(null)}>
          <div className='mw-video-modal' onClick={(event) => event.stopPropagation()}>
            <button type='button' className='mw-lightbox-close' onClick={() => setActiveVideo(null)} aria-label={t.close}>✕</button>
            {activeVideoEmbed ? (
              <iframe
                src={activeVideoEmbed.src}
                title={activeVideo.title || t.videos}
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
                referrerPolicy='strict-origin-when-cross-origin'
              />
            ) : (
              <div className='mw-video-fallback'>
                <p>{activeVideo.title || showcaseVideoHost(activeVideo.url)}</p>
                <a href={activeVideo.url} target='_blank' rel='noopener noreferrer nofollow'>{t.external} ↗</a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
