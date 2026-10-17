import Link from 'next/link';

/** `buildHref(page)` returns the URL for a given page number. */
export default function Pagination({ page, pages, buildHref }) {
  if (pages <= 1) return null;
  const btn =
    'text-[11px] font-medium uppercase tracking-[0.25em] text-slate-300 transition hover:text-white';
  const off = 'text-[11px] font-medium uppercase tracking-[0.25em] text-slate-300 opacity-30';
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between">
      {page <= 1 ? (
        <span aria-disabled="true" className={off}>← Newer</span>
      ) : (
        <Link href={buildHref(page - 1)} className={btn}>← Newer</Link>
      )}
      <span className="font-display text-lg text-slate-400">
        <span className="text-white">{String(page).padStart(2, '0')}</span>
        <span className="mx-2 text-slate-600">/</span>
        {String(pages).padStart(2, '0')}
      </span>
      {page >= pages ? (
        <span aria-disabled="true" className={off}>Older →</span>
      ) : (
        <Link href={buildHref(page + 1)} className={btn}>Older →</Link>
      )}
    </nav>
  );
}
