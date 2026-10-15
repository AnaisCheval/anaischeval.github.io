# CLAUDE.md

Guidance for AI assistants working in this repo.

## What this is

A personal academic website (Anaïs Cheval, PhD student in the AVS Lab of Prof. Hanspeter Schaub, CU
Boulder; RL for autonomous Earth-observing satellites), adapted from andreumatoses.github.io and built
with **Eleventy 3** (Liquid templates)
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

For an agent: **do not run the full test suite after every small edit** (text, a link, one value): it is
too slow to iterate (decided 2026-10-15). The dev server (`docker compose up`, live reload) or a render
of the touched page is enough to check those. Run `test` once before pushing a batch of changes (CI
runs it on every push too), and for a visual change run `renders` for the pages you touched and **look
at the PNGs** (phone/laptop/wide, light/dark) before you call it done. Eleventy does not clear
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

- One file, `public/css/style.css`. Color tokens on `:root` as `light-dark(light, dark)`. **Dark is
  the default** (decided 2026-10-15; light was the default earlier that day, and before that the page
  followed the system setting): only the sun/moon button switches to light, by setting
  `data-theme="light"` on `<html>` (stored in localStorage, applied by an inline script in
  `base.liquid` before paint), which sets `color-scheme`. Renders of the light scheme set that stored
  choice. Keep new colors as tokens with both values.
- Page column `.flow`: text, figures, cards and the header/footer lines all share one column of at
  most 1120 px (`--wide`), so every left and right edge lines up.
- Fonts: Source Serif 4 (body) + Space Grotesk (headings), self-hosted variable WOFF2 (latin subset)
  in `public/fonts/`, OFL licenses next to them.
- Theme, subtle deep space: navy ink and lines (`--accent`), brutalist cards with a violet-tinted offset
  shadow (`--shadow`), violet links (`--link`). Accent tokens follow the colors of her figures:
  `--violet` strip satellites, `--amber` sweep satellite, `--teal` contacts, `--blue` Earth
  (`.hl-violet`, `.hl-amber`, ...). Dark mode is an indigo night sky (`#0c0a1c`, chosen 2026-10-15 from 8
  rendered variants): `--space` on `body` layers faint orbits (`public/css/orbits.svg`, top right; keep its
  satellite in the right margin), a violet and a teal nebula glow, and a static starfield, all fixed while
  scrolling. Light mode has a fainter daylight version of the same backdrop (added 2026-10-15): the same
  layers with `light-dark()` colors (navy dots for stars) and `public/css/orbits-light.svg` (`--orbits`).
  The theme test in `tests/site.spec.js` checks both `--bg` values.
- Satellites (2026-10-15): on the homepage, a small satellite orbits the round portrait (orbit numbers at
  the top of `content/index.html`, moved by `site.js`, in front of the photo on the near half). The header
  logo (`header.liquid`) is the favicon's Earth with a satellite circling it (SVG animation). Both stand
  still with reduced motion.
- Favicon: Earth, orbit and satellite (`public/favicon.svg`, with its own dark mode); the .ico and
  apple-touch-icon are exported from it with inkscape + ImageMagick.

## Conventions and gotchas

- Liquid here is liquidjs with `jsTruthy: true` (so `""` is false). Includes need quoted names:
  `{% include "partials/figure.liquid", src: "x.jpg" %}`. There is no `include.` prefix.
- Escape text that comes from `publications.bib` in templates (`| escape`); `&` in titles breaks HTML.
- In HTML pages, write `&amp;` for a literal `&` inside `$$…$$` math (MathJax still reads it as `&`).
- YAML data files: quote a value that contains `: `.
- Card covers (`cover:`) are shown in their own shape, never cropped. Ask for / make 4:3 covers
  when possible (e.g. 640×480) so the cards look even. `date_label:` replaces the date on a card (e.g.
  "Ongoing") and drops `datePublished` from the JSON-LD.
- Figures: render PDFs and flatten transparent PNGs with `scripts/media.sh figure` (white background,
  ~1600 px), or they disappear on the dark background. Use JPEG for photo-like figures.
- The host has ffmpeg 4.4 (no `min(source_fps,30)`; `media.sh` uses its own `fpscap`). Source material
  (CV, comprehensive-exam slides with all videos, prospectus LaTeX and figures, MSc thesis) is in
  `context/`, which is private and ignored by git; extract into `media-originals/`.
- Publications: `@unpublished` + "(under review)" / "(submitted)" in `venue` for submitted work;
  "(accepted)" until the DOI exists. Set `bibkey:` on a project page only for published work: it emits
  the Google Scholar `citation_*` tags (`seo.liquid`). The MSc thesis PDF is hosted next to its page.
- Facts on the research pages come from her prospectus and slides; do not invent numbers.
- Videos: H.264, level ≤ 4.0, yuv420p, ≤ 30 fps, `+faststart` (`scripts/media.sh`). Give each `<video>`
  `width`/`height` and a poster: every `X.mp4` has `X.poster.jpg` (`scripts/media.sh poster X.mp4`; a
  test checks it). Use `data-autoplay … preload="none"` for clips; `site.js` plays them while visible.
- Every page needs one `<h1>`, a `description` of 40+ characters, and an image for link previews.
  The tests check this, plus links, HTML validity, axe a11y, no sideways scroll at 360 px, and the
  homepage weight (< 1.5 MB).
- Do not hand-edit `_site/`. Do not commit `_dev/`, `renders/`, `media-originals/`, `context/`,
  `node_modules/`, `.cache/`.

## Git workflow

- Commit and push **directly to `main`** by default: content, fixes, and style or layout tweaks (CSS,
  templates, design adjustments the user has approved). Pushing to `main` deploys after the tests pass.
- Do **not** open a PR for small changes. Use a branch and PR only for a large restructuring (for example
  a framework change or a reorganization of many files), or when the user asks for one.
- **Batch edits into one themed commit**; push when a coherent chunk is done, not per file.
