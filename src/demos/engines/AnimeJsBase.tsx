import React from 'react';
const clamp = (value:number,min:number,max:number) => Math.min(max,Math.max(min,value));
const frameToTimeMs = (frame:number,fps:number) => frame / fps * 1000;

export type AnimeJsBaseProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  startFrame?: number;
  className?: string;
  style?: React.CSSProperties;
  dataEngine?: string;
};

type TimelineLike = {
  duration: any;
  seek: (timeMs: number) => void;
  pause?: () => void;
};

export abstract class AnimeJsBase<P extends AnimeJsBaseProps = AnimeJsBaseProps> extends React.Component<P> {
  protected rootRef = React.createRef<HTMLDivElement>();
  protected timeline: TimelineLike | null = null;
  protected anime: any | null = null;
  private isClient = typeof window !== 'undefined';
  private dead = false;
  private readyResolve!:()=>void;
  private readyReject!:(error:unknown)=>void;
  readonly ready:Promise<void> = new Promise((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject;});

  /**
   * Anime.js mutates DOM styles directly. If React re-renders on every frame, it will
   * re-apply the static inline styles from render(), effectively wiping animation.
   *
   * Default behavior: do NOT re-render for frame/fps-only updates.
   * Frame syncing is handled via UNSAFE_componentWillReceiveProps + seek().
   */
  shouldComponentUpdate(nextProps: Readonly<P>): boolean {
    const ignored = new Set(['frame', 'fps'] as const);
    const keys = new Set<string>([...Object.keys(this.props as any), ...Object.keys(nextProps as any)]);
    for (const key of keys) {
      if (ignored.has(key as any)) continue;
      if ((this.props as any)[key] !== (nextProps as any)[key]) {
        return true;
      }
    }
    return false;
  }

  protected getFrame(): number {
    return this.props.frame ?? 0;
  }

  protected getFps(): number {
    return this.props.fps ?? 30;
  }

  protected getSize(): { width: number; height: number } {
    return {
      width: this.props.videoWidth ?? 1920,
      height: this.props.videoHeight ?? 1080,
    };
  }

  protected getStartFrameForProps(_props: P, _fps: number): number {
    return _props.startFrame ?? 0;
  }

  protected abstract buildTimeline(args: {
    anime: any;
    root: HTMLElement;
    fps: number;
    width: number;
    height: number;
  }): TimelineLike;

  // Subclasses override to render deterministic SSR-friendly content inside root.
  // It should not depend on window or layout measurement.
  protected renderContent(): React.ReactNode {
    return null;
  }

  async componentDidMount(): Promise<void> {
    void this.ready.catch(()=>{});
    if (!this.isClient) return;
    const root = this.rootRef.current;
    if (!root) return;
    try {
      const module: any = await import('animejs');
      // Anime.js v4 is ESM with named exports. Some bundlers also provide a `default`.
      // Merge both shapes so callers can rely on `anime.createTimeline`, `anime.splitText`, etc.
      if (this.dead) return;
      const anime = module?.default ? { ...module, ...module.default } : module;
      this.anime = anime;
      const { width, height } = this.getSize();
      this.timeline = this.buildTimeline({ anime, root, fps: this.getFps(), width, height });
      // Ensure deterministic initial pose.
      this.seekToFrame(this.getFrame(), this.getFps(), this.props);
      this.readyResolve();
    } catch (err) {
      this.timeline = null;
      this.readyReject(err);
    }
  }

  // We often want to let Anime.js own DOM state (e.g. SplitText) without React reconciling it
  // on every frame. Subclasses can override shouldComponentUpdate() to return false for
  // frame-only updates, and we'll still seek deterministically via this UNSAFE hook.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  UNSAFE_componentWillReceiveProps(nextProps: Readonly<P>): void {
    if (!this.isClient) return;
    const prevFrame = this.props.frame ?? 0;
    const prevFps = this.props.fps ?? 30;
    const nextFrame = nextProps.frame ?? 0;
    const nextFps = nextProps.fps ?? 30;
    if (prevFrame !== nextFrame || prevFps !== nextFps) {
      this.seekToFrame(nextFrame, nextFps, nextProps);
    }
  }

  componentWillUnmount(): void {
    this.cancel();
    if (this.timeline?.pause) {
      this.timeline.pause();
    }
    this.timeline = null;
    this.anime = null;
  }

  cancel(): void {
    if (this.dead) return;
    this.dead = true;
    this.readyReject(new Error('Anime effect disposed'));
  }

  public seekFrame(frame:number,fps:number):void { this.seekToFrame(frame,fps,this.props); }

  protected seekToFrame(frame: number, fps: number, props: Readonly<P>): void {
    if (!this.timeline) return;
    const startFrame = this.getStartFrameForProps(props, fps);
    const localFrame = frame - startFrame;
    const timeMs = frameToTimeMs(localFrame, fps);
    const durationRaw = (this.timeline as any).duration;
    const duration = Number(durationRaw);
    const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : 0;
    const clamped = clamp(timeMs, 0, safeDuration);
    this.timeline.seek(clamped);

    // Debug signal: prove that seek() is being called and advancing.
    const root = this.rootRef.current;
    if (root) {
      root.dataset.seekMs = String(Math.round(clamped));
      root.dataset.durationMs = String(Math.round(safeDuration));
      root.dataset.frame = String(frame);
    }
  }

  render(): React.ReactNode {
    const { className, style } = this.props;
    const engine = this.props.dataEngine ?? 'anime';
    return (
      <div
        ref={this.rootRef}
        data-engine={engine}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...style,
        }}
      >
        {this.renderContent()}
      </div>
    );
  }
}

// Optional specialization: a convenience base for text animation components.
export abstract class AnimeTextBase<P extends AnimeJsBaseProps = AnimeJsBaseProps> extends AnimeJsBase<P> {
  protected textRef = React.createRef<HTMLSpanElement>();

  protected renderTextContent(text: string, style?: React.CSSProperties): React.ReactNode {
    return (
      <span ref={this.textRef} style={style}>
        {text}
      </span>
    );
  }
}
