import { useState, useRef } from 'react';
import { useLibrary } from './lib/useLibrary.js';
import { usePreview } from './lib/usePreview.js';
import { addItem, addToQueue, removeItem, removeFromQueue, setBucketOrder, ensureAlbum, albumFromSong, setAlbumTracks } from './lib/library.js';
import SearchView from './components/SearchView.jsx';
import RankedView from './components/RankedView.jsx';
import QueueView from './components/QueueView.jsx';
import DataView from './components/DataView.jsx';
import RateFlow from './components/RateFlow.jsx';
import AlbumView from './components/AlbumView.jsx';

const TABS = [
  ['ranked', 'Ranked', '★'],
  ['search', 'Search', '⌕'],
  ['queue', 'Queue', '≡'],
  ['data', 'Data', '⚙'],
];

export default function App() {
  const [lib, update, setLib] = useLibrary();
  const [tab, setTab] = useState('ranked');
  const [kind, setKindRaw] = useState('song');
  // Slide directions: 'fwd' enters from the right, 'back' from the left.
  const [kindDir, setKindDir] = useState('fwd');
  const [tabDir, setTabDir] = useState('fwd');
  const [leaving, setLeaving] = useState(() => new Set());
  const timers = useRef({});
  const [rating, setRating] = useState(null); // { item, album, trackIds } being rated
  const [openAlbum, setOpenAlbum] = useState(null); // album item shown in the detail sheet
  const preview = usePreview();

  const setKind = (k) => {
    if (k === kind) return;
    setKindDir(k === 'album' ? 'fwd' : 'back');
    setKindRaw(k);
  };
  const changeTab = (t) => {
    if (t === tab) return;
    const ids = TABS.map(([id]) => id);
    setTabDir(ids.indexOf(t) > ids.indexOf(tab) ? 'fwd' : 'back');
    setTab(t);
  };
  // Play the exit animation, then apply the removal.
  const animateOut = (id, apply) => {
    if (timers.current[id]) return;
    setLeaving((s) => new Set(s).add(id));
    timers.current[id] = setTimeout(() => {
      delete timers.current[id];
      apply();
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 220);
  };

  // Albums are never compared directly: "Rate" on an album opens its tracklist.
  const startRate = (item, album = null, trackIds = null) => {
    if (item.kind === 'album') {
      setOpenAlbum(item);
      return;
    }
    update((l) => addItem(l, item));
    setRating({ item, album, trackIds });
  };
  // Re-rank keeps the current spot until a new placement is finished (cancel is safe).
  const rerank = (item) => startRate(item);
  const finishRate = (k, bucket, ids) => {
    const { item, album, trackIds } = rating;
    update((l) => {
      let next = setBucketOrder(l, k, bucket, ids);
      // Rating a song puts its album in the library so it gets a derived score.
      next = ensureAlbum(next, album || albumFromSong(item), trackIds);
      return next;
    });
    setRating(null);
    if (!openAlbum) {
      setKind(k);
      changeTab('ranked');
    }
  };
  const remove = (id) => {
    if (confirm('Remove from your library?')) animateOut(id, () => update((l) => removeItem(l, id)));
  };

  const goSearch = () => changeTab('search');

  return (
    <div className="app">
      <header className="top">
        <h1 className="logo">musi</h1>
      </header>
      <main className="main">
        <div key={tab} className={`view slide-${tabDir}`}>
        {tab === 'ranked' && (
          <RankedView lib={lib} kind={kind} kindDir={kindDir} setKind={setKind} leaving={leaving} onRate={startRate} onOpen={setOpenAlbum} onRerank={rerank} onRemove={remove} preview={preview} goSearch={goSearch} />
        )}
        {tab === 'search' && (
          <SearchView
            lib={lib}
            kind={kind}
            kindDir={kindDir}
            setKind={setKind}
            onRate={startRate}
            onOpen={setOpenAlbum}
            onAdd={(item) => update((l) => addItem(l, item))}
            onQueue={(item) => update((l) => addToQueue(l, item))}
            preview={preview}
          />
        )}
        {tab === 'queue' && (
          <QueueView lib={lib} leaving={leaving} onRate={startRate} onOpen={setOpenAlbum} onRemove={(id) => animateOut(id, () => update((l) => removeFromQueue(l, id)))} preview={preview} goSearch={goSearch} />
        )}
        {tab === 'data' && <DataView lib={lib} setLib={setLib} />}
        </div>
      </main>
      <nav className="tabs">
        <div className="tabs__inner" style={{ '--tab-i': TABS.findIndex(([id]) => id === tab), '--tab-n': TABS.length }}>
        <span className="tabs__pill" aria-hidden="true" />
        {TABS.map(([id, label, icon]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => changeTab(id)}>
            <span className="tabs__icon" aria-hidden="true">{icon}</span>
            {label}
            {id === 'queue' && lib.queue.length > 0 && <span className="badge">{lib.queue.length}</span>}
          </button>
        ))}
        </div>
      </nav>
      {openAlbum && (
        <AlbumView
          album={openAlbum}
          lib={lib}
          preview={preview}
          onClose={() => setOpenAlbum(null)}
          onRate={startRate}
          onTracks={(album, tracks) => update((l) => setAlbumTracks(l, album, tracks))}
        />
      )}
      {rating && (
        <RateFlow
          item={rating.item}
          lib={lib}
          preview={preview}
          onDone={finishRate}
          onCancel={() => setRating(null)}
        />
      )}
    </div>
  );
}
