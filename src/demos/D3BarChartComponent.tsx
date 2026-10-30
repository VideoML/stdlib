import React from 'react';
import * as d3 from 'd3';
import { D3SvgBase, type D3SvgProps } from './engines/D3SvgBase.js';
import { resolveCssVar } from './engines/utils.js';

export type D3BarChartProps = D3SvgProps & {
  valuesA?: number[];
  valuesB?: number[];
  padding?: number;
  barRadius?: number;
  accent?: string;
  muted?: string;
  showBackground?: boolean;
};

export class D3BarChartComponent extends D3SvgBase<D3BarChartProps> {
  static defaultProps = {
    dataEngine: 'd3',
  };

  renderFrame(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    frame: number,
    fps: number,
    size: { width: number; height: number },
  ): void {
    const valuesA = this.props.valuesA ?? [4, 7, 5, 8, 6, 3];
    const valuesB = this.props.valuesB ?? [6, 3, 9, 4, 7, 5];
    const padding = this.props.padding ?? 140;
    const barRadius = this.props.barRadius ?? 18;
    const svgNode = svg.node();
    const hostEl = (svgNode as any) as HTMLElement | null;
    const accent = this.props.accent ?? resolveCssVar(hostEl, '--color-accent', '#4f46e5');
    const muted = this.props.muted ?? resolveCssVar(hostEl, '--color-surface-strong', '#2a333b');
    const bgColor = resolveCssVar(hostEl, '--color-bg', '#101418');
    const showBackground = this.props.showBackground ?? true;

    const cycleFrames = Math.max(1, Math.round(fps * 4));
    const localFrame = frame % cycleFrames;
    const phase = (localFrame / cycleFrames) * Math.PI * 2;
    const t = (Math.sin(phase) + 1) / 2;

    const data = valuesA.map((value, idx) => value + (valuesB[idx % valuesB.length] - value) * t);
    const width = size.width;
    const height = size.height;

    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    const xScale = d3
      .scaleBand<number>()
      .domain(d3.range(data.length))
      .range([0, innerWidth])
      .padding(0.2);

    const maxValue = Math.max(
      d3.max(valuesA) ?? 1,
      d3.max(valuesB) ?? 1,
    );
    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([innerHeight, 0]);

    const root = svg
      .selectAll('g.chart-root')
      .data([null])
      .join('g')
      .attr('class', 'chart-root')
      .attr('transform', `translate(${padding}, ${padding})`);

    const bgRect = svg.selectAll('rect.chart-bg').data(showBackground ? [null] : []);
    bgRect.exit().remove();
    const bgJoined = bgRect
      .join('rect')
      .attr('class', 'chart-bg')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', bgColor);
    // Ensure the background is behind all chart elements.
    bgJoined.lower();

    const bars = root.selectAll('rect.bar').data(data);

    bars
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (_: number, idx: number) => xScale(idx) ?? 0)
      .attr('y', (value: number) => yScale(value))
      .attr('width', xScale.bandwidth())
      .attr('height', (value: number) => innerHeight - yScale(value))
      .attr('rx', barRadius)
      .attr('fill', accent);

    root
      .selectAll('rect.base')
      .data([null])
      .join('rect')
      .attr('class', 'base')
      .attr('x', 0)
      .attr('y', innerHeight - 8)
      .attr('width', innerWidth)
      .attr('height', 8)
      .attr('rx', 6)
      .attr('fill', muted);
  }
}
