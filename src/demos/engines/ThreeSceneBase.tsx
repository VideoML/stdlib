import React from 'react';
import * as THREE from 'three';
import { resolveCssVar } from './utils.js';

export type ThreeSceneProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  style?: React.CSSProperties;
  className?: string;
  dataEngine?: string;
};

type SceneSize = { width: number; height: number };

type ThreeContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

export abstract class ThreeSceneBase<P extends ThreeSceneProps = ThreeSceneProps> extends React.Component<P> {
  protected containerRef = React.createRef<HTMLDivElement>();
  protected three: ThreeContext | null = null;
  private isClient = typeof window !== 'undefined';

  protected abstract buildScene(size: SceneSize): ThreeContext;
  protected abstract renderFrame(ctx: ThreeContext, frame: number, fps: number, size: SceneSize): void;

  componentDidMount(): void {
    if (!this.isClient) return;
    this.initThree();
  }

  componentDidUpdate(prevProps: Readonly<P>): void {
    if (!this.isClient || !this.three) return;
    const size = this.getSize();
    const sizeChanged =
      prevProps.videoWidth !== this.props.videoWidth || prevProps.videoHeight !== this.props.videoHeight;
    if (sizeChanged) {
      this.three.renderer.setSize(size.width, size.height, false);
      this.three.camera.aspect = size.width / size.height;
      this.three.camera.updateProjectionMatrix();
    }

    if (
      prevProps.frame !== this.props.frame ||
      prevProps.fps !== this.props.fps ||
      prevProps.videoWidth !== this.props.videoWidth ||
      prevProps.videoHeight !== this.props.videoHeight
    ) {
      this.draw();
    }
  }

  componentWillUnmount(): void {
    if (this.three) {
      this.three.scene.traverse(object => {
        const mesh=object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials=Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        materials.forEach(material=>material.dispose());
      });
      this.three.renderer.dispose();
      this.three = null;
    }
  }

  protected getFrame(): number {
    return this.props.frame ?? 0;
  }

  protected getFps(): number {
    return this.props.fps ?? 30;
  }

  protected getSize(): SceneSize {
    return {
      width: this.props.videoWidth ?? 1920,
      height: this.props.videoHeight ?? 1080,
    };
  }

  private initThree(): void {
    const container = this.containerRef.current;
    if (!container) return;
    const size = this.getSize();
    const context = this.buildScene(size);

    const background = resolveCssVar(container, '--color-bg', '#101418');
    context.renderer.setClearColor(new THREE.Color(background), 1);
    context.renderer.setSize(size.width, size.height, false);
    container.innerHTML = '';
    container.appendChild(context.renderer.domElement);

    this.three = context;
    this.draw();
  }

  private draw(): void {
    if (!this.three) return;
    const size = this.getSize();
    this.renderFrame(this.three, this.getFrame(), this.getFps(), size);
    this.three.renderer.render(this.three.scene, this.three.camera);
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
