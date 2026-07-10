import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const $ = (q) => document.querySelector(q);
document.title = "Nightfall Valley";
$(".titlemark").innerHTML = '<span class="eyebrow">AN INTERACTIVE NIGHTSCAPE</span><strong>Nightfall Valley</strong><span class="subtitle">moonlight · mist · wind</span>';
$("#timeOfDay").closest("label").innerHTML = '<span class="meter"><b>MOON</b><em id="moonValue">82</em></span><input id="timeOfDay" type="range" min=".35" max="1.3" value=".82" step=".01">';
$("#windPower").closest("label").innerHTML = '<span class="meter"><b>WIND</b><em id="windValue">48</em></span><input id="windPower" type="range" min="0" max="1" value=".48" step=".01">';
const veil = document.createElement("div");
veil.className = "night-veil";
$("#app").append(veil);
const style = document.createElement("style");
style.textContent = `
:root,body{background:#040713}.night-veil{position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle at 55% 42%,transparent 24%,rgba(1,3,11,.12) 62%,rgba(0,1,6,.66) 115%)}
.titlemark{z-index:3;left:clamp(22px,5vw,76px);top:clamp(24px,6vw,76px);gap:4px;color:#f4f7ff;text-shadow:0 4px 32px #000}.titlemark .eyebrow{font-size:10px;font-weight:700;letter-spacing:.27em;color:#b9cff0bb}.titlemark strong{font:400 clamp(38px,5.8vw,78px)/.96 Georgia,serif;letter-spacing:-.045em}.titlemark .subtitle{margin-top:7px;font:italic clamp(12px,1.1vw,16px) Georgia,serif;letter-spacing:.08em;color:#dce8ffad}
.hud{z-index:4;grid-template-columns:44px minmax(140px,16vw) minmax(140px,16vw);gap:8px;padding:8px;border:1px solid #b7ceff2b;border-radius:15px;background:linear-gradient(135deg,#111a35aa,#070b1bb8);box-shadow:0 20px 54px #0008;backdrop-filter:blur(18px)}.icon-button,.control{height:auto;min-height:46px;border:1px solid #bfd2ff24;border-radius:10px;background:#8ba9de12;color:#eef4ff}.control{grid-template:1fr 1fr/1fr;gap:5px;padding:7px 11px}.meter{display:flex!important;justify-content:space-between;font-size:9px!important;letter-spacing:.16em}.meter b{color:#dce7ffbd}.meter em{font-style:normal;color:#eaf1ff7d}input[type=range]{margin:0;height:14px;accent-color:#aac8ff}@media(max-width:720px){.hud{left:12px;right:12px;grid-template-columns:44px 1fr 1fr}.titlemark{left:20px;top:22px}}@media(max-width:480px){.hud{grid-template-columns:44px 1fr}.control:last-child{grid-column:1/-1}.titlemark strong{font-size:42px}}
`;
document.head.append(style);

const canvas = $("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#040713");
scene.fog = new THREE.FogExp2("#101a30", .0058);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 850);
camera.position.set(13, 12, 42);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = .045;
controls.enablePan = false;
controls.minDistance = 12;
controls.maxDistance = 86;
controls.maxPolarAngle = Math.PI * .48;
controls.target.set(1, 5, -65);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .74, .72, .72);
composer.addPass(bloom);
const clock = new THREE.Clock();
const U = { time: { value: 0 }, wind: { value: .48 }, moon: { value: .82 } };
let seed = 2097183765;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function height(x, z) {
  return Math.sin(x * .028 + z * .018) * 2.3 + Math.sin(z * .052) * 1.6
    - Math.exp(-((x - 2) ** 2) / 1500 - ((z + 34) ** 2) / 2300) * 10.5
    + Math.exp(-((x + 62) ** 2) / 2400) * 8.5 + Math.exp(-((x - 72) ** 2) / 2500) * 10.5
    + THREE.MathUtils.smoothstep(-z, 58, 190) * 9 + Math.sin((x + z) * .067) * .65;
}

