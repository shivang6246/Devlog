import Link from 'next/link';

export default function TagPill({ tag, count, size = 'sm' }) {
  const pad = size === 'md' ? 'px-3.5 py-1.5 text-[11px]' : 'px-2.5 py-1 text-[10px]';
  return (
    <Link
      href={`/tag/${tag.slug}`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 font-medium uppercase tracking-[0.18em] text-slate-400 transition hover:border-indigo-500/70 hover:text-white hover:shadow-[0_0_18px_rgb(45_82_255/0.35)] ${pad}`}
    >
      <span className="text-indigo-400">#</span>
      {tag.name}
      {typeof count === 'number' && <span className="tabular-nums text-slate-600">{count}</span>}
    </Link>
  );
}
