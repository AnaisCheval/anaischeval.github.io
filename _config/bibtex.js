// Minimal BibTeX reader for _data/publications.bib.
// Each entry becomes an object for the templates, plus a clean BibTeX string
// (without the site-only fields) for the "copy BibTeX" buttons.

// Fields that only drive the website. They are removed from the copied BibTeX.
const SITE_FIELDS = new Set([
  "abstract", "image", "venue", "pubtype", "award", "hidden",
  "pdf", "website", "code", "video", "dataset", "poster", "slides", "thesis",
]);

// Link fields, in display order. `url` and `eprint` are standard BibTeX.
const LINKS = [
  ["pdf", "pdf"], ["url", "paper"], ["arxiv", "arxiv"], ["website", "website"],
  ["code", "code"], ["video", "video"], ["dataset", "dataset"], ["poster", "poster"],
  ["slides", "slides"], ["thesis", "thesis"],
];

const KIND = {
  article: "journal", inproceedings: "conference", conference: "conference",
  mastersthesis: "thesis", phdthesis: "thesis", misc: "preprint", unpublished: "preprint",
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const ACCENTS = { "'": "́", "`": "̀", "^": "̂", '"': "̈", "~": "̃", c: "̧", v: "̌" };

// LaTeX -> plain text: accents, escaped symbols, protective braces.
export function latexToText(s) {
  return s
    .replace(/\{?\\([`'^"~cv])\s*\{?([A-Za-z])\}?\}?/g, (_, a, c) => (c + ACCENTS[a]).normalize("NFC"))
    .replace(/\\([&%$#_])/g, "$1")
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function skip(text, j) {
  for (;;) {
    while (/\s/.test(text[j])) j++;
    if (text[j] !== "%") return j;
    while (j < text.length && text[j] !== "\n") j++;
  }
}

function closingBrace(text, open) {
  let depth = 0;
  for (let k = open; k < text.length; k++) {
    if (text[k] === "{") depth++;
    else if (text[k] === "}" && --depth === 0) return k;
  }
  throw new Error(`publications.bib: unbalanced braces near "${text.slice(open, open + 40)}"`);
}

function parseEntries(text) {
  const entries = [];
  const head = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let m;
  while ((m = head.exec(text))) {
    const type = m[1].toLowerCase();
    const fields = {};
    let j = head.lastIndex;
    for (;;) {
      j = skip(text, j);
      if (text[j] === ",") { j++; continue; }
      if (text[j] === "}") { j++; break; }
      const f = /^([\w-]+)\s*=\s*/.exec(text.slice(j));
      if (!f) throw new Error(`publications.bib: cannot read a field of "${m[2]}" near "${text.slice(j, j + 40)}"`);
      j += f[0].length;
      let value;
      if (text[j] === "{") {
        const end = closingBrace(text, j);
        value = text.slice(j + 1, end);
        j = end + 1;
      } else if (text[j] === '"') {
        const end = text.indexOf('"', j + 1);
        value = text.slice(j + 1, end);
        j = end + 1;
      } else {
        value = /^[^,}\s]+/.exec(text.slice(j))[0];
        j += value.length;
      }
      fields[f[1].toLowerCase()] = value.replace(/\s+/g, " ").trim();
    }
    head.lastIndex = j;
    entries.push({ type, key: m[2], fields });
  }
  return entries;
}

function toBibtex({ type, key, fields }) {
  const names = Object.keys(fields).filter((n) => !SITE_FIELDS.has(n));
  const width = Math.max(...names.map((n) => n.length));
  const bare = (n, v) => n === "month" && MONTHS.includes(v);
  const lines = names.map((n) => `  ${n.padEnd(width)} = ${bare(n, fields[n]) ? fields[n] : `{${fields[n]}}`}`);
  return `@${type}{${key},\n${lines.join(",\n")}\n}`;
}

function month(value) {
  if (!value) return 1;
  const v = value.toLowerCase().slice(0, 3);
  return MONTHS.includes(v) ? MONTHS.indexOf(v) + 1 : Number(value) || 1;
}

function author(name) {
  const [last, first] = name.split(",").map((s) => s.trim());
  return latexToText(first ? `${first} ${last}` : last);
}

function toPublication(entry) {
  const f = entry.fields;
  const arxiv = f.eprint && (f.archiveprefix || "arxiv").toLowerCase() === "arxiv" ? `https://arxiv.org/abs/${f.eprint}` : undefined;
  // For an arXiv preprint `url` is usually the arXiv page too: show that link once, as "arxiv".
  const links = { ...f, arxiv, url: f.url === arxiv ? undefined : f.url };
  const thesisVenue = entry.type.endsWith("thesis") &&
    `${entry.type === "phdthesis" ? "PhD thesis" : "Master's thesis"}, ${f.school}`;
  return {
    key: entry.key,
    kind: f.pubtype || KIND[entry.type] || "other",
    title: latexToText(f.title || ""),
    authors: (f.author || "").split(/\s+and\s+/).map(author),
    year: Number(f.year),
    date: `${f.year}-${String(month(f.month)).padStart(2, "0")}-01`,
    venue: latexToText(f.venue || f.journal || f.booktitle || thesisVenue || f.howpublished || f.publisher || ""),
    award: f.award && latexToText(f.award),
    abstract: f.abstract && latexToText(f.abstract),
    image: f.image,
    hidden: f.hidden === "true",
    links: LINKS.filter(([field]) => links[field]).map(([field, label]) => ({ label, url: links[field] })),
    fields: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, latexToText(v)])),
    bibtex: toBibtex(entry),
  };
}

// Newest first.
export function parseBib(text) {
  return parseEntries(text).map(toPublication).sort((a, b) => b.date.localeCompare(a.date));
}
