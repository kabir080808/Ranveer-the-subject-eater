# Sound for "The King Who Said Sorry in Stone": synthesized SFX from an event table timed to the picture (story.ts
# cues and shot frames), an original score with an Indian colour (drone, plucked melody, tabla-like drums, a field
# march for the war, a sad raga-ish turn for the aftermath, a bouncy kitchen comedy cue, a warm finale) ducked under
# the narration, and the mix: voice gain only, music ~ -10 LU and SFX ~ -12 LU under the voice per section (the skill's
# standard: music +3 dB, SFX -6 dB), master -15 LUFS integrated, true peak <= -1.2 dBTP, 48 kHz stereo, exact length.
# Usage: python -I sound.py <shorts/ashoka dir>   ->  audio/mix.wav, audio/stem_*.wav, audio/cues.md
import json, os, sys
import numpy as np
from scipy import signal, ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, reson, peq, colored, smooth_noise, ramp, fades, phase, modal, pan, st,
                 place, widen, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav)
import instruments as I

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "audio")
FPS, TOTAL = 30, 2085
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
WORDS = json.load(open(os.path.join(ROOT, "voice", "words.json")))
CUE = dict(miserable=4.06, gaveUp=4.92, rules=8.04, wontBow=11.12, sends=13.7, elephants=14.92, more=16.0, bigger=20.2,
           dead=24.32, marched=26.42, sick=28.94, sorry=31.7, carved=33.36, hundreds=37.08, now=39.56, luckily=41.76,
           unluckily=43.52, peacocks=44.86, fridge=50.04, walks=51.38, reads=52.54, pillars=54.72, language=56.96, trees=58.34,
           wells=59.2, medicine=60.16, animals=61.4, lions=64.9, note=65.88, wheel=66.82)
CUTS = [fr(f) for f in (186, 241, 356, 405, 442, 478, 513, 616, 690, 745, 815, 880, 947, 999, 1026, 1108, 1185, 1250, 1304, 1362,
                        1475, 1594, 1704, 1723, 1770, 1801, 1859, 1932, 1972, 1996)]
R = rng(7)
cues = []

def ev(name, t, x, gain=1.0, p=0.0):
    cues.append((t, name, gain))
    place(SFX, pan(x, p) if np.ndim(x) == 1 else x, t, gain)

# ================================================================ SFX generators (mono unless noted)
def env_exp(t, a, d): return (1 - np.exp(-t / max(a, 1e-4))) * np.exp(-t / d)
def thud(f=70, d=0.18, v=1.0):
    t = tt(d * 4); return (np.sin(phase(f * (1 + 0.8 * np.exp(-t / 0.02)))) * env_exp(t, 0.002, d) + 0.3 * lp(R.standard_normal(len(t)), 900) * env_exp(t, 0.001, 0.02)) * v
def step(v=0.6, bright=1500):
    t = tt(0.12); return (bp(R.standard_normal(len(t)), 150, bright) * env_exp(t, 0.002, 0.03) + 0.4 * np.sin(TAU * 90 * t) * env_exp(t, 0.002, 0.04)) * v
def clink(f=1800, v=0.5):
    return modal(0.6, [(f, 1, 0.12), (f * 2.41, 0.5, 0.06), (f * 3.9, 0.3, 0.03), (f * 5.3, 0.15, 0.02)], R) * v
def clang(v=1.0):
    t = tt(1.4); return (modal(1.4, [(620, 1, 0.5), (1490, 0.7, 0.35), (2310, 0.5, 0.2), (3870, 0.3, 0.12), (5210, 0.2, 0.08)], R) + 0.2 * hp(R.standard_normal(len(t)), 3000) * np.exp(-t / 0.01)) * v
def whoosh(d=0.5, f0=300, f1=2500, v=0.6):
    n = ns(d); t = np.arange(n) / SR; x = R.standard_normal(n); out = np.zeros(n); seg = 512
    for i in range(0, n, seg):
        u = i / n; fc = f0 * (f1 / f0) ** u; out[i:i + seg] = bp(x[i:i + seg + 256], fc * 0.6, fc * 1.6, 1)[: min(seg, n - i)]
    return out * np.sin(np.pi * t / d) ** 1.5 * v
