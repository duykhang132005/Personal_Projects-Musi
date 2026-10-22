import { describe, it, expect, vi } from 'vitest';
import { createItunesProvider, normalizeItunes } from './itunes.js';
import { parseItemId } from './MusicProvider.js';

const track = {
  wrapperType: 'track', kind: 'song', trackId: 42, trackName: 'Song', artistName: 'Artist',
  collectionName: 'Album', artworkUrl100: 'https://x/a/100x100bb.jpg', previewUrl: 'https://p/1.m4a',
  trackViewUrl: 'https://music.apple.com/t/42', releaseDate: '2020-01-01T00:00:00Z',
};
const album = {
  wrapperType: 'collection', collectionType: 'Album', collectionId: 7, collectionName: 'LP',
  artistName: 'Artist', artworkUrl100: 'https://x/a/100x100bb.jpg', collectionViewUrl: 'https://music.apple.com/a/7',
};

describe('iTunes provider', () => {
  it('normalizes songs and albums', () => {
    const s = normalizeItunes(track);
    expect(s).toMatchObject({ id: 'itunes:song:42', kind: 'song', title: 'Song', album: 'Album', previewUrl: 'https://p/1.m4a' });
    expect(s.artworkUrl).toContain('600x600bb');
    expect(parseItemId(s.id)).toEqual({ provider: 'itunes', kind: 'song', nativeId: '42' });
    expect(normalizeItunes(album)).toMatchObject({ id: 'itunes:album:7', kind: 'album', title: 'LP', previewUrl: '' });
  });

  it('searches and caches results', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ results: [track] }) }));
    const p = createItunesProvider({ fetchImpl });
    const a = await p.search('Unique Term 1', 'song');
    const b = await p.search('unique term 1', 'song');
    expect(a).toHaveLength(1);
    expect(b).toEqual(a);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toContain('entity=song');
    expect(await p.search('  ', 'song')).toEqual([]);
  });

  it('looks up by id', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ results: [album] }) }));
    const p = createItunesProvider({ fetchImpl });
    expect((await p.getById('itunes:album:7', 'album')).title).toBe('LP');
    expect(fetchImpl.mock.calls[0][0]).toContain('lookup?id=7');
  });

  it('links songs to albums and fetches ordered tracklists', async () => {
    expect(normalizeItunes({ ...track, collectionId: 7, trackNumber: 3 })).toMatchObject({ albumId: 'itunes:album:7', trackNumber: 3 });
    const results = [
      { ...album, trackCount: 2 },
      { ...track, trackId: 2, collectionId: 7, trackNumber: 2, discNumber: 1 },
      { ...track, trackId: 1, collectionId: 7, trackNumber: 1, discNumber: 1 },
    ];
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ results }) }));
    const p = createItunesProvider({ fetchImpl });
    const r = await p.getAlbumTracks('itunes:album:7');
    expect(fetchImpl.mock.calls[0][0]).toContain('lookup?id=7&entity=song');
    expect(r.album).toMatchObject({ id: 'itunes:album:7', trackCount: 2 });
    expect(r.tracks.map((t) => t.id)).toEqual(['itunes:song:1', 'itunes:song:2']);
    await p.getAlbumTracks('itunes:album:7');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('surfaces HTTP errors', async () => {
    const p = createItunesProvider({ fetchImpl: async () => ({ ok: false, status: 503 }) });
    await expect(p.search('err term', 'album')).rejects.toThrow('503');
  });
});
