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

## World branch — walkable 3D village

The `world` branch replaces horizontal scrolling with a continuous Three.js village. All seven roof designs are modeled as real geometry: instanced ceramic tiles, curved ridges, timber brackets, bells, and sparse house outlines. The original paintings remain available as a WebGL fallback; they are not mapped onto flat cards in the 3D scene.

- WASD or arrow keys: walk and strafe. Hold Shift to walk faster.
- Drag the view: look around. Release and move through the hanging characters to brush them.
- Hold the on-screen arrow buttons: walk with a mouse or touch. On touch, drag the words to brush them; drag empty space to look.
- Places: jump directly to any of the seven houses.
- Enter Quiet Eaves: unlock the existing audio. The header speaker toggles mute.

The lane has physical movement bounds to keep the camera outside the houses. Movement pauses when menus open or the window loses focus. Reduced-motion preference disables ambient wind and bell sway. The intro purchase link and credit stay centered; in the village they remain at the bottom right. Purchase opens a WhatsApp draft and does not send it.

`app/world/WorldCanvas.jsx` owns the perspective camera, lighting, street, input, ray-based brushing and renderer cleanup. `architecture.js` generates the seven roofs. `InkCurtain.js` draws the same calligraphy using a shared glyph atlas per house. `ropes3d.js` simulates the anchored strands in three dimensions. `walk.js` handles movement and placement. Only nearby strands are simulated; rendering pauses behind menus and in hidden tabs. The Three.js world loads separately from the interface.

The 1920 × 1080 artwork remains the composition reference, while the village camera adapts to the viewport. The existing React, Vite and Bun setup and approved chime recordings are preserved.

All seven source concepts are represented: idea-3 → silence, idea-5 → whisper, idea-4 → sky, idea-1 → landscape, idea-2 → rain, idea-6 → memory, idea07 → journey.

## Chimes

Each page load opens on an intro screen. “Enter Quiet Eaves” resumes the audio directly from the visitor’s click, then reveals the chapters with sound enabled. Recordings preload and decode behind the intro without attempting autoplay. The intro keeps underlying navigation and rope interaction inactive until entry. Explicit mute remains in effect through further clicks, key presses, and tab changes; unmuting requires the speaker button. If audio cannot start on entry, the site remains accessible and a subtle activation hint allows a later gesture to retry. The speaker button mutes or unmutes after entry. Samples preload before activation and skip quiet lead-ins. Brush the characters to play notes; recordings play immediately at their original pitch, with at most 1.5 seconds per strike. After 160ms without brushing, notes ring out with a gentle 1.1-second decay, bounded by the recording’s remaining duration. Leaving the canvas or window uses the same soft tail. Mute, opening the menu, changing chapters, or hiding the tab still fades notes quickly.

Chapters 1, 2, 3 and 6 preserve their approved sounds. The user's three chosen Freesound recordings replace chapters 7, 4 and 5 respectively:

- Chapter 7: newlocknew, sound 772279 — crystal chime texture.
- Chapter 4: nlux, sound 620968 — processed small glass windchime.
- Chapter 5: smand, sound 525052 — small wind chime.

Each chapter uses three short stereo excerpts of its selected source at the original speed and pitch. There is no added synthesis or pitch shifting. Playback still responds to brushing the strands, with overlap limits to keep the texture clear. Files are served locally from `public/audio/`.

Full source links, licenses and excerpt times are in `public/audio/CREDITS.md`. nlux's CC BY 4.0 attribution is visible in About. `app/chimes.js` handles sample selection and playback; tests check exact source mapping, available WAV files, unchanged approved voices and original-speed playback.

## Desert ambience

The user-supplied desert recording streams from `public/audio/desert.m4a` as a quiet continuous loop after entry. A two-second overlap softens the loop seam; playback fades in beneath the chimes and continues through house visits and menus. The header sound button mutes both layers. Background audio pauses when the tab is hidden and resumes from the same position when visible, respecting mute. `app/ambience.js` manages playback through a separate gain on the existing audio context. The large original is preserved in the ignored local `source-audio/` folder and is excluded from the website build.
