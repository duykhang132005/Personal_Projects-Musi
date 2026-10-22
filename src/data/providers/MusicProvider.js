/**
 * MusicProvider interface.
 *
 * Every provider (iTunes Search today, Apple MusicKit later) implements:
 *   id: string                                   unique provider key, e.g. 'itunes'
 *   search(term, kind, opts?) => Promise<Item[]> kind is 'song' | 'album'
 *   getById(id, kind) => Promise<Item | null>
 *   getAlbumTracks(albumId) => Promise<{ album: Item | null, tracks: Item[] }>  tracks in disc/track order
 *
 * Normalized item shape (what the rest of the app relies on):
 * {
 *   id: string,          // globally unique: `${provider}:${kind}:${nativeId}`
 *   provider: string,    // 'itunes' | 'musickit' | ...
 *   kind: 'song' | 'album',
 *   title: string,
 *   artist: string,
 *   album: string,       // for albums, same as title
 *   albumId: string,     // song: id of its album item; album: its own id ('' when unknown)
 *   trackNumber: number, // songs only (0 when unknown)
 *   discNumber: number,  // songs only
 *   trackCount: number,  // albums only, when known
 *   artworkUrl: string,
 *   previewUrl: string,  // 30s preview, empty string when not available
 *   externalUrl: string, // link to the item in Apple Music / iTunes
 *   releaseDate: string, // ISO date string or ''
 * }
 */

export const KINDS = ['song', 'album'];

export function makeItemId(provider, kind, nativeId) {
  return `${provider}:${kind}:${nativeId}`;
}

export function parseItemId(id) {
  const [provider, kind, ...rest] = String(id).split(':');
  return { provider, kind, nativeId: rest.join(':') };
}

export function assertProvider(p) {
  for (const key of ['id', 'search', 'getById', 'getAlbumTracks']) {
    if (!(key in p)) throw new Error(`MusicProvider missing "${key}"`);
  }
  return p;
}
