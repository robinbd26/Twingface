'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Navbar({ user }: { user: { name: string; username: string } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className='sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#3e4042] bg-[#242526] px-3 text-[#e4e6eb] shadow-sm sm:px-5'>
    <div className='flex items-center gap-2'><Link href='/dashboard' className='grid h-10 w-10 place-items-center rounded-full bg-[#2d88ff] text-sm font-black text-white'>TF</Link><label className='hidden w-56 rounded-full bg-[#3a3b3c] px-3 py-2 text-sm text-[#b0b3b8] md:block'><span className='mr-2'>⌕</span><input className='w-44 bg-transparent outline-none placeholder:text-[#b0b3b8]' placeholder='Search Twingface' aria-label='Search Twingface' /></label></div>
    <nav className='hidden h-full items-center gap-2 md:flex' aria-label='Primary navigation'>{['Home','Friends','Watch','Marketplace','Groups'].map((item, index) => <Link key={item} href='/dashboard' className={`grid h-full min-w-24 place-items-center border-b-4 px-4 text-sm transition ${index === 0 ? 'border-[#2d88ff] text-[#2d88ff]' : 'border-transparent text-[#b0b3b8] hover:bg-[#3a3b3c]'}`}>{item}</Link>)}</nav>
    <div className='flex items-center gap-2'><button className='grid h-9 w-9 place-items-center rounded-full bg-[#3a3b3c]' aria-label='Menu'>▦</button><button className='grid h-9 w-9 place-items-center rounded-full bg-[#3a3b3c]' aria-label='Messages'>✉</button><button className='relative grid h-9 w-9 place-items-center rounded-full bg-[#3a3b3c]' aria-label='Notifications'>●<b className='absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white'>3</b></button><button onClick={() => setMenuOpen(!menuOpen)} className='grid h-9 w-9 place-items-center rounded-full bg-[#2d88ff] text-xs font-bold text-white' aria-expanded={menuOpen}>{user.name[0]?.toUpperCase()}</button></div>
    {menuOpen && <div className='absolute right-3 top-12 w-48 rounded-xl border border-[#3e4042] bg-[#242526] p-2 shadow-xl'><Link href='/profile' className='block rounded-lg px-3 py-2 text-sm hover:bg-[#3a3b3c]'>View profile</Link><Link href='/settings/profile' className='block rounded-lg px-3 py-2 text-sm hover:bg-[#3a3b3c]'>Settings</Link></div>}
  </header>;
}
