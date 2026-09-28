'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Admin dialog: a centered dialog by default, or a right slide-over when
// variant="drawer". Closes on ✕, backdrop click, and Esc; locks body scroll.
// Same {open,onClose,title,children} API as before.
export function Modal({
  open,
  onClose,
  title,
  children,
  variant = 'dialog',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'dialog' | 'drawer';
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const drawer = variant === 'drawer';
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${drawer ? 'justify-end' : 'items-center justify-center p-4'}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={
          drawer
            ? 'drawer-panel relative flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl'
            : 'modal-panel relative flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-[#e7eaef] bg-white shadow-2xl'
        }
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#eceef2] px-5 py-3.5">
          <div className="text-[15px] font-bold text-[#111827]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="text-lg text-[#94a3b8] transition hover:text-[#111827]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
