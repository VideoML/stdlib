import React from 'react';
import { LottieBase, type LottieBaseProps } from './engines/LottieBase.js';

const DEFAULT_BADGE = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Badge',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Ring',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        // Lottie keyframes need tangents (`i`/`o`) and/or `e` to interpolate reliably.
        r: {
          a: 1,
          k: [
            // Scalar keyframes should use 1-element arrays for `s`/`e`.
            { t: 0, s: [0], e: [360], i: { x: [0.67], y: [1] }, o: { x: [0.33], y: [0] } },
            { t: 60, s: [360] },
          ],
        },
        p: { a: 0, k: [150, 150, 0] },
        // Anchor at center so rotation doesn't fling the circle out of frame.
        a: { a: 0, k: [150, 150, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        { ty: 'el', p: { a: 0, k: [150, 150] }, s: { a: 0, k: [200, 200] }, nm: 'Ellipse Path' },
        // Stroke-only ring so motion markers remain visible even if layer ordering differs.
        { ty: 'st', c: { a: 0, k: [0.72, 0.78, 0.98, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 18 }, lc: 2, lj: 2, nm: 'Stroke' },
        { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
    // Rotating marker makes motion obvious even for symmetric rings / colorblind viewers.
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Marker',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [360], i: { x: [0.67], y: [1] }, o: { x: [0.33], y: [0] } },
            { t: 60, s: [360] },
          ],
        },
        p: { a: 0, k: [150, 150, 0] },
        a: { a: 0, k: [150, 150, 0] },
        // Keep scale static; some Lottie parsers are strict about keyframe tangent fields.
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        // Clock-hand style marker so motion is obvious even at small sizes.
        { ty: 'rc', p: { a: 0, k: [150, 86] }, s: { a: 0, k: [14, 132] }, r: { a: 0, k: 7 }, nm: 'Marker Hand' },
        { ty: 'el', p: { a: 0, k: [150, 40] }, s: { a: 0, k: [30, 30] }, nm: 'Marker Dot' },
        { ty: 'fl', c: { a: 0, k: [0.98, 0.9, 0.6, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Marker Fill' },
        { ty: 'st', c: { a: 0, k: [0.12, 0.14, 0.2, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2, nm: 'Marker Stroke' },
        { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
    // Non-rotational motion marker: a small slab that travels vertically (very obvious).
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: 'Wobble',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        // Animate position directly (avoids relying on rotation parsing).
        p: {
          a: 1,
          k: [
            { t: 0, s: [150, 78, 0], e: [150, 222, 0], i: { x: [0.67], y: [1] }, o: { x: [0.33], y: [0] } },
            { t: 60, s: [150, 222, 0] },
          ],
        },
        a: { a: 0, k: [150, 150, 0] },
        r: { a: 0, k: 0 },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        { ty: 'rc', p: { a: 0, k: [150, 150] }, s: { a: 0, k: [44, 18] }, r: { a: 0, k: 9 }, nm: 'Wobble Slab' },
        { ty: 'fl', c: { a: 0, k: [0.12, 0.14, 0.2, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Wobble Fill' },
        { ty: 'st', c: { a: 0, k: [0.72, 0.78, 0.98, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2, nm: 'Wobble Stroke' },
        { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
};

export type LottieBadgeProps = LottieBaseProps & {
  size?: number;
};

export class LottieBadgeComponent extends LottieBase<LottieBadgeProps> {
  static defaultProps = {
    animationData: DEFAULT_BADGE,
  };

  render() {
    const { size = 280, style, className } = this.props;
    return (
      <div
        data-engine="lottie"
        className={className}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg, #101418)',
          ...style,
        }}
      >
        <div
          ref={this.containerRef}
          style={{
            width: size,
            height: size,
          }}
        />
      </div>
    );
  }
}
