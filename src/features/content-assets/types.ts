export type ContentAssetPathInput = string | URL;

export type ContentAssetErrorCode =
  | "INVALID_CONFIG"
  | "INVALID_PATH"
  | "SOURCE_READ_FAILED"
  | "UNSUPPORTED_EXTENSION"
  | "ASSET_TOO_LARGE"
  | "SYMLINK_NOT_ALLOWED"
  | "OUTPUT_WRITE_FAILED"
  | "ASSET_NOT_FOUND";

export interface ContentAssetErrorOptions {
  code: ContentAssetErrorCode;
  path?: string;
  cause?: unknown;
}

export interface ContentAssetSyncOptions {
  sourceRoot: ContentAssetPathInput;
  outputRoot: ContentAssetPathInput;
  publicBasePath: string;
  assetDirectoryName?: string;
  allowedExtensions?: readonly string[];
  maxFileBytes?: number;
  clean?: boolean;
}

export interface ContentAssetRecord {
  entryName: string;
  relativePath: string;
  sourcePath: string;
  outputPath: string;
  publicPath: string;
  size: number;
}

export interface ContentAssetCatalog {
  readonly assets: readonly ContentAssetRecord[];
  has(entryName: string, relativePath: string): boolean;
  resolve(entryName: string, relativePath: string): string;
}
