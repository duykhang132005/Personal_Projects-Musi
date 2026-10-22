/**
 * Apple MusicKit provider: NOT IMPLEMENTED (planned).
 *
 * Requires an Apple Developer account ($99/yr) to mint a MusicKit developer token
 * (JWT signed with a MusicKit private key). That token must be generated server side,
 * so this provider will arrive together with a backend.
 *
 * Plan:
 *   1. Load MusicKit JS v3 (https://js-cdn.music.apple.com/musickit/v3/musickit.js).
 *   2. MusicKit.configure({ developerToken, app: { name: 'Musi' } }).
 *   3. search(term, kind): music.api.music('/v1/catalog/{storefront}/search', { term, types: 'songs' | 'albums' })
 *   4. getById(id, kind): '/v1/catalog/{storefront}/songs/{id}' or '/albums/{id}'
 *      getAlbumTracks(albumId): '/v1/catalog/{storefront}/albums/{id}/tracks'
 *   5. Extra capabilities (outside the base interface): authorize() for library sync
 *      ('/v1/me/library/songs'), and Apple Music deep links for externalUrl.
 *   6. Normalize to the same item shape (see MusicProvider.js) with provider: 'musickit'.
 *
 * Catalog ids are shared between iTunes Search and Apple Music, so existing
 * 'itunes:song:123' items can be mapped to 'musickit:song:123' later.
 */
import { assertProvider } from './MusicProvider.js';

export function createMusicKitProvider() {
  const notReady = async () => {
    throw new Error('MusicKit provider is not implemented yet. See src/data/providers/musickit.js');
  };
  return assertProvider({ id: 'musickit', search: notReady, getById: notReady, getAlbumTracks: notReady });
}
