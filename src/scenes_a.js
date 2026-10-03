// Scenes A — Prologue (Euclid), Title, I · Sorting
(function () {
  const { W, H, C, F, E, TL, D, clamp, lerp, prog, smooth, ease, rng, hash1, pulse, since, spec, energy, hexA, mix, ramp, rampRGB,
    mkCanvas, glow, streak, text, decode, mathText, line, ring, dot, kf, stars, bgGrad } = AF;

  // ======================================================================== PROLOGUE · Euclid (0–20)
  const EU = TL.euclid, RS = 1180 / EU.a, RW = 1180, RH = EU.b * RS, RX = (W - RW) / 2, RY = 206;
  const LEVEL = (s) => (s[2] === 462 ? 0 : s[2] === 147 ? 1 : 2);
  const LCOL = [C.gold, C.amber, "#ff9a73"];
  const EQS = [["1071 = 2 × 462 + 147", 4.0], ["462 = 3 × 147 + 21", 7.0], ["147 = 7 × 21 + 0", 10.0]];
  const DUST = (() => { const r = rng(3), a = []; for (let i = 0; i < 160; i++) a.push([r() * W, r() * H, r(), r()]); return a; })();
  function euclidRect(ctx, lt, alphaAll = 1, collapse = 0, cs = 1) {
    // drafting construction lines
    const da = prog(lt, 0.4, 2.5) * alphaAll * (1 - collapse);
    if (da > 0) {
      ctx.save(); ctx.globalAlpha = da * 0.22; ctx.strokeStyle = C.gold; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
      for (const y of [RY, RY + RH]) { ctx.beginPath(); ctx.moveTo(RX - 120, y); ctx.lineTo(RX + RW + 120, y); ctx.stroke(); }
      for (const x of [RX, RX + RW]) { ctx.beginPath(); ctx.moveTo(x, RY - 60); ctx.lineTo(x, RY + RH + 60); ctx.stroke(); }
      ctx.setLineDash([]); ctx.restore();
      // dimension arrows
      ctx.save(); ctx.globalAlpha = da * 0.8; ctx.strokeStyle = hexA(C.gold, 0.7); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(RX, RY - 28); ctx.lineTo(RX + RW, RY - 28); ctx.moveTo(RX - 30, RY); ctx.lineTo(RX - 30, RY + RH); ctx.stroke(); ctx.restore();
      mathText(ctx, "1071", RX + RW / 2, RY - 42, { size: 30, color: C.gold, alpha: da });
      ctx.save(); ctx.translate(RX - 52, RY + RH / 2); ctx.rotate(-Math.PI / 2); mathText(ctx, "462", 0, 0, { size: 30, color: C.gold, alpha: da }); ctx.restore();
    }
    // outline traced from a single point
    const op = ease.io(prog(lt, 0.6, 2.4)), per = 2 * (RW + RH), L = op * per;
    const pts = [[RX, RY]]; let rem = L;
    for (const [dx, dy, len] of [[1, 0, RW], [0, 1, RH], [-1, 0, RW], [0, -1, RH]]) {
      const q = pts[pts.length - 1], s = Math.min(rem, len); pts.push([q[0] + dx * s, q[1] + dy * s]); rem -= s; if (rem <= 0) break;
    }
    line(ctx, pts, C.gold, alphaAll * (1 - collapse), 2.2 / cs, 4);
    const tip = pts[pts.length - 1];
    if (op > 0 && op < 1) { glow(ctx, tip[0], tip[1], 60, C.gold, 1); glow(ctx, tip[0], tip[1], 16, "#fff", 1); }
    if (lt > 0.5 && lt < 0.9) glow(ctx, RX, RY, 80 * prog(lt, 0.5, 0.7), "#fff", 1 - prog(lt, 0.7, 0.9));
    // squares
    EU.squares.forEach((s, i) => {
      const ts = EU.times[i]; if (lt < ts - 0.4) return;
      const lv = LEVEL(s), col = LCOL[lv];
      let x = RX + s[0] * RS, y = RY + s[1] * RS, w = s[2] * RS;
      if (collapse > 0) { // fold everything into the final 21-square
        const f = EU.squares[EU.squares.length - 1], fx = RX + f[0] * RS + f[2] * RS / 2, fy = RY + f[1] * RS + f[2] * RS / 2;
        const q = ease.inExpo(clamp(collapse * 1.15 - (2 - lv) * 0.08));
        x = lerp(x, fx - w / 2 * (1 - q), q); y = lerp(y, fy - w / 2 * (1 - q), q); w *= 1 - q;
      }
      const sw = ease.out(prog(lt, ts - 0.32, ts));  // cutting sweep
      ctx.save();
      const gr = ctx.createLinearGradient(x, y, x + w, y + w);
      gr.addColorStop(0, hexA(col, 0.30)); gr.addColorStop(1, hexA(col, 0.06));
      ctx.globalAlpha = alphaAll;
      ctx.fillStyle = gr; ctx.fillRect(x, y, w * sw, w);
      ctx.strokeStyle = hexA(col, 0.95); ctx.lineWidth = (lv === 2 ? 1.2 : 1.8) / Math.sqrt(cs);
      ctx.strokeRect(x + 0.5, y + 0.5, w * sw - 1, w - 1);
      ctx.restore();
      if (sw < 1) { line(ctx, [[x + w * sw, y], [x + w * sw, y + w]], "#ffffff", alphaAll, 2.5 / cs, 5); glow(ctx, x + w * sw, y + w / 2, w * 0.35, col, 0.45); }
      const fl = 1 - prog(lt, ts, ts + 0.7);
      if (fl > 0 && collapse === 0) { glow(ctx, x + w / 2, y + w / 2, w * 0.55 + 30, col, fl * 0.55); ring(ctx, x + w / 2, y + w / 2, w * 0.5 + (1 - fl) * 50, col, fl * 0.6, 1.5 / cs); }
      if (lv < 2 && w > 30) mathText(ctx, String(s[2]), x + w / 2, y + w / 2, { size: lv === 0 ? 64 : 34, color: hexA(col, 0.9), alpha: alphaAll * prog(lt, ts, ts + 0.4) * (1 - collapse) });
      if (i === EU.squares.length - 1 && cs > 2) {
        const za = prog(cs, 2, 6) * (1 - collapse);
        mathText(ctx, "21", x + w / 2, y + w / 2, { size: w * 0.42, color: "#fff4e6", alpha: za });
        glow(ctx, x + w / 2, y + w / 2, w * 1.4, C.gold, za * (0.5 + 0.3 * Math.sin(lt * 5)));
        ring(ctx, x + w / 2, y + w / 2, w * (0.75 + 0.1 * Math.sin(lt * 5)), "#ffffff", za * 0.6, 1.5 / cs);
      }
    });
  }
  AF.scenes.push({
    t0: 0, t1: 20, post: 0.5,
    draw(ctx, lt, t) {
      bgGrad(ctx, "#0c0a14", "#020205", W / 2, H * 0.45);
      stars(ctx, t, { a: 0.35 * prog(lt, 1, 5), drift: 3 });
      // floating gold dust
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const [x, y, z, ph] of DUST) {
        const yy = (y - lt * (6 + z * 14) + H) % H, xx = x + Math.sin(lt * 0.4 + ph * 9) * 12;
        ctx.globalAlpha = 0.25 * z * prog(lt, 0.5, 4) * (1 - prog(lt, 19.2, 20)); ctx.fillStyle = "#ffdca0"; ctx.fillRect(xx, yy, 1.5 + z * 1.5, 1.5 + z * 1.5);
      }
      ctx.restore();
      // camera: push in, then dive to the last square, then pull back and collapse
      const f = EU.squares[EU.squares.length - 1], fx = RX + f[0] * RS + f[2] * RS / 2, fy = RY + f[1] * RS + f[2] * RS / 2;
      const cm = kf(lt, [[0, { s: 0.94, x: W / 2, y: RY + RH / 2, r: -0.01 }], [11.6, { s: 1.0, x: W / 2, y: RY + RH / 2, r: 0 }],
        [13.2, { s: 7.5, x: fx, y: fy, r: 0.02 }, ease.ioExpo], [15.6, { s: 7.5, x: fx, y: fy, r: 0.03 }], [17.2, { s: 1.0, x: W / 2, y: RY + RH / 2, r: 0 }, ease.ioExpo],
        [20, { s: 1.06, x: W / 2, y: RY + RH / 2, r: 0 }]]);
      const collapse = prog(lt, 17.4, 19.7);
      ctx.save(); ctx.translate(W / 2, RY + RH / 2); ctx.scale(cm.s, cm.s); ctx.rotate(cm.r); ctx.translate(-cm.x, -cm.y);
      euclidRect(ctx, lt, 1, collapse, cm.s);
      ctx.restore();
      // gcd reveal
      const ga = prog(lt, 12.6, 13.4) * (1 - prog(lt, 16.6, 17.2));
      if (ga > 0) {
        mathText(ctx, "gcd(1071, 462) = 21", W / 2, RY + RH + 120, { size: 66, color: "#fff4dc", alpha: ga });
        glow(ctx, W / 2, RY + RH / 2, 380, C.gold, ga * 0.35);
      }
      // the step equations
      EQS.forEach(([s, ts], i) => {
        const a = prog(lt, ts, ts + 0.5) * (1 - prog(lt, 11.8, 12.4));
        const cur = lt >= ts && (i === 2 || lt < EQS[i + 1][1]);
        mathText(ctx, s, W / 2, RY + RH + 62 + i * 46, { size: 34, color: cur ? "#fff1d0" : hexA(C.gold, 0.55), alpha: a });
      });
      // collapse into a single point of light
      if (collapse > 0) {
        const q = ease.inExpo(collapse);
        const fx2 = W / 2 + (fx - cm.x) * cm.s, fy2 = RY + RH / 2 + (fy - cm.y) * cm.s;
        glow(ctx, lerp(fx2, W / 2, q), lerp(fy2, H / 2 - 10, q), 60 + q * 500, C.gold, 0.4 + q);
        glow(ctx, lerp(fx2, W / 2, q), lerp(fy2, H / 2 - 10, q), 20 + q * 120, "#ffffff", q * 1.6);
        streak(ctx, lerp(fx2, W / 2, q), lerp(fy2, H / 2 - 10, q), 300 + q * 2400, "#ffe6b0", q * 0.9, 1 + q);
      }
      return { letterbox: 1, flash: 0.9, bloom: 1.1, streak: 0.6 };
    },
  });

  // ======================================================================== TITLE (20–28) and the bars it becomes (to 30)
  let TITLE_PTS = null;
  function titlePoints() {
    if (TITLE_PTS) return TITLE_PTS;
    const c = mkCanvas(W, 400), g = c.getContext("2d");
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `900 236px ${F.serif}`; g.letterSpacing = "40px";
    g.fillText("算法之美", W / 2 + 20, 200);
    const id = g.getImageData(0, 0, W, 400).data, r = rng(42), pts = [];
    for (let y = 0; y < 400; y += 3) for (let x = 0; x < W; x += 3) if (id[(y * W + x) * 4 + 3] > 128 && r() < 0.62) pts.push([x + r() * 2, y + r() * 2 + (H / 2 - 40 - 200)]);
    TITLE_PTS = pts.map((p) => ({ x: p[0], y: p[1], a: r() * Math.PI * 2, v: 300 + r() * 1300, d: r(), bar: Math.floor(r() * 64), u: r() }));
    return TITLE_PTS;
  }
  AF.titlePoints = titlePoints;
  const BAR = { x0: 210, w: 1500, n: 64, base: 830, hmax: 540 };
  const barX = (i) => BAR.x0 + (i + 0.5) * (BAR.w / BAR.n);
  AF.scenes.push({
    t0: 20, t1: 28, post: 2,
    draw(ctx, lt, t) {
      const pts = titlePoints(), cx = W / 2, cy = H / 2 - 10;
      bgGrad(ctx, "#171024", "#020206", W / 2, H * 0.48);
      stars(ctx, t, { a: 0.7, drift: 12 });
      // rotating light rays
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(cx, cy); ctx.rotate(lt * 0.035);
      const ra = (1 - prog(lt, 6.0, 8.0)) * prog(lt, 0, 0.4);
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2, w = 0.012 + 0.018 * hash1(i);
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * 1300, Math.sin(a) * 1300);
        g.addColorStop(0, hexA(i % 3 ? C.gold : "#ffd9f0", 0.16 * ra)); g.addColorStop(1, hexA(C.gold, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1400, a - w, a + w); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      for (let k = 0; k < 3; k++) { const p = prog(lt, k * 0.1, 1.6 + k * 0.5); ring(ctx, cx, cy, p * (1200 + k * 300), k === 1 ? C.gold : "#ffffff", (1 - p) * 0.8, 5 - k * 1.5); }
      // particles: explode from the point, condense into the glyphs, later rain into the 64 bars
      const crisp = prog(lt, 1.5, 2.3), outP = prog(lt, 6.2, 9.6);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const p of pts) {
        let x, y;
        const ex = (1 - Math.exp(-lt * 3)) / 3 * p.v * 0.5;
        const bx = cx + Math.cos(p.a) * ex, by = cy + Math.sin(p.a) * ex;
        const q = ease.io(prog(lt, 0.25 + p.d * 0.5, 1.4 + p.d * 0.5));
        x = lerp(bx, p.x, q); y = lerp(by, p.y, q);
        let a = 0.9 * (1 - crisp * 0.85);
        if (outP > 0) {
          const qq = ease.io(clamp((outP - p.d * 0.35) / 0.65));
          const tx = barX(p.bar) + (p.u - 0.5) * 16, ty = BAR.base - p.u * 380;
          const mx = lerp(x, tx, 0.5) + Math.sin(p.a * 3) * 240 * Math.sin(qq * Math.PI), my = lerp(y, ty, 0.5) - 160 * Math.sin(qq * Math.PI);
          x = (1 - qq) * (1 - qq) * x + 2 * (1 - qq) * qq * mx + qq * qq * tx; y = (1 - qq) * (1 - qq) * y + 2 * (1 - qq) * qq * my + qq * qq * ty;
          a = lerp(0.35, 0.9, Math.sin(qq * Math.PI)) * (1 - prog(outP, 0.85, 1));
          ctx.fillStyle = ramp(p.bar / 64);
        } else ctx.fillStyle = q < 1 ? "#ffe2a8" : "#fff2d2";
        ctx.globalAlpha = a; ctx.fillRect(x - 1, y - 1, 2.4, 2.4);
      }
      ctx.restore();
      // crisp lockup
      const ta = crisp * (1 - prog(lt, 6.0, 6.6));
      if (ta > 0) {
        const ls = lerp(64, 40, ease.out(prog(lt, 1.4, 6)));
        const g = ctx.createLinearGradient(cx - 560, 0, cx + 560, 0), sh = clamp((lt - 1.6) / 3.5);
        g.addColorStop(0, "#efb562"); g.addColorStop(clamp(sh - 0.12), "#f5c47e"); g.addColorStop(clamp(sh), "#fff3e0"); g.addColorStop(clamp(sh + 0.12), "#f5c47e"); g.addColorStop(1, "#e3a050");
        text(ctx, "算法之美", cx + ls / 2, cy - 40, { size: 236, weight: 900, font: F.serif, color: g, alpha: ta, ls });
        text(ctx, decode("THE BEAUTY OF ALGORITHMS", prog(lt, 1.2, 2.8), 7), cx, cy + 128, { size: 44, weight: 400, font: F.lm, color: "#f2ead8", alpha: ta, ls: lerp(40, 22, ease.out(prog(lt, 1.2, 5))) });
        const lw = ease.outExpo(prog(lt, 1.8, 3.0)) * 820; ctx.save(); ctx.globalAlpha = ta; ctx.fillStyle = hexA(C.gold, 0.85); ctx.fillRect(cx - lw / 2, cy + 82, lw, 1.5); ctx.restore();
        text(ctx, "A FILM IN SEVEN ALGORITHMS  ·  七个算法，一部影片", cx, cy + 190, { size: 22, weight: 400, font: F.ui, color: "#cdbf9f", alpha: ta * prog(lt, 2.4, 3.4), ls: 6 });
      }
      streak(ctx, cx, cy - 40, 2600, "#ffe2b0", (1 - prog(lt, 0, 2.5)) * 0.9, 2);
      glow(ctx, cx, cy, 900 * (1 - prog(lt, 0, 1.2)), "#ffffff", 1 - prog(lt, 0, 1.0));
      return { streak: 0.8, bloom: 1.1, letterbox: 1 - ease.io(prog(lt, 4.0, 7.5)) };
    },
  });

  // ======================================================================== I · SORTING
  const QS = D.QS, RACE = D.RACE, ST = TL.sort;
  function qsStateAt(nops) {
    const c = AF.cache.qs || (AF.cache.qs = { k: 0, a: QS.arr.slice() });
    if (nops < c.k) { c.k = 0; c.a = QS.arr.slice(); }
    while (c.k < nops && c.k < QS.ops.length) { const [ty, i, j] = QS.ops[c.k]; if (ty === 1) { const x = c.a[i]; c.a[i] = c.a[j]; c.a[j] = x; } c.k++; }
    return c.a;
  }
  function markAt(k) { let m = null; for (const mk of QS.marks) { if (mk[0] <= k) m = mk; else break; } return m; }
  function drawBars(ctx, arr, { x0, w, base, hmax, n, alpha = 1, hi = {}, reflect = true, rise = 1 }) {
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = arr[i], h = (v / n) * hmax * rise, x = x0 + i * bw;
      const c = rampRGB(v / n * 0.86 + 0.02), col = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      const hl = hi[i] || 0;
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(0, base - h, 0, base);
      g.addColorStop(0, hl ? "#ffffff" : col); g.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0.35)`);
      ctx.fillStyle = g; ctx.fillRect(x + 1.5, base - h, bw - 3, h);
      ctx.fillStyle = "#fff"; ctx.globalAlpha = alpha * (0.5 + 0.5 * hl); ctx.fillRect(x + 1.5, base - h, bw - 3, 2);
      if (reflect) { ctx.globalAlpha = alpha * 0.16; ctx.fillStyle = col; ctx.fillRect(x + 1.5, base + 6, bw - 3, h * 0.35); }
      if (hl) glow(ctx, x + bw / 2, base - h, 60 + 40 * hl, hl > 1.5 ? "#ffffff" : col, alpha * 0.8);
    }
    ctx.globalAlpha = 1;
  }
  AF.scenes.push({
    t0: 28, t1: 44,
    draw(ctx, lt, t) {
      ctx.save(); ctx.globalAlpha = prog(t, 28.0, 30.0); bgGrad(ctx, "#0b0f22", "#020308", W / 2, H * 0.62); ctx.restore();
      stars(ctx, t, { a: 0.35 * prog(t, 28, 30), drift: 5 });
      const kp = pulse(E.kicks, t, 0.2);
      // floor glow line
      ctx.save(); const fl = ctx.createLinearGradient(0, 0, W, 0); fl.addColorStop(0, "rgba(255,255,255,0)"); fl.addColorStop(0.5, "rgba(190,210,255,.35)"); fl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = fl; ctx.fillRect(0, BAR.base + 2, W, 1.5); ctx.restore();
      if (t < ST.race.t0 + 0.4) {
        // --- quicksort with every comparison audible
        const nops = clamp(Math.floor((t - QS.t0) * QS.rate), 0, QS.ops.length);
        const arr = qsStateAt(nops), hi = {};
        let curPivot = -1;
        for (let k = Math.max(0, nops - 3); k < nops; k++) { const [ty, i, j] = QS.ops[k]; hi[i] = Math.max(hi[i] || 0, ty ? 2 : 1); if (ty) hi[j] = 2; }
        const mk = nops > 0 && nops < QS.ops.length ? markAt(nops) : null;
        if (mk) { curPivot = mk[2]; hi[curPivot] = Math.max(hi[curPivot] || 0, 1.2); }
        const appear = t < 30 ? ease.out(prog(t, 29.0, 30.0)) : 1;
        const out = ease.in(prog(t, ST.race.t0 - 0.2, ST.race.t0 + 0.4));
        ctx.save(); ctx.translate(0, out * 40); ctx.globalAlpha = 1 - out;
        drawBars(ctx, arr, { ...BAR, alpha: appear > 0 ? 1 : 0, hi, rise: t < 30 ? appear : 1 });
        if (mk) { // partition bracket
          const x1 = barX(mk[1]) - 10, x2 = barX(mk[2]) + 10;
          line(ctx, [[x1, BAR.base + 40], [x1, BAR.base + 52], [x2, BAR.base + 52], [x2, BAR.base + 40]], C.ice, 0.7, 1.5);
          text(ctx, "pivot", barX(mk[2]), BAR.base - (arr[mk[2]] / 64) * BAR.hmax - 34, { size: 22, font: F.lm, italic: true, color: "#fff", alpha: 0.9 });
        }
        if (nops >= QS.ops.length) { const f = prog(t, QS.t1, QS.t1 + 0.8); ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 64; i++) { const a = Math.exp(-Math.pow((i / 63 - f * 1.4 + 0.2) * 6, 2)); glow(ctx, barX(i), BAR.base - (arr[i] / 64) * BAR.hmax, 90, "#ffffff", a * 0.8); } ctx.restore(); }
        ctx.restore();
        const ca = prog(t, 30.0, 30.6) * (1 - out);
        let cmp = 0, sw = 0; for (let k = 0; k < nops; k++) QS.ops[k][0] ? sw++ : cmp++;
        text(ctx, "QUICKSORT · 快速排序", 210, 196, { size: 26, weight: 600, font: F.ui, color: "#e8eeff", align: "left", alpha: ca, ls: 5 });
        text(ctx, `comparisons ${String(cmp).padStart(3, " ")}    swaps ${String(sw).padStart(3, " ")}`, 1710, 196, { size: 24, font: F.mono, color: "#b9c6ee", align: "right", alpha: ca });
      }
      // --- the race: six algorithms, same data, same speed per step
      if (t >= ST.race.t0 - 0.2) {
        const ra = ease.out(prog(t, ST.race.t0 - 0.2, ST.race.t0 + 0.5)), out = ease.in(prog(t, 43.8, 44.0));
        const LANE_H = 112, Y0 = 178, X0 = 520, LW = 1120, n = 100;
        const nops = Math.max(0, (t - RACE.t0) * RACE.rate);
        const st = AF.cache.race || (AF.cache.race = RACE.lanes.map(() => ({ k: 0, a: RACE.arr.slice() })));
        RACE.lanes.forEach((ln, li) => {
          const s = st[li], target = Math.min(ln.ops.length, Math.floor(nops));
          if (target < s.k) { s.k = 0; s.a = RACE.arr.slice(); }
          while (s.k < target) { const [ty, i, j] = ln.ops[s.k]; if (ty === 1) { const x = s.a[i]; s.a[i] = s.a[j]; s.a[j] = x; } else if (ty === 2) s.a[i] = j; s.k++; }
          const y = Y0 + li * LANE_H + (1 - ra) * 80 * (li + 1), done = s.k >= ln.ops.length, a = ra * (1 - out);
          const fin = ln.finish, sinceFin = t - fin;
          ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = done ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.02)"; ctx.fillRect(X0 - 14, y - 6, LW + 28, LANE_H - 14);
          ctx.restore();
          const hi = {};
          if (!done) for (let k = Math.max(0, s.k - 24); k < s.k; k++) { const [ty, i, j] = ln.ops[k]; hi[i] = 1; if (ty === 1) hi[j] = 1; }
          for (let i = 0; i < n; i++) {
            const v = s.a[i], h = (v / n) * (LANE_H - 30), x = X0 + i * (LW / n), c = rampRGB(v / n * 0.86 + 0.02);
            ctx.globalAlpha = a; ctx.fillStyle = hi[i] ? "#ffffff" : `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
            ctx.fillRect(x + 1, y + LANE_H - 22 - h, LW / n - 2.5, h);
          }
          ctx.globalAlpha = 1;
          if (done && sinceFin < 1.0) { const q = ease.out(sinceFin / 1.0), sx = X0 - 200 + q * (LW + 400); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (1 - q) * 0.55 * a; const gg = ctx.createLinearGradient(sx - 160, 0, sx + 160, 0); gg.addColorStop(0, "rgba(255,255,255,0)"); gg.addColorStop(0.5, "rgba(255,255,255,1)"); gg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gg; ctx.fillRect(X0 - 14, y - 6, LW + 28, LANE_H - 14); ctx.restore(); }
          const lc = ln.cx === "O(n²)" ? C.rose : C.lime;
          text(ctx, ln.cn, 210, y + 30, { size: 30, weight: 700, font: F.sans, color: "#ffffff", align: "left", alpha: a });
          text(ctx, ln.name + " sort", 210, y + 66, { size: 22, font: F.lm, italic: true, color: "#c6cfee", align: "left", alpha: a });
          mathText(ctx, ln.cx === "O(n²)" ? "O(n^2)" : "O(n log n)", 470, y + 46, { size: 26, color: lc, align: "right", alpha: a });
          if (done) {
            text(ctx, ln.ops.length.toLocaleString("en-US"), 1790, y + 34, { size: 32, weight: 600, font: F.mono, color: lc, align: "right", alpha: a });
            text(ctx, "✓ 步完成 steps", 1790, y + 70, { size: 18, weight: 500, font: F.ui, color: lc, align: "right", alpha: a, ls: 2 });
          } else {
            const dots = "·".repeat(1 + (Math.floor(t * 6) % 3));
            text(ctx, dots, 1790, y + 40, { size: 34, weight: 700, font: F.mono, color: "#7f89ad", align: "right", alpha: a });
          }
          if (done && sinceFin < 0.6) glow(ctx, 1730, y + 40, 160, lc, (1 - sinceFin / 0.6) * a);
        });
        text(ctx, "SAME DATA · SAME SPEED PER STEP   同样的数据，同样的单步速度", 210, Y0 - 34, { size: 20, weight: 500, font: F.ui, color: "#9fb0dd", align: "left", alpha: ra * (1 - out), ls: 3 });
      }
      return { streak: 0.25 };
    },
  });

  // ---- colour wheel: bottom-up merge sort on 240 spokes at once
  const WH = TL.sort.wheel, NS = WH.spokes, NC = WH.cells, RAD = 470, RIN = 64, WSZ = 960;
  let WHEEL = null;
  function wheelInit() {
    if (WHEEL) return WHEEL;
    const r = rng(2718), passes = [];
    let cur = [];
    for (let s = 0; s < NS; s++) { const p = Array.from({ length: NC }, (_, i) => i); for (let i = NC - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } cur.push(p); }
    passes.push(cur.map((p) => p.slice()));
    for (let w = 1; w < NC; w *= 2) {
      cur = cur.map((p) => { const o = []; for (let lo = 0; lo < NC; lo += 2 * w) { const a = p.slice(lo, lo + w), b = p.slice(lo + w, lo + 2 * w); let i = 0, j = 0; while (i < a.length || j < b.length) o.push(j >= b.length || (i < a.length && a[i] < b[j]) ? a[i++] : b[j++]); } return o; });
      passes.push(cur.map((p) => p.slice()));
    }
    // position of each value per pass
    const pos = passes.map((ps) => ps.map((p) => { const q = new Int16Array(NC); p.forEach((v, i) => (q[v] = i)); return q; }));
    // colour table
    const col = new Uint32Array(NS * NC);
    for (let s = 0; s < NS; s++) for (let v = 0; v < NC; v++) {
      const c = rampRGB(s / NS + (v / NC) * 0.42), k = 0.55 + 0.45 * (v / NC);
      col[s * NC + v] = (255 << 24) | ((c[2] * k) << 16) | ((c[1] * k) << 8) | (c[0] * k);
    }
    // polar lookup: radius cell (2x oversampled) and angle per pixel
    const cv = mkCanvas(WSZ, WSZ), g = cv.getContext("2d"), img = g.createImageData(WSZ, WSZ);
    const rr = new Float32Array(WSZ * WSZ), aa = new Float32Array(WSZ * WSZ);
    for (let y = 0; y < WSZ; y++) for (let x = 0; x < WSZ; x++) {
      const dx = x + 0.5 - WSZ / 2, dy = y + 0.5 - WSZ / 2, r_ = Math.hypot(dx, dy), i = y * WSZ + x;
      rr[i] = r_ < RIN || r_ > RAD ? -1 : (r_ - RIN) / (RAD - RIN); aa[i] = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1;
    }
    WHEEL = { passes, pos, col, cv, g, img, buf: new Uint32Array(img.data.buffer), rr, aa, strip: new Uint32Array(NS * NC * 2) };
    return WHEEL;
  }
  function drawWheel(t, rot, twist) {
    const Wd = wheelInit();
    // which pass, how far through it
    let k = 0; while (k < WH.passT.length && t >= WH.passT[k]) k++;
    const from = Math.max(0, k - 1), to = k > 0 ? k : 0;
    const q = k > 0 ? ease.io(prog(t, WH.passT[k - 1] - 0.05, WH.passT[k - 1] + 0.38)) : 0;
    const P0 = Wd.pos[k > 0 ? k - 1 : 0], P1 = Wd.pos[k > 0 ? k : 0], strip = Wd.strip;
    strip.fill(0xff07060b);
    for (let s = 0; s < NS; s++) {
      const a = P0[s], b = P1[s], base = s * NC * 2;
      for (let v = 0; v < NC; v++) {
        const p = (a[v] + (b[v] - a[v]) * q) * 2, c = Wd.col[s * NC + v], i0 = Math.floor(p);
        strip[base + Math.min(NC * 2 - 1, i0)] = c; strip[base + Math.min(NC * 2 - 1, i0 + 1)] = c;
      }
    }
    const buf = Wd.buf, rr = Wd.rr, aa = Wd.aa, N2 = NC * 2;
    for (let i = 0; i < buf.length; i++) {
      const r_ = rr[i];
      if (r_ < 0) { buf[i] = 0; continue; }
      let a = aa[i] + rot + twist * (1 - r_) * (1 - r_); a -= Math.floor(a);
      buf[i] = strip[Math.floor(a * NS) * N2 + Math.floor(r_ * N2 * 0.9999)];
    }
    Wd.g.putImageData(Wd.img, 0, 0);
    return { cv: Wd.cv, pass: k };
  }
  AF.scenes.push({
    t0: 44, t1: 60, post: 0.3,
    draw(ctx, lt, t) {
      bgGrad(ctx, "#0b0b1d", "#010105", W / 2, H / 2);
      stars(ctx, t, { a: 0.5, drift: 4 });
      const spin = 0.008 * lt + ease.inExpo(prog(lt, 12, 16)) * 2.2;
      const twist = ease.in(prog(lt, 11.5, 16)) * 2.4;
      const { cv, pass } = drawWheel(t, spin, twist);
      const cx = W / 2 + 230 * ease.io(prog(lt, 7.5, 9.5)) * (1 - ease.io(prog(lt, 13.2, 15.0))), cy = 500;
      const tilt = kf(lt, [[0, { sy: 0.5, r: -0.5, s: 0.62 }], [1.3, { sy: 0.92, r: 0, s: 0.9 }, ease.outExpo], [5.0, { sy: 0.96, r: 0, s: 0.96 }],
        [8.0, { sy: 0.55, r: 0.25, s: 1.18 }], [11.5, { sy: 0.62, r: 0.35, s: 1.2 }], [16, { sy: 1.0, r: 0.0, s: 6.0 }, ease.inExpo]]);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt.r); ctx.scale(tilt.s, tilt.s * tilt.sy);
      glow(ctx, 0, 0, RAD * 1.5, "#7d8cff", 0.25 + 0.2 * pulse(E.kicks, t, 0.25));
      ctx.drawImage(cv, -WSZ / 2, -WSZ / 2);
      ctx.globalCompositeOperation = "lighter";
      // light sweep across the finished wheel
      const sw = -1;
      if (sw > 0 && sw < 1) { ctx.globalAlpha = Math.sin(sw * Math.PI) * 0.16; const g = ctx.createLinearGradient(-RAD + sw * 2 * RAD - 70, 0, -RAD + sw * 2 * RAD + 70, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, RAD, 0, 7); ctx.fill(); }
      ctx.restore();
      // pass HUD
      const ha = prog(lt, 0.8, 1.3) * (1 - prog(lt, 9.0, 9.6));
      if (ha > 0) {
        text(ctx, "MERGE SORT · 归并排序", 140, 200, { size: 26, weight: 600, font: F.ui, color: "#eef0ff", align: "left", alpha: ha, ls: 5 });
        text(ctx, `${NS} arrays × ${NC} elements`, 140, 238, { size: 22, font: F.mono, color: "#aeb8e0", align: "left", alpha: ha });
        for (let k = 0; k < 7; k++) {
          const on = pass > k, y = 300 + k * 52, a = ha * (on ? 1 : 0.35);
          text(ctx, `pass ${k + 1}`, 140, y, { size: 24, font: F.lm, italic: true, color: on ? "#fff" : "#8790b5", align: "left", alpha: a });
          mathText(ctx, `run = ${2 ** (k + 1)}`, 300, y, { size: 26, color: on ? C.lime : "#6d7598", align: "left", alpha: a });
          if (pass === k + 1) glow(ctx, 240, y, 120, C.lime, (1 - prog(t, WH.passT[k], WH.passT[k] + 0.5)) * ha);
        }
        const done = prog(lt, 5.0, 5.6);
        text(ctx, "SORTED", 1780, 240, { size: 30, weight: 700, font: F.ui, color: C.lime, align: "right", alpha: done * ha, ls: 10 });
      }
      // numbers for the scale argument
      const na = prog(lt, 10.0, 10.6) * (1 - prog(lt, 13.4, 14.0));
      if (na > 0) {
        mathText(ctx, "n = 10^{10}", 150, 250, { size: 64, color: "#ffffff", alpha: na, align: "left" });
        text(ctx, "快速排序  Quicksort", 150, 360, { size: 26, weight: 600, font: F.sans, color: "#cfe8b8", align: "left", alpha: na * prog(lt, 10.3, 10.8) });
        text(ctx, "≈ 8 分钟", 150, 420, { size: 54, weight: 900, font: F.sans, color: C.lime, align: "left", alpha: na * prog(lt, 10.3, 10.8) });
        text(ctx, "冒泡排序  Bubble sort", 150, 510, { size: 26, weight: 600, font: F.sans, color: "#f2c4cc", align: "left", alpha: na * prog(lt, 10.8, 11.3) });
        text(ctx, "≈ 2,400 年", 150, 570, { size: 54, weight: 900, font: F.sans, color: C.rose, align: "left", alpha: na * prog(lt, 10.8, 11.3) });
        mathText(ctx, "at 10^9 operations per second", 150, 650, { size: 26, color: "#97a3cc", alpha: na, align: "left" });
      }
      const dive = ease.inExpo(prog(lt, 14.4, 16));
      if (dive > 0) { glow(ctx, cx, cy, 200 + dive * 1400, "#ffffff", dive * 1.2); }
      return { streak: 0.3, bloom: 1.05 };
    },
  });
})();
