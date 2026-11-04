// Timeline of "The King Who Said Sorry in Stone": shots timed to the narration word timings
// (shorts/ashoka/voice/words.json, 30 fps), the camera grammar of the cartoon-3d-short skill (smootherstep glides,
// creeping push-ins on every hold, hard cuts on big reframes, flip kicks on impacts) and the lens table.
// The whole film lives in one world: each beat has its own small set at its own origin (SET below).
export const FPS = 30;
export const TOTAL = 2085;
export const D0 = 0; // ground height (build.ts helpers read it)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const W = (s: number) => Math.round(s * FPS); // word time (s) -> frame

// ---------------- sets (world origins, x/z) ----------------
export const SET = {
  hill: [0, 0], city: [400, 0], coast: [-400, 0], plain: [0, -400], rock: [800, 0], kitchen: [400, 400],
  country: [-800, -800], fridge: [1200, 0], road: [800, -400], ruins: [1200, -400], lions: [1600, 0], flag: [1600, -400],
} as const;
export type SetName = keyof typeof SET;
export const at = (s: SetName, x: number, y: number, z: number): V3 => [SET[s][0] + x, y, SET[s][1] + z];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Beat = "hook" | "city" | "kalinga" | "march" | "battle" | "after" | "captives" | "conqueror" | "rock" | "kitchen" | "queue" | "fewer"
  | "luckily" | "peacocks" | "country" | "fridge" | "pillar" | "works" | "ruins" | "lions" | "note" | "flag";
export type ShotDef = { id: number; a: number; b: number; light: Light; beat: Beat; set: SetName; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 186, light: "day", beat: "hook", set: "hill" },
  { id: 2, a: 186, b: 356, light: "day", beat: "city", set: "city", sunAz: 120 },
  { id: 3, a: 356, b: 405, light: "day", beat: "kalinga", set: "coast", sunAz: 150 },
  { id: 4, a: 405, b: 513, light: "day", beat: "march", set: "plain" },
  { id: 5, a: 513, b: 620, light: "day", beat: "battle", set: "plain" },
  { id: 6, a: 620, b: 745, light: "golden", beat: "after", set: "plain" },
  { id: 7, a: 745, b: 815, light: "golden", beat: "captives", set: "plain" },
  { id: 8, a: 815, b: 884, light: "golden", beat: "conqueror", set: "plain" },
  { id: 9, a: 884, b: 1030, light: "day", beat: "rock", set: "rock" },
  { id: 10, a: 1030, b: 1185, light: "day", beat: "kitchen", set: "kitchen" },
  { id: 11, a: 1185, b: 1250, light: "day", beat: "fewer", set: "kitchen" },
  { id: 12, a: 1250, b: 1304, light: "day", beat: "luckily", set: "kitchen" },
  { id: 13, a: 1304, b: 1366, light: "day", beat: "peacocks", set: "kitchen" },
  { id: 14, a: 1366, b: 1478, light: "day", beat: "country", set: "country", sunAz: 120 },
  { id: 15, a: 1478, b: 1594, light: "day", beat: "fridge", set: "fridge" },
  { id: 16, a: 1594, b: 1723, light: "day", beat: "pillar", set: "road" },
  { id: 17, a: 1723, b: 1859, light: "day", beat: "works", set: "road" },
  { id: 18, a: 1859, b: 1932, light: "golden", beat: "ruins", set: "ruins" },
  { id: 19, a: 1932, b: 1972, light: "day", beat: "lions", set: "lions" },
  { id: 20, a: 1972, b: 1996, light: "day", beat: "note", set: "lions" },
  { id: 21, a: 1996, b: TOTAL, light: "day", beat: "flag", set: "flag", sunAz: 110 },
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 6: 8, 9: 8, 14: 8, 15: 6, 16: 6, 18: 10, 19: 8 };
export const FLASH_AT = 186;

