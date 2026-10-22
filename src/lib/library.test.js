import { describe, it, expect } from 'vitest';
import {
  emptyLibrary, addItem, setBucketOrder, rankedList, bucketOf, removeItem, unrankItem,
  addToQueue, removeFromQueue, unrankedItems, exportLibrary, importLibrary, loadLibrary, saveLibrary,
} from './library.js';

const song = (n) => ({ id: `itunes:song:${n}`, provider: 'itunes', kind: 'song', title: `S${n}`, artist: 'A', album: '', artworkUrl: '', previewUrl: '', externalUrl: '', releaseDate: '' });

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

describe('library model', () => {
  it('adds, ranks, and scores items', () => {
    let lib = emptyLibrary();
    for (const n of [1, 2, 3]) lib = addItem(lib, song(n));
    expect(unrankedItems(lib, 'song')).toHaveLength(3);
    lib = setBucketOrder(lib, 'song', 'liked', ['itunes:song:2', 'itunes:song:1']);
    lib = setBucketOrder(lib, 'song', 'disliked', ['itunes:song:3']);
    const ranked = rankedList(lib, 'song');
    expect(ranked.map((r) => [r.item.title, r.score, r.rank])).toEqual([
      ['S2', 10, 1], ['S1', 6.7, 2], ['S3', 3.3, 3],
    ]);
    expect(bucketOf(lib, 'itunes:song:3')).toBe('disliked');
  });

  it('moves an item between buckets without duplicating it', () => {
    let lib = addItem(emptyLibrary(), song(1));
    lib = setBucketOrder(lib, 'song', 'liked', ['itunes:song:1']);
    lib = setBucketOrder(lib, 'song', 'fine', ['itunes:song:1']);
    expect(lib.lists.song.liked).toEqual([]);
    expect(lib.lists.song.fine).toEqual(['itunes:song:1']);
  });

  it('unranks and removes', () => {
    let lib = addItem(emptyLibrary(), song(1));
    lib = setBucketOrder(lib, 'song', 'liked', ['itunes:song:1']);
    lib = unrankItem(lib, 'itunes:song:1');
    expect(bucketOf(lib, 'itunes:song:1')).toBeNull();
    expect(lib.items['itunes:song:1']).toBeTruthy();
    lib = removeItem(lib, 'itunes:song:1');
    expect(lib.items['itunes:song:1']).toBeUndefined();
  });

  it('handles the want-to-listen queue', () => {
    let lib = addToQueue(emptyLibrary(), song(1));
    lib = addToQueue(lib, song(1));
    expect(lib.queue).toEqual(['itunes:song:1']);
    expect(unrankedItems(lib, 'song')).toHaveLength(0);
    // ranking a queued item takes it off the queue
    const ranked = setBucketOrder(lib, 'song', 'fine', ['itunes:song:1']);
    expect(ranked.queue).toEqual([]);
    lib = removeFromQueue(lib, 'itunes:song:1');
    expect(lib.items['itunes:song:1']).toBeUndefined();
  });

  it('round-trips export/import and drops invalid refs', () => {
    let lib = addItem(emptyLibrary(), song(1));
    lib = setBucketOrder(lib, 'song', 'liked', ['itunes:song:1']);
    const data = JSON.parse(exportLibrary(lib));
    data.lists.song.liked.push('itunes:song:999');
    const back = importLibrary(JSON.stringify(data));
    expect(back.lists.song.liked).toEqual(['itunes:song:1']);
    expect(() => importLibrary('{"nope":1}')).toThrow();
  });

  it('persists to storage', () => {
    const s = memStorage();
    expect(loadLibrary(s)).toEqual(emptyLibrary());
    const lib = addItem(emptyLibrary(), song(5));
    saveLibrary(lib, s);
    expect(loadLibrary(s).items['itunes:song:5'].title).toBe('S5');
  });
});
