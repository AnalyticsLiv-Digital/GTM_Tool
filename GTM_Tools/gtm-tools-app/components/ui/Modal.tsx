"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

// A11y-correct modal built on the native <dialog> element. We get focus trap,
// Esc-to-close, and top-layer rendering for free; we add backdrop-click close,
// scroll lock, and React-friendly open/close lifecycle on top.

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  // Drive native open/close from the React `open` prop.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Browser fires `cancel` on Esc — we hijack to keep React state authoritative.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

  // Backdrop click — clicks land on the <dialog> element itself when on backdrop.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d || !closeOnBackdrop) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === d) onClose();
    };
    d.addEventListener("click", onClick);
    return () => d.removeEventListener("click", onClick);
  }, [onClose, closeOnBackdrop]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Initial focus override — runs after showModal so the focus trap is live.
  useEffect(() => {
    if (!open || !initialFocusRef?.current) return;
    const id = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open, initialFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className={`p-0 rounded-xl shadow-lg border border-edge bg-card text-fg backdrop:bg-black/55 backdrop:backdrop-blur-sm w-full ${sizeClass[size]}`}
    >
      <div className="flex flex-col">
        {(title || description) && (
          <div className="px-5 pt-5 pb-3 border-b border-line">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-fg">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
        )}
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && (
          <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-end gap-2 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