def tink(v=0.6): return S(modal(0.4, [(2900, 1, 0.05), (4700, 0.6, 0.03), (6900, 0.3, 0.015)], R), 0.5 * thud(160, 0.03)) * v
def bleat(d=0.6, f=420, v=0.6, happy=False):
    t = tt(d); vib = 1 + 0.06 * np.sin(TAU * (9 if not happy else 12) * t)
    f_ = f * vib * (1 + (0.15 if happy else -0.1) * t / d); y = signal.sawtooth(phase(f_))
    y = reson(y, 700, 4) + 0.6 * reson(y, 1500, 5) + 0.3 * reson(y, 2600, 6)
    return y / np.max(np.abs(y) + 1e-9) * np.sin(np.pi * t / d) ** 0.6 * v
def cluck(v=0.4):
    out = np.zeros(ns(0.5))
    for k in range(3):
        t = tt(0.07); y = signal.square(phase(np.full(len(t), 600 + 120 * k))) * env_exp(t, 0.003, 0.02)
        i = ns(0.11 * k); out[i: i + len(t)] += reson(y, 1200, 3)[: len(out) - i]
    return out / (np.max(np.abs(out)) + 1e-9) * v
def squawk(v=0.6):
    out = np.zeros(ns(0.8))
    for k, (f0, f1, d) in enumerate([(700, 1100, 0.22), (1000, 600, 0.35)]):
        t = tt(d); f_ = np.linspace(f0, f1, len(t)); y = signal.sawtooth(phase(f_)) * np.sin(np.pi * t / d) ** 0.5
        y = reson(y, 1800, 5) + reson(y, 3000, 6); i = ns(0.25 * k); out[i:i + len(y)] += y[: len(out) - i]
    return out / (np.max(np.abs(out)) + 1e-9) * v
def trumpet(v=0.9):
    d = 1.3; t = tt(d); f_ = 330 * (1 + 0.25 * np.sin(np.pi * np.clip(t / 0.4, 0, 1))) * (1 - 0.15 * t / d) * (1 + 0.02 * np.sin(TAU * 7 * t))
    y = signal.sawtooth(phase(f_)); y = reson(y, 900, 3) + 0.7 * reson(y, 2200, 4) + 0.2 * hp(R.standard_normal(len(t)), 2000)
    return y / (np.max(np.abs(y)) + 1e-9) * np.minimum(1, t / 0.08) * np.exp(-np.maximum(0, t - 0.9) / 0.15) * v
def moo(v=0.6):
    d = 1.1; t = tt(d); f_ = 120 * (1 + 0.18 * np.sin(np.pi * t / d)); y = signal.sawtooth(phase(f_))
    y = reson(y, 400, 4) + 0.6 * reson(y, 800, 5); return y / (np.max(np.abs(y)) + 1e-9) * np.sin(np.pi * t / d) ** 0.7 * v
def crowd(d, v=0.5, excited=1.0):
    n = ns(d); t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(10):
        f = 160 + 140 * R.random(); y += reson(colored(n, R, -0.5), f * 3, 6) * (0.6 + 0.4 * smooth_noise(n, R, 2 + 3 * excited))
    y = bp(y, 250, 3500, 1); return y / (np.max(np.abs(y)) + 1e-9) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.4 * v
def amb(d, lo, hi, v, rate=0.3, seed=1):
    n = ns(d); t = np.arange(n) / SR; r = rng(seed)
    y = bp(colored(n, r, -1.0), lo, hi, 1) * (0.6 + 0.4 * smooth_noise(n, r, rate)); return fades(y / (np.max(np.abs(y)) + 1e-9) * v, 0.4, 0.4)
