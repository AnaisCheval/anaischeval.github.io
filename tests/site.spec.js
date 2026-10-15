// Checks on the built site (_site/). Run with `npm test` after a build,
// or `docker compose run --rm test` (builds first).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { HtmlValidate } from "html-validate";
import { load as loadYaml } from "js-yaml";
import { SITE, allHtml, pages, redirects } from "./pages.js";
import { resolve } from "./serve.js";

const site = JSON.parse(fs.readFileSync("_data/site.json", "utf8"));
const oldUrls = loadYaml(fs.readFileSync("_data/redirects.yaml", "utf8"));
const attr = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const meta = (html, key) => attr(html, new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`, "g"));

test.describe("static checks", () => {
  test("internal links and media resolve to files", () => {
    const missing = [];
    for (const { url, html } of allHtml) {
      const refs = [
        ...attr(html, /\s(?:href|src|poster)="([^"#?]+)/g),
        ...attr(html, /\ssrcset="([^"]+)"/g).flatMap((s) => s.split(",").map((x) => x.trim().split(" ")[0])),
      ];
      for (const ref of refs) {
        if (/^(?:[a-z]+:|\/\/)/i.test(ref)) continue;
        const target = new URL(ref, `http://x${url}`).pathname;
        if (resolve(target).status === 404) missing.push(`${url} -> ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("every old URL still leads somewhere", () => {
    for (const { from, to } of oldUrls) {
      const stub = resolve(from);
      expect(stub.status, from).toBe(200);
      expect(fs.readFileSync(stub.file, "utf8")).toContain(to.includes("://") ? to : `${site.url}${to}`);
      if (!to.includes("://")) expect(resolve(to).status, to).toBe(200);
    }
    // Old PDF paths are kept as copies.
    expect(resolve("/assets/files/papers/Parallel_realization_RAL_final_arxiv_version.pdf").status).toBe(200);
    expect(resolve("/assets/files/papers/ICAS2022_0447_paper.pdf").status).toBe(200);
  });

  test("HTML is valid", async () => {
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: {
        "no-inline-style": "off", // per-figure max-width and column ratios
        "doctype-style": "off",
        "attribute-empty-style": "off", // the image transform writes hidden=""
        "no-trailing-whitespace": "off",
        "attribute-boolean-style": "off",
        "void-style": "off",
        "long-title": "off",
        "no-redundant-role": "off",
        "attribute-allowed-values": ["error", { ignore: ["sizes"] }],
      },
    });
    const errors = [];
    for (const { file } of allHtml) {
      const report = await validator.validateFile(file);
      for (const r of report.results) for (const m of r.messages) errors.push(`${file}:${m.line} ${m.ruleId}: ${m.message}`);
    }
    expect(errors).toEqual([]);
  });

  for (const { url, html } of pages) {
    test(`SEO tags on ${url}`, () => {
      expect(html.match(/<title>/g)).toHaveLength(1);
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      const [description] = meta(html, "description");
      expect(description?.length).toBeGreaterThan(40);
      expect(attr(html, /<link rel="canonical" href="([^"]+)"/g)).toEqual([`${site.url}${url}`]);
      const [image] = meta(html, "og:image");
      expect(image).toMatch(new RegExp(`^${site.url}/`));
      expect(fs.existsSync(path.join(SITE, image.slice(site.url.length)))).toBe(true);
      for (const json of attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(json);
    });
  }

  test("every video has a poster", () => {
    const bare = pages.flatMap(({ url, html }) => attr(html, /(<video(?![^>]*poster=)[^>]*>)/g).map((v) => `${url}: ${v}`));
    expect(bare).toEqual([]);
  });

  test("sitemap lists every page and no redirect", () => {
    const sitemap = fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8");
    const locs = attr(sitemap, /<loc>([^<]+)<\/loc>/g);
    expect(locs.sort()).toEqual(pages.map((p) => `${site.url}${p.url}`).sort());
    expect(redirects.length).toBe(oldUrls.length);
    expect(fs.readFileSync(path.join(SITE, "robots.txt"), "utf8")).toContain(`Sitemap: ${site.url}/sitemap.xml`);
  });

  test("MathJax loads only on pages with math", () => {
    for (const { url, html } of pages) {
      const body = html.split("<main")[1];
      const hasMath = /\$\$|\\\(|\$[^$\s<][^$<\n]*?\$/.test(body);
      expect(html.includes("mathjax"), url).toBe(hasMath);
    }
  });
});

test.describe("in the browser", () => {
  for (const { url } of pages) {
    test(`${url}: no console errors, no sideways scroll on a small phone, no serious a11y issues`, async ({ page }) => {
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(url, { waitUntil: "load" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
      const serious = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test("homepage downloads less than 1.5 MB on first load", async ({ page }) => {
    let bytes = 0;
    page.on("requestfinished", async (req) => {
      const sizes = await req.sizes().catch(() => null);
      if (sizes) bytes += sizes.responseBodySize + sizes.responseHeadersSize;
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    console.log(`homepage: ${(bytes / 1e6).toFixed(2)} MB`);
    expect(bytes).toBeLessThan(1.5e6);
  });

  test("videos below the fold are not downloaded on load", async ({ page }) => {
    const videos = [];
    page.on("request", (req) => req.url().endsWith(".mp4") && videos.push(req.url()));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/hybrid-flow-planning/", { waitUntil: "networkidle" });
    expect(videos).toEqual([]);
  });

  test("copy BibTeX puts the clean entry on the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/publications/");
    const item = page.locator(".pub").first();
    await item.getByRole("button", { name: "bibtex" }).click();
    await item.getByRole("button", { name: "Copy" }).click();
    await expect(item.getByRole("button", { name: "Copied" })).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toMatch(/^@\w+\{\w+,\n/);
    expect(text).toMatch(/\n\}$/);
    expect(text).not.toMatch(/\b(abstract|image|website|pubtype|venue)\s*=/);
  });

  test("old research URL forwards to the new page", async ({ page }) => {
    await page.goto("/research/hybrid-flow-planning");
    await expect(page).toHaveURL(/\/hybrid-flow-planning\/$/);
    await expect(page.locator("h1")).toContainText("Hybrid Flow Matching");
  });

  test("theme button switches and remembers the theme", async ({ page }) => {
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    expect(await bg()).toBe("rgb(255, 255, 255)");
    await page.getByRole("button", { name: /light and dark/ }).click();
    expect(await bg()).toBe("rgb(18, 18, 18)");
    await page.goto("/publications/");
    expect(await bg()).toBe("rgb(18, 18, 18)");
    // Back to light = same as the system, so the stored choice is cleared.
    await page.getByRole("button", { name: /light and dark/ }).click();
    expect(await bg()).toBe("rgb(255, 255, 255)");
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
  });

  test("dark mode follows the system setting", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(18, 18, 18)");
  });
});
