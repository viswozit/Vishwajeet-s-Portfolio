'use client';

import { useEffect, useRef } from 'react';
import { excavatorBucket, truckRig } from '@/lib/site-motion';
import { clamp01, craneStructure, groundStripCount, workflowCamera, workflowGeometry, workflowPose, workflowTime } from '@/lib/construction-workflow';
import './construction-site.css';

type Crop = [number, number, number, number];
// Crop bounds are the isolated components of each generated technical atlas.
const crops: Record<string, Crop> = {
  tower: [130, 10, 200, 575], jib: [480, 238, 668, 99], hook: [1250, 62, 198, 465],
  cargo: [12, 725, 477, 230], frame: [520, 570, 550, 380], materials: [1090, 645, 434, 347],
  excavator: [12, 124, 549, 380], boom: [609, 52, 481, 458], stick: [1158, 62, 351, 426],
  bucket: [10, 546, 358, 383], earth: [390, 680, 516, 254], truck: [883, 586, 641, 307],
  roller: [23, 125, 715, 348], tire: [763, 163, 353, 353], drum: [1170, 168, 344, 344],
  rough: [16, 700, 495, 180], flat: [538, 700, 482, 180], trench: [1035, 681, 484, 198],
  groundline: [538, 768, 482, 90],
  truckChassis: [28, 8, 1164, 492], truckBed: [40, 592, 919, 362],
  truckWheel: [1204, 170, 308, 308], truckGate: [1340, 620, 120, 332],
};

function Part({ atlas, part, x = 0, y = 0, w, h, className = '' }: { atlas: string; part: string; x?: number; y?: number; w: number; h: number; className?: string }) {
  const [cx, cy, cw, ch] = crops[part];
  return <span className={`site-part ${className}`} data-part={part} style={{ left: x, top: y, width: w, height: h }}><span className="site-sprite" style={{ backgroundImage: `url('/site-${atlas}.webp')`, width: `${1536 / cw * 100}%`, height: `${1024 / ch * 100}%`, left: `${-cx / cw * 100}%`, top: `${-cy / ch * 100}%` }} /></span>;
}

