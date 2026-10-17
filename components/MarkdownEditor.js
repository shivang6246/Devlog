'use client';

import { useDeferredValue, useRef, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

// [label, title, before, after, placeholder, linePrefix?]
const ACTIONS = [
  ['H2', 'Heading', '## ', '', 'Heading', true],
  ['B', 'Bold', '**', '**', 'bold text'],
  ['I', 'Italic', '_', '_', 'italic text'],
  ['Link', 'Link', '[', '](https://)', 'link text'],
  ['`c`', 'Inline code', '`', '`', 'code'],
  ['{ }', 'Code block', '\n```js\n', '\n```\n', 'console.log("hello");'],
  ['• List', 'Bulleted list', '- ', '', 'List item', true],
];

/** Textarea + live preview. Split pane on desktop, Write/Preview tabs on small screens. */
export default function MarkdownEditor({ value, onChange, id = 'content' }) {
  const textareaRef = useRef(null);
  const [tab, setTab] = useState('write');
  const [split, setSplit] = useState(true);
  const preview = useDeferredValue(value);

  function applyFormat([, , before, after, placeholder, linePrefix]) {
    const el = textareaRef.current;
    if (!el) return;
    if (tab !== 'write') setTab('write'); // on small screens the textarea is hidden in Preview
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || placeholder;
    let prefix = before;
    // Line-level syntax (headings, lists) must start at the beginning of a line.
    if (linePrefix && start > 0 && value[start - 1] !== '\n') prefix = `\n${before}`;
    const next = value.slice(0, start) + prefix + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const selStart = start + prefix.length;
      el.setSelectionRange(selStart, selStart + selected.length);
    });
  }

  function onKeyDown(e) {
    // Tab inserts two spaces instead of leaving the field (Shift+Tab still escapes).
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = el;
      onChange(`${value.slice(0, s)}  ${value.slice(en)}`);
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    }
  }

  const tabBtn = (name, label) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === name}
      onClick={() => setTab(name)}
      className={`rounded-md px-3 py-1 text-sm font-medium ${
        tab === name
          ? 'bg-white/10 text-white'
          : 'text-slate-500 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  const showWrite = tab === 'write';
  const paneBase = 'min-h-[420px] lg:min-h-[560px]';

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
        <div className="flex items-center gap-1" role="tablist" aria-label="Editor mode">
          <span className={split ? 'lg:hidden' : ''}>{tabBtn('write', 'Write')}</span>
          <span className={split ? 'lg:hidden' : ''}>{tabBtn('preview', 'Preview')}</span>
          {split && (
            <span className="hidden px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:inline">
              Markdown · live preview
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          {ACTIONS.map((action) => (
            <button
              key={action[1]}
              type="button"
              title={action[1]}
              aria-label={action[1]}
              onClick={() => applyFormat(action)}
              className="rounded px-2 py-1 font-mono text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white"
            >
              {action[0]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSplit((s) => !s)}
            className="ml-1 hidden rounded border border-white/10 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-white/10 lg:inline-block"
          >
            {split ? 'Single pane' : 'Split view'}
          </button>
        </div>
      </div>

      <div className={split ? 'lg:grid lg:grid-cols-2' : ''}>
        <div className={`${showWrite ? 'block' : 'hidden'} ${split ? 'lg:block' : ''}`}>
          <label htmlFor={id} className="sr-only">Post content (Markdown)</label>
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck
            placeholder={'Write your post in Markdown…\n\n## A heading\n\nSome **bold** text and a code block:\n\n```js\nconsole.log("hello");\n```'}
            className={`${paneBase} block h-full w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none placeholder:text-slate-400`}
          />
        </div>
        <div
          className={`${showWrite ? 'hidden' : 'block'} ${split ? 'lg:block lg:border-l' : ''} ${paneBase} overflow-auto border-white/10 p-4 lg:max-h-[80vh]`}
          aria-label="Preview"
        >
          {preview.trim() ? (
            <MarkdownRenderer content={preview} />
          ) : (
            <p className="text-sm text-slate-400">Nothing to preview yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
