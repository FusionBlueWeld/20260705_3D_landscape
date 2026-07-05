import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbdd7b0, 0.0049);

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 760);
camera.position.set(1.5, 9.2, 33);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 72;
controls.maxPolarAngle = Math.PI * 0.47;
controls.target.set(5, 3.8, -60);

const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const uniforms = {
  time: { value: 0 },
  windPower: { value: 0.55 },
  sunDirection: { value: new THREE.Vector3(-0.52, 0.74, 0.36).normalize() },
};

const palette = {
  grassA: new THREE.Color("#78b844"),
  grassB: new THREE.Color("#d6e971"),
  grassShadow: new THREE.Color("#3f7c42"),
  meadow: new THREE.Color("#aacb5f"),
  hill: new THREE.Color("#83b764"),
  hillShadow: new THREE.Color("#4e7358"),
  rock: new THREE.Color("#8f8064"),
  lava: new THREE.Color("#ff8a1c"),
  malice: new THREE.Color("#ff42a4"),
};

function makeSky() {
  const geometry = new THREE.SphereGeometry(420, 48, 32);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      timeOfDay: { value: 0.34 },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = normalize(world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float timeOfDay;
      varying vec3 vWorld;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 dawn = vec3(1.0, 0.72, 0.37);
        vec3 greenBlue = vec3(0.50, 0.68, 0.61);
        vec3 zenith = vec3(0.58, 0.74, 0.78);
        vec3 color = mix(dawn, greenBlue, smoothstep(0.0, 0.74, h));
        color = mix(color, zenith, smoothstep(0.48, 1.0, h) * (0.35 + timeOfDay * 0.35));
        float sunGlow = pow(max(dot(vWorld, normalize(vec3(-0.85, 0.18, -0.18))), 0.0), 10.0);
        color += vec3(1.0, 0.65, 0.24) * sunGlow * 0.9;
        float speck = step(0.996, hash(gl_FragCoord.xy + floor(h * 15.0))) * smoothstep(0.48, 1.0, h);
        color += vec3(1.0, 0.95, 0.68) * speck * 0.65;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(geometry, material));
  return material;
}

const skyMaterial = makeSky();

