// Scenes C — IV · Emergence (boids, Turing patterns), V · Recursion (fractal tree, Mandelbrot dive)
(function () {
  const { W, H, C, F, E, TL, D, clamp, lerp, prog, smooth, ease, rng, hash1, vnoise, fbm, pulse, since, spec, energy, hexA, mix, ramp, rampRGB,
    mkCanvas, glow, streak, text, decode, mathText, line, ring, dot, kf, stars, bgGrad } = AF;
  AF.precompute = AF.precompute || [];
  const FPS = 30;

  // ======================================================================== IV · boids (118–134)
  const EM = TL.emerge, NBOIDS = 2400, BFR = Math.round((EM.boids1 - EM.boids0 + 1.0) * FPS);
  let BOIDS = null;
  function boidsInit() {
    if (BOIDS) return BOIDS;
    const r = rng(1986), curves = AF.fourierCurves(), all = [];
    for (const c of curves) for (let i = 0; i < c.length - 1; i++) all.push([c[i], c[i + 1]]);
    const X = new Float32Array(NBOIDS), Y = new Float32Array(NBOIDS), VX = new Float32Array(NBOIDS), VY = new Float32Array(NBOIDS);
    for (let i = 0; i < NBOIDS; i++) {
      const [a, b] = all[Math.floor(r() * all.length)], u = r();
      X[i] = lerp(a[0], b[0], u); Y[i] = lerp(a[1], b[1], u);
      const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, out = Math.atan2(Y[i] - 470, X[i] - 960);
      VX[i] = tx / tl * 2.5 + Math.cos(out) * 2.0; VY[i] = ty / tl * 2.5 + Math.sin(out) * 2.0;
    }
    const frames = new Float32Array(BFR * NBOIDS * 4), CELL = 44, GW = Math.ceil(W / CELL) + 2, GH = Math.ceil(H / CELL) + 2;
    const head = new Int32Array(GW * GH), next = new Int32Array(NBOIDS);
    for (let f = 0; f < BFR; f++) {
      const t = EM.boids0 + f / FPS, lt = f / FPS;
      // attractor wanders on a Lissajous; in the last second it pulls everything into one point
      const ax = 960 + 520 * Math.sin(lt * 0.37 + 0.6), ay = 470 + 230 * Math.sin(lt * 0.53 + 1.4);
      const dive = clamp((t - 132.6) / 1.4), px = 960 + 700 * Math.cos(lt * 0.9), py = 500 + 300 * Math.sin(lt * 1.3);
      const hawk = clamp((lt - 6.5) / 1.0) * (1 - clamp((lt - 13.5) / 1.0));
      head.fill(-1);
      for (let i = 0; i < NBOIDS; i++) { const cx = Math.min(GW - 1, Math.max(0, Math.floor(X[i] / CELL) + 1)), cy = Math.min(GH - 1, Math.max(0, Math.floor(Y[i] / CELL) + 1)), k = cy * GW + cx; next[i] = head[k]; head[k] = i; }
      for (let i = 0; i < NBOIDS; i++) {
        const cx = Math.min(GW - 1, Math.max(0, Math.floor(X[i] / CELL) + 1)), cy = Math.min(GH - 1, Math.max(0, Math.floor(Y[i] / CELL) + 1));
        let sx = 0, sy = 0, ax2 = 0, ay2 = 0, cx2 = 0, cy2 = 0, n = 0;
        for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
          for (let j = head[gy * GW + gx]; j >= 0; j = next[j]) {
            if (j === i) continue; const dx = X[j] - X[i], dy = Y[j] - Y[i], d2 = dx * dx + dy * dy;
            if (d2 > CELL * CELL) continue;
            if (d2 < 11 * 11) { const d = Math.sqrt(d2) + 0.01; sx -= dx / d / d * 11; sy -= dy / d / d * 11; }
            ax2 += VX[j]; ay2 += VY[j]; cx2 += X[j]; cy2 += Y[j]; n++;
          }
        }
        let fx = sx * 0.3, fy = sy * 0.3;
        if (n) { fx += (ax2 / n - VX[i]) * 0.09 + (cx2 / n - X[i]) * 0.004; fy += (ay2 / n - VY[i]) * 0.09 + (cy2 / n - Y[i]) * 0.004; }
        // wind: smooth curl of value noise
        const e = 0.004, nx = X[i] * 0.0016, ny = Y[i] * 0.0016, nt = lt * 0.12;
        const dnx = (fbm(nx, ny + e + nt, 3) - fbm(nx, ny - e + nt, 3)) / (2 * e), dny = (fbm(nx + e, ny + nt, 3) - fbm(nx - e, ny + nt, 3)) / (2 * e);
        fx += dnx * 0.02; fy -= dny * 0.02;
        const dxA = ax - X[i], dyA = ay - Y[i], dA = Math.hypot(dxA, dyA) + 1;
        fx += dxA / dA * (0.11 + dive * 0.9); fy += dyA / dA * (0.11 + dive * 0.9);
        if (dive > 0) { fx += (960 - X[i]) * 0.004 * dive; fy += (500 - Y[i]) * 0.004 * dive; }
        if (hawk > 0) { const hx = X[i] - px, hy = Y[i] - py, hd = Math.hypot(hx, hy) + 1; if (hd < 230) { fx += hx / hd * 1.1 * hawk * (1 - hd / 230); fy += hy / hd * 1.1 * hawk * (1 - hd / 230); } }
        // soft walls
        if (X[i] < 80) fx += 0.25; if (X[i] > W - 80) fx -= 0.25; if (Y[i] < 70) fy += 0.25; if (Y[i] > H - 140) fy -= 0.3;
        VX[i] += fx; VY[i] += fy;
        const sp = Math.hypot(VX[i], VY[i]), mx = 6.8 + dive * 10, mn = 3.2;
        if (sp > mx) { VX[i] *= mx / sp; VY[i] *= mx / sp; } else if (sp < mn) { VX[i] *= mn / sp; VY[i] *= mn / sp; }
      }
      for (let i = 0; i < NBOIDS; i++) { X[i] += VX[i]; Y[i] += VY[i]; const o = (f * NBOIDS + i) * 4; frames[o] = X[i]; frames[o + 1] = Y[i]; frames[o + 2] = VX[i]; frames[o + 3] = VY[i]; }
    }
    BOIDS = { frames, hawk: (lt) => [960 + 700 * Math.cos(lt * 0.9), 500 + 300 * Math.sin(lt * 1.3), clamp((lt - 6.5) / 1.0) * (1 - clamp((lt - 13.5) / 1.0))] };
    return BOIDS;
  }
  AF.precompute.push(boidsInit);
  function ruleIcon(ctx, x, y, kind, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.fillStyle = "rgba(10,8,24,0.55)"; ctx.beginPath(); ctx.roundRect(-70, -70, 140, 140, 14); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -6, 46, 0, 7); ctx.stroke();
    const bird = (bx, by, ang, col = "#fff") => { ctx.save(); ctx.translate(bx, by); ctx.rotate(ang); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, 5); ctx.lineTo(-3, 0); ctx.lineTo(-6, -5); ctx.closePath(); ctx.fill(); ctx.restore(); };
    const arrow = (x1, y1, x2, y2) => { ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); const an = Math.atan2(y2 - y1, x2 - x1); ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 8 * Math.cos(an - 0.5), y2 - 8 * Math.sin(an - 0.5)); ctx.lineTo(x2 - 8 * Math.cos(an + 0.5), y2 - 8 * Math.sin(an + 0.5)); ctx.fill(); };
    if (kind === 0) { bird(0, -6, -0.3, C.amber); bird(-20, -18, 0.2); bird(18, 6, -0.6); arrow(-6, -10, -30, -30 + 4); arrow(6, -2, 30, 16); }
    if (kind === 1) { for (const [bx, by] of [[-24, -24], [0, -6], [22, 12]]) { bird(bx, by, -0.5, by === -6 ? C.amber : "#fff"); } arrow(-6, 10, 24, -8); }
    if (kind === 2) { for (const [bx, by, an] of [[-30, -20, 0.6], [26, -26, 2.4], [-16, 22, -0.8], [24, 18, -2.6]]) { bird(bx, by, an); arrow(bx * 0.75, by * 0.75 - 2, bx * 0.25, by * 0.25 - 4); } dot(ctx, 0, -6, 4, C.amber); }
    ctx.restore();
    text(ctx, ["分离", "对齐", "聚集"][kind], x, y + 92, { size: 28, weight: 700, font: F.sans, color: "#fff", alpha: a });
    text(ctx, ["Separation", "Alignment", "Cohesion"][kind], x, y + 126, { size: 20, font: F.lm, italic: true, color: "#ffd9b0", alpha: a });
  }
  function sky(ctx, t, a = 1) {
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1030"); g.addColorStop(0.45, "#2a1c52"); g.addColorStop(0.72, "#7a2f5c"); g.addColorStop(0.9, "#d76a4a"); g.addColorStop(1, "#ffb55e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    glow(ctx, 1300, H + 40, 760, "#ffcf7a", 0.75); glow(ctx, 1300, H + 20, 260, "#fff2c2", 0.9);
    // distant hills
    ctx.fillStyle = "#130a1c"; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, H - 70 - 40 * fbm(x * 0.002, 3.1, 3) - 20 * Math.sin(x * 0.004));
    ctx.lineTo(W, H); ctx.fill();
    ctx.restore();
  }
  AF.scenes.push({
    t0: 118, t1: 134,
    draw(ctx, lt, t) {
      const B = boidsInit(), f = clamp(Math.floor(lt * FPS), 0, BFR - 1), fr = B.frames;
      sky(ctx, t, 1);
      stars(ctx, t, { a: 0.35, drift: 2 });
      // the birds: dark streaks against the dusk, with warm rim light near the horizon
      ctx.save(); ctx.lineCap = "round";
      const pth = new Path2D(), pthWarm = new Path2D();
      for (let i = 0; i < NBOIDS; i++) {
        const o = (f * NBOIDS + i) * 4, x = fr[o], y = fr[o + 1], vx = fr[o + 2], vy = fr[o + 3];
        const p = y > 700 ? pthWarm : pth; p.moveTo(x, y); p.lineTo(x - vx * 1.5, y - vy * 1.5);
      }
      const intro = 1 - prog(lt, 0, 1.4);
      ctx.strokeStyle = intro > 0 ? mix("#08060f", C.gold, intro) : "#08060f"; ctx.lineWidth = 2.6; ctx.stroke(pth);
      ctx.strokeStyle = "#1a0d10"; ctx.stroke(pthWarm);
      if (intro > 0) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = intro; ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke(pth); }
      ctx.restore();
      const [hx, hy, ha] = B.hawk(lt);
      if (ha > 0.02) { ctx.save(); ctx.globalAlpha = ha; ctx.fillStyle = "#050308"; ctx.translate(hx, hy); ctx.rotate(Math.atan2(Math.cos(lt * 1.3) * 1.3 * 300, -Math.sin(lt * 0.9) * 0.9 * 700)); ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-14, 16); ctx.lineTo(-6, 0); ctx.lineTo(-14, -16); ctx.closePath(); ctx.fill(); ctx.restore(); }
      // the three rules, one per beat
      [121.0, 122.0, 123.0].forEach((tr, k) => ruleIcon(ctx, 1450 + k * 170, 200, k, ease.out(prog(t, tr, tr + 0.4)) * (1 - prog(t, 128.0, 128.8))));
      const ca = prog(t, 125.0, 125.6) * (1 - prog(t, 132.2, 132.8));
      text(ctx, `${NBOIDS.toLocaleString("en-US")} BOIDS · 3 RULES · NO LEADER`, 140, 120, { size: 22, weight: 600, font: F.ui, color: "#ffe2c4", align: "left", alpha: ca, ls: 4 });
      if (lt > 14.4) { const q = ease.inExpo(prog(lt, 14.4, 16)); glow(ctx, 960, 500, 80 + q * 900, "#fff1d6", q * 1.2); }
      return { bloom: 0.75, streak: 0.2, grain: 0.08 };
    },
  });

  // ======================================================================== IV · Turing patterns, Gray–Scott (134–146)
  const GW_ = 400, GH_ = 225, TSTEPS = 16;
  let TUR = null;
  function turingAt(frame) {
    if (!TUR) {
      const cv = mkCanvas(GW_, GH_), g = cv.getContext("2d"), img = g.createImageData(GW_, GH_);
      TUR = { frame: -1, U: new Float32Array(GW_ * GH_), V: new Float32Array(GW_ * GH_), U2: new Float32Array(GW_ * GH_), V2: new Float32Array(GW_ * GH_), cv, g, img, lut: new Uint32Array(256) };
      for (let i = 0; i < 256; i++) {
        const v = i / 255, stops = [[0, [2, 6, 14]], [0.22, [6, 34, 52]], [0.42, [12, 112, 140]], [0.62, [70, 214, 230]], [0.8, [220, 252, 255]], [0.92, [255, 232, 170]], [1, [255, 186, 96]]];
        let k = 0; while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
        const [a0, c0] = stops[k], [a1, c1] = stops[k + 1], u = clamp((v - a0) / (a1 - a0));
        TUR.lut[i] = (255 << 24) | ((c0[2] + (c1[2] - c0[2]) * u) << 16) | ((c0[1] + (c1[1] - c0[1]) * u) << 8) | (c0[0] + (c1[0] - c0[0]) * u);
      }
    }
    const T = TUR;
    T.cache = T.cache || new Map();
    const paint = (V) => {
      const buf = new Uint32Array(T.img.data.buffer);
      for (let y = 0; y < GH_; y++) for (let x = 0; x < GW_; x++) {
        const i = y * GW_ + x, v = V[i] / 255, gx = (V[i + (x < GW_ - 1 ? 1 : 0)] - V[i - (x > 0 ? 1 : 0)]) / 255, gy = (V[i + (y < GH_ - 1 ? GW_ : 0)] - V[i - (y > 0 ? GW_ : 0)]) / 255;
        const c = T.lut[Math.min(255, Math.max(0, (v * 2.9 * 255) | 0))], sh = Math.max(0.5, Math.min(1.7, 1 + (gx - gy) * 7));
        buf[i] = (255 << 24) | (Math.min(255, ((c >> 16) & 255) * sh) << 16) | (Math.min(255, ((c >> 8) & 255) * sh) << 8) | Math.min(255, (c & 255) * sh);
      }
      T.g.putImageData(T.img, 0, 0); return T.cv;
    };
    if (T.cache.has(frame)) return paint(T.cache.get(frame));
    if (frame < T.frame || T.frame < 0) {
      T.U.fill(1); T.V.fill(0); const r = rng(1952);
      const seed = (cx, cy, rad) => { for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad && cx + x >= 0 && cx + x < GW_ && cy + y >= 0 && cy + y < GH_) { const i = (cy + y) * GW_ + cx + x; T.U[i] = 0.5 + r() * 0.1; T.V[i] = 0.25 + r() * 0.1; } };
      seed(200, 104, 5); for (let k = 0; k < 90; k++) { const a = r() * Math.PI * 2, rr = 20 + Math.sqrt(r()) * 200; seed(Math.round(200 + Math.cos(a) * rr * 1.25), Math.round(104 + Math.sin(a) * rr * 0.62), 2 + Math.floor(r() * 2)); }
      T.frame = 0;
    }
    const F_ = 0.0545, K_ = 0.062, Du = 0.1, Dv = 0.05;
    while (T.frame < frame) {
      for (let s = 0; s < TSTEPS; s++) {
        const U = T.U, V = T.V, U2 = T.U2, V2 = T.V2;
        for (let y = 0; y < GH_; y++) {
          const ym = (y === 0 ? GH_ - 1 : y - 1) * GW_, yp = (y === GH_ - 1 ? 0 : y + 1) * GW_, yc = y * GW_;
          for (let x = 0; x < GW_; x++) {
            const xm = x === 0 ? GW_ - 1 : x - 1, xp = x === GW_ - 1 ? 0 : x + 1, i = yc + x;
            const u = U[i], v = V[i];
            const lu = 0.2 * (U[yc + xm] + U[yc + xp] + U[ym + x] + U[yp + x]) + 0.05 * (U[ym + xm] + U[ym + xp] + U[yp + xm] + U[yp + xp]) - u;
            const lv = 0.2 * (V[yc + xm] + V[yc + xp] + V[ym + x] + V[yp + x]) + 0.05 * (V[ym + xm] + V[ym + xp] + V[yp + xm] + V[yp + xp]) - v;
            const uvv = u * v * v;
            U2[i] = u + (Du * 5 * lu - uvv + F_ * (1 - u)); V2[i] = v + (Dv * 5 * lv + uvv - (F_ + K_) * v);
          }
        }
        T.U = U2; T.U2 = U; T.V = V2; T.V2 = V;
      }
      T.frame++;
      const snap = new Uint8Array(GW_ * GH_); for (let i = 0; i < snap.length; i++) snap[i] = Math.min(255, T.V[i] * 255); T.cache.set(T.frame, snap);
    }
    if (T.cache.has(frame)) return paint(T.cache.get(frame));
    const buf = new Uint32Array(T.img.data.buffer);
    for (let y = 0; y < GH_; y++) for (let x = 0; x < GW_; x++) {
      const i = y * GW_ + x, v = T.V[i], gx = T.V[i + (x < GW_ - 1 ? 1 : 0)] - T.V[i - (x > 0 ? 1 : 0)], gy = T.V[i + (y < GH_ - 1 ? GW_ : 0)] - T.V[i - (y > 0 ? GW_ : 0)];
      const c = T.lut[Math.min(255, Math.max(0, (v * 2.9 * 255) | 0))], sh = Math.max(0.5, Math.min(1.7, 1 + (gx - gy) * 7));
      buf[i] = (255 << 24) | (Math.min(255, ((c >> 16) & 255) * sh) << 16) | (Math.min(255, ((c >> 8) & 255) * sh) << 8) | Math.min(255, (c & 255) * sh);
    }
    T.g.putImageData(T.img, 0, 0);
    return T.cv;
  }
  AF.turingAt = turingAt;
  AF.scenes.push({
    t0: 134, t1: 146, post: 0.4,
    draw(ctx, lt, t) {
      ctx.fillStyle = "#02060a"; ctx.fillRect(0, 0, W, H);
      const cv = turingAt(Math.floor(lt * FPS));
      const z = lerp(1.0, 1.32, ease.sine(prog(lt, 0, 12))), fade = 1 - prog(t, 145.0, 146.3);
      ctx.save(); ctx.globalAlpha = fade; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.rotate(lt * 0.01); ctx.drawImage(cv, -W / 2 - 10, -H / 2 - 10, W + 20, H + 20); ctx.restore();
      const la = prog(t, 135.0, 135.8) * (1 - prog(t, 144.4, 145.0));
      ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = "rgba(1,6,10,0.72)"; ctx.beginPath(); ctx.roundRect(110, 84, 600, 176, 12); ctx.fill(); ctx.restore();
      text(ctx, "REACTION–DIFFUSION · 反应–扩散", 140, 120, { size: 22, weight: 600, font: F.ui, color: "#d8fff6", align: "left", alpha: la, ls: 4 });
      mathText(ctx, "∂u/∂t = D_u∇^2u − uv^2 + F(1−u)", 140, 176, { size: 32, color: "#eafffa", align: "left", alpha: la });
      mathText(ctx, "∂v/∂t = D_v∇^2v + uv^2 − (F+k)v", 140, 226, { size: 32, color: "#eafffa", align: "left", alpha: la });
      if (lt < 0.8) glow(ctx, 960, 500, 900 * (1 - lt / 0.8), "#fff1d6", 1 - lt / 0.8);
      return { bloom: 0.9, streak: 0.2 };
    },
  });

  // ======================================================================== V · recursion: the fractal tree (146–156)
  const TR = TL.tree, DEPTH = TR.depth;
  function treeSegs(t) {
    const segs = Array.from({ length: DEPTH }, () => []), tips = [];
    const sway = (d) => 0.06 * Math.sin(t * 1.3 + d * 0.5) * (d / DEPTH) + 0.02 * Math.sin(t * 2.7 + d);
    const grow = (d) => ease.out(prog(t, TR.lvl0 + d * TR.lvlStep - 0.05, TR.lvl0 + d * TR.lvlStep + 0.42));
    const rec = (x, y, len, ang, d) => {
      if (d >= DEPTH) return;
      const g = grow(d); if (g <= 0) return;
      const x2 = x + Math.cos(ang) * len * g, y2 = y + Math.sin(ang) * len * g;
      segs[d].push(x, y, x2, y2);
      if (d === DEPTH - 1 || grow(d + 1) <= 0) tips.push(x2, y2, d);
      if (g < 1) return;
      const th = 0.36 + 0.05 * Math.sin(d * 1.7) + sway(d);
      const j = 0.04 * Math.sin(x * 0.07 + y * 0.05);
      rec(x2, y2, len * 0.75, ang - th + j, d + 1); rec(x2, y2, len * 0.75, ang + th + j, d + 1);
    };
    rec(1080, 1010, 200, -Math.PI / 2 + 0.03 * Math.sin(t * 0.8), 0);
    return { segs, tips };
  }
  const CODE = ["def tree(x, y, length, angle, depth):", "    if depth == 0:", "        return", "    x2, y2 = branch(x, y, length, angle)", "    tree(x2, y2, 0.75*length, angle - θ, depth - 1)", "    tree(x2, y2, 0.75*length, angle + θ, depth - 1)"];
  AF.scenes.push({
    t0: 146, t1: 156,
    draw(ctx, lt, t) {
      bgGrad(ctx, "#140b1e", "#020105", 1060, 560);
      stars(ctx, t, { a: 0.45, drift: 2 });
      const dive = ease.inExpo(prog(t, 154.6, 156.0));
      const { segs, tips } = treeSegs(t);
      ctx.save();
      if (dive > 0) { const tx = 1060 + 420, ty = 300; ctx.translate(tx, ty); ctx.scale(1 + dive * 14, 1 + dive * 14); ctx.translate(-tx, -ty); }
      ctx.lineCap = "round";
      for (let d = 0; d < DEPTH; d++) {
        const s = segs[d]; if (!s.length) continue;
        const p = new Path2D(); for (let i = 0; i < s.length; i += 4) { p.moveTo(s[i], s[i + 1]); p.lineTo(s[i + 2], s[i + 3]); }
        const u = d / (DEPTH - 1);
        ctx.strokeStyle = mix(mix("#c48a3a", C.gold, Math.min(1, u * 2)), "#ffd2e6", Math.max(0, u * 2 - 1)); ctx.lineWidth = Math.max(0.8, 14 * Math.pow(0.68, d));
        ctx.globalAlpha = 0.95; ctx.stroke(p);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
      const kp = pulse(E.tree, t, 0.35);
      for (let i = 0, k = 0; i < tips.length; i += 3, k++) { const d = tips[i + 2]; if (d < 4 || (d > 8 && k % 3)) continue; glow(ctx, tips[i], tips[i + 1], 5 + d * 0.6 + kp * 6, d > 9 ? "#ffd6ec" : C.gold, (d > 9 ? 0.22 : 0.4) + 0.25 * kp); }
      ctx.restore();
      // the code, the current depth
      const cur = clamp(Math.floor((t - TR.lvl0) / TR.lvlStep) + 1, 0, DEPTH), ca = prog(t, 148.0, 148.6) * (1 - prog(t, 154.4, 155.0));
      ctx.save(); ctx.globalAlpha = ca; ctx.fillStyle = "rgba(6,4,14,0.6)"; ctx.fillRect(110, 300, 720, 300); ctx.restore();
      CODE.forEach((ln, i) => text(ctx, ln, 140, 340 + i * 42, { size: 24, font: F.mono, color: i >= 4 ? (Math.floor(t * 4) % 2 ? "#ffd27a" : "#fff1cf") : "#cfc6e6", align: "left", alpha: ca }));
      text(ctx, `depth ${String(cur).padStart(2, " ")}`, 140, 650, { size: 40, font: F.mono, color: "#ffffff", align: "left", alpha: ca });
      text(ctx, `${(2 ** cur - 0).toLocaleString("en-US")} branches`, 140, 700, { size: 28, font: F.mono, color: C.gold, align: "left", alpha: ca });
      if (dive > 0) glow(ctx, W / 2, H / 2, 200 + dive * 1400, "#ffffff", dive * 1.2);
      return { bloom: 1.05, streak: 0.3 };
    },
  });

  // ======================================================================== V · the Mandelbrot dive (156–184)
  const MD = D.MANDEL, MFR = MD.frames, MT0 = MD.t0;
  const frameIdx = (t) => clamp(Math.round((t - MT0) * FPS), 0, MFR.length - 1);
  const fileIdx = (i) => Math.min(i, 720);
  const IMG = new Map();
  function loadFrame(i) {
    const k = fileIdx(i); if (IMG.has(k)) return IMG.get(k).p;
    const img = new Image(); const p = new Promise((res) => { img.onload = () => res(img); img.onerror = () => res(null); });
    img.src = `../build/mframes/${String(k).padStart(5, "0")}.jpg`;
    IMG.set(k, { img, p }); if (IMG.size > 24) { const first = IMG.keys().next().value; IMG.delete(first); }
    return p;
  }
  AF.mandelNeeds = AF.mandelNeeds || [];
  AF.prepare = async (t) => {
    if (!AF.EXPORT) return;
    const need = new Set();
    if (t >= MT0 - 0.1 && t < MD.t1 + 0.1) need.add(frameIdx(t));
    for (const fn of AF.mandelNeeds) for (const tt of fn(t)) need.add(frameIdx(tt));
    await Promise.all([...need].map(loadFrame));
  };
  // real-time WebGL path for the live player: perturbation from the minibrot's own periodic orbit
  let GL = null;
  function glInit() {
    if (GL !== null) return GL;
    try {
      const cv = mkCanvas(960, 540), gl = cv.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
      if (!gl) return (GL = false);
      const vs = `#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
      const fs = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform vec2 uDc0; uniform float uPix; uniform sampler2D uRef; uniform int uP; uniform int uMaxIt; uniform float uRot;
out vec4 o;
vec3 pal(float s){
  const vec3 S0=vec3(3,3,15)/255., S1=vec3(16,32,107)/255., S2=vec3(42,167,255)/255., S3=vec3(230,251,255)/255., S4=vec3(255,192,77)/255., S5=vec3(255,61,139)/255.;
  s = fract(s)*6.; float f = fract(s); f = f*f*(3.-2.*f); int i = int(floor(s));
  vec3 a = i==0?S0:i==1?S1:i==2?S2:i==3?S3:i==4?S4:S5; vec3 b = i==0?S1:i==1?S2:i==2?S3:i==3?S4:i==4?S5:S0;
  return mix(a,b,f);
}
void main(){
  vec2 p = gl_FragCoord.xy - 0.5*uRes; p.y = -p.y; p *= 1920.0/uRes.x;
  float cr = cos(uRot), sr = sin(uRot); p = vec2(cr*p.x - sr*p.y, sr*p.x + cr*p.y);
  vec2 dc = uDc0 + p*uPix, d = vec2(0.), der = vec2(0.), z = vec2(0.), zc = vec2(0.);
  int m = 0; float n = -1.;
  for (int it = 0; it < 8000; it++) {
    if (it >= uMaxIt) break;
    vec2 Z = texelFetch(uRef, ivec2(m,0), 0).xy;
    der = 2.*vec2(z.x*der.x - z.y*der.y, z.x*der.y + z.y*der.x) + vec2(1.,0.);
    d = vec2(2.*(Z.x*d.x - Z.y*d.y) + d.x*d.x - d.y*d.y, 2.*(Z.x*d.y + Z.y*d.x) + 2.*d.x*d.y) + dc;
    m++; if (m == uP) m = 0;
    z = texelFetch(uRef, ivec2(m,0), 0).xy + d;
    float r2 = dot(z,z);
    if (r2 > 65536.) { n = float(it) + 1. - log2(0.5*log(r2)); break; }
    if (r2 < dot(d,d)) { d = z; m = 0; }
    if ((it % 35) == 34) { if (distance(z, zc) < 1e-6) break; zc = z; }
  }
  if (n < 0.) { o = vec4(0,0,0,1); return; }
  float r = length(z), de = r*log(r)/length(der)/uPix, t = max(n,0.);
  vec3 col = pal(0.10*sqrt(t) + 0.2*log(1.+t));
  float bright = 0.10 + 0.90*exp(-log(1.+clamp(de,0.,1e6))/1.6), glow = exp(-clamp(de,0.,50.)*0.7);
  o = vec4(clamp(col*bright + glow*vec3(0.6375,0.6975,0.75),0.,1.),1.);
}`;
      const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      const P = MD.orbit.length, data = new Float32Array(P * 4); MD.orbit.forEach((z, i) => { data[i * 4] = z[0]; data[i * 4 + 1] = z[1]; });
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, P, 1, 0, gl.RGBA, gl.FLOAT, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const U = {}; for (const n of ["uRes", "uDc0", "uPix", "uRef", "uP", "uMaxIt", "uRot"]) U[n] = gl.getUniformLocation(pr, n);
      GL = { cv, gl, U, P, scale: 0.5, last: 0 };
    } catch (e) { console.warn("WebGL Mandelbrot unavailable", e); GL = false; }
    return GL;
  }
  function mandelParams(t) {
    const f = clamp((t - MT0) * FPS, 0, MFR.length - 1), i = Math.floor(f), j = Math.min(MFR.length - 1, i + 1), u = f - i;
    const [z0, r0, m0] = MFR[i], [z1, r1, m1] = MFR[j];
    return { zoom: Math.exp(lerp(Math.log(z0), Math.log(z1), u)), rot: lerp(r0, r1, u), maxit: Math.round(lerp(m0, m1, u)) };
  }
  function drawMandel(ctx, t, alpha = 1) {
    if (AF.EXPORT) {
      const e = IMG.get(fileIdx(frameIdx(t)));
      if (e && e.img.complete && e.img.naturalWidth) { ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(e.img, 0, 0, W, H); ctx.restore(); }
      return;
    }
    const G = glInit(); if (!G) return;
    const { zoom, rot, maxit } = mandelParams(t), gl = G.gl;
    const w = Math.round(1920 * G.scale), h = Math.round(1080 * G.scale);
    if (G.cv.width !== w) { G.cv.width = w; G.cv.height = h; }
    gl.viewport(0, 0, w, h);
    const fk = Math.pow(zoom, -MD.k);
    gl.uniform2f(G.U.uRes, w, h); gl.uniform2f(G.U.uDc0, MD.dTarget[0] + (MD.dStart[0] - MD.dTarget[0]) * fk, MD.dTarget[1] + (MD.dStart[1] - MD.dTarget[1]) * fk);
    gl.uniform1f(G.U.uPix, MD.span / zoom / 1920); gl.uniform1i(G.U.uP, G.P); gl.uniform1i(G.U.uRef, 0); gl.uniform1i(G.U.uMaxIt, maxit); gl.uniform1f(G.U.uRot, rot);
    const t0 = performance.now(); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = true; ctx.drawImage(G.cv, 0, 0, W, H); ctx.restore();
    const dt = performance.now() - t0; G.last = dt;
    if (dt > 45 && G.scale > 0.25) G.scale = Math.max(0.25, G.scale * 0.85); else if (dt < 12 && G.scale < 1) G.scale = Math.min(1, G.scale * 1.1);
  }
  AF.drawMandel = drawMandel; AF.mandelParams = mandelParams;
  const fmtMag = (z) => z < 1000 ? z.toFixed(z < 10 ? 1 : 0) : Math.round(z).toLocaleString("en-US");
  AF.scenes.push({
    t0: 156, t1: 184,
    draw(ctx, lt, t) {
      const breathe = 1 + 0.012 * ease.sine(prog(t, 180, 184));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(breathe, breathe); ctx.translate(-W / 2, -H / 2);
      drawMandel(ctx, t);
      ctx.restore();
      const { zoom, maxit } = mandelParams(t);
      // formula & iteration counter during the reveal
      const fa = prog(t, 156.3, 157.0) * (1 - prog(t, 166.0, 167.0));
      if (fa > 0) {
        ctx.save(); ctx.globalAlpha = fa * 0.55; const g = ctx.createLinearGradient(0, 60, 0, 300); g.addColorStop(0, "rgba(0,0,0,.7)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 60, W, 240); ctx.restore();
        mathText(ctx, "z_{n+1} = z_n^2 + c", W / 2, 150, { size: 72, color: "#ffffff", alpha: fa });
        text(ctx, t < 161 ? `iterations  ${maxit}` : "", W / 2, 236, { size: 26, font: F.mono, color: "#bfe0ff", alpha: fa });
      }
      // magnification gauge
      const ga = prog(t, 160.5, 161.2) * (1 - prog(t, 179.3, 180.0));
      if (ga > 0) {
        const L = Math.log10(zoom), X = 1760, Y0 = 860, Y1 = 220;
        ctx.save(); ctx.globalAlpha = ga; ctx.fillStyle = "rgba(0,0,0,.62)"; ctx.beginPath(); ctx.roundRect(X - 120, Y1 - 76, 220, Y0 - Y1 + 150, 12); ctx.fill(); ctx.restore();
        for (let k = 0; k <= 10; k++) {
          const y = lerp(Y0, Y1, k / 10);
          ctx.save(); ctx.globalAlpha = ga * 0.8; ctx.fillStyle = "#cfe6ff"; ctx.fillRect(X, y, k % 5 ? 10 : 18, 1.5); ctx.restore();
          if (k % 2 === 0) mathText(ctx, `10^{${k}}`, X - 18, y, { size: 22, color: "#cfe6ff", align: "right", alpha: ga * 0.8 });
        }
        const y = lerp(Y0, Y1, L / 10); glow(ctx, X + 9, y, 30, C.cyan, ga); line(ctx, [[X - 4, y], [X + 30, y]], "#ffffff", ga, 3);
        text(ctx, "×" + fmtMag(zoom), X + 40, Y1 - 40, { size: 30, font: F.mono, color: "#ffffff", align: "right", alpha: ga });
        text(ctx, "放大倍数 MAGNIFICATION", X + 40, Y0 + 50, { size: 15, weight: 600, font: F.ui, color: "#9fc4e8", align: "right", alpha: ga, ls: 2 });
      }
      const ra = prog(t, 180.0, 180.6);
      if (ra > 0) {
        ctx.save(); ctx.globalAlpha = ra * 0.6 * (1 - prog(t, 183.0, 183.8)); const bg = ctx.createLinearGradient(0, 70, 0, 230); bg.addColorStop(0, "rgba(0,0,0,.85)"); bg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = bg; ctx.fillRect(0, 70, W, 160); ctx.restore();
        text(ctx, "×7,073,433,963", W / 2, 130, { size: 40, font: F.mono, color: "#ffffff", alpha: ra * (1 - prog(t, 183.0, 183.8)) });
        text(ctx, "SELF-SIMILARITY · 自相似", W / 2, 180, { size: 20, weight: 600, font: F.ui, color: "#cfe6ff", alpha: ra * (1 - prog(t, 183.0, 183.8)), ls: 6 });
      }
      if (lt < 0.6) glow(ctx, W / 2, H / 2, 1000 * (1 - lt / 0.6), "#ffffff", 1 - lt / 0.6);
      return { bloom: 0.55, streak: 0.25, grain: 0.05 };
    },
  });
})();
