import { rankedList, unrankedItems } from '../lib/library.js';
import Menu from './Menu.jsx';
import ItemCard from './ItemCard.jsx';
import KindToggle from './KindToggle.jsx';

export default function RankedView({ lib, kind, kindDir = 'fwd', leaving = new Set(), setKind, onRate, onOpen, onRerank, onRemove, preview, goSearch }) {
  const ranked = rankedList(lib, kind);
  const unranked = unrankedItems(lib, kind);
  const noun = kind === 'song' ? 'songs' : 'albums';

  return (
    <section>
      <div className="row between">
        <h2 className="h">My {noun}</h2>
        <KindToggle kind={kind} onChange={setKind} />
      </div>

      <div key={kind} className={`slide-${kindDir}`}>
      {unranked.length > 0 && (
        <>
          <h3 className="sub">Not rated yet</h3>
          <ul className="list">
            {unranked.map((item) => (
              <li key={item.id} className={leaving.has(item.id) ? 'leave' : 'enter'}>
                <ItemCard item={item} preview={preview} onOpen={kind === 'album' ? onOpen : undefined}>
                  <button className="btn btn--primary" onClick={() => onRate(item)}>{kind === 'album' ? 'Rate songs' : 'Rate'}</button>
                  <button className="btn btn--ghost" onClick={() => onRemove(item.id)} aria-label="Remove">✕</button>
                </ItemCard>
              </li>
            ))}
          </ul>
        </>
      )}

      {ranked.length === 0 ? (
        <div className="empty">
          <p>No rated {noun} yet.</p>
          <button className="btn btn--primary" onClick={goSearch}>Find {noun} to rate</button>
        </div>
      ) : (
        <ol className="list ranked">
          {ranked.map(({ item, bucket, rank, score, stats }) => (
            <li key={item.id} className={`ranked__row ${leaving.has(item.id) ? 'leave' : 'enter'}`}>
              <span className="ranked__rank">{rank}</span>
              <ItemCard item={item} preview={preview} onOpen={kind === 'album' ? onOpen : undefined}>
                {stats ? (
                  <span className="score-wrap" title={`Average of ${stats.rated} rated of ${stats.total} songs`}>
                    <span className={`score score--${bucket} ${stats.complete ? '' : 'score--partial'}`}>{score.toFixed(1)}</span>
                    <span className="score-wrap__sub">{stats.rated}/{stats.total}</span>
                  </span>
                ) : (
                  <span className={`score score--${bucket}`} title={bucket}>{score.toFixed(1)}</span>
                )}
                <Menu>
                  {(close) => (
                    <>
                      {kind === 'album' ? (
                        <button onClick={() => { close(); onOpen(item); }}>Open album</button>
                      ) : (
                        <button onClick={() => { close(); onRerank(item); }}>Re-rank</button>
                      )}
                      {item.externalUrl && (
                        <a href={item.externalUrl} target="_blank" rel="noreferrer" onClick={close}>Open in Apple Music</a>
                      )}
                      <button className="danger" onClick={() => { close(); onRemove(item.id); }}>Remove</button>
                    </>
                  )}
                </Menu>
              </ItemCard>
            </li>
          ))}
        </ol>
      )}
      </div>
    </section>
  );
}
