import React from 'react';
import type { ScriptCue } from './types.js';
import { AnimeJsBase, type AnimeJsBaseProps } from './engines/AnimeJsBase.js';
import {
  effectToAnimeProps,
  resolveEffectEasing,
  resolveEffectStartFrame,
  type TextEffectConfig,
} from './engines/text-effects.js';

export type TextEffectsProps = AnimeJsBaseProps & {
  text: string;
  effect: TextEffectConfig;
  cue?: ScriptCue;

  // Typography / layout
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  lineHeight?: number;
};

export class TextEffectsComponent extends AnimeJsBase<TextEffectsProps> {
  static defaultProps = {
    dataEngine: 'text-effects',
  };

  protected getStartFrameForProps(props: TextEffectsProps, fps: number): number {
    return resolveEffectStartFrame(props.effect, props.cue, fps);
  }

  protected renderContent(): React.ReactNode {
    const {
      text,
      fontSize = 84,
      fontWeight = 700,
      color = 'var(--color-text, #f2f4f8)',
      align = 'center',
      fontFamily = 'var(--font-headline, ui-sans-serif, system-ui, sans-serif)',
      lineHeight = 1.05,
    } = this.props;

    const unit = this.props.effect.unit ?? 'chars';
    const renderSegments = () => {
      if (unit === 'lines') {
        const lines = text.split('\n');
        return lines.map((line, i) => (
          <span
            key={`line-${i}`}
            className="text-effects-seg"
            data-line={i}
            style={{ display: 'block', whiteSpace: 'pre' }}
          >
            {line}
          </span>
        ));
      }

      if (unit === 'words') {
        const tokens = text.split(/(\s+)/);
        let wordIndex = 0;
        return tokens.map((token, idx) => {
          if (!token) return null;
          if (/^\s+$/.test(token)) {
            return token;
          }
          const node = (
            <span
              key={`word-${idx}`}
              className="text-effects-seg"
              data-word={wordIndex}
              style={{ display: 'inline-block' }}
            >
              {token}
            </span>
          );
          wordIndex += 1;
          return node;
        });
      }

      // chars (default)
      const chars = Array.from(text);
      let charIndex = 0;
      return chars.map((ch, idx) => {
        if (ch === ' ') {
          // Keep spacing, but don't animate whitespace.
          return (
            <span key={`space-${idx}`} className="text-effects-space" style={{ whiteSpace: 'pre' }}>
              {' '}
            </span>
          );
        }
        const node = (
          <span
            key={`char-${idx}`}
            className="text-effects-seg"
            data-char={charIndex}
            style={{ display: 'inline-block' }}
          >
            {ch}
          </span>
        );
        charIndex += 1;
        return node;
      });
    };

    return (
      <div
        style={{ display: 'block', textAlign: align }}
      >
        <span
          className="text-effects-root"
          style={{
            color,
            fontSize,
            fontWeight,
            fontFamily,
            lineHeight,
            letterSpacing: '-0.01em',
            whiteSpace: 'pre-wrap',
            display: 'inline-block',
          }}
        >
          {renderSegments()}
        </span>
      </div>
    );
  }

  protected buildTimeline({ anime, root, fps }: { anime: any; root: HTMLElement; fps: number }): any {
    const effect = this.props.effect;
    const durationFrames = effect.durationFrames ?? 24;
    const delayFrames = effect.delayFrames ?? 0;
    const staggerFrames = effect.staggerFrames ?? 2;

    const segments = Array.from(root.querySelectorAll<HTMLElement>('.text-effects-seg'));
    if (!segments.length) {
      // Deterministic no-op timeline.
      return anime.createTimeline({ autoplay: false, duration: 0 });
    }

    const durationMs = (durationFrames / Math.max(1, fps)) * 1000;
    const baseDelayMs = (delayFrames / Math.max(1, fps)) * 1000;
    const staggerMs = (staggerFrames / Math.max(1, fps)) * 1000;
    const ease = resolveEffectEasing(effect);
    const props = effectToAnimeProps(effect);

    const tl = anime.createTimeline({ autoplay: false });
    tl.add(
      segments,
      {
        duration: durationMs,
        ease,
        delay: (_el: any, i: number) => baseDelayMs + i * staggerMs,
        ...props,
      },
      0,
    );

    tl.seek(tl.duration);
    return tl;
  }
}
