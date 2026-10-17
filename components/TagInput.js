'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { inputClass } from './ui';

const MAX_TAGS = 5;
const normalize = (s) => s.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase();

/** Chip input for tag names. Enter or comma adds; Backspace on empty removes the last. */
export default function TagInput({ value, onChange, id = 'tags' }) {
  const [draft, setDraft] = useState('');
  const [known, setKnown] = useState([]);

  useEffect(() => {
    const ctrl = new AbortController();
    apiFetch('/api/tags', { signal: ctrl.signal })
      .then((d) => setKnown(d.tags.map((t) => t.name)))
      .catch(() => {}); // suggestions are optional
    return () => ctrl.abort();
  }, []);

  function add(raw) {
    const name = normalize(raw).slice(0, 30);
    if (!name || value.includes(name) || value.length >= MAX_TAGS) return;
    onChange([...value, name]);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  const full = value.length >= MAX_TAGS;

  return (
    <div>
      <div className={`${inputClass} flex flex-wrap items-center gap-1.5 !py-1.5`}>
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 py-0.5 pl-2.5 pr-1 text-xs font-medium text-indigo-300 ring-1 ring-indigo-500/30"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="rounded-full px-1 hover:bg-indigo-500/25"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          list={`${id}-suggestions`}
          value={draft}
          disabled={full}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(',')) {
              add(v.slice(0, -1));
              setDraft('');
            } else setDraft(v);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft) {
              add(draft);
              setDraft('');
            }
          }}
          placeholder={full ? 'Maximum 5 tags' : value.length ? 'Add another…' : 'e.g. react, nextjs'}
          maxLength={30}
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-slate-400"
        />
        <datalist id={`${id}-suggestions`}>
          {known.filter((k) => !value.includes(k)).map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </div>
      <p className="mt-1 text-xs text-slate-500">Up to {MAX_TAGS} tags. Press Enter or comma to add.</p>
    </div>
  );
}
