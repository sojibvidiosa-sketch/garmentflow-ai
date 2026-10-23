"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-card border border-border bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/30"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-secondary hover:bg-subtle" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <div className="px-5 py-4 text-[13px] text-secondary">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
    </dialog>
  );
}
