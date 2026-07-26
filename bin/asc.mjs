#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const packageMetadata = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
);
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(packageMetadata.version);
  process.exit(0);
}

const [command, targetArgument = ".", ...extraArguments] = args;

if (command !== "init" || extraArguments.length > 0) {
  fail("Usage: asc init [directory]");
}

const targetDirectory = resolve(process.cwd(), targetArgument);
const generatedFiles = new Map([
  [".gitignore", `node_modules/
dist/
.astro/
`],
  ["astro.config.mjs", `import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
});
`],
  ["tsconfig.json", `{
  "extends": "astro/tsconfigs/strict"
}
`],
  ["src/site.ts", `import { defineSiteConfig } from "albasimia-ssg-core/site-meta";

export const site = defineSiteConfig({
  name: "Example",
  siteUrl: "https://example.com/",
  description: "Example site",
  locale: "ja",
});
`],
  ["src/pages/index.astro", `---
import BaseLayout from "albasimia-ssg-core/layouts/BaseLayout.astro";
import { site } from "../site.js";
---

<BaseLayout site={site} meta={{ title: "Home" }}>
  <main>Hello ASC</main>
</BaseLayout>
`],
  ["src/pages/sitemap.xml.ts", `import type { APIRoute } from "astro";
import { createSitemapXml } from "albasimia-ssg-core/sitemap";
import { site } from "../site.js";

export const GET: APIRoute = () => new Response(
  createSitemapXml([site.siteUrl]),
  { headers: { "Content-Type": "application/xml; charset=utf-8" } },
);
`],
]);

const conflicts = [...generatedFiles.keys()].filter((path) =>
  existsSync(join(targetDirectory, path))
);

if (conflicts.length > 0) {
  fail(`Refusing to overwrite existing files:\n${conflicts.map((path) => `- ${path}`).join("\n")}`);
}

const packageJsonPath = join(targetDirectory, "package.json");
const consumerPackage = readConsumerPackage(packageJsonPath, targetDirectory);
configureConsumerPackage(consumerPackage, targetDirectory);

mkdirSync(targetDirectory, { recursive: true });
for (const [relativePath, contents] of generatedFiles) {
  const outputPath = join(targetDirectory, relativePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, contents, "utf8");
}
writeFileSync(packageJsonPath, `${JSON.stringify(consumerPackage, null, 2)}\n`, "utf8");

console.log(`Initialized an ASC site in ${targetDirectory}`);
console.log("Run: npm run build");

function readConsumerPackage(packageJsonPath, targetDirectory) {
  if (!existsSync(packageJsonPath)) {
    return {
      name: createPackageName(basename(targetDirectory)),
      private: true,
      type: "module",
    };
  }

  try {
    const value = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    if (value === null || Array.isArray(value) || typeof value !== "object") {
      throw new Error("package.json must contain an object");
    }
    return value;
  } catch (error) {
    fail(`Cannot read package.json: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }
}

function configureConsumerPackage(packageJson, targetDirectory) {
  packageJson.name ??= createPackageName(basename(targetDirectory));
  packageJson.private ??= true;
  packageJson.type ??= "module";
  packageJson.scripts ??= {};
  packageJson.scripts.dev ??= "astro dev";
  packageJson.scripts.build ??= "astro build";
  packageJson.scripts.preview ??= "astro preview";

  const dependencySections = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
  ];
  const hasAscDependency = dependencySections.some((section) =>
    section && Object.hasOwn(section, packageMetadata.name)
  );

  if (!hasAscDependency) {
    packageJson.dependencies ??= {};
    packageJson.dependencies[packageMetadata.name] = `^${packageMetadata.version}`;
  }
}

function createPackageName(directoryName) {
  const normalized = directoryName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return normalized || "asc-site";
}

function printHelp() {
  console.log(`ASC ${packageMetadata.version}

Usage:
  asc init [directory]

Creates a minimal static Astro site without overwriting existing scaffold files.`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
