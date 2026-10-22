import { makeItemId, assertProvider } from './MusicProvider.js';
import { cacheGet, cacheSet } from '../cache.js';

const BASE = 'https://itunes.apple.com';
const PROVIDER = 'itunes';

function bigArt(url) {
  // iTunes returns 100x100 artwork; the same CDN serves larger sizes.
  return url ? url.replace(/\/\d+x\d+bb\./, '/600x600bb.') : '';
}

export function normalizeItunes(r) {
  if (!r) return null;
  if (r.wrapperType === 'track' || r.kind === 'song') {
    return {
      id: makeItemId(PROVIDER, 'song', r.trackId),
      provider: PROVIDER,
      kind: 'song',
      title: r.trackName || '',
      artist: r.artistName || '',
      album: r.collectionName || '',
      albumId: r.collectionId ? makeItemId(PROVIDER, 'album', r.collectionId) : '',
      albumArtist: r.collectionArtistName || '',
      trackNumber: r.trackNumber || 0,
      discNumber: r.discNumber || 1,
      artworkUrl: bigArt(r.artworkUrl100 || r.artworkUrl60),
      previewUrl: r.previewUrl || '',
      externalUrl: r.trackViewUrl || '',
      releaseDate: r.releaseDate || '',
    };
  }
  if (r.wrapperType === 'collection' || r.collectionType === 'Album') {
    return {
      id: makeItemId(PROVIDER, 'album', r.collectionId),
      provider: PROVIDER,
      kind: 'album',
      title: r.collectionName || '',
      artist: r.artistName || '',
      album: r.collectionName || '',
      albumId: makeItemId(PROVIDER, 'album', r.collectionId),
      trackCount: r.trackCount || 0,
      artworkUrl: bigArt(r.artworkUrl100 || r.artworkUrl60),
      previewUrl: '',
      externalUrl: r.collectionViewUrl || '',
      releaseDate: r.releaseDate || '',
    };
  }
  return null;
}

async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`iTunes request failed (${res.status})`);
  return res.json();
}

export function createItunesProvider({ fetchImpl = (...a) => fetch(...a), country = 'US' } = {}) {
  return assertProvider({
    id: PROVIDER,

    async search(term, kind = 'song', { limit = 25 } = {}) {
      const q = String(term || '').trim();
      if (!q) return [];
      const key = `itunes:search:${country}:${kind}:${limit}:${q.toLowerCase()}`;
      const cached = cacheGet(key);
      if (cached) return cached;
      const entity = kind === 'album' ? 'album' : 'song';
      const url = `${BASE}/search?term=${encodeURIComponent(q)}&media=music&entity=${entity}&limit=${limit}&country=${country}`;
      const data = await getJson(url, fetchImpl);
      const items = (data.results || []).map(normalizeItunes).filter((x) => x && x.kind === kind);
      cacheSet(key, items);
      return items;
    },

    async getById(id, kind = 'song') {
      const nativeId = String(id).split(':').pop();
      const key = `itunes:lookup:${country}:${nativeId}`;
      const cached = cacheGet(key);
      if (cached) return cached;
      const data = await getJson(`${BASE}/lookup?id=${encodeURIComponent(nativeId)}&country=${country}`, fetchImpl);
      const item = (data.results || []).map(normalizeItunes).find((x) => x && x.kind === kind) || null;
      if (item) cacheSet(key, item, 7 * 24 * 60 * 60 * 1000);
      return item;
    },

    async getAlbumTracks(albumId) {
      const nativeId = String(albumId).split(':').pop();
      const key = `itunes:tracks:${country}:${nativeId}`;
      const cached = cacheGet(key);
      if (cached) return cached;
      const data = await getJson(
        `${BASE}/lookup?id=${encodeURIComponent(nativeId)}&entity=song&limit=200&country=${country}`,
        fetchImpl
      );
      const items = (data.results || []).map(normalizeItunes).filter(Boolean);
      const album = items.find((x) => x.kind === 'album') || null;
      const tracks = items
        .filter((x) => x.kind === 'song')
        .sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber);
      const result = { album, tracks };
      cacheSet(key, result, 7 * 24 * 60 * 60 * 1000);
      return result;
    },
  });
}
