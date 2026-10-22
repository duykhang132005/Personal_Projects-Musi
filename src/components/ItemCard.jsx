import MarqueeText from './MarqueeText.jsx';

export default function ItemCard({ item, preview, children, compact, onOpen }) {
  const isPlaying = preview && item.previewUrl && preview.playing === item.previewUrl;
  return (
    <div className={`item ${compact ? 'item--compact' : ''}`}>
      <div className="item__art">
        {item.artworkUrl ? (
          <img src={item.artworkUrl} alt="" loading="lazy" onClick={onOpen ? () => onOpen(item) : undefined} className={onOpen ? 'link' : ''} />
        ) : (
          <div className="item__art-ph" />
        )}
        {preview && item.previewUrl && (
          <button
            className="item__play"
            aria-label={isPlaying ? 'Pause preview' : 'Play 30s preview'}
            onClick={() => preview.toggle(item.previewUrl)}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
        )}
      </div>
      <div
        className={`item__meta ${onOpen ? 'item__meta--link' : ''}`}
        onClick={onOpen ? () => onOpen(item) : undefined}
        onKeyDown={onOpen ? (e) => e.key === 'Enter' && onOpen(item) : undefined}
      >
        <MarqueeText className="item__title" text={item.title} focusable={!compact} />
        <MarqueeText
          className="item__sub"
          focusable={!compact}
          text={[item.artist, item.kind === 'song' ? item.album : '', item.releaseDate ? item.releaseDate.slice(0, 4) : '']
            .filter(Boolean)
            .join(' · ')}
        />
      </div>
      {children && <div className="item__actions">{children}</div>}
    </div>
  );
}
