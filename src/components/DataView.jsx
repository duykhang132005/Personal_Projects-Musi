import { useRef, useState } from 'react';
import { exportLibrary, importLibrary, emptyLibrary, rankedList } from '../lib/library.js';
import { clearCache } from '../data/cache.js';

export default function DataView({ lib, setLib }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const counts = {
    songs: rankedList(lib, 'song').length,
    albums: rankedList(lib, 'album').length,
    queue: lib.queue.length,
  };

  function doExport() {
    const blob = new Blob([exportLibrary(lib)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `musi-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('Exported.');
  }

  async function doImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = importLibrary(await file.text());
      if (!confirm('Replace your current library with this file?')) return;
      setLib(next);
      setMsg('Imported.');
    } catch (err) {
      setMsg(`Import failed: ${err.message}`);
    }
  }

  function doReset() {
    if (confirm('Delete your whole library? Export first if you want a backup.')) {
      setLib(emptyLibrary());
      setMsg('Library cleared.');
    }
  }

  return (
    <section>
      <h2 className="h">Your data</h2>
      <p className="muted">
        {counts.songs} rated songs, {counts.albums} rated albums, {counts.queue} in queue. Everything is stored in this
        browser only.
      </p>
      <div className="stack">
        <button className="btn btn--primary" onClick={doExport}>Export JSON</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
        <button className="btn" onClick={() => { clearCache(); setMsg('Search cache cleared.'); }}>Clear search cache</button>
        <button className="btn btn--danger" onClick={doReset}>Delete library</button>
      </div>
      {msg && <p className="muted">{msg}</p>}
      <p className="muted tiny">
        Apple Music library sync is planned via MusicKit (needs an Apple Developer account). See README.
      </p>
    </section>
  );
}