// word cues used by cast.ts / world.ts (seconds, from words.json)
export const CUE = {
  miserable: 4.06, gaveUp: 4.92, rules: 8.04, wontBow: 11.12, sends: 13.7, elephants: 14.92, more: 16.0, bigger: 20.2,
  dead: 24.32, marched: 26.42, sick: 28.94, sorry: 31.7, carved: 33.36, hundreds: 37.08, now: 39.56, luckily: 41.76, unluckily: 43.52,
  peacocks: 44.86, fridge: 50.04, walks: 51.38, reads: 52.54, pillars: 54.72, language: 56.96, trees: 58.34, wells: 59.2,
  medicine: 60.16, animals: 61.4, lions: 64.9, note: 65.88, wheel: 66.82,
};

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during a crossfade */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
const D = (s: SetName, f0: number, rate: number, pos: [number, number, number], look: [number, number, number], rest: Partial<Cam> = {}, punch = 0, n = 35) =>
  (f: number) => dolly(at(s, ...pos), at(s, ...look), pushK(f, f0, rate, punch, n), rest);
const Z = (s: SetName, f0: number, rate: number, pos: [number, number, number], look: [number, number, number], fov: number, rest: Partial<Cam> = {}, punch = 0, n = 35) =>
  (f: number) => zoom(at(s, ...pos), at(s, ...look), fov, pushK(f, f0, rate, punch, n), rest);

