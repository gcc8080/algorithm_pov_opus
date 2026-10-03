#!/usr/bin/env python3
"""
THE BEAUTY OF ALGORITHMS — data generator.

Runs the real algorithms the film shows and writes everything the visuals and
the score need to stay in lock-step:

    build/timeline.json   shared timeline (read by compose.py)
    build/mandel_frames.txt  per-frame camera for tools/mandel.c
    src/data.js           window.TL + window.DATA for the renderer

python3 tools/compute.py
"""
import json, math, os, base64
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build"); SRC = os.path.join(ROOT, "src")
os.makedirs(BUILD, exist_ok=True); os.makedirs(SRC, exist_ok=True)
rng = np.random.default_rng(1071462)

BPM = 120; BEAT = 0.5; BAR = 2.0; DUR = 300.0; FPS = 30

# ----------------------------------------------------------------------------- timeline
TL = {
    "bpm": BPM, "bar": BAR, "dur": DUR,
    "impacts": [20, 28, 36, 44, 60, 68, 90, 100, 118, 134, 146, 156, 180, 184, 212, 224, 250, 272, 288],
    "chapters": [  # t0, t1, roman, cn, en, formula
        [28, 60, "I", "排序", "Sorting", "O(n log n)"],
        [60, 90, "II", "搜索", "Searching", "log₂ n"],
        [90, 118, "III", "傅里叶变换", "The Fourier Transform", "f(t) = Σ cₖ e^{ikt}"],
        [118, 146, "IV", "涌现", "Emergence", "∂u/∂t = D∇²u + f(u,v)"],
        [146, 184, "V", "递归", "Recursion", "z ← z² + c"],
        [184, 212, "VI", "优化", "Optimization", "P = e^{−ΔE/T}"],
        [212, 250, "VII", "学习", "Learning", "θ ← θ − η∇L(θ)"],
    ],
}

# ----------------------------------------------------------------------------- prologue: Euclid
def euclid_squares(a, b):
    """Squares carved by the subtractive Euclid algorithm on an a×b rectangle (a ≥ b)."""
    x0, y0, w, h, out, steps = 0, 0, a, b, [], []
    while w > 0 and h > 0:
        if w >= h:
            q, r = divmod(w, h); steps.append([w, h, q, r])
            for k in range(q): out.append([x0 + k * h, y0, h])
            x0 += q * h; w = r
        else:
            q, r = divmod(h, w); steps.append([h, w, q, r])
            for k in range(q): out.append([x0, y0 + k * w, w])
            y0 += q * w; h = r
    return out, steps
squares, esteps = euclid_squares(1071, 462)
sq_times = [4.0, 5.0, 7.0, 7.5, 8.0] + [10.0 + 0.25 * k for k in range(7)]
assert len(squares) == len(sq_times)
TL["euclid"] = {"a": 1071, "b": 462, "squares": squares, "times": sq_times, "steps": esteps}

# ----------------------------------------------------------------------------- sorting
class Tracer:
    def __init__(self, arr): self.a = list(arr); self.ops = []
    def cmp(self, i, j): self.ops.append([0, i, j]); return self.a[i] - self.a[j]
    def cmpv(self, i, v): self.ops.append([0, i, i]); return self.a[i] - v
    def swap(self, i, j):
        self.ops.append([1, i, j]); self.a[i], self.a[j] = self.a[j], self.a[i]
    def write(self, i, v): self.ops.append([2, i, v]); self.a[i] = v

def bubble(T):
    n = len(T.a)
    for end in range(n - 1, 0, -1):
        sw = False
        for i in range(end):
            if T.cmp(i, i + 1) > 0: T.swap(i, i + 1); sw = True
        if not sw: break
def insertion(T):
    for i in range(1, len(T.a)):
        j = i
        while j > 0 and T.cmp(j - 1, j) > 0: T.swap(j - 1, j); j -= 1
def selection(T):
    n = len(T.a)
    for i in range(n - 1):
        m = i
        for j in range(i + 1, n):
            if T.cmp(j, m) < 0: m = j
        if m != i: T.swap(i, m)
def merge(T):
    aux = [0] * len(T.a)
    def rec(lo, hi):
        if hi - lo < 2: return
        mid = (lo + hi) // 2; rec(lo, mid); rec(mid, hi)
        aux[lo:hi] = T.a[lo:hi]; i, j = lo, mid
        for k in range(lo, hi):
            if i < mid and (j >= hi or (T.ops.append([0, lo + (i - lo), j if j < hi else hi - 1]) or aux[i] <= aux[j])):
                T.write(k, aux[i]); i += 1
            else:
                T.write(k, aux[j]); j += 1
    rec(0, len(T.a))
