// tiny static server for the export (same-origin images + fonts)
import http from "http"; import fs from "fs"; import path from "path";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".mp3": "audio/mpeg", ".otf": "font/otf", ".json": "application/json" };
export function serve(root, port = 0) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
      fs.readFile(p, (err, data) => { if (err) { rsp.writeHead(404); rsp.end(); return; } rsp.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" }); rsp.end(data); });
    });
    srv.listen(port, "127.0.0.1", () => res({ srv, port: srv.address().port }));
  });
}
