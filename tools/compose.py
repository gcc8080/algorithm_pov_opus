#!/usr/bin/env python3
"""
THE BEAUTY OF ALGORITHMS — original score, fully synthesized.

120 BPM · D minor · 150 bars = 300 s.  The algorithms on screen are also
instruments: the quicksort you watch is the quicksort you hear, binary search
pings left/right, the Fourier chapter adds harmonics you can hear stacking,
and the Mandelbrot dive rides an endless Shepard–Risset rise.

Reads build/timeline.json (tools/compute.py) and writes
    build/score.wav       raw mix
    src/events.js         every musical event, for the renderer to cut on
"""
import json, os, math
import numpy as np
from scipy.signal import butter, lfilter, fftconvolve, sosfilt
from scipy.io import wavfile

SR = 44100; BPM = 120; BEAT = 0.5; BAR = 2.0; BARS = 150; DUR = 300.0
N = int(DUR * SR) + SR * 6
rng = np.random.default_rng(31415926)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(open(os.path.join(ROOT, "build", "timeline.json")))
TL, QS, RACE, BS = J["TL"], J["QS"], J["RACE"], J["BS"]

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def S(t): return int(round(t * SR))
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}
NOTE.update({"Db": 1, "Eb": 3, "Gb": 6, "Ab": 8, "Bb": 10})
def nm(s):  # "D4" -> midi
    name, octv = (s[:-1], int(s[-1]))
    return 12 * (octv + 1) + NOTE[name]

# ------------------------------------------------------------------ buses
B = {k: np.zeros((2, N)) for k in ("dry", "duck", "rev", "son")}
def put(bus, t, sig, gain=1.0, pan=0.0):
    i = S(t)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), N - i)
    gl = gain * math.cos((pan + 1) * math.pi / 4); gr = gain * math.sin((pan + 1) * math.pi / 4)
    B[bus][0, i:i + n] += sig[:n] * gl; B[bus][1, i:i + n] += sig[:n] * gr
def put_st(bus, t, L, R, gain=1.0):
    i = S(t); n = min(len(L), N - i)
    if n <= 0: return
    B[bus][0, i:i + n] += L[:n] * gain; B[bus][1, i:i + n] += R[:n] * gain

def _sos(kind, fc, order=2):
    if kind == "band": return butter(order, [fc[0] / (SR / 2), min(fc[1], SR * 0.47) / (SR / 2)], "band", output="sos")
    return butter(order, min(fc, SR * 0.47) / (SR / 2), kind, output="sos")
def lp(x, fc, o=2): return sosfilt(_sos("low", fc, o), x)
def hp(x, fc, o=2): return sosfilt(_sos("high", fc, o), x)
def bp(x, lo, hi, o=2): return sosfilt(_sos("band", (lo, hi), o), x)
def sweep_lp(x, fc_of_t, block=256):
    """time-varying 2-pole lowpass, coefficients updated every block"""
    y = np.empty_like(x); zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        fc = float(np.clip(fc_of_t(i / SR), 20, SR * 0.45))
        sos = _sos("low", fc, 2)
        y[i:i + block], zi = sosfilt(sos, x[i:i + block], zi=zi)
    return y

def tt(n): return np.arange(n) / SR
def saw(f, n, ph=None):
    p = (np.arange(n) * f / SR + (rng.random() if ph is None else ph)) % 1.0
    return 2 * p - 1
def env_adsr(n, a, d, s, r, gate):
    t = tt(n)
    e = np.where(t < a, t / max(a, 1e-4), np.where(t < a + d, 1 - (1 - s) * (t - a) / max(d, 1e-4), s))
    return e * (1 - np.clip((t - gate) / max(r, 1e-4), 0, 1))

EV = {"bpm": BPM, "kicks": [], "snares": [], "hats": [], "taiko": [], "impacts": list(TL["impacts"]), "lead": [], "piano": [],
      "plucks": [], "dings": [], "pings": [], "tree": [], "arps": [], "chords": [], "whoosh": [], "ticks": []}

