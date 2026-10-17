export default function ErrorMessage({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-300">{title}</p>
      {message && <p className="mt-1">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white underline underline-offset-4 hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
