// Keep voices 1, 2, 3 and 6. Chapters 7, 4 and 5 use the three recordings selected by the user.
export const chimeProfiles = {
  silence: { name: 'Brass wind chimes', base: 293.665, decay: 2.7, partials: [[1,1],[2.01,.32],[2.76,.16],[4.05,.06]] },
  whisper: { name: 'Recorded bamboo wind chimes', sample: '/audio/bamboo.wav', base: 293.665, interval: .18, level: .32 },
  sky: { name: 'Deep temple bells', base: 146.8325, decay: 4.2, partials: [[1,1],[1.505,.27],[2.01,.3],[2.76,.12],[4.07,.04]] },
  landscape: { name: 'Small glass windchime — nlux', sample: '/audio/nlux-620968-1.wav', samples: ['/audio/nlux-620968-1.wav','/audio/nlux-620968-2.wav','/audio/nlux-620968-3.wav'], sourceUrl: 'https://freesound.org/people/nlux/sounds/620968/', naturalPitch: true, base: 293.665, interval: 0.65, maxVoices: 3, level: 0.28 },
  rain: { name: 'Small wind chime — smand', sample: '/audio/smand-525052-1.wav', samples: ['/audio/smand-525052-1.wav','/audio/smand-525052-2.wav','/audio/smand-525052-3.wav'], sourceUrl: 'https://freesound.org/people/smand/sounds/525052/', naturalPitch: true, base: 587.33, interval: 0.45, maxVoices: 4, level: 0.3 },
  memory: { name: 'Recorded suzu bells', sample: '/audio/suzu.wav', base: 146.8325, interval: .35, level: .23 },
  journey: { name: 'Crystal chime texture — newlocknew', sample: '/audio/newlocknew-772279-1.wav', samples: ['/audio/newlocknew-772279-1.wav','/audio/newlocknew-772279-2.wav','/audio/newlocknew-772279-3.wav'], sourceUrl: 'https://freesound.org/people/newlocknew/sounds/772279/', naturalPitch: true, base: 293.665, interval: 0.85, maxVoices: 3, level: 0.32 },
};
const scale = [0,2,4,7,9];
export function noteForStrand(sceneId, strand) {
  const profile = chimeProfiles[sceneId] || chimeProfiles.silence;
  const degree = strand % (profile.noteCount ?? 10);
  return {profile, frequency: profile.base * 2 ** ((scale[degree % 5] + 12 * Math.floor(degree / 5)) / 12)};
}

// Sample the actual moving ropes along the pointer's swept path. A crossing
// still rings when a fast pointer skips over a strand between input events.
export function brushedStrands(ropes, from, to) {
  const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy;
  if(length2<.25 || length2>360000)return [];
  return ropes.map(rope=>{
    let distance=Infinity,along=0;
    for(let j=2;j<rope.nodes.length;j++){
      const p=rope.nodes[j];
      const t=Math.max(0,Math.min(1,((p.x-from.x)*dx+(p.y-from.y)*dy)/length2));
      const d=Math.hypot(p.x-from.x-t*dx,p.y-from.y-t*dy);
      if(d<distance){distance=d;along=t;}
    }
    return {strand:rope.seed,distance,along};
  }).filter(hit=>hit.distance<19).sort((a,b)=>a.along-b.along);
}

