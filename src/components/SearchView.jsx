import { useEffect, useState } from 'react';
import { getProvider } from '../data/providers/index.js';
import { bucketOf, albumStats } from '../lib/library.js';
import { BUCKET_META, bucketForScore } from '../lib/ranking.js';
import ItemCard from './ItemCard.jsx';
import KindToggle from './KindToggle.jsx';

export default function SearchView({ lib, kind, kindDir = 'fwd', setKind, onRate, onOpen, onAdd, onQueue, preview }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    const q = term.trim();
    if (!q) {
      setResults([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    const t = setTimeout(async () => {
      try {
        const items = await getProvider().search(q, kind);
        if (!cancelled) {
          setResults(items);
          setStatus('done');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setStatus('error');
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term, kind]);

  return (
    <section>
      <div className="searchbar">
        <input
          type="search"
          placeholder={kind === 'song' ? 'Search songs or artists' : 'Search albums or artists'}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoFocus
        />
        <KindToggle kind={kind} onChange={setKind} />
      </div>
      <div key={kind} className={`slide-${kindDir}`}>
      {status === 'loading' && <p className="muted">Searching...</p>}
      {status === 'error' && <p className="error">Search failed: {error}</p>}
      {status === 'done' && results.length === 0 && <p className="muted">No results.</p>}
      {status === 'idle' && <p className="muted center pad">Find something you listened to and rate it.</p>}
      <ul className="list">
        {results.map((item) => {
          const known = lib.items[item.id];
          const bucket = known ? bucketOf(lib, item.id) : null;
          const queued = lib.queue.includes(item.id);
          const isAlbum = item.kind === 'album';
          const stats = isAlbum && known ? albumStats(lib, item.id) : null;
          return (
            <li key={item.id} className="enter">
              <ItemCard item={item} preview={preview} onOpen={isAlbum ? onOpen : undefined}>
                {stats?.average != null ? (
                  <>
                    <span className={`score score--sm score--${bucketForScore(stats.average)} ${stats.complete ? '' : 'score--partial'}`}>{stats.average.toFixed(1)}</span>
                    <button className="btn" onClick={() => onOpen(item)}>Open</button>
                  </>
                ) : isAlbum ? (
                  <>
                    <button className="btn btn--primary" onClick={() => onOpen(item)}>Rate songs</button>
                    {!queued && !known && <button className="btn" onClick={() => onQueue(item)} title="Want to listen">+ Queue</button>}
                    {queued && <span className="chip">Queued</span>}
                  </>
                ) : bucket ? (
                  <span className={`chip chip--${bucket}`}>{BUCKET_META[bucket].short}</span>
                ) : (
                  <>
                    <button className="btn btn--primary" onClick={() => onRate(item)}>Rate</button>
                    {!known && <button className="btn" onClick={() => onAdd(item)} title="Add to library, rate later">Add</button>}
                    {!queued && <button className="btn" onClick={() => onQueue(item)} title="Want to listen">+ Queue</button>}
                    {queued && <span className="chip">Queued</span>}
                  </>
                )}
              </ItemCard>
            </li>
          );
        })}
      </ul>
      </div>
      <p className="muted tiny center">Music data from the iTunes Search API.</p>
    </section>
  );
}
