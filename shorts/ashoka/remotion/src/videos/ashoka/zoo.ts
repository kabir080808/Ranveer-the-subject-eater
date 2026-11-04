// Our own flat cartoon animals and effect cards for the Ashoka short, drawn with the same Pen (plum ink, painted
// crescent away from the light) as the people. Every animal is a side view facing screen-right on its own canvas;
// the feet stand on y = H - 25. `phase` (0..1) is the walk cycle, `blink` 0..1 the eyelid.
import { Pen, INK, mul, shade } from "./toon";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const L = rad(-120); // light from the upper left of the canvas
const SH: [number, number, number] = [0.72, 0.72, 0.82];

/** canvas size (design units) and height in metres of each animal card */
export const ANIMAL: Record<string, { w: number; h: number; m: number }> = {
  elephant: { w: 1300, h: 1150, m: 3.6 }, goat: { w: 560, h: 480, m: 0.95 }, chicken: { w: 340, h: 340, m: 0.5 },
  peacock: { w: 900, h: 760, m: 1.25 }, deer: { w: 640, h: 760, m: 1.6 }, cow: { w: 760, h: 600, m: 1.5 },
};

const leg = (p: Pen, x: number, top: number, foot: number, w: number, col: string, swing: number, hoof = INK) => {
  const fx = x + swing;
  p.line([[x, top], [x + swing * 0.4, (top + foot) / 2], [fx, foot - w * 0.3]], col, w, true);
  p.ell(fx + w * 0.15, foot - w * 0.25, w * 0.62, w * 0.32, hoof, 0);
};
const eye = (p: Pen, x: number, y: number, r: number, blink: number, look = 0) => {
  if (blink > 0.7) { p.stroke([[x - r, y], [x + r, y]], r * 0.5); return; }
  p.ell(x, y, r, r * (1 - 0.6 * blink), "#ffffff", r * 0.35);
  p.dot(x + r * 0.25 + look * r * 0.3, y + r * 0.1, r * 0.55);
};
const sweat = (p: Pen, x: number, y: number, s: number) =>
  p.poly([[x, y - 22 * s], [x + 11 * s, y + 4 * s], [x, y + 14 * s], [x - 11 * s, y + 4 * s]], "#9fd6f2", 4 * s);

export type AnimalOpts = { phase?: number; blink?: number; nervous?: boolean; happy?: boolean; bandage?: boolean; war?: boolean; look?: number };

