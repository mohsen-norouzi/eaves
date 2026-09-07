import {test,expect} from 'bun:test';
import {Chimes,chimeProfiles,noteForStrand,brushedStrands,attachAutomaticAudio} from './chimes';
import {scenes} from './scenes';

test('every roof has a distinct palette and its strands follow a shared pentatonic scale',()=>{
  expect(Object.keys(chimeProfiles).sort()).toEqual(scenes.map(s=>s.id).sort());
  expect(new Set(Object.values(chimeProfiles).map(p=>p.sample || JSON.stringify(p.partials))).size).toBe(7);
  for(const scene of scenes){
    for(let i=0;i<scene.count;i++){
      const {frequency,profile}=noteForStrand(scene.id,i);
      expect(frequency).toBeGreaterThan(100);expect(frequency).toBeLessThan(2100);
      const semitone=Math.round(12*Math.log2(frequency/profile.base));
      expect([0,2,4,7,9]).toContain(semitone%12);
    }
    expect(noteForStrand(scene.id,0).frequency).not.toBe(noteForStrand(scene.id,1).frequency);
  }
});
test('sweeping through a moving strand triggers a hit, distant and stationary motion do not',()=>{
  const ropes=[{seed:2,nodes:Array.from({length:20},(_,j)=>({x:100+j,y:100+j*12}))}];
  expect(brushedStrands(ropes,{x:60,y:230},{x:180,y:230}).map(h=>h.strand)).toEqual([2]);
  expect(brushedStrands(ropes,{x:400,y:230},{x:500,y:230})).toEqual([]);
  expect(brushedStrands(ropes,{x:110,y:230},{x:110,y:230})).toEqual([]);
});

function param(){return {value:0,cancelScheduledValues(){},setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};}
class AudioStub{
  constructor(){this.currentTime=0;this.state='suspended';this.destination={};this.started=0;this.sources=[];}
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createDynamicsCompressor(){return {threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}};}
  createStereoPanner(){return {pan:param(),connect(){},disconnect(){}};}
  createBufferSource(){const source={playbackRate:{value:1},connect(){},disconnect(){},start:()=>this.started++,stop(){}};this.sources.push(source);return source;}
  createOscillator(){return {frequency:param(),connect(){},disconnect(){},start:()=>this.started++,stop(){}};}
  async resume(){this.state='running';}
  async close(){this.state='closed';}
}
test('audio unlocks, limits strikes, and cleans up on disposal',async()=>{
  const original=globalThis.AudioContext;globalThis.AudioContext=AudioStub;
  try{
    const engine=new Chimes();
    expect(engine.context).toBeNull();expect(engine.strike('silence',0,500)).toBe(false);
    await engine.enable();
    expect(engine.strike('silence',0,500)).toBe(true);
    expect(engine.context.started).toBe(4);
    expect(engine.strike('silence',1,500)).toBe(false);
    engine.context.currentTime=.1;
    expect(engine.strike('silence',0,500)).toBe(false);
    expect(engine.strike('silence',1,500)).toBe(true);
    engine.disable();engine.context.currentTime=1;
    expect(engine.strike('silence',2,500)).toBe(false);
    engine.dispose();
  }finally{globalThis.AudioContext=original;}
});


test('chapters 1 and 3 keep the exact original sound profiles',()=>{
  expect(chimeProfiles.silence).toEqual({name:'Brass wind chimes',base:293.665,decay:2.7,partials:[[1,1],[2.01,.32],[2.76,.16],[4.05,.06]]});
  expect(chimeProfiles.sky).toEqual({name:'Deep temple bells',base:146.8325,decay:4.2,partials:[[1,1],[1.505,.27],[2.01,.3],[2.76,.12],[4.07,.04]]});
});
test('chapters 2 and 6 use available recordings and no oscillator voices',async()=>{
  const original=globalThis.AudioContext;globalThis.AudioContext=AudioStub;
  try{
    const engine=new Chimes();await engine.enable();
    engine.context.createOscillator=()=>{throw new Error('Recorded voices must not synthesize tones');};
    for(const id of ['whisper','memory']){
      const profile=chimeProfiles[id];
      expect(await Bun.file(new URL('../public'+profile.sample,import.meta.url)).exists()).toBe(true);
      engine.buffers.set(profile.sample,{duration:2});engine.context.currentTime+=1;
      expect(engine.strike(id,0,500)).toBe(true);
    }
    expect(engine.context.started).toBe(2);engine.dispose();
  }finally{globalThis.AudioContext=original;}
});
test('automatic audio retries on gestures after autoplay rejection and cleans up listeners',async()=>{
  const target=new EventTarget(),doc=new EventTarget();doc.hidden=false;
  let attempts=0,quiet=0;
  const engine={context:{state:'suspended'},enabled:false,enable:async()=>{attempts++;if(attempts===1)throw new Error('Autoplay blocked');engine.enabled=true;engine.context.state='running';},silence:()=>quiet++};
  const detach=attachAutomaticAudio(engine,target,doc);
  await Promise.resolve();expect(attempts).toBe(1);
  target.dispatchEvent(new Event('pointerup'));await Promise.resolve();expect(engine.enabled).toBe(true);
  target.dispatchEvent(new Event('click'));expect(attempts).toBe(2);
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));expect(quiet).toBe(1);
  detach();engine.context.state='suspended';engine.enabled=false;doc.hidden=false;
  target.dispatchEvent(new Event('pointerup'));expect(attempts).toBe(2);
});


test('chapters 4, 5 and 7 play selected excerpts at original speed without extra synthesis',async()=>{
  const original=globalThis.AudioContext;globalThis.AudioContext=AudioStub;
  try{
    const engine=new Chimes();await engine.enable();
    engine.context.createOscillator=()=>{throw new Error('No synthesized replacement chimes');};
    for(const id of ['landscape','rain','journey']){
      const profile=chimeProfiles[id];
      for(const sample of profile.samples){
        const file=Bun.file(new URL('../public'+sample,import.meta.url));
        expect(await file.exists()).toBe(true);
        const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
        expect(new TextDecoder().decode(header.slice(0,4))).toBe('RIFF');
        engine.buffers.set(sample,{duration:4,sample});
      }
      for(let strand=0;strand<profile.samples.length;strand++){
        engine.context.currentTime+=2;
        expect(engine.strike(id,strand,500)).toBe(true);
        const source=engine.context.sources.at(-1);
        expect(source.playbackRate.value).toBe(1);
        expect(source.buffer.sample).toBe(profile.samples[strand]);
        source.onended();
      }
    }
    engine.dispose();
  }finally{globalThis.AudioContext=original;}
});


test('chapters 7, 4 and 5 use the exact three user-selected sources',()=>{
  expect(chimeProfiles.journey.sourceUrl).toBe('https://freesound.org/people/newlocknew/sounds/772279/');
  expect(chimeProfiles.landscape.sourceUrl).toBe('https://freesound.org/people/nlux/sounds/620968/');
  expect(chimeProfiles.rain.sourceUrl).toBe('https://freesound.org/people/smand/sounds/525052/');
});
