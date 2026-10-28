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
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? `Open album ${item.title}` : undefined}
        onKeyDown={
          onOpen
            ? (e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen(item);
                }
              }
            : undefined
        }
      >
        {/* Titles are not separately focusable inside a clickable (role=button) area. */}
        <MarqueeText className="item__title" text={item.title} focusable={!compact && !onOpen} />
        <MarqueeText
          className="item__sub"
          focusable={!compact && !onOpen}
          text={[item.artist, item.kind === 'song' ? item.album : '', item.releaseDate ? item.releaseDate.slice(0, 4) : '']
            .filter(Boolean)
            .join(' · ')}
        />
      </div>
      {children && <div className="item__actions">{children}</div>}
    </div>
  );
}