export const drawAnimal = (p: Pen, kind: string, o: AnimalOpts = {}) => {
  const ph = o.phase ?? 0, s = (k: number) => Math.sin(2 * Math.PI * (ph + k));
  switch (kind) {
    case "elephant": {
      const G = 1125, grey = "#9a95a8", dg = mul(grey, SH);
      // far legs, body, near legs, head + ears + trunk, war blanket
      for (const [x, k] of [[360, 0.5], [880, 0]] as const) leg(p, x, 640, G, 120, shade(grey, 0.8), 40 * s(k));
      const body: P2[] = [];
      for (let i = 0; i <= 48; i++) { const a = rad((360 * i) / 48); body.push([620 + 360 * Math.cos(a), 560 + 250 * Math.sin(a) - 30 * Math.max(0, -Math.sin(a)) * Math.cos(a)]); }
      p.shadedFill(body, grey, dg, L, 360); p.poly(body, null, 14);
      if (o.war) {
        const bl: P2[] = [[420, 400], [820, 380], [860, 690], [400, 700]];
        p.poly(bl, "#c2343c", 10);
        p.band([[410, 660], [855, 650]], "#e8c04a", 24, 4);
        for (let i = 0; i < 6; i++) p.dot(440 + i * 72, 700, 14, "#e8c04a");
        p.poly([[480, 250], [760, 250], [780, 380], [460, 390]], "#e8c04a", 10); // howdah
        p.poly([[500, 270], [740, 270], [748, 360], [492, 365]], "#b98a2a", 0);
        p.stroke([[700, 250], [700, 90]], 10); p.poly([[700, 92], [820, 120], [700, 160]], "#e58a2e", 8); // banner
      }
      for (const [x, k] of [[440, 0], [800, 0.5]] as const) leg(p, x, 650, G, 130, grey, 40 * s(k));
      p.poly([[200, 560], [150, 600], [175, 610]], grey, 10); // tail
      // head
      const hx = 1010, hy = 470;
      p.shadedFill(ellPtsZ(hx, hy, 170, 160), grey, dg, L, 170); p.ell(hx, hy, 170, 160, null, 14);
      const ear: P2[] = [[930, 330], [820, 360], [790, 520], [860, 640], [960, 560]];
      p.poly(ear, shade(grey, 0.88), 12); p.stroke([[905, 400], [850, 520]], 5, mul(grey, [0.6, 0.6, 0.7]));
      const sw = 25 * s(0.25);
      p.line([[1120, 520], [1180, 680], [1170 + sw, 860], [1215 + sw, 940]], grey, 70, true);
      p.poly([[1080, 600], [1170, 620], [1110, 640]], "#fbf3de", 7); // tusk
      eye(p, 1060, 430, 22, o.blink ?? 0);
      if (o.war) p.ell(1010, 315, 70, 40, "#c2343c", 9);
      break;
    }
    case "goat": {
      const G = 455, c = "#ece4d4";
      for (const [x, k] of [[170, 0.5], [370, 0]] as const) leg(p, x, 270, G, 26, shade(c, 0.78), 22 * s(k), "#4a3426");
      const body: P2[] = [[110, 230], [400, 210], [430, 300], [380, 330], [130, 330], [95, 280]];
      p.shadedFill(body, c, mul(c, SH), L, 170); p.poly(body, null, 9);
      for (const [x, k] of [[190, 0], [390, 0.5]] as const) leg(p, x, 290, G, 28, c, 22 * s(k), "#4a3426");
      p.poly([[100, 240], [70, 205], [95, 250]], c, 7); // tail
      const head: P2[] = [[400, 210], [450, 120], [510, 135], [520, 185], [470, 230]];
      p.poly(head, c, 9);
      p.stroke([[455, 125], [430, 70], [400, 60]], 12, "#8a7a64"); p.stroke([[470, 125], [460, 65]], 12, "#8a7a64"); // horns
      p.poly([[445, 140], [400, 160], [440, 170]], shade(c, 0.85), 6); // ear
      p.poly([[505, 195], [500, 250], [485, 200]], "#d8cdb0", 5); // beard
      eye(p, 480, 160, 13, o.blink ?? 0);
      if (o.happy) p.arc(500, 190, 14, 10, 20, 160, 4); else p.stroke([[495, 195], [512, 192]], 4);
      break;
    }
    case "chicken": {
      const G = 315, c = "#f6f1e6";
      for (const [x, k] of [[150, 0], [185, 0.5]] as const) { const sw = 14 * s(k); p.stroke([[x, 230], [x + sw, G - 6]], 7, "#e2a33a"); p.stroke([[x + sw - 12, G - 4], [x + sw + 16, G - 4]], 7, "#e2a33a"); }
      const body: P2[] = [[60, 120], [120, 170], [230, 150], [270, 70], [300, 110], [270, 220], [160, 250], [80, 210]];
      p.shadedFill(body, c, mul(c, SH), L, 110); p.poly(body, null, 8);
      p.poly([[255, 60], [270, 35], [282, 55], [295, 38], [298, 70]], "#d2343c", 6); // comb
      p.poly([[298, 85], [330, 95], [298, 103]], "#e2a33a", 5); // beak
      p.poly([[290, 108], [300, 135], [282, 125]], "#d2343c", 4); // wattle
      eye(p, 282, 82, 8, o.blink ?? 0);
      p.poly([[120, 170], [180, 160], [200, 200], [140, 210]], shade(c, 0.9), 6); // wing
      break;
    }
    case "peacock": {
      const G = 735, blue = "#2d5fc2", teal = "#2f9a8a";
      // long closed train trailing to the left, scattered eye-spots
      const train: P2[] = [[420, 470], [40, 560], [20, 640], [80, 680], [440, 560]];
      p.shadedFill(train, teal, mul(teal, SH), L, 300); p.poly(train, null, 10);
      for (let i = 0; i < 9; i++) { const x = 90 + i * 38, y = 600 - i * 8 + (i % 2) * 22; p.ell(x, y, 16, 12, "#e8c04a", 3); p.dot(x + 2, y, 7, "#1d3f8a"); }
      for (const [x, k] of [[470, 0], [520, 0.5]] as const) { const sw = 18 * s(k); p.stroke([[x, 560], [x + sw, G - 8]], 9, "#8a7a64"); p.stroke([[x + sw - 16, G - 4], [x + sw + 20, G - 4]], 8, "#8a7a64"); }
      const body: P2[] = [[400, 470], [520, 400], [600, 430], [610, 520], [520, 590], [430, 560]];
      p.shadedFill(body, blue, mul(blue, SH), L, 120); p.poly(body, null, 10);
      p.line([[575, 440], [600, 330], [630, 250]], blue, 46, true); // neck
      p.ell(642, 235, 40, 34, blue, 10);
      for (const dx of [-14, 0, 14]) { p.stroke([[635 + dx * 0.3, 205], [630 + dx, 160]], 4); p.dot(630 + dx, 156, 8, blue); } // crest
      p.poly([[676, 232], [712, 242], [676, 252]], "#e8c04a", 5);
      p.ell(650, 228, 16, 6, "#ffffff", 0);
      eye(p, 652, 228, 10, o.blink ?? 0, o.look ?? 0);
      if (o.nervous) { sweat(p, 700, 180, 1.2); p.stroke([[636, 205], [664, 212]], 5); }
      break;
    }
    case "deer": {
      const G = 735, c = "#c98a4a";
      for (const [x, k] of [[200, 0.5], [420, 0]] as const) leg(p, x, 470, G, 26, shade(c, 0.78), 26 * s(k));
      const body: P2[] = [[140, 400], [460, 380], [500, 450], [470, 520], [170, 520], [120, 460]];
      p.shadedFill(body, c, mul(c, SH), L, 190); p.poly(body, null, 10);
      for (let i = 0; i < 9; i++) p.dot(200 + (i % 5) * 55 + (i > 4 ? 25 : 0), 430 + (i > 4 ? 40 : 0), 10, "#fbf3de"); // chital spots
      for (const [x, k] of [[220, 0], [440, 0.5]] as const) leg(p, x, 490, G, 28, c, 26 * s(k));
      p.poly([[135, 410], [105, 380], [125, 430]], "#fbf3de", 7);
      p.line([[460, 400], [500, 300], [530, 250]], c, 60, true); // neck
      const head: P2[] = [[500, 240], [560, 200], [620, 250], [600, 280], [530, 280]];
      p.poly(head, c, 10);
      p.stroke([[540, 205], [520, 120], [480, 80]], 8, "#7a5a3a"); p.stroke([[524, 140], [560, 100]], 8, "#7a5a3a");
      p.stroke([[555, 205], [575, 120], [610, 80]], 8, "#7a5a3a");
      p.poly([[520, 220], [470, 190], [500, 235]], shade(c, 0.85), 7); // ear
      p.dot(618, 254, 8);
      eye(p, 560, 235, 12, o.blink ?? 0);
      if (o.happy) p.arc(590, 262, 14, 9, 20, 160, 4);
      break;
    }
    case "cow": {
      const G = 575, c = "#efe6d6";
      for (const [x, k] of [[220, 0.5], [500, 0]] as const) leg(p, x, 380, G, 34, shade(c, 0.78), 18 * s(k));
      const body: P2[] = [[150, 280], [330, 250], [380, 200], [450, 250], [580, 270], [600, 380], [560, 440], [170, 440], [130, 360]];
      p.shadedFill(body, c, mul(c, SH), L, 240); p.poly(body, null, 11);
      for (const [x, k] of [[240, 0], [520, 0.5]] as const) leg(p, x, 400, G, 36, c, 18 * s(k));
      p.line([[140, 300], [110, 420]], c, 12, true);
      const head: P2[] = [[570, 260], [660, 250], [720, 330], [690, 370], [600, 350]];
      p.poly(head, c, 11);
      p.stroke([[600, 255], [585, 200], [560, 185]], 12, "#d8cdb0"); p.stroke([[635, 250], [640, 195], [665, 180]], 12, "#d8cdb0");
      p.poly([[590, 275], [540, 290], [585, 305]], shade(c, 0.85), 8);
      p.ell(700, 345, 28, 22, "#e8b4a8", 7);
      eye(p, 640, 300, 14, o.blink ?? 0);
      if (o.bandage) { p.band([[480, 395], [480, 530]], "#ffffff", 34, 5); p.band([[470, 470], [500, 450]], "#d2343c", 8, 2); }
      if (o.happy) p.arc(680, 362, 14, 9, 20, 160, 4);
      break;
    }
  }
};
const ellPtsZ = (cx: number, cy: number, rx: number, ry: number): P2[] => Array.from({ length: 49 }, (_, i) => [cx + rx * Math.cos(rad(7.5 * i)), cy + ry * Math.sin(rad(7.5 * i))] as P2);

