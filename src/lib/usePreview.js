import { useEffect, useRef, useState, useCallback } from 'react';

// One shared audio element so only one 30s preview plays at a time.
export function usePreview() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState('');
  // Bumps on every play, pause, or stop so a stale play() cannot overwrite a newer one.
  const requestRef = useRef(0);

  useEffect(() => {
    const a = new Audio();
    a.addEventListener('ended', () => setPlaying(''));
    // A stream error does not reject play(). Clear the button and ignore that request.
    a.addEventListener('error', () => {
      requestRef.current += 1;
      setPlaying('');
    });
    audioRef.current = a;
    return () => a.pause();
  }, []);

  const toggle = useCallback((url) => {
    const a = audioRef.current;
    if (!a || !url) return;
    if (playing === url) {
      requestRef.current += 1;
      a.pause();
      setPlaying('');
      return;
    }
    const request = ++requestRef.current;
    a.src = url;
    a.play().then(() => {
      if (requestRef.current !== request) return;
      setPlaying(url);
    }).catch(() => {
      // An aborted play() of track A rejects after track B has started. Ignore it.
      if (requestRef.current !== request) return;
      setPlaying('');
    });
  }, [playing]);

  const stop = useCallback(() => {
    requestRef.current += 1;
    audioRef.current?.pause();
    setPlaying('');
  }, []);

  return { playing, toggle, stop };
}
