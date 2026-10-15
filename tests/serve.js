// Static server for _site/ with GitHub Pages rules: /dir -> 301 /dir/, /page -> page.html,
// unknown paths -> 404.html, byte ranges for video.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const isMain = import.meta.url === `file://${process.argv[1]}`;
const root = path.resolve(isMain ? process.argv[2] || "_site" : "_site");
const port = Number(process.argv[3] || 8081);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".xml": "application/xml", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".mp4": "video/mp4",
  ".pdf": "application/pdf", ".woff2": "font/woff2",
};

export function resolve(urlPath) {
  const file = path.join(root, decodeURIComponent(urlPath));
  if (!file.startsWith(root)) return { status: 404 };
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (stat?.isDirectory()) {
    if (!urlPath.endsWith("/")) return { status: 301, location: `${urlPath}/` };
    const index = path.join(file, "index.html");
    return fs.existsSync(index) ? { status: 200, file: index } : { status: 404 };
  }
  if (stat) return { status: 200, file };
  if (fs.existsSync(`${file}.html`)) return { status: 200, file: `${file}.html` };
  return { status: 404 };
}

if (isMain) {
  http.createServer((req, res) => {
    const { pathname, search } = new URL(req.url, "http://localhost");
    const r = resolve(pathname);
    if (r.status === 301) {
      res.writeHead(301, { Location: r.location + search });
      return res.end();
    }
    const file = r.status === 200 ? r.file : path.join(root, "404.html");
    const size = fs.statSync(file).size;
    const headers = { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Accept-Ranges": "bytes" };
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    if (range && r.status === 200) {
      const start = Number(range[1] || 0);
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(r.status, { ...headers, "Content-Length": size });
    fs.createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
}
