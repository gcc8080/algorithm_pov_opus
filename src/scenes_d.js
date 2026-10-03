// Scenes D — VI · Optimization (TSP by simulated annealing), VII · Learning (gradient descent, neural net), montage, finale
(function () {
  const { W, H, C, F, E, TL, D, clamp, lerp, prog, smooth, ease, rng, hash1, vnoise, fbm, pulse, since, spec, energy, hexA, mix, ramp, rampRGB,
    mkCanvas, glow, streak, text, decode, mathText, line, ring, dot, kf, stars, bgGrad, cam3 } = AF;
  AF.precompute = AF.precompute || [];
  AF.mandelNeeds = AF.mandelNeeds || [];
  const FPS = 30;

  // ======================================================================== VI · travelling salesman, simulated annealing (184–212)
  const TS = TL.tsp, CT = D.TSP.cities, NCITY = CT.length / 2, SAF = Math.round((TS.sa1 - TS.sa0) * FPS);
  let TSP = null;
  function tspInit() {
    if (TSP) return TSP;
    const r = rng(1500), n = NCITY, X = new Float64Array(n), Y = new Float64Array(n);
    for (let i = 0; i < n; i++) { X[i] = CT[2 * i]; Y[i] = CT[2 * i + 1]; }
    const d = (a, b) => Math.hypot(X[a] - X[b], Y[a] - Y[b]);
    // k nearest neighbours
    const K = 10, NB = new Int32Array(n * K);
    for (let i = 0; i < n; i++) { const ds = []; for (let j = 0; j < n; j++) if (j !== i) ds.push([d(i, j), j]); ds.sort((a, b) => a[0] - b[0]); for (let k = 0; k < K; k++) NB[i * K + k] = ds[k][1]; }
    const tour = new Int32Array(n), pos = new Int32Array(n);
    for (let i = 0; i < n; i++) tour[i] = i;
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = tour[i]; tour[i] = tour[j]; tour[j] = x; }
    for (let i = 0; i < n; i++) pos[tour[i]] = i;
    let len = 0; for (let i = 0; i < n; i++) len += d(tour[i], tour[(i + 1) % n]);
    const snaps = new Int16Array((SAF + 1) * n), lens = new Float32Array(SAF + 1), temps = new Float32Array(SAF + 1);
    snaps.set(tour.subarray(0, n).map((v) => v), 0); lens[0] = len;
    const reverse = (i, j) => { // reverse tour[i..j] inclusive, i<=j
      while (i < j) { const a = tour[i], b = tour[j]; tour[i] = b; tour[j] = a; pos[b] = i; pos[a] = j; i++; j--; }
    };
    const T0 = 140, T1 = 0.05, PER = 2600;
    for (let f = 1; f <= SAF; f++) {
      const u = f / SAF, T = u < 0.93 ? T0 * Math.pow(T1 / T0, Math.pow(u / 0.93, 1.6)) : 0;
      for (let m = 0; m < PER; m++) {
        const a = Math.floor(r() * n), c = NB[a * K + Math.floor(r() * K)];
        let i = pos[a], j = pos[c];
        // 2-opt between edges (tour[i], tour[i+1]) and (tour[j], tour[j+1]): connect a–c
        if (i > j) { const x = i; i = j; j = x; }
        if (j - i < 2 || (i === 0 && j === n - 1)) continue;
        const A = tour[i], B = tour[i + 1], Cc = tour[j], Dd = tour[(j + 1) % n];
        const delta = d(A, Cc) + d(B, Dd) - d(A, B) - d(Cc, Dd);
        if (delta < 0 || (T > 0 && r() < Math.exp(-delta / T))) {
          if (j - i <= n / 2) reverse(i + 1, j);
          else { // reverse the complement instead (same tour, shorter work)
            let a2 = j + 1, b2 = i + n; const cnt = (b2 - a2 + 1) >> 1;
            for (let k = 0; k < cnt; k++) { const p = (a2 + k) % n, q = (b2 - k) % n, x = tour[p], y = tour[q]; tour[p] = y; tour[q] = x; pos[y] = p; pos[x] = q; }
          }
          len += delta;
        }
      }
      snaps.set(tour, f * n); lens[f] = len; temps[f] = T;
    }
    TSP = { X, Y, snaps, lens, temps, n };
    return TSP;
  }
  AF.precompute.push(tspInit);
  function drawTour(ctx, tour, n, X, Y, { alpha = 1, lw = 1.6, hueShift = 0, pulseU = -1 } = {}) {
    const SEG = 14;
    for (let s = 0; s < SEG; s++) {
      const a = Math.floor(s * n / SEG), b = Math.floor((s + 1) * n / SEG);
      const p = new Path2D(); p.moveTo(X[tour[a]], Y[tour[a]]);
      for (let i = a + 1; i <= b; i++) { const c = tour[i % n]; p.lineTo(X[c], Y[c]); }
      ctx.strokeStyle = ramp(0.02 + hueShift + (s / SEG) * 0.5, alpha); ctx.lineWidth = lw; ctx.stroke(p);
    }
    if (pulseU >= 0) {
      for (let k = 0; k < 3; k++) {
        const u = (pulseU + k / 3) % 1, i = Math.floor(u * n), c = tour[i];
        glow(ctx, X[c], Y[c], 34, "#ffffff", alpha * 0.9); glow(ctx, X[c], Y[c], 90, C.gold, alpha * 0.45);
      }
    }
  }
  AF.mandelNeeds.push((t) => (t > 204.5 && t < 210.5 ? [183.9] : []));
  AF.scenes.push({
    t0: 184, t1: 212, pre: 2.0,
    draw(ctx, lt, t) {
      const T = tspInit(), n = T.n;
      if (t >= 184) { bgGrad(ctx, "#0a0718", "#010104", W / 2, H / 2); stars(ctx, t, { a: 0.3, drift: 2 }); }
      const ap = t < 184 ? prog(t, 182.2, 183.6) : 1;
      // cities appear as stars on the set
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const sc = t < 184 ? 1 + 0.012 * ease.sine(prog(t, 180, 184)) : 1;
      for (let i = 0; i < n; i++) {
        const x = W / 2 + (T.X[i] - W / 2) * sc, y = H / 2 + (T.Y[i] - H / 2) * sc, tw = 0.6 + 0.4 * Math.sin(t * 3 + i);
        ctx.globalAlpha = ap * (t < 184 ? clamp((t - 182.2 - hash1(i) * 1.2) / 0.3) : 1) * tw; ctx.fillStyle = "#fff4d6"; ctx.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
      }
      ctx.restore();
      if (t < 184) return {};
      const f = clamp(Math.floor((t - TS.sa0) * FPS), 0, SAF), tour = T.snaps.subarray(f * n, (f + 1) * n);
      const settle = prog(t, TS.sa1, TS.sa1 + 1.0), u = prog(t, TS.sa0, TS.sa1);
      // chaos first, order later: line alpha/width follow the temperature
      const chaosA = t < TS.sa0 ? prog(t, 184.4, 185.6) * 0.35 : lerp(0.35, 0.95, ease.in2(u));
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineJoin = "round";
      const pulseU = t > TS.sa1 + 0.5 ? ((t - TS.sa1 - 0.5) / 4) % 1 : -1;
      drawTour(ctx, tour, n, T.X, T.Y, { alpha: chaosA, lw: lerp(0.9, 2.2, ease.in2(u)), hueShift: t * 0.004, pulseU });
      ctx.restore();
      // ghost of the island we came from
      const gh = prog(t, 206.0, 207.2) * (1 - prog(t, 209.0, 210.4));
      if (gh > 0 && AF.drawMandel) { ctx.save(); ctx.globalCompositeOperation = "screen"; AF.drawMandel(ctx, 183.9, gh * 0.2); ctx.restore(); }
      // HUD
      const ha = prog(t, 186.0, 186.6) * (1 - prog(t, 210.4, 211.2));
      ctx.save(); ctx.globalAlpha = ha; ctx.fillStyle = "rgba(4,2,10,.55)"; ctx.fillRect(110, 92, 470, 214); ctx.restore();
      text(ctx, "SIMULATED ANNEALING · 模拟退火", 140, 126, { size: 22, weight: 600, font: F.ui, color: "#f7e7ff", align: "left", alpha: ha, ls: 3 });
      text(ctx, `length   ${Math.round(T.lens[f]).toLocaleString("en-US")}`, 140, 176, { size: 28, font: F.mono, color: "#ffffff", align: "left", alpha: ha });
      text(ctx, `T        ${T.temps[f].toFixed(T.temps[f] < 1 ? 2 : 1)}`, 140, 218, { size: 28, font: F.mono, color: C.rose, align: "left", alpha: ha });
      mathText(ctx, "P(accept) = e^{−ΔE/T}", 140, 270, { size: 30, color: "#ffd9e6", align: "left", alpha: ha });
      // the length curve
      if (ha > 0) {
        const x0 = 1340, x1 = 1780, y0 = 290, y1 = 120, Lmax = T.lens[0], Lmin = T.lens[SAF];
        const pts = []; for (let k = 0; k <= f; k += 3) pts.push([lerp(x0, x1, k / SAF), lerp(y0, y1, 1 - (T.lens[k] - Lmin) / (Lmax - Lmin))]);
        ctx.save(); ctx.globalAlpha = ha; ctx.fillStyle = "rgba(4,2,10,.55)"; ctx.fillRect(x0 - 30, y1 - 40, x1 - x0 + 60, y0 - y1 + 80); ctx.restore();
        line(ctx, [[x0, y0], [x1, y0]], "#6b5c86", ha, 1); line(ctx, pts, C.rose, ha, 2.5);
        text(ctx, "TOUR LENGTH", x0, y1 - 18, { size: 16, weight: 600, font: F.ui, color: "#cdbfe8", align: "left", alpha: ha, ls: 3 });
        text(ctx, `−${Math.round((1 - T.lens[f] / Lmax) * 100)}%`, x1, y1 - 18, { size: 18, font: F.mono, color: C.rose, align: "right", alpha: ha });
      }
      if (lt < 0.6) glow(ctx, W / 2, H / 2, 1000 * (1 - lt / 0.6), "#ffffff", 1 - lt / 0.6);
      return { bloom: 1.1, streak: 0.4 };
    },
  });

  // ======================================================================== VII · gradient descent on a loss landscape (212–224)
  const LE = TL.learn;
  const LOSS = (x, y) => 1.25 - 1.05 * Math.exp(-((x - 1.2) ** 2 + (y + 0.8) ** 2) / 0.8) - 0.62 * Math.exp(-((x + 1.4) ** 2 + (y - 1.0) ** 2) / 0.6)
    - 0.42 * Math.exp(-((x + 0.3) ** 2 + (y + 1.9) ** 2) / 0.45) + 0.045 * (x * x + y * y) + 0.07 * Math.sin(1.7 * x) * Math.cos(1.3 * y);
  const GRAD = (x, y) => { const e = 1e-3; return [(LOSS(x + e, y) - LOSS(x - e, y)) / (2 * e), (LOSS(x, y + e) - LOSS(x, y - e)) / (2 * e)]; };
  const GDF = Math.round((LE.gd1 - LE.gd0 + 2) * FPS), NP = 300;
  let GD = null;
  function gdInit() {
    if (GD) return GD;
    const r = rng(1847), P = new Float32Array(GDF * NP * 2);
    const x = new Float32Array(NP), y = new Float32Array(NP), vx = new Float32Array(NP), vy = new Float32Array(NP);
    for (let i = 0; i < NP; i++) { x[i] = (r() * 2 - 1) * 2.9; y[i] = (r() * 2 - 1) * 2.9; }
    for (let f = 0; f < GDF; f++) {
      for (let i = 0; i < NP; i++) {
        if (f > 36) { const [gx, gy] = GRAD(x[i], y[i]); vx[i] = 0.93 * vx[i] - 0.006 * gx; vy[i] = 0.93 * vy[i] - 0.006 * gy; x[i] += vx[i]; y[i] += vy[i]; }
        P[(f * NP + i) * 2] = x[i]; P[(f * NP + i) * 2 + 1] = y[i];
      }
    }
    GD = { P };
    return GD;
  }
  AF.precompute.push(gdInit);
  AF.scenes.push({
    t0: 212, t1: 224, post: 0.4,
    draw(ctx, lt, t) {
      bgGrad(ctx, "#08121f", "#010206", W / 2, H * 0.55);
      stars(ctx, t, { a: 0.35, drift: 2 });
      const G = gdInit(), f = clamp(Math.floor((t - LE.gd0) * FPS), 0, GDF - 1);
      const cm = { yaw: lerp(-0.75, 0.55, ease.sine(prog(t, 212, 224.4))), pitch: lerp(0.95, 0.78, ease.sine(prog(t, 212, 224.4))), dist: lerp(1700, 1250, ease.io(prog(t, 212, 224.4))) };
      const P = cam3({ ...cm, fov: 1150, cy: 560 }), S = 230, HS = 520;
      const proj = (x, y, h) => P(x * S, -h * HS + 260, y * S);
      // wireframe surface
      const N = 46, R = 3.0;
      ctx.save(); ctx.lineWidth = 1.1;
      for (let dir = 0; dir < 2; dir++) for (let a = 0; a <= N; a++) {
        let prev = null;
        for (let b = 0; b <= N; b++) {
          const x = -R + 2 * R * (dir ? a : b) / N, y = -R + 2 * R * (dir ? b : a) / N, h = LOSS(x, y), p = proj(x, y, h);
          if (prev && p) { const hh = clamp((h - 0.15) / 1.4); ctx.strokeStyle = hexA(mix(C.cyan, "#8a5cff", hh), 0.22 + 0.45 * (1 - hh) * clamp(1.6 - p.z / 1800)); ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
          prev = p;
        }
      }
      ctx.restore();
      // the walkers
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < NP; i++) {
        const pts = [];
        for (let k = Math.max(0, f - 26); k <= f; k++) { const x = G.P[(k * NP + i) * 2], y = G.P[(k * NP + i) * 2 + 1], p = proj(x, y, LOSS(x, y) + 0.02); if (p) pts.push([p.x, p.y]); }
        if (pts.length > 1) line(ctx, pts, C.gold, 0.55, 1.6);
        const e = pts[pts.length - 1]; if (e) { dot(ctx, e[0], e[1], 2.6, "#fff7e0", 0.95); glow(ctx, e[0], e[1], 16, C.gold, 0.5); }
      }
      ctx.restore();
      const gm = proj(1.2, -0.8, LOSS(1.2, -0.8)); if (gm) { glow(ctx, gm.x, gm.y, 120, C.cyan, 0.5 + 0.3 * Math.sin(t * 4)); }
      const ha = prog(t, 214.0, 214.6) * (1 - prog(t, 223.2, 223.8));
      text(ctx, "GRADIENT DESCENT · 梯度下降", 140, 126, { size: 22, weight: 600, font: F.ui, color: "#e2f2ff", align: "left", alpha: ha, ls: 3 });
      mathText(ctx, "θ ← θ − η∇L(θ)", 140, 186, { size: 44, color: "#ffffff", align: "left", alpha: ha });
      text(ctx, `${NP} walkers · step ${Math.max(0, f - 36)}`, 140, 240, { size: 22, font: F.mono, color: "#9fc6e8", align: "left", alpha: ha });
      if (lt < 0.6) glow(ctx, W / 2, H / 2, 1000 * (1 - lt / 0.6), "#ffffff", 1 - lt / 0.6);
      return { bloom: 0.9, streak: 0.3 };
    },
  });

  // ======================================================================== VII · a neural network learns two spirals (224–244)
  const NN = D.NN, H1 = NN.H1, H2 = NN.H2, NPAR = 2 * H1 + H1 + H1 * H2 + H2 + H2 + 1;
  const WALL = (() => { const bin = atob(NN.w), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Float32Array(u.buffer); })();
  const NSNAP = NN.epochs.length;
  function weightsAt(t) {
    const s = clamp((t - LE.train0) / (LE.train1 - LE.train0)) * (NSNAP - 1), i = Math.floor(s), j = Math.min(NSNAP - 1, i + 1), u = s - i;
    const w = new Float32Array(NPAR); for (let k = 0; k < NPAR; k++) w[k] = lerp(WALL[i * NPAR + k], WALL[j * NPAR + k], u);
    return { w, i, j, u, s };
  }
  const BX0 = 1000, BY0 = 212, BW = 760, BH = 684, GXN = 160, GYN = 144;
  let NNC = null;
  function boundary(w) {
    if (!NNC) { const cv = mkCanvas(GXN, GYN); NNC = { cv, g: cv.getContext("2d") }; NNC.img = NNC.g.createImageData(GXN, GYN); }
    const W1 = 0, b1 = 2 * H1, W2 = b1 + H1, b2 = W2 + H1 * H2, W3 = b2 + H2, b3 = W3 + H2, h1 = new Float32Array(H1), h2 = new Float32Array(H2), d = NNC.img.data;
    for (let gy = 0; gy < GYN; gy++) for (let gx = 0; gx < GXN; gx++) {
      const x = (-1.3 + 2.6 * (gx + 0.5) / GXN) * NN.scale, y = (1.17 - 2.34 * (gy + 0.5) / GYN) * NN.scale;
      for (let j = 0; j < H1; j++) h1[j] = Math.tanh(x * w[W1 + j] + y * w[W1 + H1 + j] + w[b1 + j]);
      for (let j = 0; j < H2; j++) { let s = w[b2 + j]; for (let i = 0; i < H1; i++) s += h1[i] * w[W2 + i * H2 + j]; h2[j] = Math.tanh(s); }
      let o = w[b3]; for (let j = 0; j < H2; j++) o += h2[j] * w[W3 + j]; o = 1 / (1 + Math.exp(-o));
      const edge = Math.exp(-Math.pow((o - 0.5) * 26, 2)) * 0.62, k = (gy * GXN + gx) * 4;
      const c0 = [40, 170, 255], c1 = [255, 150, 60], m = o;
      d[k] = (c0[0] * (1 - m) + c1[0] * m) * 0.42 + edge * 210; d[k + 1] = (c0[1] * (1 - m) + c1[1] * m) * 0.42 + edge * 210; d[k + 2] = (c0[2] * (1 - m) + c1[2] * m) * 0.42 + edge * 210; d[k + 3] = 255;
    }
    NNC.g.putImageData(NNC.img, 0, 0);
    return NNC.cv;
  }
  const NODES = (() => { const cols = [2, H1, H2, 1], xs = [210, 420, 640, 860], out = []; cols.forEach((n, c) => { for (let i = 0; i < n; i++) out.push([xs[c], 510 + (i - (n - 1) / 2) * (n > 4 ? 34 : 120), c, i]); }); return out; })();
  const node = (c, i) => NODES.find((p) => p[2] === c && p[3] === i);
  AF.scenes.push({
    t0: 224, t1: 244, post: 0.5,
    draw(ctx, lt, t) {
      bgGrad(ctx, "#0b0b1c", "#010105", W / 2, H / 2);
      const { w, i: si } = weightsAt(t), ep = Math.round(lerp(NN.epochs[si], NN.epochs[Math.min(NSNAP - 1, si + 1)], weightsAt(t).u));
      const acc = lerp(NN.acc[si], NN.acc[Math.min(NSNAP - 1, si + 1)], weightsAt(t).u), loss = lerp(NN.loss[si], NN.loss[Math.min(NSNAP - 1, si + 1)], weightsAt(t).u);
      const ap = ease.out(prog(t, 224.0, 225.2)), out = ease.in(prog(t, 243.6, 244.4));
      ctx.save(); ctx.globalAlpha = ap * (1 - out);
      // decision boundary
      const cv = boundary(w);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(cv, BX0, BY0, BW, BH); ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1; ctx.strokeRect(BX0, BY0, BW, BH);
      for (let k = 0; k < NN.Y.length; k++) {
        const x = BX0 + (NN.X[2 * k] + 1.3) / 2.6 * BW, y = BY0 + (1.17 - NN.X[2 * k + 1]) / 2.34 * BH;
        ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 7); ctx.fillStyle = NN.Y[k] ? "#ffb15c" : "#5ad1ff"; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.lineWidth = 1.2; ctx.stroke();
      }
      // the network
      const edges = [];
      const W1 = 0, W2 = 3 * H1, W3 = W2 + H1 * H2 + H2;
      for (let a = 0; a < 2; a++) for (let b = 0; b < H1; b++) edges.push([node(0, a), node(1, b), w[W1 + a * H1 + b]]);
      for (let a = 0; a < H1; a++) for (let b = 0; b < H2; b++) edges.push([node(1, a), node(2, b), w[W2 + a * H2 + b]]);
      for (let a = 0; a < H2; a++) edges.push([node(2, a), node(3, 0), w[W3 + a]]);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const sign of [1, -1]) for (let q = 1; q <= 6; q++) {
        const p = new Path2D(); let any = false;
        for (const [A, B, wt] of edges) { const m = Math.min(6, Math.ceil(Math.abs(wt) * 2.2)); if (Math.sign(wt) !== sign || m !== q) continue; p.moveTo(A[0], A[1]); p.lineTo(B[0], B[1]); any = true; }
        if (!any) continue; ctx.strokeStyle = hexA(sign > 0 ? C.cyan : C.rose, 0.05 + q * 0.07); ctx.lineWidth = 0.6 + q * 0.35; ctx.stroke(p);
      }
      // signals travelling on the beat
      const kb = Math.floor(t * 2), ph = (t * 2) % 1, r = rng(kb * 31 + 7);
      for (let k = 0; k < 14; k++) { const [A, B] = edges[Math.floor(r() * edges.length)]; glow(ctx, lerp(A[0], B[0], ph), lerp(A[1], B[1], ph), 18, "#ffffff", 0.9 * (1 - ph)); }
      ctx.restore();
      for (const [x, y, c] of NODES) { dot(ctx, x, y, c === 0 || c === 3 ? 10 : 6.5, "#0b0b1c", 1); ring(ctx, x, y, c === 0 || c === 3 ? 10 : 6.5, c === 3 ? C.amber : "#e9eeff", 0.95, 2); }
      text(ctx, "x", 180, 510 - 60, { size: 26, font: F.lm, italic: true, color: "#cfd8ff", align: "right" });
      text(ctx, "y", 180, 510 + 60, { size: 26, font: F.lm, italic: true, color: "#cfd8ff", align: "right" });
      text(ctx, "2 → 20 → 20 → 1", 535, 900, { size: 22, font: F.mono, color: "#9aa6d6" });
      // stats
      text(ctx, "NEURAL NETWORK · 神经网络", 140, 126, { size: 22, weight: 600, font: F.ui, color: "#eaeaff", align: "left", ls: 3 });
      text(ctx, `epoch ${String(ep).padStart(4, " ")}`, 140, 176, { size: 28, font: F.mono, color: "#ffffff", align: "left" });
      text(ctx, `loss  ${loss.toFixed(4)}`, 140, 218, { size: 28, font: F.mono, color: C.rose, align: "left" });
      text(ctx, `${Math.round(acc * 100)}%`, BX0 + BW, BY0 - 44, { size: 60, weight: 300, font: F.ui, color: acc >= 0.999 ? C.lime : "#ffffff", align: "right" });
      text(ctx, "ACCURACY · 准确率", BX0, BY0 - 34, { size: 18, weight: 600, font: F.ui, color: "#aab3dc", align: "left", ls: 3 });
      ctx.restore();
      const done = prog(t, LE.train1, LE.train1 + 1.2);
      if (done > 0 && done < 1) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (1 - done) * 0.5; ctx.drawImage(boundary(w), BX0, BY0, BW, BH); ctx.restore(); }
      if (lt < 0.6) glow(ctx, W / 2, H / 2, 1000 * (1 - lt / 0.6), "#ffffff", 1 - lt / 0.6);
      return { bloom: 0.85, streak: 0.25 };
    },
  });

  // ======================================================================== VII · this film is an algorithm (244–250)
  let CODE = null;
  AF.precompute.push(async () => {
    try {
      const files = ["core.js", "scenes_a.js", "scenes_b.js", "scenes_c.js", "scenes_d.js"];
      const txt = await Promise.all(files.map((f) => fetch(f).then((r) => r.text()).catch(() => "")));
      CODE = txt.join("\n").split("\n").filter((l) => l.trim().length > 0).map((l) => l.slice(0, 92));
    } catch (e) { CODE = []; }
    if (!CODE.length) CODE = ["// source unavailable"];
  });
  function codeColor(l) {
    if (/^\s*\/\//.test(l)) return "#6f7aa0";
    if (/\b(function|const|let|return|for|if|else)\b/.test(l)) return "#f6c770";
    return "#c9d2f0";
  }
  AF.scenes.push({
    t0: 244, t1: 250,
    draw(ctx, lt, t) {
      ctx.fillStyle = "#03030a"; ctx.fillRect(0, 0, W, H);
      const lines = CODE || [], n = lines.length, speed = 34 + lt * 26, off = Math.floor(lt * speed + lt * lt * 40);
      ctx.save(); ctx.globalAlpha = prog(lt, 0, 0.4) * (1 - prog(t, 249.3, 250));
      for (let col = 0; col < 3; col++) for (let k = 0; k < 40; k++) {
        const l = lines[(off + k + col * 211) % n] || "", y = 60 + k * 26 - ((lt * speed * 26) % 26);
        text(ctx, l, 70 + col * 620, y, { size: 15, font: F.mono, color: codeColor(l), align: "left", alpha: 0.55 });
      }
      ctx.restore();
      const g = ctx.createRadialGradient(W / 2, H / 2 - 40, 50, W / 2, H / 2 - 40, 700); g.addColorStop(0, "rgba(3,3,10,.92)"); g.addColorStop(1, "rgba(3,3,10,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const a = prog(lt, 0.3, 1.0) * (1 - prog(t, 249.3, 250));
      text(ctx, "THIS FILM IS AN ALGORITHM", W / 2, 400, { size: 50, weight: 300, font: F.lm, color: "#ffffff", alpha: a, ls: 12 });
      text(ctx, "这部影片，本身就是一段算法", W / 2, 470, { size: 34, weight: 400, font: F.serif, color: C.gold, alpha: a, ls: 8 });
      text(ctx, `9,000 frames  ·  ${n.toLocaleString("en-US")} lines of code  ·  0 cameras  ·  0 recorded sounds`, W / 2, 560, { size: 22, font: F.mono, color: "#aeb6dc", alpha: a * prog(lt, 1.2, 1.8) });
      return { bloom: 0.8, streak: 0.2 };
    },
  });

  // ======================================================================== MONTAGE (250–272)
  const SHOTS = [[11.4, 1.6], [21.0, 1.0], [33.0, 1.0], [40.0, 1.0], [53.0, 1.2], [65.0, 1.2], [78.5, 1.4], [96.8, 1.0], [104.5, 1.3], [113.0, 1.0],
    [127.0, 1.0], [142.0, 1.4], [153.5, 1.2], [170.0, 1.0], [181.0, 1.0], [188.5, 1.0], [207.0, 1.1], [219.0, 1.0], [236.0, 1.0], [56.0, 1.3],
    [84.0, 1.0], [109.0, 1.1], [131.0, 1.0], [176.0, 1.0]];
  const GRID = [[47.0], [79.0], [106.0], [125.0], [135.5], [147.0], [175.0], [202.0], [236.0]];
  const sceneAt = (tt) => AF.scenes.find((s) => tt >= s.t0 && tt < s.t1 && s !== MONTAGE && s !== FINALE);
  function drawAt(ctx, tt) { const s = sceneAt(tt); if (!s) return; ctx.save(); s.draw(ctx, tt - s.t0, tt); ctx.restore(); }
  function shotTime(t) { const k = clamp(Math.floor((t - 250) / 0.5), 0, SHOTS.length - 1); return { k, tt: SHOTS[k][0] + (t - 250 - k * 0.5), z: SHOTS[k][1] }; }
  AF.mandelNeeds.push((t) => {
    const out = [];
    if (t >= 250 && t < 262) { const { tt } = shotTime(t); if (tt >= 156 && tt < 184) out.push(tt); }
    if (t >= 262 && t < 272) for (const [g] of GRID) { const tt = g + (t - 262); if (tt >= 156 && tt < 184) out.push(tt); }
    return out;
  });
  let tiles = null;
  const MONTAGE = {
    t0: 250, t1: 272,
    draw(ctx, lt, t) {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      if (t < 262) {
        const { k, tt, z } = shotTime(t), ls = (t - 250) % 0.5;
        const zz = z * (1 + 0.06 * ls / 0.5);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zz, zz); ctx.rotate((k % 2 ? 1 : -1) * 0.01 * ls); ctx.translate(-W / 2, -H / 2);
        drawAt(ctx, tt); ctx.restore();
        if (ls < 0.1 && k % 2 === 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (1 - ls / 0.1) * 0.12; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
        const lab = AF.CHS ? AF.CHS.find((c) => tt >= c[0] && tt < c[1]) : null;
        if (lab) { text(ctx, lab[2], 80, 980, { size: 54, font: F.lm, color: "#ffffff", align: "left", alpha: 0.9 }); text(ctx, lab[3], 80 + 30 + 34 * lab[2].length, 982, { size: 30, weight: 700, font: F.serif, color: lab[6], align: "left", alpha: 0.9 }); }
      } else {
        // nine algorithms at once, then they fall into one point
        if (!tiles) tiles = GRID.map(() => { const c = mkCanvas(640, 360); return { c, g: c.getContext("2d") }; });
        const coll = ease.inExpo(prog(t, 266.4, 271.0));
        GRID.forEach(([g0], i) => {
          const tt = g0 + (t - 262), tl = tiles[i];
          tl.g.save(); tl.g.setTransform(1, 0, 0, 1, 0, 0); tl.g.fillStyle = "#000"; tl.g.fillRect(0, 0, 640, 360); tl.g.scale(1 / 3, 1 / 3); drawAt(tl.g, tt); tl.g.restore();
          const cx = (i % 3) * 640 + 320, cy = Math.floor(i / 3) * 360 + 180;
          const x = lerp(cx, W / 2, coll), y = lerp(cy, H / 2, coll), s = (1 - coll) * (0.94 + 0.06 * ease.outBack(prog(t, 262 + i * 0.06, 262.5 + i * 0.06)));
          ctx.save(); ctx.translate(x, y); ctx.rotate(coll * (i - 4) * 0.3); ctx.scale(s, s); ctx.drawImage(tl.c, -320, -180); ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 2; ctx.strokeRect(-320, -180, 640, 360); ctx.restore();
        });
        glow(ctx, W / 2, H / 2, 40 + coll * 300, C.gold, coll * 1.4); glow(ctx, W / 2, H / 2, 12 + coll * 40, "#ffffff", coll * 1.5);
        if (t > 271.4) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); dot(ctx, W / 2, H / 2, 3, "#fff1d0", 1); glow(ctx, W / 2, H / 2, 40, C.gold, 1); }
      }
      return { bloom: 0.9, streak: 0.4, chroma: 1.4 };
    },
  };
  AF.scenes.push(MONTAGE);

  // ======================================================================== FINALE (272–300)
  const FINALE = {
    t0: 272, t1: 300,
    draw(ctx, lt, t) {
      bgGrad(ctx, "#120d06", "#010101", W / 2, H * 0.48);
      stars(ctx, t, { a: 0.5 * prog(t, 273, 278), drift: 3 });
      // the first algorithm, once more, from a single point of light
      const EU = TL.euclid, RW = 900, RS = RW / EU.a, RH = EU.b * RS, RX = (W - RW) / 2, RY = 330;
      const ra = prog(t, 272.2, 272.8) * (1 - prog(t, 285.8, 286.6));
      const push = 1 + 0.06 * ease.sine(prog(t, 272, 286));
      if (ra > 0) {
        const op = ease.outExpo(prog(t, 272.2, 273.6));
        ctx.save(); ctx.translate(W / 2, RY + RH / 2); ctx.scale(push, push); ctx.translate(-W / 2, -(RY + RH / 2));
        ctx.globalAlpha = ra; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6;
        ctx.strokeRect(W / 2 - RW / 2 * op, RY + RH / 2 - RH / 2 * op, RW * op, RH * op);
        EU.squares.forEach((sq, i) => {
          const ts = 273.6 + i * 0.25; if (t < ts) return;
          const q = ease.out(prog(t, ts, ts + 0.35)), x = RX + sq[0] * RS, y = RY + sq[1] * RS, w = sq[2] * RS;
          ctx.fillStyle = hexA(C.gold, 0.12 * q); ctx.fillRect(x, y, w * q, w); ctx.strokeStyle = hexA(C.gold, 0.85 * q); ctx.lineWidth = 1.2; ctx.strokeRect(x + 0.5, y + 0.5, w * q - 1, w - 1);
        });
        // compass circles inscribed in every square, drawn like Euclid's own construction
        const sp = prog(t, 276.6, 283.0);
        if (sp > 0) {
          ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#fff0c8"; ctx.lineCap = "round";
          const n = EU.squares.length;
          EU.squares.forEach((sq, i) => {
            const f = ease.io(clamp(sp * (n + 2) / 3 - i * 0.22)); if (f <= 0) return;
            const x = RX + sq[0] * RS, y = RY + sq[1] * RS, w = sq[2] * RS;
            ctx.lineWidth = w > 100 ? 2 : 1.3; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.arc(x + w / 2, y + w / 2, w / 2 * 0.98, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
            if (f < 1) { const a = -Math.PI / 2 + f * Math.PI * 2; glow(ctx, x + w / 2 + Math.cos(a) * w / 2, y + w / 2 + Math.sin(a) * w / 2, 30, C.gold, 1); }
          });
          ctx.restore();
        }
        ctx.restore();
        glow(ctx, W / 2, RY + RH / 2, 700, C.gold, 0.12 * ra);
      }
      if (t < 272.6) { glow(ctx, W / 2, H / 2, 60, C.gold, 1); dot(ctx, W / 2, H / 2, 3, "#fff", 1); }
      // the rectangle dissolves into the particles that write the title
      if (t >= 285.6 && t < 288.6 && AF.titlePoints) {
        const pts = AF.titlePoints(), q = ease.io(prog(t, 285.8, 288.0)), r0 = rng(9);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < pts.length; i += 2) {
          const pp = pts[i], e = Math.floor(r0() * 4), u = r0();
          const sx = e === 0 ? RX + u * RW : e === 1 ? RX + RW : e === 2 ? RX + u * RW : RX, sy = e === 0 ? RY : e === 1 ? RY + u * RH : e === 2 ? RY + RH : RY + u * RH;
          const qq = ease.io(clamp((q - pp.d * 0.3) / 0.7)), x = lerp(sx, pp.x, qq), y = lerp(sy, pp.y - 20, qq) - Math.sin(qq * Math.PI) * 80 * (pp.u - 0.5);
          ctx.globalAlpha = 0.8 * (1 - prog(t, 288.0, 288.6)); ctx.fillStyle = "#ffe3a8"; ctx.fillRect(x - 1, y - 1, 2.4, 2.4);
        }
        ctx.restore();
      }
      // final lockup on the last impact
      const fa = prog(t, 288.0, 288.5), lp = t - 288;
      if (fa > 0) {
        for (let k = 0; k < 2; k++) { const p = prog(lp, k * 0.1, 1.8 + k * 0.4); ring(ctx, W / 2, H / 2 - 40, p * 1400, k ? C.gold : "#ffffff", (1 - p) * 0.75, 4 - k * 1.5); }
        const ls = lerp(70, 34, ease.outExpo(prog(lp, 0, 3)));
        const g = ctx.createLinearGradient(W / 2 - 520, 0, W / 2 + 520, 0), sh = clamp(lp / 4);
        g.addColorStop(0, "#e8a64f"); g.addColorStop(clamp(sh - 0.1), "#f5c47e"); g.addColorStop(clamp(sh), "#fff3e0"); g.addColorStop(clamp(sh + 0.1), "#f5c47e"); g.addColorStop(1, "#d48d3f");
        ctx.save(); ctx.translate(W / 2, H / 2 - 60); const s = 1 + lp * 0.004; ctx.scale(s, s);
        text(ctx, "算法之美", ls / 2, 0, { size: 210, weight: 900, font: F.serif, color: g, alpha: fa, ls });
        text(ctx, decode("THE BEAUTY OF ALGORITHMS", prog(lp, 0.2, 1.6), 3), 0, 150, { size: 44, font: F.lm, color: "#f2ead8", alpha: fa, ls: 22 });
        const lw = ease.outExpo(prog(lp, 0.6, 1.8)) * 760; ctx.globalAlpha = fa; ctx.fillStyle = hexA(C.gold, 0.85); ctx.fillRect(-lw / 2, 104, lw, 1.5);
        ctx.restore();
        const ca = prog(lp, 2.2, 3.4);
        text(ctx, "每一帧、每一个音符，皆由计算生成", W / 2, H - 230, { size: 26, weight: 400, font: F.serif, color: "#d9ccb0", alpha: ca, ls: 6 });
        text(ctx, "EVERY FRAME AND EVERY NOTE COMPUTED BY CLAUDE OPUS 5.5", W / 2, H - 186, { size: 17, weight: 500, font: F.ui, color: "#8f8670", alpha: ca, ls: 5 });
        streak(ctx, W / 2, H / 2 - 60, 2400, "#ffe2b0", (1 - prog(lp, 0, 2.5)) * 0.8, 2);
      }
      return { letterbox: ease.io(prog(t, 272, 276)), bloom: 1.05, streak: 0.6 };
    },
  };
  AF.scenes.push(FINALE);
})();
