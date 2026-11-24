import { Children, Fragment, cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscape } from '../lib/escapeStack.js';

const GAP = 4;
const MARGIN = 8;

/**
 * Popover menu rendered in a portal on document.body with fixed positioning, so row
 * transforms, animations, and overflow never clip it or stack it behind later rows.
 * Opens below the trigger (flips up near the bottom), clamps to the viewport, closes on
 * outside click, Escape, or scroll, and repositions on resize.
 */
export default function Menu({ children, label = 'More' }) {
  const [phase, setPhase] = useState('closed'); // closed | open | closing
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const timer = useRef(null);

  const close = () => {
    if (phase !== 'open') return;
    setPhase('closing');
    timer.current = setTimeout(() => setPhase('closed'), 160);
  };
  const toggle = () => {
    if (phase === 'open') return close();
    clearTimeout(timer.current);
    setPos(null);
    setPhase('open');
  };

  const place = () => {
    const b = btnRef.current?.getBoundingClientRect();
    const pop = popRef.current;
    if (!b || !pop) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const tabs = document.querySelector('.tabs');
    // Keep clear of the bottom tab bar when it is on screen.
    const bottomLimit = Math.min(vh, tabs ? tabs.getBoundingClientRect().top : vh) - MARGIN;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let top = b.bottom + GAP;
    let up = false;
    if (top + h > bottomLimit && b.top - GAP - h >= MARGIN) {
      top = b.top - GAP - h;
      up = true;
    }
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));
    const left = Math.max(MARGIN, Math.min(b.right - w, vw - w - MARGIN));
    setPos({ top, left, up });
  };

  // Latest callbacks for effects that must not re-subscribe on every parent render.
  const closeRef = useRef(close);
  const placeRef = useRef(place);
  closeRef.current = close;
  placeRef.current = place;

  useLayoutEffect(() => {
    if (phase !== 'open') return;
    if (!pos) {
      placeRef.current();
      return;
    }
    const pop = popRef.current;
    if (!pop || pop.contains(document.activeElement)) return;
    // Land on the first action once the popover is positioned and visible.
    const item = pop.querySelector('[role="menuitem"]');
    (item || pop).focus({ preventScroll: true });
  }, [phase, pos]);

  useEffect(() => {
    if (phase !== 'open') return undefined;
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      closeRef.current();
    };
    const onScroll = (e) => {
      if (popRef.current?.contains(e.target)) return;
      closeRef.current();
    };
    const onResize = () => placeRef.current();
    document.addEventListener('pointerdown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [phase]);
  // Escape goes through the shared stack so it closes only the topmost layer.
  useEscape(() => {
    close();
    btnRef.current?.focus();
  }, phase === 'open');
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="menu">
      <button ref={btnRef} className="menu__btn" aria-label={label} aria-haspopup="menu" aria-expanded={phase === 'open'} onClick={toggle}>
        ⋯
      </button>
      {phase !== 'closed' &&
        createPortal(
          <div
            ref={popRef}
            role="menu"
            tabIndex={-1}
            className={`menu__pop ${pos?.up ? 'menu__pop--up' : ''} ${phase === 'closing' ? 'is-closing' : ''}`}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
          >
            {markMenuItems(children(close))}
          </div>,
          document.body
        )}
    </div>
  );
}

function markMenuItems(nodes) {
  return Children.map(nodes, (node) => {
    if (!isValidElement(node)) return node;
    // Children.map does not walk into fragments, and menu actions are usually wrapped in one.
    if (node.type === Fragment) return markMenuItems(node.props.children);
    if (node.type !== 'button' && node.type !== 'a') return node;
    if (node.props.role === 'menuitem') return node;
    return cloneElement(node, { role: 'menuitem' });
  });
}
