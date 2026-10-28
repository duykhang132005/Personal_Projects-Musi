import { describe, it, expect, vi } from 'vitest';
import { pushEscape, handleEscapeKey } from './escapeStack.js';

describe('escape stack', () => {
  it('only closes the topmost layer and unwinds in order', () => {
    const album = vi.fn();
    const rate = vi.fn();
    const popAlbum = pushEscape({ current: album });
    const popRate = pushEscape({ current: rate });
    expect(handleEscapeKey({ key: 'Escape' })).toBe(true);
    expect(rate).toHaveBeenCalledTimes(1);
    expect(album).not.toHaveBeenCalled();
    popRate();
    handleEscapeKey({ key: 'Escape' });
    expect(album).toHaveBeenCalledTimes(1);
    popAlbum();
    expect(handleEscapeKey({ key: 'Escape' })).toBe(false);
  });

  it('ignores other keys', () => {
    const fn = vi.fn();
    const pop = pushEscape({ current: fn });
    expect(handleEscapeKey({ key: 'Enter' })).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    pop();
  });
});
