// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import KindToggle from './KindToggle.jsx';

describe('KindToggle', () => {
  afterEach(() => cleanup());

  it('uses pressed buttons in a labeled group instead of tabs', () => {
    const onChange = vi.fn();
    render(<KindToggle kind="song" onChange={onChange} />);

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();

    const group = screen.getByRole('group', { name: 'Songs or albums' });
    const songs = screen.getByRole('button', { name: 'Songs' });
    const albums = screen.getByRole('button', { name: 'Albums' });
    expect(group.contains(songs)).toBe(true);
    expect(group.contains(albums)).toBe(true);
    expect(songs.getAttribute('aria-pressed')).toBe('true');
    expect(albums.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(albums);
    expect(onChange).toHaveBeenCalledWith('album');
    fireEvent.click(songs);
    expect(onChange).toHaveBeenCalledWith('song');
  });
});
