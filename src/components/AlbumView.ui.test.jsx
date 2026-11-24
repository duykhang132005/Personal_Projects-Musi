// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AlbumView from './AlbumView.jsx';
import { emptyLibrary } from '../lib/library.js';

const album = {
  id: 'itunes:album:9',
  provider: 'itunes',
  kind: 'album',
  title: 'OK Computer',
  artist: 'Radiohead',
  album: 'OK Computer',
  albumId: 'itunes:album:9',
  artworkUrl: '',
  previewUrl: '',
  externalUrl: '',
  releaseDate: '1997-05-21',
};

const airbag = {
  id: 'itunes:song:1',
  provider: 'itunes',
  kind: 'song',
  title: 'Airbag',
  artist: 'Radiohead',
  album: 'OK Computer',
  albumId: album.id,
  trackNumber: 1,
  artworkUrl: '',
  previewUrl: '',
  externalUrl: '',
  releaseDate: '1997-05-21',
};

const karma = {
  ...airbag,
  id: 'itunes:song:2',
  title: 'Karma Police',
  trackNumber: 6,
};

const load = vi.hoisted(() => vi.fn());

vi.mock('../lib/albumPrefetch.js', () => ({
  getAlbumPrefetcher: () => ({ load }),
}));

function ratedLib() {
  const lib = emptyLibrary();
  lib.items[airbag.id] = airbag;
  lib.lists.song.liked = [airbag.id];
  return lib;
}

describe('AlbumView score button', () => {
  beforeEach(() => {
    load.mockReset();
    load.mockResolvedValue({ album, tracks: [airbag, karma] });
  });
  afterEach(() => cleanup());

  it('names the track and the re-rank action on a rated score button', async () => {
    render(
      <AlbumView
        album={album}
        lib={ratedLib()}
        onClose={() => {}}
        onRate={() => {}}
        preview={{ playing: '', toggle() {} }}
      />
    );
    const scoreBtn = await screen.findByRole('button', { name: 'Re-rank Airbag, currently 10.0' });
    expect(scoreBtn.textContent).toBe('10.0');
    expect(scoreBtn.getAttribute('title')).toBe('Re-rank');
    expect(scoreBtn.className).toContain('score');
    expect(screen.getByRole('button', { name: 'Rate' }).textContent).toBe('Rate');
  });
});