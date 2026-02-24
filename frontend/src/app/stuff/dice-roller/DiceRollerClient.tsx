'use client';

/**
 * DiceRollerClient — 3D 주사위 굴리기 도구
 *
 * Three.js로 D4/D6/D8/D10/D12/D20 다면체를 렌더링합니다.
 *
 * 인터랙션:
 *  - 클릭(짧은 탭): 랜덤 굴리기
 *  - 드래그(마우스/터치): 주사위 직접 회전
 *  - 빠른 드래그 후 릴리즈(플릭): 속도 기반 굴리기
 *
 * 면 번호:
 *  - 법선 벡터 기준으로 면 그룹핑 → 각 면 중심에 캔버스 텍스처 스프라이트 배치
 *
 * 구조:
 *  - rollCallbackRef: 매 렌더마다 최신 state를 캡처 → 오래된 클로저 문제 해결
 *  - useEffect([]): 렌더러·씬·조명·루프·포인터 이벤트 초기화 (1회)
 *  - useEffect([diceType]): 주사위 타입 변경 시 메시 교체
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
    /** 면 번호 스프라이트 크기 (Three.js 단위) */
    faceTextureSize: number;
    createGeometry: () => THREE.BufferGeometry;
}

/* ── 면 번호 캔버스 텍스처 생성 ─────────────────────────── */
function createFaceTexture(num: number): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const fontSize = num >= 10 ? 108 : 140;
    ctx.font = `900 ${fontSize}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* 외곽선 — 어두운 다이스 색상과 대비 */
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 18;
    ctx.strokeText(String(num), size / 2, size / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(num), size / 2, size / 2);

    return new THREE.CanvasTexture(canvas);
}

/* ── 면 번호 스프라이트 부착 ────────────────────────────── *
 *  geometry의 삼각형들을 법선 벡터 기준으로 그룹핑 →
 *  각 그룹(= 하나의 면)의 중심점에 PlaneGeometry 스프라이트 배치 */
type FaceDisposable = { dispose: () => void };

function addFaceNumbers(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    sides: number,
    faceSize: number
): FaceDisposable[] {
    /* 비인덱스 버전으로 변환 — 삼각형별 독립 정점 접근 */
    const nonIdx = geometry.toNonIndexed();
    const pos = nonIdx.getAttribute('position');
    const triCount = pos.count / 3;

    /* 삼각형 → 법선 키로 그룹핑 */
    const groups = new Map<string, { tris: number[]; normal: THREE.Vector3 }>();

    for (let i = 0; i < triCount; i++) {
        const a = new THREE.Vector3(pos.getX(i * 3), pos.getY(i * 3), pos.getZ(i * 3));
        const b = new THREE.Vector3(pos.getX(i * 3 + 1), pos.getY(i * 3 + 1), pos.getZ(i * 3 + 1));
        const c = new THREE.Vector3(pos.getX(i * 3 + 2), pos.getY(i * 3 + 2), pos.getZ(i * 3 + 2));

        const normal = new THREE.Vector3();
        new THREE.Triangle(a, b, c).getNormal(normal);

        /* 소수점 2자리 반올림으로 동일 면 삼각형 통합 */
        const key = `${Math.round(normal.x * 100)},${Math.round(normal.y * 100)},${Math.round(normal.z * 100)}`;
        if (!groups.has(key)) groups.set(key, { tris: [], normal: normal.clone() });
        groups.get(key)!.tris.push(i);
    }

    nonIdx.dispose();

    const disposables: FaceDisposable[] = [];
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

        const texture = createFaceTexture(faceIndex + 1);
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

        /* 면 위에서 법선 방향으로 살짝 띄워서 z-fighting 방지 */
        const dir = normal.clone().normalize();
        plane.position.copy(centroid).addScaledVector(dir, 0.04);
        plane.lookAt(plane.position.clone().add(dir));

        parent.add(plane);

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

    return disposables;
}

/* ── D10 지오메트리 (오각형 트라페조헤드론, 평면 카이트 면) ──
 *  카이트 면의 4정점이 완전 공면(coplanar)이 되려면:
 *  H / h = 5 + 2√5 ≈ 9.472
 *  이 비율에서 법선 그룹핑이 정확히 10개 그룹을 반환합니다. */
function buildD10(): THREE.BufferGeometry {
    const n = 5;
    const H = 1.1; /* 극점 높이 */
    const r = 1.1; /* 적도 링 반지름 */
    const h = H / (5 + 2 * Math.sqrt(5)); /* ≈ 0.116 — 공면 조건 */

    const verts: number[] = [];
    const idx: number[] = [];

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

    /* 위쪽 카이트 5개 */
    for (let i = 0; i < n; i++) {
        const T = 0, U0 = 1 + i, L0 = 6 + i, U1 = 1 + (i + 1) % n;
        idx.push(T, L0, U0);
        idx.push(T, U1, L0);
    }
    /* 아래쪽 카이트 5개 */
    for (let i = 0; i < n; i++) {
        const B = 11, L0 = 6 + i, U1 = 1 + (i + 1) % n, L1 = 6 + (i + 1) % n;
        idx.push(B, U1, L0);
        idx.push(B, L1, U1);
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
    d4: {
        label: 'D4', sides: 4, cssColor: '#818cf8', threeColor: 0x818cf8,
        faceTextureSize: 0.80,
        createGeometry: () => new THREE.TetrahedronGeometry(1.4),
    },
    d6: {
        label: 'D6', sides: 6, cssColor: '#3b82f6', threeColor: 0x3b82f6,
        faceTextureSize: 0.82,
        createGeometry: () => new THREE.BoxGeometry(1.75, 1.75, 1.75),
    },
    d8: {
        label: 'D8', sides: 8, cssColor: '#10b981', threeColor: 0x10b981,
        faceTextureSize: 0.68,
        createGeometry: () => new THREE.OctahedronGeometry(1.5),
    },
    d10: {
        label: 'D10', sides: 10, cssColor: '#f59e0b', threeColor: 0xf59e0b,
        faceTextureSize: 0.52,
        createGeometry: buildD10,
    },
    d12: {
        label: 'D12', sides: 12, cssColor: '#f43f5e', threeColor: 0xf43f5e,
        faceTextureSize: 0.58,
        createGeometry: () => new THREE.DodecahedronGeometry(1.35),
    },
    d20: {
        label: 'D20', sides: 20, cssColor: '#a855f7', threeColor: 0xa855f7,
        faceTextureSize: 0.48,
        createGeometry: () => new THREE.IcosahedronGeometry(1.4),
    },
};

const CANVAS_SIZE = 300;
const ROLL_DURATION = 2000; /* ms */

/* ── 컴포넌트 ─────────────────────────────────────────── */
export default function DiceRollerClient() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const sceneRef = useRef<THREE.Scene | null>(null);

    /* 롤 애니메이션 제어 ref — rAF 루프 내에서 직접 읽음 */
    const isRollingRef = useRef(false);
    const rollStartRef = useRef(0);
    const angVelRef = useRef({ x: 0, y: 0, z: 0 });

    /* rollCallbackRef — 매 렌더마다 최신 state 캡처
     * 포인터 이벤트 핸들러([] 클로저 내부)에서 최신 diceType을 사용할 수 있게 함 */
    const rollCallbackRef = useRef<(vx: number, vy: number, vz: number) => void>(() => {});

    /* React 상태 */
    const [diceType, setDiceType] = useState<DiceType>('d6');
    const [result, setResult] = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [history, setHistory] = useState<Array<{ type: DiceType; value: number }>>([]);

    /* rollCallbackRef 갱신 — 매 렌더 실행, 최신 diceType/isRolling 캡처 */
    rollCallbackRef.current = (vx: number, vy: number, vz: number) => {
        if (isRollingRef.current || isRolling) return;

        const sides = DICE_MAP[diceType].sides;
        const value = Math.floor(Math.random() * sides) + 1;

        setResult(null);
        setIsRolling(true);

        isRollingRef.current = true;
        rollStartRef.current = performance.now();
        angVelRef.current = { x: vx, y: vy, z: vz };

        setTimeout(() => {
            setResult(value);
            setIsRolling(false);
            setHistory((prev) => [{ type: diceType, value }, ...prev].slice(0, 10));
            recordToolUse('dice-roller').catch(() => {});
        }, ROLL_DURATION + 150);
    };

    /* ── Three.js 초기화 + 포인터 이벤트 등록 (마운트 시 1회) ── */
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        /* 씬·카메라·렌더러 */
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.z = 4.8;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(CANVAS_SIZE, CANVAS_SIZE);

        /* 조명 */
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 1.2);
        key.position.set(3, 5, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 0.28);
        rim.position.set(-4, -3, -3);
        scene.add(rim);

        /* 렌더 루프 */
        const loop = (now: number) => {
            rafRef.current = requestAnimationFrame(loop);
            const mesh = scene.children.find((c) => c.type === 'Mesh') as THREE.Mesh | undefined;
            if (mesh) {
                if (isRollingRef.current) {
                    const t = Math.min((now - rollStartRef.current) / ROLL_DURATION, 1);
                    const decay = Math.pow(2, -9 * t); /* easeOutExpo */
                    mesh.rotation.x += angVelRef.current.x * decay * 0.05;
                    mesh.rotation.y += angVelRef.current.y * decay * 0.05;
                    mesh.rotation.z += angVelRef.current.z * decay * 0.05;
                    if (t >= 1) isRollingRef.current = false;
                } else if (!isDraggingRef.current) {
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
        const isDraggingRef = { current: false }; /* rAF 루프 접근용 로컬 ref */
        let prevX = 0, prevY = 0;
        let velX = 0, velY = 0;
        let totalDist = 0;
        let lastMoveTime = 0;

        canvas.style.cursor = 'grab';
        canvas.style.touchAction = 'none'; /* 브라우저 기본 터치 제스처 방지 */

        const onPointerDown = (e: PointerEvent) => {
            if (isRollingRef.current) return;
            isDragging = true;
            isDraggingRef.current = true;
            prevX = e.clientX;
            prevY = e.clientY;
            velX = 0; velY = 0;
            totalDist = 0;
            canvas.setPointerCapture(e.pointerId); /* 캔버스 밖으로 나가도 추적 */
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - prevX;
            const dy = e.clientY - prevY;

            /* 드래그 → 메시 직접 회전 */
            const mesh = scene.children.find((c) => c.type === 'Mesh') as THREE.Mesh | undefined;
            if (mesh) {
                mesh.rotation.y += dx * 0.013;
                mesh.rotation.x += dy * 0.013;
            }

            velX = dx;
            velY = dy;
            lastMoveTime = performance.now();
            totalDist += Math.hypot(dx, dy);
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
                    (Math.random() - 0.5) * 45
                );
            } else if (speed > 3 && timeSinceMove < 160) {
                /* 플릭 → 드래그 속도를 회전 에너지로 변환 */
                rollCallbackRef.current(velY * 6, velX * 6, (Math.random() - 0.5) * 20);
            }
            /* 느린 릴리즈 → 그냥 멈춤 (의도적 회전 허용) */
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);

        return () => {
            cancelAnimationFrame(rafRef.current);
            renderer.dispose();
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 주사위 타입 변경 → 메시 교체 ────────────────────── */
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;

        const config = DICE_MAP[diceType];
        const geo = config.createGeometry();
        const mat = new THREE.MeshStandardMaterial({
            color: config.threeColor,
            roughness: 0.18,
            metalness: 0.18,
        });
        const mesh = new THREE.Mesh(geo, mat);

        /* 엣지 라인 오버레이 */
        const edgesGeo = new THREE.EdgesGeometry(geo, 15);
        const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
        mesh.add(new THREE.LineSegments(edgesGeo, edgesMat));

        /* 면 번호 스프라이트 부착 */
        const faceDisposables = addFaceNumbers(mesh, geo, config.sides, config.faceTextureSize);

        scene.add(mesh);
        isRollingRef.current = false;

        return () => {
            scene.remove(mesh);
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
            (Math.random() - 0.5) * 45
        );
    }, []);

    const config = DICE_MAP[diceType];
    const isMax = result === config.sides;
    const isMin = result === 1 && config.sides > 1;

    return (
        <ToolPageShell
            name="주사위 굴리기"
            icon="casino"
            description="D4부터 D20까지 다양한 다면체 주사위를 3D로 굴려보세요."
        >
            {/* 주사위 종류 선택 */}
            <div className={styles.diceSelector}>
                {DICE_TYPES.map((type) => {
                    const cfg = DICE_MAP[type];
                    return (
                        <button
                            key={type}
                            className={`${styles.diceBtn} ${diceType === type ? styles.diceBtnActive : ''}`}
                            style={
                                diceType === type
                                    ? ({ '--active-color': cfg.cssColor } as React.CSSProperties)
                                    : undefined
                            }
                            onClick={() => { setDiceType(type); setResult(null); }}
                            disabled={isRolling}
                        >
                            {cfg.label}
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
                    aria-label={`${config.label} 주사위. 클릭하거나 드래그하여 굴리세요.`}
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
                        style={{ '--dice-color': config.cssColor } as React.CSSProperties}
                    >
                        <span className={styles.resultNum}>{result}</span>
                        {isMax && <span className={styles.resultBadge}>최고!</span>}
                        {!isMax && isMin && (
                            <span className={`${styles.resultBadge} ${styles.resultBadgeLow}`}>최저</span>
                        )}
                    </div>
                )}
            </div>

            {/* 버튼 굴리기 (접근성) */}
            <button
                className={styles.rollBtn}
                onClick={handleRollBtn}
                disabled={isRolling}
                style={{ '--dice-color': config.cssColor } as React.CSSProperties}
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
                        {config.label} 굴리기!
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