def birds(d, v=0.25, seed=3):
    out = np.zeros(ns(d)); r = rng(seed); t0 = 0.2
    while t0 < d - 0.4:
        for k in range(r.integers(2, 5)):
            t = tt(0.07); f = 3200 + 1500 * r.random(); y = np.sin(phase(f * (1 + 0.3 * np.sin(TAU * 25 * t)))) * np.sin(np.pi * t / 0.07)
            i = ns(t0 + 0.09 * k); out[i:i + len(y)] += y[: len(out) - i]
        t0 += 0.6 + 1.2 * r.random()
    return out * v
def crackle(d, v=0.3, seed=4):
    out = np.zeros(ns(d)); r = rng(seed)
    for _ in range(int(d * 22)):
        i = r.integers(0, len(out) - 300); out[i:i + 200] += hp(r.standard_normal(200), 1500) * np.exp(-np.arange(200) / 30) * r.random()
    return out * v + lp(colored(len(out), r, -1.5), 300) * 0.15 * v
def bubbles(d, v=0.25, seed=5):
    out = np.zeros(ns(d)); r = rng(seed)
    for _ in range(int(d * 9)):
        t = tt(0.06); f = 300 + 500 * r.random(); y = np.sin(phase(f * (1 + 2 * t / 0.06))) * np.sin(np.pi * t / 0.06)
        i = r.integers(0, len(out) - len(t)); out[i:i + len(t)] += y
    return out * v
def splash(v=0.6):
    t = tt(0.8); return bp(R.standard_normal(len(t)), 400, 6000, 1) * env_exp(t, 0.005, 0.18) * v
def creak(d=0.6, v=0.3):
    t = tt(d); f_ = 140 + 40 * np.sin(TAU * 1.3 * t); y = signal.sawtooth(phase(f_)) * (0.5 + 0.5 * (np.sin(TAU * 18 * t) > 0))
    return reson(y, 900, 6) / 3 * np.sin(np.pi * t / d) * v
def rustle(d=0.6, v=0.3):
    n = ns(d); t = np.arange(n) / SR; return bp(R.standard_normal(n), 1500, 8000, 1) * (0.5 + 0.5 * np.abs(np.sin(TAU * 7 * t))) * np.sin(np.pi * t / d) * v
def flap(d, v=0.3):
    n = ns(d); t = np.arange(n) / SR; y = bp(R.standard_normal(n), 200, 2500, 1) * (0.4 + 0.6 * np.abs(np.sin(TAU * 4.3 * t + 0.4 * np.sin(TAU * 0.7 * t))) ** 3)
    return fades(y * v, 0.5, 0.8)
def gulp(v=0.4):
    t = tt(0.18); return np.sin(phase(300 * (1 + 1.5 * (t / 0.18) ** 2))) * np.sin(np.pi * t / 0.18) * v
def wobble(v=0.35):
    t = tt(0.9); return np.sin(phase(330 * (1 - 0.35 * t / 0.9) * (1 + 0.05 * np.sin(TAU * 6 * t)))) * np.sin(np.pi * t / 0.9) * v
def ding(v=0.5): return I.glock(I.m2f(86), 0.7, R, 1.6) * v
def sweatplink(v=0.35): return I.glock(I.m2f(91), 0.5, R, 0.6) * v
def poof(v=0.5):
    t = tt(0.35); return bp(R.standard_normal(len(t)), 200, 3000, 1) * env_exp(t, 0.01, 0.08) * v

def S(*xs):
    """sum sounds of different lengths (mono or stereo), aligned at their starts"""
    n = max(x.shape[-1] for x in xs); st2 = any(np.ndim(x) == 2 for x in xs)
    out = np.zeros((2, n)) if st2 else np.zeros(n)
    for x in xs:
        if st2: out[:, : x.shape[-1]] += st(x)
        else: out[: len(x)] += x
    return out

