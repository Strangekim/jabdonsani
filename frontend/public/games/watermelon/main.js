// Three.js, Cannon.js는 index.html에서 전역으로 로드됨 (THREE, CANNON)

// 과일 레벨 정의 (0 ~ 10)
const FRUIT_LEVELS = [
  { id: 0, name: '블루베리', score: 1, texture: 'asset/01.blueberry.png' },
  { id: 1, name: '체리', score: 2, texture: 'asset/02.cherry.png' },
  { id: 2, name: '딸기', score: 4, texture: 'asset/03.strawberry.png' },
  { id: 3, name: '오렌지', score: 8, texture: 'asset/04.orange.png' },
  { id: 4, name: '배', score: 16, texture: 'asset/05.pear.png' },
  { id: 5, name: '사과', score: 32, texture: 'asset/06.apple.png' },
  { id: 6, name: '아보카도', score: 64, texture: 'asset/07.avocado.png' },
  { id: 7, name: '복숭아', score: 128, texture: 'asset/08.peech.png' },
  { id: 8, name: '용과', score: 256, texture: 'asset/09.dragonfruit.png' },
  { id: 9, name: '메론', score: 512, texture: 'asset/10.melon.png' },
  { id: 10, name: '수박', score: 1024, texture: 'asset/11.watermelon.png' },
];

const MAX_LEVEL = FRUIT_LEVELS.length - 1;

// DOM 참조
const canvas = document.getElementById('game-canvas');
const scoreText = document.getElementById('score-text');
const maxFruitText = document.getElementById('max-fruit-text');
const dropPositionText = document.getElementById('drop-position-text');
const gameOverLayer = document.getElementById('game-over-layer');
const finalScoreText = document.getElementById('final-score-text');
const restartButton = document.getElementById('restart-button');

const moveForwardButton = document.getElementById('move-forward-button');
const moveBackwardButton = document.getElementById('move-backward-button');
const moveLeftButton = document.getElementById('move-left-button');
const moveRightButton = document.getElementById('move-right-button');
const dropButton = document.getElementById('drop-button');
const viewLeftButton = document.getElementById('view-left-button');
const viewRightButton = document.getElementById('view-right-button');

// Three.js 씬/렌더러/카메라
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

// 라이트
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

// 물리 월드
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// 인형뽑기 기계 크기 (월드 좌표계)
const MACHINE_WIDTH = 4;
const MACHINE_DEPTH = 4;
const MACHINE_HEIGHT = 5.5;

// 드롭 높이 및 이동 단위
const DROP_Y = MACHINE_HEIGHT - 0.5;
const DROP_STEP = 0.4;

// 크기: 2레벨마다 2배가 되도록 조정 (너무 급격한 성장 방지)
const FRUIT_BASE_RADIUS = 0.18;

// 그룹 및 캐시
const machineGroup = new THREE.Group();
scene.add(machineGroup);

const materialsCache = new Map();

// 게임 상태
let fruits = [];
let fruitIdCounter = 1;
let dropX = 0;
let dropZ = 0;
let cameraAngle = Math.PI / 4;
let score = 0;
let maxFruitLevel = -1;
let isGameOver = false;
let lastTime = null;

// 드롭 위치 표시용 구체
const dropperGeometry = new THREE.SphereGeometry(0.12, 16, 16);
const dropperMaterial = new THREE.MeshStandardMaterial({
  color: 0x00c896,
  emissive: 0x002a1f,
  emissiveIntensity: 0.6,
});
const dropperMesh = new THREE.Mesh(dropperGeometry, dropperMaterial);
dropperMesh.castShadow = true;
scene.add(dropperMesh);

// 인형뽑기 기계 생성
function createMachine() {
  // 바닥
  const floorGeometry = new THREE.BoxGeometry(MACHINE_WIDTH, 0.2, MACHINE_DEPTH);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x181b34,
    metalness: 0.2,
    roughness: 0.7,
  });
  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  floorMesh.position.set(0, -0.1, 0);
  floorMesh.receiveShadow = true;
  machineGroup.add(floorMesh);

  const floorShape = new CANNON.Box(
    new CANNON.Vec3(MACHINE_WIDTH / 2, 0.1, MACHINE_DEPTH / 2),
  );
  const floorBody = new CANNON.Body({ mass: 0, shape: floorShape });
  floorBody.position.set(0, -0.1, 0);
  world.addBody(floorBody);

  // 벽 (네 면)
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x242749,
    opacity: 0.95,
    transparent: true,
  });

  const wallThickness = 0.2;
  const wallHeight = MACHINE_HEIGHT;

  const walls = [
    {
      // 앞
      position: [0, wallHeight / 2, -MACHINE_DEPTH / 2],
      size: [MACHINE_WIDTH, wallHeight, wallThickness],
    },
    {
      // 뒤
      position: [0, wallHeight / 2, MACHINE_DEPTH / 2],
      size: [MACHINE_WIDTH, wallHeight, wallThickness],
    },
    {
      // 좌
      position: [-MACHINE_WIDTH / 2, wallHeight / 2, 0],
      size: [wallThickness, wallHeight, MACHINE_DEPTH],
    },
    {
      // 우
      position: [MACHINE_WIDTH / 2, wallHeight / 2, 0],
      size: [wallThickness, wallHeight, MACHINE_DEPTH],
    },
  ];

  walls.forEach((wall) => {
    const [w, h, d] = wall.size;
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    mesh.position.set(...wall.position);
    mesh.castShadow = true;
    machineGroup.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
    const body = new CANNON.Body({ mass: 0, shape });
    body.position.set(wall.position[0], wall.position[1], wall.position[2]);
    world.addBody(body);
  });

  // 상단 프레임 (장식)
  const frameGeometry = new THREE.BoxGeometry(
    MACHINE_WIDTH + 0.4,
    0.2,
    MACHINE_DEPTH + 0.4,
  );
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x00c896,
    metalness: 0.6,
    roughness: 0.3,
    emissive: 0x001a12,
    emissiveIntensity: 0.6,
  });
  const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
  frameMesh.position.set(0, wallHeight + 0.1, 0);
  frameMesh.castShadow = true;
  machineGroup.add(frameMesh);
}