// ---------------- props / effect cards ----------------
/** lying battle debris: dropped shield, helmet, broken spear (cards laid flat on the grass, 512 x 512) */
export const fxDebris = (p: Pen, k: number) => {
  if (k === 0) { p.ell(256, 256, 170, 170, "#b5653f", 14); p.ell(256, 256, 120, 120, null, 8); p.ell(256, 256, 40, 40, "#e8c04a", 8); }
  else if (k === 1) { p.band([[60, 420], [300, 200]], "#8a5a33", 26, 6, "round"); p.band([[330, 170], [450, 70]], "#8a5a33", 26, 6, "round"); p.poly([[450, 70], [500, 20], [470, 90]], "#c7ccd4", 7); }
  else { p.ell(256, 300, 150, 110, "#8d949c", 12, 180, 360); p.stroke([[106, 300], [406, 300]], 14); p.ell(256, 190, 22, 22, "#d2343c", 7); }
};
/** fallen banner on the field (512 x 256, flat) */
export const fxBanner = (p: Pen) => {
  p.band([[20, 200], [480, 120]], "#7a4b2a", 14, 4, "round");
  p.poly([[300, 150], [470, 125], [490, 210], [320, 240]], "#e58a2e", 9);
};
/** stone chips flying off a chisel blow (256 x 256) */
export const fxChips = (p: Pen, t: number) => {
  for (let i = 0; i < 7; i++) {
    const a = rad(-160 + i * 25), r = 30 + 160 * t;
    p.poly([[128 + Math.cos(a) * r, 128 + Math.sin(a) * r + 120 * t * t], [140 + Math.cos(a) * r, 120 + Math.sin(a) * r + 120 * t * t], [134 + Math.cos(a) * r, 140 + Math.sin(a) * r + 120 * t * t]], "#d8cdb0", 4);
  }
};
/** dust cloud puff for the battle (512 x 512, soft) */
export const fxDust = (p: Pen, seed: number) => {
  const g = p.g;
  for (let i = 0; i < 9; i++) {
    const a = seed * 1.7 + i * 2.39, r = 60 + (i % 3) * 50, x = 256 + Math.cos(a) * r * 0.9, y = 300 + Math.sin(a) * r * 0.5 - i * 6;
    const gr = g.createRadialGradient(x, y, 0, x, y, 120);
    gr.addColorStop(0, "rgba(214,190,150,0.85)"); gr.addColorStop(0.6, "rgba(214,190,150,0.5)"); gr.addColorStop(1, "rgba(214,190,150,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 120, 0, Math.PI * 2); g.fill();
  }
};
/** sweat drop card (128 x 128) */
export const fxSweat = (p: Pen) => sweat(p, 64, 64, 2.2);
/** sword dropped from the hand (512 x 128), drawn horizontally */
export const fxSword = (p: Pen) => {
  p.band([[40, 64], [380, 64]], "#d8dde4", 22, 5, "round");
  p.band([[380, 30], [380, 98]], "#e8c04a", 14, 4, "round");
  p.band([[385, 64], [470, 64]], "#6a3fa0", 18, 4, "round");
  p.dot(476, 64, 14, "#e8c04a");
};
/** carved lines of edict script as seen on a rock / pillar face (dark incised marks on transparent, 1024 x 1024) */
export const glyphs = (g: CanvasRenderingContext2D, rows: number, cols: number, upTo = 1) => {
  const W = g.canvas.width, H = g.canvas.height, n = rows * cols, cut = Math.floor(n * upTo);
  g.lineCap = "round"; g.lineJoin = "round";
  let k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++, k++) {
    if (k >= cut) return;
    const cx = (W * (c + 0.5)) / cols, cy = (H * (r + 0.5)) / rows, s = Math.min(W / cols, H / rows) * 0.32, v = (k * 7919) % 11;
    g.strokeStyle = "rgba(60,44,40,0.85)"; g.lineWidth = s * 0.22;
    g.beginPath();
    // simple Brahmi-like strokes: verticals, hooks, crosses, little circles
    if (v % 4 === 0) { g.moveTo(cx, cy - s); g.lineTo(cx, cy + s); g.moveTo(cx - s * 0.7, cy - s * 0.2); g.lineTo(cx + s * 0.7, cy - s * 0.2); }
    else if (v % 4 === 1) { g.arc(cx, cy, s * 0.6, 0, Math.PI * 2); g.moveTo(cx, cy - s * 0.6); g.lineTo(cx, cy - s * 1.1); }
    else if (v % 4 === 2) { g.moveTo(cx - s * 0.6, cy - s); g.lineTo(cx - s * 0.6, cy + s * 0.4); g.quadraticCurveTo(cx, cy + s, cx + s * 0.6, cy + s * 0.4); g.lineTo(cx + s * 0.6, cy - s); }
    else { g.moveTo(cx - s * 0.7, cy + s); g.lineTo(cx, cy - s); g.lineTo(cx + s * 0.7, cy + s); g.moveTo(cx - s * 0.4, cy + s * 0.2); g.lineTo(cx + s * 0.4, cy + s * 0.2); }
    g.stroke();
  }
};
/** the 24-spoke wheel (Ashoka Chakra), navy, centred at (cx, cy), radius r */
export const chakra = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col = "#1c2f8c") => {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = r * 0.09;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.lineWidth = r * 0.035;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
  g.beginPath(); g.arc(cx, cy, r * 0.17, 0, Math.PI * 2); g.fill();
};
/** banknote with the lion emblem (no text, 1024 x 512) */
export const rupeeNote = (g: CanvasRenderingContext2D) => {
  const W = 1024, H = 512;
  g.fillStyle = "#cfe3c8"; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(160,200,170,0.6)"); gr.addColorStop(1, "rgba(230,214,170,0.6)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#5c8a6a"; g.lineWidth = 10; g.strokeRect(18, 18, W - 36, H - 36);
  g.lineWidth = 3; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(780, 256, 30 + i * 9, 0, Math.PI * 2); g.globalAlpha = 0.25; g.stroke(); } g.globalAlpha = 1;
  lionEmblem(g, 220, 270, 1.0, "#3d6a4e");
  g.fillStyle = "rgba(61,106,78,0.35)"; for (let i = 0; i < 4; i++) g.fillRect(430, 140 + i * 60, 200 - i * 30, 18);
};
/** front view of the lion capital emblem (three visible lions on the abacus with the wheel), drawn in one colour */
export const lionEmblem = (g: CanvasRenderingContext2D, cx: number, cy: number, s: number, col: string) => {
  g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round";
  // abacus
  g.fillRect(cx - 110 * s, cy + 40 * s, 220 * s, 34 * s);
  g.lineWidth = 3 * s; g.beginPath(); g.arc(cx, cy + 57 * s, 13 * s, 0, Math.PI * 2); g.stroke();
  // lions: maned heads + bodies
  for (const dx of [-70, 0, 70]) {
    const x = cx + dx * s, w = dx ? 0.85 : 1;
    g.beginPath(); g.ellipse(x, cy - 50 * s * w, 42 * s * w, 50 * s * w, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(x - 26 * s * w, cy - 20 * s, 52 * s * w, 60 * s);
    g.fillStyle = "#ffffff"; g.globalAlpha = 0.6;
    g.beginPath(); g.ellipse(x, cy - 50 * s * w, 18 * s * w, 22 * s * w, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1; g.fillStyle = col;
  }
};
export { INK };
/** the lion capital's lions as seen from the front: three maned lions back to back (the fourth hidden), polished
 *  sandstone with the plum ink, on a 1024 x 820 card whose bottom edge sits on the abacus */
export const lionsCard = (p: Pen) => {
  const stone = "#e4cfa6", dark = mul(stone, [0.78, 0.74, 0.8]), mane = "#d6bd8e";
  const lion = (cx: number, s: number, face: number) => {
    // haunches + chest
    p.poly([[cx - 120 * s, 820], [cx - 135 * s, 600], [cx - 60 * s, 470], [cx + 60 * s, 470], [cx + 135 * s, 600], [cx + 120 * s, 820]], stone, 12);
    for (const dx of [-55, 55]) p.poly([[cx + dx * s - 22 * s, 820], [cx + dx * s - 24 * s, 650], [cx + dx * s + 24 * s, 650], [cx + dx * s + 22 * s, 820]], dark, 9);
    // mane: a ring of flame-like locks
    const pts: P2[] = [];
    for (let i = 0; i <= 28; i++) { const a = rad((360 * i) / 28), r = (i % 2 ? 150 : 175) * s; pts.push([cx + Math.cos(a) * r, 340 + Math.sin(a) * r * 1.05]); }
    p.poly(pts, mane, 12);
    p.ell(cx + face * 6 * s, 345, 98 * s, 108 * s, stone, 12);
    // face: brow, eyes, nose, open roaring mouth
    p.stroke([[cx - 55 * s, 300], [cx - 15 * s, 312]], 9 * s); p.stroke([[cx + 55 * s, 300], [cx + 15 * s, 312]], 9 * s);
    p.dot(cx - 36 * s, 328, 10 * s); p.dot(cx + 36 * s, 328, 10 * s);
    p.poly([[cx - 22 * s, 360], [cx + 22 * s, 360], [cx, 385]], dark, 8);
    p.ell(cx, 420, 40 * s, 26 * s, "#8a5a4a", 9);
    p.ell(cx - 60 * s, 250, 22 * s, 26 * s, stone, 9); p.ell(cx + 60 * s, 250, 22 * s, 26 * s, stone, 9);
  };
  lion(240, 0.85, -1); lion(784, 0.85, 1); lion(512, 1.0, 0);
};
