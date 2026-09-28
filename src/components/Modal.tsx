'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Generic dark modal: a bottom-sheet on mobile, a centered dialog on desktop.
// Closes on ✕, backdrop click, and Esc. Locks body scroll while open.
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="modal-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal-panel relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[22px] border border-[#242833] bg-[#12151b] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:max-h-[85vh] sm:max-w-[520px] sm:rounded-2xl">
        {/* drag handle (mobile) */}
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-[#2f3a44] sm:hidden" />
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-3">
          <div className="text-base font-bold text-[#f3f5f8]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="text-lg text-[#7d8595] transition hover:text-[#f3f5f8]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
