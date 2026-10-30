import React from 'react';
import { motion } from 'framer-motion';
import { easeInOutCubic, interpolate, spring } from './math.js';

export type FramerMotionDemoProps = {
  size?: number;
  accent?: string;
  surface?: string;
  showBackground?: boolean;
  centerX?: number;
  centerY?: number;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function FramerMotionDemoComponent({
  size = 220,
  accent = 'var(--color-accent, #4f46e5)',
  surface = 'var(--color-surface-strong, #2a333b)',
  showBackground = true,
  centerX,
  centerY,
  frame = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
}: FramerMotionDemoProps) {
  const cycleFrames = 360;
  const localFrame = (frame + 120) % cycleFrames;
  const t = localFrame / cycleFrames;

  // Zoomed-in solar system (not to scale)
  const cx = Math.round(centerX ?? videoWidth * 0.5);
  const cy = Math.round(centerY ?? videoHeight * 0.5);
  const baseR = Math.min(videoWidth, videoHeight) * 0.1;
  const planets = [
    { name: 'mercury', radius: baseR * 1.1, size: 8, speed: 1.9, phase: 2.13, color: '#9ca3af' },
    { name: 'venus', radius: baseR * 1.8, size: 14, speed: 1.5, phase: 5.01, color: '#fbbf24' },
    { name: 'earth', radius: baseR * 2.6, size: 16, speed: 1.2, phase: 0.74, color: '#3b82f6' },
    { name: 'mars', radius: baseR * 3.3, size: 12, speed: 0.98, phase: 3.62, color: '#ef4444' },
    { name: 'jupiter', radius: baseR * 4.2, size: 28, speed: 0.7, phase: 1.41, color: '#f59e0b' },
    { name: 'saturn', radius: baseR * 5.2, size: 24, speed: 0.55, phase: 4.57, color: '#eab308', ring: true },
    { name: 'uranus', radius: baseR * 6.1, size: 20, speed: 0.45, phase: 2.89, color: '#22d3ee' },
    { name: 'neptune', radius: baseR * 7.0, size: 20, speed: 0.38, phase: 5.88, color: '#6366f1' },
  ];

  return (
    <div
      data-engine="framer"
      style={{
        position: 'absolute',
        inset: 0,
        background: showBackground ? 'var(--color-bg, #101418)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Sun */}
      <motion.div
        style={{
          position: 'absolute',
          left: cx - (baseR * 1.4) / 2,
          top: cy - (baseR * 1.4) / 2,
          width: baseR * 1.4,
          height: baseR * 1.4,
          borderRadius: 999,
          background: '#fbbf24',
          boxShadow: '0 0 60px rgba(251, 191, 36, 0.75)',
          transformOrigin: '50% 50%',
          scale: spring({ frame: localFrame, fps, config: { from: 0.96, to: 1.04, mass: 0.6, stiffness: 140, damping: 18 } }),
        }}
      />

      {/* Orbits */}
      {planets.map((planet) => (
        <div
          key={`orbit-${planet.name}`}
          style={{
            position: 'absolute',
            left: cx - planet.radius,
            top: cy - planet.radius,
            width: planet.radius * 2,
            height: planet.radius * 2,
            borderRadius: 999,
            border: `1px solid rgba(232, 234, 240, 0.12)`,
          }}
        />
      ))}

      {/* Planets */}
      {planets.map((planet) => {
        const angle = t * Math.PI * 2 * planet.speed + planet.phase;
        const px = cx + Math.cos(angle) * planet.radius;
        const py = cy + Math.sin(angle) * planet.radius;
        const sizePx = planet.size;
        return (
          <div key={`planet-${planet.name}`} style={{ position: 'absolute', left: px - sizePx / 2, top: py - sizePx / 2 }}>
            {planet.ring ? (
              <div
                style={{
                  position: 'absolute',
                  left: -sizePx * 0.35,
                  top: sizePx * 0.1,
                  width: sizePx * 1.7,
                  height: sizePx * 0.6,
                  borderRadius: 999,
                  border: '2px solid rgba(250, 204, 21, 0.65)',
                  transform: 'rotate(18deg)',
                }}
              />
            ) : null}
            <motion.div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: sizePx,
                height: sizePx,
                borderRadius: 999,
                background: planet.color,
                boxShadow: `0 0 12px ${planet.color}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