def heap(T):
    n = len(T.a)
    def sift(s, end):
        r = s
        while 2 * r + 1 <= end:
            c = 2 * r + 1; sw = r
            if T.cmp(sw, c) < 0: sw = c
            if c + 1 <= end and T.cmp(sw, c + 1) < 0: sw = c + 1
            if sw == r: return
            T.swap(r, sw); r = sw
    for s in range((n - 2) // 2, -1, -1): sift(s, n - 1)
    for end in range(n - 1, 0, -1): T.swap(0, end); sift(0, end - 1)
def quick_hoare(T):
    def rec(lo, hi):
        if lo >= hi: return
        p = T.a[(lo + hi) // 2]; i, j = lo - 1, hi + 1
        while True:
            i += 1
            while T.cmpv(i, p) < 0: i += 1
            j -= 1
            while T.cmpv(j, p) > 0: j -= 1
            if i >= j: break
            T.swap(i, j)
        rec(lo, j); rec(j + 1, hi)
    rec(0, len(T.a) - 1)
def quick_lomuto(T, marks):
    def rec(lo, hi):
        if lo >= hi: return
        marks.append([len(T.ops), lo, hi])
        i = lo
        for j in range(lo, hi):
            if T.cmp(j, hi) < 0:
                if i != j: T.swap(i, j)
                i += 1
        if i != hi: T.swap(i, hi)
        rec(lo, i - 1); rec(i + 1, hi)
    rec(0, len(T.a) - 1)

# quicksort showcase (sonified)
qs_arr = list(rng.permutation(64) + 1)
T = Tracer(qs_arr); marks = []; quick_lomuto(T, marks)
assert T.a == sorted(qs_arr)
QS = {"arr": [int(v) for v in qs_arr], "ops": T.ops, "marks": marks, "t0": 30.0, "t1": 36.0}
QS["rate"] = len(T.ops) / (QS["t1"] - QS["t0"])
print("quicksort ops", len(T.ops))

# race
race_arr = [int(v) for v in rng.permutation(100) + 1]
RACE = {"arr": race_arr, "t0": 36.0, "t1": 44.0, "lanes": []}
for name, cn, fn, cx in [("Bubble", "冒泡排序", bubble, "O(n²)"), ("Insertion", "插入排序", insertion, "O(n²)"),
                         ("Selection", "选择排序", selection, "O(n²)"), ("Heap", "堆排序", heap, "O(n log n)"),
                         ("Merge", "归并排序", merge, "O(n log n)"), ("Quick", "快速排序", quick_hoare, "O(n log n)")]:
    T = Tracer(race_arr); fn(T); assert T.a == sorted(race_arr), name
    RACE["lanes"].append({"name": name, "cn": cn, "cx": cx, "ops": T.ops})
mx = max(len(l["ops"]) for l in RACE["lanes"])
RACE["rate"] = mx / (RACE["t1"] - RACE["t0"] - 0.25)
for l in RACE["lanes"]:
    l["finish"] = RACE["t0"] + len(l["ops"]) / RACE["rate"]
    print("race", l["name"], len(l["ops"]), round(l["finish"], 2))

# colour wheel: bottom-up merge sort passes on every spoke
WHEEL = {"spokes": 240, "cells": 128, "t0": 44.0, "passT": [45.5 + 0.5 * k for k in range(7)]}
TL["sort"] = {"qs": {k: QS[k] for k in ("t0", "t1", "rate")}, "race": {"t0": RACE["t0"], "t1": RACE["t1"], "rate": RACE["rate"],
              "finish": [l["finish"] for l in RACE["lanes"]]}, "wheel": WHEEL}

# ----------------------------------------------------------------------------- searching
BS = {"lo": 0, "hi": 1_000_000, "target": 742_519, "t0": 62.0, "step": 0.25, "steps": []}
lo, hi = BS["lo"], BS["hi"]
while lo < hi:
    mid = (lo + hi) // 2
    if mid == BS["target"]: BS["steps"].append([lo, hi, mid, 0]); break
    if mid < BS["target"]: BS["steps"].append([lo, hi, mid, 1]); lo = mid + 1
    else: BS["steps"].append([lo, hi, mid, -1]); hi = mid - 1
else:
    BS["steps"].append([lo, hi, lo, 0])
print("binary search steps", len(BS["steps"]))
TL["search"] = {"bs": BS, "maze": {"t0": 68.0, "carve1": 74.0, "flood1": 80.0, "path1": 83.0, "t1": 90.0, "w": 80, "h": 45}}

# ----------------------------------------------------------------------------- Fourier: 美
from fontTools.ttLib import TTCollection
from fontTools.pens.basePen import BasePen
class FlatPen(BasePen):
    def __init__(self, gs):
        super().__init__(gs); self.contours = []; self.cur = []
    def _moveTo(self, p): self.cur = [p]
    def _lineTo(self, p): self.cur.append(p)
    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for k in range(1, 17):
            t = k / 16; u = 1 - t
            self.cur.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0], u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for k in range(1, 13):
            t = k / 12; u = 1 - t
            self.cur.append((u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0], u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]))
    def _closePath(self):
        if len(self.cur) > 2: self.contours.append(self.cur)
        self.cur = []
    _endPath = _closePath
