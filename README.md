# Quiet Eaves

React + Vite + Bun. Seven full-screen roof compositions inspired by the supplied references, with cursor-reactive hanging calligraphy.

## Run

```sh
bun install
bun dev
```

## Build and verify

```sh
bun test
bun run build
bun run preview
```

Scenes use a 1920 × 1080 coordinate system. Artwork scales uniformly to cover the full viewport without letterboxing; the hanging text uses the same covering frame. Headings remain inside the viewport. Mouse-wheel and trackpad input advances horizontally, with the next chapter entering from the right. Touch supports horizontal swipes. Trackpad momentum is gated to one chapter per gesture. Arrow keys, Page Up/Down, Home/End, the chapter menu and numbered controls also navigate. Touch motion influences the text without blocking horizontal swiping. The circle in the bottom right pauses animation; the system's reduced-motion preference is respected.

`app/scenes.js` holds titles, descriptions and roof anchor positions. `app/physics.js` contains the fixed-step Verlet simulation. `app/Calligraphy.jsx` draws the characters, runs only the visible chapter, and pauses work when the document is hidden. `app/navigation.js` normalizes wheel input and gates momentum. `app/globals.css` holds the layout and visual styling. Scene backgrounds in `public/scenes/` were derived from the supplied concept images using image generation to remove the baked-in interface and hanging text. The bells and landscapes remain part of the artwork.

All seven source concepts are represented: idea-3 → silence, idea-5 → whisper, idea-4 → sky, idea-1 → landscape, idea-2 → rain, idea-6 → memory, idea07 → journey.

## Chimes

Sound enables automatically. Where the browser blocks autoplay, the first ordinary click, touch, or key press unlocks audio; no sound toggle is shown. Brush the characters to play notes. Pausing motion, opening the menu, changing chapters, or hiding the tab fades existing notes.

Chapters 1, 2, 3 and 6 preserve their approved sounds. The user's three chosen Freesound recordings replace chapters 7, 4 and 5 respectively:

- Chapter 7: newlocknew, sound 772279 — crystal chime texture.
- Chapter 4: nlux, sound 620968 — processed small glass windchime.
- Chapter 5: smand, sound 525052 — small wind chime.

Each chapter uses three short stereo excerpts of its selected source at the original speed and pitch. There is no added synthesis or pitch shifting. Playback still responds to brushing the strands, with overlap limits to keep the texture clear. Files are served locally from `public/audio/`.

Full source links, licenses and excerpt times are in `public/audio/CREDITS.md`. nlux's CC BY 4.0 attribution is visible in About. `app/chimes.js` handles sample selection and playback; tests check exact source mapping, available WAV files, unchanged approved voices and original-speed playback.
