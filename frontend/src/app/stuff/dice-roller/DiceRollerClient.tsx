'use client';

/**
 * DiceRollerClient — 3D 주사위 굴리기 도구
 *
 * 물리 애니메이션 흐름 (외부 라이브러리 없이 rAF 기반):
 *   P0 pickup  (0 ~ 200ms)   : 위로 솟아오름
 *   P1 fall    (200 ~ 850ms) : 포물선 낙하 + 빠른 스핀
 *   P2 bounce1 (850 ~ 1200ms): 첫 번째 바운스
 *   P3 bounce2 (1200 ~ 1450ms): 두 번째 작은 바운스
 *   P4 rolling (1450 ~ 2200ms): 바닥 굴림 감속
 *   P5 settle  (2200 ~ 3100ms): 목표 면이 위로 오도록 quaternion slerp
 *
 * D10 면 번호 수정:
 *   - buildD10 아래쪽 카이트 와인딩 교정 (법선 외향 보장)
 *   - addFaceNumbers 그룹핑 루프 내부에서 triCentroid.dot(normal) < 0 → negate
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import ToolPageShell from '@/components/stuff/tools/ToolPageShell';
import { recordToolUse } from '@/services/tools.service';
import styles from './DiceRoller.module.css';

/* ── 타입 ──────────────────────────────────────────────── */
type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface DiceConfig {
    label: string;
    sides: number;
    cssColor: string;
    threeColor: number;
    faceTextureSize: number;
    createGeometry: () => THREE.BufferGeometry;
}

/** 각 면의 로컬 법선벡터와 면 번호 */
interface FaceInfo {
    localNormal: THREE.Vector3;
    number: number;
}

/** 물리 굴리기 애니메이션 상태 */
interface RollData {
    startTime: number;
    startY: number;
    angVel: { x: number; y: number; z: number };
    targetQuat: THREE.Quaternion;
    /** P5 진입 시점에 캡처 (null = 아직 미진입) */
    settleStartQuat: THREE.Quaternion | null;
}

/* ── 애니메이션 타임라인 (ms) ─────────────────────────── */
const T1 = 200;   // pickup 완료
const T2 = 850;   // 낙하 완료 (첫 바닥 접촉)
const T3 = 1200;  // 첫 바운스 완료
const T4 = 1450;  // 둘째 바운스 완료
const T5 = 2200;  // 굴림 감속 완료
const T6 = 3100;  // settle 완료 (총 롤 시간)

const PEAK_Y  =  2.2;   /* pickup 정점 y */
const FLOOR_Y = -1.85;  /* 바닥 y */
const UP      = new THREE.Vector3(0, 1, 0);
const CANVAS_SIZE = 300;

