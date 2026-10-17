'use client';

import { useEffect, useRef } from 'react';
import { Spinner, dangerButton, secondaryButton } from './ui';

/** Modal confirmation built on native <dialog> (focus trap + Esc handling for free). */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault(); // keep React state as the source of truth
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel(); // backdrop click
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-slate-950 p-0 text-slate-100 shadow-[0_40px_120px_-20px_rgb(0_0_0/0.9),0_0_60px_-20px_rgb(45_82_255/0.4)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h2 className="font-display text-3xl text-white">{title}</h2>
        {message && <p className="mt-2 text-sm text-slate-400">{message}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={secondaryButton} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={dangerButton}>
            {busy && <Spinner />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