// 렌더러/카메라 크기 조정
function resizeRendererToDisplaySize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

// 쿼터뷰 카메라 업데이트
function updateCamera() {
  const radius = 7;
  const targetY = MACHINE_HEIGHT * 0.7;
  const x = Math.cos(cameraAngle) * radius;
  const z = Math.sin(cameraAngle) * radius;
  camera.position.set(x, targetY, z);
  camera.lookAt(0, targetY / 2, 0);
}

// 과일 반지름: 2레벨마다 2배
function getFruitRadius(level) {
  return FRUIT_BASE_RADIUS * Math.pow(2, level / 2);
}

// 레벨별 텍스처 머티리얼
function loadFruitMaterial(level) {
  if (materialsCache.has(level)) {
    return materialsCache.get(level);
  }
  const info = FRUIT_LEVELS[level];
  const texture = new THREE.TextureLoader().load(info.texture);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.1,
    roughness: 0.6,
  });
  materialsCache.set(level, material);
  return material;
}

// 과일 생성
function spawnFruit(level, x, z, y) {
  const radius = getFruitRadius(level);
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = loadFruitMaterial(level);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({
    mass: 1 * Math.pow(2, level),
    shape,
  });
  body.position.set(x, y, z);
  body.linearDamping = 0.25;
  body.angularDamping = 0.3;
  world.addBody(body);

  const fruit = {
    id: fruitIdCounter++,
    level,
    mesh,
    body,
    isMerging: false,
  };
  fruits.push(fruit);
  updateMaxFruitLevel(level);
}

// 최고 레벨 갱신
function updateMaxFruitLevel(level) {
  if (level > maxFruitLevel) {
    maxFruitLevel = level;
    const info = FRUIT_LEVELS[level];
    maxFruitText.textContent = info.name;
  }
}

// 드롭 위치 업데이트
function updateDropperPosition() {
  dropperMesh.position.set(dropX, DROP_Y, dropZ);
  dropPositionText.textContent = `${dropX.toFixed(1)}, ${dropZ.toFixed(1)}`;
}

function canDrop() {
  return !isGameOver;
}

// 드롭 처리 (현재는 항상 가장 낮은 레벨)
function handleDrop() {
  if (!canDrop()) return;
  const baseLevel = 0;
  spawnFruit(baseLevel, dropX, dropZ, DROP_Y);
}

// 병합 처리
function handleMerge() {
  const removal = new Set();
  const newFruits = [];
  const mergeCenters = [];

  for (let i = 0; i < fruits.length; i++) {
    for (let j = i + 1; j < fruits.length; j++) {
      const a = fruits[i];
      const b = fruits[j];

      if (
        a.level !== b.level ||
        a.level >= MAX_LEVEL ||
        a.isMerging ||
        b.isMerging
      ) {
        continue;
      }

      const posA = a.body.position;
      const posB = b.body.position;
      const dx = posA.x - posB.x;
      const dy = posA.y - posB.y;
      const dz = posA.z - posB.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const radiusA = getFruitRadius(a.level);
      const radiusB = getFruitRadius(b.level);
      const threshold = radiusA + radiusB;

      if (dist > threshold * 0.9) {
        continue;
      }

      // 동일 레벨 충돌 → 상위 과일로 병합
      a.isMerging = true;
      b.isMerging = true;
      removal.add(a.id);
      removal.add(b.id);

      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2 + getFruitRadius(a.level + 1) * 0.5;
      const midZ = (posA.z + posB.z) / 2;
      const newLevel = a.level + 1;

      newFruits.push({ level: newLevel, x: midX, y: midY, z: midZ });
      mergeCenters.push({ x: midX, y: midY, z: midZ, level: newLevel });
    }
  }

  if (removal.size === 0 && newFruits.length === 0) return;

  // 병합되는 과일 제거
  fruits = fruits.filter((fruit) => {
    if (!removal.has(fruit.id)) return true;
    scene.remove(fruit.mesh);
    world.removeBody(fruit.body);
    return false;
  });

  // 새 상위 과일 생성
  newFruits.forEach(({ level, x, y, z }) => {
    spawnFruit(level, x, y, z);
  });

  // 병합 지점 주변 과일 밀어내기
  const pushStrength = 2.2;
  const pushRadiusMultiplier = 3.0;

  mergeCenters.forEach((center) => {
    const centerVec = new CANNON.Vec3(center.x, center.y, center.z);
    const influenceRadius = getFruitRadius(center.level) * pushRadiusMultiplier;

    fruits.forEach((fruit) => {
      if (removal.has(fruit.id)) return;
      const toFruit = fruit.body.position.vsub(centerVec);
      const distance = toFruit.length();
      if (distance === 0 || distance > influenceRadius) return;

      const dir = toFruit.scale(1 / distance);
      const factor = 1 - distance / influenceRadius;
      const impulse = dir.scale(pushStrength * factor);
      fruit.body.applyImpulse(impulse, fruit.body.position);
    });
  });
}

