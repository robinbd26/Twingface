'use client';

import { useState } from 'react';
import LogoutButton from '@/app/(main)/dashboard/logout-button';
import {
  CameraIcon,
  GamepadIcon,
  GlobeIcon,
  HomeIcon,
  SparklesIcon,
  StoreIcon,
  UsersIcon,
  VideoIcon,
} from './icons';

type RailItem = { key: string; label: string; icon: (p: { size?: number }) => React.ReactElement; tone: string; href?: string };

const menuItems: RailItem[] = [
  { key: 'profile', label: 'Profile', icon: HomeIcon, tone: 'tone-blue' },
  { key: 'ai', label: 'Twingface AI', icon: SparklesIcon, tone: 'tone-violet', href: '/ai' },
  { key: 'friends', label: 'Friends', icon: UsersIcon, tone: 'tone-blue', href: '/friends' },
  { key: 'groups', label: 'Groups', icon: UsersIcon, tone: 'tone-blue', href: '/groups' },
  { key: 'pages', label: 'Pages', icon: GlobeIcon, tone: 'tone-orange', href: '/pages' },
  { key: 'marketplace', label: 'Marketplace', icon: StoreIcon, tone: 'tone-sky', href: '/marketplace' },
  { key: 'for-rent', label: 'For Rent', icon: CameraIcon, tone: 'tone-sky', href: '/for-rent' },
  { key: 'rent-dashboard', label: 'Rental dashboard', icon: CameraIcon, tone: 'tone-sky', href: '/for-rent/dashboard' },
  { key: 'games', label: 'Play games', icon: GamepadIcon, tone: 'tone-blue', href: '/games' },
  { key: 'ott', label: 'OTT Platform', icon: VideoIcon, tone: 'tone-rose', href: '/ott' },
  { key: 'media', label: 'MediaWorld', icon: GlobeIcon, tone: 'tone-green', href: '/mediaworld' },
  { key: 'find-talent', label: 'Find talent', icon: UsersIcon, tone: 'tone-violet', href: '/mediaworld/talent' },
  { key: 'media-setup', label: 'Media profile setup', icon: GlobeIcon, tone: 'tone-green', href: '/mediaworld/onboarding' },
  { key: 'live', label: 'Live streaming', icon: VideoIcon, tone: 'tone-rose', href: '/live' },
];

export default function DashboardSidebar({ user }: { user: { name: string; username: string; profileImage?: string | null } }) {
  const [active, setActive] = useState('profile');
  const profileLabel = user.name || user.username || 'Your profile';
  const isProfile = (key: string) => key === 'profile';

  return (
    <aside className='left-rail' aria-label='Your navigation'>
      <div className='rail-section'>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const chosen = active === item.key;
          const className = `rail-link ${isProfile(item.key) ? 'profile-link' : ''} ${chosen ? 'chosen' : ''}`;
          const body = (
            <>
              <span className={`rail-icon ${isProfile(item.key) ? '' : item.tone}`}>
                {isProfile(item.key) ? (
                  <span className='avatar avatar-robin' style={{ width: 31, height: 31, fontSize: 11 }} aria-hidden='true'>
                    {user.profileImage ? <img className='avatar-photo' src={user.profileImage} alt='' /> : profileLabel.trim().charAt(0).toUpperCase() || 'T'}
                  </span>
                ) : (
                  <Icon size={20} />
                )}
              </span>
              <span>{isProfile(item.key) ? profileLabel : item.label}</span>
              {chosen ? <span className='active-tick' /> : null}
            </>
          );
          return (
            <a key={item.key} href={item.href ?? '/profile'} className={className} onClick={() => setActive(item.key)} aria-current={chosen ? 'page' : undefined}>
              {body}
            </a>
          );
        })}
      </div>

      <div className='rail-divider' />

      <div className='mt-5 px-2'>
        <p className='rail-footer' style={{ padding: '12px 0' }}>
          Privacy · Terms · Advertising · Cookies<br />{profileLabel}&apos;s Twingface feed
        </p>
        <LogoutButton />
      </div>
    </aside>
  );
}
