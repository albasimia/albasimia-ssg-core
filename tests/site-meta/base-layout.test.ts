import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const outputDirectory = mkdtempSync(join(tmpdir(), "asc-site-meta-"));
let indexHtml = "";
let aboutHtml = "";
let sitemapXml = "";

beforeAll(() => {
  execFileSync("npm", ["run", "build:site", "--", "--outDir", outputDirectory], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  indexHtml = readFileSync(join(outputDirectory, "index.html"), "utf8");
  aboutHtml = readFileSync(join(outputDirectory, "about", "index.html"), "utf8");
  sitemapXml = readFileSync(join(outputDirectory, "sitemap.xml"), "utf8");
});

afterAll(() => {
  rmSync(outputDirectory, { recursive: true, force: true });
});

describe("BaseLayout", () => {
  it("renders resolved site metadata in a static build", () => {
    expect(indexHtml).toContain('<html lang="ja">');
    expect(indexHtml).toContain('<meta name="generator"');
    expect(indexHtml).toContain('<link rel="canonical" href="https://example.com/">');
    expect(indexHtml).toContain('<meta property="og:title" content="ASC Example Site">');
    expect(indexHtml).toContain('<meta name="twitter:card" content="summary">');
  });

  it("accepts page metadata through the meta prop", () => {
    expect(aboutHtml).toContain('<title>ASCについて | ASC Example Site</title>');
    expect(aboutHtml).toContain('<link rel="canonical" href="https://example.com/about/">');
  });
});

describe("sitemap endpoint", () => {
  it("emits the adapter URL collection during a static build", () => {
    expect(sitemapXml).toContain("<loc>https://example.com/</loc>");
    expect(sitemapXml).toContain("<loc>https://example.com/about/</loc>");
    expect(sitemapXml.match(/<url>/g)).toHaveLength(2);
  });
});