// 필드 밖으로 나가면 게임 종료
function checkOutOfBounds() {
  if (isGameOver) return;
  for (const fruit of fruits) {
    const pos = fruit.body.position;
    const outX = Math.abs(pos.x) > MACHINE_WIDTH / 2 + 0.5;
    const outZ = Math.abs(pos.z) > MACHINE_DEPTH / 2 + 0.5;
    const outY = pos.y > MACHINE_HEIGHT + 0.5;
    if (outX || outZ || outY) {
      endGame();
      return;
    }
  }
}

// 현재 필드 내 과일 점수 기준으로 점수 갱신
function updateScoreFromFruits() {
  score = fruits.reduce((acc, fruit) => {
    return acc + FRUIT_LEVELS[fruit.level].score;
  }, 0);
  scoreText.textContent = score.toString();
}

// 게임 종료 처리
function endGame() {
  isGameOver = true;
  dropButton.disabled = true;
  moveForwardButton.disabled = true;
  moveBackwardButton.disabled = true;
  moveLeftButton.disabled = true;
  moveRightButton.disabled = true;

  const totalScore = fruits.reduce((acc, fruit) => {
    return acc + FRUIT_LEVELS[fruit.level].score;
  }, 0);
  score = totalScore;
  scoreText.textContent = totalScore.toString();
  finalScoreText.textContent = totalScore.toString();
  gameOverLayer.style.display = 'flex';
}

// 게임 리셋
function resetGame() {
  fruits.forEach((fruit) => {
    scene.remove(fruit.mesh);
    world.removeBody(fruit.body);
  });
  fruits = [];
  score = 0;
  maxFruitLevel = -1;
  isGameOver = false;
  scoreText.textContent = '0';
  maxFruitText.textContent = '-';
  gameOverLayer.style.display = 'none';
  dropButton.disabled = false;
  moveForwardButton.disabled = false;
  moveBackwardButton.disabled = false;
  moveLeftButton.disabled = false;
  moveRightButton.disabled = false;
}

// 메인 루프
function animate(timestamp) {
  if (lastTime == null) {
    lastTime = timestamp;
  }
  const deltaMs = timestamp - lastTime;
  lastTime = timestamp;
  const deltaSeconds = deltaMs / 1000;

  resizeRendererToDisplaySize();
  updateCamera();
  updateDropperPosition();

  const fixedTimeStep = 1 / 60;
  const maxSubSteps = 3;
  world.step(fixedTimeStep, deltaSeconds, maxSubSteps);

  fruits.forEach((fruit) => {
    const { mesh, body } = fruit;
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  });

  handleMerge();
  updateScoreFromFruits();
  checkOutOfBounds();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// 드롭 위치 제한
function clampDropPosition() {
  const margin = 0.4;
  const halfWidth = MACHINE_WIDTH / 2 - margin;
  const halfDepth = MACHINE_DEPTH / 2 - margin;
  dropX = Math.max(-halfWidth, Math.min(halfWidth, dropX));
  dropZ = Math.max(-halfDepth, Math.min(halfDepth, dropZ));
}

// 컨트롤 이벤트 연결
moveForwardButton.addEventListener('click', () => {
  dropZ -= DROP_STEP;
  clampDropPosition();
  updateDropperPosition();
});

moveBackwardButton.addEventListener('click', () => {
  dropZ += DROP_STEP;
  clampDropPosition();
  updateDropperPosition();
});

moveLeftButton.addEventListener('click', () => {
  dropX -= DROP_STEP;
  clampDropPosition();
  updateDropperPosition();
});

moveRightButton.addEventListener('click', () => {
  dropX += DROP_STEP;
  clampDropPosition();
  updateDropperPosition();
});

dropButton.addEventListener('click', () => {
  handleDrop();
});

viewLeftButton.addEventListener('click', () => {
  cameraAngle -= Math.PI / 16;
});

viewRightButton.addEventListener('click', () => {
  cameraAngle += Math.PI / 16;
});

restartButton.addEventListener('click', () => {
  resetGame();
});

// 초기화
createMachine();
updateCamera();
updateDropperPosition();
resizeRendererToDisplaySize();

window.addEventListener('resize', () => {
  resizeRendererToDisplaySize();
});

requestAnimationFrame(animate);

