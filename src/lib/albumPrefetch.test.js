import { describe, it, expect, vi } from 'vitest';
import { createAlbumPrefetcher } from './albumPrefetch.js';
import { emptyLibrary, addItem, setBucketOrder, ensureAlbum, albumFromSong, albumsNeedingTracks, albumStats, setAlbumTracks } from './library.js';

const AL = 'itunes:album:1';
const song = (n) => ({ id: `itunes:song:${n}`, provider: 'itunes', kind: 'song', title: `S${n}`, artist: 'A feat. B', album: 'LP', albumId: AL, artworkUrl: 'art', previewUrl: '', externalUrl: '', releaseDate: '' });
const fullAlbum = { id: AL, provider: 'itunes', kind: 'album', title: 'LP', artist: 'A', album: 'LP', albumId: AL, artworkUrl: 'big', previewUrl: '', externalUrl: 'https://music.apple.com/a/1', releaseDate: '2020', trackCount: 3 };

describe('album prefetch', () => {
  it('a song-created album stub needs tracks and is fixed by setAlbumTracks', () => {
    let lib = addItem(emptyLibrary(), song(1));
    lib = setBucketOrder(lib, 'song', 'liked', ['itunes:song:1']);
    lib = ensureAlbum(lib, albumFromSong(song(1)));
    expect(albumsNeedingTracks(lib).map((a) => a.id)).toEqual([AL]);
    // Before the fetch the stub looks complete (1 of 1), which was the bug.
    expect(albumStats(lib, AL)).toMatchObject({ rated: 1, total: 1 });
    lib = setAlbumTracks(lib, fullAlbum, [song(1), song(2), song(3)]);
    expect(albumsNeedingTracks(lib)).toEqual([]);
    expect(albumStats(lib, AL)).toMatchObject({ rated: 1, total: 3, complete: false });
    expect(lib.items[AL]).toMatchObject({ artist: 'A', externalUrl: 'https://music.apple.com/a/1' });
    expect(lib.items[AL].stub).toBeUndefined();
  });

  it('dedupes in-flight requests and does not retry failures', async () => {
    const getAlbumTracks = vi.fn(async (id) => {
      if (id === 'bad') throw new Error('nope');
      return { album: fullAlbum, tracks: [song(1)] };
    });
    const pf = createAlbumPrefetcher({ getAlbumTracks });
    const [a, b] = await Promise.all([pf.fetch(AL), pf.fetch(AL)]);
    expect(a).toBe(b);
    expect(getAlbumTracks).toHaveBeenCalledTimes(1);
    expect(await pf.fetch('bad')).toBeNull();
    expect(await pf.fetch('bad')).toBeNull();
    expect(getAlbumTracks.mock.calls.filter(([id]) => id === 'bad')).toHaveLength(1);
  });

  it('limits concurrency', async () => {
    let running = 0;
    let peak = 0;
    const getAlbumTracks = async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1;
      return { album: null, tracks: [] };
    };
    const pf = createAlbumPrefetcher({ getAlbumTracks }, { concurrency: 2 });
    await Promise.all(['a', 'b', 'c', 'd', 'e'].map((id) => pf.fetch(id)));
    expect(peak).toBe(2);
  });
});
