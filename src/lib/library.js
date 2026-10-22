import { BUCKETS, scoreFor, bucketForScore } from './ranking.js';

export const STORAGE_KEY = 'musi:library:v1';
// v2: albums are no longer ranked directly; their score is the average of their rated songs.
export const SCHEMA_VERSION = 2;

const emptyBuckets = () => ({ liked: [], fine: [], disliked: [] });

export function emptyLibrary() {
  return {
    version: SCHEMA_VERSION,
    items: {}, // id -> normalized item (plus addedAt)
    lists: { song: emptyBuckets(), album: emptyBuckets() }, // album buckets stay empty since v2
    queue: [], // want-to-listen ids
  };
}

export function addItem(lib, item) {
  if (lib.items[item.id]) return lib;
  return { ...lib, items: { ...lib.items, [item.id]: { ...item, addedAt: Date.now() } } };
}

export function bucketOf(lib, id) {
  const item = lib.items[id];
  if (!item || item.kind !== 'song') return null;
  const buckets = lib.lists[item.kind];
  return BUCKETS.find((b) => buckets[b].includes(id)) || null;
}

function withoutInBuckets(lib, kind, id) {
  const cur = lib.lists[kind];
  const next = {};
  for (const b of BUCKETS) next[b] = cur[b].filter((x) => x !== id);
  return { ...lib.lists, [kind]: next };
}

/** Replace a bucket's ordered list (result of a finished comparison). */
export function setBucketOrder(lib, kind, bucket, orderedIds) {
  let lists = lib.lists;
  for (const id of orderedIds) {
    // make sure an id only lives in one bucket
    lists = withoutInBuckets({ ...lib, lists }, kind, id);
  }
  lists = { ...lists, [kind]: { ...lists[kind], [bucket]: orderedIds.slice() } };
  const queue = lib.queue.filter((id) => !orderedIds.includes(id));
  return { ...lib, lists, queue };
}

export function removeItem(lib, id) {
  const item = lib.items[id];
  if (!item) return lib;
  const items = { ...lib.items };
  delete items[id];
  return {
    ...lib,
    items,
    lists: withoutInBuckets(lib, item.kind, id),
    queue: lib.queue.filter((x) => x !== id),
  };
}

export function addToQueue(lib, item) {
  const withItem = addItem(lib, item);
  if (withItem.queue.includes(item.id) || bucketOf(withItem, item.id)) return withItem;
  return { ...withItem, queue: [...withItem.queue, item.id] };
}

export function removeFromQueue(lib, id, { dropItem = true } = {}) {
  const next = { ...lib, queue: lib.queue.filter((x) => x !== id) };
  return dropItem && !bucketOf(next, id) ? removeItem(next, id) : next;
}

/** Score lookup for every ranked song: id -> score. */
export function songScores(lib) {
  const map = {};
  for (const bucket of BUCKETS) {
    const ids = lib.lists.song[bucket];
    ids.forEach((id, i) => (map[id] = scoreFor(bucket, i, ids.length)));
  }
  return map;
}

/** Song ids that belong to an album: its stored tracklist plus any songs linked by albumId. */
export function albumTrackIds(lib, albumId) {
  const album = lib.items[albumId];
  const ids = new Set(album?.trackIds || []);
  for (const it of Object.values(lib.items)) if (it.kind === 'song' && it.albumId === albumId) ids.add(it.id);
  return [...ids];
}

/**
 * Derived album rating.
 * { average: number | null, rated, total, complete }
 * total is the tracklist length when known, otherwise the number of linked songs.
 */
export function albumStats(lib, albumId, scores = songScores(lib)) {
  const album = lib.items[albumId];
  const ids = albumTrackIds(lib, albumId);
  const rated = ids.map((id) => scores[id]).filter((s) => typeof s === 'number');
  const total = Math.max(album?.trackIds?.length || album?.trackCount || 0, ids.length);
  const average = rated.length ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10 : null;
  return { average, rated: rated.length, total, complete: total > 0 && rated.length >= total };
}

