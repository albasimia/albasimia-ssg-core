import { posix } from "node:path";
import { ContentAssetError } from "./errors.js";

export function normalizeAssetReference(value: string, label: string): string {
  if (!value || value.trim() !== value || value.includes("\\") || posix.isAbsolute(value)) {
    throw invalidPath(label, value);
  }

  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\0"))) {
    throw invalidPath(label, value);
  }

  return segments.join("/");
}

export function normalizePathSegment(value: string, label: string): string {
  const normalized = normalizeAssetReference(value, label);
  if (normalized.includes("/")) throw invalidPath(label, value);
  return normalized;
}

export function normalizePublicBasePath(value: string): string {
  const segments = value.split("/");
  if (
    !value.startsWith("/")
    || value.includes("\\")
    || value.includes("?")
    || value.includes("#")
    || segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw invalidPath("publicBasePath", value);
  }

  const normalized = posix.normalize(value);
  if (normalized === "/") {
    throw invalidPath("publicBasePath", value);
  }
  return normalized.replace(/\/$/, "");
}

export function createPublicAssetPath(publicBasePath: string, entryName: string, relativePath: string): string {
  const base = normalizePublicBasePath(publicBasePath);
  const entry = normalizePathSegment(entryName, "entryName");
  const asset = normalizeAssetReference(relativePath, "relativePath");
  return `${base}/${[entry, ...asset.split("/")].map(encodeURIComponent).join("/")}`;
}

function invalidPath(label: string, value: string): ContentAssetError {
  return new ContentAssetError(`${label}に安全な相対パスを指定してください: ${value}`, {
    code: "INVALID_PATH",
    path: value,
  });
}