// Doodle restyle of the client's building; original reference remains in public/site-building.png.
function Building({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <img src="/site-building-doodle.webp" alt="" width={1774} height={887} draggable={false} className="site-part completed-building truck-ink" style={{ left: x, top: y, width: w, height: h }} />;
}

type SceneElement = HTMLElement | SVGElement;

export default function ConstructionSite() {
  const nodes = useRef<Record<string, SceneElement | null>>({});
  const bind = (name: string) => (element: SceneElement | null) => { nodes.current[name] = element; };

  useEffect(() => {
    const n = nodes.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const readProgress = () => clamp01(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
    let target = readProgress(), progress = reduced.matches ? 1 : target;
    let raf = 0, previous = 0, disposed = false;
    const transform = (name: string, value: string) => { n[name]!.style.transform = value; };
    const opacity = (name: string, value: number) => { n[name]!.style.opacity = String(value); };
    const render = () => {
      const time = workflowTime(progress);
      const state = workflowPose(time), camera = workflowCamera(time, window.innerWidth, window.innerHeight);
      n.root!.dataset.phase = state.phase;
      transform('world', `translate3d(${camera.x}px,${camera.y}px,0) scale(${camera.scale})`);
      const { cargo, crane, excavator: e, truck: t, materials: m, ground, roller } = state;
      n.cargo!.dataset.attachment = cargo.attachment;
      transform('cargo', `translate(${cargo.x}px,${cargo.y}px) rotate(${cargo.angle}deg)`);
      transform('cargo-load', `translateX(${-30 * (1 - m.box)}px) scaleY(${m.box})`);
      opacity('cargo-load', Math.min(1, m.box * 6));
      transform('gate', `translate(-8px,-50px) rotate(${t.gate}deg)`);
      transform('hook', `translate(${crane.hook.x - 16}px,${crane.hook.y}px)`);
      ['cable-a', 'cable-b'].forEach((name, index) => {
        const offset = index ? 5 : -5;
        n[name]!.setAttribute('x1', String(workflowGeometry.craneTip.x + offset));
        n[name]!.setAttribute('y1', String(workflowGeometry.craneTip.y));
        n[name]!.setAttribute('x2', String(crane.hook.x + offset));
        n[name]!.setAttribute('y2', String(crane.hook.y + 7));
      });
      n.slings!.setAttribute('d', crane.slingPath);
      transform('boom', `translate(482px,788px) rotate(${e.boom}deg)`);
      transform('stick', `translate(270px,-220px) rotate(${e.stick}deg)`);
      transform('bucket', `translate(60px,240px) rotate(${e.bucket}deg)`);
      opacity('scoop', Math.min(1, m.bucket * 2));
      transform('source', `scaleY(${m.source})`);
      opacity('source', Math.min(1, m.source * 5));
      opacity('trench', .25 + .75 * (1 - m.source));
      [state.excavatorParticles, state.dumpParticles].forEach((particles, group) => particles.forEach((particle, index) => {
        const id = `${group ? 'dump' : 'scoop-fall'}-${index}`;
        transform(id, `translate(${particle.x}px,${particle.y}px)`);
        opacity(id, particle.opacity * .45);
      }));
      transform('truck', `translate(${t.x}px,${t.y}px)`);
      truckRig.wheelXs.forEach((_, i) => transform(`truck-wheel-${i}`, `rotate(${t.wheel}deg)`));
      const dx = t.ramTop.x - truckRig.ramBase.x, dy = t.ramTop.y - truckRig.ramBase.y, length = Math.hypot(dx, dy);
      [length, Math.min(length, 85), Math.min(length, 43)].forEach((visible, i) => {
        n[`ram-${i}`]!.setAttribute('x2', String(truckRig.ramBase.x + dx / length * visible));
        n[`ram-${i}`]!.setAttribute('y2', String(truckRig.ramBase.y + dy / length * visible));
      });
      transform('platform', `translate(${truckRig.hingeX}px,${truckRig.hingeY}px) rotate(${t.tilt}deg)`);
      opacity('locks', cargo.attachment === 'truck' || cargo.attachment === 'tipping-platform' ? 1 : 0);
      transform('pile-height', `scaleY(${ground.deposited})`);
      opacity('pile-height', Math.min(1, ground.deposited * 6));
      ground.settlement.forEach((settled, i) => {
        transform(`soil-${i}`, `scaleY(${1 - settled * .82})`);
        opacity(`soil-${i}`, 1 - settled);
        opacity(`compacted-${i}`, settled);
      });
      opacity('flat-fill', ground.deposited);
      transform('roller', `translate(${roller.x}px,${roller.y}px)`);
      opacity('roller', roller.opacity * .48);
      transform('roller-tire', `rotate(${roller.wheel}deg)`);
      transform('roller-drum', `rotate(${roller.wheel}deg)`);
    };
    const tick = (now: number) => {
      raf = 0;
      if (document.hidden || disposed) return;
      const dt = Math.min(40, previous ? now - previous : 16);
      previous = now;
      progress = reduced.matches ? 1 : progress + (target - progress) * (1 - Math.exp(-dt / 150));
      if (Math.abs(target - progress) < .00001 && !reduced.matches) progress = target;
      render();
      if (!reduced.matches && progress !== target) raf = requestAnimationFrame(tick);
      else previous = 0;
    };
    const request = () => { if (!raf && !document.hidden && !disposed) raf = requestAnimationFrame(tick); };
    const scroll = () => { target = readProgress(); if (!reduced.matches) request(); };
    const resize = () => { target = readProgress(); request(); };
    const preferences = () => { target = readProgress(); progress = reduced.matches ? 1 : target; request(); };
    const visibility = () => {
      cancelAnimationFrame(raf); raf = 0; previous = 0;
      if (!document.hidden) { target = readProgress(); progress = reduced.matches ? 1 : target; request(); }
    };
    render();
    const atlases = ['crane', 'crane-structure', 'excavator', 'roller', 'truck'];
    let loaded = 0;
    const images = atlases.map(name => {
      const image = new Image();
      image.onload = image.onerror = () => {
        if (disposed || ++loaded !== atlases.length) return;
        n.root!.dataset.ready = 'true'; request();
      };
      image.src = `/site-${name}.webp`;
      return image;
    });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(document.body);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', preferences);
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer?.disconnect();
      images.forEach(image => { image.onload = image.onerror = null; });
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', preferences);
    };
  }, []);

  return <div className="construction-site" ref={bind('root')} aria-hidden="true">
    <svg width="0" height="0" className="site-rig-defs"><defs><filter id="truck-ink" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .20  0 0 0 0 .22  0 0 0 0 .20  -.223 -.751 -.076 1.02 0" /></filter></defs></svg>
    <div className="workflow-world" ref={bind('world')}>
      <div className="site-structure">
        <Part atlas="crane" part="frame" x={900} y={525} w={270} h={185} />
        <Part atlas="roller" part="groundline" x={0} y={880} w={1900} h={40} />
        <Part atlas="roller" part="groundline" x={0} y={1500} w={3000} h={40} />
        <Part atlas="crane" part="materials" x={2290} y={1420} w={170} h={100} />
      </div>
      <Building x={1727} y={1200} w={900} h={300} />
      <div className="site-crane">
        <img src="/site-crane-structure.webp" alt="" width={1254} height={1254} draggable={false} className="site-part truck-ink" style={{ left: craneStructure.x, top: craneStructure.y, width: craneStructure.width, height: craneStructure.height }} />
      </div>
      <div className="site-excavation">
        <div ref={bind('trench')} className="site-joint"><Part atlas="roller" part="trench" x={590} y={865} w={230} h={78} /></div>
        <div ref={bind('source')} className="workflow-source"><Part atlas="excavator" part="earth" w={230} h={80} /></div>
        <Part atlas="excavator" part="excavator" x={118} y={648} w={377} h={261} />
        <div ref={bind('boom')} className="site-joint"><div className="site-joint" style={{ transform: 'rotate(1.78deg)' }}><Part atlas="excavator" part="boom" x={-14.4} y={-258.2} w={288.2} h={274.4} /></div>
          <div ref={bind('stick')} className="site-joint"><div className="site-joint" style={{ transform: 'rotate(25.08deg)' }}><Part atlas="excavator" part="stick" x={-11.6} y={-13.6} w={177.1} h={215} /></div>
            <div ref={bind('bucket')} className="site-joint">
              <div className="site-bucket-mount" style={{ position: 'absolute', left: -excavatorBucket.pivotX, top: -excavatorBucket.pivotY, width: 125, height: 134, transformOrigin: `${excavatorBucket.pivotX}px ${excavatorBucket.pivotY}px`, transform: 'scaleX(-1)' }}><Part atlas="excavator" part="bucket" w={125} h={134} /></div>
              <div ref={bind('scoop')} className="site-joint"><Part atlas="excavator" part="earth" x={-20} y={63} w={50} h={28} /></div>
            </div>
          </div>
        </div>
      </div>
      <div className="workflow-placement">
        <div className="workflow-fill"><div ref={bind('pile-height')} className="workflow-pile">
          {Array.from({ length: groundStripCount }, (_, i) => <div key={i} ref={bind(`soil-${i}`)} className="ground-strip" style={{ left: i * 280 / groundStripCount - 1, width: 280 / groundStripCount + 2 }}><Part atlas="excavator" part="earth" x={1 - i * 280 / groundStripCount} w={280} h={70} /></div>)}
        </div></div>
        <div ref={bind('flat-fill')} className="workflow-flat">
          {Array.from({ length: groundStripCount }, (_, i) => <div key={i} ref={bind(`compacted-${i}`)} className="ground-strip" style={{ left: i * 280 / groundStripCount - 1, width: 280 / groundStripCount + 2 }}><Part atlas="roller" part="flat" x={1 - i * 280 / groundStripCount} w={280} h={40} /></div>)}
        </div>
      </div>
      <div ref={bind('truck')} className="site-joint site-truck truck-body">
        <Part atlas="truck" part="truckChassis" y={29} w={400} h={169.1} className="truck-ink" />
        <svg className="truck-hydraulics" viewBox="0 0 400 220">{[3, 6, 10].map((width, i) => <line key={width} ref={bind(`ram-${i}`)} x1={truckRig.ramBase.x} y1={truckRig.ramBase.y} strokeWidth={width} />)}</svg>
        <svg ref={bind('platform')} className="workflow-platform" viewBox="-20 -10 260 30"><path d="M 0 3 H 216 M 12 3 V 12 M 202 3 V 12" /><g ref={bind('locks')}><circle cx="12" cy="3" r="4" /><circle cx="202" cy="3" r="4" /></g></svg>
        {truckRig.wheelXs.map((x, i) => <div key={x} ref={bind(`truck-wheel-${i}`)} className="truck-wheel" style={{ left: x - 40, top: 140, width: 80, height: 80 }}><Part atlas="truck" part="truckWheel" w={80} h={80} className="truck-ink" /></div>)}
      </div>
      <div ref={bind('roller')} className="site-joint site-grading">
        <Part atlas="roller" part="roller" w={360} h={176} />
        <div ref={bind('roller-tire')} className="roller-tire"><Part atlas="roller" part="tire" w={128} h={128} /></div>
        <div ref={bind('roller-drum')} className="roller-drum"><Part atlas="roller" part="drum" w={128} h={128} /></div>
      </div>
      <svg className="workflow-cables" viewBox="0 0 3000 1800"><line ref={bind('cable-a')} /><line ref={bind('cable-b')} /><path ref={bind('slings')} /></svg>
      <div ref={bind('hook')} className="site-joint site-crane"><Part atlas="crane" part="hook" w={32} h={78} /></div>
      {[0, 1, 2].map(i => <div key={`scoop-${i}`} ref={bind(`scoop-fall-${i}`)} className="site-joint workflow-particle"><Part atlas="excavator" part="earth" w={24} h={18} /></div>)}
      {[0, 1, 2, 3, 4, 5].map(i => <div key={`dump-${i}`} ref={bind(`dump-${i}`)} className="site-joint workflow-particle"><Part atlas="excavator" part="earth" w={28} h={20} /></div>)}
      <div ref={bind('cargo')} data-cargo-box="shared" className="site-joint workflow-cargo">
        <div className="site-joint" style={{ transform: `rotate(${truckRig.bedRestAngle}deg)` }}>
          <div className="workflow-cargo-fill"><div ref={bind('cargo-load')} className="workflow-cargo-load"><Part atlas="excavator" part="earth" w={212} h={48} /></div></div>
          <Part atlas="truck" part="truckBed" x={-15.1} y={-74.6} w={252} h={99.3} className="truck-ink" />
          <div ref={bind('gate')} className="site-joint"><Part atlas="truck" part="truckGate" x={-3.43} y={-3.97} w={21.7} h={60} className="truck-ink" /></div>
        </div>
      </div>
    </div>
  </div>;
}
