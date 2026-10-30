import React from 'react';
import { AnimeJsBase, type AnimeJsBaseProps } from './engines/AnimeJsBase.js';

export type AnimeHarnessDemoProps = AnimeJsBaseProps & {
  accent?: string;
  surface?: string;
  showBackground?: boolean;
};

export class AnimeHarnessDemoComponent extends AnimeJsBase<AnimeHarnessDemoProps> {
  protected getStartFrameForProps(props: AnimeHarnessDemoProps, fps: number): number {
    if (typeof props.startFrame === 'number') {
      return props.startFrame;
    }
    const startSec = (props as AnimeHarnessDemoProps & { scene?: { startSec?: number } }).scene?.startSec;
    return typeof startSec === 'number' ? Math.round(startSec * fps) : 0;
  }

  protected renderContent(): React.ReactNode {
    const showBackground = this.props.showBackground ?? true;
    const { videoWidth = 1920, videoHeight = 1080 } = this.props;
    // Scale the demo surface to fit the video frame (keeps it readable on docs previews).
    const padding = Math.round(Math.min(videoWidth, videoHeight) * 0.08);
    // SSR-safe static DOM. Anime targets these by class.
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          background: showBackground ? 'var(--color-bg, #101418)' : 'transparent',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: padding,
          }}
        >
          <style>{`
            #layout {
              width: 100%;
              height: 100%;
            }
            #layout .layout-container {
              width: 100%;
              height: 100%;
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: 1fr 1fr 1fr;
              gap: 18px;
              padding: 28px;
              border-radius: 32px;
              background: var(--color-surface, #1f2933);
              box-sizing: border-box;
              overflow: hidden;
              align-content: stretch;
              justify-content: stretch;
            }
            #layout .item {
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 18px;
              color: var(--color-text, #e7edf3);
              font-weight: 600;
              font-size: 22px;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              min-width: 0;
              min-height: 0;
            }
            #layout .item:nth-child(1) { background: var(--color-accent, #4f46e5); }
            #layout .item:nth-child(2) { background: var(--color-accent-2, #3b82f6); }
            #layout .item:nth-child(3) { background: var(--color-muted, #2a333b); }
            #layout .item:nth-child(4) { background: var(--color-surface-strong, #2f3942); }

            #layout [data-grid="1"] .item:nth-child(1) { grid-column: 1; grid-row: 1 / 3; }
            #layout [data-grid="1"] .item:nth-child(2) { grid-column: 2; grid-row: 1; }
            #layout [data-grid="1"] .item:nth-child(3) { grid-column: 1; grid-row: 3; }
            #layout [data-grid="1"] .item:nth-child(4) { grid-column: 2; grid-row: 2 / 4; }

            #layout [data-grid="2"] { grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; }
            #layout [data-grid="2"] .item:nth-child(1),
            #layout [data-grid="2"] .item:nth-child(4) { grid-row: 1 / 3; }

            #layout [data-grid="3"] .item:nth-child(4) { grid-column: 1; grid-row: 1; }
            #layout [data-grid="3"] .item:nth-child(3) { grid-column: 2; grid-row: 1 / 3; }
            #layout [data-grid="3"] .item:nth-child(2) { grid-column: 1; grid-row: 2 / 4; }
            #layout [data-grid="3"] .item:nth-child(1) { grid-column: 2; grid-row: 3; }

            #layout [data-grid="4"] { grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; }
            #layout [data-grid="4"] .item:nth-child(1) { grid-column: 1; grid-row: 1; }
            #layout [data-grid="4"] .item:nth-child(2) { grid-column: 1; grid-row: 2; }
            #layout [data-grid="4"] .item:nth-child(3),
            #layout [data-grid="4"] .item:nth-child(4) { grid-row: 1 / 3; }
          `}</style>
          <div id="layout">
            <div className="layout-container grid-layout" data-grid="1">
              <div className="item">Item A</div>
              <div className="item">Item B</div>
              <div className="item">Item C</div>
              <div className="item">Item D</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  protected buildTimeline({ anime, root, fps }: { anime: any; root: HTMLElement; fps: number }): any {
    const layoutRoot = root.querySelector('.layout-container') as HTMLElement | null;
    if (!layoutRoot) {
      // eslint-disable-next-line no-console
      console.warn('[AnimeHarnessDemo] Missing layout root');
      return { duration: 0, seek: () => {} };
    }

    const segmentMs = 1000;
    const grids = [1, 2, 3, 4];
    const layout = anime.createLayout(layoutRoot);
    const itemCount = layoutRoot.querySelectorAll('.item').length || 4;
    const maxDelay = 150 * Math.max(0, itemCount - 1);
    const segmentDuration = segmentMs + maxDelay;

    const totalDuration = segmentDuration * grids.length;
    let timeline: { seek: (timeMs: number) => void; pause: () => void } | null = null;
    return {
      duration: totalDuration,
      seek: (timeMs: number) => {
        const total = segmentMs * grids.length;
        if (!Number.isFinite(total) || total <= 0) return;
        const safe = ((timeMs % totalDuration) + totalDuration) % totalDuration;
        const idx = Math.floor(safe / segmentDuration);
        const local = safe - idx * segmentDuration;
        const from = grids[idx % grids.length];
        const to = grids[(idx + 1) % grids.length];

        timeline?.pause();
        layout.revert();
        layoutRoot.dataset.grid = String(from);
        layout.record();
        timeline = layout.update(
          ({ root: layoutHost }: { root: HTMLElement }) => {
            layoutHost.dataset.grid = String(to);
          },
          {
            duration: segmentMs,
            autoplay: false,
            delay: anime.stagger(150),
          },
        );
        timeline!.seek(local);
      },
      pause: () => {
        timeline?.pause();
        timeline = null;
        layout.revert();
      },
    };
  }
}