/** Store an album's tracklist and link already-known songs to it. */
export function setAlbumTracks(lib, album, tracks) {
  const trackIds = tracks.map((t) => t.id);
  const items = { ...lib.items };
  const existing = items[album.id];
  if (existing) {
    // Fill in metadata the stored album may lack (e.g. stubs created from a song).
    items[album.id] = {
      ...existing,
      artworkUrl: existing.artworkUrl || album.artworkUrl || '',
      externalUrl: existing.externalUrl || album.externalUrl || '',
      releaseDate: existing.releaseDate || album.releaseDate || '',
      trackIds,
      trackCount: trackIds.length,
    };
  }
  for (const t of tracks) if (items[t.id] && !items[t.id].albumId) items[t.id] = { ...items[t.id], albumId: album.id };
  return { ...lib, items };
}

/** Add the album (with tracklist if known) to the library when one of its songs is rated. */
export function ensureAlbum(lib, album, trackIds) {
  if (!album) return lib;
  const cur = lib.items[album.id];
  const merged = { ...album, ...(cur || {}), addedAt: cur?.addedAt || Date.now() };
  if (trackIds?.length && !cur?.trackIds?.length) {
    merged.trackIds = trackIds;
    merged.trackCount = trackIds.length;
  }
  return { ...lib, items: { ...lib.items, [album.id]: merged } };
}

/** Build a minimal album item from a song when the full album is not at hand. */
export function albumFromSong(song) {
  if (!song?.albumId) return null;
  return {
    id: song.albumId, provider: song.provider, kind: 'album', title: song.album, artist: song.albumArtist || song.artist,
    album: song.album, artworkUrl: song.artworkUrl, previewUrl: '', externalUrl: '', releaseDate: song.releaseDate,
    albumId: song.albumId,
  };
}

/** All ranked items of a kind with derived scores, best first. Albums need at least one rated song. */
export function rankedList(lib, kind) {
  if (kind === 'album') {
    const scores = songScores(lib);
    const out = [];
    for (const item of Object.values(lib.items)) {
      if (item.kind !== 'album') continue;
      const stats = albumStats(lib, item.id, scores);
      if (stats.average === null) continue;
      out.push({ item, bucket: bucketForScore(stats.average), rank: 0, score: stats.average, stats });
    }
    out.sort((a, b) => b.score - a.score || b.stats.rated - a.stats.rated);
    out.forEach((r, i) => (r.rank = i + 1));
    return out;
  }
  const out = [];
  for (const bucket of BUCKETS) {
    const ids = lib.lists[kind][bucket];
    ids.forEach((id, i) => {
      const item = lib.items[id];
      if (item) out.push({ item, bucket, rank: 0, score: scoreFor(bucket, i, ids.length) });
    });
  }
  out.sort((a, b) => b.score - a.score);
  out.forEach((r, i) => (r.rank = i + 1));
  return out;
}

/** Library items not yet ranked and not in the queue. */
export function unrankedItems(lib, kind) {
  const scores = songScores(lib);
  const isRanked = (it) => (it.kind === 'album' ? albumStats(lib, it.id, scores).average !== null : !!bucketOf(lib, it.id));
  return Object.values(lib.items)
    .filter((it) => it.kind === kind && !isRanked(it) && !lib.queue.includes(it.id))
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

// ---------- persistence ----------

export function validateLibrary(data) {
  if (!data || typeof data !== 'object') throw new Error('Not a Musi library file');
  if (typeof data.items !== 'object' || !data.lists || !Array.isArray(data.queue)) {
    throw new Error('Library file is missing items, lists, or queue');
  }
  const lib = emptyLibrary();
  for (const [id, it] of Object.entries(data.items)) {
    if (it && it.id === id && (it.kind === 'song' || it.kind === 'album')) lib.items[id] = it;
  }
  // v1 -> v2 migration: drop direct album rankings (albums stay in the library, now derived).
  for (const kind of ['song']) {
    for (const b of BUCKETS) {
      const ids = data.lists?.[kind]?.[b];
      if (Array.isArray(ids)) lib.lists[kind][b] = ids.filter((id) => lib.items[id]?.kind === kind);
    }
  }
  lib.queue = data.queue.filter((id) => lib.items[id]);
  lib.version = SCHEMA_VERSION;
  return lib;
}

export function exportLibrary(lib) {
  return JSON.stringify({ ...lib, exportedAt: new Date().toISOString(), app: 'musi' }, null, 2);
}

export function importLibrary(text) {
  return validateLibrary(JSON.parse(text));
}

export function loadLibrary(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? validateLibrary(JSON.parse(raw)) : emptyLibrary();
  } catch {
    return emptyLibrary();
  }
}

export function saveLibrary(lib, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(lib));
  } catch {
    // ignore quota errors
  }
}