function makeGround() {
  const geometry = new THREE.PlaneGeometry(420, 420, 220, 220);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const y = terrainHeight(x, z);
    positions.setY(i, y);
    const distance = THREE.MathUtils.clamp((-z - 8) / 132, 0, 1);
    const pathGlow = Math.exp(-((x - 12 - z * -0.18) ** 2) / 520) * THREE.MathUtils.clamp((z + 70) / 105, 0, 1);
    const base = palette.hill.clone().lerp(palette.meadow, 0.48 + Math.sin(x * 0.035) * 0.08);
    base.lerp(new THREE.Color("#d5df8a"), pathGlow * 0.18);
    base.lerp(new THREE.Color("#7e9f75"), distance * 0.36);
    base.offsetHSL(0, Math.random() * 0.045, Math.random() * 0.055 - 0.018);
    colors.push(base.r, base.g, base.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap: makeGradientTexture(["#476d47", "#7fb75a", "#c8dc69", "#fff0a5"]),
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  world.add(ground);
}

function makeGradientTexture(colors) {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = colors.length;
  canvas2d.height = 1;
  const ctx = canvas2d.getContext("2d");
  colors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(index, 0, 1, 1);
  });
  const texture = new THREE.CanvasTexture(canvas2d);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function makeSoftBlobTexture(color = "#fff1c8", alpha = 0.7) {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 256;
  canvas2d.height = 96;
  const ctx = canvas2d.getContext("2d");
  ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
  const gradient = ctx.createRadialGradient(116, 48, 4, 128, 48, 122);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.56, color);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  for (let i = 0; i < 7; i += 1) {
    const x = 24 + i * 33 + Math.sin(i) * 9;
    const y = 38 + Math.cos(i * 1.7) * 14;
    ctx.beginPath();
    ctx.ellipse(x, y, 36 + (i % 3) * 12, 13 + (i % 2) * 9, Math.sin(i) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas2d);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePaintedBands() {
  const group = new THREE.Group();
  const colors = ["#d7e56a", "#b9d65f", "#7eb455", "#eef0a0", "#6fa956"];
  for (let i = 0; i < 46; i += 1) {
    const x = -90 + Math.random() * 180;
    const z = 18 - Math.random() * 112;
    const width = 8 + Math.random() * 26;
    const height = 1.2 + Math.random() * 3.8;
    const material = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 0.13 + Math.random() * 0.17,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const band = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    band.position.set(x, terrainHeight(x, z) + 0.16, z);
    band.rotation.set(-Math.PI / 2, 0, -0.18 + Math.random() * 0.36);
    group.add(band);
  }
  world.add(group);
}

function makeWildflowers() {
  const flowerMaterial = new THREE.MeshBasicMaterial({ color: "#ffd35c" });
  const pinkMaterial = new THREE.MeshBasicMaterial({ color: "#f28aae" });
  const geometry = new THREE.IcosahedronGeometry(0.08, 0);
  const count = window.innerWidth < 680 ? 70 : 150;
  const mesh = new THREE.InstancedMesh(geometry, flowerMaterial, count);
  const pinkMesh = new THREE.InstancedMesh(geometry, pinkMaterial, Math.floor(count * 0.35));
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const x = -50 + Math.random() * 92;
    const z = 22 - Math.random() * 72;
    dummy.position.set(x, terrainHeight(x, z) + 0.7 + Math.random() * 0.45, z);
    dummy.scale.setScalar(0.7 + Math.random() * 1.6);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (i < pinkMesh.count) pinkMesh.setMatrixAt(i, dummy.matrix);
  }
  world.add(mesh, pinkMesh);
}

function terrainHeight(x, z) {
  const ridge = Math.sin(x * 0.04 + z * 0.027) * 2.4 + Math.sin(z * 0.074) * 1.55;
  const valley = -Math.exp(-((x + 16) ** 2 + (z + 35) ** 2) / 3900) * 9.6;
  const foreground = Math.max(0, 1 - Math.abs(z - 22) / 84) * 2.9;
  const farLift = THREE.MathUtils.clamp((-z - 70) / 95, 0, 1) * 4.5;
  return ridge + valley + foreground + farLift + Math.sin((x + z) * 0.019) * 1.25;
}

