// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { useLibrary } from './useLibrary.js';
import { useAlbumPrefetch, getAlbumPrefetcher } from './albumPrefetch.js';
import { albumsNeedingTracks } from './library.js';

const AL = 'itunes:album:ui-prefetch';
const song = {
  id: 'itunes:song:ui-1',
  provider: 'itunes',
  kind: 'song',
  title: 'Airbag',
  artist: 'Radiohead',
  album: 'OK Computer',
  albumId: AL,
  artworkUrl: '',
  previewUrl: '',
  externalUrl: '',
  releaseDate: '1997',
};
const fullAlbum = {
  id: AL,
  provider: 'itunes',
  kind: 'album',
  title: 'OK Computer',
  artist: 'Radiohead',
  album: 'OK Computer',
  albumId: AL,
  artworkUrl: 'big',
  previewUrl: '',
  externalUrl: 'https://music.apple.com/a/9',
  releaseDate: '1997',
  trackCount: 2,
};
const tracks = [song, { ...song, id: 'itunes:song:ui-2', title: 'Karma Police', trackNumber: 6 }];

const provider = vi.hoisted(() => ({
  search: vi.fn(),
  getById: vi.fn(),
  getAlbumTracks: vi.fn(),
}));

vi.mock('../data/providers/index.js', () => ({
  getProvider: () => provider,
  DEFAULT_PROVIDER: 'itunes',
}));

function PrefetchProbe() {
  const [lib, update] = useLibrary();
  useAlbumPrefetch(lib, update);
  const album = lib.items[AL];
  return (
    <div>
      <span data-testid="total">{album && album.trackCount != null ? String(album.trackCount) : 'none'}</span>
      <span data-testid="artist">{album ? album.artist : ''}</span>
      <span data-testid="needs">{String(albumsNeedingTracks(lib).length)}</span>
      <span data-testid="url">{album && album.externalUrl ? album.externalUrl : ''}</span>
    </div>
  );
}

function seedStubLibrary() {
  const lib = {
    version: 2,
    items: {
      [song.id]: song,
      [AL]: {
        id: AL,
        provider: 'itunes',
        kind: 'album',
        title: 'OK Computer',
        artist: 'Radiohead feat. extra',
        album: 'OK Computer',
        albumId: AL,
        artworkUrl: '',
        previewUrl: '',
        externalUrl: '',
        releaseDate: '1997',
        stub: true,
      },
    },
    lists: {
      song: { liked: [song.id], fine: [], disliked: [] },
      album: { liked: [], fine: [], disliked: [] },
    },
    queue: [],
  };
  localStorage.setItem('musi:library:v1', JSON.stringify(lib));
}

describe('useAlbumPrefetch', () => {
  beforeEach(() => {
    localStorage.clear();
    provider.getAlbumTracks.mockReset();
    try { getAlbumPrefetcher().resetFailed(); } catch (_) {}
    seedStubLibrary();
  });
  afterEach(() => cleanup());

  it('writes fetched tracks into the live library', async () => {
    provider.getAlbumTracks.mockResolvedValue({ album: fullAlbum, tracks });
    render(<PrefetchProbe />);
    await waitFor(() => expect(screen.getByTestId('needs').textContent).toBe('0'));
    expect(screen.getByTestId('total').textContent).toBe('2');
    expect(screen.getByTestId('artist').textContent).toBe('Radiohead');
    expect(screen.getByTestId('url').textContent).toContain('music.apple.com');
  });

  it('retries a failed album when the browser comes back online', async () => {
    provider.getAlbumTracks.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ album: fullAlbum, tracks });
    render(<PrefetchProbe />);
    await waitFor(() => expect(provider.getAlbumTracks).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('needs').textContent).toBe('1'));
    expect(screen.getByTestId('total').textContent).toBe('none');
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(screen.getByTestId('needs').textContent).toBe('0'));
    expect(screen.getByTestId('total').textContent).toBe('2');
  });
});
