// One chapter per wheel gesture; ignore a trackpad's trailing momentum.
export function createWheelState(){return {lastAt:-Infinity,lockedUntil:0,accumulated:0,consumed:false};}
export function wheelStep(state,{deltaX=0,deltaY=0,deltaMode=0},now){
  if(now-state.lastAt>170){state.accumulated=0;state.consumed=false;}
  state.lastAt=now;
  if(now<state.lockedUntil||state.consumed)return 0;
  const delta=(Math.abs(deltaX)>Math.abs(deltaY)?deltaX:deltaY)*(deltaMode===1?16:deltaMode===2?800:1);
  if(Math.sign(delta)!==Math.sign(state.accumulated))state.accumulated=0;
  state.accumulated+=delta;
  if(Math.abs(state.accumulated)<28)return 0;
  state.consumed=true;state.lockedUntil=now+750;
  return Math.sign(state.accumulated);
}
