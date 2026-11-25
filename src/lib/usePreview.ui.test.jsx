// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { usePreview } from './usePreview.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('usePreview request token', () => {
  let plays;

  beforeEach(() => {
    plays = [];
    globalThis.Audio = class {
      constructor() {
        this.src = '';
        this.listeners = {};
      }
      addEventListener(type, fn) {
        (this.listeners[type] ||= []).push(fn);
      }
      emit(type) {
        for (const fn of this.listeners[type] || []) fn(new Event(type));
      }
      pause() {}
      play() {
        const pending = deferred();
        plays.push({ src: this.src, audio: this, ...pending });
        return pending.promise;
      }
    };
  });

  afterEach(() => {
    cleanup();
    delete globalThis.Audio;
  });

  it('keeps track B playing when an aborted track A play() rejects later', async () => {
    const { result } = renderHook(() => usePreview());
    act(() => {
      result.current.toggle('https://audio.example/a.m4a');
      result.current.toggle('https://audio.example/b.m4a');
    });
    expect(plays.map((p) => p.src)).toEqual([
      'https://audio.example/a.m4a',
      'https://audio.example/b.m4a',
    ]);

    await act(async () => {
      plays[1].resolve();
      await plays[1].promise;
    });
    expect(result.current.playing).toBe('https://audio.example/b.m4a');

    await act(async () => {
      plays[0].reject(new DOMException('The play() request was interrupted', 'AbortError'));
      await plays[0].promise.catch(() => {});
    });
    expect(result.current.playing).toBe('https://audio.example/b.m4a');
  });

  it('still clears playing when the latest play() rejects', async () => {
    const { result } = renderHook(() => usePreview());
    act(() => {
      result.current.toggle('https://audio.example/a.m4a');
    });
    await act(async () => {
      plays[0].reject(new Error('NotAllowedError'));
      await plays[0].promise.catch(() => {});
    });
    expect(result.current.playing).toBe('');
  });

  it('clears playing when the stream errors and ignores that play() resolving later', async () => {
    const { result } = renderHook(() => usePreview());
    const url = 'https://audio.example/a.m4a';
    act(() => {
      result.current.toggle(url);
    });
    act(() => {
      plays[0].audio.emit('error');
    });
    expect(result.current.playing).toBe('');

    await act(async () => {
      plays[0].resolve();
      await plays[0].promise;
    });
    expect(result.current.playing).toBe('');
  });

  it('clears a preview that is already playing when the audio errors', async () => {
    const { result } = renderHook(() => usePreview());
    const url = 'https://audio.example/a.m4a';
    act(() => {
      result.current.toggle(url);
    });
    await act(async () => {
      plays[0].resolve();
      await plays[0].promise;
    });
    expect(result.current.playing).toBe(url);
    act(() => {
      plays[0].audio.emit('error');
    });
    expect(result.current.playing).toBe('');
  });

  it('ignores a play() that resolves after stop', async () => {
    const { result } = renderHook(() => usePreview());
    act(() => {
      result.current.toggle('https://audio.example/a.m4a');
      result.current.stop();
    });
    await act(async () => {
      plays[0].resolve();
      await plays[0].promise;
    });
    expect(result.current.playing).toBe('');
  });
});
