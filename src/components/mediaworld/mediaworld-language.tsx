'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type MediaWorldLanguage = 'bn' | 'en';

export const MEDIAWORLD_LANGUAGE_KEY = 'twingface-mediaworld-language';

type MediaWorldLanguageContextValue = {
  language: MediaWorldLanguage;
  setLanguage: (language: MediaWorldLanguage) => void;
  toggleLanguage: () => void;
};

const MediaWorldLanguageContext = createContext<MediaWorldLanguageContextValue | null>(null);

export function MediaWorldLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<MediaWorldLanguage>('bn');

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(MEDIAWORLD_LANGUAGE_KEY);
    if (savedLanguage === 'bn' || savedLanguage === 'en') setLanguageState(savedLanguage);
  }, []);

  function setLanguage(nextLanguage: MediaWorldLanguage) {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(MEDIAWORLD_LANGUAGE_KEY, nextLanguage);
    } catch {
      /* storage is optional */
    }
  }

  const value = useMemo<MediaWorldLanguageContextValue>(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === 'bn' ? 'en' : 'bn'),
  }), [language]);

  return (
    <MediaWorldLanguageContext.Provider value={value}>
      {children}
    </MediaWorldLanguageContext.Provider>
  );
}

export function useMediaWorldLanguage(): MediaWorldLanguageContextValue {
  const context = useContext(MediaWorldLanguageContext);
  if (!context) throw new Error('useMediaWorldLanguage must be used inside MediaWorldLanguageProvider.');
  return context;
}

export function MediaWorldLanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useMediaWorldLanguage();

  return (
    <div className={`mediaworld-language-toggle ${className}`.trim()} role='group' aria-label='Language'>
      <button
        type='button'
        className={language === 'bn' ? 'active' : ''}
        aria-pressed={language === 'bn'}
        data-testid='mediaworld-language-bn'
        onClick={() => setLanguage('bn')}
      >
        বাংলা
      </button>
      <button
        type='button'
        className={language === 'en' ? 'active' : ''}
        aria-pressed={language === 'en'}
        data-testid='mediaworld-language-en'
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  );
}
