// Shared class strings so forms and buttons look the same everywhere (dark museum theme).

export const inputClass =
  'block w-full rounded-lg border border-white/10 bg-field px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-indigo-500 focus:bg-field focus:shadow-[0_0_0_3px_rgb(45_82_255/0.18),0_0_24px_rgb(45_82_255/0.2)] disabled:opacity-60';

export const labelClass = 'mb-2 block text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-50';

export const primaryButton = `${buttonBase} bg-indigo-600 text-onaccent shadow-[0_0_28px_rgb(45_82_255/0.45)] hover:bg-indigo-500 hover:shadow-[0_0_36px_rgb(45_82_255/0.65)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500`;

export const secondaryButton = `${buttonBase} border border-white/15 text-slate-200 hover:border-white/40 hover:text-white`;

export const dangerButton = `${buttonBase} bg-red-600 text-onaccent shadow-[0_0_24px_rgb(220_38_38/0.35)] hover:bg-red-500`;

export const panelClass = 'rounded-2xl border border-white/10 bg-surface shadow-surface backdrop-blur-sm';

export function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
