import fs from "node:fs";
import { load as loadYaml } from "js-yaml";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import markdownItAnchor from "markdown-it-anchor";
import mathPassthrough from "./_config/markdown-math.js";
import { parseBib } from "./_config/bibtex.js";
import filters from "./_config/filters.js";
import site from "./_data/site.json" with { type: "json" };

const RESEARCH = "content/research";
// The dev server builds into _dev/ (docker-compose.yaml), so it can run next to a test build in _site/.
const OUTPUT = process.env.SITE_OUTPUT || "_site";
const MEDIA = "{mp4,webm,pdf,jpg,jpeg,png,gif,svg,webp}";

// Each research folder is published at /<folder>/, so its name must not clash
// with a top-level page or folder.
function projectSlugs() {
  const slugs = fs.readdirSync(RESEARCH, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const taken = new Set([
    ...fs.readdirSync("content").map((f) => f.replace(/\.(html|md|liquid)$/, "")),
    ...fs.readdirSync("public"),
    "img", "research", "feed.xml",
  ]);
  const clash = slugs.filter((s) => taken.has(s));
  if (clash.length) throw new Error(`Research folder name already used at the top level: ${clash.join(", ")}`);
  return slugs;
}

export default function (eleventyConfig) {
  eleventyConfig.addDataExtension("yaml", (text) => loadYaml(text));
  eleventyConfig.addDataExtension("bib", (text) => parseBib(text));

  eleventyConfig.addPassthroughCopy({ public: "/" });
  for (const slug of projectSlugs()) {
    eleventyConfig.addPassthroughCopy({ [`${RESEARCH}/${slug}/*.${MEDIA}`]: slug });
  }
  // Old PDF links from before the move to Eleventy.
  eleventyConfig.addPassthroughCopy({
    [`${RESEARCH}/parallel-realization/Parallel_realization_RAL_final_arxiv_version.pdf`]: "assets/files/papers/Parallel_realization_RAL_final_arxiv_version.pdf",
    [`${RESEARCH}/alpha-uav/ICAS2022_0447_paper.pdf`]: "assets/files/papers/ICAS2022_0447_paper.pdf",
  });

  // Drafts show in `npm run dev` but are not built for the live site.
  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") return false;
  });

  eleventyConfig.addCollection("research", (api) =>
    api.getFilteredByGlob(`${RESEARCH}/*/index.*`).filter((p) => !p.data.ignore).sort((a, b) => b.date - a.date),
  );
  eleventyConfig.addCollection("posts", (api) => api.getFilteredByGlob("content/posts/*/index.*").reverse());

  eleventyConfig.setLiquidOptions({ jsTruthy: true, timezoneOffset: 0 });
  eleventyConfig.amendLibrary("md", (md) =>
    md.use(mathPassthrough).use(markdownItAnchor, { level: [2, 3], tabIndex: false }),
  );

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["avif", "webp", "auto"],
    widths: [480, 960, 1600],
    svgShortCircuit: true,
    outputDir: `${OUTPUT}/img/`,
    urlPath: "/img/",
    htmlOptions: {
      imgAttributes: { loading: "lazy", decoding: "async", sizes: "(min-width: 1180px) 1100px, 100vw" },
    },
  });
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    collection: { name: "posts", limit: 20 },
    metadata: { language: site.lang, title: site.title, base: `${site.url}/`, author: { name: site.author } },
  });
  eleventyConfig.addPlugin(filters);

  return {
    dir: { input: "content", includes: "../_includes", data: "../_data", output: OUTPUT },
    templateFormats: ["md", "html", "liquid", "njk"], // njk: the feed plugin template
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
  };
}
