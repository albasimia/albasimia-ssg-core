import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ContentAssetError,
  createContentAssetUrl,
  syncContentAssets,
} from "../../src/features/content-assets/index.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("content assets", () => {
  it("syncs co-located assets and resolves public paths", async () => {
    const root = createTemporaryDirectory();
    const sourceRoot = join(root, "src", "content", "projects");
    const outputRoot = join(root, "public", "images", "projects");
    writeAsset(sourceRoot, "watari-ea", "hero.webp", "hero");
    writeAsset(sourceRoot, "watari-ea", "gallery/detail.webp", "detail");
    writeAsset(sourceRoot, "other-project", "cover.jpg", "cover");
    writeEntry(sourceRoot, "no-assets");
    mkdirSync(outputRoot, { recursive: true });
    writeFileSync(join(outputRoot, "stale.webp"), "stale");

    const catalog = await syncContentAssets({
      sourceRoot,
      outputRoot,
      publicBasePath: "/images/projects",
    });

    expect(catalog.assets.map(({ entryName, relativePath }) => `${entryName}/${relativePath}`)).toEqual([
      "other-project/cover.jpg",
      "watari-ea/gallery/detail.webp",
      "watari-ea/hero.webp",
    ]);
    expect(catalog.has("watari-ea", "hero.webp")).toBe(true);
    expect(catalog.resolve("watari-ea", "gallery/detail.webp"))
      .toBe("/images/projects/watari-ea/gallery/detail.webp");
    expect(readFileSync(join(outputRoot, "watari-ea", "hero.webp"), "utf8")).toBe("hero");
    expect(() => readFileSync(join(outputRoot, "stale.webp"))).toThrow();
  });

  it("creates encoded public URLs without touching the filesystem", () => {
    expect(createContentAssetUrl("/images/projects/", "sample", "gallery/制作 01.webp"))
      .toBe("/images/projects/sample/gallery/%E5%88%B6%E4%BD%9C%2001.webp");
  });

  it("rejects missing and unsafe references", async () => {
    const root = createTemporaryDirectory();
    const sourceRoot = join(root, "content");
    const outputRoot = join(root, "public");
    writeAsset(sourceRoot, "sample", "hero.webp", "hero");
    const catalog = await syncContentAssets({ sourceRoot, outputRoot, publicBasePath: "/images" });

    expect(() => catalog.resolve("sample", "missing.webp"))
      .toThrow(expect.objectContaining({ code: "ASSET_NOT_FOUND" }));
    expect(() => catalog.resolve("sample", "../hero.webp"))
      .toThrow(expect.objectContaining({ code: "INVALID_PATH" }));
  });

  it("requires index.md and rejects additional entry Markdown", async () => {
    const root = createTemporaryDirectory();
    const sourceRoot = join(root, "content");
    const outputRoot = join(root, "public");
    const missingEntryRoot = join(sourceRoot, "missing-index");
    mkdirSync(join(missingEntryRoot, "assets"), { recursive: true });
    writeFileSync(join(missingEntryRoot, "assets", "hero.webp"), "hero");

    await expect(syncContentAssets({ sourceRoot, outputRoot, publicBasePath: "/images" }))
      .rejects.toMatchObject({ code: "ENTRY_DOCUMENT_NOT_FOUND", path: missingEntryRoot });

    rmSync(missingEntryRoot, { recursive: true, force: true });
    writeEntry(sourceRoot, "additional-markdown");
    const unexpectedDocument = join(sourceRoot, "additional-markdown", "notes.md");
    writeFileSync(unexpectedDocument, "notes");

    await expect(syncContentAssets({ sourceRoot, outputRoot, publicBasePath: "/images" }))
      .rejects.toMatchObject({ code: "UNEXPECTED_ENTRY_DOCUMENT", path: unexpectedDocument });
  });

  it("validates all assets before cleaning the output", async () => {
    const root = createTemporaryDirectory();
    const sourceRoot = join(root, "content");
    const outputRoot = join(root, "public");
    writeAsset(sourceRoot, "sample", "hero.txt", "not an image");
    mkdirSync(outputRoot, { recursive: true });
    writeFileSync(join(outputRoot, "existing.webp"), "keep");

    await expect(syncContentAssets({ sourceRoot, outputRoot, publicBasePath: "/images" }))
      .rejects.toMatchObject({ code: "UNSUPPORTED_EXTENSION" });
    expect(readFileSync(join(outputRoot, "existing.webp"), "utf8")).toBe("keep");
  });

  it("rejects oversized assets, symlinks, and overlapping roots", async () => {
    const root = createTemporaryDirectory();
    const sourceRoot = join(root, "content");
    const outputRoot = join(root, "public");
    writeAsset(sourceRoot, "sample", "hero.webp", "12345");

    await expect(syncContentAssets({ sourceRoot, outputRoot, publicBasePath: "/images", maxFileBytes: 4 }))
      .rejects.toMatchObject({ code: "ASSET_TOO_LARGE" });
    await expect(syncContentAssets({ sourceRoot, outputRoot: join(sourceRoot, "output"), publicBasePath: "/images" }))
      .rejects.toMatchObject({ code: "INVALID_CONFIG" });

    const linkedSource = join(root, "linked.webp");
    writeFileSync(linkedSource, "linked");
    symlinkSync(linkedSource, join(sourceRoot, "sample", "assets", "linked.webp"));
    await expect(syncContentAssets({ sourceRoot, outputRoot, publicBasePath: "/images" }))
      .rejects.toMatchObject({ code: "SYMLINK_NOT_ALLOWED" });
  });

  it("exposes structured errors", () => {
    const error = new ContentAssetError("message", { code: "INVALID_CONFIG", path: "path" });
    expect(error).toMatchObject({ name: "ContentAssetError", code: "INVALID_CONFIG", path: "path" });
  });
});

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "asc-content-assets-"));
  temporaryDirectories.push(directory);
  return directory;
}

function writeAsset(sourceRoot: string, entryName: string, relativePath: string, contents: string): void {
  writeEntry(sourceRoot, entryName);
  const file = join(sourceRoot, entryName, "assets", relativePath);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, contents);
}

function writeEntry(sourceRoot: string, entryName: string): void {
  const entryRoot = join(sourceRoot, entryName);
  mkdirSync(entryRoot, { recursive: true });
  writeFileSync(join(entryRoot, "index.md"), "---\n---\n");
}
