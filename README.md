# Andreu's academic website

Source of [andreumatoses.github.io](https://andreumatoses.github.io). The site is built with
[Eleventy](https://www.11ty.dev/), uses plain CSS and a few lines of JavaScript, and is deployed to
GitHub Pages by GitHub Actions. Feel free to use it as a template; please keep a link to this repository.

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
  teaching.md
  research/<slug>/          one folder per project: index.md|html + its images, videos, PDFs
  posts/<date-title>/       blog posts (index.md + images)
_data/
  site.json                 name, URL, description, email
  news.yaml                 homepage news
  publications.bib          all publications
  navigation.yaml           top menu
  socials.yaml              contact icons
  redirects.yaml            old URLs that forward to new ones
_includes/                  layouts, partials (figure, gallery, card, ...) and icons
public/                     copied as-is: css/style.css, js/site.js, fonts, site icons (favicon.svg/.ico, apple-touch-icon.png)
scripts/media.sh            ffmpeg recipes for videos
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
date: 2026-05-01                # sets the order on the homepage
description: "Two or three sentences for the homepage card and for link previews."
cover: cover.mp4                # or an image, e.g. teaser.jpg
bibkey: matoses2026example      # optional: shows the citation from publications.bib
authors:
  - name: "Andreu Matoses Gimenez"
    superscript: "1"
  - name: "Coauthor Name"
    url: "https://example.com"
    superscript: "2"
affiliations:
  - name: "Delft University of Technology"
    url: "https://www.tudelft.nl/en"
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
@inproceedings{matoses2026example,
  title     = {Paper Title},
  author    = {Matoses Gimenez, Andreu and Other, Author},
  booktitle = {IEEE International Conference on Robotics and Automation (ICRA)},
  year      = {2026},
  month     = may,
  url       = {https://ieeexplore.ieee.org/document/...},
  eprint    = {2601.01234},
  archiveprefix = {arXiv},
  image    = {research/example/cover.poster.jpg},
  website  = {/example/},
  code     = {https://github.com/...},
  abstract = {...}
}
```

The header of `publications.bib` lists all site-only fields (`pubtype`, `venue`, `image`, `pdf`,
`website`, `code`, `video`, `award`, `abstract`, `hidden`, ...). The entry type sets the group:
`@article` = journal, `@inproceedings` = conference, `@mastersthesis`/`@phdthesis` = thesis,
`@misc` = preprint. Use `pubtype = {workshop}` for a workshop paper.

**Submitted papers.** Keep the entry as `@misc` with `hidden = {true}` until it is public. When it is on
arXiv, add `eprint` and `archiveprefix = {arXiv}`, and delete `hidden`. The paper then shows as a
preprint with an arXiv link. When it is accepted, change it to `@inproceedings` (or `@article`) with
the venue.

## Edit the homepage, news, menu and contact links

- Bio: `content/index.html`.
- News: `_data/news.yaml`, newest first, at most 3 (they show in one row). Put the text in quotes if it contains `: `.
- Menu: `_data/navigation.yaml`. Contact icons: `_data/socials.yaml`.
- Name, description, email: `_data/site.json`.

## Add a post

Make `content/posts/YYYY-MM-DD-title/index.md` with `title`, `date` and (optional) `description` and
`author`. A table of contents is added when the post has two or more `##` headings. Then uncomment the
Posts entry in `_data/navigation.yaml`.

## Images and videos

- **Images:** put them in the page folder at full quality. The build makes AVIF/WebP copies in several
  sizes, adds width and height, and lazy-loads them. Always write an `alt` text.
- **Videos:** use H.264 MP4. Browsers show a gray box for some phone exports (high level or a bogus
  frame rate), so re-encode with the script:

  ```shell
  scripts/media.sh web    in.mp4 out.mp4          # page video: max 1280 px, 30 fps, web-safe
  scripts/media.sh cover  in.mp4 cover.mp4        # homepage card loop: max 640 px, no audio (aim for 4:3)
  scripts/media.sh poster cover.mp4 1             # still frame at 1 s -> cover.poster.jpg
  ```

  **Every video `X.mp4` needs a poster `X.poster.jpg`** next to it (`scripts/media.sh poster X.mp4`).
  The poster shows before the clip plays and sizes the box; `cover.poster.jpg` is also the link preview.
  The figure and gallery includes add the poster by this name; in HTML write `poster="X.poster.jpg"`.
  Add `width` and `height` to `<video>` (from `ffprobe`) so the page does not jump while it loads.
  Clips with `data-autoplay` play only while they are on screen, and download only then.
- Keep the high-resolution originals outside the repository. `media-originals/` is ignored by git.

## Old URLs

When a page moves, add the old path to `_data/redirects.yaml`. The build makes a small page that
forwards visitors and keeps the link preview.
