import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const temporaryRoot = mkdtempSync(join(tmpdir(), "asc-package-"));
const packDirectory = join(temporaryRoot, "pack");
const consumerDirectory = join(temporaryRoot, "consumer");
const npmCacheDirectory = join(temporaryRoot, "npm-cache");
const yamlPackageDirectory = join(projectRoot, "node_modules", "yaml");

interface PackResult {
  filename: string;
  files: Array<{ path: string }>;
}

let packResult: PackResult;
let tarballPath: string;

beforeAll(() => {
  mkdirSync(packDirectory, { recursive: true });
  mkdirSync(consumerDirectory, { recursive: true });

  const output = execFileSync(
    "npm",
    [
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      packDirectory,
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: npmCacheDirectory },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  [packResult] = JSON.parse(output) as PackResult[];
  tarballPath = join(packDirectory, packResult.filename);

  writeFileSync(
    join(consumerDirectory, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  execFileSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      "--offline",
      tarballPath,
      yamlPackageDirectory,
    ],
    {
      cwd: consumerDirectory,
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: npmCacheDirectory },
      stdio: "pipe",
    },
  );
}, 60_000);

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("npm package distribution", () => {
  it("contains only the package artifacts, metadata, and deployment templates", () => {
    const paths = packResult.files.map((file) => file.path);
    const allowedFiles = new Set(["LICENSE", "README.md", "package.json"]);
    const allowedPrefixes = [
      "package-dist/features/site-meta/",
      "package-dist/features/sitemap/",
      "package-dist/features/content-source/",
      "package-dist/features/git-content/",
      "package-dist/features/deploy-status/",
      "package-dist/internal/github-api/",
      "templates/deployment/cloudflare-pages/",
    ];

    expect(paths).toContain("package-dist/features/site-meta/index.js");
    expect(paths).toContain("package-dist/features/site-meta/index.d.ts");
    expect(paths).toContain("package-dist/features/deploy-status/index.js");
    expect(paths).toContain("templates/deployment/cloudflare-pages/cloudflare-pages.yml");
    expect(paths.every((path) =>
      allowedFiles.has(path) || allowedPrefixes.some((prefix) => path.startsWith(prefix))
    )).toBe(true);
    expect(paths.some((path) => path.startsWith("src/"))).toBe(false);
    expect(paths.some((path) => path.startsWith("tests/"))).toBe(false);
    expect(paths.some((path) => path.startsWith("docs/"))).toBe(false);
    expect(paths.some((path) => path.startsWith(".github/"))).toBe(false);
    expect(paths.some((path) => path.includes("BaseLayout") || path.endsWith(".scss"))).toBe(false);
  });

  it("imports every public runtime subpath from an installed package", () => {
    const script = String.raw`
      const expected = {
        "site-meta": ["SiteMetaError", "createCanonicalUrl", "createPageTitle", "defineSiteConfig", "serializeJsonLd", "serializeRobots"],
        sitemap: ["SitemapError", "createSitemapXml"],
        "content-source": ["ContentSourceError", "parseMarkdownFrontmatter", "parseYamlSource", "stringifyMarkdownFrontmatter", "stringifyYamlSource"],
        "git-content": ["GitFileCommitError", "GitHubApiError", "commitGitFileChanges", "createGitHubClient"],
        "deploy-status": ["GitHubApiError", "createDeploymentStatusClient"],
      };
      for (const [subpath, names] of Object.entries(expected)) {
        const module = await import("albasimia-ssg-core/" + subpath);
        if (JSON.stringify(Object.keys(module).sort()) !== JSON.stringify(names.sort())) process.exit(1);
      }
    `;

    expect(() => execFileSync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      { cwd: consumerDirectory, encoding: "utf8", stdio: "pipe" },
    )).not.toThrow();
  });

  it("resolves public declarations from all five subpaths", () => {
    const sourcePath = join(consumerDirectory, "consumer.ts");
    writeFileSync(sourcePath, `
      import { defineSiteConfig, type PageMeta } from "albasimia-ssg-core/site-meta";
      import { createSitemapXml, type SitemapUrlInput } from "albasimia-ssg-core/sitemap";
      import { parseYamlSource, type ParseSourceOptions } from "albasimia-ssg-core/content-source";
      import { createGitHubClient, type GitHubClientConfig } from "albasimia-ssg-core/git-content";
      import { createDeploymentStatusClient, type DeploymentRun } from "albasimia-ssg-core/deploy-status";
      const site = defineSiteConfig({ name: "Example", siteUrl: "https://example.com", description: "Example", locale: "en" });
      const page: PageMeta = { title: "Page" };
      const urls: SitemapUrlInput[] = [site.siteUrl];
      const options: ParseSourceOptions = { sourceName: "data.yaml" };
      type Config = GitHubClientConfig;
      type Run = DeploymentRun;
      void [page, createSitemapXml(urls), parseYamlSource("value: true", options), createGitHubClient, createDeploymentStatusClient];
      void (undefined as unknown as Config);
      void (undefined as unknown as Run);
    `);

    expect(() => execFileSync(
      process.execPath,
      [
        join(projectRoot, "node_modules", "typescript", "bin", "tsc"),
        "--noEmit",
        "--strict",
        "--target", "ES2022",
        "--module", "NodeNext",
        "--moduleResolution", "NodeNext",
        "--lib", "ES2022,DOM",
        sourcePath,
      ],
      { cwd: consumerDirectory, encoding: "utf8", stdio: "pipe" },
    )).not.toThrow();
  });

  it("rejects the package root, feature internals, and shared internals", () => {
    const script = String.raw`
      const privatePaths = [
        "albasimia-ssg-core",
        "albasimia-ssg-core/site-meta/resolve",
        "albasimia-ssg-core/package-dist/internal/github-api/request.js",
      ];
      for (const path of privatePaths) {
        try {
          await import(path);
          process.exit(1);
        } catch (error) {
          if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") process.exit(1);
        }
      }
    `;

    expect(() => execFileSync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      { cwd: consumerDirectory, encoding: "utf8", stdio: "pipe" },
    )).not.toThrow();
  });
});
