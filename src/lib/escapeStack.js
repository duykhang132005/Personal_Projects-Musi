import { useEffect, useRef } from 'react';

// Stack of Escape handlers so only the topmost layer (menu, rating window, album page) closes.
const stack = [];

export function handleEscapeKey(e) {
  if (e.key !== 'Escape' || stack.length === 0) return false;
  e.preventDefault?.();
  stack[stack.length - 1].current();
  return true;
}

export function pushEscape(entry) {
  stack.push(entry);
  if (stack.length === 1 && typeof document !== 'undefined') document.addEventListener('keydown', handleEscapeKey);
  return () => {
    const i = stack.lastIndexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    if (stack.length === 0 && typeof document !== 'undefined') document.removeEventListener('keydown', handleEscapeKey);
  };
}

/** Call handler on Escape while active, only if this is the most recently opened layer. */
export function useEscape(handler, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return undefined;
    return pushEscape({ current: () => ref.current() });
  }, [active]);
}

/** Move focus into a dialog on open and restore it to the previous element on close. */
export function useDialogFocus(ref) {
  useEffect(() => {
    const prev = typeof document !== 'undefined' ? document.activeElement : null;
    ref.current?.focus({ preventScroll: true });
    return () => {
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [ref]);
}
