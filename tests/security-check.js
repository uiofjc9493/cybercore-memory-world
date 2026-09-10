// CYBERCORE security regression suite.
// Run:  node tests/security-check.js     (exit 0 = pass, 1 = fail)
// Every check below guards a real, previously reviewed property.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const files = {
  html: read("index.html"),
  js: read("app.js"),
  css: read("styles.css"),
  serve: read("serve.js"),
  vercel: fs.existsSync(path.join(ROOT, "vercel.json")) ? read("vercel.json") : null,
};

let failures = 0;
function check(name, ok, detail = "") {
  console.log((ok ? "PASS " : "FAIL ") + name + (detail && !ok ? " — " + detail : ""));
  if (!ok) failures += 1;
}

// 1. dangerous sinks must not exist in shipped code
for (const [name, src] of [["app.js", files.js], ["serve.js", files.serve]]) {
  for (const pat of ["eval(", "document.write", "outerHTML", "new Function("]) {
    check(`no ${pat} in ${name}`, !src.includes(pat), "found");
  }
}
check("no inline event handlers in HTML", !/on(click|load|error|submit|input|change|keydown|mouseover|focus)=/i.test(files.html));
check("no javascript: URLs", !/javascript:/i.test(files.html + files.js));
check("no <script> without src in HTML", !/<script(?![^>]*src=)/i.test(files.html));
check("no style= attributes in HTML", !/\sstyle="/i.test(files.html));

// 2. remote URLs must be https (except fictional in-world domains, localhost, dev server)
const remoteRe = /https?:\/\/[^\s"'()<>]+/g;
const okHosts = [/^https:\/\//, /portal\.home/, /midnight-forum\.net/, /geocities\.home/, /localhost/, /127\.0\.0\.1/, /w3\.org\/2000\/svg/]; // last: XML namespace id, never fetched
for (const [name, src] of [["index.html", files.html], ["app.js", files.js]]) {
  const bad = (src.match(remoteRe) || []).filter((u) => !okHosts.some((re) => re.test(u)));
  check(`https-only remotes in ${name}`, bad.length === 0, bad.slice(0, 3).join(", "));
}

// 3. external tabs must not get window.opener
const blanks = files.html.match(/<a[^>]*target="_blank"[^>]*>/g) || [];
check("noopener on all _blank links", blanks.every((t) => /rel="[^"]*noopener/.test(t)), blanks.length + " links");

// 4. no secrets or credentials in the repo
const secretRes = [/ghp_[A-Za-z0-9]{10,}/, /gho_[A-Za-z0-9]{10,}/, /AKIA[0-9A-Z]{16}/, /BEGIN PRIVATE KEY/, /AIza[0-9A-Za-z_-]{10,}/, /sk-[A-Za-z0-9]{10,}/];
for (const [name, src] of Object.entries(files)) {
  if (src == null) continue;
  const hit = secretRes.find((re) => re.test(src));
  check(`no secrets in ${name}`, !hit, String(hit));
}

// 5. clickjacking + nosniff + embed policy must be pinned in vercel.json
check("vercel.json exists", !!files.vercel);
if (files.vercel) {
  check("CSP has frame-ancestors", /frame-ancestors/.test(files.vercel));
  check("CSP object-src none", /object-src 'none'/.test(files.vercel));
  check("nosniff pinned", /nosniff/.test(files.vercel));
  check("SAMEORIGIN framing pinned", /SAMEORIGIN/.test(files.vercel));
}

// 6. third-party script surface stays at exactly the official YouTube API
const ytSrcs = (files.js.match(/https:\/\/[^\s"']*youtube[a-z.-]*/g) || []).filter(
  (u, i, a) => a.indexOf(u) === i
);
check(
  "YT hosts allowlisted",
  ytSrcs.every((u) => /^https:\/\/(www\.)?youtube(-nocookie)?\.com/.test(u)),
  ytSrcs.join(", ")
);

// 7. no stray debug logging in shipped app code
check("no console.log in app.js", !/console\.log/.test(files.js));

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL SECURITY CHECKS PASSED");
process.exit(failures ? 1 : 0);
