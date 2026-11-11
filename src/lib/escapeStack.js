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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isShown(el) {
  if (el.disabled || el.hidden) return false;
  if (el.getAttribute('aria-disabled') === 'true') return false;
  if (el.inert || el.closest('[inert]')) return false;
  if (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]')) return false;
  const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null;
  if (style && (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')) return false;
  return true;
}

function focusablesIn(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(isShown);
}

/** Move focus into a dialog on open, trap Tab inside it, and restore focus on close. */
export function useDialogFocus(ref) {
  useEffect(() => {
    const root = ref.current;
    const prev = typeof document !== 'undefined' ? document.activeElement : null;
    root?.focus({ preventScroll: true });

    function onKey(e) {
      if (e.key !== 'Tab' || !root) return;
      const list = focusablesIn(root);
      if (list.length === 0) {
        e.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      const outside = active === root || !root.contains(active);
      if (e.shiftKey) {
        if (active === first || outside) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (active === last || outside) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    root?.addEventListener('keydown', onKey);
    return () => {
      root?.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [ref]);
}
