import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig, type HtmlTagDescriptor, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const SITE = "https://thearpanhq.in";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The page is drawn by JavaScript, so a crawler or link scraper that doesn't run
// it would see an empty #root. This puts the real text of the site into the
// HTML at build time (replaced by React once it mounts) and emits the sitemap
// with an honest lastmod: the date of the latest commit.
function seo(): Plugin {
  const projectList = () => {
    const source = readFileSync("src/data/projects.ts", "utf8");
    const items = [
      ...source.matchAll(
        /title:\s*"([^"]+)",\s*description:\s*"([^"]+)",[\s\S]*?(?:url:\s*(?:`\$\{GITHUB\}\/([^`]+)`|"([^"]+)"))?,?\s*\},/g
      ),
    ];
    return items
      .map(([, title, description, repo, url]) => {
        const href = repo ? `https://github.com/thearpankumar/${repo}` : url;
        const name = href
          ? `<a href="${href}">${escapeHtml(title)}</a>`
          : escapeHtml(title);
        return `<li>${name}: ${escapeHtml(description)}</li>`;
      })
      .join("");
  };

  return {
    name: "seo",
    transformIndexHtml(html, ctx) {
      const tags: HtmlTagDescriptor[] = [];
      // preload the main font: it is otherwise only discovered after the CSS
      // has been downloaded and parsed
      const font = Object.keys(ctx.bundle ?? {}).find((name) =>
        /geist-latin-wght-normal.*\.woff2$/.test(name)
      );
      if (font) {
        tags.push({
          tag: "link",
          attrs: {
            rel: "preload",
            as: "font",
            type: "font/woff2",
            href: `/${font}`,
            crossorigin: "",
          },
          injectTo: "head",
        });
      }
      return {
        html: html.replace("<!--static-projects-->", projectList()),
        tags,
      };
    },
    generateBundle() {
      let lastmod: string;
      try {
        lastmod = execSync("git log -1 --format=%cs", {
          stdio: ["ignore", "pipe", "ignore"],
        })
          .toString()
          .trim();
      } catch {
        lastmod = new Date().toISOString().slice(0, 10);
      }
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`,
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), seo()],
  build: {
    // Two chunks are deliberately larger than Vite's 500 kB default: `three`
    // (~680 kB, needed by the character scene) and the lazy tech-stack chunk
    // (~830 kB raw / ~250 kB gzip, mostly the physics worker that
    // @react-three/cannon embeds as one string). Raise this if either grows.
    chunkSizeWarningLimit: 900,
  },
  optimizeDeps: {
    // Only scan the app entry (references/ holds unrelated demo projects)
    entries: ["index.html"],
  },
});
