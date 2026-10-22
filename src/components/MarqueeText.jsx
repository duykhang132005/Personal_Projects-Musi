import { useRef, useState, useCallback, useEffect } from 'react';

const SPEED = 40; // px per second
const PAUSE = 0.9; // seconds held at each end

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Single-line text with ellipsis. When it actually overflows, hovering (desktop) or
 * focusing/tapping (mobile) scrolls it back and forth to reveal the full text.
 */
export default function MarqueeText({ text, className = '', focusable = true }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [anim, setAnim] = useState(null);
  const animRef = useRef(null);

  const start = useCallback(() => {
    const o = outer.current;
    if (!o || reducedMotion()) return;
    const overflow = o.scrollWidth - o.clientWidth;
    if (overflow <= 1) return;
    const shift = overflow + 4;
    const travel = shift / SPEED;
    const total = (travel + PAUSE) * 2; // there and back, pausing at each end
    const p = PAUSE / total;
    const t = travel / total;
    setAnim(true);
    // Web Animations API so the pause offsets can depend on the measured length.
    requestAnimationFrame(() => {
      const el = inner.current;
      if (!el) return;
      animRef.current?.cancel();
      animRef.current = el.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: p / 2 },
          { transform: `translateX(-${shift}px)`, offset: p / 2 + t },
          { transform: `translateX(-${shift}px)`, offset: p * 1.5 + t },
          { transform: 'translateX(0)', offset: Math.min(1, p * 1.5 + t * 2) },
          { transform: 'translateX(0)', offset: 1 },
        ],
        { duration: total * 1000, iterations: Infinity, easing: 'linear' }
      );
    });
  }, []);
  const stop = useCallback(() => {
    animRef.current?.cancel();
    animRef.current = null;
    setAnim(null);
  }, []);
  useEffect(() => () => animRef.current?.cancel(), []);
  const toggle = (e) => {
    if (e.pointerType === 'mouse') return;
    anim ? stop() : start();
  };

  return (
    <span
      ref={outer}
      className={`mq ${anim ? 'mq--on' : ''} ${className}`}
      title={text}
      tabIndex={focusable ? 0 : undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && start()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && stop()}
      onPointerUp={toggle}
      onFocus={start}
      onBlur={stop}
    >
      <span ref={inner} className="mq__inner">{text}</span>
    </span>
  );
}
