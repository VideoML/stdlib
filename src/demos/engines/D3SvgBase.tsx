import React from 'react';
import * as d3 from 'd3';

export type D3SvgProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  style?: React.CSSProperties;
  className?: string;
  dataEngine?: string;
};

type SvgSize = { width: number; height: number };

export abstract class D3SvgBase<P extends D3SvgProps = D3SvgProps> extends React.Component<P> {
  protected svgRef = React.createRef<SVGSVGElement>();
  private isClient = typeof window !== 'undefined';

  protected abstract renderFrame(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    frame: number,
    fps: number,
    size: SvgSize,
  ): void;

  componentDidMount(): void {
    if (!this.isClient) return;
    this.updateSvg();
  }

  componentDidUpdate(prevProps: Readonly<P>): void {
    if (!this.isClient) return;
    if (
      prevProps.frame !== this.props.frame ||
      prevProps.fps !== this.props.fps ||
      prevProps.videoWidth !== this.props.videoWidth ||
      prevProps.videoHeight !== this.props.videoHeight
    ) {
      this.updateSvg();
    }
  }

  protected getFrame(): number {
    return this.props.frame ?? 0;
  }

  protected getFps(): number {
    return this.props.fps ?? 30;
  }

  protected getSize(): SvgSize {
    return {
      width: this.props.videoWidth ?? 1920,
      height: this.props.videoHeight ?? 1080,
    };
  }

  private updateSvg(): void {
    const svgEl = this.svgRef.current;
    if (!svgEl) return;
    const size = this.getSize();
    svgEl.setAttribute('width', String(size.width));
    svgEl.setAttribute('height', String(size.height));
    const selection = d3.select(svgEl);
    this.renderFrame(selection, this.getFrame(), this.getFps(), size);
  }

  render() {
    const { style, className, dataEngine } = this.props;
    return (
      <svg
        ref={this.svgRef}
        className={className}
        data-engine={dataEngine}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          ...style,
        }}
      />
    );
  }
}
