// ============================================================================
//  THE BEAUTY OF ALGORITHMS — film engine
//  Every frame is a pure function of time: AF.render(ctx, t).
//  The same code drives the live player and the frame-exact MP4 export.
// ============================================================================
(function () {
  const W = 1920, H = 1080, DUR = 300, FPS = 30;
  const AF = (window.AF = { W, H, DUR, FPS, scenes: [], cache: {} });
  const E = window.EVENTS, TL = window.TL;

  // ------------------------------------------------------------ math
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (x) => x * x * (3 - 2 * x);
  const ease = {
    io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    out: (x) => 1 - Math.pow(1 - x, 3), in: (x) => x * x * x,
    out2: (x) => 1 - (1 - x) * (1 - x), in2: (x) => x * x,
    sine: (x) => (1 - Math.cos(Math.PI * x)) / 2,
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    ioExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
    outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hash1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = smooth(xf), v = smooth(yf);
    return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v) * 2 - 1;
  }
  const fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); a *= 0.5; f *= 2.03; } return s; };

  // ------------------------------------------------------------ musical time
  function lastIdx(arr, t) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
  const pulse = (arr, t, decay = 0.18) => { const i = lastIdx(arr, t); return i < 0 ? 0 : Math.exp(-(t - arr[i]) / decay); };
  const since = (arr, t) => { const i = lastIdx(arr, t); return i < 0 ? 1e9 : t - arr[i]; };
  const IMP = TL.impacts;

  // ------------------------------------------------------------ the real spectrum of the score
  const b64u8 = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const SPx = window.SPECTRUM, SPEC = b64u8(SPx.spec), NRG = b64u8(SPx.energy), NB = SPx.bands;
  function spec(t, b) {
    const f = clamp(t * SPx.fps, 0, SPx.frames - 1.001), i = Math.floor(f), u = f - i;
    return lerp(SPEC[i * NB + b], SPEC[(i + 1) * NB + b], u) / 255;
  }
  function energy(t) { const f = clamp(t * SPx.fps, 0, SPx.frames - 1.001), i = Math.floor(f); return lerp(NRG[i], NRG[i + 1], f - i) / 255; }

  // ------------------------------------------------------------ palette & type
  const C = {
    bg: "#03040a", ink: "#f4f1e8", dim: "#8e96b8", gold: "#f6c770", amber: "#ffad4a", cyan: "#69e6ff", teal: "#3fd4c0",
    blue: "#4f7dff", violet: "#9a7cff", magenta: "#ff5ea8", rose: "#ff7d8c", lime: "#bfff6e", white: "#ffffff", ice: "#cfeaff",
  };
  const F = {
    serif: '"Noto Serif SC","Noto Serif CJK SC",serif',
    sans: '"Noto Sans SC","Noto Sans CJK SC",sans-serif',
    lm: '"LMRoman","Latin Modern Roman","STIX Two Text","Latin Modern Math",serif',
    math: '"LMRoman","Latin Modern Roman","Latin Modern Math","STIX Two Text",serif',
    mono: '"LMMono","Latin Modern Mono","JetBrains Mono","DejaVu Sans Mono",monospace',
    ui: '"Inter","Noto Sans SC","Noto Sans CJK SC",sans-serif',
  };
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function mix(h1, h2, t) {
    const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    const r = Math.round(lerp(a >> 16, b >> 16, t)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t)), bl = Math.round(lerp(a & 255, b & 255, t));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function hsl(h, s, l, a = 1) { return `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`; }
  // perceptually pleasant spectral ramp (used by sorting, maze, spectrum)
  const RAMP = ["#ff4d6d", "#ff8c42", "#ffd166", "#b8f35a", "#3fe0a8", "#3fc8ff", "#5a7dff", "#a77bff", "#ff5ec8", "#ff4d6d"];
  const RAMP_RGB = RAMP.map((h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
  function rampRGB(u) {
    u = ((u % 1) + 1) % 1; const f = u * (RAMP.length - 1), i = Math.floor(f), v = f - i, a = RAMP_RGB[i], b = RAMP_RGB[i + 1];
    return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, a[2] + (b[2] - a[2]) * v];
  }
  const ramp = (u, a = 1) => { const c = rampRGB(u); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };

  // ------------------------------------------------------------ canvases & sprites
  function mkCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  const spriteCache = {};
  function glowSprite(color) {
    const k = "g" + color; if (spriteCache[k]) return spriteCache[k];
    const s = 128, c = mkCanvas(s, s), g = c.getContext("2d"), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, hexA(color, 1)); gr.addColorStop(0.16, hexA(color, 0.55)); gr.addColorStop(0.42, hexA(color, 0.13)); gr.addColorStop(1, hexA(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, s, s); return (spriteCache[k] = c);
  }
  function streakSprite(color) {
    const k = "s" + color; if (spriteCache[k]) return spriteCache[k];
    const c = mkCanvas(512, 32), g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 512, 0);
    gr.addColorStop(0, hexA(color, 0)); gr.addColorStop(0.5, hexA(color, 1)); gr.addColorStop(1, hexA(color, 0));
    g.fillStyle = gr; const v = g.createLinearGradient(0, 0, 0, 32);
    g.fillRect(0, 14, 512, 4); g.globalAlpha = 0.35; g.fillRect(0, 10, 512, 12);
    return (spriteCache[k] = c);
  }
  function glow(ctx, x, y, r, color, a = 1) {
    if (a <= 0.003 || r <= 0.5) return;
    const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = ga * Math.min(1, a);
    ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = op; ctx.globalAlpha = ga;
  }
  function streak(ctx, x, y, len, color, a = 1, th = 1) {
    if (a <= 0.003) return;
    const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = ga * Math.min(1, a);
    ctx.drawImage(streakSprite(color), x - len / 2, y - 16 * th, len, 32 * th);
    ctx.globalCompositeOperation = op; ctx.globalAlpha = ga;
  }

  // ------------------------------------------------------------ text
  function text(ctx, s, x, y, { size = 32, weight = 400, font = F.ui, color = C.ink, align = "center", base = "middle", alpha = 1, ls = 0, stroke = 0, italic = false, shadow = 0, shadowColor = "rgba(0,0,0,.85)" } = {}) {
    if (alpha <= 0.003 || !s) return 0;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.font = `${italic ? "italic " : ""}${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = base;
    ctx.letterSpacing = ls + "px";
    if (shadow) { ctx.shadowColor = shadowColor; ctx.shadowBlur = shadow; }
    if (stroke) { ctx.strokeStyle = color; ctx.lineWidth = stroke; ctx.strokeText(s, x, y); }
    else { ctx.fillStyle = color; ctx.fillText(s, x, y); }
    const w = ctx.measureText(s).width; ctx.restore(); return w;
  }
  const SCR = "01ABCDEFGHJKLMNPQRSTUVWXYZ#%&<>/\\{}[]*+=?";
  function decode(str, p, seed = 1) {
    let out = "";
    for (let i = 0; i < str.length; i++) {
      const ch = str[i]; if (ch === " ") { out += " "; continue; }
      const th = (i + 1) / (str.length + 1);
      if (p >= th * 0.8 + 0.2) out += ch;
      else if (p > th * 0.55) out += SCR[Math.floor(hash1(i * 13 + seed + Math.floor(p * 40)) * SCR.length)];
    }
    return out;
  }
  // --- tiny TeX-like math setter: ^{..} _{..}, italic variables, upright functions/digits
  const FUNCS = new Set(["log", "mod", "gcd", "exp", "sin", "cos", "max", "min", "if", "then"]);
  function parseMath(s) {
    const out = [];
    const push = (str, lv) => {
      let j = 0;
      while (j < str.length) {
        const ch = str[j];
        if (/[A-Za-z]/.test(ch)) {
          let k = j; while (k < str.length && /[A-Za-z]/.test(str[k])) k++;
          const w = str.slice(j, k);
          if (FUNCS.has(w) || w.length > 3) out.push({ t: w, it: false, lv }); else for (const c of w) out.push({ t: c, it: true, lv });
          j = k;
        } else if (/[α-ωθηλ]/.test(ch)) { out.push({ t: ch, it: true, lv }); j++; }
        else { out.push({ t: ch, it: false, lv }); j++; }
      }
    };
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === "^" || ch === "_") {
        const lv = ch === "^" ? 1 : -1; i++; let arg;
        if (s[i] === "{") { let d = 1, k = i + 1; while (k < s.length && d) { if (s[k] === "{") d++; else if (s[k] === "}") d--; k++; } arg = s.slice(i + 1, k - 1); i = k; }
        else { arg = s[i]; i++; }
        push(arg, lv); continue;
      }
      let k = i; while (k < s.length && s[k] !== "^" && s[k] !== "_") k++;
      push(s.slice(i, k), 0); i = k;
    }
    return out;
  }
  function mathText(ctx, s, x, y, { size = 40, color = C.ink, align = "center", alpha = 1, weight = 400 } = {}) {
    if (alpha <= 0.003) return 0;
    const toks = parseMath(s), ws = [];
    let w = 0;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.letterSpacing = "0px";
    for (const tk of toks) {
      const sz = tk.lv ? size * 0.68 : size;
      ctx.font = `${tk.it ? "italic " : ""}${weight} ${sz}px ${F.math}`;
      let tw = tk.t === " " ? size * 0.26 : ctx.measureText(tk.t).width;
      if (tk.it && !tk.lv) tw += size * 0.02;
      ws.push(tw); w += tw;
    }
    let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const by = y + size * 0.33;
    toks.forEach((tk, i) => {
      const sz = tk.lv ? size * 0.68 : size;
      ctx.font = `${tk.it ? "italic " : ""}${weight} ${sz}px ${F.math}`;
      if (tk.t !== " ") ctx.fillText(tk.t, cx, by - (tk.lv === 1 ? size * 0.4 : tk.lv === -1 ? -size * 0.17 : 0));
      cx += ws[i];
    });
    ctx.restore(); return w;
  }

  // ------------------------------------------------------------ vector helpers
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function line(ctx, pts, color, a = 1, lw = 2, glowW = 0) {
    if (a <= 0.003 || pts.length < 2) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (glowW) { ctx.strokeStyle = hexA(color, 0.22); ctx.lineWidth = lw * glowW; ctx.stroke(); }
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
    ctx.restore();
  }
  function ring(ctx, x, y, r, color, a = 1, lw = 2) {
    if (a <= 0.003 || r <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke(); ctx.restore();
  }
  function dot(ctx, x, y, r, color, a = 1) { if (a <= 0.003) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
  function cam3({ tx = 0, ty = 0, tz = 0, yaw = 0, pitch = 0, roll = 0, dist = 1200, fov = 1100, cx = W / 2, cy = H / 2 }) {
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    return (x, y, z) => {
      x -= tx; y -= ty; z -= tz;
      const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const x2 = x1 * cr - y1 * sr, y2 = x1 * sr + y1 * cr, zz = z2 + dist;
      if (zz < 5) return null; const s = fov / zz; return { x: cx + x2 * s, y: cy + y2 * s, s, z: zz };
    };
  }
  // keyframes: [[t, {k:v}, easeFn?], ...]
  function kf(lt, keys) {
    if (lt <= keys[0][0]) return { ...keys[0][1] };
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, a] = keys[i], [t1, b, fn] = keys[i + 1];
      if (lt < t1) { const p = (fn || ease.io)(prog(lt, t0, t1)); const o = { ...a }; for (const k in b) o[k] = lerp(a[k] ?? b[k], b[k], p); return o; }
    }
    return { ...keys[keys.length - 1][1] };
  }

  // ------------------------------------------------------------ backgrounds
  const STARS = (() => { const r = rng(77), a = []; for (let i = 0; i < 700; i++) a.push([r(), r(), 0.15 + r() * 0.85, r()]); return a; })();
  function stars(ctx, t, { a = 1, drift = 6, dy = 0, color = "#c9d6ff", scale = 1 } = {}) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [sx, sy, z, ph] of STARS) {
      let x = (sx * W * 1.2 + t * drift * z) % (W * 1.2); if (x < 0) x += W * 1.2; x -= W * 0.1;
      let y = (sy * H * 1.2 + dy * z) % (H * 1.2); if (y < 0) y += H * 1.2; y -= H * 0.1;
      x = W / 2 + (x - W / 2) * scale; y = H / 2 + (y - H / 2) * scale;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.8 + ph * 2.5) + ph * 40);
      ctx.globalAlpha = a * z * 0.75 * tw; ctx.fillStyle = ph > 0.88 ? "#ffe2b8" : color;
      const s = z * 2.1 * Math.sqrt(scale); ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
  }
  function bgGrad(ctx, c1, c2 = C.bg, cx = W / 2, cy = H * 0.45, r = W * 0.8) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ------------------------------------------------------------ chapter card
  const ROMAN_W = {};
  function chapterCard(ctx, t, ch) {
    const [t0, , roman, cn, en, , color] = ch, lt = t - t0, dur = 3.6;
    if (lt < 0 || lt > dur) return;
    const out = prog(lt, dur - 0.75, dur), oE = ease.in(out);
    ctx.save();
    ctx.globalAlpha = 0.5 * prog(lt, 0, 0.25) * (1 - out);
    const g = ctx.createRadialGradient(W / 2, H * 0.46, 50, W / 2, H * 0.46, W * 0.62); g.addColorStop(0, "rgba(0,0,0,.9)"); g.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    const cy = H * 0.44 - oE * 26, A = 1 - oE;
    // roman numeral, outlined, letters fanning in
    const rp = ease.outExpo(prog(lt, 0, 1.3));
    text(ctx, roman, W / 2, cy - 165, { size: 96, weight: 400, font: F.lm, color: hexA(color, 0.95), alpha: A * prog(lt, 0.05, 0.5), ls: lerp(60, 18, rp) });
    // rules
    const lw = ease.outExpo(prog(lt, 0.15, 1.1)) * 330;
    ctx.save(); ctx.globalAlpha = A; ctx.fillStyle = hexA(color, 0.8);
    ctx.fillRect(W / 2 - 110 - lw, cy - 168, lw, 1.5); ctx.fillRect(W / 2 + 110, cy - 168, lw, 1.5); ctx.restore();
    // Chinese title revealed by a widening light slit
    const cp = ease.outExpo(prog(lt, 0.25, 1.35)), half = cp * 620;
    ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - half, cy - 120, half * 2, 170); ctx.clip();
    const ls = lerp(70, 28, ease.out(prog(lt, 0.25, 2.4)));
    const gr = ctx.createLinearGradient(W / 2 - 400, 0, W / 2 + 400, 0);
    const sw = prog(lt, 0.4, 2.2);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(clamp(sw - 0.15), "#ffffff"); gr.addColorStop(clamp(sw), mix(color, "#ffffff", 0.35)); gr.addColorStop(clamp(sw + 0.15), "#ffffff"); gr.addColorStop(1, "#ffffff");
    text(ctx, cn, W / 2 + ls / 2, cy - 30, { size: 132, weight: 900, font: F.serif, color: gr, alpha: A, ls });
    ctx.restore();
    if (cp < 0.97) { const ea = Math.pow(1 - cp, 1.2) * A; glow(ctx, W / 2 - half, cy - 35, 110, color, ea * 0.8); glow(ctx, W / 2 + half, cy - 35, 110, color, ea * 0.8); }
    // English, italic Latin Modern
    text(ctx, en, W / 2, cy + 88, { size: 46, weight: 400, font: F.lm, italic: true, color: "#e9edf8", alpha: A * prog(lt, 0.7, 1.5), ls: lerp(14, 4, ease.out(prog(lt, 0.7, 2.6))) });
    // the chapter's formula
    mathText(ctx, ch[5], W / 2, cy + 168, { size: 40, color: hexA(color, 1), alpha: A * prog(lt, 1.1, 1.9) });
    glow(ctx, W / 2, cy - 30, 700, color, 0.18 * A * (1 - prog(lt, 0.3, 2.0)));
  }

  // ------------------------------------------------------------ subtitles
  function subtitles(ctx, t) {
    for (const [a, b, cn, en] of window.SUBS) {
      if (t < a - 0.01 || t > b + 0.01) continue;
      const fi = ease.out(prog(t, a, a + 0.3)), fo = 1 - ease.in(prog(t, b - 0.32, b)), al = fi * fo, dy = (1 - fi) * 10;
      ctx.save();
      const g = ctx.createLinearGradient(0, H - 250, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,.7)");
      ctx.globalAlpha = al; ctx.fillStyle = g; ctx.fillRect(0, H - 250, W, 250); ctx.restore();
      text(ctx, cn, W / 2, H - 122 + dy, { size: 43, weight: 500, font: F.sans, color: "#ffffff", alpha: al, ls: 2, shadow: 10 });
      text(ctx, en, W / 2, H - 70 + dy, { size: 27, weight: 400, font: F.ui, color: "#cfdcff", alpha: al * 0.94, ls: 0.4, shadow: 8 });
    }
  }

  // ------------------------------------------------------------ HUD
  function hud(ctx, t, chs) {
    const ch = chs.find((c) => t >= c[0] + 3.4 && t < c[1] - 0.4);
    if (!ch) return;
    const a = 0.8 * prog(t, ch[0] + 3.4, ch[0] + 4.2) * (1 - prog(t, ch[1] - 1.0, ch[1] - 0.4));
    if (a < 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    const m = 56;
    text(ctx, "THE BEAUTY OF ALGORITHMS", m, m + 4, { size: 16, weight: 500, font: F.ui, color: "#c9d2ee", align: "left", ls: 5 });
    text(ctx, `${ch[2]} · ${ch[4]}`, m, m + 32, { size: 26, weight: 400, font: F.lm, italic: true, color: ch[6], align: "left", ls: 1 });
    const s = Math.floor(t), fr = Math.floor((t % 1) * 30);
    text(ctx, `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}:${String(fr).padStart(2, "0")}`, W - m, m + 4, { size: 17, weight: 500, font: F.mono, color: "#c9d2ee", align: "right", ls: 3 });
    // live spectrum strip — the actual score
    ctx.globalCompositeOperation = "lighter";
    for (let b = 0; b < 32; b++) {
      const v = spec(t, b * 2), x = W - m - 32 * 6 + b * 6;
      ctx.fillStyle = hexA(ch[6], 0.35 + 0.5 * v); ctx.fillRect(x, m + 36 - v * 18, 3, Math.max(1, v * 18));
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ post FX
  let bloomA, bloomB, streakC, tmpC, tmpR, tmpB, grainC;
  function initPost() {
    bloomA = mkCanvas(W / 4, H / 4); bloomB = mkCanvas(W / 8, H / 8); streakC = mkCanvas(60, H / 4); tmpC = mkCanvas(W, H); tmpR = mkCanvas(W, H); tmpB = mkCanvas(W, H);
    grainC = mkCanvas(W, H); const g = grainC.getContext("2d"), id = g.createImageData(W, H), r = rng(5150);
    for (let i = 0; i < W * H; i++) { const v = 128 + (r() + r() + r() - 1.5) * 70; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0);
  }
  function bloom(ctx, amt, streakAmt) {
    const a = bloomA.getContext("2d"), b = bloomB.getContext("2d"), s = streakC.getContext("2d");
    a.globalCompositeOperation = "copy"; a.filter = "contrast(2.3) brightness(0.62) blur(3px)"; a.drawImage(ctx.canvas, 0, 0, W / 4, H / 4); a.filter = "none";
    b.globalCompositeOperation = "copy"; b.filter = "blur(4px)"; b.drawImage(bloomA, 0, 0, W / 8, H / 8); b.filter = "none";
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5 * amt; ctx.drawImage(bloomA, 0, 0, W, H);
    ctx.globalAlpha = 0.72 * amt; ctx.drawImage(bloomB, 0, 0, W, H);
    if (streakAmt > 0) {
      s.globalCompositeOperation = "copy"; s.drawImage(bloomA, 0, 0, 60, H / 4);
      s.globalCompositeOperation = "multiply"; s.fillStyle = "#8fb8ff"; s.fillRect(0, 0, 60, H / 4);
      ctx.globalAlpha = 0.55 * streakAmt; ctx.drawImage(streakC, 0, 0, W, H);
    }
    ctx.restore();
  }
  function chroma(ctx, px) {
    if (px < 0.4) return;
    const r = tmpR.getContext("2d"), bl = tmpB.getContext("2d"), c = tmpC.getContext("2d");
    for (const [g, col] of [[r, "#ff0000"], [bl, "#0000ff"], [c, "#00ff00"]]) {
      g.globalCompositeOperation = "copy"; g.drawImage(ctx.canvas, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = col; g.fillRect(0, 0, W, H);
    }
    ctx.save(); ctx.globalCompositeOperation = "copy"; ctx.drawImage(tmpC, 0, 0);
    ctx.globalCompositeOperation = "lighter"; ctx.drawImage(tmpR, px, 0, W, H); ctx.drawImage(tmpB, -px, 0, W, H); ctx.restore();
  }
  function grain(ctx, t, a = 0.07) {
    const f = Math.floor(t * FPS), r = rng(f * 7919 + 13), ox = Math.floor(r() * W), oy = Math.floor(r() * H);
    ctx.save(); ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = a;
    ctx.drawImage(grainC, -ox, -oy); ctx.drawImage(grainC, W - ox, -oy); ctx.drawImage(grainC, -ox, H - oy); ctx.drawImage(grainC, W - ox, H - oy);
    ctx.restore();
  }
  function vignette(ctx, s = 0.7) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${s})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function letterbox(ctx, amt) { if (amt <= 0) return; const h = amt * 138; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
  function glitch(ctx, t, amt, seed) {
    if (amt <= 0.01) return;
    const g = tmpC.getContext("2d"); g.globalCompositeOperation = "copy"; g.drawImage(ctx.canvas, 0, 0);
    const r = rng(seed + Math.floor(t * 24));
    for (let i = 0; i < 12; i++) { const y = Math.floor(r() * H), h = Math.floor(6 + r() * 80), dx = (r() - 0.5) * 240 * amt; ctx.drawImage(tmpC, 0, y, W, h, dx, y, W, h); }
  }

  // ------------------------------------------------------------ master render
  let CHS = null;
  function render(ctx, t) {
    if (!bloomA) initPost();
    if (!CHS) {
      const cols = [C.ice, C.cyan, C.gold, C.teal, C.violet, C.rose, C.amber];
      const forms = ["O(n log n)", "log_2 n", "f(t) = Σ c_k e^{ikt}", "∂u/∂t = D∇^2u + f(u, v)", "z ← z^2 + c", "P = e^{−ΔE/T}", "θ ← θ − η∇L(θ)"];
      CHS = TL.chapters.map((c, i) => [c[0], c[1], c[2], c[3], c[4], forms[i], cols[i]]);
      AF.CHS = CHS;
    }
    t = clamp(t, 0, DUR - 1e-4);
    ctx.save();
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.filter = "none"; ctx.letterSpacing = "0px";
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const si = since(IMP, t), shake = si < 0.8 ? Math.pow(1 - si / 0.8, 2.2) * 13 : 0, kp = pulse(E.kicks, t, 0.15);
    ctx.save();
    ctx.translate(W / 2 + Math.sin(t * 93) * shake, H / 2 + Math.cos(t * 71) * shake);
    const z = 1 + kp * 0.005; ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    const opts = { bloom: 1, streak: 0.35, flash: 0.3, grain: 0.065, letterbox: 0, chroma: 1 };
    for (const sc of AF.scenes) {
      if (t >= sc.t0 - (sc.pre || 0) && t < sc.t1 + (sc.post || 0)) {
        ctx.save(); const o = sc.draw(ctx, t - sc.t0, t) || {}; ctx.restore(); Object.assign(opts, o);
      }
    }
    ctx.restore();
    for (const ch of CHS) chapterCard(ctx, t, ch);
    bloom(ctx, opts.bloom, opts.streak);
    if (si < 0.5) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.pow(1 - si / 0.5, 3) * opts.flash; ctx.fillStyle = "#eef6ff"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (si < 0.35 && opts.chroma) chroma(ctx, Math.pow(1 - si / 0.35, 2) * 9 * opts.chroma);
    if (opts.extra) opts.extra(ctx);
    vignette(ctx, 0.66);
    grain(ctx, t, AF.EXPORT ? Math.min(opts.grain, 0.042) : opts.grain);
    letterbox(ctx, opts.letterbox);
    hud(ctx, t, CHS);
    subtitles(ctx, t);
    const fade = Math.max(1 - prog(t, 0, 0.7), prog(t, DUR - 3.0, DUR - 0.3));
    if (fade > 0) { ctx.globalAlpha = fade; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  Object.assign(AF, { clamp, lerp, prog, smooth, ease, rng, hash1, hash2, vnoise, fbm, lastIdx, pulse, since, spec, energy, C, F, hexA, mix, hsl, RAMP, rampRGB, ramp,
    mkCanvas, glow, streak, text, decode, mathText, rrect, line, ring, dot, cam3, kf, stars, bgGrad, glitch, render, E, TL, D: window.DATA });
})();
