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

beforeAll(() => {
  execFileSync("npm", ["run", "build", "--", "--outDir", outputDirectory], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  indexHtml = readFileSync(join(outputDirectory, "index.html"), "utf8");
  aboutHtml = readFileSync(join(outputDirectory, "about", "index.html"), "utf8");
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

  it("keeps legacy page props working during migration", () => {
    expect(aboutHtml).toContain('<title>ASCについて | ASC Example Site</title>');
    expect(aboutHtml).toContain('<link rel="canonical" href="https://example.com/about/">');
  });
});
