import Link from 'next/link';

export default function MobileNav() {
  const linkClass = 'flex-1 rounded-lg py-2 text-center text-xs font-semibold text-[#516078] transition hover:bg-[#eef1f7]';
  return (
    <nav
      className='fixed inset-x-0 bottom-0 z-30 flex justify-around gap-1 border-t border-[#e2e7ee] bg-white/95 px-3 py-2 backdrop-blur-xl md:hidden'
      aria-label='Mobile navigation'
      data-testid='mobile-nav'
    >
      <Link href='/dashboard' className={`${linkClass} text-[#3478e4]`}>Home</Link>
      <Link href='/profile' className={linkClass}>Profile</Link>
      <Link href='/settings/profile' className={linkClass}>Menu</Link>
    </nav>
  );
}

