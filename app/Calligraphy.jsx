import { useEffect, useRef } from 'react';
import { poem } from './scenes';
import { makeRopes, stepRopes } from './physics';
import { brushedStrands } from './chimes';

export default function Calligraphy({ scene, active, paused, chimes }) {
  const ref=useRef(null);
  const ropes=useRef(null);
  const lastInput=useRef(null);
  const pointer=useRef({active:false,x:0,y:0,vx:0,vy:0});
  useEffect(()=>{
    const canvas=ref.current, ctx=canvas.getContext('2d');
    ropes.current ??= makeRopes(scene);
    let frame=0,previous=0,accumulator=0;
    const glyphs=[...new Set(poem)];
    const atlas=document.createElement('canvas');atlas.width=glyphs.length*32;atlas.height=32;
    const ac=atlas.getContext('2d');
    ac.font='19px "Songti SC", "Noto Serif CJK SC", "SimSun", serif';ac.textAlign='center';ac.textBaseline='middle';ac.fillStyle='#393329';
    glyphs.forEach((c,i)=>ac.fillText(c,i*32+16,16));
    const lookup=Object.fromEntries(glyphs.map((c,i)=>[c,i]));
    const draw=()=>{
      ctx.clearRect(0,0,1920,1080);
      for(const rope of ropes.current) {
        const nodes=rope.nodes;
        for(let j=1;j<nodes.length;j++) {
          const p=nodes[j],a=nodes[j-1],fade=Math.min(1,(nodes.length-j)/12);
          const stamp=(rope.seed%11===3 && j===nodes.length-7);
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-Math.atan2(p.x-a.x,p.y-a.y));
          ctx.globalAlpha=(.62+.13*Math.sin(rope.seed*1.7))*fade;
          if(stamp){ctx.strokeStyle='#a44e36';ctx.fillStyle='#a44e36';ctx.lineWidth=.7;ctx.strokeRect(-6,-8,12,16);ctx.font='10px serif';ctx.textAlign='center';ctx.fillText('靜',0,4);}
          else {const glyph=poem[(rope.seed*7+j)%poem.length];ctx.drawImage(atlas,lookup[glyph]*32,0,32,32,-9,-9,18,18);}
          ctx.restore();
        }
      }
      ctx.globalAlpha=1;
    };
    const tick=time=>{
      if(document.hidden){previous=0;frame=requestAnimationFrame(tick);return;}
      accumulator+=previous?Math.min(time-previous,50):16.667;previous=time;
      while(accumulator>=16.667){stepRopes(ropes.current,pointer.current,time);pointer.current.vx*=.8;pointer.current.vy*=.8;accumulator-=16.667;}
      draw();frame=requestAnimationFrame(tick);
    };
    draw();if(active&&!paused)frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);pointer.current.active=false;lastInput.current=null;};
  },[scene,active,paused]);
  function move(e) {
    const rect=ref.current.getBoundingClientRect(),p=pointer.current;
    const x=(e.clientX-rect.left)*1920/rect.width,y=(e.clientY-rect.top)*1080/rect.height;
    const now=performance.now(),last=lastInput.current;
    if(active && !paused && !document.hidden && last && now-last.time<140 && ropes.current){
      const speed=Math.hypot(x-last.x,y-last.y)/Math.max(8,now-last.time)*1000;
      for(const hit of brushedStrands(ropes.current,last,{x,y})){
        const pan=(e.clientX/window.innerWidth)*1.5-.75;
        if(chimes.current?.strike(scene.id,hit.strand,speed,pan))break;
      }
    }
    lastInput.current={x,y,time:now};
    p.vx=p.active?x-p.x:0;p.vy=p.active?y-p.y:0;p.x=x;p.y=y;p.active=true;
  }
  return <canvas ref={ref} width="1920" height="1080" className="calligraphy" aria-hidden="true" onPointerMove={move} onPointerDown={move} onPointerLeave={()=>{pointer.current.active=false;lastInput.current=null;}} onPointerUp={e=>{if(e.pointerType==='touch')pointer.current.active=false;}}/>;
}
