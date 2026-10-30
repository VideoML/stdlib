export type FrameContext = {
  frame: number;
  fps: number;
  timeMs: number;
};

export const frameToTimeMs = (frame: number, fps: number): number => (frame / fps) * 1000;

export const timeMsToFrame = (timeMs: number, fps: number): number =>
  Math.round((timeMs / 1000) * fps);

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (inputMin: number, inputMax: number, outputMin: number, outputMax: number, value: number): number => {
  if (inputMax === inputMin) {
    return outputMin;
  }
  const t = (value - inputMin) / (inputMax - inputMin);
  return outputMin + (outputMax - outputMin) * t;
};

export type EasingFn = (t: number) => number;

export const easeLinear: EasingFn = (t) => t;
export const easeInQuad: EasingFn = (t) => t * t;
export const easeOutQuad: EasingFn = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFn = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: EasingFn = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const interpolate = (
  value: number,
  inputRange: [number, number],
  outputRange: [number, number],
  options?: { clamp?: boolean; easing?: EasingFn },
): number => {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  if (inMax === inMin) {
    return outMin;
  }
  let t = (value - inMin) / (inMax - inMin);
  if (options?.clamp) {
    t = clamp(t, 0, 1);
  }
  const eased = options?.easing ? options.easing(t) : t;
  const mapped = outMin + (outMax - outMin) * eased;
  if (options?.clamp) {
    const [minOut, maxOut] = outputRange[0] < outputRange[1] ? outputRange : [outputRange[1], outputRange[0]];
    return clamp(mapped, minOut, maxOut);
  }
  return mapped;
};

export type SpringConfig = {
  from?: number;
  to?: number;
  mass?: number;
  stiffness?: number;
  damping?: number;
};

export type SpringInput = {
  frame: number;
  fps: number;
  config?: SpringConfig;
};

export const spring = ({ frame, fps, config }: SpringInput): number => {
  const from = config?.from ?? 0;
  const to = config?.to ?? 1;
  if (from === to) {
    return to;
  }
  const mass = Math.max(0.0001, config?.mass ?? 1);
  const stiffness = Math.max(0.0001, config?.stiffness ?? 100);
  const damping = Math.max(0, config?.damping ?? 10);
  const t = Math.max(0, frame) / Math.max(1e-6, fps);
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const delta = to - from;

  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    const envelope = Math.exp(-zeta * w0 * t);
    const coeff = zeta / Math.sqrt(1 - zeta * zeta);
    const displacement = envelope * (cos + coeff * sin);
    return to - delta * displacement;
  }

  if (zeta === 1) {
    const displacement = Math.exp(-w0 * t) * (1 + w0 * t);
    return to - delta * displacement;
  }

  const wd = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
  const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
  const displacement = (r1 * Math.exp(r2 * t) - r2 * Math.exp(r1 * t)) / (r1 - r2);
  return to - delta * displacement;
};
