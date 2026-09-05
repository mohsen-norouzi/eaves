// Fixed-step Verlet ropes: the first node remains attached to its roof.
export const SPACING = 12;
export function makeRopes(scene) {
  return Array.from({length:scene.count},(_,i)=>{
    const u=i/(scene.count-1), x=scene.x1+(scene.x2-scene.x1)*u, y=scene.anchor(u);
    return {x,y,seed:i, nodes:Array.from({length:Math.floor(scene.length(u,i)/SPACING)},(_,j)=>({x,y:y+j*SPACING,px:x,py:y+j*SPACING}))};
  });
}
export function stepRopes(ropes,pointer,time,wind=true) {
  for (const rope of ropes) {
    const nodes=rope.nodes;
    for(let j=1;j<nodes.length;j++) {
      const p=nodes[j];
      const vx=(p.x-p.px)*.965, vy=(p.y-p.py)*.965;
      p.px=p.x; p.py=p.y;
      p.x+=vx+(wind?Math.sin(time*.00065+rope.seed*.35+j*.09)*.017:0);
      p.y+=vy+.2;
      if(pointer?.active) {
        const dx=p.x-pointer.x,dy=p.y-pointer.y,d=Math.hypot(dx,dy), radius=115;
        if(d<radius) {
          const falloff=(1-d/radius)**2;
          p.x+=(dx/Math.max(d,1)*2.9+Math.max(-24,Math.min(24,pointer.vx))*.17)*falloff;
          p.y+=(dy/Math.max(d,1)*1.1+Math.max(-18,Math.min(18,pointer.vy))*.05)*falloff;
        }
      }
    }
    for(let iteration=0;iteration<7;iteration++) {
      nodes[0].x=rope.x;nodes[0].y=rope.y;
      for(let j=1;j<nodes.length;j++) {
        const a=nodes[j-1],b=nodes[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
        const error=(d-SPACING)/d;
        if(j===1){b.x-=dx*error;b.y-=dy*error;}
        else {a.x+=dx*error*.5;a.y+=dy*error*.5;b.x-=dx*error*.5;b.y-=dy*error*.5;}
      }
    }
    nodes[0].x=rope.x;nodes[0].y=rope.y;
  }
}
