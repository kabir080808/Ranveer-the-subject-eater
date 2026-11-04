// The whole film as one three.js scene: sky, sun and fog per shot (lights.ts presets, camera-relative sun frozen per
// shot), one big grass plain holding a small set per beat (story.ts SET), the cast as lit cards (cast.ts) and a few
// animated props (waving flag, fluttering note, edict carved letter by letter). update(id, f, cam) is a pure function
// of shot + frame, so every frame renders the same in stills and in the final.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { rep, ctex, grassHD, stoneHD, cobbleHD, planksHD, waterNear, cloudHD } from "./paint";
import { Pen } from "./toon";
import { glyphs, chakra, rupeeNote, lionsCard } from "./zoo";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, animalGeo } from "./cast";
import { FPS, SHOTS, SET, SetName, at, camAt, ShotDef, CUE, hillY, QUEUE, PILLAR_H, clamp01 } from "./story";

const rnd = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
const col = (key: string, c: string) => lam(key, () => ({ color: c }));

// ---------------- painted textures ----------------
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** dry earth / road dust with soft blotches and wheel ruts */
const dirtTex = () => ctex("dirt", 1024, 1024, (g, r) => {
  g.fillStyle = "#c9a172"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(176,138,96,0.35)" : "rgba(222,190,146,0.35)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 90; i++) { g.fillStyle = "rgba(120,90,60,0.5)"; g.beginPath(); g.arc(r() * 1024, r() * 1024, 3 + r() * 5, 0, 7); g.fill(); }
});
/** weathered boulder: warm grey with soft lichen blotches and a few thin cracks (no masonry joints) */
const rockTex = () => ctex("rockPlain", 1024, 1024, (g, r) => {
  g.fillStyle = "#b8ad9c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 300; i++) { g.fillStyle = ["rgba(160,150,135,0.35)", "rgba(206,198,184,0.35)", "rgba(150,160,120,0.18)"][i % 3]; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + r() * 80, 12 + r() * 50, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(90,80,70,0.45)"; g.lineWidth = 3;
  for (let i = 0; i < 14; i++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 90; y += 20 + r() * 50; g.lineTo(x, y); } g.stroke(); }
});
const sandTex = () => ctex("sand", 1024, 1024, (g, r) => {
  g.fillStyle = "#ead39c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 200; i++) { g.fillStyle = r() < 0.5 ? "rgba(214,186,130,0.4)" : "rgba(246,226,180,0.4)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 30 + r() * 70, 8 + r() * 20, 0, 0, 7); g.fill(); }
});
const thatchTex = () => ctex("thatch", 512, 512, (g, r) => {
  g.fillStyle = "#d4ac5a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = r() < 0.5 ? "rgba(150,110,50,0.5)" : "rgba(240,210,140,0.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 18 + r() * 14); g.stroke(); }
});
const flagTex = () => ctex("flagIndia", 1024, 683, (g) => {
  const h = 683 / 3;
  g.fillStyle = "#ff8f2e"; g.fillRect(0, 0, 1024, h);
  g.fillStyle = "#ffffff"; g.fillRect(0, h, 1024, h);
  g.fillStyle = "#13883a"; g.fillRect(0, 2 * h, 1024, h + 1);
  chakra(g, 512, 683 / 2, h * 0.43);
});
const noteTex = () => ctex("note", 1024, 512, (g) => rupeeNote(g));
const stickyTex = () => ctex("sticky", 256, 256, (g) => {
  g.fillStyle = "#ffe44d"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 0, 256, 26);
  g.strokeStyle = "#2a2f6a"; g.lineWidth = 9; g.lineCap = "round";
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(36, 78 + i * 46); for (let x = 36; x < 220 - i * 22; x += 18) g.lineTo(x + 9, 70 + i * 46 + (x % 36 ? 10 : -6)); g.stroke(); }
  g.fillStyle = "#e2453c"; g.beginPath(); g.arc(200, 210, 18, 0, 7); g.fill();
});
const abacusTex = () => ctex("abacus", 1024, 128, (g) => {
  g.fillStyle = "#dcc69c"; g.fillRect(0, 0, 1024, 128);
  for (let i = 0; i < 4; i++) {
    chakra(g, 128 + i * 256, 64, 40, "#8a744e");
    const x = 256 * i + 230; g.fillStyle = "#8a744e"; g.beginPath(); g.ellipse(x, 64, 34, 20, 0, 0, 7); g.fill(); // an animal between wheels
  }
});
const lionsTex = () => ctex("lionsCard", 1024, 820, (g) => lionsCard(new Pen(g)));
/** edict panel: rows of carved letters on transparent; drawn up to `upTo` of the text (the carving reveals it) */
const edictCanvas = (() => { let c: HTMLCanvasElement | null = null; return () => { if (!c) { c = document.createElement("canvas"); c.width = 1024; c.height = 720; } return c; }; })();

