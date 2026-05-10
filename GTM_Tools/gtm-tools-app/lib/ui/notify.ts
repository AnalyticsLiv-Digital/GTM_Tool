// Single import surface for non-blocking user notices. Wraps react-toastify so
// callers don't need to know it; we can swap the implementation later (e.g.
// sonner) without touching every callsite.

import { toast } from "react-toastify";

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  warning: (message: string) => toast.warning(message),
};