// where the people stand (cast.ts reads these too)
export const HERO_HILL: V3 = at("hill", 0, 6.0, 0); // hilltop
export const HERO_TERRACE: V3 = at("city", 0, 4.2, 8);
export const HERO_FIELD: V3 = at("plain", 0, 0, 6);
export const ROCK_FACE: V3 = at("rock", 0, 0, 0);
export const POT: V3 = at("kitchen", 0, 0, 0);
export const FRIDGE: V3 = at("fridge", 0, 0, -1.6);
export const PILLAR: V3 = at("road", 0, 0, 0);
export const PILLAR_H = 12.5;

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: D("hill", 0, 0.0025, [6, 8.4, 14], [0, 7.4, 0], { fov: 42 }) },
    { f: 70, dur: 30, s: D("hill", 70, 0.002, [2.4, 7.7, 6.2], [0, 7.6, 0], { fov: 38, roll: -0.04 }) },
    { f: W(CUE.miserable) - 6, dur: 24, s: D("hill", W(CUE.miserable), 0.002, [0.9, 7.8, 3.6], [0, 7.75, 0], { fov: 36, roll: 0.04 }, 0.006, 30) },
    { f: W(CUE.gaveUp) + 4, cut: true, s: D("hill", W(CUE.gaveUp), 0.0025, [1.6, 6.6, 3.2], [0.3, 6.2, 0.3], { fov: 40, roll: -0.03 }) },
  ],
  2: [
    { f: 186, s: Z("city", 186, 0.002, [38, 30, 60], [0, 4, 0], 42) },
    { f: W(CUE.rules), cut: true, s: D("city", W(CUE.rules), 0.0025, [2.2, 5.9, 13.5], [0, 5.6, 8], { fov: 38, roll: 0.03 }) },
    { f: 300, dur: 30, s: D("city", 300, 0.002, [-1.2, 5.8, 11.6], [0.2, 5.75, 8], { fov: 34, roll: -0.04 }) },
  ],
  3: [{ f: 356, s: D("coast", 356, 0.003, [3, 2.2, 10], [0, 1.8, 0], { fov: 40 }, 0.006, 30) }],
  4: [
    { f: 405, s: D("plain", 405, 0.0025, [10, 2.2, 6], [0, 1.4, 0], { fov: 42, roll: 0.03 }) },
    { f: W(CUE.elephants) - 2, cut: true, s: D("plain", 442, 0.0025, [14, 2.0, 22], [0, 2.5, 16], { fov: 44, roll: -0.03 }) },
    { f: W(CUE.more) - 2, cut: true, s: D("plain", 478, 0.002, [26, 22, 14], [0, 0, -6], { fov: 46 }) },
  ],
  5: [
    { f: 513, s: D("plain", 513, 0.0025, [16, 4, -18], [0, 1.5, -24], { fov: 44, roll: -0.03 }) },
    { f: W(CUE.bigger) - 14, dur: 28, s: D("plain", W(CUE.bigger) - 14, 0.0015, [36, 22, -4], [0, 0, -24], { fov: 48, roll: 0 }) },
  ],
  6: [
    { f: 616, s: D("plain", 616, 0.002, [4, 1.2, 12], [0, 0.6, -2], { fov: 42 }) },
    { f: 690, cut: true, s: D("plain", 690, 0.0015, [18, 16, 26], [0, 0, -8], { fov: 46, roll: 0.02 }) },
  ],
  7: [{ f: 745, s: D("plain", 745, 0.002, [-6, 3.0, -14], [0, 1.0, -34], { fov: 40, roll: -0.03 }) }],
  8: [
    { f: 815, s: D("plain", 815, 0.0025, [1.6, 1.75, 11.2], [0, 1.65, 6], { fov: 36 }) },
    { f: W(CUE.sick) - 12, dur: 24, s: D("plain", W(CUE.sick) - 12, 0.002, [0.7, 1.8, 9.2], [0, 1.72, 6], { fov: 32, roll: 0.045 }, 0.006, 25) },
  ],
  9: [
    { f: 880, s: D("rock", 880, 0.002, [7, 2.4, 11], [0, 2.2, 1], { fov: 42 }) },
    { f: W(CUE.sorry) - 4, cut: true, s: D("rock", W(CUE.sorry), 0.0025, [-2.6, 1.9, 7.4], [-1.6, 1.65, 3.2], { fov: 38, roll: -0.035 }) },
    { f: W(CUE.carved) - 2, cut: true, s: D("rock", W(CUE.carved), 0.002, [2.4, 2.1, 4.6], [0.7, 2.0, 1.2], { fov: 36, roll: 0.03 }) },
  ],
  10: [
    { f: 1026, s: D("kitchen", 1026, 0.0025, [4.5, 2.4, 7.5], [0, 1.4, 0], { fov: 40 }) },
    { f: W(CUE.hundreds) - 4, cut: true, s: D("kitchen", W(CUE.hundreds), 0.0015, [8, 4.5, 6], [-14, 0.6, -24], { fov: 46, roll: 0.02 }, 0.005, 30) },
  ],
  11: [{ f: 1185, s: D("kitchen", 1185, 0.003, [2.5, 1.6, 6.2], [0, 1.0, 0.4], { fov: 40, roll: -0.03 }) }],
  12: [{ f: 1250, s: D("kitchen", 1250, 0.002, [6, 3.2, 9], [-4, 0.9, -6], { fov: 44, roll: 0.03 }) }],
  13: [
    { f: 1304, s: D("kitchen", 1304, 0.0025, [1.9, 1.15, 4.2], [0.6, 0.95, 1.5], { fov: 36, roll: -0.04 }) },
    { f: W(CUE.peacocks) - 10, dur: 22, s: D("kitchen", W(CUE.peacocks) - 10, 0.002, [1.3, 1.2, 3.2], [0.6, 1.0, 1.5], { fov: 32, roll: 0.04 }, 0.006, 20) },
  ],
  14: [{ f: 1362, s: Z("country", 1362, 0.002, [60, 55, 80], [0, 0, 0], 46) }],
  15: [
    { f: 1475, s: D("fridge", 1475, 0.0025, [0.6, 1.5, 3.4], [0, 1.45, -1.5], { fov: 40 }) },
    { f: W(CUE.walks) - 8, dur: 26, s: D("fridge", W(CUE.walks) - 8, 0.002, [2.6, 1.55, 4.6], [0, 1.25, -1.2], { fov: 42, roll: 0.03 }) },
  ],
  16: [
    { f: 1591, s: D("road", 1591, 0.002, [9, 1.7, 14], [0, 2.5, 0], { fov: 44, roll: -0.02 }) },
    { f: W(CUE.pillars) - 14, dur: 34, s: Z("road", W(CUE.pillars) - 14, 0.0015, [5, 1.5, 9], [0, 11.5, 0], 40, { roll: 0.03 }) },
    { f: W(CUE.language) - 4, cut: true, s: D("road", W(CUE.language), 0.003, [1.2, 1.7, 3.6], [0, 1.9, 0.6], { fov: 36, roll: -0.03 }) },
  ],
  17: [
    { f: 1720, s: D("road", 1720, 0.002, [-10, 3, 6], [-18, 4, -6], { fov: 44 }) },
    { f: W(CUE.wells) - 6, cut: true, s: D("road", W(CUE.wells), 0.0025, [10, 2.2, -4], [14, 1.0, -9], { fov: 40, roll: 0.03 }) },
    { f: W(CUE.medicine) - 4, cut: true, s: D("road", W(CUE.medicine), 0.0025, [-3, 1.7, -10], [-6, 1.3, -14], { fov: 38, roll: -0.03 }) },
    { f: W(CUE.animals) - 10, dur: 22, s: D("road", W(CUE.animals) - 10, 0.002, [-6.5, 1.5, -9.4], [-8.4, 1.1, -14], { fov: 38, roll: 0.03 }) },
  ],
  18: [{ f: 1854, s: D("ruins", 1854, 0.002, [6, 1.6, 10], [0, 1.8, 0], { fov: 42 }) }],
  19: [{ f: 1928, s: D("lions", 1928, 0.003, [0.8, 2.6, 4.6], [0, 2.75, 0], { fov: 38, roll: 0.03 }, 0.005, 30) }],
  20: [{ f: 1972, s: D("lions", 1972, 0.003, [6.2, 1.6, 2.3], [6, 1.5, -0.4], { fov: 36, roll: -0.04 }) }],
  21: [
    { f: 1992, s: D("flag", 1992, 0.002, [4, 3, 14], [0, 6.5, 0], { fov: 44 }) },
    { f: W(CUE.wheel) - 12, dur: 34, s: D("flag", W(CUE.wheel) - 12, 0.0025, [0.8, 7.8, 5.2], [1.55, 7.75, 0], { fov: 34, roll: 0.03 }) },
  ],
};

