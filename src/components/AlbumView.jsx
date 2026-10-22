import { useEffect, useState } from 'react';
import { getProvider } from '../data/providers/index.js';
import { songScores } from '../lib/library.js';
import { bucketForScore } from '../lib/ranking.js';
import MarqueeText from './MarqueeText.jsx';

/** Album detail sheet: tracklist with per-song scores; the album score is the average of rated songs. */
export default function AlbumView({ album, lib, onClose, onRate, onTracks, preview }) {
  const [data, setData] = useState({ status: 'loading', album, tracks: [] });

  useEffect(() => {
    let cancelled = false;
    getProvider()
      .getAlbumTracks(album.id)
      .then((r) => {
        if (cancelled) return;
        const full = { ...album, ...(r.album || {}) };
        setData({ status: 'done', album: full, tracks: r.tracks });
        onTracks?.(full, r.tracks);
      })
      .catch((e) => !cancelled && setData((d) => ({ ...d, status: 'error', error: e.message })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album.id]);

  const a = data.album;
  const scores = songScores(lib);
  const rated = data.tracks.filter((t) => typeof scores[t.id] === 'number');
  const total = data.tracks.length;
  const avg = rated.length ? Math.round((rated.reduce((s, t) => s + scores[t.id], 0) / rated.length) * 10) / 10 : null;
  const multiDisc = data.tracks.some((t) => t.discNumber > 1);
  const trackIds = data.tracks.map((t) => t.id);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={a.title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet sheet--album step-in">
        <button className="sheet__close" onClick={onClose} aria-label="Close">×</button>
        <header className="album__head">
          <div className="album__art">{a.artworkUrl ? <img src={a.artworkUrl} alt="" /> : null}</div>
          <div className="album__meta">
            <MarqueeText className="album__title" text={a.title} />
            <MarqueeText className="item__sub" text={[a.artist, a.releaseDate ? a.releaseDate.slice(0, 4) : ''].filter(Boolean).join(' · ')} />
            {avg !== null && (
              <div className="row album__score">
                <span className={`score score--${bucketForScore(avg)} ${rated.length < total ? 'score--partial' : ''}`}>{avg.toFixed(1)}</span>
                <span className="muted tiny">{rated.length < total ? 'Partial average' : 'All songs rated'}</span>
              </div>
            )}
          </div>
        </header>

        {data.status === 'done' && total > 0 && (
          <div className="progress" aria-label={`Rated ${rated.length} of ${total} songs`}>
            <div className="progress__label muted tiny">Rated {rated.length} of {total} songs</div>
            <div className="progress__bar"><span style={{ width: `${(rated.length / total) * 100}%` }} /></div>
          </div>
        )}
        {data.status === 'loading' && <p className="muted center">Loading tracks...</p>}
        {data.status === 'error' && <p className="error">Could not load tracks: {data.error}</p>}
        {data.status === 'done' && total === 0 && <p className="muted">No tracks found for this album.</p>}

        <ol className="tracks">
          {data.tracks.map((t) => {
            const score = scores[t.id];
            const playing = t.previewUrl && preview?.playing === t.previewUrl;
            return (
              <li key={t.id} className="track enter">
                <span className="track__no">{multiDisc ? `${t.discNumber}.` : ''}{t.trackNumber || ''}</span>
                {t.previewUrl ? (
                  <button className="track__play" aria-label={playing ? 'Pause preview' : 'Play 30s preview'} onClick={() => preview.toggle(t.previewUrl)}>
                    {playing ? '❚❚' : '▶'}
                  </button>
                ) : (
                  <span className="track__play track__play--off" />
                )}
                <div className="track__meta">
                  <MarqueeText className="item__title" text={t.title} />
                  {t.artist !== a.artist && <MarqueeText className="item__sub" text={t.artist} />}
                </div>
                <div className="item__actions">
                  {typeof score === 'number' ? (
                    <button className={`score score--${bucketForScore(score)} score--btn`} title="Re-rank" onClick={() => onRate(t, a, trackIds)}>
                      {score.toFixed(1)}
                    </button>
                  ) : (
                    <button className="btn btn--primary" onClick={() => onRate(t, a, trackIds)}>Rate</button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {a.externalUrl && (
          <p className="center tiny"><a href={a.externalUrl} target="_blank" rel="noreferrer">Open in Apple Music</a></p>
        )}
      </div>
    </div>
  );
}
