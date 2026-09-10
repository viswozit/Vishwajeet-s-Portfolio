const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const cycle = (value: number) => ((value % 1) + 1) % 1;
const radians = (degrees: number) => degrees * Math.PI / 180;

function keys(phase: number, values: [number, number][]) {
  for (let i = 1; i < values.length; i++) {
    if (phase <= values[i][0]) return mix(values[i - 1][1], values[i][1], smooth((phase - values[i - 1][0]) / (values[i][0] - values[i - 1][0])));
  }
  return values[values.length - 1][1];
}

export function cranePose(progress: number) {
  const p = cycle(progress);
  const boom = keys(p, [[0, 0], [.2, 0], [.42, 0], [.64, 34], [.83, 34], [1, 0]]);
  const hookY = keys(p, [[0, 470], [.18, 760], [.24, 760], [.43, 300], [.63, 300], [.8, 402], [.84, 402], [1, 470]]);
  const tipX = 1348 - Math.cos(radians(boom)) * 760 - Math.sin(radians(boom)) * 12;
  const tipY = 363 - Math.sin(radians(boom)) * 760 + Math.cos(radians(boom)) * 12;
  const attached = p >= .2 && p < .82;
  const delivered = p >= .82;
  return { boom, tipX, tipY, hookY, attached,
    cargoX: attached ? tipX : delivered ? 1348 - Math.cos(radians(34)) * 760 - Math.sin(radians(34)) * 12 : 1348 - Math.cos(radians(0)) * 760 - Math.sin(radians(0)) * 12,
    cargoY: attached ? hookY + 110 : delivered ? 512 : 846,
    cargoOpacity: keys(p, [[0, 0], [.025, 1], [.94, 1], [1, 0]]),
  };
}

// The machine faces right, so this backhoe bucket opens toward its tracks (left).
// Coordinates use the actual pin and cutting edge of the mirrored atlas crop.
export const excavatorBucket = { pivotX: 57.6, pivotY: 11.2, toothX: -61, toothY: 118 };
const diggingPass: [number, number, number, number][] = [
  // phase, cutting-edge X/Y, bucket angle relative to the ground
  [0, 956, 870, -30], [.16, 966, 900, -30], [.22, 942, 913, -8],
  [.30, 870, 890, 20], [.38, 812, 806, 58], [.52, 758, 697, 68],
  [.64, 852, 674, 68], [.73, 894, 716, 68], [.79, 1005, 808, -32],
  [.86, 1052, 814, -48], [1, 956, 870, -30],
];
const passX = diggingPass.map(([p, x]) => [p, x] as [number, number]);
const passY = diggingPass.map(([p, , y]) => [p, y] as [number, number]);
const passCurl = diggingPass.map(([p, , , curl]) => [p, curl] as [number, number]);

export function excavatorPose(progress: number) {
  const p = cycle(progress);
  const tooth = { x: keys(p, passX), y: keys(p, passY) };
  const bucketAngle = keys(p, passCurl), curl = radians(bucketAngle);
  const tip = {
    x: tooth.x - (excavatorBucket.toothX * Math.cos(curl) - excavatorBucket.toothY * Math.sin(curl)),
    y: tooth.y - (excavatorBucket.toothX * Math.sin(curl) + excavatorBucket.toothY * Math.cos(curl)),
  };
  // Solve the two rigid arm links from the cutting-edge path. This keeps the teeth
  // in the cut as the bucket curls, then holds its load level while the boom lifts.
  const dx = tip.x - 482, dy = tip.y - 788;
  const boomLength = Math.hypot(270, 220), stickLength = Math.hypot(60, 240);
  const bend = Math.acos(clamp((dx * dx + dy * dy - boomLength ** 2 - stickLength ** 2) / (2 * boomLength * stickLength), -1, 1));
  const shoulder = Math.atan2(dy, dx) - Math.atan2(stickLength * Math.sin(bend), boomLength + stickLength * Math.cos(bend));
  const boom = (shoulder - Math.atan2(-220, 270)) * 180 / Math.PI;
  const stick = (shoulder + bend - Math.atan2(240, 60)) * 180 / Math.PI - boom;
  const bucket = bucketAngle - boom - stick;
  const elbow = { x: 482 + boomLength * Math.cos(shoulder), y: 788 + boomLength * Math.sin(shoulder) };
  const load = smooth((p - .25) / .13) * (1 - smooth((p - .765) / .065));
  const particles = [.775, .795, .815].map((release, index) => {
    const t = clamp((p - release) / .10);
    return { x: keys(release, passX) - 12 + t * (8 + index * 4),
      y: keys(release, passY) - 8 + t * t * 64,
      opacity: p >= release && t < 1 ? Math.min(1, t * 12) * (1 - smooth((t - .7) / .3)) : 0,
      scale: 1 - t * .25 };
  });
  return { boom, stick, bucket, bucketAngle, elbow, tip, tooth, load, particles,
    excavation: smooth((p - .16) / .22), spoil: smooth((p - .80) / .13),
  };
}

export const truckRig = { y: 680, wheelRadius: 40, wheelY: 180, wheelXs: [58, 144, 300], hingeX: 34, hingeY: 150, bedRestAngle: -6.5, ramBase: { x: 226, y: 156 } };

export function truckPose(progress: number) {
  const p = clamp(progress);
  const x = keys(p, [[0, -440], [.18, 520], [.36, 520], [.55, 800], [.90, 800], [1, 1900]]);
  const bed = keys(p, [[0, 0], [.55, 0], [.65, -46], [.79, -46], [.90, 0], [1, 0]]);
  const gate = keys(p, [[0, 0], [.60, 0], [.68, 76], [.79, 76], [.89, 0], [1, 0]]);
  const collected = smooth((p - .24) / .11), discharged = smooth((p - .65) / .14);
  const load = collected * (1 - discharged);
  const a = radians(bed + truckRig.bedRestAngle);
  const ramTop = { x: truckRig.hingeX + 156 * Math.cos(a) - 16 * Math.sin(a), y: truckRig.hingeY + 156 * Math.sin(a) + 16 * Math.cos(a) };
  const particles = [.66, .69, .72, .75, .78].map((release, index) => {
    const t = clamp((p - release) / .09);
    return { x: 800 + truckRig.hingeX - 15 - 55 * t - index * 2,
      y: truckRig.y + truckRig.hingeY - 10 + 64 * t * t,
      opacity: p >= release && t < 1 ? Math.min(1, t * 15) * (1 - smooth((t - .72) / .28)) : 0 };
  });
  const loading = [.205, .23, .255, .28, .305].map((release, index) => {
    const t = clamp((p - release) / .045);
    return { x: 520 + 105 + (index % 3) * 28, y: truckRig.y - 140 + 250 * t * t,
      opacity: p >= release && t < 1 ? Math.min(1, t * 10) * (1 - smooth((t - .8) / .2)) : 0 };
  });
  return { x, bed, gate, load, ramTop, particles, loading, deposited: discharged,
    // Travel determines rotation, so every wheel stops at the loading/dumping stations.
    wheel: (x + 440) / truckRig.wheelRadius * 180 / Math.PI,
  };
}

export function rollerPose(progress: number) {
  const p = cycle(progress);
  const forward = p <= .5;
  const distance = smooth(forward ? p * 2 : (1 - p) * 2) * 707;
  const x = 330 + distance;
  const frontX = x + 333;
  return { x, frontX, wheel: distance / 64 * 180 / Math.PI, drum: distance / 64 * 180 / Math.PI,
    // The ground remains compacted on the return pass.
    graded: forward ? clamp((frontX - 350) / 1020) : 1,
  };
}
