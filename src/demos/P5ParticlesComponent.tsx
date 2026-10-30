import type p5 from 'p5';
import { P5SketchBase, type P5SketchProps } from './engines/P5SketchBase.js';
import { resolveCssVar } from './engines/utils.js';

export type P5ParticlesProps = P5SketchProps & {
  particleCount?: number;
  radius?: number;
  overscanX?: number;
  focusX?: number;
  focusY?: number;
  sunOffsetX?: number;
  sunOffsetY?: number;
  backgroundDarken?: number;
};

export class P5ParticlesComponent extends P5SketchBase<P5ParticlesProps> {
  static defaultProps = {
    dataEngine: 'p5',
  };

  protected drawFrame(sketch: p5, frame: number, fps: number, size: { width: number; height: number }): void {
    const bg = resolveCssVar(this.containerRef.current, '--color-bg', '#101418');
    const accent = resolveCssVar(this.containerRef.current, '--color-accent', '#4f46e5');
    const accent2 = resolveCssVar(this.containerRef.current, '--color-accent-2', '#3b82f6');
    const muted = resolveCssVar(this.containerRef.current, '--color-surface', '#1f2933');
    const surfaceStrong = resolveCssVar(this.containerRef.current, '--color-surface-strong', '#2a333b');

    const bgColor = sketch.color(bg as any);
    const darkenAmount = Math.min(Math.max(this.props.backgroundDarken ?? 0, 0), 1);
    const darkBg = sketch.lerpColor(bgColor, sketch.color('#0a0c0f'), darkenAmount);
    sketch.background(darkBg as any);
    sketch.noStroke();

    const time = frame / Math.max(1, fps);
    const overscanX = this.props.overscanX ?? 0;
    const focusX = this.props.focusX ?? 0.5;
    const focusY = this.props.focusY ?? 0.5;
    const centerX = size.width * focusX;
    const centerY = size.height * focusY;
    const maxDim = Math.max(size.width + overscanX * 2, size.height);

    const drawBlob = (cx: number, cy: number, baseRadius: number, color: string, noiseOffset: number) => {
      const fillColor = sketch.color(color as any);
      fillColor.setAlpha(210);
      sketch.fill(fillColor);
      sketch.beginShape();
      const steps = 36;
      for (let i = 0; i <= steps; i += 1) {
        const angle = (sketch.TWO_PI * i) / steps;
        const noiseX = Math.cos(angle) * 0.8 + noiseOffset;
        const noiseY = Math.sin(angle) * 0.8 + noiseOffset * 0.7;
        const n = sketch.noise(noiseX, noiseY, time * 0.35);
        const radius = baseRadius + n * baseRadius * 0.35;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        sketch.vertex(x, y);
      }
      sketch.endShape(sketch.CLOSE);
    };

    const accentColor = sketch.color(accent as any);
    const accent2Color = sketch.color(accent2 as any);
    const deepAccent = sketch.lerpColor(bgColor, accentColor, 0.55);
    const deepAccent2 = sketch.lerpColor(bgColor, accent2Color, 0.6);

    const sunOffsetX = this.props.sunOffsetX ?? 0;
    const sunOffsetY = this.props.sunOffsetY ?? 0;
    drawBlob(centerX - maxDim * 0.42 + sunOffsetX, centerY - maxDim * 0.05 + sunOffsetY, maxDim * 0.55, deepAccent.toString(), 0.2);
    drawBlob(centerX + maxDim * 0.28, centerY + maxDim * 0.18, maxDim * 0.48, deepAccent2.toString(), 1.3);

    sketch.stroke(muted as any);
    sketch.strokeWeight(3);
    sketch.noFill();
    for (let i = 0; i < 5; i += 1) {
      const ringRadius = maxDim * (0.22 + i * 0.12);
      const wobble = Math.sin(time * 0.6 + i) * maxDim * 0.015;
      sketch.circle(centerX, centerY, ringRadius + wobble);
    }

    sketch.noStroke();
    for (let x = -overscanX; x <= size.width + overscanX; x += 16) {
      for (let y = 0; y <= size.height; y += 18) {
        const n = sketch.noise((x + overscanX) * 0.004, y * 0.004, time * 0.28);
        if (n < 0.5) continue;
        const alpha = Math.min(255, 170 + (n - 0.5) * 360);
        const base = sketch.color((n > 0.68 ? accent2 : accent) as any);
        const bright = sketch.color('#fbfdff');
        const dotColor = sketch.lerpColor(base, bright, Math.min(0.7, (n - 0.5) * 1.2));
        dotColor.setAlpha(alpha);
        sketch.fill(dotColor);
        sketch.circle(x, y, 8 + n * 12);
      }
    }
  }
}