font = TTCollection('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc').fonts[2]
gs = font.getGlyphSet(); gname = font.getBestCmap()[ord("美")]
pen = FlatPen(gs); gs[gname].draw(pen)
contours = []
for c in pen.contours:
    P = np.array(c, float)
    P = np.vstack([P, P[:1]])
    seg = np.hypot(*np.diff(P, axis=0).T); L = seg.sum()
    if L < 60: continue
    s = np.concatenate([[0], np.cumsum(seg)])
    N = 1024
    u = np.linspace(0, L, N, endpoint=False)
    x = np.interp(u, s, P[:, 0]); y = np.interp(u, s, P[:, 1])
    z = (x - 500) + 1j * (y - 380)            # centre the glyph roughly (em box 0..1000, baseline at -120)
    F = np.fft.fft(z) / N
    freqs = np.fft.fftfreq(N, 1 / N).astype(int)
    order = np.argsort(-np.abs(F))
    keep = [i for i in order if freqs[i] != 0][:110]
    terms = [[int(freqs[i]), round(float(F[i].real), 3), round(float(F[i].imag), 3)] for i in keep]
    contours.append({"c0": [round(float(F[0].real), 3), round(float(F[0].imag), 3)], "terms": terms, "len": round(float(L), 1)})
contours.sort(key=lambda c: -c["len"])
print("美 contours", len(contours), [c["len"] for c in contours])
FOURIER = {"glyph": "美", "contours": contours}
TL["fourier"] = {"t0": 90.0, "harm0": 92.0, "harmStep": 0.5, "nHarm": 8, "sweep0": 96.0, "sweep1": 98.0, "draw0": 100.0, "draw1": 108.0, "spec0": 110.0, "t1": 118.0}

# ----------------------------------------------------------------------------- emergence + recursion timings
TL["emerge"] = {"t0": 118.0, "boids0": 118.0, "boids1": 134.0, "turing0": 134.0, "t1": 146.0}
TL["tree"] = {"t0": 146.0, "lvl0": 148.5, "lvlStep": 0.5, "depth": 12, "t1": 156.0}

# ----------------------------------------------------------------------------- Mandelbrot camera
import mpmath as mp
mp.mp.dps = 50
nuc = mp.mpc("-0.745118575346421375186154761306", "0.131186393536551378412596586993")
for _ in range(10):
    z = mp.mpc(0); dz = mp.mpc(0)
    for k in range(35): dz = 2 * z * dz + 1; z = z * z + nuc
    nuc -= z / dz
z = mp.mpc(0); l = mp.mpc(1); b = mp.mpc(1); orbit = []
for n in range(35):
    orbit.append([float(z.real), float(z.imag)]); z = z * z + nuc
z = mp.mpc(0)
for n in range(1, 35):
    z = z * z + nuc; l = 2 * z * l; b = b + 1 / l
size = 1 / (b * l * l)
target = nuc + size * mp.mpf("-0.6")
zf = float(1 / abs(size)); rotf = float(mp.arg(size))   # minibrot drawn upright: last frame mirrors the first
M = {"t0": 156.0, "t1": 184.0, "reveal1": 160.0, "zoom1": 180.0,
     "nuc": [mp.nstr(nuc.real, 25), mp.nstr(nuc.imag, 25)], "target": [mp.nstr(target.real, 25), mp.nstr(target.imag, 25)],
     "start": [-0.6, 0.0], "k": 1.3, "span": 3.6, "zf": zf, "rotf": rotf, "period": 35, "orbit": orbit,
     "dTarget": [float((target - nuc).real), float((target - nuc).imag)], "dStart": [float(-0.6 - nuc.real), float(-nuc.imag)]}
