import { excavatorPose, truckRig } from './site-motion';

type Point = { x: number; y: number };
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t); };
const ramp = (p: number, a: number, b: number) => smooth((p - a) / (b - a));
function keys(p: number, stops: [number, number][]) {
  for (let i = 1; i < stops.length; i++) if (p <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], ramp(p, stops[i - 1][0], stops[i][0]));
  return stops[stops.length - 1][1];
}
export function rotatePoint(point: Point, angle: number): Point {
  const a = angle * Math.PI / 180;
  return { x: point.x * Math.cos(a) - point.y * Math.sin(a), y: point.x * Math.sin(a) + point.y * Math.cos(a) };
}
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

export const workflowPhases = {
  attach: .04, lifted: .10, excavator: .22, loaded: .46, touchdown: .58,
  detach: .61, haul: .64, tip: .74, discharge: .78, emptied: .85,
  lowered: .90, roller: .94, finished: .995,
} as const;
export const workflowGeometry = {
  cargoX: 930, loadingY: 880, truckY: 1300, truckDockX: 896,
  truckDumpX: 1700, groundY: 1520, fillLeft: 1480, fillWidth: 280,
  craneTip: { x: 1034, y: 192 },
} as const;

function vehiclePose(p: number) {
  const x = keys(p, [[0, 350], [.48, 350], [.55, 896], [.64, 896], [.74, 1700], [.90, 1700], [.95, 2550], [1, 2550]]);
  const tilt = keys(p, [[0, 0], [.74, 0], [.78, -46], [.86, -46], [.90, 0], [1, 0]]);
  return { x, y: workflowGeometry.truckY, tilt,
    wheel: (x - 350) / truckRig.wheelRadius * 180 / Math.PI,
    gate: keys(p, [[0, 0], [.755, 0], [.785, 76], [.86, 76], [.895, 0], [1, 0]]) };
}

// The same world-space transform is used on both sides of each ownership change.
function containerPose(p: number) {
  const truck = vehiclePose(p);
  const attachment = p < .04 ? 'pickup-platform' : p < .58 ? 'crane' : p >= .74 && p < .90 ? 'tipping-platform' : 'truck';
  const onTruck = p >= .58;
  return {
    x: onTruck ? truck.x + truckRig.hingeX : workflowGeometry.cargoX,
    y: onTruck ? truck.y + truckRig.hingeY : keys(p, [[0, 540], [.04, 540], [.10, 500], [.22, 880], [.46, 880], [.58, 1450], [1, 1450]]),
    angle: onTruck ? truck.tilt : 0,
    attachment,
  };
}

function loadingExcavator(local: number) {
  const original = excavatorPose(local);
  // Dig to the left of the suspended box. After dumping, clear its rim before
  // returning to the cut, rather than dragging an empty bucket through the box.
  const tooth = local > .86 ? {
    x: keys(local, [[.86, 1052], [.92, 820], [1, 786]]),
    y: keys(local, [[.86, 814], [.92, 720], [1, 870]]),
  } : { x: original.tooth.x - keys(local, [[0, 170], [.38, 170], [.52, 40], [.64, 0], [1, 0]]), y: original.tooth.y };
  const offset = rotatePoint({ x: -61, y: 118 }, original.bucketAngle);
  const tip = { x: tooth.x - offset.x, y: tooth.y - offset.y };
  const dx = tip.x - 482, dy = tip.y - 788, a = Math.hypot(270, 220), b = Math.hypot(60, 240);
  const bend = Math.acos(Math.max(-1, Math.min(1, (dx * dx + dy * dy - a * a - b * b) / (2 * a * b))));
  const shoulder = Math.atan2(dy, dx) - Math.atan2(b * Math.sin(bend), a + b * Math.cos(bend));
  const boom = (shoulder - Math.atan2(-220, 270)) * 180 / Math.PI;
  const stick = (shoulder + bend - Math.atan2(240, 60)) * 180 / Math.PI - boom;
  return { ...original, tooth, tip, boom, stick, bucket: original.bucketAngle - boom - stick,
    elbow: { x: 482 + a * Math.cos(shoulder), y: 788 + a * Math.sin(shoulder) } };
}

