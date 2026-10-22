import { createItunesProvider } from './itunes.js';

// Swap or add providers here. MusicKit (./musickit.js) is a stub for later.
const providers = {
  itunes: createItunesProvider(),
};

export const DEFAULT_PROVIDER = 'itunes';

export function getProvider(id = DEFAULT_PROVIDER) {
  const p = providers[id];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}
