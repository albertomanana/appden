# Advanced Player Module

## Architecture

- `player.engine.ts`:
  - Dual-deck Web Audio engine.
  - Real crossfade and gapless-oriented preloading.
  - Master chain: decks -> mix bus -> compressor -> equalizer -> master gain -> destination.
- `player.store.ts`:
  - Global player state (Zustand).
  - Queue, playback, history, continue listening, radio mode.
  - Actions consumed by UI and hooks.
- `player.queue.ts`:
  - Pure queue operations and radio generation algorithm.
- `player.equalizer.ts`:
  - EQ presets using biquad filters.
- `player.persistence.ts`:
  - localStorage persistence + simulated backend history write.
- `utils/colorExtraction.ts`:
  - Dominant-color extraction for dynamic player backgrounds.
- `components/*`:
  - Mini player + full-screen player + controls + progress + queue panel.
- `hooks/*`:
  - Module initialization and typed access.

## Integration

Use `PlayerIntegrationExample` with your songs array, or compose your own page with:

- `MiniPlayer`
- `FullPlayer`
- `usePlayer()`
