import type { ReactNode } from 'react';

export type IconName =
  | 'user' | 'film' | 'image' | 'briefcase' | 'star' | 'phone' | 'mail' | 'pin'
  | 'lock' | 'calendar' | 'wallet' | 'share' | 'megaphone' | 'check' | 'chevron' | 'grid' | 'clock'
  | 'box' | 'message';

/** Shared line icons so the talent profile and the rental dashboard speak the same visual language. */
export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'user':
      return <svg {...common}><circle cx='12' cy='8' r='3.4' /><path d='M5 20c.8-3.6 3.4-5.4 7-5.4s6.2 1.8 7 5.4' /></svg>;
    case 'film':
      return <svg {...common}><rect x='3' y='5' width='18' height='14' rx='2' /><path d='M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4' /></svg>;
    case 'image':
      return <svg {...common}><rect x='3' y='4' width='18' height='16' rx='2' /><circle cx='8.5' cy='9.5' r='1.6' /><path d='m4 17 5-5 4 4 3-3 4 4' /></svg>;
    case 'briefcase':
      return <svg {...common}><rect x='3' y='7' width='18' height='12' rx='2' /><path d='M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12h18' /></svg>;
    case 'star':
      return <svg {...common}><path d='m12 4 2.2 4.8 5.3.7-3.9 3.6 1 5.2-4.6-2.6-4.6 2.6 1-5.2L4.5 9.5l5.3-.7Z' /></svg>;
    case 'phone':
      return <svg {...common}><path d='M6.2 4.5h3l1.2 3.3-2 1.4a11.5 11.5 0 0 0 5.4 5.4l1.4-2 3.3 1.2v3A2 2 0 0 1 16.3 19a15.6 15.6 0 0 1-12.8-12.8 2 2 0 0 1 2-2Z' /></svg>;
    case 'mail':
      return <svg {...common}><rect x='3' y='5.5' width='18' height='13' rx='2' /><path d='m3.5 7 8.5 6 8.5-6' /></svg>;
    case 'pin':
      return <svg {...common}><path d='M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10Z' /><circle cx='12' cy='11' r='2.2' /></svg>;
    case 'lock':
      return <svg {...common}><rect x='5' y='11' width='14' height='9' rx='2' /><path d='M8 11V8a4 4 0 0 1 8 0v3' /></svg>;
    case 'calendar':
      return <svg {...common}><rect x='3.5' y='5' width='17' height='15' rx='2' /><path d='M8 3v4M16 3v4M3.5 10h17' /></svg>;
    case 'wallet':
      return <svg {...common}><rect x='3' y='6' width='18' height='13' rx='2.5' /><path d='M3 10h18' /><circle cx='17' cy='14.5' r='1.2' /></svg>;
    case 'share':
      return <svg {...common}><circle cx='6' cy='12' r='2.4' /><circle cx='18' cy='6' r='2.4' /><circle cx='18' cy='18' r='2.4' /><path d='m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6' /></svg>;
    case 'megaphone':
      return <svg {...common}><path d='M4 10.5v3A1.5 1.5 0 0 0 5.5 15H8l5 4V6l-5 4H5.5A1.5 1.5 0 0 0 4 10.5Z' /><path d='M16 9a4 4 0 0 1 0 6' /></svg>;
    case 'check':
      return <svg {...common}><path d='m5 12.5 4.2 4.2L19 6.8' /></svg>;
    case 'chevron':
      return <svg {...common}><path d='m6 9 6 6 6-6' /></svg>;
    case 'grid':
      return <svg {...common}><rect x='4' y='4' width='7' height='7' rx='1.5' /><rect x='13' y='4' width='7' height='7' rx='1.5' /><rect x='4' y='13' width='7' height='7' rx='1.5' /><rect x='13' y='13' width='7' height='7' rx='1.5' /></svg>;
    case 'clock':
      return <svg {...common}><circle cx='12' cy='12' r='8.5' /><path d='M12 7.5V12l3 2' /></svg>;
    case 'box':
      return <svg {...common}><path d='M12 3.5 20 8v8l-8 4.5L4 16V8Z' /><path d='M4 8l8 4.5L20 8M12 12.5V20' /></svg>;
    case 'message':
      return <svg {...common}><path d='M4 5.5h16v11H9.5L6 19.5V16.5H4Z' /><path d='M8 9.5h8M8 12.5h5' /></svg>;
  }
}

export function CardHead({ icon, title, action }: { icon: IconName; title: string; action?: ReactNode }) {
  return (
    <div className='mw-talent-profile-card-head mw-tp-card-head'>
      <h2>
        <span className='mw-tp-card-icon' aria-hidden='true'><Icon name={icon} size={15} /></span>
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className='mw-talent-profile-detail'>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className='mw-tp-empty'>
      <span className='mw-tp-empty-icon' aria-hidden='true'><Icon name={icon} size={20} /></span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
