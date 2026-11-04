// The Ashoka cast as lit flat cards in the 3D world (cartoon-3d-short skill, cast.ts pattern): every character or
// animal asks for a drawing (key + draw call) each frame, the pool keeps one canvas per distinct drawing, cards are
// yaw-only billboards shaded by cardShade() with tight contact blobs; effects are unlit cards. All on the NOINK layer.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxShadow, fxContact, fxPuff, Outfit, Expr, FrontOpts, SideOpts,
  ASHOKA, ASHOKA_CALM, mauryan, kalinga, villager, CARVER, COOK, HEALER, KID, PARENT } from "./toon";
import { drawAnimal, ANIMAL, AnimalOpts, fxDebris, fxBanner, fxChips, fxDust, fxSweat, fxSword } from "./zoo";
import { FPS, SHOTS, V3, CUE, at, smooth, clamp01, HERO_HILL, HERO_TERRACE, HERO_FIELD, ROCK_FACE, POT, FRIDGE, PILLAR, QUEUE, hillY } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: string; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- crowd by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };

const AN_GEO = new Map<string, THREE.PlaneGeometry>();
/** card geometry of an animal kind: metres tall, feet (25 units above the canvas bottom) at y = 0 */
export const animalGeo = (kind: string) => {
  let g = AN_GEO.get(kind);
  if (!g) {
    const a = ANIMAL[kind];
    g = new THREE.PlaneGeometry((a.m * a.w) / a.h, a.m); g.translate(0, a.m / 2 - (a.m * 25) / a.h, 0);
    AN_GEO.set(kind, g);
  }
  return g;
};
const LEAD_S = 2 / FPS;
const before = (t: number, cue: number) => t < cue - LEAD_S;

