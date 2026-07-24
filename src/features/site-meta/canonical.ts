import { SiteMetaError } from "./errors";
import type { UrlInput } from "./types";
import { resolveHttpUrl } from "./validation";

export function createCanonicalUrl(pathname: string, siteUrl: URL): URL {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("#")) {
    throw new SiteMetaError("Canonical pathname must be a root-relative path without a fragment", {
      code: "CANONICAL_URL_INVALID",
      path: "canonicalPath",
    });
  }
  const site = resolveHttpUrl(siteUrl, undefined, "siteUrl", "SITE_URL_INVALID");
  return new URL(pathname, site);
}

export function resolveCanonicalOverride(value: UrlInput): URL {
  const url = resolveHttpUrl(value, undefined, "canonicalUrl", "CANONICAL_URL_INVALID");
  if (url.hash) {
    throw new SiteMetaError("Canonical URL must not contain a fragment", {
      code: "CANONICAL_URL_INVALID",
      path: "canonicalUrl",
    });
  }
  return url;
}
