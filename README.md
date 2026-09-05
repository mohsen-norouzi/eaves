# Quiet Eaves

React + Vite + Bun. Three full-screen roof compositions inspired by the supplied references, with cursor-reactive hanging calligraphy.

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

Desktop scenes use a 1920 × 1080 design coordinate system and scale uniformly to fit. Portrait screens reframe the roof above the story. Scroll snaps between chapters. Arrow keys, Page Up/Down, Home/End, the chapter menu and numbered controls also navigate. Touch motion influences the text without blocking vertical scrolling. The circle in the bottom right pauses animation; the system's reduced-motion preference is respected.

`app/scenes.js` holds titles, descriptions and roof anchor positions. `app/physics.js` contains the fixed-step Verlet simulation. `app/Calligraphy.jsx` draws the characters, runs only the visible chapter, and pauses work when the document is hidden. `app/globals.css` holds the layout and visual styling. Scene backgrounds in `public/scenes/` were derived from the supplied concept images using image generation to remove the baked-in interface and hanging text. The bells and landscapes remain part of the artwork.