/** an animal card: side view, walking along (dx, dz) (or standing when speed is 0), mirrored to face its direction */
const animal = (cam: CamInfo, out: Stage, t: number, i: number, kind: string, x: number, y: number, z: number, dx: number, dz: number, walking: boolean, o: AnimalOpts = {}) => {
  const a = ANIMAL[kind], d = cam.pos.distanceTo(tmp.set(x, y + a.m / 2, z)) / a.m;
  const k = d < 1.6 ? 1.3 : d < 4 ? 0.8 : d < 10 ? 0.4 : 0.2;
  const mirror = dx * cam.right.x + dz * cam.right.z < 0;
  const ao: AnimalOpts = { ...o, phase: walking ? q(((t * 1.1 + hh(i, 3)) % 1), 12) : 0, blink: lidAt(t, i + 300) };
  out.places.push({ key: `A|${kind}|${fkey(ao)}`, geo: kind, x, y, z, mirror, size: [Math.round(a.w * k), Math.round(a.h * k), k], draw: (p) => drawAnimal(p, kind, ao) });
  blob(out, x, y, z, a.m * 0.9);
};
/** a standing / walking person, front view unless walking across the lens */
const human = (cam: CamInfo, out: Stage, t: number, i: number, o: Outfit, okey: string, x: number, y: number, z: number,
  fo: FrontOpts, walk?: { dx: number; dz: number; speed?: number }, scale = 1) => {
  const who: Who = { i, o, okey };
  const blink = fo.expr === "whistle" ? 0 : lidAt(t, i);
  if (walk) {
    const ph = q(((t * (walk.speed ?? 1) + hh(i, 1)) % 1), 24);
    const view = viewOf(cam, x, z, walk.dx, walk.dz);
    const f2: FrontOpts = { ...fo, mode: "stroll", phase: ph, blink, lift: 50 };
    const so: SideOpts = { expr: fo.expr, mode: "march", phase: ph, blink, stomp: 0.6, stride: view.fs * 0.8 };
    out.places.push(person(cam, who, x, y, z, view, f2, so, scale));
  } else out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { mode: "stand", ...fo, blink }, {}, scale));
  if (fo.mode !== "sit") blob(out, x, y, z, scale);
};
/** a marching block of Mauryan soldiers: rows x files, front row at local (x0, z0), marching along -z at 1.6 m/s */
const block = (cam: CamInfo, out: Stage, t: number, base: V3, rows: number, files: number, t0: number, expr: (i: number) => Expr, i0 = 0, cull = 140) => {
  const ph = q(((t - t0) % 1 + 1) % 1, 24), F = base[2] - 1.6 * (t - t0);
  for (let i = 0; i < rows * files; i++) {
    const r = Math.floor(i / files), c = i % files;
    const x = base[0] + (c - (files - 1) / 2) * 1.15 + (hh(i, 1) - 0.5) * 0.1, z = F + r * 1.35 + (hh(i, 2) - 0.5) * 0.1;
    if (cam.pos.distanceTo(tmp.set(x, 1, z)) > cull) continue;
    const view = viewOf(cam, x, z, 0, -1), e = expr(i), blink = lidAt(t, i + i0);
    out.places.push(person(cam, { i: i + i0, o: mauryan(vOf(i)), okey: `m${vOf(i)}` }, x, base[1], z, view,
      { phase: ph, expr: e, mode: "march", blink, lift: 55 }, { phase: ph, expr: e, mode: "march", blink, stomp: 1, stride: view.fs }));
    blob(out, x, base[1], z);
  }
};
const queuePos = (u: number): [number, number] => {
  // u = distance along the queue path in metres
  let s = u;
  for (let i = 1; i < QUEUE.length; i++) {
    const [x0, z0] = QUEUE[i - 1], [x1, z1] = QUEUE[i], L = Math.hypot(x1 - x0, z1 - z0);
    if (s <= L) return [x0 + ((x1 - x0) * s) / L, z0 + ((z1 - z0) * s) / L];
    s -= L;
  }
  return QUEUE[QUEUE.length - 1];
};
const QKIND = ["goat", "chicken", "goat", "deer", "chicken", "peacock", "goat", "chicken"];
const queue = (cam: CamInfo, out: Stage, t: number, leaving: boolean) => {
  for (let i = 0; i < 90; i++) {
    const kind = QKIND[i % 8];
    const u0 = 1.8 + i * 1.9 + (hh(i, 4) - 0.5) * 0.6, u = leaving ? u0 + 2.2 * (t - CUE.luckily + 0.3) + 1.5 : u0 + 0.25 * Math.sin(t * 0.8 + i);
    const [lx, lz] = queuePos(u), side = (hh(i, 5) - 0.5) * 1.4;
    const [x, , z] = at("kitchen", lx + side, 0, lz);
    if (cam.pos.distanceTo(tmp.set(x, 0.6, z)) > 110) continue;
    const [nx, nz] = queuePos(u + 1), dx = nx - lx, dz = nz - lz;
    animal(cam, out, t, i, kind, x, 0, z, leaving ? dx : -dx, leaving ? dz : -dz, true, leaving ? { happy: true } : { nervous: i % 3 === 0 });
  }
};