# ================================================================ SFX event table
SFX = np.zeros((2, N))
# hook: the army cheers, then goes quiet; the sword falls and clangs on the hilltop
ev("crowd cheer", 0.0, crowd(4.2, 0.8, 1.6), 0.9, 0.2)
ev("sword whoosh", CUE["gaveUp"], whoosh(0.45, 1800, 400, 0.4), 1.0, 0.2)
ev("sword clang", CUE["gaveUp"] + 0.45, clang(0.9), 1.0, 0.2)
ev("flash whoosh", fr(180), whoosh(0.5, 400, 3000, 0.5))
# city / Kalinga
ev("city crowd murmur", 6.2, crowd(5.7, 0.35, 0.6), 0.8)
ev("city birds", 6.2, birds(5.6, 0.22, 11), 1.0, -0.4)
ev("sea waves", 11.85, amb(1.7, 200, 2500, 0.55, 0.6, 12), 1.0, 0.3)
# march: footfalls at 2 per second, heavier with the big column; elephants trumpet and thud
for k in range(int((CUE["elephants"] - 13.2) * 2)):
    ev("march step", 13.2 + k * 0.5, S(step(0.8), step(0.6)), 0.9, -0.2 + 0.4 * (k % 2))
ev("elephant trumpet", CUE["elephants"] + 0.15, trumpet(1.0), 1.0, 0.1)
for k in range(5):
    ev("elephant thud", CUE["elephants"] + 0.1 + k * 0.42, thud(45, 0.25, 1.0), 0.8, -0.3 + 0.15 * k)
for k in range(int((17.1 - CUE["more"]) * 2)):
    ev("big column step", CUE["more"] + k * 0.5, S(step(1.0, 1100), thud(60, 0.08, 0.6)), 1.0)
ev("elephant trumpet 2", CUE["more"] + 0.4, trumpet(0.7), 0.6, -0.5)
# battle: the cartoon fight cloud, clinks and thuds, swelling to a boom on "bigger"
for k in range(36):
    t0 = 17.15 + k * 0.095 + 0.04 * R.random(); g = 0.4 + 0.6 * min(1, (t0 - 17.1) / 3.1)
    ev("battle clink" if k % 3 else "battle thud", t0, clink(1400 + 900 * R.random(), 0.5) if k % 3 else thud(80 + 40 * R.random(), 0.1, 0.8), g, R.uniform(-0.7, 0.7))
ev("fight rumble", 17.1, amb(3.6, 80, 1500, 0.8, 4.0, 13) * np.linspace(0.4, 1.0, ns(3.6)), 1.0)
ev("big boom", CUE["bigger"] - 0.05, S(thud(40, 0.6, 1.2), 0.4 * whoosh(0.6, 2000, 200, 0.5)), 1.0)
# aftermath: wind over the empty field; captives shuffle away; the conqueror's stomach turns
ev("field wind", 20.7, amb(8.9, 150, 1800, 0.5, 0.25, 14), 1.0)
for k in range(9):
    ev("captive shuffle", 24.85 + k * 0.25, step(0.25, 900), 0.6, 0.3)
ev("gulp", CUE["sick"] - 0.15, gulp(0.5), 1.0)
ev("woozy", CUE["sick"] + 0.1, wobble(0.4), 1.0)
# the rock: birds, then chisel blows every 0.27 s
ev("rock birds", 29.5, birds(4.9, 0.2, 21), 1.0, 0.4)
for k in range(4):
    ev("chisel", CUE["carved"] + k * 0.27, S(tink(0.9), thud(110, 0.04, 0.5)), 1.0 if k < 3 else 0.7, 0.2)
# kitchen: fire and bubbling pot, the queue, the cut to two peacocks and a deer, luckily / unluckily
ev("fire crackle", 34.35, crackle(11.2, 0.4), 1.0, 0.1)
ev("pot bubbles", 34.35, bubbles(11.2, 0.25), 1.0, -0.1)
ev("goat bleat", 37.25, bleat(0.6, 430, 0.6), 0.8, -0.4)
ev("chickens", 37.7, cluck(0.5), 0.8, 0.4)
ev("goat bleat 2", 38.3, bleat(0.5, 520, 0.5), 0.6, -0.6)
ev("poof", CUE["now"] - 0.05, poof(0.6), 1.0)
ev("peacock squawk", 40.55, squawk(0.6), 0.8, 0.3)
for k in range(10):
    ev("hooves leaving", CUE["luckily"] + 0.1 + k * 0.16, step(0.35, 2500), 0.7, -0.4)
