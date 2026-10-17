'use client';

import { useEffect, useRef } from 'react';

/** A soft cobalt light that follows the pointer inside its parent (positioned) element. */
export default function CursorGlow() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!parent || window.matchMedia('(pointer: coarse)').matches) return undefined;

    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = parent.getBoundingClientRect();
        el.style.setProperty('--x', `${e.clientX - rect.left}px`);
        el.style.setProperty('--y', `${e.clientY - rect.top}px`);
        el.style.opacity = '1';
      });
    };
    const onLeave = () => {
      el.style.opacity = '0';
    };
    parent.addEventListener('pointermove', onMove);
    parent.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      parent.removeEventListener('pointermove', onMove);
      parent.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700"
      style={{
        background:
          'radial-gradient(480px circle at var(--x, 50%) var(--y, 50%), rgb(45 82 255 / 0.16), transparent 60%)',
      }}
    />
  );
}
