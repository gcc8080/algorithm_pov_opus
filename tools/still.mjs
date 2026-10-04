// node tools/still.mjs out_dir t1 t2 ...  -> JPEG stills for review
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import fs from "fs"; import path from "path"; import { serve } from "./serve.mjs";
const [out, ...ts] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const { srv, port } = await serve(path.resolve("."));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console:", m.text()); });
p.on("pageerror", (e) => console.log("PAGEERR", e.message));
await p.goto(`http://127.0.0.1:${port}/src/index.html?export=1`);
const t0 = Date.now(); await p.evaluate(() => window.READY); console.log("ready", Date.now() - t0, "ms");
for (const t of ts) {
  const s = Date.now();
  await p.evaluate((t) => window.prepare(+t), t);
  const url = await p.evaluate((t) => window.renderAt(+t, 0.9), t);
  fs.writeFileSync(`${out}/t${String(t).padStart(6, "0")}.jpg`, Buffer.from(url.split(",")[1], "base64"));
  console.log(t, Date.now() - s, "ms");
}
await b.close(); srv.close();
