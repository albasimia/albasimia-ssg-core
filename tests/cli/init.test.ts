import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const cliPath = join(projectRoot, "bin", "asc.mjs");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("asc init", () => {
  it("generates a complete minimal Astro site", () => {
    const workingDirectory = createTemporaryDirectory();
    execFileSync(process.execPath, [cliPath, "init", "example-site"], {
      cwd: workingDirectory,
      encoding: "utf8",
      stdio: "pipe",
    });

    const target = join(workingDirectory, "example-site");
    const packageJson = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
    expect(packageJson).toMatchObject({
      name: "example-site",
      private: true,
      type: "module",
      scripts: {
        dev: "astro dev",
        build: "astro build",
        preview: "astro preview",
      },
      dependencies: {
        "albasimia-ssg-core": "^0.1.5",
      },
    });
    expect(readFileSync(join(target, "src/pages/index.astro"), "utf8"))
      .toContain('albasimia-ssg-core/layouts/BaseLayout.astro');
    expect(readFileSync(join(target, "src/site.ts"), "utf8"))
      .toContain("defineSiteConfig");
    expect(readFileSync(join(target, "src/pages/sitemap.xml.ts"), "utf8"))
      .toContain("createSitemapXml");
    expect(existsSync(join(target, "astro.config.mjs"))).toBe(true);
    expect(existsSync(join(target, "tsconfig.json"))).toBe(true);
    expect(readFileSync(join(target, ".gitignore"), "utf8"))
      .toContain("node_modules/");
  });

  it("preserves existing package metadata and installed dependency spec", () => {
    const target = createTemporaryDirectory();
    writeFileSync(join(target, "package.json"), JSON.stringify({
      name: "existing-site",
      scripts: { test: "vitest" },
      dependencies: {
        "albasimia-ssg-core": "github:albasimia/albasimia-ssg-core#v0.1.2",
      },
    }), "utf8");

    execFileSync(process.execPath, [cliPath, "init", "."], {
      cwd: target,
      encoding: "utf8",
      stdio: "pipe",
    });

    const packageJson = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
    expect(packageJson.name).toBe("existing-site");
    expect(packageJson.scripts.test).toBe("vitest");
    expect(packageJson.scripts.build).toBe("astro build");
    expect(packageJson.dependencies["albasimia-ssg-core"])
      .toBe("github:albasimia/albasimia-ssg-core#v0.1.2");
  });

  it("refuses to overwrite scaffold files without partial writes", () => {
    const target = createTemporaryDirectory();
    mkdirSync(join(target, "src", "pages"), { recursive: true });
    writeFileSync(join(target, "src", "pages", "index.astro"), "existing", "utf8");

    expect(() => execFileSync(process.execPath, [cliPath, "init", "."], {
      cwd: target,
      encoding: "utf8",
      stdio: "pipe",
    })).toThrow();

    expect(readFileSync(join(target, "src", "pages", "index.astro"), "utf8"))
      .toBe("existing");
    expect(existsSync(join(target, "astro.config.mjs"))).toBe(false);
    expect(existsSync(join(target, "package.json"))).toBe(false);
  });

  it("prints its version and usage", () => {
    expect(execFileSync(process.execPath, [cliPath, "--version"], {
      encoding: "utf8",
    }).trim()).toBe("0.1.5");
    expect(execFileSync(process.execPath, [cliPath, "--help"], {
      encoding: "utf8",
    })).toContain("asc init [directory]");
  });
});

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "asc-init-"));
  temporaryDirectories.push(directory);
  return directory;
}
