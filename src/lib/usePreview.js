import { useEffect, useRef, useState, useCallback } from 'react';

// One shared audio element so only one 30s preview plays at a time.
export function usePreview() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState('');

  useEffect(() => {
    const a = new Audio();
    a.addEventListener('ended', () => setPlaying(''));
    audioRef.current = a;
    return () => a.pause();
  }, []);

  const toggle = useCallback((url) => {
    const a = audioRef.current;
    if (!a || !url) return;
    if (playing === url) {
      a.pause();
      setPlaying('');
      return;
    }
    a.src = url;
    a.play().then(() => setPlaying(url)).catch(() => setPlaying(''));
  }, [playing]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlaying('');
  }, []);

  return { playing, toggle, stop };
}
