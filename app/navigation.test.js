import { test, expect } from 'bun:test';
import {createWheelState,wheelStep} from './navigation';

test('scrolling down advances right; scrolling up returns left',()=>{
  const state=createWheelState();
  expect(wheelStep(state,{deltaY:90},0)).toBe(1);
  expect(wheelStep(state,{deltaY:-90},1000)).toBe(-1);
});
test('a long trackpad momentum tail only advances one chapter',()=>{
  const state=createWheelState();let steps=0;
  for(let t=0;t<1600;t+=16)steps+=wheelStep(state,{deltaY:35*Math.exp(-t/450)},t);
  expect(steps).toBe(1);
  expect(wheelStep(state,{deltaY:90},2100)).toBe(1);
});
test('horizontal trackpad gestures and line-based mouse wheels work',()=>{
  expect(wheelStep(createWheelState(),{deltaX:65,deltaY:3},0)).toBe(1);
  expect(wheelStep(createWheelState(),{deltaY:-3,deltaMode:1},0)).toBe(-1);
});
test('small pointer-wheel noise does not change chapters',()=>{
  const state=createWheelState();
  expect(wheelStep(state,{deltaY:2},0)).toBe(0);
  expect(wheelStep(state,{deltaY:-2},20)).toBe(0);
});

test('every supplied reference has its own available chapter artwork',async()=>{
  const {scenes}=await import('./scenes');
  expect(scenes.map(s=>s.source).sort()).toEqual(['idea-1.png','idea-2.png','idea-3.png','idea-4.png','idea-5.png','idea-6.png','idea07.png']);
  expect(new Set(scenes.map(s=>s.id)).size).toBe(7);
  for(const scene of scenes)expect(await Bun.file(new URL(`../public/scenes/${scene.id}.png`,import.meta.url)).exists()).toBe(true);
});
