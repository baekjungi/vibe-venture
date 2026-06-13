import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const canvas = document.getElementById("game");
const ui = {
  hp: document.getElementById("hp"),
  maxHp: document.getElementById("maxHp"),
  level: document.getElementById("level"),
  xp: document.getElementById("xp"),
  nextXp: document.getElementById("nextXp"),
  atk: document.getElementById("atk"),
  time: document.getElementById("time"),
  quest: document.getElementById("quest"),
  enemyCount: document.getElementById("enemyCount"),
  onlineCount: document.getElementById("onlineCount"),
  zone: document.getElementById("zone"),
  msg: document.getElementById("msg"),
  over: document.getElementById("gameOver"),
  overTitle: document.getElementById("gameOverTitle"),
  overDesc: document.getElementById("gameOverDesc"),
  restart: document.getElementById("restartBtn")
};

const WORLD_SIZE = 520;
const PLAY_RADIUS = 230;
const DUNGEON_CENTER = new THREE.Vector3(0, 0, 330);
const PORTAL_POS = new THREE.Vector3(-8, 0, -170);
const state = {
  hp: 200,
  maxHp: 200,
  atk: 28,
  level: 1,
  xp: 0,
  nextXp: 45,
  timer: 60 * 14,
  questStep: 0,
  kills: 0,
  gameEnded: false,
  zone: "field",
  lastAttackAt: 0,
  lastNetworkAt: 0,
  scanPulse: 0,
  skillCooldown: 0,
  skillFlash: 0,
  isFlying: false,
  flyHeight: 0,
  wingPhase: 0,
  playerId: null,
  playerName: `Daeva-${Math.floor(Math.random() * 9000 + 1000)}`,
  onlineFlare: 0,
};
const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`);
const remotePlayers = new Map();

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08111f, 0.0021);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 30, 35);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const hemi = new THREE.HemisphereLight(0xc7dbff, 0x1a1208, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3d0, 1.45);
sun.position.set(90, 165, -65);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -230;
sun.shadow.camera.right = 230;
sun.shadow.camera.top = 230;
sun.shadow.camera.bottom = -230;
scene.add(sun);
const moon = new THREE.DirectionalLight(0x82b3ff, 0.4);
moon.position.set(-120, 100, 100);
scene.add(moon);

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    topColor: { value: new THREE.Color(0x3b6eaf) },
    bottomColor: { value: new THREE.Color(0x081420) },
    offset: { value: 40 },
    exponent: { value: 0.82 }
  },
  vertexShader: `varying vec3 v; void main(){ vec4 w=modelMatrix*vec4(position,1.0); v=w.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 v; void main(){ float h=normalize(v+offset).y; float t=max(pow(max(h,0.0),exponent),0.0); gl_FragColor=vec4(mix(bottomColor, topColor, t), 1.0); }`
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(760, 42, 24), skyMat));

const starsGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(3600 * 3);
for (let i = 0; i < 3600; i++) {
  const r = 640 + Math.random() * 90;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI * 0.54;
  starPos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
  starPos[i * 3 + 1] = Math.cos(phi) * r;
  starPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
}
starsGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ size: 1.25, color: 0xd7e6ff, transparent: true, opacity: 0.82 }));
scene.add(stars);

const terrainGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE + 260, 210, 250);
const terrainPos = terrainGeo.attributes.position;
const terrainColors = [];
function heightNoise(x, z) {
  const base = Math.sin(x * 0.032) * 5 + Math.cos(z * 0.028) * 4.5 + Math.sin((x + z) * 0.018) * 7;
  const mountains = Math.max(0, (Math.abs(z + 180) - 110) * 0.12);
  const dungeonLift = Math.max(0, 1 - Math.abs(z - 330) / 95) * 18;
  return base - mountains + dungeonLift;
}
for (let i = 0; i < terrainPos.count; i++) {
  const x = terrainPos.getX(i);
  const z = terrainPos.getY(i);
  const dist = Math.sqrt(x * x + (z - 60) * (z - 60));
  const rim = Math.max(0, (dist - 190) / 120);
  const h = heightNoise(x, z) - rim * 24;
  terrainPos.setZ(i, h);
  const color = h > 11 ? new THREE.Color(0x646d79) : h < -3 ? new THREE.Color(0x645c4a) : new THREE.Color(0x315f39);
  terrainColors.push(color.r, color.g, color.b);
}
terrainGeo.setAttribute("color", new THREE.Float32BufferAttribute(terrainColors, 3));
terrainGeo.rotateX(-Math.PI / 2);
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02 }));
terrain.receiveShadow = true;
scene.add(terrain);

const terrainRay = new THREE.Raycaster();
function terrainHeight(x, z) {
  terrainRay.set(new THREE.Vector3(x, 240, z), new THREE.Vector3(0, -1, 0));
  const hit = terrainRay.intersectObject(terrain, false);
  return hit[0] ? hit[0].point.y : 0;
}

const fieldLake = new THREE.Mesh(
  new THREE.CircleGeometry(42, 60),
  new THREE.MeshPhysicalMaterial({ color: 0x17374d, roughness: 0.04, transmission: 0.28, transparent: true, opacity: 0.87, metalness: 0.08 })
);
fieldLake.rotation.x = -Math.PI / 2;
fieldLake.position.set(58, -1.6, -35);
scene.add(fieldLake);

function addTree(x, z, scale = 1) {
  const y = terrainHeight(x, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.36 * scale, 0.5 * scale, 4 * scale, 8), new THREE.MeshStandardMaterial({ color: 0x4b3220, roughness: 0.96 }));
  trunk.position.set(x, y + 2 * scale, z);
  trunk.castShadow = true;
  scene.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(2.8 * scale, 6.2 * scale, 10), new THREE.MeshStandardMaterial({ color: 0x275b2e, roughness: 0.9 }));
  crown.position.set(x, y + 6.5 * scale, z);
  crown.castShadow = true;
  scene.add(crown);
}
for (let i = 0; i < 280; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 48 + Math.random() * 178;
  addTree(Math.cos(a) * r, Math.sin(a) * r + 35, 0.8 + Math.random() * 0.6);
}

function addRock(x, z, s) {
  const y = terrainHeight(x, z);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), new THREE.MeshStandardMaterial({ color: 0x6d7278, roughness: 1 }));
  rock.position.set(x, y + s * 0.45, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}
for (let i = 0; i < 220; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 18 + Math.random() * 212;
  addRock(Math.cos(a) * r, Math.sin(a) * r + 55, 0.7 + Math.random() * 2.4);
}

function addBuilding(x, z, w, h, d, color, roofColor) {
  const y = terrainHeight(x, z);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04 }));
  base.position.set(x, y + h / 2, z);
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.8, h * 0.7, 4), new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.84 }));
  roof.position.set(x, y + h + h * 0.35, z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);
}
addBuilding(-18, -15, 12, 10, 10, 0x43324b, 0x8367a7);
addBuilding(18, -20, 13, 13, 12, 0x374757, 0x688bb2);
addBuilding(-24, 22, 11, 10, 11, 0x5d4834, 0xa07653);
addBuilding(20, 18, 11, 9, 11, 0x3a4c37, 0x6e965c);
addBuilding(0, 28, 16, 9, 10, 0x4a4051, 0x896fa7);

const dungeonGate = new THREE.Mesh(
  new THREE.TorusGeometry(5.5, 0.75, 20, 52),
  new THREE.MeshStandardMaterial({ color: 0x5e58d1, emissive: 0x28246e, emissiveIntensity: 2.4, roughness: 0.12, metalness: 0.7 })
);
dungeonGate.position.set(PORTAL_POS.x, terrainHeight(PORTAL_POS.x, PORTAL_POS.z) + 8, PORTAL_POS.z);
dungeonGate.castShadow = true;
scene.add(dungeonGate);
const dungeonDisk = new THREE.Mesh(
  new THREE.CircleGeometry(4.7, 40),
  new THREE.MeshBasicMaterial({ color: 0x9ae1ff, transparent: true, opacity: 0.65 })
);
dungeonDisk.position.set(PORTAL_POS.x, terrainHeight(PORTAL_POS.x, PORTAL_POS.z) + 8, PORTAL_POS.z + 0.12);
scene.add(dungeonDisk);

function createPlayerAvatar(color = 0x2a55cc) {
  const avatar = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.85, emissive: 0x274099, emissiveIntensity: 0.18 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.35, metalness: 0.9, emissive: 0x274099, emissiveIntensity: 0.12 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xddd4c8, roughness: 0.55, metalness: 0.05 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd5b04a, roughness: 0.16, metalness: 0.94, emissive: 0xaa7722, emissiveIntensity: 0.55 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xdbe8ff, roughness: 0.42, metalness: 0.1, emissive: 0x88a9ff, emissiveIntensity: 0.34, transparent: true, opacity: 0.9, side: THREE.DoubleSide });

  function shadow(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

  avatar.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 1.6, 12), bodyMat))).position.set(-0.4, -2.05, 0);
  avatar.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 1.6, 12), bodyMat))).position.set(0.4, -2.05, 0);
  avatar.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.46, 0.86), darkMat))).position.set(-0.4, -3.0, 0.12);
  avatar.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.46, 0.86), darkMat))).position.set(0.4, -3.0, 0.12);

  avatar.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.86, 1.0), bodyMat))).position.set(0, -0.42, 0);
  avatar.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, 0.08), new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x66ccff, emissiveIntensity: 2.2, roughness: 0.08 }))).position.set(0, -0.35, 0.52);
  avatar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.72, 0.34, 16), goldMat)).position.set(0, -1.3, 0);

  for (const side of [-1, 1]) {
    const shoulder = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), bodyMat));
    shoulder.position.set(side * 1.08, 0.14, 0);
    avatar.add(shoulder);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.55), goldMat);
    fin.position.set(side * 1.08, -0.26, 0);
    avatar.add(fin);
  }

  avatar.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 1.14, 10), bodyMat))).position.set(-0.94, -0.78, 0);
  avatar.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 1.14, 10), bodyMat))).position.set(0.94, -0.78, 0);
  avatar.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.58, 0.5), darkMat))).position.set(-0.94, -1.58, 0);
  avatar.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.58, 0.5), darkMat))).position.set(0.94, -1.58, 0);

  avatar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.32, 10), skinMat)).position.set(0, 0.46, 0);
  avatar.add(shadow(new THREE.Mesh(new THREE.SphereGeometry(0.54, 14, 12), skinMat))).position.set(0, 1.06, 0);
  avatar.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: 0x2b1a08, roughness: 0.86 }))).position.set(0, 1.16, 0);
  avatar.add(new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.06, 8, 32), goldMat)).position.set(0, 1.06, 0).rotation.x = Math.PI / 2;
  avatar.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00aaff, emissiveIntensity: 3, roughness: 0, metalness: 1 }))).position.set(0, 1.12, 0.52);
  avatar.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x88ddff }))).position.set(-0.19, 1.08, 0.48);
  avatar.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x88ddff }))).position.set(0.19, 1.08, 0.48);

  const wings = new THREE.Group();
  function createWing(side) {
    const wing = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const shape = new THREE.Shape();
      const len = 1.5 + i * 0.23;
      const wid = 0.5 + i * 0.05;
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(wid * 0.5, len * 0.35, wid * 0.25, len);
      shape.quadraticCurveTo(0, len + wid * 0.08, -wid * 0.25, len);
      shape.quadraticCurveTo(-wid * 0.5, len * 0.35, 0, 0);
      const feather = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), wingMat);
      feather.position.set(side * (i * 0.58 + 0.25), -i * 0.08, 0);
      feather.rotation.z = side * (Math.PI * 0.08 + i * 0.07);
      feather.rotation.x = -0.22;
      wing.add(feather);
    }
    const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 3.9, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8aa0d5, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.35 }));
    quill.rotation.z = side * (Math.PI / 2 - 0.32);
    quill.position.set(side * 1.55, -0.46, 0);
    wing.add(quill);
    wing.position.set(side * 0.88, 0.12, -0.32);
    wing.rotation.z = side * 0.28;
    wing.userData.side = side;
    return wing;
  }
  wings.add(createWing(-1));
  wings.add(createWing(1));
  wings.position.set(0, -0.08, -0.5);
  avatar.add(wings);

  const sword = new THREE.Group();
  sword.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.05), new THREE.MeshStandardMaterial({ color: 0xbfdcff, emissive: 0x5e9bff, emissiveIntensity: 1.2, roughness: 0.05, metalness: 0.95 }))).position.y = 1.1;
  sword.add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.14), goldMat));
  sword.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.75, 10), new THREE.MeshStandardMaterial({ color: 0x1b0f08, roughness: 0.82 }))).position.y = -0.42;
  sword.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), goldMat)).position.y = -0.83;
  sword.position.set(1.12, -1.65, 0.3);
  sword.rotation.z = -0.2;
  avatar.add(sword);

  const aura = new THREE.PointLight(0x5588ff, 0.72, 10);
  aura.position.set(0, 0.8, 0);
  avatar.add(aura);

  avatar.userData.wings = wings;
  avatar.userData.sword = sword;
  avatar.userData.aura = aura;
  return avatar;
}

const player = createPlayerAvatar(0x2756d2);
player.position.set(0, terrainHeight(0, 18) + 2.3, 18);
scene.add(player);

const trail = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.7), new THREE.MeshBasicMaterial({ color: 0x8ecfff, transparent: true, opacity: 0, side: THREE.DoubleSide }));
trail.rotation.x = -Math.PI / 2;
scene.add(trail);
const burstRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.45, 48), new THREE.MeshBasicMaterial({ color: 0xa0baff, transparent: true, opacity: 0, side: THREE.DoubleSide }));
burstRing.rotation.x = -Math.PI / 2;
scene.add(burstRing);
const scanRing = new THREE.Mesh(new THREE.RingGeometry(2, 2.4, 64), new THREE.MeshBasicMaterial({ color: 0x90c2ff, transparent: true, opacity: 0, side: THREE.DoubleSide }));
scanRing.rotation.x = -Math.PI / 2;
scene.add(scanRing);

const npc = new THREE.Group();
npc.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.5), new THREE.MeshStandardMaterial({ color: 0x40bfd6, emissive: 0x104454, metalness: 0.45, roughness: 0.28 })));
const npcHead = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.95, 1.1), new THREE.MeshStandardMaterial({ color: 0x92f2ff, emissive: 0x335e6e, metalness: 0.35, roughness: 0.22 }));
npcHead.position.y = 1.58;
npc.add(npcHead);
const npcEye = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.15, 0.08), new THREE.MeshBasicMaterial({ color: 0x00ffee }));
npcEye.position.set(0, 1.62, 0.56);
npc.add(npcEye);
npc.position.set(-24, terrainHeight(-24, -8) + 1.2, -8);
scene.add(npc);
const npcRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 14, 48), new THREE.MeshBasicMaterial({ color: 0x86fcff }));
npcRing.rotation.x = Math.PI / 2;
npcRing.position.set(npc.position.x, npc.position.y + 3.1, npc.position.z);
scene.add(npcRing);

const enemies = [];
function createEnemy(type, x, z) {
  const group = new THREE.Group();
  const isBoss = type === "boss";
  if (isBoss) {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(3, 1), new THREE.MeshStandardMaterial({ color: 0x8c1730, emissive: 0x380918, roughness: 0.34, metalness: 0.48 }));
    core.castShadow = true;
    group.add(core);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x210008, roughness: 0.6 }));
      horn.position.set(side * 1.2, 2.4, 0);
      horn.rotation.z = side * 0.5;
      horn.castShadow = true;
      group.add(horn);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3300 }));
    eye.position.set(0, 1.0, 2.6);
    group.add(eye);
    const aura = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.14, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.55 }));
    aura.rotation.x = Math.PI / 2;
    aura.position.y = -1.5;
    group.add(aura);
    group.userData.aura = aura;
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 1.4), new THREE.MeshStandardMaterial({ color: 0x7d9355, emissive: 0x1a2a08, metalness: 0.45, roughness: 0.55 }));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), new THREE.MeshStandardMaterial({ color: 0x92ab64, emissive: 0x222808, metalness: 0.38, roughness: 0.45 }));
    head.position.y = 1.3;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
    eye.position.set(0, 1.38, 0.46);
    body.castShadow = true;
    head.castShadow = true;
    group.add(body, head, eye);
  }
  group.position.set(x, terrainHeight(x, z) + (isBoss ? 3 : 1.2), z);
  scene.add(group);
  enemies.push({
    mesh: group,
    type,
    hp: isBoss ? 780 : 150,
    maxHp: isBoss ? 780 : 150,
    atk: isBoss ? 28 : 12,
    speed: isBoss ? 3.6 : 2.9,
    lastHitAt: 0,
    alive: true,
    wind: Math.random() * 20,
    zone: z > 220 ? "dungeon" : "field"
  });
}
for (let i = 0; i < 20; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 42 + Math.random() * 165;
  createEnemy("mob", Math.cos(a) * r, Math.sin(a) * r + 35);
}
for (let i = 0; i < 10; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 18 + Math.random() * 60;
  createEnemy("mob", DUNGEON_CENTER.x + Math.cos(a) * r, DUNGEON_CENTER.z + Math.sin(a) * r);
}

function say(text) { ui.msg.textContent = text; }
function updateQuestText() {
  if (state.questStep === 0) ui.quest.textContent = "R-7과 대화(E)";
  else if (state.questStep === 1) ui.quest.textContent = `필드 자동병기 처치 (${state.kills}/8)`;
  else if (state.questStep === 2) ui.quest.textContent = "북쪽 포털로 이동해 던전 보스 처치";
  else ui.quest.textContent = "Hollow 해방 완료";
}
function gainXp(value) {
  state.xp += value;
  while (state.xp >= state.nextXp) {
    state.xp -= state.nextXp;
    state.level += 1;
    state.nextXp = Math.floor(state.nextXp * 1.35);
    state.maxHp += 28;
    state.hp = state.maxHp;
    state.atk += 6;
    say(`레벨 업 Lv.${state.level}! ATK +6 · MaxHP +28`);
  }
}
function endGame(title, desc) {
  if (state.gameEnded) return;
  state.gameEnded = true;
  ui.over.classList.remove("hidden");
  ui.overTitle.textContent = title;
  ui.overDesc.textContent = desc;
}
function removeEnemy(enemy) {
  enemy.alive = false;
  scene.remove(enemy.mesh);
  gainXp(enemy.type === "boss" ? 180 : 28);
  if (state.questStep === 1 && enemy.zone === "field" && enemy.type !== "boss") {
    state.kills += 1;
    if (state.kills >= 8) {
      state.questStep = 2;
      say("북쪽 폐허의 포털이 활성화되었습니다. 던전으로 진입하세요!");
    }
  }
  if (state.questStep === 2 && enemy.type === "boss") {
    state.questStep = 3;
    endGame("승리", "던전의 고대 자동인형을 쓰러뜨렸습니다.");
  }
}
ui.restart.addEventListener("click", () => location.reload());

function syncRemotePlayers(players) {
  const visibleIds = new Set();
  players.forEach((p) => {
    if (!state.playerId || p.id === state.playerId) return;
    visibleIds.add(p.id);
    let remote = remotePlayers.get(p.id);
    if (!remote) {
      const avatar = createPlayerAvatar(p.color || 0x6699ff);
      scene.add(avatar);
      remote = { avatar };
      remotePlayers.set(p.id, remote);
    }
    remote.avatar.visible = p.zone === state.zone;
    remote.avatar.position.set(p.x, p.y, p.z);
    remote.avatar.rotation.y = p.ry;
    remote.avatar.userData.aura.intensity = 0.4 + (p.flare || 0) * 0.5;
    remote.avatar.userData.wings.children[0].rotation.z = -0.28 + (p.wing || 0);
    remote.avatar.userData.wings.children[1].rotation.z = 0.28 - (p.wing || 0);
  });
  for (const [id, remote] of remotePlayers.entries()) {
    if (!visibleIds.has(id)) {
      scene.remove(remote.avatar);
      remotePlayers.delete(id);
    }
  }
  ui.onlineCount.textContent = `${visibleIds.size + 1}`;
}

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "welcome") {
    state.playerId = msg.id;
    syncRemotePlayers(msg.players || []);
  }
  if (msg.type === "players") {
    syncRemotePlayers(msg.players || []);
  }
});

let last = performance.now();
function animate(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!state.gameEnded) update(dt, now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function currentHeight(x, z) {
  return terrainHeight(x, z) + 2.3 + state.flyHeight;
}
function setZoneVisuals() {
  const dungeon = state.zone === "dungeon";
  scene.fog.density = dungeon ? 0.0048 : 0.0021;
  ui.zone.textContent = dungeon ? "던전" : "필드";
}

function update(dt, t) {
  state.timer = Math.max(0, state.timer - dt);
  if (state.timer <= 0) endGame("시간 초과", "자정 의식이 완료되었습니다.");

  if (keys["m"]) { state.scanPulse = 1; keys["m"] = false; }
  if (keys["f"]) { state.isFlying = !state.isFlying; keys["f"] = false; say(state.isFlying ? "날개 전개" : "착지"); }
  if (keys["q"] && state.skillCooldown <= 0) {
    state.skillCooldown = 6;
    state.skillFlash = 1;
    state.onlineFlare = 1;
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.zone !== state.zone) continue;
      if (enemy.mesh.position.distanceTo(player.position) < 9) {
        enemy.hp -= Math.floor(state.atk * 2.4);
        if (enemy.hp <= 0) removeEnemy(enemy);
      }
    }
    say("신성 폭발 발동!");
    keys["q"] = false;
  }

  const move = new THREE.Vector3();
  const speed = keys["shift"] ? 16 : 9;
  if (keys["w"]) move.z -= 1;
  if (keys["s"]) move.z += 1;
  if (keys["a"]) move.x -= 1;
  if (keys["d"]) move.x += 1;
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    const next = player.position.clone().add(move);
    const zoneRadius = state.zone === "field" ? PLAY_RADIUS : 95;
    const center = state.zone === "field" ? new THREE.Vector3(0, 0, 40) : DUNGEON_CENTER;
    const dist = Math.hypot(next.x - center.x, next.z - center.z);
    if (dist < zoneRadius) {
      player.position.x = next.x;
      player.position.z = next.z;
      player.rotation.y = Math.atan2(move.x, move.z);
    }
  }

  state.flyHeight = THREE.MathUtils.clamp(state.flyHeight + (state.isFlying ? dt * 7 : -dt * 6), 0, 10);
  player.position.y = currentHeight(player.position.x, player.position.z);

  state.wingPhase += dt * (state.isFlying ? 5 : 2);
  const wingOffset = Math.sin(state.wingPhase) * (state.isFlying ? 0.55 : 0.18);
  player.userData.wings.children[0].rotation.z = -0.28 + wingOffset;
  player.userData.wings.children[1].rotation.z = 0.28 - wingOffset;
  player.userData.wings.rotation.y = state.isFlying ? 0.5 : 0;
  player.userData.sword.rotation.x = THREE.MathUtils.lerp(player.userData.sword.rotation.x, 0, dt * 8);
  player.userData.aura.intensity = 0.7 + Math.sin(t * 3) * 0.18 + state.onlineFlare * 0.4;
  state.onlineFlare = Math.max(0, state.onlineFlare - dt * 1.6);

  const npcDist = player.position.distanceTo(npc.position);
  if (state.questStep === 0 && npcDist < 4.4 && keys["e"]) {
    state.questStep = 1;
    say("R-7: 필드의 자동병기 8기를 처치한 뒤 북쪽 포털로 가세요!");
    keys["e"] = false;
  }

  const portalDist = player.position.distanceTo(new THREE.Vector3(PORTAL_POS.x, player.position.y, PORTAL_POS.z));
  if (state.questStep >= 1 && portalDist < 8 && keys["e"]) {
    if (state.zone === "field") {
      state.zone = "dungeon";
      player.position.set(DUNGEON_CENTER.x, currentHeight(DUNGEON_CENTER.x, DUNGEON_CENTER.z - 55), DUNGEON_CENTER.z - 55);
      say("던전으로 진입했습니다.");
      const hasBoss = enemies.some((e) => e.alive && e.type === "boss");
      if (!hasBoss) createEnemy("boss", DUNGEON_CENTER.x, DUNGEON_CENTER.z + 8);
    } else {
      state.zone = "field";
      player.position.set(PORTAL_POS.x + 12, currentHeight(PORTAL_POS.x + 12, PORTAL_POS.z + 16), PORTAL_POS.z + 16);
      say("필드로 복귀했습니다.");
    }
    setZoneVisuals();
    keys["e"] = false;
  }

  if (keys[" "] && t - state.lastAttackAt > 0.4) {
    state.lastAttackAt = t;
    let target = null;
    let nearest = Infinity;
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.zone !== state.zone) continue;
      const d = enemy.mesh.position.distanceTo(player.position);
      if (d < 4.9 && d < nearest) {
        nearest = d;
        target = enemy;
      }
    }
    trail.position.set(player.position.x, player.position.y - 2, player.position.z);
    trail.rotation.z = player.rotation.y + Math.PI / 2;
    trail.material.opacity = 0.92;
    player.userData.sword.rotation.x = -1.5;
    if (target) {
      const damage = state.atk + Math.floor(Math.random() * 13) + state.level * 2;
      target.hp -= damage;
      say(`${target.type === "boss" ? "보스" : "적"}에게 ${damage} 피해`);
      if (target.hp <= 0) removeEnemy(target);
    } else {
      say("공격이 빗나갔습니다.");
    }
  }
  trail.material.opacity = Math.max(0, trail.material.opacity - dt * 3.2);

  if (state.skillCooldown > 0) state.skillCooldown -= dt;
  if (state.skillFlash > 0) {
    state.skillFlash = Math.max(0, state.skillFlash - dt * 1.7);
    burstRing.visible = true;
    burstRing.position.set(player.position.x, terrainHeight(player.position.x, player.position.z) + 0.2, player.position.z);
    burstRing.scale.setScalar(1 + (1 - state.skillFlash) * 13);
    burstRing.material.opacity = state.skillFlash * 0.72;
  } else {
    burstRing.visible = false;
  }

  if (state.scanPulse > 0) {
    state.scanPulse = Math.max(0, state.scanPulse - dt * 0.72);
    scanRing.visible = true;
    scanRing.position.set(player.position.x, terrainHeight(player.position.x, player.position.z) + 0.2, player.position.z);
    scanRing.scale.setScalar(1 + (1 - state.scanPulse) * 66);
    scanRing.material.opacity = state.scanPulse * 0.42;
  } else {
    scanRing.visible = false;
  }

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.zone !== state.zone) continue;
    enemy.wind += dt;
    enemy.mesh.rotation.y += dt * (enemy.type === "boss" ? 0.7 : 1.4);
    if (enemy.mesh.userData.aura) enemy.mesh.userData.aura.rotation.z += dt;
    const dir = new THREE.Vector3().subVectors(player.position, enemy.mesh.position);
    const d = dir.length();
    if (d > 0.1) {
      dir.normalize();
      if (d > 2.7) enemy.mesh.position.addScaledVector(dir, enemy.speed * dt);
      enemy.mesh.position.y = terrainHeight(enemy.mesh.position.x, enemy.mesh.position.z) + (enemy.type === "boss" ? 3 + Math.sin(enemy.wind) * 0.3 : 1.2 + Math.sin(enemy.wind * 3) * 0.15);
    }
    if (d < 2.8 && t - enemy.lastHitAt > 0.78) {
      enemy.lastHitAt = t;
      const damage = enemy.atk + Math.floor(Math.random() * 8);
      state.hp = Math.max(0, state.hp - damage);
      say(`피격! ${damage} 피해`);
      if (state.hp <= 0) endGame("사망", "전사했습니다.");
    }
  }

  dungeonGate.rotation.z += dt * 0.8;
  dungeonDisk.material.opacity = 0.45 + Math.sin(t * 4) * 0.2;
  npcRing.rotation.z += dt * 1.6;
  npcRing.material.color.setHSL((Math.sin(t * 2.7) + 1) * 0.18 + 0.46, 1, 0.62);

  const cycle = (Math.sin(t * 0.03) + 1) * 0.5;
  const dungeonMode = state.zone === "dungeon";
  skyMat.uniforms.topColor.value.setHSL(dungeonMode ? 0.75 : 0.58, dungeonMode ? 0.6 : 0.55, dungeonMode ? 0.11 : 0.22 + cycle * 0.2);
  skyMat.uniforms.bottomColor.value.setHSL(dungeonMode ? 0.78 : 0.63, 0.5, dungeonMode ? 0.03 : 0.06 + cycle * 0.09);
  sun.intensity = dungeonMode ? 0.18 : 0.65 + cycle * 0.95;
  moon.intensity = dungeonMode ? 1.05 : 0.85 - cycle * 0.6;
  stars.material.opacity = dungeonMode ? 0.88 : 0.32 + (1 - cycle) * 0.55;

  const camHeight = state.zone === "dungeon" ? 20 : 24;
  const camBack = state.zone === "dungeon" ? 18 : 24;
  camera.position.lerp(new THREE.Vector3(player.position.x, player.position.y + camHeight, player.position.z + camBack), 0.07);
  camera.lookAt(player.position.x, player.position.y + 1.4, player.position.z - 3);

  if (socket.readyState === WebSocket.OPEN && t - state.lastNetworkAt > 0.08) {
    state.lastNetworkAt = t;
    socket.send(JSON.stringify({
      type: "update",
      name: state.playerName,
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      ry: player.rotation.y,
      hp: state.hp,
      zone: state.zone,
      level: state.level,
      wing: wingOffset,
      flare: state.onlineFlare,
    }));
  }

  updateQuestText();
  const minutes = Math.floor(state.timer / 60);
  const seconds = Math.floor(state.timer % 60);
  ui.time.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  ui.hp.textContent = `${state.hp}`;
  ui.maxHp.textContent = `${state.maxHp}`;
  ui.atk.textContent = `${state.atk}`;
  ui.level.textContent = `${state.level}`;
  ui.xp.textContent = `${state.xp}`;
  ui.nextXp.textContent = `${state.nextXp}`;
  ui.enemyCount.textContent = `${enemies.filter((enemy) => enemy.alive && enemy.zone === state.zone).length}`;
}

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setZoneVisuals();
say("AION풍 오리지널 MMO 스타일 버전 로드 완료. R-7과 대화해 퀘스트를 시작하세요.");
requestAnimationFrame(animate);