function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "#fff"); g.addColorStop(.14, "#c8dcffdd"); g.addColorStop(.48, "#729cff33"); g.addColorStop(1, "#274b9900");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}

function sky() {
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: U,
    vertexShader: `varying vec3 d;void main(){vec4 w=modelMatrix*vec4(position,1.);d=normalize(w.xyz-cameraPosition);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float time,moon;varying vec3 d;float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}void main(){vec3 n=normalize(d);float y=clamp(n.y*.5+.5,0.,1.);vec3 c=mix(vec3(.07,.10,.19),vec3(.006,.012,.04),smoothstep(.42,1.,y));vec3 m=normalize(vec3(-.5,.49,-.71));float md=dot(n,m);c+=vec3(.42,.58,.94)*pow(max(md,0.),24.)*.3*moon;c=mix(c,vec3(.95,.98,1.)*moon,smoothstep(.9992,.99962,md));vec2 q=floor(n.xz/max(.08,n.y+1.08)*650.);float r=h(q),s=step(.9947,r)*smoothstep(.46,.84,y);c+=mix(vec3(.62,.75,1.),vec3(1.,.86,.63),h(q+4.))*s*(.5+r*1.4)*(.7+.3*sin(time*(1.+r*2.)+r*40.));float a=smoothstep(.55,.98,sin(n.x*14.+n.z*7.+time*.03))*smoothstep(.5,.76,y)*(1.-smoothstep(.72,.98,y));c+=vec3(.02,.26,.25)*a*.11;gl_FragColor=vec4(c,1.);}` });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(430, 56, 32), mat));
}

function ground() {
  const g = new THREE.PlaneGeometry(420, 420, 180, 180); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), a = new THREE.Color("#07161c"), b = new THREE.Color("#274348");
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, height(x, z)); const c = a.clone().lerp(b, .2 + THREE.MathUtils.clamp((x + 100) / 220, 0, 1) * .44 + rnd() * .06); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97 })); m.receiveShadow = true; scene.add(m);
}

function mountains() {
  const layers = [[-118, "#121d31", 15, 22, 48, 24], [-165, "#0b1325", 18, 34, 70, 34], [-225, "#070d1b", 16, 48, 92, 46]];
  layers.forEach(([z, color, count, lo, hi, w]) => { for (let i = 0; i < count; i++) { const H = lo + rnd() * (hi - lo), R = w * (.65 + rnd() * .65); const m = new THREE.Mesh(new THREE.ConeGeometry(R, H, 7 + (i % 4), 2), new THREE.MeshStandardMaterial({ color, roughness: .95, flatShading: true })); m.position.set(-180 + i * 360 / (count - 1) + (rnd() - .5) * 18, H * .42, z - rnd() * 24); m.scale.set(1 + rnd() * .5, .8 + rnd() * .4, .75 + rnd() * .4); m.rotation.y = rnd() * Math.PI; scene.add(m); } });
}

function lake() {
  const g = new THREE.CircleGeometry(38, 80); g.rotateX(-Math.PI / 2); g.scale(1.55, 1, .55);
  const m = new THREE.ShaderMaterial({ transparent: true, uniforms: U,
    vertexShader: `uniform float time;varying vec3 w;varying vec2 u;void main(){vec3 p=position;p.y+=sin(p.x*.3+time*.7)*.05+cos(p.z*.6-time*.5)*.035;vec4 q=modelMatrix*vec4(p,1.);w=q.xyz;u=uv;gl_Position=projectionMatrix*viewMatrix*q;}`,
    fragmentShader: `uniform float time,moon;varying vec3 w;varying vec2 u;void main(){float e=1.-smoothstep(.28,.5,length(u-.5));float r=sin(w.x*.48+time*.8)*sin(w.z*.72-time*.55);float s=pow(max(0.,sin(w.x*.18+w.z*.08+r)),16.);vec3 c=mix(vec3(.01,.045,.075),vec3(.05,.16,.21),.38+r*.08)+vec3(.38,.58,.9)*s*.25*moon;gl_FragColor=vec4(c,.82*e);}` });
  const mesh = new THREE.Mesh(g, m); mesh.position.set(3, -7.2, -37); scene.add(mesh);
}