ev("happy bleat", CUE["luckily"] + 0.35, bleat(0.5, 520, 0.6, happy=True), 0.8, -0.3)
ev("sweat plink", CUE["unluckily"] + 0.35, sweatplink(0.5), 1.0, 0.3)
ev("peacock gulp", CUE["peacocks"] + 0.1, gulp(0.5), 1.0, 0.2)
ev("peacock squawk 2", CUE["peacocks"] + 0.35, squawk(0.7), 0.9, 0.1)
# country, fridge, pillar, good works
ev("country birds", 45.5, birds(3.9, 0.25, 31), 1.0, -0.3)
ev("cowbell", 46.6, S(I.glock(I.m2f(74), 0.4, R, 1.2), 0.5 * I.glock(I.m2f(79), 0.3, R, 1.0)), 0.5, 0.5)
ev("fridge hum", 49.3, amb(4.0, 55, 260, 0.3, 0.1, 15), 0.8)
for k in range(5):
    ev("kid steps", 49.45 + k * 0.3, step(0.4, 3000), 0.8, -0.4 + 0.15 * k)
for k in range(4):
    ev("parent steps", CUE["walks"] - 0.15 + k * 0.36, step(0.5, 2200), 0.8, 0.5 - 0.15 * k)
ev("aha ding", CUE["reads"] - 0.05, ding(0.6), 1.0)
ev("road ambience", 53.2, S(amb(4.4, 200, 3000, 0.25, 0.4, 16), birds(4.4, 0.15, 41)), 1.0)
ev("tilt whoosh", CUE["pillars"] - 0.4, whoosh(0.8, 300, 1500, 0.35), 1.0)
ev("trowel", CUE["trees"] + 0.05, S(thud(150, 0.05, 0.6), clink(2400, 0.2)), 0.9, -0.3)
ev("well creak", CUE["wells"] + 0.05, creak(0.6, 0.35), 1.0, 0.3)
ev("well splash", CUE["wells"] + 0.6, splash(0.5), 0.9, 0.3)
ev("healer chime", CUE["medicine"] + 0.05, I.glock(I.m2f(81), 0.5, R, 1.4), 0.7)
ev("happy moo", CUE["animals"] + 0.1, moo(0.6), 0.9, -0.2)
# ruins, lions, note, flag
ev("evening wind + crickets", 61.95, S(amb(2.5, 300, 2000, 0.3, 0.2, 17), birds(2.5, 0.08, 51)), 1.0)
ev("lion shimmer", CUE["lions"] - 0.3, S(I.glock(I.m2f(74), 0.4, R, 2.0), I.glock(I.m2f(81), 0.35, R, 2.0), I.glock(I.m2f(86), 0.3, R, 2.0)), 0.6)
ev("note rustle", CUE["note"] - 0.3, rustle(0.7, 0.35), 1.0, 0.2)
ev("flag flap", 66.45, flap(DUR - 66.45, 0.35), 1.0, 0.1)
for c in CUTS:
    if c not in (fr(186),):
        ev("cut whoosh", c - 0.12, whoosh(0.28, 600, 2400, 0.15), 1.0, R.uniform(-0.3, 0.3))
SFX = lp(SFX, 15000)

