// The built pages, read from _site/ (run the build first).
import fs from "node:fs";
import path from "node:path";

export const SITE = "_site";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith(".html") ? [path.join(dir, d.name)] : [],
  );
}

const toUrl = (file) => "/" + path.relative(SITE, file).replace(/index\.html$/, "").replace(/\.html$/, "");

export const allHtml = walk(SITE).map((file) => ({ file, url: toUrl(file), html: fs.readFileSync(file, "utf8") }));
export const redirects = allHtml.filter((p) => /http-equiv="refresh"/.test(p.html));
// Real pages: everything except redirect stubs and the 404 page.
export const pages = allHtml.filter((p) => !redirects.includes(p) && p.url !== "/404");
