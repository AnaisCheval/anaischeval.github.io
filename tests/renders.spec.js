// Full-page screenshots of every page, for review: renders/<page>--<viewport>--<scheme>.png
// Run with `npm run renders` (or `docker compose run --rm renders`).
import { test } from "@playwright/test";
import { pages } from "./pages.js";

const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  laptop: { width: 1440, height: 900 },
  wide: { width: 2560, height: 1440 },
};
const only = process.env.RENDER_PAGES?.split(",");
const list = pages.filter((p) => !only || only.includes(p.url));

test.skip(!process.env.RENDERS, "set RENDERS=1 (npm run renders)");

for (const scheme of ["light", "dark"]) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    for (const { url } of list) {
      test(`${url} ${name} ${scheme}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        // Reduced motion: covers show their poster, so renders are stable.
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate(async () => {
          for (const img of document.querySelectorAll("img[loading=lazy]")) img.loading = "eager";
          await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
          await document.fonts.ready;
        });
        await page.waitForTimeout(300);
        const slug = url === "/" ? "home" : url.replace(/^\/|\/$/g, "").replaceAll("/", "_");
        await page.screenshot({ path: `renders/${slug}--${name}--${scheme}.png`, fullPage: true });
      });
    }
  }
}
