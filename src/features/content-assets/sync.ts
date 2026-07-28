import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  extname,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { ContentAssetError } from "./errors.js";
import {
  createPublicAssetPath,
  normalizeAssetReference,
  normalizePathSegment,
  normalizePublicBasePath,
} from "./path.js";
import type {
  ContentAssetCatalog,
  ContentAssetPathInput,
  ContentAssetRecord,
  ContentAssetSyncOptions,
} from "./types.js";

export const DEFAULT_CONTENT_ASSET_EXTENSIONS = [
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
] as const;

export const CONTENT_ENTRY_FILENAME = "index.md";

interface DiscoveredAsset {
  entryName: string;
  relativePath: string;
  sourcePath: string;
  size: number;
}

export async function syncContentAssets(options: ContentAssetSyncOptions): Promise<ContentAssetCatalog> {
  const sourceRoot = toAbsolutePath(options.sourceRoot);
  const outputRoot = toAbsolutePath(options.outputRoot);
  assertDisjointRoots(sourceRoot, outputRoot);

  const publicBasePath = normalizePublicBasePath(options.publicBasePath);
  const assetDirectoryName = normalizePathSegment(options.assetDirectoryName ?? "assets", "assetDirectoryName");
  const allowedExtensions = normalizeExtensions(options.allowedExtensions ?? DEFAULT_CONTENT_ASSET_EXTENSIONS);
  const maxFileBytes = normalizeMaxFileBytes(options.maxFileBytes);
  await validateContentEntryDocuments(sourceRoot);
  const discovered = await discoverAssets(sourceRoot, assetDirectoryName, allowedExtensions, maxFileBytes);

  try {
    if (options.clean !== false) await rm(outputRoot, { recursive: true, force: true });
    await mkdir(outputRoot, { recursive: true });

    for (const asset of discovered) {
      const outputPath = join(outputRoot, asset.entryName, ...asset.relativePath.split("/"));
      await mkdir(dirname(outputPath), { recursive: true });
      await copyFile(asset.sourcePath, outputPath);
    }
  } catch (cause) {
    throw new ContentAssetError(`Content assetの出力に失敗しました: ${outputRoot}`, {
      code: "OUTPUT_WRITE_FAILED",
      path: outputRoot,
      cause,
    });
  }

  const records = discovered.map((asset): ContentAssetRecord => ({
    ...asset,
    outputPath: join(outputRoot, asset.entryName, ...asset.relativePath.split("/")),
    publicPath: createPublicAssetPath(publicBasePath, asset.entryName, asset.relativePath),
  }));
  return createCatalog(records, publicBasePath);
}

async function validateContentEntryDocuments(sourceRoot: string): Promise<void> {
  let entries;
  try {
    entries = await readdir(sourceRoot, { withFileTypes: true });
  } catch (cause) {
    throw new ContentAssetError(`Content rootを読み込めません: ${sourceRoot}`, {
      code: "SOURCE_READ_FAILED",
      path: sourceRoot,
      cause,
    });
  }

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const entryRoot = join(sourceRoot, normalizePathSegment(entry.name, "entryName"));
    let files;
    try {
      files = await readdir(entryRoot, { withFileTypes: true });
    } catch (cause) {
      throw new ContentAssetError(`Content entryを読み込めません: ${entryRoot}`, {
        code: "SOURCE_READ_FAILED",
        path: entryRoot,
        cause,
      });
    }

    const entryDocument = files.find((file) => file.name === CONTENT_ENTRY_FILENAME && file.isFile());
    if (!entryDocument) {
      throw new ContentAssetError(`Content entryに${CONTENT_ENTRY_FILENAME}がありません: ${entryRoot}`, {
        code: "ENTRY_DOCUMENT_NOT_FOUND",
        path: entryRoot,
      });
    }

    const unexpectedDocuments = files
      .filter((file) => file.isFile() && /\.mdx?$/i.test(file.name) && file.name !== CONTENT_ENTRY_FILENAME)
      .map((file) => file.name)
      .sort();
    if (unexpectedDocuments.length > 0) {
      const documentPath = join(entryRoot, unexpectedDocuments[0]);
      throw new ContentAssetError(`Content entry直下のMarkdownは${CONTENT_ENTRY_FILENAME}だけ使用できます: ${documentPath}`, {
        code: "UNEXPECTED_ENTRY_DOCUMENT",
        path: documentPath,
      });
    }
  }
}

export function createContentAssetUrl(publicBasePath: string, entryName: string, relativePath: string): string {
  return createPublicAssetPath(publicBasePath, entryName, relativePath);
}

