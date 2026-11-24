import * as THREE from 'three';
import type { Surface } from '@/lib/ink/engine.mjs';

type DensityItem = { surface: Surface; density: number };
type Glyph = { width: number; advance: number; u0: number; u1: number };
type Label = { center: THREE.Vector3; normal: THREE.Vector3; height: number; width: number; glyphs: Glyph[] };
export type DensityLabels = { mesh: THREE.Mesh; update: (camera: THREE.Camera) => void; dispose: () => void };

export function formatInkDensity(value: number) {
  if (value <= 0) return '0';
  if (value < .1) return '<0.1';
  // 반올림으로 점유 또는 발사 조건을 충족한 것처럼 보이지 않게 한다.
  const rounded = Math.round(value * 10) / 10;
  if (value < .5 && rounded >= .5) return '<0.5';
  if (value < 2.5 && rounded >= 2.5) return '<2.5';
  if (value >= 100) return String(Math.floor(value));
  return String(rounded);
}

export function createDensityLabels(items: DensityItem[]): DensityLabels | null {
  if (!items.length) return null;
  const chars = '0123456789.<';
  const cellWidth = 48, cellHeight = 64;
  const canvas = document.createElement('canvas');
  canvas.width = chars.length * cellWidth;
  canvas.height = cellHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = 'bold 46px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#152335';
  ctx.fillStyle = '#ffffff';
  const glyphMap = new Map<string, Glyph>();
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i], x = (i + .5) * cellWidth;
    ctx.strokeText(char, x, 33);
    ctx.fillText(char, x, 33);
    const advance = ctx.measureText(char).width + 1;
    const width = Math.min(cellWidth, advance + 8);
    glyphMap.set(char, { width: width / cellHeight, advance: advance / cellHeight, u0: (x - width / 2) / canvas.width, u1: (x + width / 2) / canvas.width });
  }
  const labels: Label[] = [];
  let glyphCount = 0;
  for (const { surface, density } of items) {
    const glyphs = Array.from(formatInkDensity(density)).map(c => glyphMap.get(c)).filter((g): g is Glyph => !!g);
    if (!glyphs.length) continue;
    const normal = new THREE.Vector3(...surface.normal).normalize();
    const center = new THREE.Vector3(...surface.center).addScaledVector(normal, .028);
    const width = glyphs.reduce((sum, g) => sum + g.advance, 0) + .12;
    const scale = Math.sqrt(surface.area);
    const height = Math.min(.48, scale * 1.02, scale * .94 / width);
    labels.push({ center, normal, height, width, glyphs });
    glyphCount += glyphs.length;
  }
  if (!glyphCount) return null;
  const positions = new Float32Array(glyphCount * 18);
  const uvs = new Float32Array(glyphCount * 12);
  let index = 0;
  for (const label of labels) for (const g of label.glyphs) {
    uvs.set([g.u0, 0, g.u1, 0, g.u1, 1, g.u0, 0, g.u1, 1, g.u0, 1], index);
    index += 12;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(positions, 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .04, depthTest: true, depthWrite: false, side: THREE.FrontSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  const lastRight = new THREE.Vector3(), lastUp = new THREE.Vector3();
  const cameraRight = new THREE.Vector3(), cameraUp = new THREE.Vector3();
  const right = new THREE.Vector3(), up = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  const put = (p: THREE.Vector3, offset: number) => { positions[offset] = p.x; positions[offset + 1] = p.y; positions[offset + 2] = p.z; };
  const update = (camera: THREE.Camera) => {
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    if (lastRight.distanceToSquared(cameraRight) < 1e-7 && lastUp.distanceToSquared(cameraUp) < 1e-7) return;
    lastRight.copy(cameraRight); lastUp.copy(cameraUp);
    let offset = 0;
    for (const label of labels) {
      const { normal, center, height, glyphs, width } = label;
      right.copy(cameraRight).addScaledVector(normal, -cameraRight.dot(normal));
      if (right.lengthSq() < 1e-6) right.crossVectors(cameraUp, normal);
      right.normalize();
      up.crossVectors(normal, right).normalize();
      if (up.dot(cameraUp) < 0) { right.negate(); up.negate(); }
      let cursor = -(width - .12) * height / 2;
      for (const g of glyphs) {
        const x0 = cursor + (g.advance - g.width) * height / 2, x1 = x0 + g.width * height;
        a.copy(center).addScaledVector(right,x0).addScaledVector(up,-height/2);
        b.copy(center).addScaledVector(right,x1).addScaledVector(up,-height/2);
        c.copy(center).addScaledVector(right,x1).addScaledVector(up,height/2);
        d.copy(center).addScaledVector(right,x0).addScaledVector(up,height/2);
        put(a,offset);put(b,offset+3);put(c,offset+6);put(a,offset+9);put(c,offset+12);put(d,offset+15);
        offset += 18;cursor += g.advance * height;
      }
    }
    position.needsUpdate = true;
  };
  return { mesh, update, dispose: () => { geometry.dispose(); material.dispose(); texture.dispose(); } };
}
