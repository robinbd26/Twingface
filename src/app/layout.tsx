import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Twingface',
  description: 'Social platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0c5a46',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("tf-theme");document.documentElement.dataset.theme=t||"light"}catch(e){document.documentElement.dataset.theme="light"}',
          }}
        />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
        <link
          href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap'
          rel='stylesheet'
        />
        <noscript>
          <link
            href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap'
            rel='stylesheet'
          />
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