export class Chimes {
  constructor(){this.context=null;this.enabled=false;this.voices=new Set();this.lastNotes=new Map();this.lastStrike=-Infinity;this.buffers=new Map();this.loading=null;this.disposed=false;}
  async enable(){
    if(this.disposed)return;
    const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;
    if(!Audio)throw new Error('Audio is unavailable in this browser.');
    if(!this.context){
      this.context=new Audio({latencyHint:'interactive'});
      this.master=this.context.createGain();this.master.gain.value=0;
      const compressor=this.context.createDynamicsCompressor();
      compressor.threshold.value=-20;compressor.knee.value=18;compressor.ratio.value=4;
      compressor.attack.value=.008;compressor.release.value=.3;
      this.master.connect(compressor);compressor.connect(this.context.destination);
    }
    void this.loadSamples();
    await this.context.resume();
    if(this.disposed)return;
    if(this.context.state!=='running')throw new Error('Audio is waiting for a browser interaction.');
    this.enabled=true;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(.48,this.context.currentTime,.025);
  }
  loadSamples(){
    if(this.loading)return this.loading;
    const context=this.context;
    this.loading=Promise.allSettled([...new Set(Object.values(chimeProfiles).flatMap(p=>p.samples??(p.sample?[p.sample]:[])))].map(async sample=>{
      if(this.buffers.has(sample))return;
      const response=await fetch(sample);
      if(!response.ok)throw new Error(`Missing audio: ${sample}`);
      const buffer=await context.decodeAudioData(await response.arrayBuffer());
      if(!this.disposed)this.buffers.set(sample,buffer);
    }));
    return this.loading;
  }
  recordedStrike(profile,strand,strength,pan,now){
    const sample=profile.samples?.[strand%profile.samples.length]??profile.sample;
    const buffer=this.buffers.get(sample);
    if(!buffer)return false;
    const source=this.context.createBufferSource(),gain=this.context.createGain(),panner=this.context.createStereoPanner();
    source.buffer=buffer;
    // Natural-pitch palettes select separate recorded notes, never retune them.
    const rate=profile.naturalPitch ? 1 : 2**((scale[strand%5]-4)/12);
    source.playbackRate.value=rate;
    const duration=buffer.duration/rate;
    panner.pan.value=Math.max(-.75,Math.min(.75,pan));
    gain.gain.setValueAtTime(profile.level*(.55+.45*strength),now);
    gain.gain.setTargetAtTime(.00001,now+Math.max(.05,duration-.18),.04);
    source.connect(gain);gain.connect(panner);panner.connect(this.master);
    const voice={gain,oscillators:[source]};this.voices.add(voice);
    source.onended=()=>{source.disconnect();gain.disconnect();panner.disconnect();this.voices.delete(voice);};
    source.start(now);source.stop(now+duration);
    return true;
  }
  disable(){
    this.enabled=false;
    if(this.context){
      const now=this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);this.master.gain.setTargetAtTime(0,now,.015);
      this.silence();
    }
  }
  silence(){
    if(!this.context)return;
    const now=this.context.currentTime;
    for(const voice of this.voices){
      voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.02);
      for(const osc of voice.oscillators)osc.stop(now+.12);
    }
    this.lastNotes.clear();this.lastStrike=-Infinity;
  }
  strike(sceneId,strand,speed,pan=0){
    if(!this.enabled || this.context?.state!=='running' || speed<25)return false;
    const now=this.context.currentTime,key=`${sceneId}:${strand}`;
    const {profile,frequency}=noteForStrand(sceneId,strand);
    if(now-(this.lastNotes.get(key)??-Infinity)<(profile.sample ? .85 : .65) || now-this.lastStrike<(profile.interval??.085) || this.voices.size>=(profile.maxVoices??(profile.sample?8:14)))return false;
    const strength=Math.max(.18,Math.min(1,speed/1700));
    if(profile.sample){
      if(!this.recordedStrike(profile,strand,strength,pan,now))return false;
      this.lastNotes.set(key,now);this.lastStrike=now;return true;
    }
    const gain=this.context.createGain(),panner=this.context.createStereoPanner();
    panner.pan.value=Math.max(-.75,Math.min(.75,pan));gain.connect(panner);panner.connect(this.master);
    gain.gain.setValueAtTime(1,now);
    const voice={gain,oscillators:[]};this.voices.add(voice);
    let remaining=profile.partials.length;
    const total=profile.partials.reduce((sum,p)=>sum+p[1],0);
    for(let i=0;i<profile.partials.length;i++){
      const [ratio,weight]=profile.partials[i],osc=this.context.createOscillator(),envelope=this.context.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(frequency*ratio,now);
      const decay=profile.decay/(1+i*.55),amplitude=.23*(profile.level??1)*(.4+.6*strength)*weight/total*(i===0?1:.45+.55*strength);
      envelope.gain.setValueAtTime(0,now);
      envelope.gain.linearRampToValueAtTime(amplitude,now+(profile.attack??.008));
      envelope.gain.exponentialRampToValueAtTime(.00001,now+decay);
      osc.connect(envelope);envelope.connect(gain);osc.start(now);osc.stop(now+decay+.05);
      voice.oscillators.push(osc);
      osc.onended=()=>{osc.disconnect();envelope.disconnect();if(--remaining===0){gain.disconnect();panner.disconnect();this.voices.delete(voice);}};
    }
    this.lastNotes.set(key,now);this.lastStrike=now;return true;
  }
  dispose(){this.disposed=true;this.disable();void this.context?.close();this.context=null;}
}

// Try immediately where autoplay is permitted; a normal click/touch/key unlocks
// audio in browsers that require user activation. No sound control is needed.
export function attachAutomaticAudio(engine,target,doc){
  let disposed=false;
  const unlock=()=>{
    if(disposed||doc.hidden||engine.context?.state==='running'&&engine.enabled)return;
    void engine.enable().catch(()=>{});
  };
  const events=['pointerdown','pointerup','touchend','keydown','click'];
  for(const event of events)target.addEventListener(event,unlock,{passive:true});
  const visibility=()=>{if(doc.hidden)engine.silence();else unlock();};
  doc.addEventListener('visibilitychange',visibility);
  unlock();
  return()=>{disposed=true;for(const event of events)target.removeEventListener(event,unlock);doc.removeEventListener('visibilitychange',visibility);};
}