export function workflowPose(progress: number) {
  const p = clamp01(progress), cargo = containerPose(p), truck = vehiclePose(p);
  const phase = p < .10 ? 'pickup' : p < .22 ? 'lower-to-excavator' : p < .46 ? 'excavate-and-fill'
    : p < .58 ? 'lower-to-truck' : p < .64 ? 'handoff' : p < .74 ? 'haul'
      : p < .90 ? 'unload' : p < .94 ? 'clear-placement-area' : p < .995 ? 'compact' : 'complete';

  let extracted = 0, bucketMass = 0, boxAir = 0, received = 0;
  const scoops = [.22, .34].map(start => {
    const local = clamp01((p - start) / .12);
    const taken = .5 * ramp(local, .25, .38);
    const released = .5 * ramp(local, .765, .83);
    const arrived = .5 * ramp(local, .81, .915);
    extracted += taken; bucketMass += taken - released;
    boxAir += released - arrived; received += arrived;
    return local;
  });
  const excavatorProgress = p < .22 || p >= .46 ? 0 : scoops[p < .34 ? 0 : 1];
  const excavator = loadingExcavator(excavatorProgress);
  const releasedGround = ramp(p, .78, .85), arrivedGround = ramp(p, .792, .865);
  const rollerX = keys(p, [[0, 500], [.90, 500], [.94, 1050], [.995, 1540], [1, 1540]]);
  const compacted = p < .94 ? 0 : clamp01((rollerX + 333 - workflowGeometry.fillLeft) / workflowGeometry.fillWidth);
  const materials = {
    source: 1 - extracted, bucket: bucketMass, fallingIntoBox: boxAir,
    box: received - releasedGround, fallingOntoGround: releasedGround - arrivedGround,
    looseGround: arrivedGround * (1 - compacted), compactedGround: arrivedGround * compacted,
  };

  const hookSlack = p < .04 ? 18 * (1 - ramp(p, 0, .04)) : p >= .58 ? 20 * ramp(p, .58, .605) : 0;
  const retract = ramp(p, .61, .64);
  const hook = { x: 1034, y: (p < .58 ? cargo.y : 1450) - 200 + hookSlack - retract * 250 };
  const slingTop = { x: hook.x, y: hook.y + 78 };
  const eyes = [{ x: 930, y: (p < .58 ? cargo.y : 1450) - 50 }, { x: 1138, y: (p < .58 ? cargo.y : 1450) - 70 }];
  const ends = eyes.map((eye, i) => ({ x: mix(eye.x, hook.x + (i ? 18 : -18), retract), y: mix(eye.y, slingTop.y + 80, retract) }));
  const slingPath = ends.map(end => `M ${slingTop.x} ${slingTop.y} Q ${(slingTop.x + end.x) / 2} ${(slingTop.y + end.y) / 2 + hookSlack} ${end.x} ${end.y}`).join(' ');

  const excavatorParticles = [.775, .795, .815].map(release => {
    const t = clamp01((excavatorProgress - release) / .10);
    const origin = excavatorPose(release).tooth;
    const landing = workflowGeometry.loadingY - 48 - materials.box * 20;
    return { x: origin.x - 10 + t * 6, y: mix(origin.y - 8, landing, t * t),
      opacity: excavatorProgress >= release && t < 1 ? Math.min(1, t * 12) * (1 - ramp(t, .85, 1)) : 0 };
  });
  const dumpParticles = [.785, .797, .809, .821, .833, .845].map(release => {
    const t = clamp01((p - release) / .018);
    const atRelease = containerPose(release);
    const origin = add(atRelease, rotatePoint({ x: -8, y: -12 }, atRelease.angle + truckRig.bedRestAngle));
    return { x: origin.x - 110 * t, y: mix(origin.y, workflowGeometry.groundY - 20, t * t),
      opacity: p >= release && t < 1 ? Math.min(1, t * 12) * (1 - ramp(t, .85, 1)) : 0 };
  });
  const ramTop = add({ x: truckRig.hingeX, y: truckRig.hingeY }, rotatePoint({ x: 156, y: 16 }, truck.tilt + truckRig.bedRestAngle));
  return { progress: p, phase, cargo, truck: { ...truck, ramTop }, materials,
    crane: { hook, slingTop, eyes, ends, slingPath, attached: p < .61 }, excavator, excavatorParticles, dumpParticles,
    ground: { deposited: arrivedGround, compacted },
    roller: { x: rollerX, y: 1300, wheel: (rollerX - 500) / 64 * 180 / Math.PI, opacity: ramp(p, .88, .90) },
  };
}

// One camera follows the shared object and operation; no section-sized blank bands.
export function workflowCamera(progress: number, width: number, height: number) {
  const p = clamp01(progress), truck = vehiclePose(p), mobile = width < 761;
  const x = p >= .64 && p <= .74 ? truck.x + 200 : keys(p, [[0, 1390], [.10, 1370], [.22, 735], [.46, 735], [.58, 1096], [.64, 1096], [.74, 1900], [.90, 1700], [.94, 1640], [1, 1640]]);
  const y = keys(p, [[0, 590], [.10, 570], [.22, 720], [.46, 720], [.58, 1340], [.74, 1360], [.90, 1390], [1, 1390]]);
  const viewWidth = keys(p, [[0, mobile ? 1050 : 1400], [.22, mobile ? 900 : 1300], [.46, mobile ? 900 : 1300], [.58, mobile ? 660 : 1200], [.74, mobile ? 700 : 1200], [.94, mobile ? 820 : 1250], [1, mobile ? 820 : 1250]]);
  const viewHeight = keys(p, [[0, 1000], [.22, 780], [.58, 750], [1, 750]]);
  const scale = Math.min(width / viewWidth, height / viewHeight);
  return { scale, x: width * (mobile ? .5 : .60) - x * scale, y: height * .60 - y * scale };
}
