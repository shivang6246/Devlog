export default function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-surface px-6 py-16 text-center">
      <div aria-hidden="true" className="mx-auto mb-6 h-14 w-14 rounded-full border border-white/40 shadow-[0_0_24px_rgb(255_255_255/0.25),0_0_60px_rgb(45_82_255/0.35)]" />
      <h3 className="font-display text-3xl text-white">{title}</h3>
      {message && <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{message}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
