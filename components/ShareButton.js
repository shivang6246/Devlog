'use client';

import { useEffect, useRef, useState } from 'react';

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13" />
    </svg>
  );
}

/**
 * Share a post. On touch devices with the Web Share API it opens the native
 * share sheet; otherwise a menu with copy-link and the common networks.
 */
export default function ShareButton({ title, text = '', path }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  const url = () => `${window.location.origin}${path}`;

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

  async function onShare() {
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title, text, url: url() });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user closed the sheet
      }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
    } catch {
      // Fallback for browsers without async clipboard access
      const input = document.createElement('input');
      input.value = url();
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const enc = encodeURIComponent;
  const targets = () => {
    const u = url();
    return [
      ['X / Twitter', `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(u)}`],
      ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}`],
      ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}`],
      ['WhatsApp', `https://wa.me/?text=${enc(`${title} ${u}`)}`],
      ['Email', `mailto:?subject=${enc(title)}&body=${enc(`${text ? `${text}\n\n` : ''}${u}`)}`],
    ];
  };

  const item =
    'flex w-full items-center justify-between px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/5 hover:text-white';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onShare}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full py-2 pl-3 pr-4 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-300 ring-1 ring-white/15 transition hover:text-white hover:ring-white/40"
      >
        <ShareIcon />
        Share
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-3 w-56 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 py-1 shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          <button role="menuitem" type="button" onClick={copy} className={item}>
            {copied ? 'Link copied ✓' : 'Copy link'}
          </button>
          {open &&
            targets().map(([label, href]) => (
              <a
                key={label}
                role="menuitem"
                href={href}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={item}
              >
                {label}
                <span aria-hidden="true" className="text-slate-600">↗</span>
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