type Hill = [number, number, number, number]; // x, z, radius, height

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors = new Map<string, Actor[]>();
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private flag: THREE.Mesh; private note: THREE.Mesh;
  private edict: THREE.Mesh; private edictTex: THREE.CanvasTexture; private edictUpTo = -1;
  private flames: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    // ---- sky + light (same rig as the bridge short) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.frustumCulled = false;
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    const grass = lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const dirt = lam("dirt", () => ({ map: dirtTex() }));
    const sand = lam("sand", () => ({ map: sandTex() }));
    const cob = lam("cobbleHD", () => ({ map: cobbleHD() }));
    const sandstone = lam("sandstone", () => ({ map: stoneHD("sandstoneHD", ["#e4cfa6", "#dcc59a", "#ead7b2", "#d6be92"], "#b49c74") }));
    const polished = twoTone(new THREE.MeshPhongMaterial({ color: "#e6d2a8", specular: "#6a5a40", shininess: 40 }));
    const rockM = lam("rock", () => ({ map: rockTex() }));
    const wallOchre = col("ochre", "#e0b070"), wallCream = col("cream", "#efe0bf"), terracotta = col("terracotta", "#c8643c");
    const wood = col("wood", "#8a5a33"), woodDark = col("woodDark", "#6a4226"), mud = col("mud", "#c99a6a");
    const thatch = lam("thatch", () => ({ map: thatchTex() }));
    const bark = col("bark", "#7a5236");
    const leaf = [col("leafA", "#5ea84a"), col("leafB", "#4f9a44"), col("leafC", "#6cb653")];
    const banyanLeaf = [col("bleafA", "#4f9a44"), col("bleafB", "#5aa64c")];
    const palmLeaf = col("palm", "#5aa64c");
    const copper = twoTone(new THREE.MeshPhongMaterial({ color: "#e08a45", specular: "#ffd9a8", shininess: 50 }));
    const white = col("white", "#f2f0ea"), teal = col("roomWall", "#9fd0c8"), counter = col("counter", "#c9a27a");
    const hillMat = col("hill", "#7fae5a"), farHill = col("farhill", "#8fb06a");
    const crop = [col("cropA", "#a7c95a"), col("cropB", "#e2c24a"), col("cropC", "#7fb84f")];
    const b = new Batch();

    // ---- ground: one big painted plain; per-set overlays sit a few cm above it ----
    const plane = (x0: number, z0: number, x1: number, z1: number, y: number, tile: number) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (x1 - x0)) / tile, (uv.getY(i) * (z1 - z0)) / tile);
      return g;
    };
    b.add(plane(-1400, -1600, 2600, 1200, 0, 8), grass);
    const overlay = (s: SetName, x0: number, z0: number, x1: number, z1: number, m: THREE.Material, tile = 8, y = 0.012) => {
      const [ox, oz] = SET[s]; b.add(plane(ox + x0, oz + z0, ox + x1, oz + z1, y, tile), m);
    };

    // far hills scattered over the world (never near a set)
    const hills: Hill[] = [];
    for (let i = 0; hills.length < 70 && i < 2000; i++) {
      const x = -1300 + rnd(i, 1) * 3800, z = -1500 + rnd(i, 2) * 2600, r = 40 + rnd(i, 3) * 70;
      if (Object.values(SET).some(([sx, sz]) => Math.hypot(x - sx, z - sz) < r + 90)) continue;
      hills.push([x, z, r, r * (0.25 + rnd(i, 4) * 0.25)]);
    }
    const hemiG = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const [x, z, r, h] of hills) b.add(hemiG, rnd(x) < 0.5 ? hillMat : farHill, M4(x, -0.5, z, r, h, r));

    // trees
    const tree = (x: number, z: number, s = 1, k = 0) => {
      b.add(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 3.2 * s, 10), bark, M4(x, 1.6 * s, z));
      const sp = new THREE.SphereGeometry(1, 20, 14);
      for (let j = 0; j < 5; j++) {
        const a = j * 1.3 + k, r = j === 0 ? 0 : 1.1 * s;
        b.add(sp, leaf[(j + k) % 3], M4(x + Math.cos(a) * r, (3.6 + (j === 0 ? 0.9 : 0.2 * (j % 2))) * s, z + Math.sin(a) * r, 1.6 * s, 1.35 * s, 1.6 * s));
      }
    };
    const banyan = (x: number, z: number, s = 1) => {
      for (let j = 0; j < 4; j++) b.add(new THREE.CylinderGeometry(0.35 * s, 0.55 * s, 4 * s, 10), bark, M4(x + (j % 2 - 0.5) * 1.2 * s, 2 * s, z + (j > 1 ? 0.8 : -0.8) * s, 1, 1, 1, 0, 0, (j - 1.5) * 0.08));
      for (let j = 0; j < 10; j++) b.add(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 4.6 * s, 6), bark, M4(x + Math.cos(j * 2.4) * 3.2 * s, 2.3 * s, z + Math.sin(j * 2.4) * 2.6 * s));
      const sp = new THREE.SphereGeometry(1, 20, 14);
      for (let j = 0; j < 9; j++) {
        const a = j * 0.7, r = j === 0 ? 0 : 3.4 * s;
        b.add(sp, banyanLeaf[j % 2], M4(x + Math.cos(a) * r, 5.6 * s + (j % 3) * 0.3 * s, z + Math.sin(a) * r * 0.8, 2.6 * s, 1.5 * s, 2.6 * s));
      }
    };
    const palm = (x: number, z: number, s = 1, lean = 0.15) => {
      for (let j = 0; j < 6; j++) b.add(new THREE.CylinderGeometry(0.17 * s, 0.2 * s, 1.2 * s, 8), bark, M4(x + lean * j * j * 0.12 * s, (0.6 + j * 1.15) * s, z, 1, 1, 1, 0, 0, -lean * j * 0.12));
      const top = V(x + lean * 25 * 0.12 * s, 7.3 * s, z);
      for (let j = 0; j < 7; j++) {
        const g = new THREE.ConeGeometry(0.45 * s, 3.2 * s, 4); g.translate(0, 1.6 * s, 0);
        b.add(g, palmLeaf, M4(top.x, top.y, top.z, 1, 1, 0.25, j * 0.9, 0, 1.9));
      }
    };
    const hut = (x: number, z: number, s = 1, yaw = 0) => {
      b.add(new THREE.CylinderGeometry(1.6 * s, 1.7 * s, 2.0 * s, 16), mud, M4(x, 1.0 * s, z, 1, 1, 1, yaw));
      b.add(new THREE.ConeGeometry(2.3 * s, 2.0 * s, 16), thatch, M4(x, 3.0 * s, z, 1, 1, 1, yaw));
      b.add(boxGeo(V(-0.4, 0, 1.55), V(0.4, 1.4, 1.75)), woodDark, M4(x, 0, z, s, s, s, yaw));
    };
    const house = (x: number, z: number, w: number, d: number, h: number, wall: THREE.Material, yaw = 0) => {
      b.add(boxGeo(V(-w / 2, 0, -d / 2), V(w / 2, h, d / 2), 2), wall, M4(x, 0, z, 1, 1, 1, yaw));
      b.add(boxGeo(V(-w / 2 - 0.2, h, -d / 2 - 0.2), V(w / 2 + 0.2, h + 0.35, d / 2 + 0.2)), terracotta, M4(x, 0, z, 1, 1, 1, yaw));
      b.add(boxGeo(V(-0.45, 0, d / 2), V(0.45, 1.8, d / 2 + 0.06)), woodDark, M4(x, 0, z, 1, 1, 1, yaw));
      for (const s of [-1, 1]) b.add(boxGeo(V(s * w / 4 - 0.35, h * 0.55, d / 2), V(s * w / 4 + 0.35, h * 0.55 + 0.7, d / 2 + 0.05)), woodDark, M4(x, 0, z, 1, 1, 1, yaw));
    };
    const ring = (s: SetName, n: number, r0: number, r1: number, seed: number, fn: (x: number, z: number, i: number) => void) => {
      const [ox, oz] = SET[s];
      for (let i = 0; i < n; i++) { const a = rnd(i, seed) * 6.283, r = r0 + rnd(i, seed + 1) * (r1 - r0); fn(ox + Math.cos(a) * r, oz + Math.sin(a) * r, i); }
    };

    // ---- HILL (hook): a grassy mound, banners on poles, trees around ----
    {
      const [ox, oz] = SET.hill, g = new THREE.PlaneGeometry(90, 90, 90, 90); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { p.setY(i, hillY(p.getX(i), p.getZ(i)) + 0.02); uv.setXY(i, uv.getX(i) * 11, uv.getY(i) * 11); }
      g.computeVertexNormals(); g.translate(ox, 0, oz); b.add(g, grass);
      for (const [x, z] of [[-3.2, -2.2], [3.4, -2.0], [-6.5, -5.5], [7, -5]]) {
        const y = hillY(x, z);
        b.add(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 8), wood, M4(ox + x, y + 2.3, oz + z));
        const fl = new THREE.PlaneGeometry(1.4, 0.9); fl.translate(0.7, 0, 0);
        const bm = new THREE.Mesh(fl, new THREE.MeshBasicMaterial({ color: "#d9782a", side: THREE.DoubleSide })); bm.position.set(ox + x + 0.06, y + 4.1, oz + z); bm.rotation.y = 0.4; R.add(bm);
      }
      ring("hill", 40, 30, 70, 11, (x, z, i) => tree(x, z, 0.9 + rnd(i, 3) * 0.5, i));
    }

    // ---- CITY (Pataliputra): stone terrace, pillared hall, pavilions, streets of houses ----
    {
      const [ox, oz] = SET.city;
      b.add(boxGeo(V(ox - 14, 0, oz - 12), V(ox + 14, 4.2, oz + 10), 2), sandstone);
      for (let k = 0; k < 6; k++) b.add(boxGeo(V(ox - 3, 0, oz + 10 + k * 0.6), V(ox + 3, 4.2 - k * 0.7, oz + 10.6 + k * 0.6), 1), sandstone); // steps
      for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 3; iz++) b.add(new THREE.CylinderGeometry(0.32, 0.38, 5, 14), polished, M4(ox - 10 + ix * 4, 6.7, oz - 9 + iz * 3));
      const vault = new THREE.CylinderGeometry(4.6, 4.6, 23, 24, 1, false, 0, Math.PI); vault.rotateZ(Math.PI / 2); vault.rotateX(-Math.PI / 2);
      b.add(vault, terracotta, M4(ox, 9.2, oz - 6, 1, 0.45, 1));
      for (const [x, z] of [[-12, 7], [12, 7], [-12, -11], [12, -11]]) {
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) b.add(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), polished, M4(ox + x + dx * 0.9, 5.5, oz + z + dz * 0.9));
        b.add(new THREE.SphereGeometry(1.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), terracotta, M4(ox + x, 6.8, oz + z));
      }
      for (let i = 0; i < 36; i++) {
        const sx = (i % 9) - 4, row = Math.floor(i / 9), x = ox + sx * 11 + (rnd(i) - 0.5) * 2, z = oz + (row < 2 ? 17 + row * 8 : -22 - (row - 2) * 9) + (rnd(i, 2) - 0.5) * 1.5;
        if (Math.abs(sx) < 1 && row < 2) continue; // keep the avenue in front of the steps clear
        house(x, z, 6 + rnd(i, 3) * 3, 5, 4 + rnd(i, 4) * 3, i % 3 ? wallOchre : wallCream, row < 2 ? (row ? Math.PI : 0) : 0);
      }
      overlay("city", -50, 12, 50, 22, dirt, 6);
      overlay("city", -3, 10, 3, 60, dirt, 6, 0.014);
      ring("city", 50, 60, 120, 21, (x, z, i) => tree(x, z, 1 + rnd(i, 3) * 0.5, i));
      for (const s of [-1, 1]) { b.add(boxGeo(V(ox + s * 30 - 3, 0, oz + 44), V(ox + s * 30 + 3, 11, oz + 50), 2), sandstone); b.add(new THREE.ConeGeometry(4.4, 3, 4), terracotta, M4(ox + s * 30, 12.5, oz + 47, 1, 1, 1, Math.PI / 4)); }
    }

    // ---- COAST (Kalinga): sand, sea, a fort gate, palms ----
    {
      const [ox, oz] = SET.coast;
      overlay("coast", -60, -40, 60, 30, sand, 10);
      const sea = new THREE.Mesh(plane(ox - 220, oz - 600, ox + 220, oz - 30, 0.05, 30), twoTone(new THREE.MeshPhongMaterial({ color: "#2f98c8", specular: "#ffffff", shininess: 80 })));
      sea.receiveShadow = true; R.add(sea);
      for (const [x0, x1] of [[-30, -3.5], [3.5, 30]]) {
        b.add(boxGeo(V(ox + x0, 0, oz - 13), V(ox + x1, 5.5, oz - 10.5), 2), sandstone);
        for (let x = x0; x < x1 - 0.5; x += 1.6) b.add(boxGeo(V(ox + x, 5.5, oz - 13), V(ox + x + 0.8, 6.3, oz - 10.5)), sandstone);
      }
      for (const s of [-1, 1]) { b.add(boxGeo(V(ox + s * 4.8 - 1.6, 0, oz - 14), V(ox + s * 4.8 + 1.6, 8.5, oz - 9.8), 2), sandstone); b.add(new THREE.ConeGeometry(2.6, 2.2, 4), col("kRoof", "#3d4f9a"), M4(ox + s * 4.8, 9.6, oz - 11.9, 1, 1, 1, Math.PI / 4)); }
      b.add(boxGeo(V(ox - 3.2, 0, oz - 12.2), V(ox + 3.2, 4.6, oz - 11.8)), woodDark);
      for (let i = 0; i < 9; i++) palm(ox - 26 + i * 6.5 + (rnd(i) - 0.5) * 2, oz - 4 - rnd(i, 2) * 8, 0.9 + rnd(i, 3) * 0.3, 0.1 + rnd(i, 4) * 0.2);
    }

    // ---- PLAIN (march, battle, aftermath): open field, tree lines ----
    {
      for (let i = 0; i < 60; i++) { const x = SET.plain[0] - 120 + i * 4 + (rnd(i) - 0.5) * 3, z = SET.plain[1] - 95 - rnd(i, 2) * 12; tree(x, z, 1 + rnd(i, 3) * 0.6, i); }
      ring("plain", 30, 45, 110, 31, (x, z, i) => { if (z > SET.plain[1] - 80) tree(x, z, 1 + rnd(i, 3) * 0.5, i); });
      overlay("plain", -60, -60, 60, 40, dirt, 10, 0.006);
      overlay("plain", -60, -60, 60, 40, grass, 8, 0.008); // patchy: grass over dirt with a gap where the battle was
    }

    // ---- ROCK (the edict): a big rounded boulder with a flat face, trees ----
    {
      const [ox, oz] = SET.rock, g = new THREE.BoxGeometry(5.6, 4.0, 3.4, 10, 8, 8), p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const v = V(p.getX(i), p.getY(i), p.getZ(i)), n = v.clone().normalize();
        v.lerp(n.multiplyScalar(Math.max(2.8 * Math.abs(n.x), 2.0 * Math.abs(n.y), 1.7 * Math.abs(n.z)) + 0.6), 0.75);
        v.addScalar(0.22 * Math.sin(v.x * 2.1 + v.y * 1.7) * Math.cos(v.z * 1.9) + 0.08 * Math.sin(v.x * 7.3 + v.z * 5.1));
        if (v.z > 1.3) v.z = 1.3;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      b.add(g, rockM, M4(ox, 1.9, oz));
      ring("rock", 30, 14, 60, 41, (x, z, i) => { if (z < oz + 4) tree(x, z, 1 + rnd(i, 3) * 0.5, i); });
      overlay("rock", -8, -6, 8, 8, dirt, 6);
    }

    // ---- KITCHEN: courtyard, kitchen house, the curry pot on its hearth; the animal queue path ----
    {
      const [ox, oz] = SET.kitchen;
      overlay("kitchen", -6, -4, 10, 8, cob, 4);
      b.add(boxGeo(V(ox + 3, 0, oz - 6), V(ox + 12, 3.2, oz - 5.5), 2), wallCream);
      b.add(boxGeo(V(ox + 11.5, 0, oz - 6), V(ox + 12, 3.2, oz + 10), 2), wallCream);
      house(ox + 7, oz - 9, 9, 6, 4.5, wallOchre);
      b.add(new THREE.CylinderGeometry(1.15, 1.25, 0.4, 24), rockM, M4(ox, 0.2, oz));
      const prof: THREE.Vector2[] = [[0.0, 0], [0.55, 0.02], [0.85, 0.25], [0.95, 0.55], [0.85, 0.85], [0.78, 0.95], [0.88, 1.0], [0.82, 1.04]].map(([r, y]) => new THREE.Vector2(r, y));
      b.add(new THREE.LatheGeometry(prof, 32), copper, M4(ox, 0.38, oz, 1, 0.95, 1));
      b.add(new THREE.CircleGeometry(0.8, 24).rotateX(-Math.PI / 2), col("curry", "#d9902a"), M4(ox, 1.25, oz));
      const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 0.62, 0.08), toneMapped: true });
      for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 8), flameM); m.position.set(ox + Math.cos(i * 1.26) * 1.0, 0.45, oz + Math.sin(i * 1.26) * 1.0); m.layers.set(NOINK); this.flames.push(m); R.add(m); }
      // the queue path: a dusty track out to the horizon
      for (let i = 1; i < QUEUE.length; i++) {
        const [x0, z0] = QUEUE[i - 1], [x1, z1] = QUEUE[i], L = Math.hypot(x1 - x0, z1 - z0), g2 = new THREE.PlaneGeometry(3.2, L); g2.rotateX(-Math.PI / 2);
        b.add(g2, dirt, M4(ox + (x0 + x1) / 2, 0.01 + i * 0.0005, oz + (z0 + z1) / 2, 1, 1, 1, Math.atan2(x1 - x0, z1 - z0)));
      }
      ring("kitchen", 40, 20, 90, 51, (x, z, i) => { const lx = x - ox, lz = z - oz; if (Math.abs(lx - lz * 0.6) > 8 || lz > 0) tree(x, z, 1 + rnd(i, 3) * 0.5, i); });
    }

    // ---- COUNTRY (aerial): villages of huts, fields, roads, trees ----
    {
      const [ox, oz] = SET.country;
      for (let v = 0; v < 9; v++) {
        const cx = ox + (v % 3 - 1) * 60 + (rnd(v) - 0.5) * 20, cz = oz + (Math.floor(v / 3) - 1) * 60 + (rnd(v, 2) - 0.5) * 20;
        for (let h = 0; h < 7; h++) hut(cx + Math.cos(h * 0.9) * (5 + h), cz + Math.sin(h * 0.9) * (5 + h), 0.9 + rnd(h, v) * 0.3, h);
        for (let k = 0; k < 4; k++) b.add(plane(cx + 14 + k * 9, cz - 10, cx + 22 + k * 9, cz + 6, 0.008, 6), crop[(k + v) % 3]);
      }
      overlay("country", -120, 2.5, 120, 5.5, dirt, 6, 0.012);
      overlay("country", -7.5, -120, -4.5, 120, dirt, 6, 0.013);
      ring("country", 120, 10, 130, 61, (x, z, i) => tree(x, z, 0.9 + rnd(i, 3) * 0.6, i));
    }

    // ---- FRIDGE (today): a kitchen corner ----
    {
      const [ox, oz] = SET.fridge;
      b.add(plane(ox - 4, oz - 2.4, ox + 4, oz + 4, 0.01, 2), lam("planks", () => ({ map: planksHD() })));
      b.add(boxGeo(V(ox - 4, 0, oz - 2.6), V(ox + 4, 3.0, oz - 2.4)), teal);
      b.add(boxGeo(V(ox - 4.2, 0, oz - 2.6), V(ox - 4, 3.0, oz + 4)), teal);
      b.add(boxGeo(V(ox - 0.45, 0, oz - 2.35), V(ox + 0.45, 1.85, oz - 1.3)), white);
      b.add(boxGeo(V(ox - 0.44, 1.18, oz - 1.31), V(ox + 0.44, 1.2, oz - 1.29)), col("seam", "#b9b9b4"));
      b.add(boxGeo(V(ox + 0.3, 1.3, oz - 1.3), V(ox + 0.36, 1.7, oz - 1.22)), col("handle", "#9a9a96"));
      b.add(boxGeo(V(ox + 0.6, 0, oz - 2.4), V(ox + 3.4, 0.9, oz - 1.7)), counter);
      b.add(boxGeo(V(ox + 0.55, 0.9, oz - 2.42), V(ox + 3.45, 0.96, oz - 1.66)), white);
      b.add(boxGeo(V(ox - 3.4, 0, oz - 2.4), V(ox - 0.7, 0.9, oz - 1.7)), counter);
      b.add(boxGeo(V(ox - 3.45, 0.9, oz - 2.42), V(ox - 0.65, 0.96, oz - 1.66)), white);
      const sticky = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: stickyTex(), color: 0xeeeeee }));
      sticky.position.set(ox - 0.05, 1.45, oz - 1.288); sticky.rotation.z = 0.06; sticky.layers.set(NOINK); R.add(sticky);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ color: new THREE.Color("#bfe2ff") }));
      win.position.set(ox + 2.0, 1.9, oz - 2.39); R.add(win);
      b.add(boxGeo(V(ox + 1.15, 1.35, oz - 2.4), V(ox + 2.85, 1.42, oz - 2.32)), white);
    }

    // ---- ROAD (pillar, trees, wells, medicine) ----
    {
      const [ox, oz] = SET.road;
      overlay("road", -90, 2.2, 90, 4.8, dirt, 6);
      this.pillar(b, ox, oz, sandstone, polished, false);
      for (const [x, z, s] of [[-18, -6, 1.1], [-24, -1.5, 0.9], [-12, -9, 0.8], [26, -2, 1.0], [-32, 9, 1.0], [34, 9, 0.9]]) banyan(ox + x, oz + z, s);
      b.add(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 8), bark, M4(ox - 13.6, 0.55, oz - 1.4)); // the sapling
      b.add(new THREE.SphereGeometry(0.5, 14, 10), leaf[2], M4(ox - 13.6, 1.25, oz - 1.4, 1, 0.8, 1));
      // well: stone ring, dark water, wooden frame
      b.add(new THREE.CylinderGeometry(1.0, 1.05, 0.9, 24, 1, true), rockM, M4(ox + 14, 0.45, oz - 9.2));
      b.add(new THREE.CylinderGeometry(0.85, 0.85, 0.9, 24, 1, true), rockM, M4(ox + 14, 0.45, oz - 9.2));
      b.add(new THREE.RingGeometry(0.85, 1.05, 24).rotateX(-Math.PI / 2), rockM, M4(ox + 14, 0.9, oz - 9.2));
      b.add(new THREE.CircleGeometry(0.85, 24).rotateX(-Math.PI / 2), col("wellWater", "#1d4d6a"), M4(ox + 14, 0.5, oz - 9.2));
      for (const s of [-1, 1]) b.add(boxGeo(V(-0.07, 0, -0.07), V(0.07, 2.2, 0.07)), wood, M4(ox + 14 + s * 1.15, 0, oz - 9.2));
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8).rotateZ(Math.PI / 2), wood, M4(ox + 14, 2.15, oz - 9.2));
      // a little healer's shelter
      for (const [dx, dz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) b.add(boxGeo(V(-0.07, 0, -0.07), V(0.07, 2.4, 0.07)), wood, M4(ox - 5.8 + dx, 0, oz - 15.4 + dz));
      b.add(new THREE.ConeGeometry(2.6, 1.3, 4), thatch, M4(ox - 5.8, 3.05, oz - 15.4, 1, 1, 1, Math.PI / 4));
      for (let i = 0; i < 18; i++) hut(ox - 70 + i * 8 + (rnd(i) - 0.5) * 3, oz - 30 - rnd(i, 2) * 25, 1, i);
      ring("road", 40, 40, 110, 71, (x, z, i) => tree(x, z, 1 + rnd(i, 3) * 0.5, i));
    }

    // ---- RUINS (golden): a broken pillar stump and its fallen pieces in long grass ----
    {
      const [ox, oz] = SET.ruins;
      b.add(boxGeo(V(ox - 0.8, 0, oz - 0.8), V(ox + 0.8, 0.5, oz + 0.8), 1), sandstone);
      b.add(new THREE.CylinderGeometry(0.4, 0.42, 3.2, 20), polished, M4(ox, 2.1, oz));
      for (let k = 0; k < 5; k++) b.add(new THREE.ConeGeometry(0.22, 0.5 + rnd(k) * 0.5, 4), polished, M4(ox + Math.cos(k * 1.3) * 0.2, 3.85, oz + Math.sin(k * 1.3) * 0.2, 1, 1, 1, k, 0.2, 0.1));
      b.add(new THREE.CylinderGeometry(0.38, 0.4, 4.5, 20).rotateZ(Math.PI / 2), polished, M4(ox + 3.4, 0.38, oz + 1.6, 1, 1, 1, 0.5));
      b.add(new THREE.CylinderGeometry(0.36, 0.38, 2.5, 20).rotateZ(Math.PI / 2), polished, M4(ox - 3.1, 0.36, oz + 0.8, 1, 1, 1, -0.7));
      ring("ruins", 40, 12, 80, 81, (x, z, i) => tree(x, z, 1 + rnd(i, 3) * 0.6, i));
    }

    // ---- LIONS: the lion capital on a plinth ----
    {
      const [ox, oz] = SET.lions;
      this.pillar(b, ox, oz, sandstone, polished, true);
      ring("lions", 30, 14, 70, 91, (x, z, i) => tree(x, z, 1 + rnd(i, 3) * 0.5, i));
      overlay("lions", -5, -5, 12, 5, cob, 4);
    }

    // ---- FLAG ----
    {
      const [ox, oz] = SET.flag;
      b.add(new THREE.CylinderGeometry(0.07, 0.1, 9.2, 12), white, M4(ox, 4.6, oz));
      b.add(new THREE.SphereGeometry(0.14, 12, 8), col("gold", "#e8c04a"), M4(ox, 9.25, oz));
      b.add(boxGeo(V(ox - 0.7, 0, oz - 0.7), V(ox + 0.7, 0.4, oz + 0.7), 1), sandstone);
      ring("flag", 40, 16, 80, 101, (x, z, i) => tree(x, z, 1 + rnd(i, 3) * 0.5, i));
      const g = new THREE.PlaneGeometry(3, 2, 30, 12); g.translate(1.5, 0, 0);
      this.flag = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ map: flagTex(), side: THREE.DoubleSide })));
      this.flag.position.set(ox + 0.08, 7.75, oz);
      R.add(this.flag);
    }
    // ---- the rupee note (shot 20), fluttering in front of the lion lawn ----
    {
      const g = new THREE.PlaneGeometry(1.2, 0.6, 16, 6);
      this.note = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ map: noteTex(), side: THREE.DoubleSide })));
      this.note.position.copy(V(...at("lions", 6, 1.5, -0.4))); this.note.receiveShadow = true;
      R.add(this.note);
    }
    // ---- the edict on the rock face: letters appear as they are carved ----
    {
      const cv = edictCanvas();
      this.edictTex = new THREE.CanvasTexture(cv); this.edictTex.colorSpace = THREE.SRGBColorSpace; this.edictTex.anisotropy = 8;
      this.edict = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.MeshBasicMaterial({ map: this.edictTex, transparent: true, depthWrite: false, color: 0xb0a898 }));
      this.edict.position.copy(V(...at("rock", 0, 2.0, 1.32)));
      this.edict.layers.set(NOINK); this.edict.renderOrder = 1;
      R.add(this.edict);
    }
    b.build(R);
  }

  /** the polished Ashokan pillar: plinth, shaft with an inscription band, lotus bell, abacus with wheels, lions card.
   *  `stub` = capital only (on a low plinth) for the lion close-up. */
  private pillar(b: Batch, ox: number, oz: number, sandstone: THREE.Material, polished: THREE.Material, stub: boolean) {
    const base = stub ? 1.2 : 0.5, shaft = stub ? 0 : PILLAR_H - 1.6;
    b.add(boxGeo(V(ox - (stub ? 0.75 : 0.9), 0, oz - (stub ? 0.75 : 0.9)), V(ox + (stub ? 0.75 : 0.9), base, oz + (stub ? 0.75 : 0.9)), 1), sandstone);
    if (!stub) {
      b.add(new THREE.CylinderGeometry(0.36, 0.44, shaft, 28), polished, M4(ox, base + shaft / 2, oz));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.435, 1.5, 32, 1, true),
        new THREE.MeshBasicMaterial({ map: ctex("pillarText", 1024, 360, (g) => glyphs(g, 6, 22)), transparent: true, depthWrite: false, color: 0xb0a898 }));
      band.position.set(ox, 1.85, oz); band.layers.set(NOINK); band.renderOrder = 1; this.root.add(band);
    }
    const top = base + shaft;
    const bell: THREE.Vector2[] = [[0.36, 0], [0.5, 0.1], [0.62, 0.35], [0.6, 0.6], [0.45, 0.8], [0.38, 0.9]].map(([r, y]) => new THREE.Vector2(r, y));
    b.add(new THREE.LatheGeometry(bell, 28), polished, M4(ox, top, oz));
    const abacus = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 32), twoTone(new THREE.MeshLambertMaterial({ map: abacusTex() })));
    abacus.position.set(ox, top + 1.05, oz); abacus.castShadow = true; abacus.receiveShadow = true; this.root.add(abacus);
    const lions = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.16), twoTone(new THREE.MeshLambertMaterial({ map: lionsTex(), alphaTest: 0.5, side: THREE.DoubleSide })));
    lions.position.set(ox, top + 1.2 + 0.58, oz); lions.layers.set(NOINK); lions.userData.billboard = true; lions.castShadow = true;
    this.root.add(lions);
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(kind: string, i: number) {
    let l = this.actors.get(kind);
    if (!l) { l = []; this.actors.set(kind, l); }
    while (l.length <= i) l.push(kind === "body" ? new Actor(this.root) : new Actor(this.root, animalGeo(kind)));
    return l[i];
  }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 110);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    if ((globalThis as { __noshadow?: boolean }).__noshadow) this.sun.castShadow = false;
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = Math.max(L.fogFar, 420);
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    // clouds ride with the camera (a ring 650 m out, rotated per shot so each set gets its own sky)
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = (i / this.clouds.length) * Math.PI * 2 + id * 0.7, d = 640 + (i % 3) * 60, w = 140 + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d, 110 + (i % 4) * 36, cam.position.z + Math.sin(a) * d);
      m.scale.set(w, w / 2, 1); m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    // ---- animated props ----
    {
      const p = this.flag.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const ix = i % 31, iy = Math.floor(i / 31), u = ix / 30, x = u * 3, y = 1 - iy / 6;
        p.setXYZ(i, x - 0.08 * u * u, y + 0.05 * u * Math.sin(t * 3 - u * 4), 0.28 * u * Math.sin(t * 5 - u * 6) + 0.08 * u * Math.sin(t * 8.3 - u * 9 + iy));
      }
      p.needsUpdate = true; this.flag.geometry.computeVertexNormals();
      const q = this.note.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < q.count; i++) { const ix = i % 17, iy = Math.floor(i / 17), x = -0.6 + ix * 0.075, y = 0.3 - iy * 0.1; q.setXYZ(i, x, y, 0.06 * Math.sin(t * 3 + x * 5) + 0.03 * Math.sin(t * 5 + y * 8)); }
      q.needsUpdate = true; this.note.geometry.computeVertexNormals();
      this.note.position.y = 1.5 + 0.04 * Math.sin(t * 2.1); this.note.rotation.set(0.05 * Math.sin(t * 1.7), -0.15 + 0.08 * Math.sin(t * 1.3), 0.06 * Math.sin(t * 2.3));
      // the edict: nothing before "Carved", then letters appear stroke by stroke over 1.5 s; full ever after
      const upTo = id < 9 ? 0 : id > 9 ? 1 : Math.round(clamp01((t - CUE.carved + 0.1) / 1.5) * 60) / 60;
      if (upTo !== this.edictUpTo) {
        const g = edictCanvas().getContext("2d")!;
        g.clearRect(0, 0, 1024, 720); glyphs(g, 7, 14, upTo);
        this.edictTex.needsUpdate = true; this.edictUpTo = upTo;
      }
      for (const [i, m] of this.flames.entries()) m.scale.set(1, 0.8 + 0.35 * Math.abs(Math.sin(t * 11 + i * 1.7)), 1);
      this.root.traverse((o) => { if (o.userData.billboard) o.rotation.y = Math.atan2(cam.position.x - o.position.x, cam.position.z - o.position.z); });
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const count = new Map<string, number>();
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 4))) continue;
      const kind = p.geo ?? "body", n = count.get(kind) ?? 0;
      count.set(kind, n + 1);
      const a = this.actor(kind, n);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (const [kind, l] of this.actors) for (let i = count.get(kind) ?? 0; i < l.length; i++) l[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