# ================================================================ music
BPM = 100.0
B = 60 / BPM
MUS = np.zeros((2, N))
D2, A2, D3, A3, D4 = 38, 45, 50, 57, 62
KHAMAJ = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19]      # bright: D E F# G A B C ...
BHAIRAVI = [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19]    # sad: D Eb F G A Bb C ...
def deg(scale, k, base=D4): return base + scale[k % len(scale)] + 12 * (k // len(scale))
def mput(x, t, g=1.0, p=0.0): place(MUS, pan(x, p) if np.ndim(x) == 1 else x, t, g)

def drone(t0, t1, g=0.25, sad=False):
    d = t1 - t0
    for f, p in [(I.m2f(D2), -0.3), (I.m2f(A2), 0.3), (I.m2f(D3), 0.0)]:
        mput(I.pad([f], d, 0.5, R, att=0.8, rel=1.2, warm=700 if sad else 1100), t0, g)
def tabla(t0, t1, g=0.6, busy=1):
    k, t = 0, t0
    while t < t1 - 0.05:
        pos = k % 8
        if pos in (0, 3, 6): mput(modal(0.5, [(90, 1, 0.18), (140, 0.4, 0.08)], R, glide=0.4, glide_tau=0.05), t, g)  # bayan
        if pos in (2, 4, 7) or (busy > 1 and pos in (1, 5)): mput(modal(0.25, [(520, 1, 0.06), (1150, 0.5, 0.03), (1720, 0.3, 0.02)], R), t, g * 0.55, 0.15)  # dayan
        t += B / 2; k += 1
def melody(t0, notes, scale, g=0.5, inst="pluck", base=D4, p=0.0):
    for beat, k, dur in notes:
        f = I.m2f(deg(scale, k, base)); t = t0 + beat * B
        if inst == "pluck": x = I.pluck(f, 0.8, R, dur=max(0.5, dur * B * 1.6), bright=0.8, pos=0.11)
        elif inst == "glock": x = I.glock(f, 0.6, R, 1.4)
        elif inst == "vibes": x = I.vibes(f, 0.5, R, 1.4)
        elif inst == "fife": x = I.fife(f, dur * B, 0.6, R)
        else: x = I.brass(f, dur * B, 0.7, R, kind=inst)
        mput(x, t, g, p)
def march(t0, t1, g=0.6):
    t, k = t0, 0
    while t < t1 - 0.05:
        mput(I.snare(0.5 + 0.3 * (k % 4 == 0), R), t, g * 0.7, 0.1)
        if k % 2 == 0: mput(I.timpani(I.m2f(D2 + 12), 0.6, R, 0.6), t, g * 0.8)
        t += B / 2; k += 1

# hook (0 - 6.2): proud brass fanfare over drums, collapsing into a lone sad pluck on "miserable"
drone(0.0, 6.2, 0.22)
tabla(0.0, CUE["miserable"] - 0.1, 0.55, 2)
melody(0.0, [(0, 0, 0.75), (0.75, 2, 0.25), (1, 4, 1), (2, 3, 0.5), (2.5, 2, 0.5), (3, 4, 2), (5, 7, 1.5)], KHAMAJ, 0.35, "horn", D3 + 12)
mput(I.cymbal(0.5, R, 2.0), 0.0, 0.25)
melody(CUE["miserable"], [(0, 4, 2), (1.2, 3, 2), (2.4, 1, 3)], BHAIRAVI, 0.45, "pluck", D3)
# court (6.2 - 13.5): light plucked theme with tabla
drone(6.2, 13.5, 0.2)
tabla(6.25, 13.4, 0.5, 1)
court = [(0, 0, 0.5), (0.5, 2, 0.5), (1, 4, 0.5), (1.5, 5, 0.5), (2, 4, 1), (3, 2, 0.5), (3.5, 4, 0.5), (4, 7, 1.5), (6, 5, 0.5), (6.5, 4, 0.5),
         (7, 2, 1), (8, 0, 0.5), (8.5, 2, 0.5), (9, 4, 1), (10, 5, 0.5), (10.5, 7, 0.5), (11, 9, 1.5)]
melody(6.25, court, KHAMAJ, 0.45)
# war (13.5 - 20.7): field march, low brass ostinato, rising
drone(13.5, 20.7, 0.2)
march(13.2, 20.6, 0.7)
for k in range(9):
    melody(13.2 + k * 4 * B * 0.5 * 2, [(0, 0, 0.5), (0.5, 0, 0.5), (1, 2, 0.5), (1.5, 4, 0.5)], KHAMAJ, 0.3 + 0.03 * k, "tuba", D2 + 12)
melody(15.0, [(0, 4, 1), (1, 5, 1), (2, 7, 2), (4, 9, 1), (5, 7, 1), (6, 11, 2)], KHAMAJ, 0.25, "horn", D3 + 12)
mput(I.cymbal(0.8, R, 2.6), CUE["bigger"] - 0.05, 0.4)
# aftermath (20.7 - 29.5): the band stops; sad drone and slow Bhairavi phrases
drone(20.7, 29.6, 0.3, sad=True)
melody(21.2, [(0, 4, 2), (2, 3, 1), (3, 1, 2), (6, 0, 3), (9, 4, 2), (11, 5, 1), (12, 3, 2), (14, 1, 1), (15, 0, 4)], BHAIRAVI, 0.42, "pluck", D3 + 12)
mput(I.pad([I.m2f(D3), I.m2f(D3 + 3), I.m2f(A3)], 7.5, 0.4, R, att=2.0, rel=1.5, warm=600), 21.5, 0.22)
# sorry (29.5 - 34.3): warm resolution
drone(29.4, 34.4, 0.22)
mput(I.pad([I.m2f(D3), I.m2f(D3 + 4), I.m2f(A3)], 4.8, 0.4, R, att=1.2, rel=1.0, warm=900), 29.5, 0.25)
melody(29.6, [(0, 4, 1), (1, 7, 1), (2, 9, 2), (4, 7, 1), (5, 4, 2)], KHAMAJ, 0.35, "glock", D4)
# kitchen comedy (34.3 - 45.5): bouncy pizzicato, a dead stop on "Now", a sting for luckily / unluckily
tabla(34.35, CUE["now"] - 0.1, 0.45, 2)
bounce = [(0, 0, 0.5), (0.5, 4, 0.5), (1, 2, 0.5), (1.5, 4, 0.5), (2, 0, 0.5), (2.5, 4, 0.5), (3, 5, 0.5), (3.5, 4, 0.5)]
for k in range(4):
    melody(34.35 + k * 4 * B, bounce, KHAMAJ, 0.4, "pluck", D3 + 12, -0.2)
melody(CUE["now"] + 0.3, [(0, 7, 0.5), (0.5, 5, 0.5), (1, 4, 1)], KHAMAJ, 0.35, "pluck", D4)
melody(CUE["luckily"] + 0.05, [(0, 0, 0.5), (0.5, 2, 0.5), (1, 4, 0.5), (1.5, 7, 1)], KHAMAJ, 0.4, "glock", D4)
melody(CUE["unluckily"] + 0.05, [(0, 4, 0.7), (0.75, 3, 0.7), (1.5, 2, 0.7), (2.25, 1, 1.6)], BHAIRAVI, 0.45, "soft", D3)
tabla(CUE["unluckily"] + 0.1, 45.4, 0.35, 1)
# explanation (45.5 - 53.2): curious music-box ostinato
drone(45.5, 53.2, 0.16)
for k in range(5):
    melody(45.55 + k * 4 * B * 0.75 * 1.0, [(0, 0, 0.5), (0.5, 4, 0.5), (1, 7, 0.5), (1.5, 4, 0.5), (2, 2, 0.5), (2.5, 4, 0.5)], KHAMAJ, 0.3, "vibes", D4)
tabla(49.3, 53.1, 0.35, 1)
# pillars and good works (53.2 - 62): the warm theme returns, fuller
drone(53.2, 62.0, 0.22)
tabla(53.25, 61.9, 0.5, 2)
melody(53.25, court + [(b + 12, k, d) for b, k, d in court], KHAMAJ, 0.45)
mput(I.pad([I.m2f(D3), I.m2f(D3 + 4), I.m2f(A3)], 8.0, 0.4, R, att=1.5, rel=1.0), 53.6, 0.2)
# ruins (62 - 64.4): golden hush
drone(61.9, 64.6, 0.24)
melody(62.1, [(0, 7, 2), (2, 4, 2)], KHAMAJ, 0.35, "pluck", D4)
# finale (64.4 - end): proud and warm, last chord on "flag"
drone(64.4, DUR, 0.24)
tabla(64.45, 68.3, 0.55, 2)
melody(64.45, [(0, 0, 0.75), (0.75, 2, 0.25), (1, 4, 1), (2, 7, 1), (3, 9, 1), (4, 7, 0.5), (4.5, 9, 0.5), (5, 11, 1)], KHAMAJ, 0.38, "horn", D3 + 12)
for f in [D3, D3 + 4, D3 + 7, D4]:
    mput(I.brass(I.m2f(f), 1.6, 0.6, R, kind="soft"), 68.35, 0.22)
mput(I.cymbal(0.6, R, 2.4), 68.35, 0.3)
mput(I.pad([I.m2f(D3), I.m2f(D3 + 4), I.m2f(A3), I.m2f(D4)], 1.2, 0.5, R, att=0.3, rel=0.8), 68.3, 0.25)
MUS = convolve_st(MUS, make_ir(1.4, 3))[:, :N] * 0.35 + MUS
MUS = lp(hp(MUS, 40), 12000)

# ================================================================ mix
def load_voice():
    x, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav")); assert sr == SR, sr
    v = x[0] if x.shape[0] == 1 else x.mean(0); out = np.zeros(N); out[: min(N, len(v))] = v[:N]; return st(out)
def lufs(x): v = integrated(x); return v if np.isfinite(v) else -99.0
V = load_voice()
# speech duck (-3 dB) keyed from the word timings
spans = []
for w in WORDS:
    s, e = float(w["s"]), float(w["e"])
    if spans and s - spans[-1][1] < 0.3: spans[-1][1] = max(spans[-1][1], e)
    else: spans.append([s, e])
duck = np.zeros(N)
for s, e in spans: duck[ns(max(0, s - 0.08)): ns(min(DUR, e + 0.12))] = 1
duck = ndimage.uniform_filter1d(duck, ns(0.15))
MUS *= dbg(-3.0 * duck)[None, :]
Lv = lufs(V)
MUS *= dbg(Lv - 10.0 - lufs(MUS))
SFX *= dbg(Lv - 12.0 - lufs(SFX))
mix0 = V + MUS + SFX
G = -15.0 - lufs(mix0)

def limiter(x, ceil_db=-1.2, look=0.003, rel=0.08):
    c = dbg(ceil_db); n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12)); La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    # release: running max-recovery approximated by a one-pole on the gain-reduction in dB
    db = 20 * np.log10(g1); k = 1 - np.exp(-1 / (rel * SR)); out = np.empty(n)
    red = db < -1e-4
    if red.any():
        g = 0.0
        for i in range(n):
            d = db[i]
            g = d if d < g else g + (0 - g) * k
            out[i] = g
    else: out[:] = 0
    g3 = ndimage.uniform_filter1d(dbg(out), 2 * La + 1, mode="nearest")
    return x * np.minimum(g3, 1.0)[None, :], g3

