import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

const stylesDirectory = fileURLToPath(new URL("../../src/styles/", import.meta.url));
const globalStylesheet = fileURLToPath(new URL("../../src/styles/global.scss", import.meta.url));
const baseLayout = fileURLToPath(new URL("../../src/layouts/BaseLayout.astro", import.meta.url));
const css = sass.compile(globalStylesheet, { loadPaths: [stylesDirectory] }).css;

describe("theme CSS contract", () => {
  it("publishes theme, typography, spacing, and layout tokens", () => {
    for (const property of [
      "--asc-color-background-light",
      "--asc-color-background-dark",
      "--asc-color-text-light",
      "--asc-color-text-dark",
      "--asc-color-surface-light",
      "--asc-color-surface-dark",
      "--asc-color-muted-light",
      "--asc-color-muted-dark",
      "--asc-color-border-light",
      "--asc-color-border-dark",
      "--asc-color-accent-light",
      "--asc-color-accent-dark",
      "--asc-font-family-sans",
      "--asc-font-family-mono",
      "--asc-font-size-small",
      "--asc-font-size-body",
      "--asc-font-weight-bold",
      "--asc-line-height-body",
      "--asc-letter-spacing-wide",
      "--asc-space-1",
      "--asc-space-8",
      "--asc-content-width",
      "--asc-prose-width",
      "--asc-page-gutter",
      "--asc-page-block-spacing",
    ]) {
      expect(css).toContain(`${property}:`);
    }
  });

  it("uses light values by default and OS dark preference without JavaScript", () => {
    expect(css).toContain("color-scheme: light dark");
    expect(css).toContain("--asc-color-background: var(--asc-color-background-light)");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("--asc-color-background: var(--asc-color-background-dark)");
    expect(css).toContain(":root[data-asc-theme-resolved=light]");
    expect(css).toContain(":root[data-asc-theme-resolved=dark]");
    expect(css).toContain("background: var(--asc-color-background)");
    expect(css).toContain("color: var(--asc-color-text)");
  });

  it("keeps theme resolution out of BaseLayout", () => {
    const source = readFileSync(baseLayout, "utf8");
    expect(source).toContain('import "../styles/global.scss"');
    expect(source).not.toContain("prefers-color-scheme");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("data-theme");
  });
});
