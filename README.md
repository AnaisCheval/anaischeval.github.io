# Anaïs Cheval's academic website

Source of [anaischeval.github.io](https://anaischeval.github.io). The site is built with
[Eleventy](https://www.11ty.dev/), uses plain CSS and a few lines of JavaScript, and is deployed to
GitHub Pages by GitHub Actions. It is adapted from
[andreumatoses.github.io](https://github.com/AndreuMatoses/andreumatoses.github.io), with a deep-space
theme: navy ink, violet links and Space Grotesk headings; in dark mode, an indigo night sky with faint
orbits, a nebula glow and stars.

## Preview and test

You need Docker only.

```shell
docker compose up                   # dev server with live reload: http://localhost:8080
docker compose run --rm test        # build, then run all tests
docker compose run --rm renders     # build, then save screenshots of every page to renders/
```

The renders are full-page screenshots of each page at phone (390 px), laptop (1440 px) and
high-res (2560 px) widths, in light and dark mode. To render only some pages:
`RENDER_PAGES=/,/publications/ docker compose run --rm -e RENDER_PAGES renders`.

Drafts (`draft: true` in the front matter) show in the dev server, but not on the live site.
The dev server builds into `_dev/`; tests and the live site build into `_site/`.

The site follows the light/dark setting of the visitor's system. The sun/moon button at the top
right switches the theme; the browser remembers the choice.

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the site, runs the tests and
publishes it. If a test fails, the live site does not change. Other branches and pull requests are
built and tested, but not published.

One-time setting: in the repository, go to Settings → Pages and set **Source** to "GitHub Actions".

## Where things are

```
content/                    pages (the URL follows the folder)
  index.html                homepage: bio, news, research cards
  publications.html         list from _data/publications.bib
  research/<slug>/          one folder per project: index.md|html + its images, videos, PDFs
_data/
  site.json                 name, URL, description, email
  news.yaml                 homepage news
  publications.bib          all publications
  navigation.yaml           top menu
  socials.yaml              contact icons
  redirects.yaml            old URLs that forward to new ones
_includes/                  layouts, partials (figure, gallery, card, ...) and icons
public/                     copied as-is: css/style.css, js/site.js, fonts, site icons (favicon.svg/.ico, apple-touch-icon.png)
scripts/media.sh            ffmpeg recipes for videos, and figures from PDFs
tests/                      Playwright tests and renders
```

## Add a research project

1. Make a folder `content/research/<slug>/`. Use a short lowercase name with hyphens. The page is
   published at `/<slug>/`, so the name must not be the same as a top-level page (the build stops if it is).
2. Put the page in `index.md` (or `index.html`) and all its media in the same folder.
3. Make a cover video `cover.mp4` and its poster `cover.poster.jpg` (see [Media](#images-and-videos)),
   or use an image as the cover. **Aim for a 4:3 cover** (for example 640×480): the card shows the cover
   in its own shape without cropping, so other shapes work, but 4:3 makes the cards look even.

Front matter:

```yaml
---
title: "Paper title"
venue: "Conference (ABC) 2026"
date: 2026-05-01                # sets the order on the homepage (newest first)
# date_label: Ongoing           # optional: shown on the card instead of the date
description: "Two or three sentences for the homepage card and for link previews."
cover: cover.mp4                # or an image, e.g. teaser.jpg
bibkey: cheval2026example       # optional, published papers only: citation block + Google Scholar tags
authors:
  - name: "Anaïs Cheval"
    url: "/"
    superscript: "1"
  - name: "Coauthor Name"
    url: "https://example.com"
    superscript: "2"
# supervisors:                  # optional second line, "Supervised by ...", same fields as authors
#   - name: "Hanspeter Schaub"
#     superscript: "1"
affiliations:
  - name: "University of Colorado Boulder"
    url: "https://www.colorado.edu/aerospace/"
    superscript: "1"
links:                          # buttons under the title; an empty url shows a disabled button
  - name: Paper
    icon: bi-file-earmark-pdf   # Bootstrap Icons name; the SVG must be in _includes/icons/
    url: paper.pdf              # a file in this folder, or a full URL
  - name: Code (coming soon)
    icon: bi-github
    url: ""
note: "* Equal contribution."   # optional line under the buttons
# og_image: teaser.jpg          # optional: image for link previews (default: cover.poster.jpg or the cover image)
# external_url: https://...     # optional: no page, the card links to this website instead
# ignore: true                  # optional: hide the project
---
```

In the page body, refer to media by file name:

```html
<figure>
  <img src="teaser.jpg" alt="What the image shows">
  <figcaption>Caption.</figcaption>
</figure>

<figure>
  <video src="real_run.mp4" poster="real_run.poster.jpg" width="1280" height="720" data-autoplay controls loop muted playsinline preload="none"></video>
  <figcaption>Caption.</figcaption>
</figure>

<div class="cols center" style="--cols: 7fr 5fr">   <!-- two columns on wide screens, stacked on phones -->
  <div>…</div>
  <div>…</div>
</div>
```

In Markdown, the same with includes:

```liquid
{% include "partials/figure.liquid", src: "photo.jpg", alt: "What it shows", caption: "Optional", width: 600 %}
{% include "partials/gallery.liquid", items: gallery, columns: 2, caption: "Optional" %}
```

Useful classes: `wide` (use the full width), `small` (smaller text), `caption`, `eyebrow`,
`first-on-mobile` (show this column first on phones), `table-wrap` (scroll a wide table).
Math: `$…$` inline and `$$…$$` display. MathJax loads only on pages that contain math.

## Add a publication

Add the entry to `_data/publications.bib`. Paste the BibTeX from Google Scholar, IEEE or arXiv, then add
the site-only fields. The copy button gives visitors the entry without these fields.

```bibtex
@inproceedings{cheval2026example,
  title     = {Paper Title},
  author    = {Cheval, Anaïs and Schaub, Hanspeter},
  booktitle = {AIAA SCITECH 2026 Forum},
  address   = {Orlando, FL},
  year      = {2026},
  month     = jan,
  doi       = {10.2514/6.2026-...},
  url       = {https://doi.org/10.2514/6.2026-...},
  venue    = {AIAA SciTech Forum, Orlando, FL},
  pdf      = {https://hanspeterschaub.info/Papers/...pdf},
  image    = {research/example/cover.poster.jpg},
  website  = {/example/},
  abstract = {...}
}
```

The header of `publications.bib` lists all site-only fields (`pubtype`, `venue`, `image`, `pdf`,
`website`, `code`, `video`, `award`, `abstract`, `hidden`, ...). The entry type sets the group:
`@article` = journal, `@inproceedings` = conference, `@mastersthesis`/`@phdthesis` = thesis,
`@misc` = preprint. Use `pubtype = {workshop}` for a workshop paper.

**Thumbnail** (`image`): the cover poster of the project page, or, for a paper without a page, a square
crop of one of its figures in `content/img/pubs/` (e.g. `image = {img/pubs/ludwig2026trusted.png}`).
An entry without `image` shows a neutral square with an orbit mark, so the list stays aligned.

Write names in UTF-8 (`Anaïs`, not `Ana{\"\i}s`): the name must match `author` in `_data/site.json`
to show in bold. Keys use letters, digits and `_` only.

**Status of a paper.**

- **Submitted or under review:** `@unpublished` (listed with the label P), the status in `venue`, e.g.
  `venue = {Journal of Aerospace Information Systems (under review)}`.
- **Accepted:** `@inproceedings` (or `@article`), and the venue ends with `(accepted)`.
- **Published:** add `doi`, `url` and, if available, `pdf`; remove `(accepted)`. Only now set `bibkey:` on
  its project page.

## Google Scholar

A project page with `bibkey:` gets the `citation_*` meta tags that Google Scholar reads (title, authors,
date, conference or institution, PDF). Use it only for published work (and the MSc thesis), so that
submitted papers are not indexed early. For a PDF hosted on this site, put it in the project folder next
to the page (as `content/research/msc-thesis/Cheval_2023_MSc_thesis.pdf`) and link it with `pdf` in the
`.bib`. Scholar also reads the first page of the PDF, so its title page should show the right title,
author and year.

## Edit the homepage, news, menu and contact links

- Bio: `content/index.html`.
- News: `_data/news.yaml`, newest first, at most 3 (they show in one row). Put the text in quotes if it contains `: `.
- Menu: `_data/navigation.yaml`. Contact icons: `_data/socials.yaml`.
- Name, description, email: `_data/site.json`.

## Add a post

The site has no blog page yet. To start one, copy `content/posts.html` and
`content/posts/posts.11tydata.json` from the template repository, add `- { name: Posts, link: /posts/ }`
to `_data/navigation.yaml`, and make `content/posts/YYYY-MM-DD-title/index.md` with `title`, `date` and
(optional) `description`. A table of contents is added when the post has two or more `##` headings.

## Images and videos

- **Images:** put them in the page folder at full quality. The build makes AVIF/WebP copies in several
  sizes, adds width and height, and lazy-loads them. Always write an `alt` text.
- **Videos:** use H.264 MP4. Browsers show a gray box for some phone exports (high level or a bogus
  frame rate), so re-encode with the script:

  ```shell
  scripts/media.sh web    in.mp4 out.mp4          # page video: max 1280 px, 30 fps, web-safe
  scripts/media.sh cover  in.mp4 cover.mp4        # homepage card loop: max 640 px, no audio (aim for 4:3)
  scripts/media.sh poster cover.mp4 1             # still frame at 1 s -> cover.poster.jpg
  scripts/media.sh figure fig.pdf fig.png         # figure from a PDF (or PNG): ~1600 px, white background
  CRF=31 scripts/media.sh cover in.mp4 cover.mp4  # smaller cover (default 28)
  ```

  **Every video `X.mp4` needs a poster `X.poster.jpg`** next to it (`scripts/media.sh poster X.mp4`).
  The poster shows before the clip plays and sizes the box; `cover.poster.jpg` is also the link preview.
  The figure and gallery includes add the poster by this name; in HTML write `poster="X.poster.jpg"`.
  Add `width` and `height` to `<video>` (from `ffprobe`) so the page does not jump while it loads.
  Clips with `data-autoplay` play only while they are on screen, and download only then.
- **Figures** with a transparent background become unreadable in dark mode: `scripts/media.sh figure`
  renders PDFs and puts PNGs on white.
- Keep the high-resolution originals outside the repository. `media-originals/` and `context/` (the CV,
  slides and thesis sources the site was made from) are ignored by git.

## Old URLs

When a page moves, add the old path to `_data/redirects.yaml`. The build makes a small page that
forwards visitors and keeps the link preview.