for it in range(4):
    y, g3 = limiter(mix0 * dbg(G))
    L = lufs(y)
    if abs(L + 15.0) < 0.05: break
    G += -15.0 - L
os.makedirs(OUT, exist_ok=True)
write_wav(os.path.join(OUT, "mix.wav"), y)
for name, x in (("voice", V), ("music", MUS), ("sfx", SFX)):
    write_wav(os.path.join(OUT, f"stem_{name}.wav"), x * dbg(G))
with open(os.path.join(OUT, "cues.md"), "w") as f:
    f.write("# Ashoka short: sound cues\n\n")
    f.write(f"Mix: {DUR:.3f} s, 48 kHz stereo 24-bit. Integrated {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, "
            f"max limiter reduction {-20 * np.log10(max(g3.min(), 1e-9)):.2f} dB.\n")
    f.write(f"Stems at mix gain: voice {lufs(V * dbg(G)):.1f}, music {lufs(MUS * dbg(G)):.1f}, sfx {lufs(SFX * dbg(G)):.1f} LUFS "
            "(music ~10 LU and SFX ~12 LU under the voice; music ducked 3 dB under every spoken word).\n\n")
    f.write("| time (s) | event | gain |\n|---|---|---|\n")
    for t, n_, g in sorted(cues): f.write(f"| {t:.2f} | {n_} | {g:.2f} |\n")
print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, len {y.shape[1] / SR:.3f} s, events {len(cues)}")
