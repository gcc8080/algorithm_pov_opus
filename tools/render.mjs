// Frame-exact export: node tools/render.mjs [fps=30] [workers=2] [t0=0] [t1=300]
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import { spawn } from "child_process"; import fs from "fs"; import path from "path"; import { serve } from "./serve.mjs";
const FPS = +(process.argv[2] || 30), WORKERS = +(process.argv[3] || 2), T0 = +(process.argv[4] || 0), T1 = +(process.argv[5] || 300);
const F0 = Math.round(T0 * FPS), F1 = Math.round(T1 * FPS), N = F1 - F0;
fs.mkdirSync("build", { recursive: true });
const { srv, port } = await serve(path.resolve("."));
async function worker(k) {
  const f0 = F0 + Math.floor((k * N) / WORKERS), f1 = F0 + Math.floor(((k + 1) * N) / WORKERS), out = `build/seg${k}.mp4`;
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-threads", "1", out], { stdio: ["pipe", "inherit", "inherit"] });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on("pageerror", (e) => console.log("PAGEERR", e.message));
  await p.goto(`http://127.0.0.1:${port}/src/index.html?export=1`);
  await p.evaluate(() => window.READY);
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await p.evaluate(async (t) => { await window.prepare(t); return window.renderAt(t, 0.95); }, f / FPS);
    const buf = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if ((f - f0) % 300 === 0) console.log(`w${k} ${f - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); await b.close();
  return out;
}
const segs = await Promise.all(Array.from({ length: WORKERS }, (_, k) => worker(k)));
fs.writeFileSync("build/segs.txt", segs.map((s) => `file '${path.resolve(s)}'`).join("\n"));
srv.close();
console.log("DONE", segs);
