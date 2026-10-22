# Musi

A Beli-style music rating app. Search songs and albums, sort each one into a bucket
(liked, fine, didn't like), then answer a few quick "which is better?" questions to
place it in your personal ranked list. Scores (0 to 10) come from the rank inside each bucket.

- React + Vite, plain JavaScript
- Data from the free iTunes Search API (same catalog as Apple Music, no key needed)
- Everything is stored in your browser (localStorage). Export/import JSON for backups.
- Static build, deploy anywhere (GitHub Pages, Netlify, PythonAnywhere static files, etc.)

## Run it

Requires Node 18 or newer.

```
cd Personal_Projects\musi
npm install
npm run dev        # open the printed URL (http://localhost:5173)
npm test           # unit tests (Vitest)
npm run build      # production build into dist\
npm run preview    # serve the built dist\ locally
```

To test on your phone on the same Wi-Fi: `npm run dev -- --host` and open the Network URL.

## Deploy

`npm run build` produces a fully static `dist\` folder. `base: './'` in `vite.config.js`
makes it work from any subfolder, so just upload the contents of `dist\`.

## How rating works

1. Pick a bucket: liked, fine, or didn't like.
2. Binary insertion: Musi compares the new item to the middle of that bucket's list and
   halves the range each answer, so a list of 100 needs at most 7 questions.
   "Too close to call" places it right above the item it was compared to.
3. Scores are derived from position: liked spans 10 to 6.7, fine 6.7 to 3.4,
   didn't like 3.3 to 0, spread evenly by rank (`src/lib/ranking.js`).

Re-rank an item from its menu in the ranked list; canceling keeps its old spot.

### Albums

Albums are not compared directly. Tap an album (or "Rate songs") to open its tracklist
(iTunes lookup, cached for 7 days), then rate the songs. The album score is the average of
its rated songs. An album shows up in the ranked albums list once at least one of its
songs is rated; until every track is rated its score badge is dashed and shows progress
like `5/12`. Rating any song also adds its album to your library automatically.

Library schema v2: on load or import, v1 data with directly rated albums is migrated. The
albums stay in your library (as unrated) and their scores are derived from songs from now on.

## Project layout

```
src/
  App.jsx                     tabs, rating flow wiring
  styles.css                  mobile-first dark theme
  components/                 SearchView, RankedView, QueueView, DataView, RateFlow, ItemCard
  lib/ranking.js              comparison engine + score math (pure, tested)
  lib/library.js              library model, localStorage, export/import (pure, tested)
  lib/useLibrary.js           React hook that persists the library
  lib/usePreview.js           single shared audio player for 30s previews
  data/cache.js               TTL cache for API responses (localStorage)
  data/providers/
    MusicProvider.js          provider interface + normalized item shape
    itunes.js                 iTunes Search provider (search, getById)
    musickit.js               Apple MusicKit stub (not implemented)
    index.js                  provider registry
```

## Data providers

All music data flows through the `MusicProvider` interface (`search(term, kind)`,
`getById(id, kind)`, `getAlbumTracks(albumId)`) and comes back as one normalized shape:

```
{ id, provider, kind: 'song' | 'album', title, artist, album, albumId,
  trackNumber, discNumber, trackCount, artworkUrl, previewUrl, externalUrl, releaseDate }
```

Ids look like `itunes:song:1440857781`. Search results are cached for 24 hours and
lookups for 7 days.

### Apple MusicKit (planned, not implemented)

MusicKit would add Apple Music library sync and direct Apple Music links. It needs an
Apple Developer account ($99/yr) and a server-signed developer token, so it belongs with
a future backend. The plan is in `src/data/providers/musickit.js`: implement the same
interface, register it in `providers/index.js`. Apple Music and iTunes share catalog ids,
so existing ratings can be mapped over.

## Line endings

The repo uses CRLF (`.gitattributes`, `.editorconfig`).
