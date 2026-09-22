/* eslint-disable next/no-img-element -- Local Vite app; the image is a WebGL fallback. */
import React, { useRef, useState, useEffect, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { scenes } from './scenes';
import Calligraphy from './Calligraphy';
import { Chimes, attachAutomaticAudio } from './chimes';
import { DesertAmbience, AMBIENCE_URL } from './ambience';
import './globals.css';
const WorldCanvas = lazy(() => import('./world/WorldCanvas'));

function CreatorCredit() {
  return (
    <a
      className="creator-credit"
      href="https://itsmohsen.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made by Mohsen — visit my website (opens in a new tab)"
      title="Visit Mohsen’s website"
    >
      <span className="credit-text">MADE BY MOHSEN</span>
      <span className="credit-external" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

const purchaseUrl = `https://wa.me/34666601296?text=${encodeURIComponent("Hi Mohsen, I'm interested in buying Quiet Eaves. Could you share the price and what's included?")}`;
function BuyButton() {
  return (
    <a
      className="buy-button"
      href={purchaseUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Make this yours — enquire about purchasing on WhatsApp (opens in a new tab)"
    >
      Make this yours
    </a>
  );
}

export default function App() {
  const [worldStatus, setWorldStatus] = useState('loading');
  const [entered, setEntered] = useState(false);
  const [entering, setEntering] = useState(false);
  const [active, setActive] = useState(0);
  const [panel, setPanel] = useState(null);
  const [audioAwake, setAudioAwake] = useState(true);
  const [muted, setMuted] = useState(false);
  const chimes = useRef(null);
  const ambience = useRef(null);
  const ambientAudio = useRef(null);
  useEffect(() => {
    chimes.current ??= new Chimes();
    const engine = chimes.current;
    const background = new DesertAmbience({ audio: ambientAudio.current });
    ambience.current = background;
    // Fetch and decode before entry, but resume audio only from the Enter click.
    try {
      engine.prepare();
    } catch {
      // Entry retries initialization and reports an audio failure if it persists.
    }
    return () => {
      background.dispose();
      ambience.current = null;
      engine.dispose();
      chimes.current = null;
    };
  }, []);
  useEffect(() => {
    if (!entered) return;
    return attachAutomaticAudio(
      chimes.current,
      window,
      document,
      setAudioAwake,
    );
  }, [entered]);
  useEffect(() => {
    chimes.current?.silence();
  }, [active, panel]);
  const root = useRef(null);
  const controls = useRef(new Set());
  const [visit, setVisit] = useState(null);
  function go(index) {
    setVisit({ index });
    setActive(index);
    root.current?.focus({ preventScroll: true });
  }
  function hold(e, code) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    controls.current.add(code);
  }
  function releaseControl(code) {
    controls.current.delete(code);
  }
  async function enter() {
    if (entering) return;
    setEntering(true);
    try {
      // Keep resume inside this trusted click, before any asynchronous work.
      const activation = chimes.current.enable();
      void ambience.current?.start(chimes.current.context);
      await activation;
      setAudioAwake(chimes.current.enabled);
    } catch {
      setAudioAwake(false);
    }
    setEntered(true);
    setEntering(false);
  }
  useEffect(() => {
    if (entered) root.current?.focus({ preventScroll: true });
  }, [entered]);
  function toggleMute() {
    const engine = chimes.current;
    if (!engine) return;
    const next = !engine.muted;
    engine.setMuted(next);
    void ambience.current?.setMuted(next);
    setMuted(next);
    if (!next)
      void engine.enable().then(
        () => setAudioAwake(engine.enabled),
        () => setAudioAwake(false),
      );
  }
  function choose(i) {
    setPanel(null);
    go(i);
  }
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- Optional ambient soundtrack; no spoken or instructional content. */}
      <audio
        ref={ambientAudio}
        src={AMBIENCE_URL}
        preload="metadata"
        loop
        hidden
        aria-hidden="true"
      />
      {!entered && (
        <section className="intro" aria-labelledby="intro-title">
          <div className="intro-art" aria-hidden="true" />
          <div className="intro-content">
            <span className="intro-seal" aria-hidden="true">
              靜
            </span>
            <p className="intro-eyebrow">
              SEVEN ROOFS. A THOUSAND QUIET STORIES.
            </p>
            <h1 id="intro-title">Quiet Eaves</h1>
            <p className="intro-description">
              A little wind.
              <br />A quieter world.
            </p>
            <button
              className="enter-button"
              onClick={enter}
              disabled={entering}
              aria-busy={entering}
            >
              {entering ? 'OPENING…' : 'ENTER QUIET EAVES'}
              <span aria-hidden="true">↗</span>
            </button>
            <p className="intro-sound">
              Walk with WASD or the arrow keys. Drag to look. Sound on entry.
            </p>
          </div>
          <div className="footer-controls intro-footer">
            <BuyButton />
            <CreatorCredit />
          </div>
        </section>
      )}
      <div
        className={`experience walk-experience ${entered ? 'has-entered' : ''} world-${worldStatus}`}
        inert={!entered}
        aria-hidden={!entered}
      >
        <Suspense fallback={null}>
          <WorldCanvas
            entered={entered}
            panel={panel}
            visit={visit}
            controls={controls}
            onPlace={setActive}
            chimes={chimes}
            onStatus={setWorldStatus}
          />
        </Suspense>
        <a className="skip-link" href="#village">
          Skip to the village
        </a>
        <header className="site-header">
          <button
            className="brand"
            onClick={() => go(0)}
            aria-label="Quiet Eaves — first chapter"
          >
            <svg viewBox="0 0 54 48" aria-hidden="true">
              <path d="M3 23 26 3 49 23M8 21v22h17V23m18-2v22" />
              <rect x="47" y="36" width="5" height="8" />
            </svg>
            <span>QUIET EAVES</span>
          </button>
          <nav aria-label="Main navigation">
            <button onClick={() => go(0)}>HOME</button>
            <button className="selected" onClick={() => setPanel('chapters')}>
              PLACES
            </button>
            <button onClick={() => setPanel('about')}>ABOUT</button>
          </nav>
          <div className="header-actions">
            <button
              className="sound-toggle"
              onClick={toggleMute}
              aria-label="Mute sound"
              aria-pressed={muted}
              title={muted ? 'Unmute sound' : 'Mute sound'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4Z" />
                {muted ? (
                  <path d="m16 9 6 6m0-6-6 6" />
                ) : (
                  <>
                    <path d="M15 8a6 6 0 0 1 0 8" />
                    <path d="M18 5a10 10 0 0 1 0 14" />
                  </>
                )}
              </svg>
            </button>
            <button
              className="menu-toggle"
              onClick={() => setPanel('chapters')}
              aria-label="Open chapter menu"
            >
              MENU
              <span className="menu-lines" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main
          id="village"
          ref={root}
          className="walk-surface"
          tabIndex={-1}
          aria-label="Walkable village. Use WASD or arrow keys to walk, drag to look around, and brush hanging words to hear chimes."
        >
          {worldStatus === 'fallback' && (
            <div className="walk-fallback">
              <img
                src={`/scenes/${scenes[active].id}.png`}
                alt="A roof and hanging calligraphy"
              />
              <Calligraphy
                scene={scenes[active]}
                active={entered && !panel}
                chimes={chimes}
              />
              <p>
                3D is unavailable in this browser. You can still explore the
                roofs from Places.
              </p>
            </div>
          )}
        </main>
        <div className="place-caption" aria-live="polite">
          <span>0{active + 1} / 07</span>
          <p>{scenes[active].name}</p>
        </div>
        <div className="walking-help">
          <span className="walk-help-desktop">
            WASD / ARROWS TO WALK · DRAG TO LOOK
          </span>
          <span className="walk-help-touch">
            HOLD ARROWS TO WALK · DRAG TO LOOK
          </span>
          <small>Brush the hanging words to hear their chimes.</small>
        </div>
        <fieldset className="walk-controls" aria-label="Walking controls">
          {[
            ['KeyW', '↑', 'Walk forward'],
            ['KeyA', '←', 'Walk left'],
            ['KeyS', '↓', 'Walk backward'],
            ['KeyD', '→', 'Walk right'],
          ].map(([code, label, name]) => (
            <button
              key={code}
              className={`walk-key ${code}`}
              aria-label={name}
              onPointerDown={(e) => hold(e, code)}
              onPointerUp={() => releaseControl(code)}
              onPointerCancel={() => releaseControl(code)}
              onLostPointerCapture={() => releaseControl(code)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  controls.current.add(code);
                }
              }}
              onKeyUp={() => releaseControl(code)}
              onBlur={() => releaseControl(code)}
            >
              {label}
            </button>
          ))}
        </fieldset>
        {!audioAwake && !muted && !panel && (
          <output className="audio-invitation">
            Click anywhere to awaken the chimes.
          </output>
        )}
        <div className="footer-controls">
          <BuyButton />
          <CreatorCredit />
        </div>
        <output className="sr-only">
          House {active + 1} of {scenes.length}: {scenes[active].name}
        </output>
        <Dialog
          open={Boolean(panel)}
          onOpenChange={(open) => {
            if (!open) setPanel(null);
          }}
        >
          <DialogContent className="chapter-menu" showCloseButton={false}>
            <div className="menu-heading">
              <span>QUIET EAVES</span>
              <button
                onClick={() => setPanel(null)}
                className="menu-close"
                aria-label="Close menu"
              >
                CLOSE <span>×</span>
              </button>
            </div>
            <DialogTitle className="menu-title">
              {panel === 'about'
                ? 'A study in stillness.'
                : 'Every roof, a quiet story.'}
            </DialogTitle>
            <DialogDescription className="menu-description">
              {panel === 'about'
                ? 'An invitation to slow down. Seven imagined places, held between architecture, poetry, and the passing wind.'
                : 'Take your time. Choose a place to begin.'}
            </DialogDescription>
            {panel === 'chapters' ? (
              <div className="chapter-list">
                {scenes.map((s, i) => (
                  <button key={s.id} onClick={() => choose(i)}>
                    <span className="chapter-number">0{i + 1}</span>
                    <span>{s.name}</span>
                    <span className="chapter-arrow">↗</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="about-copy">
                <p>
                  Move your cursor through the hanging words. Like ink carried
                  on a breeze, each strand bends, drifts, and finds its way
                  home. Each roof has its own chime voice, awakened by your
                  touch.
                </p>
                <p>
                  Walk along the lane with WASD or the arrow keys. Drag the view
                  to look around, then release and brush the words. On touch
                  screens, hold the direction buttons to walk. Choose a roof in
                  Places to visit it directly.
                </p>
                <p className="audio-credits">
                  Sound includes{' '}
                  <a
                    href="https://freesound.org/people/nlux/sounds/620968/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Processed Small Glass Windchime 001.wav
                  </a>{' '}
                  by nlux, licensed under{' '}
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY 4.0
                  </a>{' '}
                  (excerpts, volume adjusted, faded).{' '}
                  <a href="/audio/CREDITS.md" target="_blank" rel="noreferrer">
                    All sound credits
                  </a>
                  .
                </p>
                <button onClick={() => setPanel('chapters')}>
                  EXPLORE THE CHAPTERS <span>↗</span>
                </button>
              </div>
            )}
            <span className="menu-signature" lang="zh">
              山 川 異 域　風 月 同 天
            </span>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