def mcam(t):
    m = t - M["t0"]
    if m < 4.0:
        q = max(0.0, m) / 4.0
        return 1.0, 0.0, max(3, int(round(3 * (80 / 3) ** q)))
    if m < 5.0:
        return 1.0, 0.0, int(round(80 + 170 * (m - 4.0)))
    u = min(1.0, max(0.0, (m - 4.0) / 20.0))
    E = (1 - math.cos(math.pi * u)) / 2
    zoom = math.exp(math.log(zf) * E)
    return zoom, rotf * E, int(250 + 110 * math.log2(max(zoom, 1)))
frames = []
with open(os.path.join(BUILD, "mandel_frames.txt"), "w") as f:
    for i in range(int((M["t1"] - M["t0"]) * FPS)):
        zoom, rot, mi = mcam(M["t0"] + i / FPS)
        frames.append([zoom, rot, mi]); f.write(f"{i} {zoom:.17g} {rot:.17g} {mi}\n")
M["frames"] = [[float(f"{z:.12g}"), round(r, 6), m] for z, r, m in frames]
TL["mandel"] = {k: M[k] for k in ("t0", "t1", "reveal1", "zoom1", "zf", "rotf")}
print("mandel zf %.4g rotf %.4f frames %d" % (zf, rotf, len(frames)))

# ----------------------------------------------------------------------------- TSP cities: weighted Voronoi stippling of the Mandelbrot set
def mandel_density(w=960, h=540):
    span = 3.6; pix = span / w
    xs = -0.6 + (np.arange(w) - w / 2 + 0.5) * pix; ys = -(np.arange(h) - h / 2 + 0.5) * pix
    C = xs[None, :] + 1j * ys[:, None]
    Z = np.zeros_like(C); D = np.zeros_like(C); alive = np.ones(C.shape, bool); de = np.full(C.shape, np.inf)
    for i in range(400):
        D[alive] = 2 * Z[alive] * D[alive] + 1; Z[alive] = Z[alive] ** 2 + C[alive]
        az = np.abs(Z); esc = alive & (az > 1e3)
        de[esc] = az[esc] * np.log(az[esc]) / np.abs(D[esc]) / pix
        alive &= ~esc
    inside = alive
    dens = np.where(inside, 0.55, 0.0) + np.exp(-np.clip(de, 0, 60) / 2.5) * 1.0
    dens[inside] = np.maximum(dens[inside], 0.55)
    return dens, pix
from scipy.spatial import cKDTree
dens, pix = mandel_density()
H_, W_ = dens.shape
yy, xx = np.mgrid[0:H_, 0:W_]
P = np.stack([xx.ravel() + 0.5, yy.ravel() + 0.5], 1); wts = dens.ravel()
nz = wts > 1e-3; P, wts = P[nz], wts[nz]
NC = 1500
pts = P[rng.choice(len(P), NC, replace=False, p=wts / wts.sum())] + rng.uniform(-0.5, 0.5, (NC, 2))
for it in range(45):
    _, idx = cKDTree(pts).query(P)
    sw = np.bincount(idx, wts, NC); sx = np.bincount(idx, wts * P[:, 0], NC); sy = np.bincount(idx, wts * P[:, 1], NC)
    ok = sw > 0; pts[ok, 0] = sx[ok] / sw[ok]; pts[ok, 1] = sy[ok] / sw[ok]
cities = (pts * 2).round(1)   # 960x540 grid -> 1920x1080 screen
TSP = {"cities": cities.ravel().tolist()}
TL["tsp"] = {"t0": 184.0, "sa0": 186.0, "sa1": 204.0, "t1": 212.0, "n": NC}
print("cities", len(cities))

# ----------------------------------------------------------------------------- learning: two spirals + MLP snapshots
def spirals(n=180, noise=0.02, turns=1.75):
    t = np.sqrt(rng.uniform(0.02, 1, n)) * turns * 2 * np.pi
    r = t / (turns * 2 * np.pi)
    a = np.stack([r * np.cos(t), r * np.sin(t)], 1) + rng.normal(0, noise, (n, 2))
    b = -a + rng.normal(0, noise, (n, 2))
    X = np.vstack([a, b]); y = np.concatenate([np.zeros(n), np.ones(n)])
    return X, y
X, Y = spirals()
H1 = H2 = 20
def init():
    return {"W1": rng.normal(0, 1.0, (2, H1)), "b1": np.zeros(H1), "W2": rng.normal(0, 1 / math.sqrt(H1), (H1, H2)),
            "b2": np.zeros(H2), "W3": rng.normal(0, 1 / math.sqrt(H2), (H2, 1)), "b3": np.zeros(1)}
