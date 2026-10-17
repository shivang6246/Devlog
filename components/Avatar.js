import { initials } from '@/lib/format';

const SIZES = {
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-24 w-24 text-3xl',
};

export default function Avatar({ name, src, size = 'md', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.md;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name}'s avatar` : 'Avatar'}
        className={`${sizeClass} shrink-0 rounded-full bg-slate-800 object-cover grayscale-[35%] ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 font-display tracking-wide text-white ring-1 ring-white/10 ${className}`}
    >
      {initials(name)}
    </span>
  );
}