/* ── 면 번호 캔버스 텍스처 생성 ────────────────────────── */
function createFaceTexture(num: number): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const fontSize = num >= 10 ? 108 : 140;
    ctx.font         = `900 ${fontSize}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth   = 18;
    ctx.strokeText(String(num), size / 2, size / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(num), size / 2, size / 2);

    return new THREE.CanvasTexture(canvas);
}

/* ── 면 번호 스프라이트 부착 ────────────────────────────── *
 *  geometry의 삼각형들을 외향 법선 기준으로 그룹핑 →          *
 *  각 그룹(=하나의 면)의 중심에 PlaneGeometry 스프라이트 배치  *
 *                                                            *
 *  D10 수정: 그룹핑 루프 내부에서 법선 외향 여부를 확인/교정    *
 *  (triCentroid.dot(normal) < 0 → negate 후 key 계산)        */
type FaceDisposable = { dispose: () => void };

function addFaceNumbers(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    sides: number,
    faceSize: number,
): { disposables: FaceDisposable[]; faces: FaceInfo[] } {
    const nonIdx   = geometry.toNonIndexed();
    const pos      = nonIdx.getAttribute('position');
    const triCount = pos.count / 3;

    const groups = new Map<string, { tris: number[]; normal: THREE.Vector3 }>();

    for (let i = 0; i < triCount; i++) {
        const a = new THREE.Vector3(pos.getX(i * 3),     pos.getY(i * 3),     pos.getZ(i * 3));
        const b = new THREE.Vector3(pos.getX(i * 3 + 1), pos.getY(i * 3 + 1), pos.getZ(i * 3 + 1));
        const c = new THREE.Vector3(pos.getX(i * 3 + 2), pos.getY(i * 3 + 2), pos.getZ(i * 3 + 2));

        const normal = new THREE.Vector3();
        new THREE.Triangle(a, b, c).getNormal(normal);

        /* 외향 법선 보정 — 삼각형 중심과의 dot product 확인
         * D10 아래쪽 카이트처럼 와인딩이 내향인 경우 자동 교정
         * → 동일 면의 두 삼각형이 같은 key를 갖도록 보장 */
        const triCentroid = new THREE.Vector3(
            (a.x + b.x + c.x) / 3,
            (a.y + b.y + c.y) / 3,
            (a.z + b.z + c.z) / 3,
        );
        if (triCentroid.dot(normal) < 0) normal.negate();

        /* 소수점 2자리 반올림 → 공면 삼각형 통합 */
        const key = `${Math.round(normal.x * 100)},${Math.round(normal.y * 100)},${Math.round(normal.z * 100)}`;
        if (!groups.has(key)) groups.set(key, { tris: [], normal: normal.clone() });
        groups.get(key)!.tris.push(i);
    }

    const disposables: FaceDisposable[] = [];
    const faces: FaceInfo[]             = [];
    let faceIndex = 0;

    groups.forEach(({ tris, normal }) => {
        if (faceIndex >= sides) return;

        /* 면 중심점: 해당 면 모든 정점의 평균 */
        const centroid = new THREE.Vector3();
        let vCount = 0;
        tris.forEach((triIdx) => {
            for (let v = 0; v < 3; v++) {
                centroid.x += pos.getX(triIdx * 3 + v);
                centroid.y += pos.getY(triIdx * 3 + v);
                centroid.z += pos.getZ(triIdx * 3 + v);
                vCount++;
            }
        });
        centroid.divideScalar(vCount);

        const faceNum  = faceIndex + 1;
        const texture  = createFaceTexture(faceNum);
        const planeGeo = new THREE.PlaneGeometry(faceSize, faceSize);
        const planeMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.renderOrder = 1;

        const dir = normal.clone().normalize();
        plane.position.copy(centroid).addScaledVector(dir, 0.04);
        plane.lookAt(plane.position.clone().add(dir));

        parent.add(plane);

        faces.push({ localNormal: dir.clone(), number: faceNum });
        disposables.push({
            dispose: () => {
                planeGeo.dispose();
                planeMat.dispose();
                texture.dispose();
                parent.remove(plane);
            },
        });

        faceIndex++;
    });

    nonIdx.dispose(); /* pos 읽기 완료 후 GPU 버퍼 해제 */

    return { disposables, faces };
}

/* ── D10 지오메트리 (오각형 트라페조헤드론, 평면 카이트 면) ──
 *  카이트 면의 4정점 공면 조건: H / h = 5 + 2√5 ≈ 9.472
 *  이 비율에서 법선 그룹핑이 정확히 10개 그룹을 반환합니다.
 *
 *  아래쪽 카이트 와인딩을 B,L0,U1 / B,U1,L1 순서로 수정 →
 *  computeVertexNormals()가 올바른 외향 법선을 생성합니다. */
function buildD10(): THREE.BufferGeometry {
    const n = 5;
    const H = 1.1; /* 극점 높이 */
    const r = 1.1; /* 적도 링 반지름 */
    const h = H / (5 + 2 * Math.sqrt(5)); /* ≈ 0.116 — 공면 조건 */

    const verts: number[] = [];
    const idx:   number[] = [];

    verts.push(0, H, 0); /* 0: 북극 */
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        verts.push(r * Math.cos(a), h, r * Math.sin(a)); /* 1~5: 위쪽 링 */
    }
    for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        verts.push(r * Math.cos(a), -h, r * Math.sin(a)); /* 6~10: 아래쪽 링 (36° 오프셋) */
    }
    verts.push(0, -H, 0); /* 11: 남극 */

    /* 위쪽 카이트 5개 (외향 와인딩) */
    for (let i = 0; i < n; i++) {
        const T = 0, U0 = 1 + i, L0 = 6 + i, U1 = 1 + (i + 1) % n;
        idx.push(T, L0, U0);
        idx.push(T, U1, L0);
    }
    /* 아래쪽 카이트 5개 (수정된 외향 와인딩) */
    for (let i = 0; i < n; i++) {
        const B = 11, L0 = 6 + i, U1 = 1 + (i + 1) % n, L1 = 6 + (i + 1) % n;
        idx.push(B, L0, U1); /* 수정: 이전 B,U1,L0 */
        idx.push(B, U1, L1); /* 수정: 이전 B,L1,U1 */
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

/* ── 주사위 설정 맵 ─────────────────────────────────────── */
const DICE_TYPES: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const DICE_MAP: Record<DiceType, DiceConfig> = {
    d4:  { label: 'D4',  sides: 4,  cssColor: '#818cf8', threeColor: 0x818cf8, faceTextureSize: 0.80, createGeometry: () => new THREE.TetrahedronGeometry(1.4) },
    d6:  { label: 'D6',  sides: 6,  cssColor: '#3b82f6', threeColor: 0x3b82f6, faceTextureSize: 0.82, createGeometry: () => new THREE.BoxGeometry(1.75, 1.75, 1.75) },
    d8:  { label: 'D8',  sides: 8,  cssColor: '#10b981', threeColor: 0x10b981, faceTextureSize: 0.68, createGeometry: () => new THREE.OctahedronGeometry(1.5) },
    d10: { label: 'D10', sides: 10, cssColor: '#f59e0b', threeColor: 0xf59e0b, faceTextureSize: 0.52, createGeometry: buildD10 },
    d12: { label: 'D12', sides: 12, cssColor: '#f43f5e', threeColor: 0xf43f5e, faceTextureSize: 0.58, createGeometry: () => new THREE.DodecahedronGeometry(1.35) },
    d20: { label: 'D20', sides: 20, cssColor: '#a855f7', threeColor: 0xa855f7, faceTextureSize: 0.48, createGeometry: () => new THREE.IcosahedronGeometry(1.4) },
};

/* ── 컴포넌트 ─────────────────────────────────────────── */
export default function DiceRollerClient() {
    const canvasRef     = useRef<HTMLCanvasElement>(null);
    const rafRef        = useRef<number>(0);
    const sceneRef      = useRef<THREE.Scene | null>(null);
    const meshRef       = useRef<THREE.Mesh | null>(null);
    const faceInfoRef   = useRef<FaceInfo[]>([]);
    const rollDataRef   = useRef<RollData | null>(null);
    const isRollingRef  = useRef(false);
    const isDraggingRef = useRef(false);

    /* rollCallbackRef — 매 렌더마다 최신 state 캡처
     * [] 클로저 내부의 포인터 핸들러가 항상 최신 diceType에 접근 */
    const rollCallbackRef = useRef<(vx: number, vy: number, vz: number) => void>(() => {});

    const [diceType, setDiceType] = useState<DiceType>('d6');
    const [result, setResult]     = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [history, setHistory]   = useState<Array<{ type: DiceType; value: number }>>([]);

    /* ── rollCallbackRef 갱신 (매 렌더) ───────────────────── */
    rollCallbackRef.current = (vx: number, vy: number, vz: number) => {
        if (isRollingRef.current || isRolling) return;
        const mesh = meshRef.current;
        if (!mesh) return;

        const cfg   = DICE_MAP[diceType];
        const value = Math.floor(Math.random() * cfg.sides) + 1;
        const faces = faceInfoRef.current;

        /* value에 해당하는 면의 로컬 법선 → world UP 정렬 쿼터니언 */
        const found       = faces.find((f) => f.number === value);
        const localNormal = found ? found.localNormal.clone() : UP.clone();

        const alignQuat  = new THREE.Quaternion().setFromUnitVectors(localNormal, UP);
        const randY      = new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * Math.PI * 2);
        /* randY 먼저 → alignQuat: 면을 위로 정렬한 뒤 Y축 무작위 회전 */
        const targetQuat = new THREE.Quaternion().multiplyQuaternions(randY, alignQuat);

        const rollData: RollData = {
            startTime:       performance.now(),
            startY:          mesh.position.y,
            angVel:          { x: vx, y: vy, z: vz },
            targetQuat,
            settleStartQuat: null,
        };

        isRollingRef.current = true;
        rollDataRef.current  = rollData;
        setResult(null);
        setIsRolling(true);

        setTimeout(() => {
            setResult(value);
            setIsRolling(false);
            setHistory((prev) => [{ type: diceType, value }, ...prev].slice(0, 10));
            recordToolUse('dice-roller').catch(() => {});
        }, T6 + 100);
    };

    /* ── Three.js 초기화 + 포인터 이벤트 등록 (마운트 1회) ── */
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        /* 씬·카메라·렌더러 */
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.set(0, 0.6, 5.4);
        camera.lookAt(0, -0.5, 0);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

        /* 조명 */
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 1.2);
        key.position.set(3, 5, 4);
        key.castShadow = true;
        key.shadow.mapSize.set(512, 512);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 0.28);
        rim.position.set(-4, -3, -3);
        scene.add(rim);

        /* 바닥 서클 — 주사위가 굴러가다 멈추는 표면 */
        const floorGeo = new THREE.CircleGeometry(3.5, 48);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x1e2030,
            roughness: 0.9,
            metalness: 0,
            transparent: true,
            opacity: 0.55,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x    = -Math.PI / 2;
        floor.position.y    = FLOOR_Y - 0.01;
        floor.receiveShadow = true;
        scene.add(floor);

        /* 렌더 루프 */
        const loop = (now: number) => {
            rafRef.current = requestAnimationFrame(loop);
            const mesh = meshRef.current;

            if (mesh) {
                if (isRollingRef.current && rollDataRef.current) {
                    const rd      = rollDataRef.current;
                    const elapsed = now - rd.startTime;
                    const { x: ax, y: ay, z: az } = rd.angVel;

                    if (elapsed <= T1) {
                        /* P0: pickup — 위로 솟아오름 (ease-in) */
                        const p    = elapsed / T1;
                        const ease = p * p;
                        mesh.position.y  = rd.startY + ease * (PEAK_Y - rd.startY);
                        mesh.rotation.x += ax * 0.0015;
                        mesh.rotation.y += ay * 0.0015;
                        mesh.rotation.z += az * 0.0010;

                    } else if (elapsed <= T2) {
                        /* P1: fall — 포물선 낙하, 빠른 스핀 */
                        const p    = (elapsed - T1) / (T2 - T1);
                        const ease = p * p;
                        mesh.position.y  = PEAK_Y + ease * (FLOOR_Y - PEAK_Y);
                        const spin = 1 - p * 0.25;
                        mesh.rotation.x += ax * 0.006 * spin;
                        mesh.rotation.y += ay * 0.006 * spin;
                        mesh.rotation.z += az * 0.004 * spin;

                    } else if (elapsed <= T3) {
                        /* P2: 첫 번째 바운스 (sin 포물선) */
                        const p = (elapsed - T2) / (T3 - T2);
                        mesh.position.y  = FLOOR_Y + Math.sin(p * Math.PI) * 0.65;
                        const spin = 0.75 - p * 0.35;
                        mesh.rotation.x += ax * 0.004 * spin;
                        mesh.rotation.y += ay * 0.004 * spin;
                        mesh.rotation.z += az * 0.003 * spin;

                    } else if (elapsed <= T4) {
                        /* P3: 두 번째 작은 바운스 */
                        const p = (elapsed - T3) / (T4 - T3);
                        mesh.position.y  = FLOOR_Y + Math.sin(p * Math.PI) * 0.22;
                        const spin = 0.40 - p * 0.25;
                        mesh.rotation.x += ax * 0.002 * spin;
                        mesh.rotation.y += ay * 0.002 * spin;
                        mesh.rotation.z += az * 0.0015 * spin;

                    } else if (elapsed <= T5) {
                        /* P4: 바닥 굴림 감속 (ease-out squared) */
                        const p = (elapsed - T4) / (T5 - T4);
                        mesh.position.y  = FLOOR_Y;
                        const decay = Math.pow(1 - p, 2);
                        mesh.rotation.x += ax * 0.0015 * decay;
                        mesh.rotation.y += ay * 0.0015 * decay;
                        mesh.rotation.z += az * 0.001  * decay;

                    } else if (elapsed <= T6) {
                        /* P5: settle — 목표 쿼터니언으로 slerp (ease-out cubic)
                         * 첫 진입 시 현재 quaternion을 캡처하여 안정적으로 보간 */
                        if (!rd.settleStartQuat) {
                            rd.settleStartQuat = mesh.quaternion.clone();
                        }
                        const p    = (elapsed - T5) / (T6 - T5);
                        const ease = 1 - Math.pow(1 - p, 3);
                        mesh.position.y = FLOOR_Y;
                        mesh.quaternion.slerpQuaternions(rd.settleStartQuat, rd.targetQuat, ease);

                    } else {
                        /* 완료 */
                        mesh.position.y = FLOOR_Y;
                        mesh.quaternion.copy(rd.targetQuat);
                        isRollingRef.current = false;
                        rollDataRef.current  = null;
                    }

                } else if (!isDraggingRef.current && !isRollingRef.current) {
                    /* 유휴: 느린 자동 회전 */
                    mesh.rotation.y += 0.007;
                    mesh.rotation.x += 0.002;
                }
            }

            renderer.render(scene, camera);
        };
        rafRef.current = requestAnimationFrame(loop);

        /* ── 포인터 인터랙션 ─────────────────────────────── */
        let isDragging = false;
        let prevX = 0, prevY = 0;
        let velX  = 0, velY  = 0;
        let totalDist    = 0;
        let lastMoveTime = 0;

        canvas.style.cursor      = 'grab';
        canvas.style.touchAction = 'none';

        const onPointerDown = (e: PointerEvent) => {
            if (isRollingRef.current) return;
            isDragging = true;
            isDraggingRef.current = true;
            prevX = e.clientX;
            prevY = e.clientY;
            velX = 0; velY = 0; totalDist = 0;
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - prevX;
            const dy = e.clientY - prevY;

            const mesh = meshRef.current;
            if (mesh) {
                mesh.rotation.y += dx * 0.013;
                mesh.rotation.x += dy * 0.013;
            }

            velX = dx; velY = dy;
            lastMoveTime = performance.now();
            totalDist   += Math.hypot(dx, dy);
            prevX = e.clientX;
            prevY = e.clientY;
        };

        const onPointerUp = () => {
            if (!isDragging) return;
            isDragging = false;
            isDraggingRef.current = false;
            canvas.style.cursor = 'grab';

            if (isRollingRef.current) return;

            const timeSinceMove = performance.now() - lastMoveTime;
            const speed = Math.hypot(velX, velY);

            if (totalDist < 8) {
                /* 짧은 탭/클릭 → 랜덤 굴리기 */
                rollCallbackRef.current(
                    (Math.random() - 0.5) * 65,
                    (Math.random() - 0.5) * 65,
                    (Math.random() - 0.5) * 45,
                );
            } else if (speed > 3 && timeSinceMove < 160) {
                /* 플릭 → 드래그 속도를 회전 에너지로 변환 */
                rollCallbackRef.current(velY * 6, velX * 6, (Math.random() - 0.5) * 20);
            }
            /* 느린 릴리즈 → 그냥 멈춤 (의도적 회전 허용) */
        };

        canvas.addEventListener('pointerdown',   onPointerDown);
        canvas.addEventListener('pointermove',   onPointerMove);
        canvas.addEventListener('pointerup',     onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);

        return () => {
            cancelAnimationFrame(rafRef.current);
            renderer.dispose();
            floorGeo.dispose();
            floorMat.dispose();
            canvas.removeEventListener('pointerdown',   onPointerDown);
            canvas.removeEventListener('pointermove',   onPointerMove);
            canvas.removeEventListener('pointerup',     onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 주사위 타입 변경 → 메시 교체 ────────────────────── */
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;

        const cfg = DICE_MAP[diceType];
        const geo = cfg.createGeometry();
        const mat = new THREE.MeshStandardMaterial({
            color: cfg.threeColor,
            roughness: 0.18,
            metalness: 0.18,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.position.y = 0;
        meshRef.current = mesh;

        /* 엣지 라인 오버레이 */
        const edgesGeo = new THREE.EdgesGeometry(geo, 15);
        const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
        mesh.add(new THREE.LineSegments(edgesGeo, edgesMat));

        /* 면 번호 스프라이트 부착 */
        const { disposables: faceDisposables, faces } = addFaceNumbers(
            mesh, geo, cfg.sides, cfg.faceTextureSize,
        );
        faceInfoRef.current = faces;

        scene.add(mesh);
        isRollingRef.current = false;
        rollDataRef.current  = null;

        return () => {
            scene.remove(mesh);
            if (meshRef.current === mesh) {
                meshRef.current     = null;
                faceInfoRef.current = [];
            }
            faceDisposables.forEach((d) => d.dispose());
            geo.dispose();
            mat.dispose();
            edgesGeo.dispose();
            edgesMat.dispose();
        };
    }, [diceType]);

    /* 버튼 굴리기 (접근성 — 키보드 사용자 등) */
    const handleRollBtn = useCallback(() => {
        rollCallbackRef.current(
            (Math.random() - 0.5) * 65,
            (Math.random() - 0.5) * 65,
            (Math.random() - 0.5) * 45,
        );
    }, []);

    const cfg   = DICE_MAP[diceType];
    const isMax = result === cfg.sides;
    const isMin = result === 1 && cfg.sides > 1;

    return (
        <ToolPageShell
            name="주사위 굴리기"
            icon="casino"
            description="D4부터 D20까지 다양한 다면체 주사위를 3D로 굴려보세요."
        >
            {/* 주사위 종류 선택 */}
            <div className={styles.diceSelector}>
                {DICE_TYPES.map((type) => {
                    const c = DICE_MAP[type];
                    return (
                        <button
                            key={type}
                            className={`${styles.diceBtn} ${diceType === type ? styles.diceBtnActive : ''}`}
                            style={
                                diceType === type
                                    ? ({ '--active-color': c.cssColor } as React.CSSProperties)
                                    : undefined
                            }
                            onClick={() => { setDiceType(type); setResult(null); }}
                            disabled={isRolling}
                        >
                            {c.label}
                        </button>
                    );
                })}
            </div>

            {/* 3D 캔버스 + 인터랙션 힌트 */}
            <div className={styles.canvasWrapper}>
                <canvas
                    ref={canvasRef}
                    className={styles.canvas}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    aria-label={`${cfg.label} 주사위. 클릭하거나 드래그하여 굴리세요.`}
                />
                <p className={styles.canvasHint}>
                    <span className="material-symbols-outlined" aria-hidden="true">touch_app</span>
                    탭하거나 드래그하여 굴리기 · 빠르게 튕기면 굴러갑니다
                </p>
            </div>

            {/* 결과 */}
            <div className={styles.resultArea}>
                {isRolling && <p className={styles.rollingText}>굴리는 중...</p>}
                {!isRolling && result === null && (
                    <p className={styles.promptText}>주사위를 클릭하거나 튕겨보세요</p>
                )}
                {!isRolling && result !== null && (
                    <div
                        className={`${styles.resultBox} ${isMax ? styles.resultMax : ''}`}
                        style={{ '--dice-color': cfg.cssColor } as React.CSSProperties}
                    >
                        <span className={styles.resultNum}>{result}</span>
                        {isMax && <span className={styles.resultBadge}>최고!</span>}
                        {!isMax && isMin && (
                            <span className={`${styles.resultBadge} ${styles.resultBadgeLow}`}>최저</span>
                        )}
                    </div>
                )}
            </div>

            {/* 버튼 굴리기 */}
            <button
                className={styles.rollBtn}
                onClick={handleRollBtn}
                disabled={isRolling}
                style={{ '--dice-color': cfg.cssColor } as React.CSSProperties}
            >
                {isRolling ? (
                    <>
                        <span className={`material-symbols-outlined ${styles.spinIcon}`} aria-hidden="true">
                            progress_activity
                        </span>
                        굴리는 중...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined" aria-hidden="true">casino</span>
                        {cfg.label} 굴리기!
                    </>
                )}
            </button>

            {/* 최근 기록 */}
            {history.length > 0 && (
                <section className={styles.history}>
                    <div className={styles.historyHeader}>
                        <h2 className={styles.historyTitle}>최근 기록</h2>
                        <button type="button" className={styles.clearBtn} onClick={() => setHistory([])}>
                            지우기
                        </button>
                    </div>
                    <div className={styles.historyList}>
                        {history.map((item, i) => {
                            const c = DICE_MAP[item.type];
                            return (
                                <div
                                    key={i}
                                    className={styles.historyItem}
                                    style={{ '--dice-color': c.cssColor } as React.CSSProperties}
                                >
                                    <span className={styles.historyLabel}>{c.label}</span>
                                    <span className={styles.historyValue}>{item.value}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </ToolPageShell>
    );
}
