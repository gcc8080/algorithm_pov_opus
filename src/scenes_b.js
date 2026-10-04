// Scenes B — II · Searching (binary search, maze), III · Fourier
(function () {
  const { W, H, C, F, E, TL, D, clamp, lerp, prog, smooth, ease, rng, hash1, pulse, since, spec, energy, hexA, mix, ramp, rampRGB,
    mkCanvas, glow, streak, text, decode, mathText, line, ring, dot, kf, stars, bgGrad } = AF;
  AF.precompute = AF.precompute || [];
  const rampHex = (u) => { const c = rampRGB(u); return "#" + ((1 << 24) | ((c[0] | 0) << 16) | ((c[1] | 0) << 8) | (c[2] | 0)).toString(16).slice(1); };

  // ======================================================================== II · binary search (60–68)
  const BS = TL.search.bs, STEPS = BS.steps, BS_END = BS.t0 + STEPS.length * BS.step;
  const fmt = (v) => Math.round(v).toLocaleString("en-US");
  function bsView(t) {
    const k = Math.floor((t - BS.t0) / BS.step);
    const iv = (i) => { if (i < 0) return [BS.lo, BS.hi]; const [lo, hi, mid, d] = STEPS[Math.min(i, STEPS.length - 1)]; return d > 0 ? [mid + 1, hi] : d < 0 ? [lo, mid - 1] : [mid - 3, mid + 3]; };
    const pad = (r) => { const w = Math.max(r[1] - r[0], 6); return [r[0] - w * 0.12, r[1] + w * 0.12]; };
    const A = pad(iv(k - 1)), B = pad(iv(k));
    if (k < 0) return { lo: A[0], hi: A[1] };
    const q = ease.io(clamp((t - BS.t0 - k * BS.step) / (BS.step * 0.9)));
    const wv = Math.exp(lerp(Math.log(A[1] - A[0]), Math.log(B[1] - B[0]), q)), c = lerp((A[0] + A[1]) / 2, (B[0] + B[1]) / 2, q);
    return { lo: c - wv / 2, hi: c + wv / 2 };
  }
  function niceStep(span, target = 9) {
    const raw = span / target, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return Math.max(1, (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p);
  }
  AF.scenes.push({
    t0: 60, t1: 68,
    draw(ctx, lt, t) {
      bgGrad(ctx, "#05202a", "#010509", W / 2, H * 0.5);
      stars(ctx, t, { a: 0.4, drift: 3, color: "#bdf3ff" });
      const v = bsView(Math.min(t, BS_END - 0.01)), X0 = 160, X1 = 1760, Y = 560;
      const xOf = (val) => X0 + (val - v.lo) / (v.hi - v.lo) * (X1 - X0);
      const app = ease.outExpo(prog(lt, 0.2, 1.6)), out = ease.in(prog(t, 67.5, 68.0));
      ctx.save(); ctx.globalAlpha = 1 - out;
      line(ctx, [[W / 2 - (W / 2 - X0 + 60) * app, Y], [W / 2 + (X1 + 60 - W / 2) * app, Y]], C.cyan, 0.9, 2, 4);
      const st = niceStep(v.hi - v.lo);
      for (let tv = Math.ceil(v.lo / st) * st; tv <= v.hi; tv += st) {
        const x = xOf(tv); if (x < X0 - 40 || x > X1 + 40) continue;
        const big = Math.abs(tv / (st * 5) - Math.round(tv / (st * 5))) < 1e-6;
        ctx.save(); ctx.globalAlpha *= app; ctx.fillStyle = hexA(C.cyan, big ? 0.9 : 0.5); ctx.fillRect(x - 0.75, Y - (big ? 16 : 9), 1.5, big ? 32 : 18); ctx.restore();
        text(ctx, fmt(tv), x, Y + 46, { size: big ? 22 : 17, font: F.lm, color: big ? "#d9f6ff" : "#7fb7c8", alpha: app * (big ? 1 : 0.65) });
      }
      if (t >= BS.t0) {
        const k = Math.min(STEPS.length - 1, Math.floor((t - BS.t0) / BS.step)), [lo, hi, mid, d] = STEPS[k], ls = t - BS.t0 - k * BS.step;
        const xm = xOf(mid), fl = 1 - prog(ls, 0, 0.22);
        if (d !== 0) {
          ctx.save(); const sg = d > 0 ? ctx.createLinearGradient(xm - 40, 0, xm, 0) : ctx.createLinearGradient(xm, 0, xm + 40, 0);
          sg.addColorStop(d > 0 ? 0 : 1, "rgba(0,6,10,0.6)"); sg.addColorStop(d > 0 ? 1 : 0, "rgba(0,6,10,0.35)"); ctx.fillStyle = sg;
          if (d > 0) ctx.fillRect(0, 300, xm, 520); else ctx.fillRect(xm, 300, W - xm, 520);
          ctx.restore();
          text(ctx, d > 0 ? "太小 too small" : "太大 too large", d > 0 ? xm - 26 : xm + 26, Y - 96, { size: 22, font: F.ui, color: "#ffb4a8", align: d > 0 ? "right" : "left", alpha: 0.9 * (1 - prog(ls, 0.16, 0.25)) });
        }
        line(ctx, [[xm, Y - 120], [xm, Y + 22]], "#ffffff", 0.95, 2, 5);
        glow(ctx, xm, Y, 120, d === 0 ? C.gold : C.cyan, 0.8 * fl + 0.3);
        text(ctx, "mid = " + fmt(mid), xm, Y - 146, { size: 26, font: F.mono, color: "#ffffff", alpha: 0.95 });
        for (let i = 0; i < STEPS.length; i++) {
          const x = W / 2 - STEPS.length * 22 / 2 + i * 22, on = i <= k;
          ctx.save(); ctx.globalAlpha = on ? 1 : 0.25; ctx.fillStyle = i === k ? "#ffffff" : on ? C.cyan : "#2c4a55"; ctx.fillRect(x, 258, 16, 16); ctx.restore();
        }
        text(ctx, `STEP ${String(k + 1).padStart(2, "0")} / 20`, W / 2, 228, { size: 24, weight: 600, font: F.mono, color: "#cdefff", ls: 4 });
      }
      const found = prog(t, BS_END - 0.05, BS_END + 0.3);
      text(ctx, found > 0 ? fmt(BS.target) : "?", W / 2, 150, { size: found > 0 ? 80 : 66, font: F.lm, color: found > 0 ? C.gold : "#ffffff", alpha: app });
      text(ctx, "目标 TARGET", W / 2, 92, { size: 18, weight: 500, font: F.ui, color: "#8fc7d6", alpha: app, ls: 6 });
      if (found > 0) {
        const xt = xOf(BS.target); glow(ctx, xt, Y, 260, C.gold, found); ring(ctx, xt, Y, found * 320, C.gold, 1 - found, 3);
        text(ctx, "20 步", W / 2 + 300, 150, { size: 54, weight: 900, font: F.sans, color: "#ffffff", alpha: found, align: "left" });
        mathText(ctx, "log_2 10^6 ≈ 20", W / 2 - 300, 150, { size: 40, color: C.cyan, alpha: found, align: "right" });
      }
      ctx.restore();
      if (out > 0) glow(ctx, W / 2, Y, 100 + out * 900, "#d6fbff", out * 1.3);
      return { streak: 0.5 };
    },
  });

  // ======================================================================== II · maze: DFS carve, BFS flood, shortest path (68–90)
  const MZ = TL.search.maze, MW = MZ.w, MH = MZ.h, CS = 21, MX0 = (W - MW * CS) / 2, MY0 = 64;
  let MAZE = null;
  function mazeInit() {
    if (MAZE) return MAZE;
    const r = rng(1959), N = MW * MH, vis = new Uint8Array(N), seq = [], edges = [], adj = Array.from({ length: N }, () => []);
    const start = Math.floor(MH / 2) * MW + Math.floor(MW / 2);
    const stack = [start]; vis[start] = 1; seq.push(start);
    while (stack.length) {
      const c = stack[stack.length - 1], x = c % MW, y = (c / MW) | 0, nb = [];
      if (x > 0 && !vis[c - 1]) nb.push(c - 1); if (x < MW - 1 && !vis[c + 1]) nb.push(c + 1);
      if (y > 0 && !vis[c - MW]) nb.push(c - MW); if (y < MH - 1 && !vis[c + MW]) nb.push(c + MW);
      if (nb.length) { const n = nb[Math.floor(r() * nb.length)]; vis[n] = 1; edges.push([c, n, seq.length]); adj[c].push(n); adj[n].push(c); stack.push(n); seq.push(n); }
      else { stack.pop(); if (stack.length) seq.push(stack[stack.length - 1]); }
    }
    const dist = new Int32Array(N).fill(-1), par = new Int32Array(N).fill(-1), q = [start]; dist[start] = 0;
    for (let i = 0; i < q.length; i++) { const u = q[i]; for (const v of adj[u]) if (dist[v] < 0) { dist[v] = dist[u] + 1; par[v] = u; q.push(v); } }
    let goal = 0; for (let i = 0; i < N; i++) if (dist[i] > dist[goal]) goal = i;
    const path = []; for (let c = goal; c >= 0; c = par[c]) path.push(c); path.reverse();
    MAZE = { N, seq, edges, dist, start, goal, path, maxD: dist[goal] };
    return MAZE;
  }
  AF.precompute.push(mazeInit);
  AF.maze = mazeInit;
  const cxy = (c) => [MX0 + (c % MW + 0.5) * CS, MY0 + (((c / MW) | 0) + 0.5) * CS];
  AF.mazeXY = cxy;
  // where the path lands when it becomes the Fourier chapter's first sine wave (matches squareWave() at t = 90)
  const pathToWave = (i, n) => { const u = i / (n - 1); return [760 + u * 1040, 540 + 150 * (4 / Math.PI) * Math.sin(u * Math.PI * 6)]; };
  function drawMaze(ctx, t, opts = {}) {
    const M = mazeInit();
    const carveF = prog(t, MZ.t0, MZ.carve1), floodF = prog(t, MZ.carve1, MZ.flood1);
    const nSeq = Math.floor(ease.sine(carveF) * (M.seq.length - 1));
    let nEdges = 0; { let lo = 0, hi = M.edges.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (M.edges[m][2] <= nSeq) { nEdges = m + 1; lo = m + 1; } else hi = m - 1; } }
    const fadeMaze = 1 - prog(t, 85.0, 87.5), morph = ease.io(prog(t, 86.4, 89.6));
    ctx.save(); ctx.globalAlpha = 0.1 * fadeMaze; ctx.strokeStyle = C.teal; ctx.lineWidth = 1;
    ctx.beginPath(); for (let x = 0; x <= MW; x++) { ctx.moveTo(MX0 + x * CS, MY0); ctx.lineTo(MX0 + x * CS, MY0 + MH * CS); } for (let y = 0; y <= MH; y++) { ctx.moveTo(MX0, MY0 + y * CS); ctx.lineTo(MX0 + MW * CS, MY0 + y * CS); } ctx.stroke(); ctx.restore();
    ctx.save(); ctx.lineCap = "round"; ctx.lineWidth = CS * 0.56;
    if (floodF <= 0) {
      const B = 10, paths = Array.from({ length: B }, () => new Path2D());
      for (let i = 0; i < nEdges; i++) {
        const age = (nSeq - M.edges[i][2]) / 900, bk = Math.min(B - 1, Math.floor(age * B / 2)), [a, c] = M.edges[i], p = cxy(a), q = cxy(c);
        paths[bk].moveTo(p[0], p[1]); paths[bk].lineTo(q[0], q[1]);
      }
      for (let b = B - 1; b >= 0; b--) { ctx.strokeStyle = mix("#ffffff", "#1b8196", Math.min(1, b / (B - 1))); ctx.globalAlpha = 1 - b * 0.035; ctx.stroke(paths[b]); }
      ctx.globalAlpha = 1;
      const hp = cxy(M.seq[Math.min(nSeq, M.seq.length - 1)]);
      if (carveF < 1 && carveF > 0) { glow(ctx, hp[0], hp[1], 70, C.cyan, 1); glow(ctx, hp[0], hp[1], 16, "#fff", 1); }
    } else {
      const Dd = ease.sine(floodF) * M.maxD, NB = 48, paths = Array.from({ length: NB }, () => new Path2D()), dim = new Path2D();
      for (const [a, c] of M.edges) {
        const d = Math.max(M.dist[a], M.dist[c]), p = cxy(a), q = cxy(c);
        if (d <= Dd) { const pb = paths[Math.min(NB - 1, Math.floor(d / M.maxD * NB))]; pb.moveTo(p[0], p[1]); pb.lineTo(q[0], q[1]); }
        else { dim.moveTo(p[0], p[1]); dim.lineTo(q[0], q[1]); }
      }
      ctx.strokeStyle = "#164c58"; ctx.globalAlpha = 0.85 * fadeMaze; ctx.stroke(dim);
      const settle = 1 - 0.8 * prog(t, MZ.flood1 + 0.1, MZ.flood1 + 1.4);
      for (let b = 0; b < NB; b++) {
        const front = Math.max(0, 1 - (Dd - (b + 0.5) / NB * M.maxD) / (M.maxD * 0.05));
        ctx.strokeStyle = mix(rampHex(b / NB * 0.85), "#ffffff", front * 0.85); ctx.globalAlpha = fadeMaze * settle; ctx.stroke(paths[b]);
      }
      ctx.globalAlpha = 1;
      const pf = prog(t, MZ.flood1, MZ.path1 - 0.6);
      if (pf > 0) {
        const n = M.path.length, m = Math.max(2, Math.floor(ease.io(pf) * n)), pts = [];
        for (let i = n - m; i < n; i++) {
          const p = cxy(M.path[i]);
          if (morph > 0) { const w = pathToWave(i, n), mm = ease.io(clamp(morph * 1.3 - (1 - i / n) * 0.3)); pts.push([lerp(p[0], w[0], mm), lerp(p[1], w[1], mm)]); }
          else pts.push(p);
        }
        line(ctx, pts, "#120a00", 0.6 * (1 - morph), 14);
        ctx.globalCompositeOperation = "lighter";
        line(ctx, pts, C.gold, 1, 7, 4); line(ctx, pts, "#fff6dc", 1, 2.4);
        ctx.globalCompositeOperation = "source-over";
        if (pf < 1) { glow(ctx, pts[0][0], pts[0][1], 90, C.gold, 1); glow(ctx, pts[0][0], pts[0][1], 20, "#fff", 1); }
      }
      if (morph < 0.2) {
        const sp = cxy(M.start), gp = cxy(M.goal);
        ring(ctx, sp[0], sp[1], 15, "#ffffff", 0.9 * fadeMaze, 2.5); ring(ctx, gp[0], gp[1], 15, C.gold, 0.9 * fadeMaze, 2.5);
        glow(ctx, gp[0], gp[1], 80, C.gold, (0.6 + 0.4 * Math.sin(t * 6)) * fadeMaze);
      }
    }
    ctx.restore();
    return { nSeq, floodF, carveF };
  }
  AF.drawMaze = drawMaze;
  AF.scenes.push({
    t0: 68, t1: 90,
    draw(ctx, lt, t) {
      const M = mazeInit();
      bgGrad(ctx, "#041a22", "#010407", W / 2, H * 0.5);
      const z = lerp(3.4, 1.0, ease.io(prog(t, 68.0, 70.6)));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      const st = drawMaze(ctx, t);
      ctx.restore();
      const la = prog(t, 68.6, 69.2) * (1 - prog(t, 85.0, 85.6));
      const lbl = t < MZ.carve1 ? ["DEPTH-FIRST · 深度优先", `${Math.min(M.N, Math.round(st.carveF * M.N)).toLocaleString("en-US")} / ${M.N.toLocaleString("en-US")} cells`]
        : t < MZ.flood1 ? ["BREADTH-FIRST · 广度优先", "distance " + Math.floor(ease.sine(st.floodF) * M.maxD)] : ["SHORTEST PATH · 最短路径", (M.path.length - 1) + " steps"];
      ctx.save(); ctx.fillStyle = "rgba(1,8,11,0.72)"; ctx.globalAlpha = la; ctx.fillRect(120, 78, 420, 92); ctx.restore();
      text(ctx, lbl[0], 140, 110, { size: 24, weight: 600, font: F.ui, color: "#e6fbff", align: "left", alpha: la, ls: 4 });
      text(ctx, lbl[1], 140, 146, { size: 22, font: F.mono, color: "#8fd3e2", align: "left", alpha: la });
      if (t < 68.8) glow(ctx, W / 2, H / 2, 600 * (1 - prog(t, 68, 68.8)), "#d6fbff", 1 - prog(t, 68, 68.8));
      return { streak: 0.35 };
    },
  });

  // ======================================================================== III · Fourier (90–118)
  const FO = TL.fourier, FD = D.FOURIER, S_ = 0.7, GX = W / 2, GY = 470;
  const gpt = (re, im) => [GX + re * S_, GY - im * S_];
  let CURVES = null;
  function fourierInit() {
    if (CURVES) return CURVES;
    CURVES = FD.contours.map((c) => {
      const M = 900, pts = [];
      for (let i = 0; i <= M; i++) {
        const u = i / M; let re = c.c0[0], im = c.c0[1];
        for (const [f, a, b] of c.terms) { const ang = 2 * Math.PI * f * u, cs = Math.cos(ang), sn = Math.sin(ang); re += a * cs - b * sn; im += a * sn + b * cs; }
        pts.push(gpt(re, im));
      }
      return pts;
    });
    return CURVES;
  }
  AF.precompute.push(fourierInit);
  AF.fourierCurves = fourierInit;
  function harmonics(t) {
    const hs = [];
    for (let k = 0; k < 60; k++) {
      const on = k < FO.nHarm ? FO.harm0 + k * FO.harmStep : FO.sweep0 + (FO.sweep1 - FO.sweep0) * Math.pow((k - FO.nHarm) / 45, 0.7);
      const a = k === 0 ? 1 : clamp((t - on) / 0.15); if (a <= 0) break; hs.push([2 * k + 1, a]);
    }
    return hs;
  }
  function squareWave(ctx, t) {
    const hs = harmonics(t), R = 150, CXc = 420, CY = 540, ph = (t - 90) * Math.PI * 1.0, out = 1 - ease.in(prog(t, 98.6, 100.2));
    let x = CXc, y = CY;
    ctx.save(); ctx.globalAlpha = out;
    for (const [h, a] of hs) {
      const r = R * (4 / Math.PI) / h * a, nx = x + r * Math.cos(h * ph), ny = y - r * Math.sin(h * ph);
      if (r > 1) ring(ctx, x, y, r, h === 1 ? C.gold : "#d9c49a", h === 1 ? 0.55 : 0.4, 1.2);
      line(ctx, [[x, y], [nx, ny]], "#fff3d6", 0.85, 1.5);
      x = nx; y = ny;
    }
    glow(ctx, x, y, 34, C.gold, 1); dot(ctx, x, y, 4, "#fff");
    const X0 = 760, X1 = 1800, pts = [];
    for (let i = 0; i <= 640; i++) {
      const u = i / 640, p = ph - u * Math.PI * 6; let s = 0;
      for (const [h, a] of hs) s += (4 / Math.PI) / h * a * Math.sin(h * p);
      pts.push([X0 + u * (X1 - X0), CY - R * s]);
    }
    line(ctx, [[x, y], [X0, pts[0][1]]], "#ffffff", 0.35, 1);
    ctx.globalCompositeOperation = "lighter"; line(ctx, pts, C.gold, 1, 3, 4); ctx.globalCompositeOperation = "source-over";
    const hA = prog(t, 93.3, 93.9);
    mathText(ctx, "f(x) = (4/π) Σ_k sin((2k+1)x) / (2k+1)", W / 2, 236, { size: 40, color: "#fff2d6", alpha: hA });
    const lastH = hs[hs.length - 1][0];
    text(ctx, `${hs.length} ${hs.length > 1 ? "circles · 个圆" : "circle · 个圆"}`, 420, 820, { size: 30, weight: 600, font: F.mono, color: C.gold, alpha: hA });
    if (hs.length > 1 && hs.length <= 8) mathText(ctx, `+ sin(${lastH}x)/${lastH}`, 420, 868, { size: 32, color: "#ffffff", alpha: hA * (1 - prog(t - (FO.harm0 + (hs.length - 1) * FO.harmStep), 0.3, 0.5)) });
    ctx.restore();
  }
  AF.scenes.push({
    t0: 90, t1: 118, post: 1.2,
    draw(ctx, lt, t) {
      bgGrad(ctx, "#121032", "#020208", W / 2, H * 0.45);
      stars(ctx, t, { a: 0.5, drift: 4 });
      if (t < 100.2) squareWave(ctx, t);
      const curves = fourierInit(), da = prog(t, 98.8, 100.0);
      if (da > 0) {
        const p = ease.sine(prog(t, FO.draw0, FO.draw1));
        const ca = da * (1 - prog(t, FO.draw1 + 0.2, FO.draw1 + 1.6));
        const fillA = ease.out(prog(t, FO.draw1 + 0.3, FO.draw1 + 2.0)) * (1 - prog(t, 116.2, 117.4)), nrg = energy(t);
        if (fillA > 0) {
          ctx.save(); const path = new Path2D();
          for (const c of curves) { path.moveTo(c[0][0], c[0][1]); for (let i = 1; i < c.length; i++) path.lineTo(c[i][0], c[i][1]); path.closePath(); }
          const g = ctx.createLinearGradient(0, GY - 360, 0, GY + 360); g.addColorStop(0, "#fff1c9"); g.addColorStop(0.5, C.gold); g.addColorStop(1, "#c4762e");
          ctx.fillStyle = g; ctx.globalAlpha = fillA * (0.8 + 0.2 * nrg); ctx.fill(path, "evenodd"); ctx.restore();
          glow(ctx, GX, GY, 520 + nrg * 140, C.gold, fillA * (0.22 + 0.35 * nrg));
        }
        FD.contours.forEach((c, ci) => {
          const M = curves[ci].length - 1, n = Math.floor(p * M);
          ctx.save(); ctx.globalCompositeOperation = "lighter"; line(ctx, curves[ci].slice(0, n + 1), C.gold, da * (1 - fillA * 0.5) * (1 - prog(t, 116.2, 117.4)), 3.2, 4); ctx.restore();
          if (ca <= 0) return;
          let re = c.c0[0], im = c.c0[1], [x, y] = gpt(re, im);
          const circ = new Path2D(), arms = [[x, y]];
          for (const [f, a, b] of c.terms) {
            const ang = 2 * Math.PI * f * p, cs = Math.cos(ang), sn = Math.sin(ang), r = Math.hypot(a, b) * S_;
            re += a * cs - b * sn; im += a * sn + b * cs; const [nx, ny] = gpt(re, im);
            if (r > 1.6) { circ.moveTo(x + r, y); circ.arc(x, y, r, 0, Math.PI * 2); }
            arms.push([nx, ny]); x = nx; y = ny;
          }
          ctx.save(); ctx.globalAlpha = ca; ctx.strokeStyle = hexA(["#9fc6ff", "#c9b4ff", "#9ff0e0"][ci % 3], 0.24); ctx.lineWidth = 1; ctx.stroke(circ); ctx.restore();
          line(ctx, arms, "#e9f1ff", ca * 0.75, 1.1);
          glow(ctx, x, y, 34, "#ffffff", ca); glow(ctx, x, y, 80, C.gold, ca * 0.8);
        });
        const lab = prog(t, 100.2, 100.8) * (1 - prog(t, FO.draw1, FO.draw1 + 0.6));
        text(ctx, `${FD.contours.reduce((s, c) => s + c.terms.length, 0)} circles · ${FD.contours.length} chains`, 140, 150, { size: 24, font: F.mono, color: "#d8d2ff", align: "left", alpha: lab });
        mathText(ctx, "z(t) = Σ_k c_k e^{2πikt}", 140, 204, { size: 38, color: "#f6e7c2", align: "left", alpha: lab });
        const sa = prog(t, FO.spec0 - 0.6, FO.spec0 + 0.8) * (1 - prog(t, 116.2, 117.4));
        if (sa > 0) {
          const R0 = 420, rot = (t - FO.spec0) * 0.12;
          ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineWidth = 7;
          for (let i = 0; i < 128; i++) {
            const b = i < 64 ? i : 127 - i, v = spec(t, b), ang = rot + (i / 128) * Math.PI * 2 - Math.PI / 2, r2 = R0 + 14 + v * 190, cs = Math.cos(ang), sn = Math.sin(ang);
            ctx.strokeStyle = ramp(b / 64 * 0.82, (0.25 + 0.75 * v) * sa);
            ctx.beginPath(); ctx.moveTo(GX + cs * R0, GY + sn * R0); ctx.lineTo(GX + cs * r2, GY + sn * r2); ctx.stroke();
          }
          ctx.restore();
          ring(ctx, GX, GY, R0 - 8, "#ffffff", sa * 0.35, 1);
          text(ctx, "SPECTRUM OF THIS SOUNDTRACK", 1780, 150, { size: 20, weight: 600, font: F.ui, color: "#d8d2ff", align: "right", alpha: sa, ls: 4 });
          text(ctx, "本片配乐 · 64 个频段", 1780, 186, { size: 20, font: F.sans, color: "#a69fd0", align: "right", alpha: sa });
        }
      }
      return { streak: 0.45, bloom: 1.05 };
    },
  });
})();
