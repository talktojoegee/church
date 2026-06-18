'use client';

import { toast as toastStore } from './toast-store';

/** Imperative toast API — works inside and outside React components. */
export function useToast() {
  return toastStore;
}

export { toastStore as toast };
