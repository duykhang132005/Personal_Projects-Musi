import { useEffect, useState } from 'react';
import { getProvider } from '../data/providers/index.js';
import { albumsNeedingTracks, setAlbumTracks } from './library.js';

/**
 * Fetches tracklists for albums that do not have one yet (for example albums auto-added
 * when one of their songs is rated), so the Albums tab shows the right track count,
 * metadata, and song links without opening the album first.
 * The provider caches lookups; this layer dedupes in-flight requests, limits concurrency,
 * and skips background retries of an album that failed until resetFailed() is called.
 */
export function createAlbumPrefetcher(provider, { concurrency = 3 } = {}) {
  const inFlight = new Map(); // albumId -> Promise (rejects on failure)
  const failed = new Set();
  const waiting = [];
  let active = 0;

  function pump() {
    while (active < concurrency && waiting.length) {
      const job = waiting.shift();
      active += 1;
      job().finally(() => {
        active -= 1;
        pump();
      });
    }
  }

  /** Shared load: reuses an in-flight request, rejects on failure. `urgent` jumps the queue. */
  function load(albumId, { urgent = false } = {}) {
    if (inFlight.has(albumId)) return inFlight.get(albumId);
    const p = new Promise((resolve, reject) => {
      const job = () =>
        provider
          .getAlbumTracks(albumId)
          .then(
            (r) => {
              failed.delete(albumId);
              resolve(r);
            },
            (e) => {
              failed.add(albumId);
              reject(e);
            }
          )
          .finally(() => inFlight.delete(albumId));
      if (urgent) waiting.unshift(job);
      else waiting.push(job);
      pump();
    });
    inFlight.set(albumId, p);
    return p;
  }

  return {
    load,
    /** Background fetch: resolves to { album, tracks } or null on failure or a known failed album. */
    fetch(albumId) {
      if (failed.has(albumId) && !inFlight.has(albumId)) return Promise.resolve(null);
      return load(albumId).catch(() => null);
    },
    isInFlight: (albumId) => inFlight.has(albumId),
    resetFailed: () => failed.clear(),
  };
}

let shared = null;

/** The app-wide prefetcher, shared by the background prefetch and the album page. */
export function getAlbumPrefetcher() {
  if (!shared) shared = createAlbumPrefetcher(getProvider());
  return shared;
}

/**
 * Calls onOnline when the browser reconnects. Returns a cleanup function.
 * No-op outside a browser (e.g. tests without a window).
 */
export function onReconnect(onOnline, target = typeof window !== 'undefined' ? window : null) {
  if (!target?.addEventListener) return () => {};
  target.addEventListener('online', onOnline);
  return () => target.removeEventListener('online', onOnline);
}

/** React hook: whenever the library gains albums without tracklists, fetch them. */
export function useAlbumPrefetch(lib, update) {
  const prefetcher = getAlbumPrefetcher();
  const [pass, setPass] = useState(0);

  // Back online: forget failures and run another pass.
  useEffect(
    () =>
      onReconnect(() => {
        prefetcher.resetFailed();
        setPass((n) => n + 1);
      }),
    [prefetcher]
  );

  useEffect(() => {
    for (const album of albumsNeedingTracks(lib)) {
      if (prefetcher.isInFlight(album.id)) continue;
      prefetcher.fetch(album.id).then((r) => {
        if (!r) return;
        update((l) => (l.items[album.id] ? setAlbumTracks(l, { ...album, ...(r.album || {}) }, r.tracks) : l));
      });
    }
  }, [lib, update, prefetcher, pass]);
}
