import {test,expect} from 'bun:test';
import {makeRopes,stepRopes,SPACING} from './physics';
import {scenes} from './scenes';

test('all roof anchors remain fixed and all ropes stay finite during cursor swipes',()=>{
  for(const scene of scenes){
    const ropes=makeRopes(scene);
    for(let t=0;t<360;t++) stepRopes(ropes,{active:true,x:scene.x1+(t%100)*8,y:600+80*Math.sin(t/10),vx:16,vy:3},t*16.667);
    for(const rope of ropes){
      expect(rope.nodes[0].x).toBe(rope.x);expect(rope.nodes[0].y).toBe(rope.y);
      for(const n of rope.nodes){expect(Number.isFinite(n.x)).toBe(true);expect(Number.isFinite(n.y)).toBe(true);}
    }
  }
});
test('a swat displaces the letters and they settle after the pointer leaves',()=>{
  const scene={count:2,x1:100,x2:120,anchor:()=>100,length:()=>240};
  const ropes=makeRopes(scene);
  for(let t=0;t<90;t++)stepRopes(ropes,{active:true,x:90,y:240,vx:15,vy:0},t*16.667,false);
  const displaced=Math.max(...ropes[0].nodes.map(n=>Math.abs(n.x-100)));
  expect(displaced).toBeGreaterThan(15);
  for(let t=0;t<1500;t++)stepRopes(ropes,null,t*16.667,false);
  const settled=Math.max(...ropes[0].nodes.map(n=>Math.abs(n.x-100)));
  expect(settled).toBeLessThan(displaced*.1);
  for(const r of ropes)for(let j=1;j<r.nodes.length;j++)expect(Math.hypot(r.nodes[j].x-r.nodes[j-1].x,r.nodes[j].y-r.nodes[j-1].y)).toBeLessThan(SPACING*1.15);
});