function pines() {
  const count = 250, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.1, .2, 2.8, 6), new THREE.MeshStandardMaterial({ color: "#090d12", roughness: 1 }), count);
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1.25, 4.3, 7), new THREE.MeshStandardMaterial({ color: "#0a211f", roughness: .96 }), count * 2);
  const d = new THREE.Object3D(); let ci = 0;
  for (let i = 0; i < count; i++) { const z = 20 - rnd() * 136, spread = 48 + Math.max(0, -z) * .78; let x = (rnd() - .5) * spread * 2; if (z > -54 && Math.abs(x) < 19) x += Math.sign(x || rnd() - .5) * (20 + rnd() * 20); const y = height(x, z), s = .48 + rnd() * 1.55; d.position.set(x, y + 1.3 * s, z); d.scale.set(s, s, s); d.rotation.y = rnd() * Math.PI; d.updateMatrix(); trunks.setMatrixAt(i, d.matrix); for (let l = 0; l < 2; l++) { d.position.set(x, y + (2.5 + l * 1.25) * s, z); d.scale.set(s * (1 - l * .2), s, s * (1 - l * .2)); d.updateMatrix(); crowns.setMatrixAt(ci++, d.matrix); } }
  trunks.castShadow = crowns.castShadow = true; scene.add(trunks, crowns);
}

function grass() {
  const blade = new THREE.PlaneGeometry(.13, 1.2, 1, 3); blade.translate(0, .6, 0); const count = innerWidth < 700 ? 6200 : 12000;
  const colors = new Float32Array(count * 3), phases = new Float32Array(count), d = new THREE.Object3D(), ca = new THREE.Color("#15342d"), cb = new THREE.Color("#4c6664");
  for (let i = 0; i < count; i++) { const dep = rnd() ** 1.55, z = 30 - dep * 112, x = (rnd() - .5) * (84 + dep * 184), y = height(x, z); d.position.set(x, y, z); d.rotation.y = rnd() * Math.PI; d.scale.set(.65 + rnd() * .5, .5 + rnd() * 1.45 + Math.max(0, z) * .02, 1); d.updateMatrix(); const c = ca.clone().lerp(cb, rnd()); colors.set([c.r, c.g, c.b], i * 3); phases[i] = rnd() * 6.283; }
  blade.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(colors, 3)); blade.setAttribute("phase", new THREE.InstancedBufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: U, vertexShader: `uniform float time,wind;attribute vec3 instanceColor;attribute float phase;varying vec3 c;varying float y;void main(){vec3 p=position;p.x+=sin(time*1.3+phase+instanceMatrix[3].x*.11)*p.y*p.y*.22*wind;vec4 w=instanceMatrix*vec4(p,1.);c=instanceColor;y=position.y;gl_Position=projectionMatrix*viewMatrix*modelMatrix*w;}`, fragmentShader: `uniform float moon;varying vec3 c;varying float y;void main(){float t=smoothstep(.1,1.15,y);gl_FragColor=vec4(mix(c*.52,c*(1.+moon*.25),t)+vec3(.06,.1,.16)*t*moon,1.);}` });
  const mesh = new THREE.InstancedMesh(blade, mat, count); for (let i = 0; i < count; i++) mesh.setMatrixAt(i, d.matrix); // overwritten below
  seed = 103117; for (let i = 0; i < count; i++) { const dep = rnd() ** 1.55, z = 30 - dep * 112, x = (rnd() - .5) * (84 + dep * 184); d.position.set(x, height(x, z), z); d.rotation.y = rnd() * Math.PI; d.scale.set(.65 + rnd() * .5, .5 + rnd() * 1.45 + Math.max(0, z) * .02, 1); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); } mesh.frustumCulled = false; scene.add(mesh);
}

