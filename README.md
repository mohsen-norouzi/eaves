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

Scenes use a 1920 × 1080 coordinate system. Artwork scales uniformly to cover the full viewport without letterboxing; the hanging text uses the same covering frame. Headings remain inside the viewport. Mouse-wheel and trackpad input advances horizontally, with the next chapter entering from the right. Touch supports horizontal swipes. Trackpad momentum is gated to one chapter per gesture. Arrow keys, Page Up/Down, Home/End, the chapter menu and numbered controls also navigate. Touch motion influences the text without blocking horizontal swiping. Wind stays active. Brush-triggered sound defaults to on; the speaker button beside the menu mutes or unmutes chimes without pausing the wind. Corner controls share one responsive page inset. The bottom-right credit links to https://itsmohsen.com/. “Make this yours” in the bottom-right corner of the intro and chapters opens a WhatsApp enquiry to +34 666 601 296 with a prefilled message; it does not send automatically or collect payment. Reduced-motion preferences still disable smooth chapter transitions.

`app/scenes.js` holds titles, descriptions and roof anchor positions. `app/physics.js` contains the fixed-step Verlet simulation. `app/Calligraphy.jsx` draws the characters, runs only the visible chapter, and pauses work when the document is hidden. `app/navigation.js` normalizes wheel input and gates momentum. `app/globals.css` holds the layout and visual styling. Scene backgrounds in `public/scenes/` were derived from the supplied concept images using image generation to remove the baked-in interface and hanging text. The bells and landscapes remain part of the artwork.

All seven source concepts are represented: idea-3 → silence, idea-5 → whisper, idea-4 → sky, idea-1 → landscape, idea-2 → rain, idea-6 → memory, idea07 → journey.

## Chimes

Each page load opens on an intro screen. “Enter Quiet Eaves” resumes the audio directly from the visitor’s click, then reveals the chapters with sound enabled. Recordings preload and decode behind the intro without attempting autoplay. The intro keeps underlying navigation and rope interaction inactive until entry. Explicit mute remains in effect through further clicks, key presses, and tab changes; unmuting requires the speaker button. If audio cannot start on entry, the site remains accessible and a subtle activation hint allows a later gesture to retry. The speaker button mutes or unmutes after entry. Samples preload before activation and skip quiet lead-ins. Brush the characters to play notes; recordings play immediately at their original pitch, with at most 1.5 seconds per strike. After 160ms without brushing, notes ring out with a gentle 1.1-second decay, bounded by the recording’s remaining duration. Leaving the canvas or window uses the same soft tail. Mute, opening the menu, changing chapters, or hiding the tab still fades notes quickly.

Chapters 1, 2, 3 and 6 preserve their approved sounds. The user's three chosen Freesound recordings replace chapters 7, 4 and 5 respectively:

- Chapter 7: newlocknew, sound 772279 — crystal chime texture.
- Chapter 4: nlux, sound 620968 — processed small glass windchime.
- Chapter 5: smand, sound 525052 — small wind chime.

Each chapter uses three short stereo excerpts of its selected source at the original speed and pitch. There is no added synthesis or pitch shifting. Playback still responds to brushing the strands, with overlap limits to keep the texture clear. Files are served locally from `public/audio/`.

Full source links, licenses and excerpt times are in `public/audio/CREDITS.md`. nlux's CC BY 4.0 attribution is visible in About. `app/chimes.js` handles sample selection and playback; tests check exact source mapping, available WAV files, unchanged approved voices and original-speed playback.
