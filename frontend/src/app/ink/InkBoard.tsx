'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GameView, Preview, Surface, Vec3 } from '@/lib/ink/engine.mjs';
import styles from './Ink.module.css';
import { createDensityLabels } from './InkDensityLabels';
import type { DensityLabels } from './InkDensityLabels';

type Props = { view: GameView; preview: Preview | null; source: string | null; target: string | null; hidden: boolean; showTraps: boolean; onPick: (id: string) => void };
type SceneHandles = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; controls: OrbitControls; layer: THREE.Group; pickMesh: THREE.Mesh | null; faces: string[]; densityLabels: DensityLabels | null };
const WHITE = new THREE.Color('#f2eee4');
const INK = new THREE.Color('#b5b3bb');

function colorOf(view: GameView, owner: number | null, density: number) {
  if (owner === null) return WHITE.clone();
  const c = new THREE.Color(view.players[owner].color);
  const strength = density < .5 ? .12 : Math.min(.91, .57 + density * .075);
  return WHITE.clone().lerp(c, strength);
}

function surfaceMesh(surfaces: Surface[], color: (p: Surface) => THREE.Color, offset = 0, overlay = false) {
  const positions: number[] = [], colors: number[] = [], normals: number[] = [], faces: string[] = [];
  for (const p of surfaces) {
    const c = color(p);
    for (let k = 1; k < p.vertices.length - 1; k++) {
      for (const v of [p.vertices[0], p.vertices[k], p.vertices[k + 1]]) {
        positions.push(v[0] + p.normal[0] * offset, v[1] + p.normal[1] * offset, v[2] + p.normal[2] * offset);
        colors.push(c.r, c.g, c.b);
        normals.push(...p.normal);
      }
      faces.push(p.id);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const material = overlay
    ? new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: .82, depthWrite: false })
    : new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .88 });
  const mesh = new THREE.Mesh(geometry, material);
  if (overlay) mesh.renderOrder = 2;
  return { mesh, faces };
}

function disposeLayer(group: THREE.Group) {
  for (const child of [...group.children]) {
    child.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(m => m.dispose());
      }
    });
    group.remove(child);
  }
}

function line(points: Vec3[], color: string, closed = false) {
  const coords = points.map(p => new THREE.Vector3(...p));
  if (closed && coords.length) coords.push(coords[0].clone());
  const g = new THREE.BufferGeometry().setFromPoints(coords);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .95, depthTest: false }));
  l.renderOrder = 5;
  return l;
}
function outline(p: Surface, color: string) {
  return line(p.vertices.map(v => v.map((n,i) => n + p.normal[i] * .025) as Vec3), color, true);
}

