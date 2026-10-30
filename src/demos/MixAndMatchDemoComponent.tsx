import React, { useImperativeHandle, useMemo, useRef } from 'react';
import { P5ParticlesComponent } from './P5ParticlesComponent.js';
import { D3BarChartComponent } from './D3BarChartComponent.js';
import { ThreeOrbitComponent } from './ThreeOrbit.js';
import { FramerMotionDemoComponent } from './FramerMotionDemoComponent.js';
import { AnimeHarnessDemoComponent } from './AnimeHarnessDemo.js';
import { TextEffectsComponent } from './TextEffectsComponent.js';

export type MixAndMatchDemoProps = {
  frame?: number;
  seed?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  scene?: { startSec?: number };
};

export const MixAndMatchDemoComponent = React.forwardRef<any, MixAndMatchDemoProps>(function MixAndMatchDemoComponent({
  frame = 0,
  seed = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
  scene,
}: MixAndMatchDemoProps, ref) {
  const p5Ref = useRef<P5ParticlesComponent>(null);
  const animeRef = useRef<AnimeHarnessDemoComponent>(null);
  const textRef = useRef<TextEffectsComponent>(null);
  useImperativeHandle(ref,()=>({
    get ready() { return Promise.all([p5Ref.current?.ready,animeRef.current?.ready,textRef.current?.ready]); },
    async seekFrame(frame:number,fps:number) { await Promise.all([p5Ref.current?.seekFrame(frame,fps),animeRef.current?.seekFrame(frame,fps),textRef.current?.seekFrame(frame,fps)]); },
    cancel() { p5Ref.current?.cancel(); animeRef.current?.cancel(); textRef.current?.cancel(); },
  }),[]);
  const textEffect = useMemo(() => ({
    effect: "slide_left" as const, unit: "words" as const,
    start: { kind: "frame" as const, frame: Math.round(fps * 0.6) },
    durationFrames: 26, staggerFrames: 6, easing: "easeOut" as const,
  }), [fps]);
  const animeStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const sceneStartFrame = typeof scene?.startSec === 'number' ? Math.round(scene.startSec * fps) : 0;
  const canvasWidth = 1920;
  const canvasHeight = 1080;
  const canvasScale = Math.min(videoWidth / canvasWidth, videoHeight / canvasHeight);
  const cardRadius = 28;
  const cardPadding = 18;
  const cardBg = 'var(--color-surface, #1f2933)';
  const cardText = 'var(--color-text, #f2f4f8)';
  const cardMuted = 'var(--color-text-muted, #9aa5b1)';

  const cardShadowless: React.CSSProperties = {
    background: cardBg,
    borderRadius: cardRadius,
    padding: cardPadding,
  };

  return (
    <div
      data-engine="mix"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: 'var(--color-bg, #101418)',
      }}
    >
      <div style={{position: "absolute", width: canvasWidth, height: canvasHeight, left: (videoWidth - canvasWidth * canvasScale) / 2, top: (videoHeight - canvasHeight * canvasScale) / 2, transformOrigin: "top left", transform: `scale(${canvasScale})`}}>
      {/* Generative background (p5) */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <P5ParticlesComponent
          ref={p5Ref}
          seed={seed}
          frame={frame}
          fps={fps}
          videoWidth={canvasWidth}
          videoHeight={canvasHeight}
          particleCount={36}
          radius={10}
          focusX={0.46}
          focusY={0.56}
          sunOffsetX={-120}
          sunOffsetY={90}
        />
      </div>

      {/* Framer Motion accent layer (behind panels) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: 'translate(-160px, 140px)',
          zIndex: 0,
        }}
      >
        <FramerMotionDemoComponent
          frame={frame}
          fps={fps}
          videoWidth={canvasWidth}
          videoHeight={canvasHeight}
          size={180}
          showBackground={false}
          surface={'var(--color-surface-strong, #2a333b)'}
        />
      </div>

      {/* Top row cards + Anime label below Three */}
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 64,
          display: 'grid',
          gridTemplateColumns: '1.25fr 0.75fr',
          gridTemplateRows: 'auto auto',
          columnGap: 24,
          rowGap: 20,
          alignItems: 'stretch',
          zIndex: 2,
        }}
      >
        {/* D3 card */}
        <div style={{ ...cardShadowless, position: 'relative', overflow: 'hidden', gridColumn: '1 / 2', gridRow: '1 / 2' }}>
          <div style={{ color: cardMuted, fontSize: 12, letterSpacing: '0.2em', fontWeight: 700 }}>
            D3
          </div>
          <div style={{ color: cardText, fontSize: 18, fontWeight: 700, marginTop: 6 }}>
            Data-driven animation
          </div>
          <div style={{ position: 'relative', height: 340, marginTop: 14 }}>
            <D3BarChartComponent
              frame={frame}
              fps={fps}
              videoWidth={900}
              videoHeight={420}
              showBackground={false}
              padding={90}
              barRadius={16}
            />
          </div>
        </div>

        {/* Three card */}
        <div style={{ ...cardShadowless, position: 'relative', overflow: 'hidden', gridColumn: '2 / 3', gridRow: '1 / 2' }}>
          <div style={{ color: cardMuted, fontSize: 12, letterSpacing: '0.2em', fontWeight: 700 }}>
            THREE.JS
          </div>
          <div style={{ color: cardText, fontSize: 18, fontWeight: 700, marginTop: 6 }}>
            Spatial layer
          </div>
          <div style={{ position: 'relative', height: 340, marginTop: 14 }}>
            <ThreeOrbitComponent
              frame={frame}
              fps={fps}
              videoWidth={660}
              videoHeight={340}
              cubeSize={170}
              overscanX={0}
              focusX={0.5}
              style={{ position: 'absolute', inset: 0 }}
            />
          </div>
        </div>

        {/* Anime.js card */}
        <div style={{ ...cardShadowless, position: 'relative', overflow: 'hidden', gridColumn: '2 / 3', gridRow: '2 / 3' }}>
          <div style={{ color: cardMuted, fontSize: 12, letterSpacing: '0.2em', fontWeight: 700 }}>
            ANIME.JS
          </div>
          <div style={{ color: cardText, fontSize: 18, fontWeight: 700, marginTop: 6 }}>
            Auto layout
          </div>
          <div style={{ position: 'relative', height: 240, marginTop: 14 }}>
            <AnimeHarnessDemoComponent
              ref={animeRef}
              frame={frame}
              fps={fps}
              videoWidth={520}
              videoHeight={300}
              startFrame={sceneStartFrame}
              showBackground={false}
              style={animeStyle}
            />
          </div>
        </div>
      </div>

      {/* Kinetic text overlay */}
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 80 }}>
        <TextEffectsComponent
          ref={textRef}
          text={'Mix and match engines in one scene.'}
          effect={textEffect}
          frame={frame}
          fps={fps}
          videoWidth={canvasWidth}
          videoHeight={canvasHeight}
          fontSize={52}
          align="left"
          color={'var(--color-text, #f2f4f8)'}
        />
      </div>
      </div>
    </div>
  );
});
