export default function LoadingSpinner({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-5 py-16 ${className}`}>
      <span aria-hidden="true" className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border border-white/10" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white shadow-[0_0_20px_rgb(45_82_255/0.5)]" />
      </span>
      <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">{label}</span>
    </div>
  );
}