async function discoverAssets(
  sourceRoot: string,
  assetDirectoryName: string,
  allowedExtensions: ReadonlySet<string>,
  maxFileBytes?: number,
): Promise<DiscoveredAsset[]> {
  let entries;
  try {
    entries = await readdir(sourceRoot, { withFileTypes: true });
  } catch (cause) {
    throw new ContentAssetError(`Content rootを読み込めません: ${sourceRoot}`, {
      code: "SOURCE_READ_FAILED",
      path: sourceRoot,
      cause,
    });
  }

  const assets: DiscoveredAsset[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const entryName = normalizePathSegment(entry.name, "entryName");
    const assetsRoot = join(sourceRoot, entryName, assetDirectoryName);
    try {
      await collectAssetFiles(assetsRoot, "", entryName, assets, allowedExtensions, maxFileBytes);
    } catch (error) {
      if (isMissingPath(error)) continue;
      throw error;
    }
  }
  return assets;
}

async function collectAssetFiles(
  directory: string,
  prefix: string,
  entryName: string,
  assets: DiscoveredAsset[],
  allowedExtensions: ReadonlySet<string>,
  maxFileBytes?: number,
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = normalizeAssetReference(prefix ? `${prefix}/${entry.name}` : entry.name, "asset path");
    const sourcePath = join(directory, entry.name);
    const fileInfo = await lstat(sourcePath);
    if (fileInfo.isSymbolicLink()) {
      throw new ContentAssetError(`Assetのsymbolic linkは使用できません: ${sourcePath}`, {
        code: "SYMLINK_NOT_ALLOWED",
        path: sourcePath,
      });
    }
    if (fileInfo.isDirectory()) {
      await collectAssetFiles(sourcePath, relativePath, entryName, assets, allowedExtensions, maxFileBytes);
      continue;
    }
    if (!fileInfo.isFile()) continue;

    const extension = extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      throw new ContentAssetError(`対応していないAsset形式です: ${sourcePath}`, {
        code: "UNSUPPORTED_EXTENSION",
        path: sourcePath,
      });
    }
    const fileStat = await stat(sourcePath);
    if (maxFileBytes !== undefined && fileStat.size > maxFileBytes) {
      throw new ContentAssetError(`Assetが許容サイズを超えています: ${sourcePath}`, {
        code: "ASSET_TOO_LARGE",
        path: sourcePath,
      });
    }
    assets.push({ entryName, relativePath, sourcePath, size: fileStat.size });
  }
}

function createCatalog(records: readonly ContentAssetRecord[], publicBasePath: string): ContentAssetCatalog {
  const paths = new Set(records.map((asset) => `${asset.entryName}/${asset.relativePath}`));
  const key = (entryName: string, relativePath: string) =>
    `${normalizePathSegment(entryName, "entryName")}/${normalizeAssetReference(relativePath, "relativePath")}`;

  return Object.freeze({
    assets: Object.freeze([...records]),
    has(entryName: string, relativePath: string): boolean {
      return paths.has(key(entryName, relativePath));
    },
    resolve(entryName: string, relativePath: string): string {
      const assetKey = key(entryName, relativePath);
      if (!paths.has(assetKey)) {
        throw new ContentAssetError(`Content assetが見つかりません: ${assetKey}`, {
          code: "ASSET_NOT_FOUND",
          path: assetKey,
        });
      }
      return createPublicAssetPath(publicBasePath, entryName, relativePath);
    },
  });
}

function normalizeExtensions(values: readonly string[]): ReadonlySet<string> {
  if (values.length === 0) {
    throw new ContentAssetError("allowedExtensionsには1件以上指定してください", { code: "INVALID_CONFIG" });
  }
  const normalized = values.map((value) => value.toLowerCase());
  if (normalized.some((value) => !/^\.[a-z0-9]+$/.test(value))) {
    throw new ContentAssetError("allowedExtensionsは`.webp`のように指定してください", { code: "INVALID_CONFIG" });
  }
  return new Set(normalized);
}

function normalizeMaxFileBytes(value?: number): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ContentAssetError("maxFileBytesには正の整数を指定してください", { code: "INVALID_CONFIG" });
  }
  return value;
}

function toAbsolutePath(value: ContentAssetPathInput): string {
  if (value instanceof URL) {
    if (value.protocol !== "file:") {
      throw new ContentAssetError("sourceRootとoutputRootのURLはfile:で指定してください", { code: "INVALID_CONFIG" });
    }
    return resolve(fileURLToPath(value));
  }
  return resolve(value);
}

function assertDisjointRoots(sourceRoot: string, outputRoot: string): void {
  if (sourceRoot === outputRoot || containsPath(sourceRoot, outputRoot) || containsPath(outputRoot, sourceRoot)) {
    throw new ContentAssetError("sourceRootとoutputRootには互いに含まれないdirectoryを指定してください", {
      code: "INVALID_CONFIG",
    });
  }
}

function containsPath(parent: string, child: string): boolean {
  const pathFromParent = relative(parent, child);
  return pathFromParent !== "" && !pathFromParent.startsWith(`..${sep}`) && pathFromParent !== ".." && !isAbsolute(pathFromParent);
}

function isMissingPath(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
