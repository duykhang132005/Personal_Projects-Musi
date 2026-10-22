import { useState } from 'react';
import { BUCKETS, BUCKET_META, startComparison, currentOpponent, answer, finish, maxComparisons } from '../lib/ranking.js';
import ItemCard from './ItemCard.jsx';

/**
 * Modal flow: pick a bucket, then answer "which is better?" until the item is placed.
 * onDone(kind, bucket, orderedIds) persists the result.
 */
export default function RateFlow({ item, lib, onDone, onCancel, preview }) {
  const [bucket, setBucket] = useState(null);
  const [state, setState] = useState(null);

  function pick(b) {
    const s = startComparison(lib.lists[item.kind][b], item.id);
    setBucket(b);
    if (s.done) onDone(item.kind, b, finish(s));
    else setState(s);
  }

  function choose(choice) {
    const next = answer(state, choice);
    if (next.done) onDone(item.kind, bucket, finish(next));
    else setState(next);
  }

  const opponent = state ? lib.items[currentOpponent(state)] : null;

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet">
        <button className="sheet__close" onClick={onCancel} aria-label="Close">×</button>
        {!state && (
          <div key="bucket" className="step-in">
            <h2>How was it?</h2>
            <ItemCard item={item} preview={preview} />
            <div className="buckets">
              {BUCKETS.map((b) => (
                <button key={b} className={`bucket bucket--${b}`} onClick={() => pick(b)}>
                  <span className="bucket__dot" />
                  {BUCKET_META[b].label}
                </button>
              ))}
            </div>
            <button className="btn btn--ghost sheet__cancel" onClick={onCancel}>Cancel</button>
          </div>
        )}
        {state && opponent && (
          <div key={`q${state.steps}`} className="step-in">
            <h2>Which is better?</h2>
            <p className="muted tiny">
              Question {state.steps + 1} of at most {state.steps + maxComparisons(state.hi - state.lo)}
            </p>
            <div className="versus">
              <button className="versus__pick" onClick={() => choose('new')}>
                <ItemCard item={item} compact />
              </button>
              <div className="versus__or">or</div>
              <button className="versus__pick" onClick={() => choose('existing')}>
                <ItemCard item={opponent} compact />
              </button>
            </div>
            <div className="sheet__foot">
              <button className="btn" onClick={() => choose('tie')}>Too close to call</button>
              <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
