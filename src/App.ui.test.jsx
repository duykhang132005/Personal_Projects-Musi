// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';

const provider = vi.hoisted(() => ({
  search: vi.fn(),
  getById: vi.fn(),
  getAlbumTracks: vi.fn(),
}));

vi.mock('./data/providers/index.js', () => ({
  getProvider: () => provider,
  DEFAULT_PROVIDER: 'itunes',
}));

import App from './App.jsx';
import { getAlbumPrefetcher } from './lib/albumPrefetch.js';

const AL = 'itunes:album:9';
const song = (id, title, trackNumber) => ({
  id: 'itunes:song:' + id,
  provider: 'itunes',
  kind: 'song',
  title,
  artist: 'Radiohead',
  album: 'OK Computer',
  albumId: AL,
  albumArtist: 'Radiohead',
  artworkUrl: '',
  previewUrl: '',
  externalUrl: '',
  releaseDate: '1997-05-21',
  trackNumber,
});
const airbag = song(1, 'Airbag', 1);
const karma = song(2, 'Karma Police', 6);
const album = {
  id: AL,
  provider: 'itunes',
  kind: 'album',
  title: 'OK Computer',
  artist: 'Radiohead',
  album: 'OK Computer',
  albumId: AL,
  artworkUrl: '',
  previewUrl: '',
  externalUrl: 'https://music.apple.com/us/album/ok-computer/9',
  releaseDate: '1997-05-21',
  trackCount: 2,
};

function stubAudio() {
  globalThis.Audio = class {
    addEventListener() {}
    removeEventListener() {}
    pause() {}
    play() { return Promise.resolve(); }
    set src(_) {}
  };
}

async function goSearchAndFind(item) {
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  provider.search.mockResolvedValue([item]);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: item.title } });
  await screen.findByRole('button', { name: 'Rate' }, { timeout: 2000 });
}

async function rateFromSearch(item) {
  await goSearchAndFind(item);
  fireEvent.click(screen.getByRole('button', { name: 'Rate' }));
  await screen.findByRole('dialog');
}

describe('App and RateFlow wiring', () => {
  beforeEach(() => {
    stubAudio();
    localStorage.clear();
    provider.search.mockReset();
    provider.getById.mockReset();
    provider.getAlbumTracks.mockReset();
    provider.getAlbumTracks.mockResolvedValue({ album, tracks: [airbag, karma] });
    try { getAlbumPrefetcher().resetFailed(); } catch (_) {}
  });
  afterEach(() => cleanup());

  it('rates a song from search, then a second song through a comparison, onto the ranked list', async () => {
    render(<App />);

    await rateFromSearch(airbag);
    fireEvent.click(screen.getByRole('button', { name: 'I liked it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeTruthy());
    expect(screen.getByRole('heading', { name: 'My songs' })).toBeTruthy();
    expect(screen.getByText('Airbag')).toBeTruthy();
    expect(screen.getByText('10.0')).toBeTruthy();

    await rateFromSearch(karma);
    fireEvent.click(screen.getByRole('button', { name: 'I liked it' }));
    expect(screen.getByRole('heading', { name: 'Which is better?' })).toBeTruthy();
    const newPick = document.querySelector('.versus__pick');
    expect(newPick).toBeTruthy();
    fireEvent.click(newPick);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeTruthy());

    expect(screen.getByText('Karma Police')).toBeTruthy();
    expect(screen.getByText('Airbag')).toBeTruthy();
    const ranked = document.querySelector('ol.ranked');
    expect(ranked).toBeTruthy();
    expect(within(ranked).getByText('Karma Police')).toBeTruthy();
    expect(within(ranked).getByText('10.0')).toBeTruthy();
    expect(within(ranked).getByText('Airbag')).toBeTruthy();
    expect(within(ranked).getByText('6.7')).toBeTruthy();
  });

  it('starts a rating from the queue and places the song', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    provider.search.mockResolvedValue([airbag]);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Airbag' } });
    const queueBtn = await screen.findByRole('button', { name: '+ Queue' }, { timeout: 2000 });
    fireEvent.click(queueBtn);
    fireEvent.click(screen.getByRole('button', { name: /^Queue/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Rate' }));
    fireEvent.click(await screen.findByRole('button', { name: 'I liked it' }));
    await waitFor(() => expect(screen.getByText('10.0')).toBeTruthy());
    expect(screen.getByText('Airbag')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Queue/ }));
    expect(screen.getByText(/queue is empty/i)).toBeTruthy();
  });

  it('cancel midway leaves existing ranks unchanged and does not rank the new song', async () => {
    render(<App />);
    await rateFromSearch(airbag);
    fireEvent.click(screen.getByRole('button', { name: 'I liked it' }));
    await waitFor(() => expect(screen.getByText('10.0')).toBeTruthy());

    await rateFromSearch(karma);
    fireEvent.click(screen.getByRole('button', { name: 'I liked it' }));
    expect(screen.getByRole('heading', { name: 'Which is better?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Which is better?' })).not.toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Ranked' }));
    const ranked = document.querySelector('ol.ranked');
    expect(within(ranked).getByText('Airbag')).toBeTruthy();
    expect(within(ranked).getByText('10.0')).toBeTruthy();
    expect(within(ranked).queryByText('Karma Police')).toBeNull();
    expect(screen.getByText('Not rated yet')).toBeTruthy();
    expect(screen.getByText('Karma Police')).toBeTruthy();
  });

  it('rating a song auto-adds its album to the library', async () => {
    render(<App />);
    await rateFromSearch(airbag);
    fireEvent.click(screen.getByRole('button', { name: 'I liked it' }));
    await waitFor(() => expect(screen.getByText('10.0')).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: 'Albums' }));
    await waitFor(() => expect(screen.getByText('OK Computer')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('1/2')).toBeTruthy());
  });
});

