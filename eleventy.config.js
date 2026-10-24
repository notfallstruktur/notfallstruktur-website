import markdownIt from "markdown-it";

const md = markdownIt({ html: true, linkify: true });

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/img": "img", "src/media": "media", "src/css": "css", "src/js": "js", "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers", "src/_redirects": "_redirects" });

  // Schriften lokal ausliefern (keine Verbindung zu Google)
  const fonts = {
    "jost": ["300", "400", "600"],
    "bricolage-grotesque": ["700", "800"],
    "atkinson-hyperlegible": ["400", "700"]
  };
  for (const [name, weights] of Object.entries(fonts)) {
    for (const w of weights) {
      const file = `${name}-latin-${w}-normal.woff2`;
      eleventyConfig.addPassthroughCopy({ [`node_modules/@fontsource/${name}/files/${file}`]: `fonts/${file}` });
    }
  }

  eleventyConfig.addFilter("md", (s) => md.renderInline(String(s || "")));
  eleventyConfig.addFilter("datumDE", (iso) => {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
