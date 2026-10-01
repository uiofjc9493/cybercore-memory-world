// Tiny static server for the CYBERCORE ARCHIVE (no dependencies).
// Run: node serve.js [port]   →  http://localhost:8471
// Binds loopback by default; use HOST=0.0.0.0 to expose on LAN.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function parsePort(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return 8471;
  return n;
}
const PORT = parsePort(process.argv[2]);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function secureHeaders(isVersioned) {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cache-Control": isVersioned ? "public, max-age=31536000, immutable" : "no-cache",
  };
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", Allow: "GET, HEAD" });
    res.end("method not allowed");
    return;
  }
  const isHead = req.method === "HEAD";
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("bad request");
    return;
  }
  if (urlPath === "/") urlPath = "/index.html";
  // Reject null bytes early (Windows + URL edge).
  if (urlPath.includes("\0")) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("bad request");
    return;
  }
  const file = path.normalize(path.join(ROOT, urlPath));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("forbidden");
    return;
  }
  let real = file;
  try {
    // Resolve symlinks so a link cannot escape ROOT.
    if (fs.existsSync(file)) real = fs.realpathSync(file);
  } catch { /* fall through to stat error */ }
  if (real !== ROOT && !real.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("forbidden");
    return;
  }
  fs.stat(real, (statErr, st) => {
    if (statErr) {
      const code = statErr.code === "EACCES" ? 403 : 404;
      res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(statErr.code === "EACCES" ? "forbidden" : "not found");
      return;
    }
    if (!st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    const ext = path.extname(real).toLowerCase();
    const type = TYPES[ext] || "application/octet-stream";
    const etag = `"${st.size.toString(16)}-${Number(st.mtimeMs).toString(16)}"`;
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, { ETag: etag, ...secureHeaders(false) });
      res.end();
      return;
    }
    const isVersioned = /[?&]v=/.test(req.url || "");
    const headers = {
      "Content-Type": type,
      "Content-Length": st.size,
      ETag: etag,
      "Last-Modified": st.mtime.toUTCString(),
      ...secureHeaders(isVersioned),
    };
    res.writeHead(200, headers);
    if (isHead) { res.end(); return; }
    // Stream (no full-file buffering) + content hash guard.
    const stream = fs.createReadStream(real);
    stream.on("error", () => {
      try { res.destroy(); } catch { /* ignore */ }
    });
    stream.pipe(res);
    void crypto;
  });
});

server.on("clientError", (err, socket) => {
  try { socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); } catch { /* ignore */ }
});
server.listen(PORT, HOST, () => console.log(`CYBERCORE ARCHIVE online → http://${HOST}:${PORT}`));
server.on("error", (e) => {
  if (e && e.code === "EADDRINUSE") {
    console.error(`Port ${PORT} in use — run: node serve.js 8080`);
    process.exit(1);
  }
  throw e;
});