function makeGrass() {
  const blade = new THREE.PlaneGeometry(0.16, 1, 1, 4);
  blade.translate(0, 0.5, 0);
  const count = window.innerWidth < 680 ? 7600 : 15000;
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: `
      uniform float time;
      uniform float windPower;
      attribute vec3 instanceColor;
      attribute float instancePhase;
      varying vec3 vColor;
      varying float vBladeY;

      void main() {
        vBladeY = position.y;
        vec3 p = position;
        float sway = sin(time * 1.8 + instancePhase + instanceMatrix[3].x * 0.18) * 0.32 * windPower;
        p.x += sway * position.y * position.y;
        p.z += cos(time * 1.25 + instancePhase) * 0.08 * windPower * position.y;
        vec4 world = instanceMatrix * vec4(p, 1.0);
        vColor = instanceColor;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * world;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vBladeY;
      void main() {
        float edge = smoothstep(0.0, 0.08, abs(gl_FragCoord.x - floor(gl_FragCoord.x) - 0.5));
        vec3 color = mix(vColor * 0.75, vColor * 1.28, smoothstep(0.18, 0.95, vBladeY));
        color += vec3(0.14, 0.11, 0.02) * smoothstep(0.78, 1.0, vBladeY);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(blade, material, count);
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const near = Math.random() ** 1.8;
    const x = (Math.random() - 0.5) * (52 + near * 98);
    const z = 28 - near * 92 + (Math.random() - 0.5) * 14;
    const y = terrainHeight(x, z) + 0.06;
    const scale = 0.7 + Math.random() * 1.45 + Math.max(0, z + 4) * 0.055;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.28);
    dummy.scale.set(0.7 + Math.random() * 0.8, scale, 0.7 + Math.random() * 0.5);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    const c = palette.grassA.clone().lerp(palette.grassB, Math.random());
    c.lerp(palette.grassShadow, Math.max(0, -z - 54) / 90);
    colors.set([c.r, c.g, c.b], i * 3);
    phases[i] = Math.random() * Math.PI * 2;
  }
  blade.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(colors, 3));
  blade.setAttribute("instancePhase", new THREE.InstancedBufferAttribute(phases, 1));
  world.add(mesh);
}

function makeHills() {
  const group = new THREE.Group();
  const gradient = makeGradientTexture(["#3e5a4c", "#6d9660", "#b8cb74", "#efd894"]);
  const layers = [
    { z: -78, y: 5, color: "#9fc46b", scale: 1.0, count: 12 },
    { z: -112, y: 9, color: "#95ad72", scale: 1.35, count: 15 },
    { z: -152, y: 14, color: "#8ea08a", scale: 1.7, count: 18 },
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i += 1) {
      const geometry = new THREE.ConeGeometry(
        (12 + Math.random() * 22) * layer.scale,
        (9 + Math.random() * 25) * layer.scale,
        5 + (i % 3),
        1
      );
      const material = new THREE.MeshToonMaterial({
        color: layer.color,
        gradientMap: gradient,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(-125 + i * (250 / layer.count) + Math.random() * 8, layer.y, layer.z - Math.random() * 22);
      mesh.rotation.set(0, Math.random() * Math.PI, 0);
      mesh.scale.set(1.35, 0.55 + Math.random() * 0.52, 1.55);
      group.add(mesh);
    }
  }
  world.add(group);
}

function makeTrees() {
  const group = new THREE.Group();
  const trunkMaterial = new THREE.MeshToonMaterial({ color: "#5d4b31" });
  const leafMaterial = new THREE.MeshToonMaterial({
    color: "#395f39",
    gradientMap: makeGradientTexture(["#203a2b", "#3f6f3b", "#7ea95a"]),
  });
  const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.22, 2.2, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(1.25, 1);
  for (let i = 0; i < 130; i += 1) {
    const x = -85 + Math.random() * 160;
    const z = -74 + Math.random() * 72;
    if (Math.abs(x) < 16 && z > -30) continue;
    const y = terrainHeight(x, z);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.05;
    const crown = new THREE.Mesh(crownGeometry, leafMaterial);
    crown.position.y = 2.35;
    crown.scale.set(1.1 + Math.random() * 0.55, 0.72 + Math.random() * 0.35, 1.1 + Math.random() * 0.55);
    tree.add(trunk, crown);
    tree.position.set(x, y, z);
    const s = 0.62 + Math.random() * 0.72;
    tree.scale.setScalar(s);
    group.add(tree);
  }
  world.add(group);
}

function makeDistantLandmarks() {
  makeVolcano();
  makeCastleSilhouette();
  makeAncientRidges();
  makePathAndMist();
  makeAnimals();
}

function makeVolcano() {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshToonMaterial({
    color: "#6f6854",
    gradientMap: makeGradientTexture(["#34342d", "#70664e", "#c59d62"]),
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(22, 48, 7, 3), rockMat);
  cone.position.set(56, 23, -148);
  cone.rotation.y = 0.35;
  cone.scale.set(1.28, 1.06, 1.08);
  group.add(cone);

  const lavaMat = new THREE.MeshBasicMaterial({ color: palette.lava, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 8; i += 1) {
    const stream = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + Math.random() * 1.7, 18 + Math.random() * 19), lavaMat);
    stream.position.set(50 + Math.random() * 14, 25 - Math.random() * 9, -132 + Math.random() * 6);
    stream.rotation.set(-0.6 + Math.random() * 0.35, 0.25, Math.random() * 0.55);
    group.add(stream);
  }

  const glow = new THREE.PointLight(palette.lava, 5.4, 90, 2.0);
  glow.position.set(56, 49, -134);
  group.add(glow);

  const smokeMat = new THREE.MeshBasicMaterial({ color: "#3f443f", transparent: true, opacity: 0.34, depthWrite: false });
  for (let i = 0; i < 10; i += 1) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2 + i * 0.48, 1), smokeMat);
    puff.position.set(49 + Math.sin(i) * 8, 52 + i * 1.7, -138 + Math.cos(i * 1.4) * 6);
    puff.scale.set(2.1, 0.72, 1.3);
    group.add(puff);
  }
  world.add(group);
}

function makeCastleSilhouette() {
  const group = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: "#313b36" });
  const glowMat = new THREE.MeshBasicMaterial({ color: palette.malice, transparent: true, opacity: 0.88 });
  group.position.set(-54, 1.5, -108);
  const base = new THREE.Mesh(new THREE.BoxGeometry(19, 11, 14), mat);
  base.position.y = 8;
  group.add(base);
  for (let i = 0; i < 7; i += 1) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.7, 12 + i * 1.6, 5), mat);
    tower.position.set(-10 + i * 3.2, 12 + i * 0.45, -1 + Math.sin(i) * 5);
    group.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 7.2, 5), mat);
    cap.position.copy(tower.position);
    cap.position.y += 9;
    group.add(cap);
  }
  for (let i = 0; i < 10; i += 1) {
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6 + Math.random() * 8, 0.28), glowMat);
    vein.position.set(-8 + Math.random() * 16, 3 + Math.random() * 10, -7 + Math.random() * 13);
    vein.rotation.z = -0.45 + Math.random() * 0.9;
    group.add(vein);
  }
  const light = new THREE.PointLight(palette.malice, 3.5, 55, 2);
  light.position.set(0, 17, 0);
  group.add(light);
  world.add(group);
}

function makeAncientRidges() {
  const group = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({
    color: "#9b8969",
    gradientMap: makeGradientTexture(["#3e4d40", "#8c8064", "#ddad6f"]),
  });
  for (let i = 0; i < 20; i += 1) {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 4, 10 + Math.random() * 26, 5), mat);
    spire.position.set(15 + i * 4.2 + Math.random() * 5, 4, -98 - Math.random() * 22);
    spire.rotation.z = -0.42 + Math.random() * 0.84;
    spire.scale.z = 0.8 + Math.random();
    group.add(spire);
  }
  world.add(group);
}

function makePathAndMist() {
  const pathShape = new THREE.Shape();
  pathShape.moveTo(-5, 25);
  pathShape.bezierCurveTo(10, 8, 3, -6, 34, -22);
  pathShape.bezierCurveTo(50, -30, 37, -42, 62, -52);
  pathShape.lineTo(66, -48);
  pathShape.bezierCurveTo(38, -36, 58, -27, 30, -17);
  pathShape.bezierCurveTo(9, -8, 17, 5, -2, 27);
  const geometry = new THREE.ShapeGeometry(pathShape, 28);
  geometry.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: "#c48a4a", transparent: true, opacity: 0.58, depthWrite: false });
  const path = new THREE.Mesh(geometry, mat);
  path.position.y = 0.15;
  world.add(path);

  const mistMat = new THREE.MeshBasicMaterial({
    color: "#fff5d6",
    map: makeSoftBlobTexture("#fff8dd", 0.78),
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  for (let i = 0; i < 22; i += 1) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(18 + Math.random() * 32, 5 + Math.random() * 7), mistMat);
    const x = -56 + Math.random() * 105;
    const z = -75 + Math.random() * 48;
    mist.position.set(x, terrainHeight(x, z) + 2.5 + Math.random() * 2, z);
    mist.rotation.set(-0.15, 0, -0.08 + Math.random() * 0.16);
    world.add(mist);
  }
}

function makeAnimals() {
  const mat = new THREE.MeshToonMaterial({ color: "#d6d5bf" });
  const darkMat = new THREE.MeshToonMaterial({ color: "#5b5145" });
  for (let i = 0; i < 4; i += 1) {
    const animal = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 4, 8), i === 1 ? darkMat : mat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.8;
    animal.add(body);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), i === 1 ? darkMat : mat);
    head.position.set(0.9, 1, 0);
    animal.add(head);
    for (let l = 0; l < 4; l += 1) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.75, 5), darkMat);
      leg.position.set(-0.42 + (l % 2) * 0.65, 0.25, -0.28 + Math.floor(l / 2) * 0.56);
      animal.add(leg);
    }
    const x = 17 + i * 2.7;
    const z = -2 - Math.random() * 5;
    animal.position.set(x, terrainHeight(x, z), z);
    animal.rotation.y = -0.45 + i * 0.14;
    animal.scale.setScalar(0.75);
    world.add(animal);
  }
}

function makeClouds() {
  const group = new THREE.Group();
  const cloudTexture = makeSoftBlobTexture("#fff0c8", 0.62);
  const mats = [
    new THREE.MeshBasicMaterial({ color: "#fff0c8", map: cloudTexture, transparent: true, opacity: 0.28, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: "#dfe8bd", map: cloudTexture, transparent: true, opacity: 0.22, depthWrite: false }),
  ];
  for (let i = 0; i < 28; i += 1) {
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(34 + Math.random() * 58, 10 + Math.random() * 16), mats[i % 2]);
    cloud.position.set(-160 + Math.random() * 320, 36 + Math.random() * 48, -125 - Math.random() * 160);
    cloud.rotation.set(-0.02, 0, -0.08 + Math.random() * 0.16);
    group.add(cloud);
  }
  world.add(group);
  return group;
}

makeGround();
makeHills();
makePaintedBands();
makeTrees();
makeDistantLandmarks();
makeGrass();
makeWildflowers();
const clouds = makeClouds();

const hemi = new THREE.HemisphereLight("#fff3b8", "#5a704f", 2.1);
scene.add(hemi);

const sun = new THREE.DirectionalLight("#ffe5a5", 3.5);
sun.position.set(-48, 70, 28);
scene.add(sun);

function updateAtmosphere(timeOfDay) {
  skyMaterial.uniforms.timeOfDay.value = timeOfDay;
  const warm = new THREE.Color("#ffd082");
  const cool = new THREE.Color("#c5e1c5");
  sun.color.copy(warm.clone().lerp(cool, Math.min(1, timeOfDay * 1.2)));
  sun.intensity = 2.4 + (1 - Math.abs(timeOfDay - 0.38)) * 1.8;
  hemi.intensity = 1.45 + timeOfDay * 1.2;
  const fogColor = new THREE.Color("#efd49a").lerp(new THREE.Color("#a7cab6"), timeOfDay);
  scene.fog.color.copy(fogColor);
  renderer.setClearColor(fogColor, 1);
}

document.querySelector("#resetView").addEventListener("click", () => {
  camera.position.set(1.5, 9.2, 33);
  controls.target.set(5, 3.8, -60);
  controls.update();
});

document.querySelector("#timeOfDay").addEventListener("input", (event) => {
  updateAtmosphere(Number(event.currentTarget.value));
});

document.querySelector("#windPower").addEventListener("input", (event) => {
  uniforms.windPower.value = Number(event.currentTarget.value);
});

updateAtmosphere(0.34);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(width, height);
}

window.addEventListener("resize", resize);

function animate() {
  const elapsed = clock.getElapsedTime();
  uniforms.time.value = elapsed;
  clouds.position.x = Math.sin(elapsed * 0.028) * 9;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
