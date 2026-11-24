// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Menu from './Menu.jsx';
import RankedView from './RankedView.jsx';
import { emptyLibrary } from '../lib/library.js';

const song = {
  id: 'itunes:song:1',
  provider: 'itunes',
  kind: 'song',
  title: 'Airbag',
  artist: 'Radiohead',
  album: 'OK Computer',
  albumId: 'itunes:album:9',
  artworkUrl: '',
  previewUrl: '',
  externalUrl: 'https://music.apple.com/us/song/airbag/1',
  releaseDate: '1997-05-21',
};

function rankedLib() {
  const lib = emptyLibrary();
  lib.items[song.id] = song;
  lib.lists.song.liked = [song.id];
  return lib;
}

function pointerCalls(spy) {
  return spy.mock.calls.filter((call) => call[0] === 'pointerdown').length;
}

describe('Menu focus, roles, and listeners', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('moves focus into the menu and marks actions as menuitems', async () => {
    render(
      <Menu label="More for Airbag">
        {(close) => (
          <>
            <button onClick={close}>Re-rank</button>
            <a href="https://music.apple.com/song/1" onClick={close}>Open in Apple Music (opens in new tab)</a>
          </>
        )}
      </Menu>
    );
    const trigger = screen.getByRole('button', { name: 'More for Airbag' });
    trigger.focus();
    fireEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    const items = screen.getAllByRole('menuitem');
    expect(items.map((el) => el.textContent)).toEqual([
      'Re-rank',
      'Open in Apple Music (opens in new tab)',
    ]);
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
    expect(document.activeElement).toBe(items[0]);
  });

  it('restores focus to the trigger when Escape closes the menu', async () => {
    render(
      <Menu label="More for Airbag">
        {(close) => <button onClick={close}>Re-rank</button>}
      </Menu>
    );
    const trigger = screen.getByRole('button', { name: 'More for Airbag' });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('menu').contains(document.activeElement)).toBe(true));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(trigger);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('does not rebind document listeners when the parent re-renders while open', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    function Harness({ tick }) {
      return (
        <Menu label="More">
          {(close) => <button onClick={close}>Item {tick}</button>}
        </Menu>
      );
    }
    const { rerender } = render(<Harness tick={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('menuitem', { name: 'Item 1' })).toBeTruthy();
    const added = pointerCalls(add);
    const removed = pointerCalls(remove);
    expect(added).toBeGreaterThan(0);

    rerender(<Harness tick={2} />);
    rerender(<Harness tick={3} />);
    expect(screen.getByRole('menuitem', { name: 'Item 3' })).toBeTruthy();
    expect(pointerCalls(add)).toBe(added);
    expect(pointerCalls(remove)).toBe(removed);
  });
});

describe('RankedView menu items', () => {
  afterEach(() => cleanup());

  it('opens ranked-row actions as menuitems and focuses them', async () => {
    render(
      <RankedView
        lib={rankedLib()}
        kind="song"
        setKind={() => {}}
        onRate={() => {}}
        onOpen={() => {}}
        onRerank={() => {}}
        onRemove={() => {}}
        preview={{ playing: '', toggle() {} }}
        goSearch={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'More for Airbag' }));
    const menu = await screen.findByRole('menu');
    expect(screen.getByRole('menuitem', { name: 'Re-rank' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Open in Apple Music (opens in new tab)' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Remove Airbag' })).toBeTruthy();
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
  });
});
