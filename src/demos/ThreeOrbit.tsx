import * as THREE from 'three';
import { ThreeSceneBase, type ThreeSceneProps } from './engines/ThreeSceneBase.js';
import { resolveCssVar } from './engines/utils.js';

export type ThreeOrbitProps = ThreeSceneProps & {
  cubeSize?: number;
  overscanX?: number;
  focusX?: number;
};

export class ThreeOrbitComponent extends ThreeSceneBase<ThreeOrbitProps> {
  static defaultProps = {
    dataEngine: 'three',
  };

  private group: THREE.Group | null = null;
  private bodies: THREE.Mesh[] = [];
  private bodyPositions: THREE.Vector3[] = [];
  private bodyVelocities: THREE.Vector3[] = [];
  private initialPositions: THREE.Vector3[] = [];
  private initialVelocities: THREE.Vector3[] = [];
  private dirLight: THREE.DirectionalLight | null = null;
  private pointLight: THREE.PointLight | null = null;

  protected buildScene(size: { width: number; height: number }) {
    const scene = new THREE.Scene();
    const overscanX = this.props.overscanX ?? 0;
    const focusX = this.props.focusX ?? 0.5;

    const camera = new THREE.PerspectiveCamera(60, size.width / size.height, 0.1, 2400);
    camera.position.set(0, 30, 720);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const cubeSize = this.props.cubeSize ?? 160;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.bodies = [];
    this.bodyPositions = [];
    this.bodyVelocities = [];
    const bodyGeo = new THREE.IcosahedronGeometry(cubeSize * 0.48, 1);
    for (let i = 0; i < 3; i += 1) {
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.18,
        metalness: 0.22,
        flatShading: true,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      this.group.add(body);
      this.bodies.push(body);
    }

    const baseOffset = cubeSize * 1.25;
    this.bodyPositions.push(new THREE.Vector3(-baseOffset, 40, -baseOffset * 0.15));
    this.bodyPositions.push(new THREE.Vector3(baseOffset * 0.9, -20, baseOffset * 0.2));
    this.bodyPositions.push(new THREE.Vector3(0, baseOffset * 0.7, -baseOffset * 0.5));

    this.bodyVelocities.push(new THREE.Vector3(0.32, 0.05, -0.22));
    this.bodyVelocities.push(new THREE.Vector3(-0.18, -0.28, 0.12));
    this.bodyVelocities.push(new THREE.Vector3(0.1, 0.3, 0.26));

    this.initialPositions = this.bodyPositions.map(position => position.clone());
    this.initialVelocities = this.bodyVelocities.map(velocity => velocity.clone());

    const overscanScale = 2.2 + overscanX / 400;
    this.group.scale.set(overscanScale, overscanScale, overscanScale);
    this.group.position.set((focusX - 0.5) * size.width * 0.4, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.05);
    dir.position.set(220, 260, 420);
    scene.add(dir);
    this.dirLight = dir;
    const point = new THREE.PointLight(0xffffff, 1.2, 2000);
    point.position.set(-200, 180, 300);
    scene.add(point);
    this.pointLight = point;

    return { scene, camera, renderer };
  }

  protected renderFrame(ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }, frame: number, fps: number) {
    const t = frame / Math.max(1, fps);
    if (this.group) {
      this.group.rotation.y = t * 0.1;
      this.group.rotation.x = Math.sin(t * 0.2) * 0.08;
    }

    // Replay the fixed-step trajectory from its initial state so arbitrary seek order
    // produces the same state as sequential frame evaluation.
    this.bodyPositions = this.initialPositions.map(position => position.clone());
    this.bodyVelocities = this.initialVelocities.map(velocity => velocity.clone());
    for (let step=0; step <= frame && this.bodyPositions.length === 3 && this.bodyVelocities.length === 3; step++) {
      const dt = 1 / Math.max(1, fps);
      const gravity = 10200;
      const softening = 180;
      const positions = this.bodyPositions.map((v) => v.clone());
      const accelerations = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          if (i === j) continue;
          const diff = positions[j].clone().sub(positions[i]);
          const distSq = diff.lengthSq() + softening * softening;
          const accel = diff.multiplyScalar(gravity / Math.pow(distSq, 1.5));
          accelerations[i].add(accel);
        }
      }

      for (let i = 0; i < 3; i += 1) {
        this.bodyVelocities[i].add(accelerations[i].multiplyScalar(dt));
        this.bodyPositions[i].add(this.bodyVelocities[i].clone().multiplyScalar(dt));
      }

      const maxRadius = 260;
      for (let i = 0; i < 3; i += 1) {
        if (this.bodyPositions[i].length() > maxRadius) {
          this.bodyPositions[i].multiplyScalar(maxRadius / this.bodyPositions[i].length());
        }
      }
    }

    this.bodies.forEach((body, idx) => {
      const pos = this.bodyPositions[idx];
      if (pos) {
        body.position.copy(pos);
        body.rotation.x = t * (0.04 + idx * 0.03);
        body.rotation.y = t * (0.06 + idx * 0.04);
      }
    });
    if (this.pointLight) {
      this.pointLight.position.set(Math.cos(t * 0.6) * 300, 180 + Math.sin(t * 0.5) * 120, 280);
    }

    const container = this.containerRef.current;
    if (container) {
      const accent2 = resolveCssVar(container, '--color-accent-2', '#3b82f6');
      this.bodies.forEach((body, idx) => {
        const tint = new THREE.Color(accent2);
        tint.offsetHSL(0.02 * idx, -0.05 * idx, 0.02 * idx);
        (body.material as THREE.MeshStandardMaterial).color = tint;
      });
      if (this.dirLight) {
        // Slightly warm key light keeps the cube readable in dark mode themes.
        this.dirLight.color = new THREE.Color('#ffffff');
      }
    }

    ctx.scene.position.z = 0;
  }
}