describe('dialog focus and Escape', () => {
  beforeEach(() => {
    stubAudio();
    localStorage.clear();
    provider.search.mockReset();
    provider.getAlbumTracks.mockReset();
    provider.getAlbumTracks.mockResolvedValue({ album, tracks: [airbag, karma] });
    try { getAlbumPrefetcher().resetFailed(); } catch (_) {}
  });
  afterEach(() => cleanup());

  it('moves focus into the rating dialog and returns it to the opener on close', async () => {
    render(<App />);
    await goSearchAndFind(airbag);
    const rateBtn = screen.getByRole('button', { name: 'Rate' });
    rateBtn.focus();
    fireEvent.click(rateBtn);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeTruthy());
    expect(document.activeElement).toBe(rateBtn);
  });

  it('Escape closes only the topmost layer', async () => {
    render(<App />);
    await rateFromSearch(airbag);
    fireEvent.click(screen.getByRole('button', { name: 'I liked it' }));
    await waitFor(() => expect(screen.getByText('10.0')).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: 'Albums' }));
    await waitFor(() => expect(screen.getByText('OK Computer')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Open album OK Computer' }));
    await screen.findByRole('dialog', { name: 'OK Computer' });
    await screen.findByRole('button', { name: 'Rate' }, { timeout: 2000 });
    fireEvent.click(screen.getByRole('button', { name: 'Rate' }));
    await screen.findByRole('heading', { name: 'How was it?' });
    expect(screen.getAllByRole('dialog')).toHaveLength(2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'How was it?' })).not.toBeTruthy());
    expect(screen.getByRole('dialog', { name: 'OK Computer' })).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'OK Computer' })).not.toBeTruthy());
  });

  it('traps Tab inside the rating dialog and wraps at both ends', async () => {
    render(<App />);
    await goSearchAndFind(airbag);
    fireEvent.click(screen.getByRole('button', { name: 'Rate' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    const closeBtn = within(dialog).getByRole('button', { name: 'Close' });
    const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' });

    // Container is focused on open; Tab should move to the first focusable control.
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cancelBtn);

    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);
  });
});
