import { useEffect, useState, useCallback } from 'react';
import { loadLibrary, saveLibrary } from './library.js';

export function useLibrary() {
  const [lib, setLib] = useState(() => loadLibrary());
  useEffect(() => saveLibrary(lib), [lib]);
  const update = useCallback((fn) => setLib((cur) => fn(cur)), []);
  return [lib, update, setLib];
}
