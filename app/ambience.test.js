import { test, expect } from 'bun:test';
import { DesertAmbience, AMBIENCE_URL } from './ambience';

function setup(play = () => Promise.resolve()) {
  const doc = new EventTarget();
  doc.hidden = false;
  const targets = [],
    timers = new Map();
  let timer = 0;
  const audio = {
    paused: true,
    currentTime: 39,
    plays: 0,
    pauses: 0,
    play() {
      this.plays++;
      this.paused = false;
      return play();
    },
    pause() {
      this.pauses++;
      this.paused = true;
    },
    removeAttribute() {},
    load() {},
  };
  const gain = {
    value: 0,
    cancelAndHoldAtTime() {},
    cancelScheduledValues() {},
    setValueAtTime(v) {
      this.value = v;
    },
    setTargetAtTime(v) {
      this.value = v;
      targets.push(v);
    },
  };
  const context = {
    currentTime: 0,
    destination: {},
    createGain: () => ({ gain, connect() {}, disconnect() {} }),
    createMediaElementSource: () => ({ connect() {}, disconnect() {} }),
  };
  const engine = new DesertAmbience({
    audio,
    doc,
    schedule: (fn) => {
      timers.set(++timer, fn);
      return timer;
    },
    cancel: (id) => timers.delete(id),
  });
  return {
    engine,
    audio,
    doc,
    gain,
    targets,
    context,
    flush: () => {
      for (const fn of timers.values()) fn();
      timers.clear();
    },
  };
}

test('ambience waits for entry, streams on a loop and fades below the chimes', async () => {
  const s = setup();
  expect(s.audio.plays).toBe(0);
  expect(s.audio.loop).toBe(true);
  expect(s.audio.preload).toBe('metadata');
  await s.engine.start(s.context);
  expect(s.audio.plays).toBe(1);
  expect(s.targets.at(-1)).toBe(0.16);
  await s.engine.setMuted(true);
  s.flush();
  expect(s.audio.paused).toBe(true);
  expect(s.targets.at(-1)).toBe(0);
  await s.engine.setMuted(false);
  expect(s.audio.paused).toBe(false);
  expect(s.audio.currentTime).toBe(39);
  s.engine.dispose();
});

test('hidden tabs pause immediately and visibility never overrides mute', async () => {
  const s = setup();
  await s.engine.start(s.context);
  s.doc.hidden = true;
  s.doc.dispatchEvent(new Event('visibilitychange'));
  expect(s.audio.paused).toBe(true);
  expect(s.gain.value).toBe(0);
  s.doc.hidden = false;
  s.doc.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();
  expect(s.audio.paused).toBe(false);
  await s.engine.setMuted(true);
  s.flush();
  const plays = s.audio.plays;
  s.doc.hidden = true;
  s.doc.dispatchEvent(new Event('visibilitychange'));
  s.doc.hidden = false;
  s.doc.dispatchEvent(new Event('visibilitychange'));
  expect(s.audio.plays).toBe(plays);
  expect(s.audio.paused).toBe(true);
  s.engine.dispose();
});

test('late playback promises cannot undo mute or disposal', async () => {
  for (const action of ['mute', 'dispose']) {
    let resolve;
    const s = setup(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const pending = s.engine.start(s.context);
    if (action === 'mute') await s.engine.setMuted(true);
    else s.engine.dispose();
    resolve();
    await pending;
    expect(s.audio.paused).toBe(true);
    expect(s.targets).not.toContain(0.16);
    s.engine.dispose();
  }
});

test('rapid unmute cancels the old pause and load failure remains recoverable', async () => {
  const s = setup();
  await s.engine.start(s.context);
  await s.engine.setMuted(true);
  await s.engine.setMuted(false);
  s.flush();
  expect(s.audio.paused).toBe(false);
  s.engine.dispose();
  let fails = true;
  const retry = setup(() =>
    fails ? Promise.reject(new Error('not ready')) : Promise.resolve(),
  );
  expect(await retry.engine.start(retry.context)).toBe(false);
  fails = false;
  expect(await retry.engine.start(retry.context)).toBe(true);
  retry.engine.dispose();
});

test('the served ambience is a compact AAC/MP4 file', async () => {
  const file = Bun.file(new URL(`../public${AMBIENCE_URL}`, import.meta.url));
  expect(await file.exists()).toBe(true);
  expect(file.size).toBeLessThan(2500000);
  expect(new TextDecoder().decode((await file.bytes()).slice(4, 8))).toBe(
    'ftyp',
  );
});
