// Comparison engine: pick a bucket, then binary insertion via "which is better?" questions.
// Lists are ordered best first (index 0 is the top).

export const BUCKETS = ['liked', 'fine', 'disliked'];

export const BUCKET_META = {
  liked: { label: 'I liked it', short: 'Liked', min: 6.7, max: 10 },
  fine: { label: 'It was fine', short: 'Fine', min: 3.4, max: 6.7 },
  disliked: { label: "I didn't like it", short: 'Disliked', min: 0, max: 3.3 },
};

/** Derived 0-10 score from position within a bucket. */
export function scoreFor(bucket, index, count) {
  const meta = BUCKET_META[bucket];
  if (!meta) throw new Error(`Unknown bucket: ${bucket}`);
  if (count <= 1) return round1(meta.max);
  const t = index / (count - 1);
  return round1(meta.max - t * (meta.max - meta.min));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Begin inserting newId into an existing ordered list of ids. */
export function startComparison(list, newId) {
  const clean = list.filter((id) => id !== newId);
  return { list: clean, newId, lo: 0, hi: clean.length, steps: 0, done: clean.length === 0 };
}

export function midIndex(state) {
  return Math.floor((state.lo + state.hi) / 2);
}

/** The id the new item should be compared against, or null when done. */
export function currentOpponent(state) {
  if (state.done) return null;
  return state.list[midIndex(state)];
}

/**
 * Record an answer.
 * 'new'      : the new item is better than the opponent
 * 'existing' : the opponent is better
 * 'tie'      : about the same, place directly above the opponent and stop
 */
export function answer(state, choice) {
  if (state.done) return state;
  const mid = midIndex(state);
  let { lo, hi } = state;
  if (choice === 'new') hi = mid;
  else if (choice === 'existing') lo = mid + 1;
  else if (choice === 'tie') {
    lo = mid;
    hi = mid;
  } else throw new Error(`Unknown choice: ${choice}`);
  return { ...state, lo, hi, steps: state.steps + 1, done: lo >= hi };
}

export function resultIndex(state) {
  return state.lo;
}

export function finish(state) {
  const out = state.list.slice();
  out.splice(resultIndex(state), 0, state.newId);
  return out;
}

/** Worst-case number of comparisons to insert into a list of length n. */
export function maxComparisons(n) {
  return n <= 0 ? 0 : Math.ceil(Math.log2(n + 1));
}

/** Bucket whose score range contains a derived score (used to color album averages). */
export function bucketForScore(score) {
  if (score >= BUCKET_META.liked.min) return 'liked';
  if (score >= BUCKET_META.fine.min) return 'fine';
  return 'disliked';
}