/** everything with a face (people, animals) and the effect cards in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  switch (s.beat) {
    case "hook": {
      const dropped = !before(t, CUE.gaveUp);
      const expr: Expr = before(t, 2.2) ? "grin" : before(t, CUE.miserable) ? "smile" : before(t, CUE.gaveUp + 0.9) ? "sad" : "pained";
      human(cam, out, t, 1, dropped ? { ...ASHOKA_CALM } : ASHOKA, dropped ? "ashokaC" : "ashoka", HERO_HILL[0], HERO_HILL[1], HERO_HILL[2], { expr, headTilt: before(t, CUE.gaveUp) ? 0 : 6 });
      // the sword: falls from the hip and lands flat in the grass
      const u = clamp01((t - CUE.gaveUp) / 0.45);
      if (u > 0) {
        const [hx, hy, hz] = HERO_HILL;
        if (u < 1) out.fx.push({ key: "sword", cw: 512, ch: 128, draw: fxSword, x: hx + 0.45, y: hy + 0.9 * (1 - u * u) + 0.06, z: hz + 0.35, w: 1.0, h: 0.25, rot: -1.2 * u });
        else out.fx.push({ key: "sword", cw: 512, ch: 128, draw: fxSword, x: hx + 0.5, y: hy + 0.03, z: hz + 0.5, w: 1.0, h: 0.25, flat: true, rot: 0.4 });
      }
      // the army below the hill, cheering then quiet
      for (let i = 0; i < 46; i++) {
        const lx = -14 + (i % 12) * 2.4 + (hh(i, 6) - 0.5) * 1.2, lz = -10 - Math.floor(i / 12) * 3.2 + (hh(i, 7) - 0.5);
        const [x, , z] = at("hill", lx, 0, lz);
        human(cam, out, t, 10 + i, mauryan(vOf(i)), `m${vOf(i)}`, x, hillY(lx, lz), z, { expr: before(t, CUE.miserable) ? (i % 3 ? "grin" : "laugh") : i % 2 ? "nervous" : "neutral" });
      }
      for (const [i, lx, lz] of [[60, -2.4, -1.6], [61, 2.6, -1.4]] as const) {
        const [x, , z] = at("hill", lx, 0, lz);
        human(cam, out, t, i, mauryan(i), `m${i % 4}`, x, hillY(lx, lz), z, { expr: before(t, CUE.gaveUp) ? "grin" : "shock" });
      }
      break;
    }
    case "city": {
      const [hx, hy, hz] = HERO_TERRACE;
      human(cam, out, t, 1, ASHOKA, "ashoka", hx, hy, hz, { expr: before(t, CUE.wontBow) ? "grin" : "stern", look: before(t, 10.0) ? 0 : 1 });
      human(cam, out, t, 2, mauryan(1), "m1", hx - 1.9, hy, hz - 0.6, { expr: "stern" });
      human(cam, out, t, 3, mauryan(2), "m2", hx + 1.9, hy, hz - 0.6, { expr: "stern" });
      for (let i = 0; i < 26; i++) {
        const lane = i % 2 ? 14 : 20, dir = i % 4 < 2 ? 1 : -1, x0 = -40 + ((i * 13) % 80);
        const x = x0 + dir * 1.1 * (t - 6) * (0.8 + hh(i) * 0.4);
        const [wx, , wz] = at("city", ((x + 60) % 120) - 60, 0, lane + (hh(i, 2) - 0.5) * 3);
        human(cam, out, t, 20 + i, villager(i), `v${i % 6}`, wx, 0, wz, { expr: "smile" }, { dx: dir, dz: 0, speed: 1 });
      }
      break;
    }
    case "kalinga": {
      for (let i = 0; i < 9; i++) {
        const [x, , z] = at("coast", -4 + i * 1.0 + (hh(i) - 0.5) * 0.2, 0, -0.6 * Math.abs(i - 4) * 0.4 - (i % 2) * 0.5);
        human(cam, out, t, 100 + i, kalinga(i), `k${i % 4}`, x, 0, z, { expr: i === 4 ? "stern" : i % 3 ? "stern" : "smile" });
      }
      break;
    }
    case "march": {
      if (t < CUE.elephants - LEAD_S) block(cam, out, t, at("plain", 0, 0, 8), 12, 4, 13.2, (i) => (i % 3 ? "stern" : "grin"));
      else if (t < CUE.more - LEAD_S) {
        for (let i = 0; i < 3; i++) {
          const [x, , z] = at("plain", (i - 1) * 4.2, 0, 20 + i * 3 - 1.4 * (t - CUE.elephants));
          animal(cam, out, t, i, "elephant", x, 0, z, 0, -1, true, { war: true });
        }
        block(cam, out, t, at("plain", 0, 0, 30), 6, 4, 14.0, () => "stern", 200);
      } else {
        block(cam, out, t, at("plain", -4, 0, -4), 14, 8, 15.4, (i) => (i % 4 ? "stern" : "grin"), 400, 160);
        for (let i = 0; i < 6; i++) {
          const [x, , z] = at("plain", 7 + (i % 2) * 4.5, 0, -2 + Math.floor(i / 2) * 7 - 1.4 * (t - CUE.more));
          animal(cam, out, t, i + 10, "elephant", x, 0, z, 0, -1, true, { war: true });
        }
      }
      break;
    }
    case "battle": {
      const grow = smooth((t - 17.0) / 3.6), n = Math.round(10 + 14 * grow);
      for (let i = 0; i < n; i++) {
        const lz = -18 - i * 1.3, lunge = 0.35 * Math.sin(t * 7 + i);
        const [mx, , mz] = at("plain", -2.4 - (i % 3) * 1.2 + lunge, 0, lz), [kx, , kz] = at("plain", 2.4 + (i % 3) * 1.2 - lunge, 0, lz - 0.6);
        human(cam, out, t, 500 + i, mauryan(vOf(i)), `m${vOf(i)}`, mx, 0, mz, { expr: i % 2 ? "stern" : "shock" }, { dx: 1, dz: 0, speed: 2 });
        human(cam, out, t, 600 + i, kalinga(vOf(i + 1)), `k${vOf(i + 1)}`, kx, 0, kz, { expr: i % 2 ? "stern" : "nervous" }, { dx: -1, dz: 0, speed: 2 });
      }
      // the cartoon fight cloud between the lines grows with the battle
      for (let k = 0; k < 4 + Math.round(10 * grow); k++) {
        const [x, , z] = at("plain", (hh(k, 8) - 0.5) * 2.2, 0, -19 - k * 2.6);
        const sz = (3 + 2.5 * grow) * (0.8 + 0.4 * hh(k, 9)), wob = 0.15 * Math.sin(t * 9 + k);
        out.fx.push({ key: `dust${k % 4}`, cw: 512, ch: 512, draw: (p) => fxDust(p, k % 4), x, y: sz * 0.32, z, w: sz * (1 + wob), h: sz * (1 - wob), soft: true });
        if (k % 3 === 0) { const u = q((t * 2 + hh(k)) % 1, 15); out.fx.push({ key: `burst${u}`, cw: 400, ch: 400, draw: (p) => fxBurst(p, u), x, y: 1.6 + hh(k, 2), z: z + 1.2, w: 1.4, h: 1.4 }); }
      }
      if (t > CUE.bigger - 0.5) for (let i = 0; i < 4; i++) {
        const [x, , z] = at("plain", i % 2 ? 9 : -9, 0, -16 - i * 9);
        animal(cam, out, t, 40 + i, "elephant", x, 0, z, i % 2 ? -1 : 1, 0, true, { war: true });
      }
      break;
    }
    case "after": case "conqueror": {
      debris(out);
      if (s.beat === "conqueror") {
        const [hx, hy, hz] = HERO_FIELD;
        const expr: Expr = before(t, 27.7) ? "stern" : before(t, CUE.sick) ? "shock" : "pained";
        human(cam, out, t, 1, ASHOKA, "ashoka", hx, hy, hz, { expr });
        if (!before(t, CUE.sick)) out.fx.push({ key: "sweat", cw: 128, ch: 128, draw: fxSweat, x: hx + 0.32, y: hy + 1.95 - 0.1 * clamp01((t - CUE.sick) * 2), z: hz + 0.2, w: 0.14, h: 0.14 });
      }
      break;
    }
    case "captives": {
      debris(out);
      for (let i = 0; i < 40; i++) {
        const [x, , z] = at("plain", (i % 2 ? 0.7 : -0.7) + (hh(i) - 0.5) * 0.3, 0, -30 - Math.floor(i / 2) * 1.6 - 0.9 * (t - 24.8));
        human(cam, out, t, 700 + i, i % 9 === 4 ? mauryan(i) : villager(i), i % 9 === 4 ? `m${i % 4}` : `v${i % 6}`, x, 0, z, { expr: i % 9 === 4 ? "stern" : "sad" }, { dx: 0, dz: -1, speed: 0.8 });
      }
      break;
    }
    case "rock": {
      const [rx, , rz] = ROCK_FACE;
      human(cam, out, t, 1, ASHOKA_CALM, "ashokaC", rx - 1.6, 0, rz + 3.2, { expr: before(t, CUE.sorry) ? "sad" : "relief", headTilt: before(t, CUE.sorry) ? 0 : 12 });
      // the carver: hammer blows from "Carved" on, every 0.27 s
      const tb = t - CUE.carved, ph = tb < 0 ? 0 : (tb % 0.27) / 0.27, strike = tb < 0 ? 0 : ph < 0.25 ? ph / 0.25 : 1 - (ph - 0.25) / 0.75;
      human(cam, out, t, 2, CARVER, "carver", rx + 1.25, 0, rz + 1.9, { expr: "smile_closed", prop: ["hammer", q(strike, 12)] });
      if (tb >= 0) { const u = q(Math.min(1, ((tb % 0.27) / 0.27) * 1.4), 10); out.fx.push({ key: `chips${u}`, cw: 256, ch: 256, draw: (p) => fxChips(p, u), x: rx + 0.7, y: 2.0, z: rz + 1.45, w: 0.7, h: 0.7 }); }
      break;
    }
    case "kitchen": case "fewer": case "luckily": case "peacocks": {
      const [px, , pz] = POT;
      human(cam, out, t, 2, COOK, "cook", px + 1.5, 0, pz - 0.2, { expr: s.beat === "kitchen" ? "grin" : s.beat === "fewer" ? "neutral" : "smile" });
      if (s.beat === "kitchen") queue(cam, out, t, false);
      if (s.beat === "luckily") queue(cam, out, t, true);
      if (s.beat !== "kitchen") {
        const nerv = s.beat !== "luckily";
        animal(cam, out, t, 900, "peacock", px + 0.55, 0, pz + 1.55, -1, 0, false, { nervous: nerv, look: s.beat === "peacocks" && !before(t, CUE.peacocks) ? -1 : 0 });
        animal(cam, out, t, 901, "peacock", px + 1.0, 0, pz + 1.15, -1, 0, false, { nervous: nerv, look: s.beat === "peacocks" && !before(t, CUE.peacocks) ? -1 : 0 });
        animal(cam, out, t, 902, "deer", px - 1.5, 0, pz + 1.0, 1, 0, false, { happy: s.beat === "luckily" });
      }
      break;
    }
    case "country": {
      for (let i = 0; i < 70; i++) {
        const road = i % 3, dir = i % 2 ? 1 : -1, u = ((hh(i) * 160 + dir * 1.2 * (t - 45) + 400) % 160) - 80;
        const [x, , z] = road === 0 ? at("country", u, 0, 4) : road === 1 ? at("country", -6, 0, u) : at("country", u * 0.7, 0, 20 + u * 0.7);
        human(cam, out, t, 1000 + i, villager(i), `v${i % 6}`, x, 0, z, { expr: "smile" }, { dx: road === 1 ? 0 : dir, dz: road === 0 ? 0 : dir, speed: 1 });
      }
      for (let i = 0; i < 10; i++) { const [x, , z] = at("country", -30 + i * 7, 0, -14 + (i % 3) * 5); animal(cam, out, t, 1100 + i, i % 2 ? "cow" : "goat", x, 0, z, 1, 0, false); }
      break;
    }
    case "fridge": {
      const [fx, , fz] = FRIDGE;
      const kx = -2.6 + Math.min(2.2, 1.3 * Math.max(0, t - 49.4)), kidWalk = t > 49.4 && kx < 2.2 - 2.6 + 2.19;
      human(cam, out, t, 1, KID, "kid", fx + kx - 0.15, 0, fz + 1.05, { expr: before(t, CUE.reads) ? "smile" : "grin", look: kidWalk ? 0 : 1 }, kidWalk ? { dx: 1, dz: 0, speed: 1.6 } : undefined);
      const px = 2.8 - Math.min(2.0, 1.4 * Math.max(0, t - CUE.walks + 0.2)), parWalk = t > CUE.walks - 0.2 && px > 0.81;
      if (t > CUE.walks - 0.8) human(cam, out, t, 2, PARENT, "parent", fx + px, 0, fz + 1.35, { expr: before(t, CUE.reads) ? "neutral" : "smile_closed", look: parWalk ? 0 : -1 }, parWalk ? { dx: -1, dz: 0, speed: 1.2 } : undefined);
      break;
    }
    case "pillar": {
      const [ox, , oz] = PILLAR;
      for (let i = 0; i < 16; i++) {
        const dir = i % 2 ? 1 : -1, u = ((hh(i) * 70 + dir * 1.1 * (t - 53)) % 70 + 70) % 70 - 35;
        human(cam, out, t, 1200 + i, villager(i + 2), `v${(i + 2) % 6}`, ox + u, 0, oz + 3.2 + (i % 3) * 0.7, { expr: "smile" }, { dx: dir, dz: 0, speed: 1 });
      }
      const rd: [number, number, Expr][] = [[-0.85, 1.35, "smile_closed"], [0.9, 1.25, "grin"], [0.1, 1.75, "smile"]];
      rd.forEach(([dx, dz, e], i) => human(cam, out, t, 1300 + i, villager(i * 2 + 1), `v${(i * 2 + 1) % 6}`, ox + dx, 0, oz + dz, { expr: before(t, CUE.language) ? "neutral" : e, look: dx < 0 ? 1 : -1 }));
      break;
    }
    case "works": {
      const R = (x: number, z: number) => at("road", x, 0, z);
      // shade trees: travellers resting in the banyan shade, a gardener planting a sapling
      [[-16, -3], [-17.5, -2.4], [-19, -3.4]].forEach(([x, z], i) => { const [wx, , wz] = R(x, z); human(cam, out, t, 1400 + i, villager(i + 3), `v${(i + 3) % 6}`, wx, 0, wz, { mode: "sit", expr: "smile_closed" }); });
      { const [wx, , wz] = R(-13, -1.2); human(cam, out, t, 1410, villager(4), "v4", wx, 0, wz, { expr: "grin", prop: ["hammer", q(0.5 + 0.5 * Math.sin(t * 6), 8)] }); }
      // the well
      { const [wx, , wz] = R(13.0, -8.4); human(cam, out, t, 1420, villager(1), "v1", wx, 0, wz, { expr: "smile", wave: q(0.5 + 0.5 * Math.sin(t * 4), 8) }); }
      { const [wx, , wz] = R(15.2, -8.0); human(cam, out, t, 1421, KID, "kid", wx, 0, wz, { expr: "grin" }); }
      // medicine for people, then for animals
      { const [wx, , wz] = R(-5.4, -13.4); human(cam, out, t, 1430, HEALER, "healer", wx, 0, wz, { expr: "smile" }); }
      { const [wx, , wz] = R(-4.4, -13.0); human(cam, out, t, 1431, villager(5), "v5", wx, 0, wz, { mode: "sit", expr: before(t, 60.6) ? "pained" : "relief" }); }
      { const [wx, , wz] = R(-8.6, -14.2); animal(cam, out, t, 1440, "cow", wx, 0, wz, 1, 0, false, { bandage: true, happy: !before(t, CUE.animals) }); }
      { const [wx, , wz] = R(-7.1, -13.4); human(cam, out, t, 1441, villager(2), "v2", wx, 0, wz, { expr: "smile_closed" }); }
      break;
    }
    case "ruins": { const [x, , z] = at("ruins", -3.5, 0, -2.5); animal(cam, out, t, 1500, "goat", x, 0, z, 1, 0, false); break; }
    default: break;
  }
  return out;
};

/** what a battle leaves on the field: shields, broken spears, helmets and fallen banners lying in the grass (no people) */
const debris = (out: Stage) => {
  for (let i = 0; i < 70; i++) {
    const k = i % 3, [x, , z] = at("plain", (hh(i, 20) - 0.5) * 40, 0, 10 - hh(i, 21) * 50);
    if (Math.abs(x - HERO_FIELD[0]) < 1.4 && Math.abs(z - HERO_FIELD[2]) < 1.4) continue;
    out.fx.push({ key: `debris${k}`, cw: 512, ch: 512, draw: (p) => fxDebris(p, k), x, y: 0.02 + (i % 5) * 0.002, z, w: 0.9, h: 0.9, flat: true, rot: hh(i, 22) * 6.28 });
  }
  for (let i = 0; i < 12; i++) {
    const [x, , z] = at("plain", (hh(i, 30) - 0.5) * 30, 0, 6 - hh(i, 31) * 40);
    out.fx.push({ key: "banner", cw: 512, ch: 256, draw: fxBanner, x, y: 0.03, z, w: 2.4, h: 1.2, flat: true, rot: hh(i, 32) * 6.28 });
  }
};
export { FPS };