# ------------------------------------------------------------------ harmony
CH = {  # pad voicing, bass root (midi)
    "Dm": (["A3", "D4", "F4", "A4", "D5"], "D2"), "Bb": (["F3", "Bb3", "D4", "F4", "Bb4"], "Bb1"),
    "F": (["F3", "A3", "C4", "F4", "A4"], "F2"), "C": (["G3", "C4", "E4", "G4", "C5"], "C2"),
    "Gm": (["G3", "Bb3", "D4", "G4", "Bb4"], "G1"), "A": (["A3", "C#4", "E4", "A4", "C#5"], "A1"),
    "G": (["G3", "B3", "D4", "G4", "B4"], "G1"), "Fmaj7": (["F3", "A3", "C4", "E4", "A4"], "F2"),
    "Dm7": (["F3", "A3", "C4", "D4", "F4"], "D2"), "Bbmaj7": (["F3", "A3", "Bb3", "D4", "F4"], "Bb1"),
    "Gm7": (["F3", "G3", "Bb3", "D4", "F4"], "G1"), "Asus": (["A3", "D4", "E4", "A4", "D5"], "A1"),
    "Dm/C": (["A3", "D4", "F4", "A4", "D5"], "C2"), "Bb/D": (["F3", "Bb3", "D4", "F4", "Bb4"], "D2"),
    "Gm/D": (["G3", "Bb3", "D4", "G4", "Bb4"], "D2"), "C/D": (["G3", "C4", "E4", "G4", "C5"], "D2"),
    "D": (["A3", "D4", "F#4", "A4", "D5"], "D2"),
}
P = ["Dm", "Bb", "F", "C"]
PROG = (["Dm", "Dm", "Bb", "Bb", "F", "F", "C", "C", "Gm", "A"] +          # 0-9   prologue
        P +                                                                  # 10-13 title
        P * 4 +                                                              # 14-29 sorting
        ["Bb", "C", "Dm", "Dm", "Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "Bb", "C", "C", "A"] +   # 30-44 search
        ["Fmaj7", "C", "Dm7", "Bbmaj7"] * 3 + ["Gm7", "A"] +                 # 45-58 fourier
        ["Dm", "F", "C", "G"] * 3 + ["Bb", "A"] +                            # 59-72 emergence
        ["Dm", "Dm/C", "Bb", "A", "A"] +                                     # 73-77 tree
        ["Dm", "Bb/D", "Gm/D", "Dm", "Bb/D", "C/D", "Dm", "Bb/D", "Gm/D", "Asus", "A", "A"] +   # 78-89 mandelbrot
        ["D", "D"] +                                                         # 90-91 the minibrot
        P * 3 + ["Gm", "A"] +                                                # 92-105 drop
        ["Bb", "F", "C", "Dm", "Bb", "C"] +                                  # 106-111 descent
        P * 2 + ["Gm", "A"] + ["Bb", "C", "A"] +                             # 112-124 learning
        P * 2 + ["Gm", "Bb", "A"] +                                          # 125-135 montage
        ["Dm", "Bb", "F", "C", "Gm", "Bb", "A", "A"] + ["D"] * 6)            # 136-149 finale
assert len(PROG) == BARS, len(PROG)
for b, c in enumerate(PROG): EV["chords"].append([b * BAR, c])
def chord_at(t): return PROG[min(BARS - 1, int(t // BAR))]

def section(bar):
    for name, a, b in [("pro", 0, 10), ("title", 10, 14), ("sort", 14, 30), ("search", 30, 45), ("fourier", 45, 59), ("emerge", 59, 73),
                       ("tree", 73, 78), ("mandel", 78, 92), ("drop", 92, 106), ("learn", 106, 125), ("montage", 125, 136), ("finale", 136, 150)]:
        if a <= bar < b: return name
    return "finale"

# ------------------------------------------------------------------ instruments
def kick_s():
    n = S(0.6); t = tt(n); f = 45 + 110 * np.exp(-t * 26) + 260 * np.exp(-t * 150)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.2)
    click = hp(rng.standard_normal(n), 2500) * np.exp(-t * 280) * 0.3
    return np.tanh((s + click) * 1.7)
def snare_s():
    n = S(0.45); t = tt(n)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 20) * 0.55 + np.sin(2 * np.pi * 330 * t) * np.exp(-t * 30) * 0.25
    nz = bp(rng.standard_normal(n), 1200, 8000) * np.exp(-t * 13)
    return tone + nz * 0.62
def clap_s():
    n = S(0.4); t = tt(n); x = np.zeros(n)
    for k, off in enumerate([0, 0.009, 0.019, 0.032]):
        i = S(off); m = n - i; x[i:] += bp(rng.standard_normal(m), 900, 5000) * np.exp(-tt(m) * (70 if k < 3 else 13))
    return x
def hat_s(op=False):
    n = S(0.38 if op else 0.07); t = tt(n)
    return hp(rng.standard_normal(n), 7800, 4) * np.exp(-t * (8 if op else 75))
def crash_s():
    n = S(5.0); t = tt(n)
    return lp(hp(rng.standard_normal(n), 3500, 2), 11000) * (np.exp(-t * 1.5) * 0.9 + np.exp(-t * 10) * 0.6)
def boom_s():
    n = S(4.5); t = tt(n); f = 26 + 64 * np.exp(-t * 2.6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 0.8)
    return np.tanh((s + lp(rng.standard_normal(n), 700) * np.exp(-t * 5) * 0.7) * 1.6)
def taiko_s(f0=72):
    n = S(1.3); t = tt(n); f = f0 * (1 + 0.5 * np.exp(-t * 18))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    skin = bp(rng.standard_normal(n), 120, 900) * np.exp(-t * 14) * 0.6
    slap = hp(rng.standard_normal(n), 2000) * np.exp(-t * 90) * 0.25
    return np.tanh((s + skin + slap) * 1.4)
def tom_s(f0):
    n = S(0.5); t = tt(n); f = f0 * (1 + 0.6 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
KICK, SNARE, CLAP, HAT, OHAT, CRASH, BOOM = kick_s(), snare_s(), clap_s(), hat_s(), hat_s(True), crash_s(), boom_s()
TAIKO = [taiko_s(f) for f in (62, 78, 96)]
TOMS = [tom_s(f) for f in (190, 150, 118, 92)]

def braam(t0, root="D1", dur=3.2, gain=0.55, bright=3200):
    n = S(dur + 2.0); t = tt(n); x = np.zeros(n)
    for m, g in [(nm(root), 1.0), (nm(root) + 12, 0.8), (nm(root) + 19, 0.45), (nm(root) + 24, 0.3)]:
        for d in (-0.12, 0, 0.11): x += saw(mtof(m) * 2 ** (d / 12), n) * g
    x = sweep_lp(x, lambda s: 180 + bright * math.exp(-((s - 0.35) / 0.9) ** 2) + 300 * math.exp(-s))
    x = np.tanh(x * 0.9) * env_adsr(n, 0.04, 0.6, 0.7, 1.8, dur)
    put("dry", t0, x, gain * 0.5, -0.15); put("dry", t0 + 0.012, x, gain * 0.5, 0.15); put("rev", t0, x, gain * 0.35)

def impact(t0, big=1.0, root="D1", braam_on=True):
    put("dry", t0, BOOM, 0.85 * big); put("rev", t0, BOOM, 0.3 * big)
    put("dry", t0, CRASH, 0.2 * big, -0.35); put("dry", t0 + 0.007, CRASH, 0.2 * big, 0.35); put("rev", t0, CRASH, 0.18 * big)
    put("dry", t0, KICK, 0.85 * big); put("dry", t0, TAIKO[0], 0.5 * big); put("rev", t0, TAIKO[0], 0.25 * big)
    if braam_on: braam(t0, root, gain=0.42 * big)
def reverse_crash(t_hit, length=2.0, g=0.35):
    n = S(length); sig = CRASH[:n][::-1] * np.linspace(0, 1, n) ** 2
    put("dry", t_hit - length, sig, g, -0.2); put("dry", t_hit - length + 0.01, sig, g, 0.2); put("rev", t_hit - length, sig, g * 0.6)
def riser(t0, t1, g=0.3):
    n = S(t1 - t0); x = np.linspace(0, 1, n)
    nz = sweep_lp(rng.standard_normal(n), lambda s: 300 + 9000 * (s / (t1 - t0)) ** 2.2)
    tone = np.sin(2 * np.pi * np.cumsum(140 * 2 ** (x * 3)) / SR) * 0.12
    sig = hp(nz * 1.5 + tone, 180) * x ** 1.7
    put("dry", t0, sig, g * 0.7, -0.3); put("dry", t0 + 0.013, sig, g * 0.7, 0.3); put("rev", t0, sig, g * 0.5)

def piano(t0, m, vel=0.6, dur=2.5, pan=0.0, bus="dry", rv=0.45):
    f = mtof(m); n = S(dur + 1.2); t = tt(n); x = np.zeros(n); Bc = 0.00012
    for h in range(1, 11):
        fh = f * h * math.sqrt(1 + Bc * h * h)
        if fh > SR * 0.45: break
        amp = (vel ** (0.5 + 0.15 * h)) / h ** 1.1
        dec = 1.2 + 0.55 * h + f / 600
        x += amp * (np.sin(2 * np.pi * fh * t) + 0.6 * np.sin(2 * np.pi * fh * 1.0007 * t + 1.3)) * np.exp(-t * dec)
    x += lp(rng.standard_normal(n), 3000) * np.exp(-t * 60) * 0.04 * vel
    x *= np.minimum(1, t / 0.003) * (1 - np.clip((t - dur) / 0.4, 0, 1))
    g = 0.11 * vel; put(bus, t0, x, g, pan); put("rev", t0, x, g * rv, pan)
    EV["piano"].append([round(t0, 4), m])
def bell(t0, m, g=0.1, pan=0.0, dec=2.0, ratio=3.5, idx=2.0, bus="dry", rv=0.8):
    f = mtof(m); n = S(min(4.5, 3.0 / dec * 3)); t = tt(n)
    mod = np.sin(2 * np.pi * f * ratio * t) * idx * np.exp(-t * 3)
    x = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * dec) * np.minimum(1, t / 0.002)
    put(bus, t0, x, g, pan); put("rev", t0, x, g * rv, pan)
def pluck(t0, m, g=0.08, pan=0.0, dec=6.0, bus="duck", cut=3500, rv=0.4):
    f = mtof(m); n = S(0.9); t = tt(n)
    x = (saw(f, n) * 0.7 + np.sign(np.sin(2 * np.pi * f * t)) * 0.3)
    x = lp(x, cut) * np.exp(-t * dec) * np.minimum(1, t / 0.002)
    put(bus, t0, x, g, pan); put("rev", t0, x, g * rv, pan)
def blip(t0, f, g=0.05, pan=0.0, dur=0.05):
    n = S(dur + 0.04); t = tt(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / dur * 3) * np.minimum(1, t / 0.001)
    put("son", t0, x, g, pan); put("rev", t0, x, g * 0.35, pan)

DET = np.array([-0.16, -0.09, -0.035, 0, 0.035, 0.09, 0.16])
def pad_chord(t0, name, dur, gain=0.2, cut=2800, att=0.35, rel=1.4, bus="duck", oct_=0):
    notes, _ = CH[name]; n = S(dur + rel); L = np.zeros(n); R = np.zeros(n)
    for s in notes:
        f = mtof(nm(s) + oct_)
        for k, d in enumerate(DET):
            v = saw(f * 2 ** (d / 12), n)
            if k % 2: L += v
            else: R += v
    e = env_adsr(n, att, 0.5, 0.85, rel, dur)
    cutf = cut if callable(cut) else (lambda s, c=cut: c)
    L = sweep_lp(L, lambda s: cutf(t0 + s)) * e; R = sweep_lp(R, lambda s: cutf(t0 + s)) * e
    g = gain / (len(notes) * 3.5)
    put_st(bus, t0, L, R, g); put_st("rev", t0, L, R, g * 0.55)
def choir(t0, name, dur, gain=0.16, att=1.2, rel=2.0, oct_=0):
    notes, _ = CH[name]; n = S(dur + rel); L = np.zeros(n); R = np.zeros(n); t = tt(n)
    for j, s in enumerate(notes):
        f = mtof(nm(s) + oct_)
        for k, d in enumerate((-0.08, 0.0, 0.08)):
            vib = 1 + 0.005 * np.sin(2 * np.pi * (5.0 + 0.4 * k) * t + j + k)
            ph = np.cumsum(f * 2 ** (d / 12) * vib) / SR + rng.random()
            v = 2 * (ph % 1.0) - 1
            v = bp(v, 650, 1100) * 1.0 + bp(v, 1050, 1350) * 0.6 + bp(v, 2600, 3200) * 0.25 + lp(v, 400) * 0.3
            if (j + k) % 2: L += v
            else: R += v
    e = env_adsr(n, att, 0.8, 0.9, rel, dur); g = gain / len(notes)
    put_st("duck", t0, L * e, R * e, g * 0.7); put_st("rev", t0, L * e, R * e, g * 1.0)
def strings_ost(t0, name, gain=0.05, bars=1, pattern=(0, 2, 4, 2)):
    notes, _ = CH[name]; ms = [nm(s) for s in notes]
    for k in range(int(bars * 16)):
        m = ms[pattern[k % len(pattern)]] + (12 if (k // 8) % 2 else 0)
        f = mtof(m); n = S(0.2); t = tt(n)
        x = sum(saw(f * 2 ** (d / 12), n) for d in (-0.07, 0, 0.07)) / 3
        x = bp(x, 250, 4500) * np.exp(-t * 14) * np.minimum(1, t / 0.004)
        put("duck", t0 + k * BEAT / 4, x, gain * (1.0 if k % 4 == 0 else 0.75), 0.35 * math.sin(k * 0.8))
def lead_note(t0, m, dur, g=0.1, oct2=False):
    n = S(dur + 0.4); t = tt(n)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.2) * 3, 0, 1)
    x = np.zeros(n)
    for mm, gg in [(m, 1.0)] + ([(m - 12, 0.6)] if oct2 else []):
        for d in (-0.1, 0, 0.1):
            ph = np.cumsum(mtof(mm) * 2 ** (d / 12) * vib) / SR + rng.random(); x += (2 * (ph % 1) - 1) * gg
    x = lp(x, 4200) * env_adsr(n, 0.012, 0.25, 0.75, 0.35, dur)
    put("dry", t0, x, g, 0.0); put("rev", t0, x, g * 0.9)
    for k in (1, 2): put("dry", t0 + 0.375 * k, x, g * 0.3 ** k, 0.55 if k == 1 else -0.55)
    EV["lead"].append([round(t0, 4), m, dur])

THEME = [  # (midi, beats) per bar, 8 bars over Dm Bb F C Dm Bb F C
    [("F5", 1), ("E5", .5), ("D5", .5), ("A5", 2)], [("G5", 1), ("F5", .5), ("E5", .5), ("D5", 2)],
    [("C5", 1), ("D5", .5), ("E5", .5), ("F5", 1), ("A5", 1)], [("G5", 3), ("E5", 1)],
    [("F5", 1), ("E5", .5), ("D5", .5), ("A5", 1.5), ("D6", .5)], [("C6", 1), ("Bb5", .5), ("A5", .5), ("G5", 2)],
    [("A5", 1), ("G5", .5), ("F5", .5), ("E5", 1), ("F5", 1)], [("E5", 2), ("G5", 1), ("E5", 1)],
]
def theme(bar0, bars, g=0.1, oct2=False, transpose=0, piano_=False, start=0):
    for i in range(bars):
        t = (bar0 + i) * BAR
        for s, beats in THEME[(start + i) % 8]:
            m = nm(s) + transpose
            if piano_: piano(t, m, 0.7, beats * BEAT + 0.6, 0.0)
            else: lead_note(t, m, beats * BEAT * 0.95, g, oct2)
            t += beats * BEAT

# ------------------------------------------------------------------ drums
def drum_level(bar):
    s = section(bar)
    if s in ("pro", "tree"): return 0
    if s == "title": return 0
    if s == "sort": return 1 if bar < 18 else 2 if bar < 22 else 3 if bar < 28 else 2
    if s == "search": return 1 if bar < 34 else 2 if bar < 37 else 3 if bar < 43 else 0
    if s == "fourier": return 0 if bar < 50 else 4 if bar < 57 else 0
    if s == "emerge": return 0 if bar < 61 else 5 if bar < 67 else 0
    if s == "mandel": return 0
    if s == "drop": return 3
    if s == "learn": return 1 if bar < 112 else 2 if bar < 116 else 3 if bar < 122 else 0
    if s == "montage": return 3 if bar < 134 else 0
    return 0
for bar in range(BARS):
    lvl = drum_level(bar); t0 = bar * BAR
    if lvl == 0: continue
    for b in range(4):
        tb = t0 + b * BEAT
        if lvl == 4:   # half-time
            if b == 0: put("dry", tb, KICK, 0.75); EV["kicks"].append(tb)
            if b == 2: put("dry", tb, SNARE, 0.32); put("dry", tb, CLAP, 0.18); put("rev", tb, SNARE, 0.22); EV["snares"].append(tb)
            for s16 in (0, 2): put("dry", tb + s16 * BEAT / 4, HAT, 0.05 + 0.02 * (s16 == 0), 0.3)
            continue
        if lvl == 5:   # syncopated organic groove
            for kt in ([0.0, 0.75] if b == 0 else [0.5] if b == 2 else []):
                put("dry", tb + kt * BEAT, KICK, 0.72); EV["kicks"].append(tb + kt * BEAT)
            if b in (1, 3): put("dry", tb, CLAP, 0.3); put("rev", tb, CLAP, 0.15); EV["snares"].append(tb)
            for s16 in range(4):
                put("dry", tb + s16 * BEAT / 4, HAT, 0.035 + 0.03 * (s16 == 2), -0.4 + 0.25 * s16)
            continue
        if lvl >= 1 and (b in (0, 2) or lvl >= 3):
            put("dry", tb, KICK, 0.8); EV["kicks"].append(tb)
        if lvl >= 2 and b in (1, 3):
            put("dry", tb, SNARE, 0.4); put("dry", tb, CLAP, 0.12); put("rev", tb, SNARE, 0.16); EV["snares"].append(tb)
        if lvl >= 1:
            put("dry", tb + BEAT / 2, OHAT if lvl >= 2 else HAT, 0.07 if lvl >= 2 else 0.06, 0.25)
        if lvl >= 3:
            for s16 in (0, 1, 3):
                put("dry", tb + s16 * BEAT / 4, HAT, 0.045 + 0.02 * (s16 == 0), -0.3); EV["hats"].append(tb + s16 * BEAT / 4)
    if (bar + 1) * BAR in TL["impacts"] and lvl >= 2:   # fills
        for s in range(8):
            ts = t0 + 2 * BEAT + s * BEAT / 4
            put("dry", ts, TOMS[s // 2], 0.42, -0.5 + s / 7); put("rev", ts, TOMS[s // 2], 0.1)

def snare_roll(t0, t1, g=0.45):
    t = t0
    while t < t1 - 1e-6:
        fr = (t - t0) / (t1 - t0)
        put("dry", t, SNARE, 0.08 + g * fr ** 1.6); put("rev", t, SNARE, 0.06 * fr); EV["snares"].append(t)
        t += BEAT / 2 if fr < 0.25 else BEAT / 4 if fr < 0.6 else BEAT / 8 if fr < 0.88 else BEAT / 16
for a, b in [(26, 28), (58, 60), (88, 90), (116, 118), (144, 146), (176, 179.5), (208, 212), (248, 250), (266, 271.5)]:
    snare_roll(a, b)
def taiko_pat(bar0, bars, dens=1):
    for bar in range(bar0, bar0 + bars):
        t0 = bar * BAR
        hits = [0, 2] if dens == 1 else [0, 1, 2, 3] if dens == 2 else [0, 0.75, 1.5, 2, 2.5, 3, 3.5]
        for k, b in enumerate(hits):
            tb = t0 + b * BEAT; tk = TAIKO[0] if b in (0, 2) else TAIKO[1 + k % 2]
            put("dry", tb, tk, 0.5, -0.2 + 0.4 * (k % 2)); put("rev", tb, tk, 0.25); EV["taiko"].append(tb)
taiko_pat(10, 4, 1); taiko_pat(22, 2, 2); taiko_pat(84, 2, 1); taiko_pat(86, 2, 2); taiko_pat(88, 1, 3)
taiko_pat(92, 2, 2); taiko_pat(125, 8, 1); taiko_pat(133, 2, 3)

# ------------------------------------------------------------------ impacts, risers
BIG = {20: 1.0, 28: 0.8, 36: 0.5, 44: 0.8, 60: 0.8, 68: 0.6, 90: 0.6, 100: 0.5, 118: 0.7, 134: 0.45, 146: 0.8, 156: 0.6,
       180: 1.25, 184: 1.15, 212: 0.8, 224: 0.6, 250: 1.15, 272: 0.6, 288: 1.0}
for t, g in BIG.items():
    impact(t, g, root="D1", braam_on=g >= 0.75)
    if g >= 0.6: reverse_crash(t, 2.0 if g >= 1 else 1.0, 0.3 * g)
for a, b in [(16, 20), (26, 28), (42, 44), (56, 60), (86, 90), (98, 100), (114, 118), (144, 146), (154, 156), (176, 179.6),
             (206, 212), (220, 224), (246, 250), (266, 271.6), (284, 288)]:
    riser(a, b, 0.24)

# ------------------------------------------------------------------ pads / choir / bass per section
def pad_params(bar):
    s = section(bar)
    return {"pro": (0.11 + bar * 0.012, 1200 + bar * 120), "title": (0.24, 3600), "sort": (0.19, 2600 + (bar - 14) * 120),
            "search": (0.17, 2400), "fourier": (0.22, 3400), "emerge": (0.17, 2300), "tree": (0.16, 1800), "mandel": (0.13, 1500),
            "drop": (0.24, 5200), "learn": (0.18, 3000), "montage": (0.25, 5600), "finale": (0.17, 2400)}[s]
for bar in range(BARS):
    name = PROG[bar]; g, cut = pad_params(bar)
    if bar >= 146: g *= max(0.0, (150 - bar) / 4)
    if section(bar) == "mandel" and bar < 90: g *= 0.7
    att = 1.2 if section(bar) in ("pro", "mandel", "finale", "tree") else 0.25
    pad_chord(bar * BAR, name, BAR, g, cut, att=att, rel=1.6 if bar < 146 else 3.0)
for bar in list(range(78, 90)):  # choir for the dive
    choir(bar * BAR, PROG[bar], BAR, 0.11 + 0.008 * (bar - 78), att=0.9)
choir(180.0, "D", 4.0, 0.28, att=0.05, rel=4.0)
choir(20.0, "Dm", 4.0, 0.12, att=0.4); choir(250.0, "Dm", 8.0, 0.13, att=0.6); choir(258.0, "F", 8.0, 0.13, att=0.6)
choir(288.0, "D", 8.0, 0.2, att=0.08, rel=5.0)

def bass_line(bar):
    s = section(bar); lvl = drum_level(bar)
    if s in ("pro", "tree", "mandel") and bar not in (90, 91): return "sub"
    if s == "fourier" and bar < 50: return "sub"
    if s == "finale": return "sub"
    if lvl == 0: return "sub"
    return "roll" if lvl >= 3 else "off"
for bar in range(BARS):
    _, root = CH[PROG[bar]]; t0 = bar * BAR; f = mtof(nm(root)); f = f / 2 if f > 75 else f
    n = S(BAR + 0.3); sub = np.sin(2 * np.pi * f * tt(n)) * env_adsr(n, 0.03, 0.1, 0.9, 0.3, BAR)
    sg = 0.16 if bar >= 10 else 0.09 + 0.006 * bar
    if bar >= 146: sg *= (150 - bar) / 4
    put("duck", t0, sub, sg)
    mode = bass_line(bar)
    if mode in ("off", "roll"):
        for e in range(8 if mode == "off" else 16):
            if mode == "off" and e % 2 == 0: continue
            te = t0 + e * BEAT / (2 if mode == "off" else 4)
            n2 = S(BEAT / 4 if mode == "roll" else BEAT / 2); t = tt(n2)
            v = lp((saw(f * 2, n2) + saw(f * 2.006, n2)) * 0.5, 850) * np.exp(-t * (14 if mode == "roll" else 9)) * np.minimum(1, t / 0.004)
            put("duck", te, v, 0.15 if mode == "off" else 0.12)

# strings ostinato
for bar in list(range(12, 14)) + list(range(22, 30)) + list(range(92, 106)) + list(range(125, 136)):
    strings_ost(bar * BAR, PROG[bar], 0.045 if bar < 92 else 0.05)

# ------------------------------------------------------------------ PROLOGUE
for bar in range(0, 10):
    notes, root = CH[PROG[bar]]; ms = sorted(set([nm(s) for s in notes]))
    pat = [ms[0] - 12, ms[1], ms[2], ms[3], ms[4], ms[3], ms[2], ms[1]]
    for k in range(8):
        if bar < 2 and k % 2: continue
        piano(bar * BAR + k * BEAT / 2, pat[k], 0.45 if k else 0.6, 1.4, -0.3 + 0.08 * k)
EU = TL["euclid"]
EUCLID_NOTES = ["D3", "A3", "D4", "F4", "A4", "D5", "E5", "F5", "G5", "A5", "C6", "D6"]
for t, s in zip(EU["times"], EUCLID_NOTES):
    m = nm(s); bell(t, m, 0.13, 0.0, dec=1.4, ratio=2.0, idx=1.2); piano(t, m, 0.75, 2.0, 0.0)
    EV["plucks"].append([t, m])
bell(12.5, nm("D6"), 0.1, -0.3, 1.0); bell(12.5, nm("A6"), 0.08, 0.3, 1.0)
piano(18.0, nm("A2"), 0.7, 2.5); piano(18.0, nm("E3"), 0.6, 2.5); piano(18.0, nm("C#4"), 0.6, 2.5)
# drone
n = S(20.5); t = tt(n)
dr = (np.sin(2 * np.pi * 36.71 * t) + 0.5 * np.sin(2 * np.pi * 73.42 * t + 1)) * np.clip(t / 4, 0, 1) * (1 - np.clip((t - 19.6) / 0.9, 0, 1))
put("dry", 0, dr, 0.14)

# ------------------------------------------------------------------ SORTING sonification
PENTA = [nm(s) for s in ["D4", "F4", "G4", "A4", "C5", "D5", "F5", "G5", "A5", "C6", "D6", "F6", "G6", "A6", "C7"]]
def val2note(v, vmax): return PENTA[min(len(PENTA) - 1, int((v - 1) / vmax * len(PENTA)))]
arr = list(QS["arr"]); rate = QS["rate"]; t0q = QS["t0"]
for k, (ty, a, b) in enumerate(QS["ops"]):
    t = t0q + k / rate
    if ty == 0:
        blip(t, mtof(val2note(arr[a], 64)), 0.028, (a / 32 - 1) * 0.6, 0.03)
    else:
        arr[a], arr[b] = arr[b], arr[a]
        blip(t, mtof(val2note(arr[a], 64)), 0.05, (a / 32 - 1) * 0.6, 0.06)
        blip(t + 0.004, mtof(val2note(arr[b], 64)), 0.04, (b / 32 - 1) * 0.6, 0.06)
for k, (op0, lo, hi) in enumerate(QS["marks"]):    # partition boundaries: soft plucks
    pluck(t0q + op0 / rate, val2note(QS["arr"][hi] if hi < 64 else 32, 64) - 12, 0.04, 0.0, 9.0)
for l, s in zip(RACE["lanes"], ["A6", "F6", "D6", "C6", "A5", "F5"][::-1]):
    bell(l["finish"], nm(s), 0.11, 0.0, 2.2, 3.5, 2.0); EV["dings"].append(round(l["finish"], 4))
for k in range(int((RACE["lanes"][0]["finish"] - RACE["t0"]) * 8)):   # processing ticks
    tk = RACE["t0"] + k / 8; put("son", tk, HAT, 0.05, 0.4 * math.sin(k)); EV["ticks"].append(tk)
W_ = J["WHEEL"]
for k, tp in enumerate(W_["passT"]):
    n = S(0.45); x = sweep_lp(rng.standard_normal(n), lambda s: 400 + 9000 * (s / 0.45) ** 1.5) * np.sin(np.linspace(0, np.pi, n)) ** 2
    put("dry", tp - 0.2, x, 0.09, -0.4 + 0.12 * k); put("rev", tp - 0.2, x, 0.06); EV["whoosh"].append(tp)
    for j, s in enumerate(CH[chord_at(tp)][0][:3]): pluck(tp, nm(s) + 12 + (k // 3) * 12, 0.05, -0.3 + 0.3 * j, 5.0)
for j, s in enumerate(["D5", "F5", "A5", "D6", "F6"]): bell(49.0 + j * 0.06, nm(s), 0.07, -0.4 + 0.2 * j, 1.5)

# arps
def arp(bar0, bars, g=0.045, cut=3000, rate_=4, octs=(12,), pat=(0, 2, 4, 2, 1, 3, 4, 3)):
    for bar in range(bar0, bar0 + bars):
        notes, _ = CH[PROG[bar]]; ms = [nm(s) for s in notes]
        for s in range(4 * rate_):
            ts = bar * BAR + s * BEAT / rate_; m = ms[pat[s % len(pat)]] + octs[(s // len(pat)) % len(octs)]
            pluck(ts, m, g * (1.0 if s % 4 == 0 else 0.75), 0.5 * math.sin(s * math.pi / 4), 15.0, "duck", cut)
            for k in (1, 2): pluck(ts + 0.375 * k, m, g * 0.4 ** k, -0.5 * math.sin(s * math.pi / 4), 15.0, "duck", cut)
            EV["arps"].append(round(ts, 4))
arp(24, 6, 0.04, 3600); arp(34, 9, 0.042, 3000); arp(50, 7, 0.04, 4200, octs=(12, 24)); arp(63, 4, 0.035, 2600)
arp(96, 10, 0.035, 5000); arp(112, 10, 0.04, 3800); arp(127, 7, 0.035, 5200)

# ------------------------------------------------------------------ SEARCH: binary search pings, maze ticks
scale = [nm(s) for s in ["D4", "E4", "F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5", "G5", "A5", "Bb5", "C6", "D6", "E6", "F6", "G6", "A6"]]
pos = 9
for k, (lo, hi, mid, d) in enumerate(BS["steps"]):
    tb = BS["t0"] + k * BS["step"]
    bell(tb, scale[pos], 0.085, 0.5 if d > 0 else -0.5 if d < 0 else 0, 3.5, 2.0, 1.0)
    EV["pings"].append([round(tb, 4), d])
    pos = max(0, min(len(scale) - 1, pos + (1 if d > 0 else -1)))
tf = BS["t0"] + len(BS["steps"]) * BS["step"]
for j, s in enumerate(["D5", "F#5", "A5", "D6"]): bell(tf + 0.02 * j, nm(s), 0.09, -0.3 + 0.2 * j, 1.2)
MZ = TL["search"]["maze"]
for k in range(int((MZ["carve1"] - MZ["t0"]) * 8)):
    tk = MZ["t0"] + k / 8
    blip(tk, mtof(scale[(k * 5) % 12] + 12), 0.03, 0.5 * math.sin(k * 0.7), 0.025); EV["ticks"].append(tk)
for j, s in enumerate(["D5", "A5", "D6", "F6", "A6"]): bell(MZ["flood1"] + 0.05 * j, nm(s), 0.08, -0.4 + 0.2 * j, 1.0)
bell(MZ["path1"], nm("D6"), 0.07, 0, 1.0)
n = S(6.0); x = sweep_lp(rng.standard_normal(n), lambda s: 600 + 5000 * (s / 6)) * np.sin(np.linspace(0, np.pi, n)) * 0.5
put("dry", MZ["carve1"], x, 0.05, -0.3); put("dry", MZ["carve1"] + 0.02, x, 0.05, 0.3); put("rev", MZ["carve1"], x, 0.06)

# ------------------------------------------------------------------ FOURIER: audible harmonic stacking
FO = TL["fourier"]; f0 = mtof(nm("D3"))
n = S(FO["draw0"] - FO["harm0"] + 1.5); t = tt(n); tone = np.zeros(n)
for h in range(1, 200, 2):
    if f0 * h > SR * 0.45: break
    k = (h - 1) // 2
    if k < FO["nHarm"]: on = FO["harm0"] + k * FO["harmStep"] - FO["harm0"]
    else: on = (FO["sweep0"] - FO["harm0"]) + (FO["sweep1"] - FO["sweep0"]) * ((k - FO["nHarm"]) / 45) ** 0.7
    g = np.clip((t - on) / 0.04, 0, 1) * (4 / math.pi / h)
    tone += g * np.sin(2 * np.pi * f0 * h * t)
fade = np.clip(1 - (t - (FO["draw0"] - FO["harm0"] - 1.0)) / 2.0, 0, 1)
tone = lp(tone * fade * np.minimum(1, t / 0.01), 9000)
put("dry", FO["harm0"], tone, 0.07, 0.0); put("rev", FO["harm0"], tone, 0.03)
for k in range(FO["nHarm"]): EV["ticks"].append(FO["harm0"] + k * FO["harmStep"])
for j, s in enumerate(["F5", "A5", "C6", "E6", "A6"]): bell(FO["draw1"] + j * 0.08, nm(s), 0.07, -0.4 + 0.2 * j, 1.0)

# ------------------------------------------------------------------ EMERGENCE: flock of plucks, Turing grains
EM = TL["emerge"]
for k in range(int((EM["boids1"] - EM["boids0"]) * 8)):
    tk = EM["boids0"] + k / 8; dens = min(1.0, 0.25 + k / 90)
    for j in range(1 + int(rng.random() * 3 * dens)):
        if rng.random() > dens: continue
        ms = [nm(s) for s in CH[chord_at(tk)][0]]
        m = int(rng.choice(ms)) + 12 * int(rng.integers(0, 2))
        bell(tk + rng.random() * 0.02, m, 0.025, float(rng.uniform(-0.8, 0.8)), 6.0, 1.0, 0.6, "duck", 0.6)
for k in range(int((EM["t1"] - EM["turing0"]) * 6)):
    tk = EM["turing0"] + k / 6 + rng.random() * 0.05
    m = int(rng.choice([nm(s) for s in CH[chord_at(tk)][0]])) + 12
    n = S(0.6); t = tt(n); x = np.sin(2 * np.pi * mtof(m) * t + 0.8 * np.sin(2 * np.pi * mtof(m) * 2 * t)) * np.sin(np.pi * t / 0.6) ** 2
    put("duck", tk, x, 0.02, float(rng.uniform(-0.7, 0.7))); put("rev", tk, x, 0.03)
for k in range(int((EM["t1"] - EM["turing0"]) / 1.0)):   # heartbeat
    tk = EM["turing0"] + k * 1.0; put("dry", tk, KICK, 0.3); put("dry", tk + 0.22, KICK, 0.18)

# ------------------------------------------------------------------ RECURSION: tree notes, Mandelbrot Shepard–Risset rise
TR = TL["tree"]
tree_scale = [nm(s) for s in ["D4", "E4", "F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5", "G5", "A5"]]
for d in range(1, TR["depth"] + 1):
    tk = TR["lvl0"] + (d - 1) * TR["lvlStep"]; m = tree_scale[d - 1]
    piano(tk, m, 0.75, 1.6, 0.0); bell(tk, m + 12, 0.05, 0.0, 2.0)
    for g_ in range(min(2 ** (d - 1), 16)):
        bell(tk + 0.03 + g_ * 0.025, m + 12 + [0, 7, 12, 19][g_ % 4], 0.012, float(rng.uniform(-0.8, 0.8)), 5.0, 1.0, 0.5)
    EV["tree"].append(round(tk, 4))
MD = TL["mandel"]
t_a, t_b = MD["reveal1"] - 2.0, MD["zoom1"]
n = S(t_b - t_a); t = tt(n); shep = np.zeros(n); NOCT = 9; base = 27.5; rate_oct = 0.28
for k in range(NOCT):
    pos_ = (k + rate_oct * t) % NOCT
    f = base * 2 ** pos_
    amp = np.exp(-((pos_ - NOCT / 2) / 1.5) ** 2 / 2)
    ph = np.cumsum(f) / SR
    shep += amp * np.sin(2 * np.pi * ph) + 0.35 * amp * np.sin(2 * np.pi * ph * 3 / 2 * 2 ** 0)   # octave + fifth stack
envs = np.clip(t / 3, 0, 1) ** 1.5 * (0.6 + 0.4 * t / t[-1])
shep = lp(shep * envs, 6000)
put("dry", t_a, shep, 0.045, -0.2); put("dry", t_a + 0.017, shep, 0.045, 0.2); put("rev", t_a, shep, 0.05)
for k in range(int((MD["zoom1"] - MD["t0"]) / 1.0)):   # heartbeat under the dive
    tk = MD["t0"] + k * 1.0
    if tk >= 179.5: break
    put("dry", tk, KICK, 0.22 + 0.25 * k / 24); put("dry", tk + 0.24, KICK, 0.12 + 0.15 * k / 24)
for j, s in enumerate(["D5", "F#5", "A5", "D6", "F#6", "A6"]): bell(180.0 + 0.05 * j, nm(s), 0.08, -0.5 + 0.2 * j, 0.7)
# silence before the reveal: carve a gap in everything except reverb tails
gap0, gap1 = S(179.5), S(180.0)
ramp = np.linspace(1, 0, S(0.04))
for k in ("dry", "duck", "son"):
    for c in (0, 1):
        B[k][c, gap0:gap0 + len(ramp)] *= ramp; B[k][c, gap0 + len(ramp):gap1] = 0

# ------------------------------------------------------------------ OPTIMIZATION: the drop + lead theme
theme(93, 8, 0.11)
theme(101, 4, 0.1, oct2=True, start=4)
TS = TL["tsp"]
n = S(TS["sa1"] - TS["sa0"]); T_ = tt(n)
anneal = sweep_lp(rng.standard_normal(n), lambda s: 9000 * math.exp(-s / 5.0) + 200) * (0.5 + 0.5 * np.exp(-T_ / 6))
put("dry", TS["sa0"], anneal, 0.03, -0.3); put("dry", TS["sa0"] + 0.02, anneal, 0.03, 0.3)

# ------------------------------------------------------------------ LEARNING: descending glides, epoch ticks, meta breakdown
LE = TL["learn"]
for bar in range(106, 112):
    t0 = bar * BAR; _, root = CH[PROG[bar]]; f1 = mtof(nm(root) + 24); f2 = f1 / 2 ** (5 / 12)
    n = S(BAR); t = tt(n); f = f1 * (f2 / f1) ** (t / BAR)
    x = lp(sum(np.sign(np.sin(2 * np.pi * np.cumsum(f * 2 ** (d / 12)) / SR)) for d in (-0.1, 0.1)) * 0.5, 1200) * env_adsr(n, 0.05, 0.3, 0.7, 0.3, BAR - 0.3)
    put("duck", t0, x, 0.05); put("rev", t0, x, 0.04)
for k in range(int((LE["train1"] - LE["train0"]) * 4)):
    tk = LE["train0"] + k / 4; blip(tk, mtof(nm("A6") + (k % 4) * 2), 0.018, 0.5 * math.sin(k), 0.02); EV["ticks"].append(tk)
for j, s in enumerate(["D6", "F6", "A6"]): bell(LE["train1"] + j * 0.05, nm(s), 0.07, -0.3 + 0.3 * j, 1.2)
for k, m in enumerate(["D5", "A4", "F5", "E5", "D5", "A4", "C5", "A4"]):
    piano(LE["meta0"] + k * 0.5, nm(m), 0.55, 1.5, 0.0)

# ------------------------------------------------------------------ MONTAGE + FINALE
theme(125, 8, 0.12, oct2=True)
for b, s in [(133, "D6"), (134, "E6")]: lead_note(b * BAR, nm(s), 1.9, 0.11, True)
lead_note(135 * BAR, nm("C#6"), 1.4, 0.1, True)
for bar in range(136, 144):
    notes, root = CH[PROG[bar]]; ms = sorted(set(nm(s) for s in notes))
    for k in range(8):
        if k % 2 and bar >= 142: continue
        piano(bar * BAR + k * BEAT / 2, [ms[0] - 12, ms[1], ms[2], ms[3]][k % 4] + (0 if k < 4 else 12), 0.4, 1.4, -0.25 + 0.07 * k)
theme(136, 4, piano_=True, transpose=0)
for s in ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4", "D5"]: piano(288.0, nm(s), 0.8, 6.5, 0.0)
for j, s in enumerate(EUCLID_NOTES):
    bell(290.0 + j * 0.25, nm(s.replace("F", "F#")) + 12 if s.startswith("F") else nm(s) + 12, 0.035, -0.6 + j * 0.1, 1.5, 2.0, 1.0)

# ------------------------------------------------------------------ sidechain, reverb, master
kicks = np.array(sorted(set(EV["kicks"] + [float(x) for x in TL["impacts"]])))
tgrid = np.arange(N) / SR
idx = np.searchsorted(kicks, tgrid, side="right") - 1
since = np.where(idx >= 0, tgrid - kicks[np.clip(idx, 0, None)], 10)
duck = 1 - 0.6 * np.exp(-since / 0.12)
B["duck"] *= duck
ir_n = S(3.6); it = tt(ir_n)
pre = S(0.022)
def ir(seed):
    r = np.random.default_rng(seed); x = lp(r.standard_normal(ir_n), 7000) * np.exp(-it * 1.9)
    x[:pre] = 0
    for k in range(10): x[pre + int(r.integers(0, S(0.08)))] += r.uniform(0.3, 0.8) * (1 - k / 12)
    return x / np.sqrt((x ** 2).sum())
irL, irR = ir(1), ir(2)
send = B["rev"] + B["duck"] * 0.12 + B["son"] * 0.2
wetL = fftconvolve(send[0], irL)[:N]; wetR = fftconvolve(send[1], irR)[:N]
mix = B["dry"] + B["duck"] + B["son"] + np.stack([wetL, wetR]) * 0.55
mix = np.stack([hp(mix[0], 28), hp(mix[1], 28)])
mix = mix - 0.35 * np.stack([hp(mix[0], 8500), hp(mix[1], 8500)])   # soft high shelf
mix = mix + 0.18 * np.stack([bp(mix[0], 220, 900), bp(mix[1], 220, 900)])   # a little body
# gentle glue compression (RMS envelope)
env = np.sqrt(lp(mix.mean(0) ** 2, 8) + 1e-9)
thr = np.percentile(env, 92); gr_ = np.minimum(1, (thr / np.maximum(env, 1e-9)) ** 0.35)
mix *= gr_
Ntot = int(DUR * SR); mix = mix[:, :Ntot]
fo = S(5.5); mix[:, -fo:] *= np.linspace(1, 0, fo) ** 2
mix /= np.abs(mix).max()
drive = 2.2; mix = np.tanh(mix * drive) / math.tanh(drive)
mix *= 0.94 / np.abs(mix).max()
wavfile.write(os.path.join(ROOT, "build", "score.wav"), SR, (mix.T * 32767).astype(np.int16))

for k in ("kicks", "snares", "hats", "taiko", "arps", "dings", "ticks", "whoosh", "tree"):
    EV[k] = sorted(set(round(float(x), 4) for x in EV[k]))
with open(os.path.join(ROOT, "src", "events.js"), "w") as f:
    f.write("// generated by tools/compose.py — exact musical event times (seconds)\n")
    f.write("window.EVENTS = " + json.dumps(EV, separators=(",", ":")) + ";\n")
print("ok", {k: (len(v) if isinstance(v, list) else v) for k, v in EV.items()})
