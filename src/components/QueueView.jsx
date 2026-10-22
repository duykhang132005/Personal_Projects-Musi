import ItemCard from './ItemCard.jsx';

export default function QueueView({ lib, leaving = new Set(), onRate, onOpen, onRemove, preview, goSearch }) {
  const items = lib.queue.map((id) => lib.items[id]).filter(Boolean);
  return (
    <section>
      <h2 className="h">Want to listen</h2>
      {items.length === 0 ? (
        <div className="empty">
          <p>Your queue is empty. Use "+ Queue" in search to save things for later.</p>
          <button className="btn btn--primary" onClick={goSearch}>Search</button>
        </div>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.id} className={leaving.has(item.id) ? 'leave' : 'enter'}>
              <ItemCard item={item} preview={preview} onOpen={item.kind === 'album' ? onOpen : undefined}>
                <span className="chip">{item.kind === 'song' ? 'Song' : 'Album'}</span>
                <button className="btn btn--primary" onClick={() => onRate(item)}>{item.kind === 'album' ? 'Open' : 'Rate'}</button>
                <button className="btn btn--ghost" onClick={() => onRemove(item.id)} aria-label="Remove from queue">✕</button>
              </ItemCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
