import React from 'react';
import type { AnimationItem } from 'lottie-web';
import { resolveLottieFrame } from './lottie-timing.js';

export type LottieBaseProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  style?: React.CSSProperties;
  className?: string;
  dataEngine?: string;
  animationData?: Record<string, unknown>;
  path?: string;
  loop?: boolean;
};

type LottieSize = { width: number; height: number };

export abstract class LottieBase<P extends LottieBaseProps = LottieBaseProps> extends React.Component<P> {
  protected containerRef = React.createRef<HTMLDivElement>();
  protected animation: AnimationItem | null = null;
  private isClient = typeof window !== 'undefined';
  private teardownListeners: (() => void) | null = null;
  private dead=false;
  private readyResolve!:()=>void;
  private readyReject!:(error:unknown)=>void;
  readonly ready:Promise<void> = new Promise((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject;});

  protected getFrame(): number {
    return this.props.frame ?? 0;
  }

  protected getFps(): number {
    return this.props.fps ?? 30;
  }

  protected getSize(): LottieSize {
    return {
      width: this.props.videoWidth ?? 1920,
      height: this.props.videoHeight ?? 1080,
    };
  }

  componentDidMount(): void {
    if (!this.isClient) return;
    void this.ready.catch(()=>{});
    void this.initAnimation().catch(error=>this.readyReject(error));
  }

  componentDidUpdate(prevProps: Readonly<P>): void {
    if (!this.isClient || !this.animation) return;
    if (
      prevProps.frame !== this.props.frame ||
      prevProps.fps !== this.props.fps
    ) {
      this.syncFrame();
    }
  }

  componentWillUnmount(): void {
    this.cancel();
    if (this.animation) {
      if (this.teardownListeners) {
        this.teardownListeners();
        this.teardownListeners = null;
      }
      this.animation.destroy();
      this.animation = null;
    }
  }

  cancel(): void {
    if (this.dead) return;
    this.dead = true;
    this.readyReject(new Error('Lottie effect disposed'));
  }

  private async initAnimation(): Promise<void> {
    const container = this.containerRef.current;
    if (!container) return;
    if (!this.props.animationData && !this.props.path) throw new Error('Lottie animation data or local path is required');
    if (this.props.path && /^(?:[a-z]+:)?\/\//i.test(this.props.path)) throw new Error('Lottie animation path must be local');
    container.innerHTML = '';
    const module = await import('lottie-web');
    if(this.dead) return;
    const lottie = (module as any).default ?? module;
    this.animation = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: this.props.loop ?? true,
      autoplay: false,
      animationData: this.props.animationData ? structuredClone(this.props.animationData) : undefined,
      path: this.props.path,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    });
    const animation = this.animation;
    if (!animation) return;

    // Prefer integer-frame stepping. We drive frames deterministically via goToAndStop.
    try {
      animation.setSubframe(false);
    } catch {
      // Older builds may not expose setSubframe; ignore.
    }

    // DOMLoaded signals that the local asset has been parsed and rendered.
    const ready = () => { if (this.dead) return; try { animation.goToAndStop(1, true); this.syncFrame(); this.readyResolve(); } catch(error) { this.readyReject(error); } };
    const failed = () => this.readyReject(new Error('Lottie animation failed to load'));
    animation.addEventListener('DOMLoaded',ready);
    animation.addEventListener('data_failed',failed);
    this.teardownListeners=()=>{animation.removeEventListener('DOMLoaded',ready);animation.removeEventListener('data_failed',failed);};
  }

  public seekFrame():void { this.syncFrame(); }

  private syncFrame(): void {
    if (!this.animation) return;
    const frame = this.getFrame();
    const fps = this.getFps();
    const rawFrameRate = (this.animation as any).frameRate;
    const lottieFps = Number.isFinite(Number(rawFrameRate)) && Number(rawFrameRate) > 0 ? Number(rawFrameRate) : fps;
    const rawTotalFrames =
      typeof (this.animation as any).getDuration === 'function'
        ? (this.animation as any).getDuration(true)
        : (this.animation as any).totalFrames;
    const totalFrames =
      Number.isFinite(Number(rawTotalFrames)) && Number(rawTotalFrames) > 0 ? Number(rawTotalFrames) : 1;
    if (totalFrames <= 1) {
      return;
    }

    const seekFrame=resolveLottieFrame(frame,fps,lottieFps,totalFrames,this.props.loop ?? true);
    this.animation.goToAndStop(seekFrame, true);
  }

  render() {
    const { style, className, dataEngine } = this.props;
    return (
      <div
        ref={this.containerRef}
        className={className}
        data-engine={dataEngine}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...style,
        }}
      />
    );
  }
}
