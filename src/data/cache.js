// Small TTL cache backed by localStorage (falls back to memory when unavailable).
const PREFIX = 'musi:cache:';
const memory = new Map();

function store() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function cacheGet(key) {
  const now = Date.now();
  const s = store();
  let entry = memory.get(key);
  if (!entry && s) {
    try {
      entry = JSON.parse(s.getItem(PREFIX + key) || 'null');
    } catch {
      entry = null;
    }
  }
  if (!entry) return undefined;
  if (entry.exp < now) {
    memory.delete(key);
    if (s) s.removeItem(PREFIX + key);
    return undefined;
  }
  memory.set(key, entry);
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 24 * 60 * 60 * 1000) {
  const entry = { value, exp: Date.now() + ttlMs };
  memory.set(key, entry);
  const s = store();
  if (s) {
    try {
      s.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // Quota exceeded: clear old cache entries and keep the memory copy.
      clearCache();
    }
  }
}

export function clearCache() {
  memory.clear();
  const s = store();
  if (!s) return;
  for (let i = s.length - 1; i >= 0; i--) {
    const k = s.key(i);
    if (k && k.startsWith(PREFIX)) s.removeItem(k);
  }
}