def forward(p, X):
    h1 = np.tanh(X * 2.5 @ p["W1"] + p["b1"]); h2 = np.tanh(h1 @ p["W2"] + p["b2"])
    o = 1 / (1 + np.exp(-(h2 @ p["W3"] + p["b3"])))
    return h1, h2, o[:, 0]
p = init(); m = {k: np.zeros_like(v) for k, v in p.items()}; v2 = {k: np.zeros_like(v) for k, v in p.items()}
EPOCHS = 2400; lr = 0.02
snap_epochs = sorted(set([0, 1, 2, 3, 5, 8] + [int(round(x)) for x in np.geomspace(10, EPOCHS, 150)]))
snaps = []
for ep in range(EPOCHS + 1):
    h1, h2, o = forward(p, X)
    if ep in snap_epochs:
        loss = float(-np.mean(Y * np.log(o + 1e-9) + (1 - Y) * np.log(1 - o + 1e-9))); acc = float(np.mean((o > 0.5) == Y))
        snaps.append({"ep": ep, "loss": loss, "acc": acc, "w": np.concatenate([p[k].ravel() for k in ("W1", "b1", "W2", "b2", "W3", "b3")]).astype(np.float32)})
    if ep == EPOCHS: break
    g3 = (o - Y)[:, None] / len(Y)
    gW3 = h2.T @ g3; gb3 = g3.sum(0); g2 = (g3 @ p["W3"].T) * (1 - h2 ** 2)
    gW2 = h1.T @ g2; gb2 = g2.sum(0); g1 = (g2 @ p["W2"].T) * (1 - h1 ** 2)
    gW1 = (X * 2.5).T @ g1; gb1 = g1.sum(0)
    for k, g in zip(("W1", "b1", "W2", "b2", "W3", "b3"), (gW1, gb1, gW2, gb2, gW3, gb3)):
        m[k] = 0.9 * m[k] + 0.1 * g; v2[k] = 0.999 * v2[k] + 0.001 * g * g
        mh = m[k] / (1 - 0.9 ** (ep + 1)); vh = v2[k] / (1 - 0.999 ** (ep + 1))
        p[k] -= lr * mh / (np.sqrt(vh) + 1e-8)
print("NN final acc %.3f loss %.4f, snaps %d" % (snaps[-1]["acc"], snaps[-1]["loss"], len(snaps)))
wall = np.stack([s["w"] for s in snaps])
NN = {"X": X.round(4).ravel().tolist(), "Y": Y.astype(int).tolist(), "H1": H1, "H2": H2, "scale": 2.5,
      "epochs": [s["ep"] for s in snaps], "loss": [round(s["loss"], 4) for s in snaps], "acc": [round(s["acc"], 4) for s in snaps],
      "w": base64.b64encode(wall.astype(np.float32).tobytes()).decode()}
TL["learn"] = {"t0": 212.0, "gd0": 214.0, "gd1": 224.0, "nn0": 224.0, "train0": 226.0, "train1": 240.0, "meta0": 244.0, "t1": 250.0, "epochs": EPOCHS}
TL["montage"] = {"t0": 250.0, "t1": 272.0}
TL["finale"] = {"t0": 272.0, "t1": 300.0}

# ----------------------------------------------------------------------------- write
with open(os.path.join(BUILD, "timeline.json"), "w") as f:
    json.dump({"TL": TL, "QS": QS, "RACE": {"t0": RACE["t0"], "rate": RACE["rate"], "lanes": [{"finish": l["finish"], "n": len(l["ops"])} for l in RACE["lanes"]]},
               "BS": BS, "WHEEL": WHEEL}, f)
DATA = {"QS": QS, "RACE": RACE, "FOURIER": FOURIER, "MANDEL": M, "TSP": TSP, "NN": NN}
with open(os.path.join(SRC, "data.js"), "w") as f:
    f.write("// generated by tools/compute.py — real algorithm traces, glyph Fourier series, stipple cities, network snapshots\n")
    f.write("window.TL = " + json.dumps(TL, separators=(",", ":"), ensure_ascii=False) + ";\n")
    f.write("window.DATA = " + json.dumps(DATA, separators=(",", ":"), ensure_ascii=False) + ";\n")
print("data.js %.1f KB" % (os.path.getsize(os.path.join(SRC, "data.js")) / 1024))
