import React from 'react';
import type p5 from 'p5';
import { DrawWaiters } from './draw-waiters.js';

export type P5SketchProps = {
  frame?: number;
  seed?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  timeSec?: number;
  style?: React.CSSProperties;
  className?: string;
  dataEngine?: string;
};

type SketchSize = { width: number; height: number };

export abstract class P5SketchBase<P extends P5SketchProps = P5SketchProps> extends React.Component<P> {

  protected containerRef = React.createRef<HTMLDivElement>();
  protected p5Instance: p5 | null = null;
  private isClient = typeof window !== 'undefined';
  private latestFrame = 0;
  private latestFps = 30;
  private latestSize: SketchSize = { width: 1920, height: 1080 };
  private dead = false;
  private readyResolve!:()=>void;
  private readyReject!:(error:unknown)=>void;
  readonly ready:Promise<void> = new Promise((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject;});
  private drawWaiters = new DrawWaiters();

  protected abstract drawFrame(sketch: p5, frame: number, fps: number, size: SketchSize): void;

  protected setupSketch(_sketch: p5, _size: SketchSize): void {
    // Optional hook for subclasses
  }

  componentDidMount(): void {
    if (!this.isClient) return;
    this.latestFrame = this.getFrame();
    this.latestFps = this.getFps();
    this.latestSize = this.getSize();
    void this.ready.catch(()=>{});
    void this.initSketch().catch(error=>this.readyReject(error));
  }

  componentDidUpdate(prevProps: Readonly<P>): void {
    if (!this.isClient || !this.p5Instance) return;
    const size = this.getSize();
    const sizeChanged = size.width !== this.latestSize.width || size.height !== this.latestSize.height;
    this.latestFrame = this.getFrame();
    this.latestFps = this.getFps();
    this.latestSize = size;


    if (sizeChanged) {
      this.p5Instance.resizeCanvas(size.width, size.height);
    }

    if (
      prevProps.frame !== this.props.frame ||
      prevProps.timeSec !== this.props.timeSec ||
      prevProps.fps !== this.props.fps ||
      prevProps.videoWidth !== this.props.videoWidth ||
      prevProps.videoHeight !== this.props.videoHeight
    ) {
      this.p5Instance.redraw();
    }

  }

  componentWillUnmount(): void {
    this.cancel();
    if (this.p5Instance) {
      this.p5Instance.remove();
      this.p5Instance = null;
    }
  }

  protected getFrame(): number {
    if (typeof this.props.frame === 'number') return this.props.frame;
    return typeof this.props.timeSec === 'number' ? Math.round(this.props.timeSec * this.getFps()) : 0;
  }

  protected getFps(): number { return this.props.fps ?? 30; }

  protected getSize(): SketchSize {
    return {
      width: this.props.videoWidth ?? 1920,
      height: this.props.videoHeight ?? 1080,
    };
  }

  private async initSketch(): Promise<void> {
    const container = this.containerRef.current;
    if (!container) return;
    const size = this.getSize();
    const p5Module = await import('p5');
    if(this.dead) return;
    const P5 = (p5Module as any).default ?? (p5Module as any);

    this.p5Instance = new P5((sketch: p5) => {
      sketch.setup = () => {
        if (this.dead) return;
        sketch.createCanvas(size.width, size.height);
        sketch.noLoop();
        sketch.noiseSeed(this.props.seed ?? 0);
        sketch.randomSeed(this.props.seed ?? 0);
        this.setupSketch(sketch, size);
      };

      sketch.draw = () => {
        if(this.dead) return;
        try {
          this.drawFrame(sketch, this.latestFrame, this.latestFps, this.latestSize);
          this.readyResolve();this.drawWaiters.complete();
        } catch(error) {
          this.readyReject(error);this.drawWaiters.fail(error);
        }
      };
    }, container);

    await this.p5Instance?.redraw();
  }

  async seekFrame(frame:number,fps:number):Promise<void> {
    await this.ready;
    if(!this.p5Instance || this.dead) throw new Error('P5 effect disposed');
    this.latestFrame=frame;this.latestFps=fps;
    const completed=this.drawWaiters.next();
    void completed.catch(()=>{});
    let redraw:Promise<unknown>;
    try { redraw=Promise.resolve(this.p5Instance.redraw()).catch(error=>{this.drawWaiters.fail(error);throw error;}); }
    catch(error) { this.drawWaiters.fail(error); redraw=Promise.resolve(); }
    await Promise.all([redraw,completed]);
  }

  cancel():void {
    if(this.dead) return;
    this.dead=true;
    const error=new Error('P5 effect disposed');
    this.readyReject(error);this.drawWaiters.fail(error);
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
