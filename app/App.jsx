import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { scenes } from './scenes';
import Calligraphy from './Calligraphy';
import './globals.css';

export default function App() {
  const [active,setActive]=useState(0);
  const [paused,setPaused]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [panel,setPanel]=useState(null);
  const root=useRef(null);
  const reduced=useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function go(i) {
    const index=Math.max(0,Math.min(scenes.length-1,i));
    root.current.children[index]?.scrollIntoView({behavior:reduced.current?'instant':'smooth',block:'start'});
  }
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)setActive(Number(e.target.dataset.index));}),{root:root.current,threshold:.6});
    [...root.current.children].forEach(e=>observer.observe(e));
    const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>{reduced.current=mq.matches;setPaused(mq.matches);};mq.addEventListener('change',change);
    return()=>{observer.disconnect();mq.removeEventListener('change',change);};
  },[]);
  useEffect(()=>{
    const onKey=e=>{
      if(panel||/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)||e.target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;
      if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();go(active+1);}
      if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();go(active-1);}
      if(e.key==='Home'){e.preventDefault();go(0);}
      if(e.key==='End'){e.preventDefault();go(scenes.length-1);}
    };window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[active,panel]);
  function choose(i){setPanel(null);go(i);}
  return <>
    <a className="skip-link" href="#chapters">Skip to chapters</a>
    <header className="site-header">
      <button className="brand" onClick={()=>go(0)} aria-label="Quiet Eaves — first chapter"><svg viewBox="0 0 54 48" aria-hidden="true"><path d="M3 23 26 3 49 23M8 21v22h17V23m18-2v22"/><rect x="47" y="36" width="5" height="8"/></svg><span>QUIET EAVES</span></button>
      <nav aria-label="Main navigation"><button onClick={()=>go(0)}>HOME</button><button className="selected" onClick={()=>setPanel('chapters')}>CHAPTERS</button><button onClick={()=>setPanel('about')}>ABOUT</button></nav>
      <button className="menu-toggle" onClick={()=>setPanel('chapters')} aria-label="Open chapter menu">MENU<span className="menu-lines" aria-hidden="true"/></button>
    </header>
    <main id="chapters" ref={root} className="chapters" tabIndex={-1} aria-label="Roof chapters">
      {scenes.map((scene,index)=><section key={scene.id} className={`chapter ${scene.align} ${active===index?'is-active':''}`} data-index={index} aria-labelledby={`title-${scene.id}`}>
        <div className="stage">
          <img className="scene-art" src={`/scenes/${scene.id}.png`} alt="" fetchPriority={index===0?'high':'auto'} draggable="false"/>
          <Calligraphy scene={scene} active={active===index&&!panel} paused={paused}/>
          <div className="story"><span className="red-rule"/><h1 id={`title-${scene.id}`}>{scene.title.map((line,i)=><React.Fragment key={line}>{line}{i<scene.title.length-1&&<><br/><span className="mobile-space"> </span></>}</React.Fragment>)}</h1><p>{scene.description.map(line=><span key={line}>{line}</span>)}</p><div className="inscription" lang="zh">{scene.inscription}<span className="seal">靜</span></div></div>
        </div>
      </section>)}
    </main>
    <nav className="chapter-index" aria-label="Choose chapter">{scenes.map((s,i)=><button key={s.id} aria-label={`${i+1}. ${s.name}`} aria-current={active===i?'step':undefined} onClick={()=>go(i)}><span>{String(i+1).padStart(2,'0')}</span><i/></button>)}</nav>
    <button className="scroll-cue" onClick={()=>go((active+1)%scenes.length)}><span className="scroll-line"/><span>{active===scenes.length-1?'BEGIN AGAIN':'SCROLL TO WANDER'}</span></button>
    <div className="wind-controls"><span className="wind-hint">{paused?'A MOMENT OF STILLNESS.':'MOVE GENTLY. LEAVE A LITTLE WIND.'}</span><button className={`stillness ${paused?'is-still':''}`} aria-label={paused?'Resume the wind':'Pause the wind'} aria-pressed={paused} onClick={()=>setPaused(!paused)} title={paused?'Resume the wind':'Pause the wind'}><span/></button></div>
    <span className="sr-only" role="status">Chapter {active+1} of {scenes.length}: {scenes[active].name}</span>
    <Dialog open={Boolean(panel)} onOpenChange={open=>{if(!open)setPanel(null);}}>
      <DialogContent className="chapter-menu" showCloseButton={false}>
        <div className="menu-heading"><span>QUIET EAVES</span><button onClick={()=>setPanel(null)} className="menu-close" aria-label="Close menu">CLOSE <span>×</span></button></div>
        <DialogTitle className="menu-title">{panel==='about'?'A study in stillness.':'Every roof, a quiet story.'}</DialogTitle>
        <DialogDescription className="menu-description">{panel==='about'?'An invitation to slow down. Three imagined places, held between architecture, poetry, and the passing wind.':'Take your time. Choose a place to begin.'}</DialogDescription>
        {panel==='chapters'?<div className="chapter-list">{scenes.map((s,i)=><button key={s.id} onClick={()=>choose(i)}><span className="chapter-number">0{i+1}</span><span>{s.name}</span><span className="chapter-arrow">↗</span></button>)}</div>:<div className="about-copy"><p>Move your cursor through the hanging words. Like ink carried on a breeze, each strand bends, drifts, and finds its way home.</p><p>Scroll to pass from one roof to the next. Use the arrow keys to wander, or the small circle below to pause the wind.</p><button onClick={()=>setPanel('chapters')}>EXPLORE THE CHAPTERS <span>↗</span></button></div>}
        <span className="menu-signature" lang="zh">山 川 異 域　風 月 同 天</span>
      </DialogContent>
    </Dialog>
  </>;
}

