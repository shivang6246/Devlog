'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';

const isActive = (pathname, href) => pathname === href || (href !== '/' && pathname.startsWith(href));

function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={`group relative py-2 text-[11px] font-medium uppercase tracking-[0.25em] transition ${
        active ? 'text-white' : 'text-slate-400 hover:text-white'
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-0.5 left-0 h-[2px] bg-indigo-500 shadow-[0_0_10px_rgb(45_82_255/0.9)] transition-all duration-500 ${
          active ? 'w-4' : 'w-0 group-hover:w-4'
        }`}
      />
    </Link>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item =
    'block w-full px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/5 hover:text-white';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex rounded-full ring-1 ring-white/15 transition hover:ring-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 py-1 shadow-2xl shadow-black backdrop-blur-xl"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate font-display text-lg text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <Link role="menuitem" href="/dashboard" className={item}>Dashboard</Link>
          <Link role="menuitem" href={`/profile/${user._id}`} className={item}>Profile</Link>
          <Link role="menuitem" href="/settings" className={item}>Settings</Link>
          <button role="menuitem" type="button" onClick={onLogout} className={`${item} border-t border-white/10 text-red-400 hover:text-red-300`}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

/** Full-screen serif menu behind the 3×3 dot icon (the reference's top-right control). */
function OverlayMenu({ open, onClose, user, onLogout }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const links = [
    ['/', 'Stories'],
    ['/tags', 'Topics'],
    ['/editor/new', 'Write'],
    ...(user
      ? [['/dashboard', 'Dashboard'], [`/profile/${user._id}`, 'Profile'], ['/settings', 'Settings']]
      : [['/login', 'Log in'], ['/register', 'Join DevLog']]),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      aria-hidden={!open}
      className={`fixed inset-0 z-[70] bg-slate-950/[0.97] backdrop-blur-xl transition-[opacity,visibility] duration-500 ${
        open ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-[20vw] top-1/2 w-[70vw] max-w-[640px] -translate-y-1/2 opacity-60">
        {open && (
          <div className="eclipse">
            <div className="eclipse-ring" />
            <div className="eclipse-orb" />
          </div>
        )}
      </div>
      <div className="shell relative flex h-full flex-col">
        <div className="flex h-16 items-center justify-between">
          <span className="font-display text-lg tracking-[0.2em] text-white">DEVLOG</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 ring-1 ring-white/15 transition hover:text-white hover:ring-white/40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-1 pb-16">
          {links.map(([href, label], i) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="group flex items-baseline gap-5 py-1"
              style={open ? { '--i': i, '--d': '120ms' } : undefined}
            >
              <span className={`w-8 text-xs tabular-nums text-indigo-400 ${open ? 'fade-in' : ''}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={`font-display text-5xl leading-tight transition sm:text-7xl ${
                  isActive(pathname, href) ? 'text-white' : 'text-slate-500 group-hover:text-white'
                } ${open ? 'reveal-word' : ''}`}
                style={open ? { '--i': i, '--d': '120ms' } : undefined}
              >
                {label}
              </span>
            </Link>
          ))}
          <ThemeToggle withLabel className="mt-10 w-fit pl-[3.25rem]" />
          {user && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="mt-6 w-fit pl-[3.25rem] text-[11px] font-medium uppercase tracking-[0.3em] text-red-400 hover:text-red-300"
            >
              Log out
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

function DotGrid() {
  return (
    <span aria-hidden="true" className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
      ))}
    </span>
  );
}

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-(--header-bg) backdrop-blur-xl">
        <nav className="shell flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-10">
            <Link href="/" className="font-display text-lg tracking-[0.2em] text-white" aria-label="DevLog home">
              DEVLOG
            </Link>
            <div className="hidden items-center gap-8 md:flex">
              <NavLink href="/">Stories</NavLink>
              <NavLink href="/tags">Topics</NavLink>
              {user && <NavLink href="/dashboard">Dashboard</NavLink>}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {loading ? (
              <span className="h-8 w-24 animate-pulse rounded-full bg-white/5" aria-hidden="true" />
            ) : user ? (
              <>
                <Link
                  href="/editor/new"
                  className="rounded-full bg-indigo-600 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-onaccent shadow-[0_0_24px_rgb(45_82_255/0.45)] transition hover:bg-indigo-500"
                >
                  Write
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden text-[11px] font-medium uppercase tracking-[0.25em] text-slate-400 transition hover:text-white lg:inline"
                >
                  Log out
                </button>
                <UserMenu user={user} onLogout={logout} />
              </>
            ) : (
              <>
                <Link href="/login" className="hidden text-[11px] font-medium uppercase tracking-[0.25em] text-slate-300 transition hover:text-white min-[400px]:inline">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:border-indigo-500 hover:shadow-[0_0_24px_rgb(45_82_255/0.45)]"
                >
                  Sign up
                </Link>
              </>
            )}
            <ThemeToggle className="hidden min-[400px]:flex" />
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center text-slate-300 transition hover:text-white"
            >
              <DotGrid />
            </button>
          </div>
        </nav>
      </header>
      <OverlayMenu open={menuOpen} onClose={closeMenu} user={user} onLogout={logout} />
    </>
  );
}
