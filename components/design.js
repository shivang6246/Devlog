/**
 * Visual building blocks for the dark "museum" theme. Server-safe (no hooks),
 * so Server and Client Components can both use them.
 */

/** Splits text into words that rise out of a blur one after another. */
export function RevealText({ text, as: Tag = 'span', delay = 0, className = '' }) {
  const words = String(text).split(/\s+/).filter(Boolean);
  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="reveal-word" style={{ '--i': i, '--d': `${delay}ms` }}>
            {word}
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

/** The glowing ring with a dark orb in front of it. Size it with className (width). */
export function Eclipse({ className = '', children }) {
  return (
    <div aria-hidden="true" className={`eclipse ${className}`}>
      <div className="eclipse-ring" />
      {children || <div className="eclipse-orb" />}
    </div>
  );
}

/** Tiny tracked uppercase label, e.g. "— Latest stories". */
export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-slate-500 ${className}`}>
      <span className="h-px w-8 bg-indigo-500 shadow-[0_0_8px_rgb(45_82_255/0.9)]" />
      {children}
    </p>
  );
}

/** "Spec sheet" rows from the reference: small label + large serif value. */
export function SpecSheet({ items, className = '' }) {
  return (
    <dl className={`grid grid-cols-3 gap-4 border-y border-white/10 sm:gap-6 ${className}`}>
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0 py-4 sm:py-5">
          <dt className="text-[9px] font-medium uppercase tracking-[0.22em] text-slate-500 sm:text-[10px] sm:tracking-[0.3em]">{label}</dt>
          <dd className="mt-1.5 font-display text-lg leading-tight text-white sm:text-[1.7rem]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Vertical rail of dots with a blue active bar (left side of the reference). */
export function RailPager({ count = 4, active = 0, className = '' }) {
  return (
    <div aria-hidden="true" className={`flex flex-col items-center gap-3 ${className}`}>
      {Array.from({ length: count }, (_, i) =>
        i === active ? (
          <span key={i} className="h-8 w-[2px] bg-indigo-500 shadow-[0_0_10px_rgb(45_82_255/0.9)]" />
        ) : (
          <span key={i} className="h-1 w-1 rounded-full bg-slate-500" />
        )
      )}
    </div>
  );
}
