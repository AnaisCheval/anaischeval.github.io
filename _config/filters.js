import fs from "node:fs";
import Image from "@11ty/eleventy-img";
import site from "../_data/site.json" with { type: "json" };

// Front matter may use Bootstrap Icons names (`bi-github`); map the few that differ.
const ICON_ALIASES = { xbox: "journal-text", scholar: "mortarboard", website: "globe2", external: "box-arrow-up-right" };
const KIND_ORDER = ["journal", "conference", "workshop", "thesis", "preprint", "other"];
const KIND_LETTER = { journal: "J", conference: "C", workshop: "W", thesis: "T", preprint: "P", other: "O" };

const icons = new Map();
function icon(name) {
  if (!name) return "";
  const file = ICON_ALIASES[name.replace(/^bi-/, "")] ?? name.replace(/^bi-/, "");
  if (!icons.has(file)) {
    const svg = fs.readFileSync(`_includes/icons/${file}.svg`, "utf8")
      .replace(/\s(width|height|class|fill|role)="[^"]*"/g, "")
      .replace("<svg", '<svg class="icon" fill="currentColor" aria-hidden="true" focusable="false"')
      .replace(/\s*\n\s*/g, "");
    icons.set(file, svg);
  }
  return icons.get(file);
}

// Display math, \( \), \[ \], or inline $..$ in the rendered page.
function hasMath(html) {
  return /\$\$[\s\S]+?\$\$|\\\(|\\\[|\$[^$\s<][^$<\n]*?\$/.test(html || "");
}

function absoluteUrl(path) {
  return new URL(path || "/", site.url).href;
}

// Link preview image: a 1200x630 crop, or 600x600 with "square". `src` is a path from content/.
async function ogImage(src, shape) {
  const [width, height] = shape === "square" ? [600, 600] : [1200, 630];
  const stats = await Image(`content/${src}`, {
    widths: [width],
    formats: ["jpeg"],
    outputDir: `${process.env.SITE_OUTPUT || "_site"}/img/`,
    urlPath: "/img/",
    filenameFormat: (id, _src, width, format) => `og-${id}-${width}.${format}`,
    transform: (sharp) => sharp.resize({ width, height, fit: "cover", position: "attention" }),
  });
  return absoluteUrl(stats.jpeg[0].url);
}

// Visible publications, numbered per kind (J3, C2, ...), grouped by year, newest first.
function publicationList(pubs) {
  const visible = pubs.filter((p) => !p.hidden);
  const left = {};
  for (const p of visible) left[p.kind] = (left[p.kind] ?? 0) + 1;
  const years = [...new Set(visible.map((p) => p.year))].sort((a, b) => b - a);
  return years.map((year) => {
    const items = visible
      .filter((p) => p.year === year)
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.date.localeCompare(a.date))
      .map((p) => ({ ...p, label: `${KIND_LETTER[p.kind] ?? "O"}${left[p.kind]--}` }));
    return { year, items };
  });
}

function findPublication(pubs, key) {
  const pub = pubs.find((p) => p.key === key);
  if (key && !pub) throw new Error(`bibkey "${key}" is not in _data/publications.bib`);
  return pub;
}

// Nested list of the h2/h3 headings (with ids) in a rendered post.
function toc(html) {
  const headings = [...(html || "").matchAll(/<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)];
  if (headings.length < 2) return "";
  let out = "<ol>";
  let level = 2;
  for (const [, l, id, text] of headings) {
    const n = Number(l);
    if (n > level) out += "<ol>";
    else if (n < level) out += "</li></ol></li>";
    else if (out !== "<ol>") out += "</li>";
    out += `<li><a href="#${id}">${text.replace(/<[^>]+>/g, "")}</a>`;
    level = n;
  }
  return out + (level === 3 ? "</li></ol>" : "") + "</li></ol>";
}

export default function (eleventyConfig) {
  eleventyConfig.addFilter("icon", icon);
  eleventyConfig.addFilter("hasMath", hasMath);
  eleventyConfig.addFilter("absoluteUrl", absoluteUrl);
  eleventyConfig.addAsyncFilter("ogImage", ogImage);
  eleventyConfig.addFilter("publicationList", publicationList);
  eleventyConfig.addFilter("findPublication", findPublication);
  eleventyConfig.addFilter("toc", toc);
  eleventyConfig.addFilter("isExternal", (url) => /^[a-z]+:/i.test(url || ""));
  // A file name in front matter links to the file in the project folder.
  eleventyConfig.addFilter("projectLink", (url, slug) => (/^([a-z]+:|\/)/i.test(url) ? url : `/${slug}/${url}`));
  // /old/page -> /old/page.html (GitHub Pages serves it without .html), /old/dir/ -> /old/dir/index.html
  eleventyConfig.addFilter("redirectPath", (from) => (from.endsWith("/") ? `${from}index.html` : `${from}.html`));
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));
}
