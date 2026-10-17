import Form from 'next/form';

/** Plain GET form (works without JS); next/form upgrades it to client navigation. */
export default function SearchBox({ defaultValue = '' }) {
  return (
    <Form action="/" role="search" className="group relative w-full">
      <label htmlFor="search" className="sr-only">Search posts by title</label>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition group-focus-within:text-indigo-400"
      >
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z" clipRule="evenodd" />
      </svg>
      <input
        id="search"
        name="search"
        type="search"
        defaultValue={defaultValue}
        maxLength={100}
        placeholder="Search the archive…"
        className="w-full border-0 border-b border-white/15 bg-transparent py-3 pl-7 pr-2 font-display text-xl text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
      />
      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-indigo-500 shadow-[0_0_12px_rgb(45_82_255/0.9)] transition-all duration-700 group-focus-within:w-full" />
    </Form>
  );
}
