'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import LogoutButton from '@/app/(main)/dashboard/logout-button';
import {
  CameraIcon,
  ChevronDownIcon,
  CloseIcon,
  FlagIcon,
  GamepadIcon,
  GridIcon,
  HelpIcon,
  HomeIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  StoreIcon,
  SunIcon,
  UsersIcon,
  VideoIcon,
} from './icons';
import NotificationBell from './notification-bell';
import MessageInbox from './message-inbox';

const tabs = ['Home', 'Watch', 'Marketplace', 'For Rent', 'Groups', 'Gaming'] as const;

const tabIcons: Record<string, (props: { size?: number }) => React.ReactElement> = {
  Home: HomeIcon,
  Watch: VideoIcon,
  Marketplace: StoreIcon,
  'For Rent': CameraIcon,
  Groups: UsersIcon,
  Gaming: GamepadIcon,
};
const tabHrefs: Record<(typeof tabs)[number], string> = { Home: '/dashboard', Watch: '/ott', Marketplace: '/marketplace', 'For Rent': '/for-rent', Groups: '/groups', Gaming: '/games' };

function Avatar({ initials, imageUrl, className = '', label }: { initials: string; imageUrl?: string | null; className?: string; label?: string }) {
  return (
    <span aria-label={label ?? initials} className={`avatar ${className}`}>
      {imageUrl ? <img className='avatar-photo' src={imageUrl} alt='' /> : initials}
    </span>
  );
}

export default function DashboardNavbar({ user }: { user: { id?: string; name: string; username: string; profileImage?: string | null } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [darkMode, setDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const initial = user.name.trim().charAt(0).toUpperCase() || 'T';

  useEffect(() => {
    try {
      setDarkMode(document.documentElement.dataset.theme === 'dark');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-profile-area]')) setMenuOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? 'dark' : 'light';
      try {
        localStorage.setItem('tf-theme', next ? 'dark' : 'light');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <header className='topbar'>
      <div className='topbar-inner'>
        <div className='brand-area'>
          <Link href='/dashboard' aria-label='Go to Twingface Home' className='brand-mark' onClick={() => setActiveTab('Home')}>
            <span>T</span>
          </Link>
          <span className='brand-wordmark' data-testid='text-brand-name'>TWINGFACE</span>
          {searchOpen ? (
            <div className='search-box expanded'>
              <SearchIcon size={17} />
              <input
                ref={searchRef}
                aria-label='Search the feed'
                data-testid='input-feed-search'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${user.name.split(' ')[0] || 'your'}'s feed`}
              />
              <button aria-label='Close search' data-testid='button-close-search' onClick={() => { setSearchOpen(false); setQuery(''); }}>
                <CloseIcon size={17} />
              </button>
            </div>
          ) : (
            <button className='round-action' aria-label='Search' title='Search' data-testid='button-open-search' onClick={() => setSearchOpen(true)}>
              <SearchIcon size={18} />
            </button>
          )}
        </div>

        <nav className='top-tabs' aria-label='Main navigation'>
          {tabs.map((tab) => {
            const TabIcon = tabIcons[tab];
            const selected = activeTab === tab;
            return (
              <Link
                key={tab}
                href={tabHrefs[tab]}
                onClick={() => setActiveTab(tab)}
                aria-label={tab}
                aria-current={selected ? 'page' : undefined}
                title={tab}
                className={`top-tab ${selected ? 'active' : ''}`}
                data-testid={`nav-top-${tab.toLowerCase()}`}
              >
                <TabIcon size={22} />
              </Link>
            );
          })}
        </nav>

        <div className='top-actions'>
          <button className='round-action' aria-label='Menu' title='Menu'><GridIcon size={19} /></button>
          <MessageInbox viewerId={user.id} />
          <NotificationBell />
          <button
            onClick={toggleTheme}
            className='round-action'
            data-testid='button-theme-toggle'
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={darkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>

          <div className='profile-area' data-profile-area>
            <button
              aria-label='Profile menu'
              aria-expanded={menuOpen}
              aria-haspopup='menu'
              data-testid='button-profile-menu'
              className={`profile-trigger ${menuOpen ? 'selected' : ''}`}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Avatar initials={initial} imageUrl={user.profileImage} className='avatar-robin' label={user.name} />
              <ChevronDownIcon size={13} />
            </button>

            {menuOpen ? (
              <div className='profile-menu menu-shadow page-enter' role='menu' data-testid='menu-profile'>
                <Link className='profile-summary' role='menuitem' href='/profile' onClick={() => setMenuOpen(false)}>
                  <Avatar initials={initial} imageUrl={user.profileImage} className='avatar-robin' />
                  <span>
                    <strong>{user.name}</strong>
                    <small>See your profile</small>
                  </span>
                </Link>
                <div className='menu-separator' />
                <Link className='profile-menu-item' role='menuitem' href='/settings/profile' onClick={() => setMenuOpen(false)}>
                  <span className='menu-icon'><SettingsIcon size={18} /></span>
                  <span>Settings &amp; privacy</span>
                  <ChevronDownIcon size={15} className='menu-chevron' />
                </Link>
                <button className='profile-menu-item' role='menuitem' type='button' onClick={() => setMenuOpen(false)}>
                  <span className='menu-icon'><HelpIcon size={18} /></span>
                  <span>Help &amp; support</span>
                  <ChevronDownIcon size={15} className='menu-chevron' />
                </button>
                <button className='profile-menu-item' role='menuitem' type='button' onClick={() => setMenuOpen(false)}>
                  <span className='menu-icon'><FlagIcon size={18} /></span>
                  <span>Report a problem</span>
                  <ChevronDownIcon size={15} className='menu-chevron' />
                </button>
                <div className='menu-separator' />
                <LogoutButton variant='menu' />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

