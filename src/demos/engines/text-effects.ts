import type { ScriptCue } from '../types.js';
import { cueStartFrame } from './timing.js';

export type TextEffectUnit = 'chars' | 'words' | 'lines';

export type TextEffectName =
  | 'fade'
  | 'slide'
  | 'shimmer'
  | 'fade_up'
  | 'fade_down'
  | 'slide_left'
  | 'slide_right'
  | 'pop'
  | 'scale_in';

export type TextEffectConfig = {
  effect: TextEffectName;
  unit?: TextEffectUnit;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  shimmerOpacity?: number;
  shimmerBrightness?: number;
  shimmerColorFrom?: string;
  shimmerColorTo?: string;
  start?: { kind: 'frame'; frame: number } | { kind: 'cue'; offsetFrames?: number };
  durationFrames?: number;
  delayFrames?: number;
  staggerFrames?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
};

export const resolveEffectStartFrame = (effect: TextEffectConfig | undefined, cue: ScriptCue | null | undefined, fps: number): number => {
  if (!effect?.start) {
    return cue ? cueStartFrame(cue, fps) : 0;
  }
  if (effect.start.kind === 'frame') {
    const base = Math.max(0, Math.floor(effect.start.frame));
    return base + (cue ? cueStartFrame(cue, fps) : 0);
  }
  const offset = effect.start.offsetFrames ?? 0;
  return cueStartFrame(cue, fps) + Math.floor(offset);
};

export const resolveEffectEasing = (effect: TextEffectConfig | undefined): string => {
  const easing = effect?.easing ?? 'easeOut';
  if (easing === 'linear') return 'linear';
  if (easing === 'easeInOut') return 'easeInOutQuad';
  return 'easeOutQuad';
};

const resolveDirection = (effect: TextEffectConfig): TextEffectConfig['direction'] => {
  if (effect.direction) return effect.direction;
  if (effect.effect === 'fade_up') return 'up';
  if (effect.effect === 'fade_down') return 'down';
  if (effect.effect === 'slide_left') return 'left';
  if (effect.effect === 'slide_right') return 'right';
  return undefined;
};

const translateFromDirection = (direction: TextEffectConfig['direction'], distance: number): Record<string, any> => {
  switch (direction) {
    case 'left':
      return { translateX: [distance, 0] };
    case 'right':
      return { translateX: [-distance, 0] };
    case 'up':
      return { translateY: [distance, 0] };
    case 'down':
      return { translateY: [-distance, 0] };
    default:
      return {};
  }
};

export const effectToAnimeProps = (effect: TextEffectConfig): Record<string, any> => {
  const direction = resolveDirection(effect);
  const distance = effect.distance ?? (effect.effect === 'slide' || effect.effect.startsWith('slide_') ? 40 : 24);
  // Keep these mappings stable; they are our named-effects vocabulary.
  switch (effect.effect) {
    case 'fade':
      return {
        opacity: [0, 1],
        ...translateFromDirection(direction, distance),
      };
    case 'fade_up':
    case 'fade_down':
      return {
        opacity: [0, 1],
        ...translateFromDirection(direction, distance),
      };
    case 'slide':
    case 'slide_left':
    case 'slide_right':
      return {
        opacity: [0, 1],
        ...translateFromDirection(direction ?? 'left', distance),
      };
    case 'shimmer': {
      const shimmerBrightness = effect.shimmerBrightness ?? 1.6;
      const shimmerColorFrom = effect.shimmerColorFrom ?? undefined;
      const shimmerColorTo = effect.shimmerColorTo ?? undefined;
      return {
        opacity: [1, 1, 1],
        filter: [`brightness(1)`, `brightness(${shimmerBrightness})`, `brightness(1)`],
        ...(shimmerColorFrom && shimmerColorTo ? { color: [shimmerColorFrom, shimmerColorTo, shimmerColorFrom] } : {}),
      };
    }
    case 'pop':
      return { opacity: [0, 1], scale: [0.9, 1] };
    case 'scale_in':
      return { opacity: [0, 1], scale: [0.8, 1] };
    default:
      return { opacity: [0, 1] };
  }
};