function fireflies() {
  const n = innerWidth < 700 ? 120 : 250, pos = new Float32Array(n * 3), phase = new Float32Array(n), size = new Float32Array(n);
  for (let i = 0; i < n; i++) { const z = 24 - rnd() * 88, x = (rnd() - .5) * (72 + Math.max(0, -z) * .72); pos.set([x, height(x, z) + .8 + rnd() * 5.5, z], i * 3); phase[i] = rnd() * 6.283; size[i] = 12 + rnd() * 22; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("phase", new THREE.BufferAttribute(phase, 1)); g.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U, vertexShader: `uniform float time;attribute float phase,size;varying float a;void main(){vec3 p=position;p.x+=sin(time*.38+phase)*.8;p.y+=sin(time*.72+phase*1.7)*.45;vec4 v=modelViewMatrix*vec4(p,1.);a=.35+.65*pow(.5+.5*sin(time*2.2+phase),3.);gl_PointSize=size*a*(220./-v.z);gl_Position=projectionMatrix*v;}`, fragmentShader: `varying float a;void main(){float q=1.-smoothstep(0.,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(mix(vec3(.35,.62,1.),vec3(.95,1.,.72),a),q*q*a);}` }); scene.add(new THREE.Points(g, m));
}

function mist() {
  const tex = glowTexture(), group = new THREE.Group();
  for (let i = 0; i < 30; i++) { const m = new THREE.SpriteMaterial({ map: tex, color: i % 2 ? "#6d91bf" : "#9eb7dc", transparent: true, opacity: .035 + rnd() * .04, depthWrite: false, blending: THREE.AdditiveBlending }), s = new THREE.Sprite(m), x = -100 + rnd() * 200, z = -106 + rnd() * 98; s.position.set(x, height(x, z) + 3 + rnd() * 5, z); s.scale.set(35 + rnd() * 55, 6 + rnd() * 10, 1); s.userData = { x, speed: .25 + rnd() * .5 }; group.add(s); }
  scene.add(group); return group;
}

sky(); ground(); lake(); mountains(); pines(); grass(); fireflies(); const haze = mist();
const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: "#c7dcff", transparent: true, opacity: .56, depthWrite: false, blending: THREE.AdditiveBlending })); moonSprite.position.set(-118, 116, -198); moonSprite.scale.set(66, 66, 1); scene.add(moonSprite);
const hemi = new THREE.HemisphereLight("#819ed8", "#06100f", 1.45); scene.add(hemi);
const moonLight = new THREE.DirectionalLight("#bed4ff", 4.4); moonLight.position.set(-75, 95, 35); moonLight.castShadow = true; moonLight.shadow.mapSize.set(2048, 2048); Object.assign(moonLight.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 270 }); scene.add(moonLight);
const rim = new THREE.DirectionalLight("#35528b", 1.2); rim.position.set(85, 35, -90); scene.add(rim);

function moon(v) { U.moon.value = v; moonLight.intensity = 2.3 + v * 2.7; hemi.intensity = .8 + v * .8; rim.intensity = .55 + v * .85; bloom.strength = .48 + v * .34; renderer.toneMappingExposure = .84 + v * .27; moonSprite.material.opacity = .34 + v * .29; }
$("#timeOfDay").addEventListener("input", e => { const v = +e.target.value; $("#moonValue").textContent = Math.round(v * 100); moon(v); });
$("#windPower").addEventListener("input", e => { U.wind.value = +e.target.value; $("#windValue").textContent = Math.round(+e.target.value * 100); });
$("#resetView").addEventListener("click", () => { camera.position.set(13, 12, 42); controls.target.set(1, 5, -65); controls.update(); }); moon(.82);

addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7)); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });
(function loop() { const t = clock.getElapsedTime(); U.time.value = t; haze.children.forEach((s, i) => s.position.x = s.userData.x + Math.sin(t * .035 * s.userData.speed + i) * 6); controls.update(); composer.render(); requestAnimationFrame(loop); })();
