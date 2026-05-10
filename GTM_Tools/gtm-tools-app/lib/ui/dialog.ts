// Imperative confirm-dialog API. Anywhere in the app:
//
//   import { confirmDialog } from '@/lib/ui/dialog';
//   if (!(await confirmDialog({ title: 'Delete this tag?', danger: true }))) return;
//
// A single <DialogHost /> mounted in the root layout listens for these calls
// and renders a real, a11y-correct modal — no provider-tree wiring required.
//
// If the host isn't mounted yet (SSR boundary, error in layout), we fall back
// to native window.confirm so callers never crash.

import type { ReactNode } from "react";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type DialogState = ConfirmOptions & { resolve: (value: boolean) => void };

type Listener = (state: DialogState | null) => void;

let listener: Listener | null = null;

export function _registerDialog(l: Listener | null): void {
  listener = l;
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!listener) {
    const fallback =
      typeof options.description === "string" ? options.description : options.title;
    return Promise.resolve(window.confirm(fallback));
  }
  return new Promise((resolve) => {
    listener?.({ ...options, resolve });
  });
}
