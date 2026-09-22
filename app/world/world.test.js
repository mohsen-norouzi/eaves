import { describe, test, expect } from 'bun:test';
import { scenes } from '../scenes.js';
import { createArchitecture, disposeObject } from './architecture.js';
import { makeRopes3D, stepRopes3D, SEGMENT } from './ropes3d.js';
import { advanceWalker, houseLocation, visitHouse } from './walk.js';
import * as T from 'three';

describe('walkable village', () => {
  test('diagonal motion has the same speed as forward motion', () => {
    const a = { x: 0, z: 0, yaw: 0 },
      b = { ...a };
    for (let i = 0; i < 20; i++) {
      advanceWalker(a, new Set(['KeyW']), 0.05);
      advanceWalker(b, new Set(['KeyW', 'KeyD']), 0.05);
    }
    expect(Math.hypot(a.x, a.z)).toBeCloseTo(Math.hypot(b.x, b.z), 7);
    expect(a.z).toBeCloseTo(-2.5, 7);
  });
  test('walking respects view direction, lane bounds and long-frame caps', () => {
    const p = { x: 0, z: 0, yaw: Math.PI / 2 };
    advanceWalker(p, new Set(['ArrowUp']), 10);
    expect(p.x).toBeCloseTo(-0.125, 7);
    for (let i = 0; i < 2000; i++)
      advanceWalker(p, new Set(['KeyW', 'KeyD', 'ShiftLeft']), 0.05);
    expect(p.x).toBeGreaterThanOrEqual(-3.8);
    expect(p.x).toBeLessThanOrEqual(3.8);
    expect(p.z).toBeGreaterThanOrEqual(-78);
    expect(p.z).toBeLessThanOrEqual(8);
  });
  test('seven visits land inside the lane and face the matching house', () => {
    for (let i = 0; i < 7; i++) {
      const h = houseLocation(i),
        p = visitHouse(i);
      expect(p.x).toBe(0);
      expect(p.z).toBe(h.z + 4);
      expect(Math.sign(-Math.sin(p.yaw))).toBe(Math.sign(h.x));
    }
  });
  test('every roof has finite 3D geometry and attached rope anchors', () => {
    for (const scene of scenes) {
      const a = createArchitecture(scene),
        box = new T.Box3().setFromObject(a.group);
      expect(box.isEmpty()).toBe(false);
      expect(Number.isFinite(box.max.y)).toBe(true);
      expect(box.max.z - box.min.z).toBeGreaterThan(100);
      const ropes = makeRopes3D(scene, a.anchorAt);
      for (let frame = 0; frame < 180; frame++)
        stepRopes3D(ropes, null, frame * 16.667);
      for (const rope of ropes) {
        expect(rope.nodes[0].x).toBe(rope.anchor.x);
        expect(rope.nodes[0].y).toBe(rope.anchor.y);
        expect(rope.nodes[0].z).toBe(rope.anchor.z);
        expect(rope.nodes.every((p) => Number.isFinite(p.x + p.y + p.z))).toBe(
          true,
        );
        for (let j = 1; j < rope.nodes.length; j++) {
          const p = rope.nodes[j],
            q = rope.nodes[j - 1];
          expect(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)).toBeLessThan(
            SEGMENT * 1.25,
          );
        }
      }
      disposeObject(a.group);
    }
  });
  test('brushing pushes characters into depth without moving their anchor', () => {
    const a = createArchitecture(scenes[0]),
      ropes = makeRopes3D(scenes[0], a.anchorAt),
      r = ropes[15],
      p = r.nodes[8];
    const pointer = { active: true, x: p.x, y: p.y, z: p.z, vx: 12, vy: 0 };
    for (let i = 0; i < 20; i++) stepRopes3D(ropes, pointer, i * 16.667, false);
    expect(r.nodes[8].z - r.anchor.z).toBeGreaterThan(8);
    expect(r.nodes[0].z).toBe(r.anchor.z);
    disposeObject(a.group);
  });
});
