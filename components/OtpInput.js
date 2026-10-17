'use client';

import { useRef } from 'react';

const LENGTH = 6;

/** Six single-digit boxes: auto-advance, Backspace goes back, paste fills all. */
export default function OtpInput({ value, onChange, onComplete, disabled = false, autoFocus = true }) {
  const refs = useRef([]);
  // `value` keeps each digit at its position; empty slots are spaces ("12 4").
  const digits = Array.from({ length: LENGTH }, (_, i) => (/\d/.test(value[i] || '') ? value[i] : ''));

  function commit(next) {
    const v = next.map((d) => d || ' ').join('').trimEnd();
    onChange(v);
    if (/^\d{6}$/.test(v)) onComplete?.(v);
  }

  function setAt(index, digit) {
    const next = digits.slice();
    next[index] = digit;
    commit(next);
  }

  function handleChange(index, e) {
    let raw = e.target.value.replace(/\D/g, '');
    if (!raw) return setAt(index, '');
    // Typed into a filled box without selecting: keep just the new digit.
    if (raw.length === 2 && raw.includes(digits[index])) {
      raw = raw[0] === digits[index] ? raw[1] : raw[0];
    }
    if (raw.length > 1) return fill(raw, index); // SMS/email autofill, fast typing
    setAt(index, raw);
    if (index < LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function fill(text, start = 0) {
    const incoming = text.replace(/\D/g, '').slice(0, LENGTH - start);
    if (!incoming) return;
    const next = digits.slice();
    for (let i = 0; i < incoming.length; i += 1) next[start + i] = incoming[i];
    refs.current[Math.min(start + incoming.length, LENGTH - 1)]?.focus();
    commit(next);
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
      setAt(index - 1, '');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => {
            e.preventDefault();
            fill(e.clipboardData.getData('text'), 0);
          }}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={LENGTH}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          className="h-14 w-full min-w-0 max-w-14 rounded-xl border border-white/10 bg-field text-center font-display text-2xl text-white outline-none transition hover:border-white/25 focus:border-indigo-500 focus:bg-field focus:shadow-[0_0_0_3px_rgb(45_82_255/0.2),0_0_26px_rgb(45_82_255/0.35)] disabled:opacity-60"
        />
      ))}
    </div>
  );
}
