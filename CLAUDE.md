# CLAUDE.md

Guidance for AI assistants working in this repo.

## What this is

A personal academic website (Andreu Matoses Gimenez), built with **Eleventy 3** (Liquid templates)
and deployed to **GitHub Pages by GitHub Actions** (`.github/workflows/deploy.yml`: build → Playwright
tests → deploy, on `main` only). Plain CSS and a small JS file, no framework. Favor simplicity and easy
content editing over abstraction. `README.md` is the user-facing "how to add content" guide; read it
before content tasks. It is not published.

## Commands (Docker only; Node is not installed on the host)

```shell
docker compose up                   # dev server, live reload, http://localhost:8080 (builds into _dev/)
docker compose run --rm test        # build + all tests (tests/site.spec.js)
docker compose run --rm renders     # build + screenshots of every page -> renders/*.png
RENDER_PAGES=/,/publications/ docker compose run --rm -e RENDER_PAGES renders   # some pages only
```

For an agent: after a change, run `test`, then `renders` for the pages you touched, and **look at the
PNGs** (phone/laptop/wide, light/dark) before you call a visual change done. Eleventy does not clear
`_site/`; stale files there can hide a broken link locally (CI builds from scratch). The dev server
writes to `_dev/` (it also renders drafts), so it never pollutes the test build in `_site/`.

## Layout

```
eleventy.config.js     plugins, passthrough copy, collections, slug-clash check
_config/               filters.js (icon, ogImage, publicationList, toc, ...), bibtex.js (own small
                       .bib parser), markdown-math.js (keeps $..$ away from markdown)
_data/                 site.json, news.yaml, navigation.yaml, socials.yaml, redirects.yaml,
                       publications.bib (parsed by _config/bibtex.js into `publications`)
_includes/layouts/     base.liquid -> page | project | post
_includes/partials/    seo, header, footer, socials, project-card, publication, bibtex, figure, gallery
_includes/icons/       SVGs inlined by the `icon` filter (Bootstrap Icons names, `bi-` prefix optional)
content/               input dir. research/<slug>/ = one project (page + media); posts/<dated>/
public/                copied to the site root: css/style.css, js/site.js, fonts/, site icons
                       (favicon.svg with its own dark mode, favicon.ico 32 px, apple-touch-icon.png 180 px)
scripts/media.sh       ffmpeg recipes (web, cover, poster)
tests/                 serve.js (GitHub-Pages-like static server), pages.js, site.spec.js, renders.spec.js
```

### How the pieces connect
- `content/research/research.11tydata.js` gives every project the `project` layout, the permalink
  `/<slug>/` (or none if `external_url` is set), and `og_source` (cover.poster.jpg or the cover image).
- Media in a project folder is passthrough-copied to `/<slug>/` (flat: no subfolders). Write media
  paths as plain file names. `<img>` tags are processed by the eleventy-img transform (AVIF/WebP,
  srcset, width/height, lazy) into `/img/`; absolute `src` paths resolve from `content/`.
- `bibkey:` on a project page pulls the entry from `publications.bib` for the Citation block and the
  Google Scholar `citation_*` meta tags.
- Link previews: `ogImage` filter crops a 1200×630 JPEG (or 600×600 with "square" for non-project pages).
- MathJax 4 (CDN) is added only when `hasMath` finds math in the rendered page (`math: true|false` overrides).
- `redirects.yaml` → `content/redirects.liquid` writes stub pages (canonical + meta refresh + og tags).
  A `from` without a trailing slash becomes `<from>.html` (GitHub Pages serves it without `.html`).

## Styling

- One file, `public/css/style.css`. Color tokens on `:root` as `light-dark(light, dark)`. The page
  follows the system setting; the sun/moon button in the header sets `data-theme` on `<html>` (stored
  in localStorage, applied by an inline script in `base.liquid` before paint), which sets `color-scheme`.
  Keep new colors as tokens with both values.
- Page column `.flow`: text, figures, cards and the header/footer lines all share one column of at
  most 1120 px (`--wide`), so every left and right edge lines up.
  **To revisit (decided 2026-10-06):** body text now runs up to ~110 characters per line on research
  pages and posts (comfortable reading is ~60–80). Rendered alternatives: a 900 px page column (~91
  chars, everything still aligned) or larger body text on wide screens (~97 chars).
- Fonts: Source Serif 4 (body) + Inter (headings), self-hosted variable WOFF2 (latin subset) in
  `public/fonts/`, OFL licenses next to them.
- Theme: black borders/lines (`--accent`), brutalist cards with a light gray offset shadow
  (`--shadow`), blue links (`--link`).

## Conventions and gotchas

- Liquid here is liquidjs with `jsTruthy: true` (so `""` is false). Includes need quoted names:
  `{% include "partials/figure.liquid", src: "x.jpg" %}`. There is no `include.` prefix.
- Escape text that comes from `publications.bib` in templates (`| escape`); `&` in titles breaks HTML.
- In HTML pages, write `&amp;` for a literal `&` inside `$$…$$` math (MathJax still reads it as `&`).
- YAML data files: quote a value that contains `: `.
- Card covers (`cover:`) are shown in their own shape, never cropped. Ask for / make 4:3 covers
  when possible (e.g. 640×480) so the cards look even.
- Videos: H.264, level ≤ 4.0, yuv420p, ≤ 30 fps, `+faststart` (`scripts/media.sh`). Give each `<video>`
  `width`/`height` and a poster: every `X.mp4` has `X.poster.jpg` (`scripts/media.sh poster X.mp4`; a
  test checks it). Use `data-autoplay … preload="none"` for clips; `site.js` plays them while visible.
- Every page needs one `<h1>`, a `description` of 40+ characters, and an image for link previews.
  The tests check this, plus links, HTML validity, axe a11y, no sideways scroll at 360 px, and the
  homepage weight (< 1.5 MB).
- Do not hand-edit `_site/`. Do not commit `_dev/`, `renders/`, `media-originals/`, `node_modules/`, `.cache/`.

## Git workflow

- Commit and push **directly to `main`** by default: content, fixes, and style or layout tweaks (CSS,
  templates, design adjustments the user has approved). Pushing to `main` deploys after the tests pass.
- Do **not** open a PR for small changes. Use a branch and PR only for a large restructuring (for example
  a framework change or a reorganization of many files), or when the user asks for one.
- **Batch edits into one themed commit**; push when a coherent chunk is done, not per file.