export default function InkBoard({ view, preview, source, target, hidden, showTraps, onPick }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const handles = useRef<SceneHandles | null>(null);
  const callback = useRef(onPick);
  const [error, setError] = useState('');
  const [showDensity, setShowDensity] = useState(true);
  useEffect(() => { callback.current = onPick; }, [onPick]);
  const radius = view.config.radius;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setError('이 브라우저에서 WebGL을 실행할 수 없습니다. 하드웨어 가속을 확인해 주세요.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor('#151d2b');
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, .1, Math.max(150, radius * 12));
    camera.position.set(radius * 1.38, radius * 1.72, radius * 1.58);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - .06;
    controls.minDistance = radius * .35;
    controls.maxDistance = radius * 5;
    controls.update();
    const ambient = new THREE.HemisphereLight('#ffffff', '#54617a', 2.15);
    const sun = new THREE.DirectionalLight('#ffffff', 2.3);
    sun.position.set(-radius, radius * 2, radius);
    scene.add(ambient, sun);
    const layer = new THREE.Group();
    scene.add(layer);
    const state: SceneHandles = { scene, camera, renderer, controls, layer, pickMesh: null, faces: [], densityLabels: null };
    handles.current = state;
    const resize = () => {
      const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    let down: { x: number; y: number } | null = null;
    const ray = new THREE.Raycaster();
    const pointerDown = (e: PointerEvent) => { down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null; };
    const pointerUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || !state.pickMesh) { down = null; return; }
      down = null;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1, -(e.clientY-rect.top)/rect.height*2+1), camera);
      const hit = ray.intersectObject(state.pickMesh, false)[0];
      if (hit && hit.faceIndex != null) {
        const id = state.faces[hit.faceIndex];
        if (id) callback.current(id);
      }
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    let frame = 0;
    const tick = () => { controls.update(); camera.updateMatrixWorld(); state.densityLabels?.update(camera); renderer.render(scene,camera); frame = requestAnimationFrame(tick); };
    tick();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      controls.dispose(); disposeLayer(layer); state.densityLabels?.dispose(); renderer.dispose(); renderer.domElement.remove();
      handles.current = null;
    };
  }, [radius]);

  useEffect(() => {
    const h = handles.current;
    if (!h) return;
    disposeLayer(h.layer);
    if (h.densityLabels) { h.scene.remove(h.densityLabels.mesh); h.densityLabels.dispose(); h.densityLabels = null; }
    const surfaceById = new Map(view.surfaces.map(p => [p.id,p]));
    const changes = new Map((preview?.ok ? preview.affected : []).map(p => [p.id,p]));
    const covered = new Set(preview?.ok ? preview.covered : []);
    const base = surfaceMesh(view.surfaces, p => covered.has(p.id) ? INK.clone() : colorOf(view, p.owner, p.density));
    h.pickMesh = base.mesh; h.faces = base.faces; h.layer.add(base.mesh);
    const altered = view.surfaces.filter(p => changes.has(p.id));
    if (altered.length && !hidden) {
      const overlay = surfaceMesh(altered, p => {
        const c = changes.get(p.id)!;
        return colorOf(view,c.owner,c.density).lerp(new THREE.Color('#ffffff'),.13);
      }, .012,true);
      h.layer.add(overlay.mesh);
    }
    if (preview?.ok && preview.buildSurfaces.length && !hidden) {
      h.layer.add(surfaceMesh(preview.buildSurfaces, () => new THREE.Color('#8ad9e5'), .005, true).mesh);
    }
    if (!hidden) {
      for (const p of view.surfaces) if (showTraps && p.ownTrap) h.layer.add(outline(p,'#bf76ff'));
      if (showTraps && preview?.ok && preview.ghost) {
        const p = surfaceById.get(preview.ghost);
        if (p) h.layer.add(outline(p,'#bf76ff'));
      }
      if (source) { const p = surfaceById.get(source); if (p) h.layer.add(outline(p,'#f5cf4b')); }
      if (target) { const p = surfaceById.get(target); if (p) h.layer.add(outline(p,'#ffffff')); }
      if (preview?.ok && preview.path.length > 1) h.layer.add(line(preview.path,view.players[view.active].color));
    }
    if (showDensity && (!hidden || view.finished)) {
      const items = view.surfaces.flatMap(p => {
        if (covered.has(p.id)) return [];
        const change = changes.get(p.id);
        const density = change?.density ?? p.density;
        return density > 0 || change ? [{ surface: p, density }] : [];
      });
      h.densityLabels = createDensityLabels(items);
      if (h.densityLabels) { h.scene.add(h.densityLabels.mesh); h.camera.updateMatrixWorld(); h.densityLabels.update(h.camera); }
    }
    for (const p of view.players) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(.22,.33,32),new THREE.MeshBasicMaterial({color:p.color,side:THREE.DoubleSide,depthTest:false}));
      ring.rotation.x = -Math.PI/2;ring.position.set(p.base[0],.025,p.base[2]);ring.renderOrder=4;h.layer.add(ring);
    }
  }, [view, preview, source, target, hidden, showTraps, showDensity, radius]);

  const resetCamera = () => {
    const h=handles.current;if(!h)return;
    h.camera.position.set(radius*1.38,radius*1.72,radius*1.58);h.controls.target.set(0,0,0);h.controls.update();
  };
  const topCamera = () => {
    const h=handles.current;if(!h)return;
    h.camera.position.set(0,radius*2.85,.001);h.controls.target.set(0,0,0);h.controls.update();
  };
  return <div className={styles.board}>
    <div ref={host} className={styles.canvas} aria-label="입체 영토 게임 보드" />
    {error && <div className={styles.boardError}>{error}</div>}
    <div className={styles.cameraTools}>
      <button type="button" aria-pressed={showDensity} className={showDensity?styles.cameraActive:undefined} onClick={()=>setShowDensity(v=>!v)}>농도 숫자 {showDensity?'ON':'OFF'}</button>
      <button type="button" onClick={topCamera}>위에서 보기</button>
      <button type="button" onClick={resetCamera}>시점 초기화</button>
    </div>
    <div className={styles.boardHint}>드래그 회전 · 휠 확대 · 숫자 = 잉크 농도</div>
  </div>;
}
