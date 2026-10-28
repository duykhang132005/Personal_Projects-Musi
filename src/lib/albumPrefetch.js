import { useEffect, useRef } from 'react';
import { getProvider } from '../data/providers/index.js';
import { albumsNeedingTracks, setAlbumTracks } from './library.js';

/**
 * Fetches tracklists for albums that do not have one yet (for example albums auto-added
 * when one of their songs is rated), so the Albums tab shows the right track count,
 * metadata, and song links without opening the album first.
 * The provider caches lookups; this layer dedupes in-flight requests, limits concurrency,
 * and does not retry an album that failed during this session.
 */
export function createAlbumPrefetcher(provider, { concurrency = 3 } = {}) {
  const inFlight = new Map(); // albumId -> Promise
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

  return {
    /** Resolves to { album, tracks } or null on failure or when skipped. */
    fetch(albumId) {
      if (failed.has(albumId)) return Promise.resolve(null);
      if (inFlight.has(albumId)) return inFlight.get(albumId);
      const p = new Promise((resolve) => {
        waiting.push(() =>
          provider
            .getAlbumTracks(albumId)
            .then(resolve, () => {
              failed.add(albumId);
              resolve(null);
            })
            .finally(() => inFlight.delete(albumId))
        );
        pump();
      });
      inFlight.set(albumId, p);
      return p;
    },
    isInFlight: (albumId) => inFlight.has(albumId),
  };
}

let shared = null;

/** React hook: whenever the library gains albums without tracklists, fetch them. */
export function useAlbumPrefetch(lib, update) {
  const prefetcher = useRef(null);
  if (!prefetcher.current) prefetcher.current = shared || (shared = createAlbumPrefetcher(getProvider()));

  useEffect(() => {
    for (const album of albumsNeedingTracks(lib)) {
      if (prefetcher.current.isInFlight(album.id)) continue;
      prefetcher.current.fetch(album.id).then((r) => {
        if (!r) return;
        update((l) => (l.items[album.id] ? setAlbumTracks(l, { ...album, ...(r.album || {}) }, r.tracks) : l));
      });
    }
  }, [lib, update]);
}