// impact kicks: image offset flips sign every frame and decays over 7 f
const KICKS: [number, number][] = [[CUE.gaveUp + 0.45, 0.8], [33.36, 0.9], [33.9, 0.7], [34.15, 0.6], [CUE.peacocks + 0.1, 0.6], [CUE.now, 0.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const Ld = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Ld * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 70, dur: 30, cInf: 12 }, // hero MS on the hill
  { f: W(CUE.miserable) - 6, dur: 24, cInf: 14 },
  { f: W(CUE.gaveUp) + 4, cInf: 10 },
  { f: 186, cInf: 0 }, // city aerial
  { f: W(CUE.rules), cInf: 12 }, // Ashoka on the terrace
  { f: 356, cInf: 10 }, // Kalinga defenders
  { f: 405, cInf: 0 }, // march / elephants / battle wides
  { f: 616, cInf: 12, focus: () => at("plain", 0, 0.4, 4) }, // debris low on the field
  { f: 690, cInf: 0 },
  { f: 745, cInf: 5 }, // captives at the horizon (mild)
  { f: 815, cInf: 13 }, // conqueror CU
  { f: 880, cInf: 0 },
  { f: W(CUE.sorry) - 4, cInf: 11 },
  { f: W(CUE.carved) - 2, cInf: 14 }, // chisel insert
  { f: 1026, cInf: 8 },
  { f: W(CUE.hundreds) - 4, cInf: 0 }, // animal queue wide
  { f: 1185, cInf: 12 },
  { f: 1250, cInf: 0 },
  { f: 1304, cInf: 15 }, // peacock CU
  { f: 1362, cInf: 0 }, // country aerial
  { f: 1475, cInf: 10 }, // fridge
  { f: 1591, cInf: 0 }, // pillar
  { f: W(CUE.language) - 4, cInf: 13 },
  { f: 1720, cInf: 0 },
  { f: W(CUE.wells) - 6, cInf: 10 },
  { f: W(CUE.medicine) - 4, cInf: 12 },
  { f: 1854, cInf: 6 },
  { f: 1928, cInf: 12 }, // lions
  { f: 1972, cInf: 14 }, // note
  { f: 1992, cInf: 0 }, // flag
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export { rolled };
/** the hook's hill: a smooth mound 6 m high (local set coordinates) */
export const hillY = (lx: number, lz: number) => 6 * Math.exp(-(lx * lx + lz * lz) / (2 * 15 * 15));
/** the animal queue path in the kitchen set (local x, z), from the pot out to the horizon */
export const QUEUE: [number, number][] = [[-1.6, -1.2], [-4, -5], [-8, -12], [-14, -24], [-24, -42], [-40, -70], [-62, -110], [-90, -160]];
