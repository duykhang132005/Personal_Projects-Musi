import { describe, it, expect } from 'vitest';
import {
  emptyLibrary, addItem, setBucketOrder, albumStats, rankedList, unrankedItems, setAlbumTracks,
  ensureAlbum, albumFromSong, validateLibrary, importLibrary, exportLibrary, SCHEMA_VERSION,
} from './library.js';
import { bucketForScore } from './ranking.js';

const AL = 'itunes:album:1';
const song = (n, albumId = AL) => ({ id: `itunes:song:${n}`, provider: 'itunes', kind: 'song', title: `S${n}`, artist: 'A', album: 'LP', albumId, artworkUrl: '', previewUrl: '', externalUrl: '', releaseDate: '' });
const album = { id: AL, provider: 'itunes', kind: 'album', title: 'LP', artist: 'A', album: 'LP', albumId: AL, artworkUrl: '', previewUrl: '', externalUrl: '', releaseDate: '', trackCount: 4 };

function libWith(liked = [], fine = [], disliked = []) {
  let lib = addItem(emptyLibrary(), album);
  for (const n of [1, 2, 3, 4]) lib = addItem(lib, song(n));
  lib = setBucketOrder(lib, 'song', 'liked', liked.map((n) => `itunes:song:${n}`));
  lib = setBucketOrder(lib, 'song', 'fine', fine.map((n) => `itunes:song:${n}`));
  return setBucketOrder(lib, 'song', 'disliked', disliked.map((n) => `itunes:song:${n}`));
}

describe('album averages', () => {
  it('is null with no rated songs and the album is unranked', () => {
    const lib = libWith();
    expect(albumStats(lib, AL)).toEqual({ average: null, rated: 0, total: 4, complete: false });
    expect(rankedList(lib, 'album')).toEqual([]);
    expect(unrankedItems(lib, 'album').map((a) => a.id)).toEqual([AL]);
  });

  it('averages rated song scores and reports partial progress', () => {
    // liked: 1 -> 10, 2 -> 6.7 ; disliked: 3 -> 3.3  => (10 + 6.7 + 3.3) / 3 = 6.7
    const lib = libWith([1, 2], [], [3]);
    const s = albumStats(lib, AL);
    expect(s).toEqual({ average: 6.7, rated: 3, total: 4, complete: false });
    const [row] = rankedList(lib, 'album');
    expect(row.score).toBe(6.7);
    expect(row.bucket).toBe('liked');
    expect(unrankedItems(lib, 'album')).toEqual([]);
  });

  it('marks complete when every track is rated', () => {
    expect(albumStats(libWith([1, 2], [3], [4]), AL).complete).toBe(true);
  });

  it('sorts albums by average', () => {
    let lib = libWith([], [1]);
    const other = { ...album, id: 'itunes:album:2', albumId: 'itunes:album:2' };
    lib = addItem(lib, other);
    lib = addItem(lib, song(9, other.id));
    lib = setBucketOrder(lib, 'song', 'liked', ['itunes:song:9']);
    expect(rankedList(lib, 'album').map((r) => r.item.id)).toEqual(['itunes:album:2', AL]);
  });

  it('links tracks through a stored tracklist even without albumId on songs', () => {
    let lib = addItem(emptyLibrary(), album);
    lib = addItem(lib, { ...song(1), albumId: undefined });
    lib = setBucketOrder(lib, 'song', 'liked', ['itunes:song:1']);
    expect(albumStats(lib, AL).rated).toBe(0);
    lib = setAlbumTracks(lib, album, [song(1), song(2), song(3)]);
    expect(lib.items['itunes:song:1'].albumId).toBe(AL);
    expect(albumStats(lib, AL)).toMatchObject({ average: 10, rated: 1, total: 3 });
  });

  it('ensureAlbum adds a missing album with its tracklist and keeps existing data', () => {
    let lib = ensureAlbum(emptyLibrary(), album, ['a', 'b']);
    expect(lib.items[AL].trackIds).toEqual(['a', 'b']);
    lib = ensureAlbum(lib, { ...album, title: 'changed' }, ['x']);
    expect(lib.items[AL].title).toBe('LP');
    expect(albumFromSong(song(1))).toMatchObject({ id: AL, kind: 'album', title: 'LP' });
    expect(albumFromSong({ ...song(1), albumId: '' })).toBeNull();
  });

  it('bucketForScore matches the bucket ranges', () => {
    expect(bucketForScore(10)).toBe('liked');
    expect(bucketForScore(6.7)).toBe('liked');
    expect(bucketForScore(5)).toBe('fine');
    expect(bucketForScore(3.3)).toBe('disliked');
  });
});

describe('v1 -> v2 migration', () => {
  const v1 = {
    version: 1,
    items: { [AL]: { ...album, albumId: undefined }, 'itunes:song:1': { ...song(1), albumId: undefined } },
    lists: {
      song: { liked: ['itunes:song:1'], fine: [], disliked: [] },
      album: { liked: [AL], fine: [], disliked: [] },
    },
    queue: [],
  };

  it('drops direct album rankings but keeps the album in the library', () => {
    const lib = validateLibrary(v1);
    expect(lib.version).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(2);
    expect(lib.lists.album).toEqual({ liked: [], fine: [], disliked: [] });
    expect(lib.items[AL]).toBeTruthy();
    expect(lib.lists.song.liked).toEqual(['itunes:song:1']);
    expect(unrankedItems(lib, 'album').map((a) => a.id)).toEqual([AL]);
  });

  it('round-trips v2 export/import', () => {
    const lib = libWith([1]);
    const back = importLibrary(exportLibrary(lib));
    expect(back.version).toBe(2);
    expect(albumStats(back, AL).average).toBe(10);
  });
});
