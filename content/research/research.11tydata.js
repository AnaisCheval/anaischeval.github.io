// Defaults for every research project: content/research/<slug>/index.(md|html) -> /<slug>/
const slugOf = (data) => data.page.filePathStem.split("/")[2];
const isVideo = (file) => /\.(mp4|webm)$/.test(file || "");

export default {
  layout: "layouts/project.liquid",
  eleventyComputed: {
    slug: slugOf,
    // A project with `external_url` only has a homepage card that links there.
    permalink: (data) => (data.external_url ? false : `/${slugOf(data)}/`),
    // Still image for the link preview (from content/): cover.poster.jpg for a video cover.
    og_source: (data) =>
      `research/${slugOf(data)}/${data.og_image || (isVideo(data.cover) ? "cover.poster.jpg" : data.cover)}`,
  },
};
