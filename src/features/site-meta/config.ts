import { SiteMetaError } from "./errors.js";
import { normalizeRobots } from "./robots.js";
import type {
  OpenGraphDefaults,
  SiteConfig,
  SiteConfigInput,
  TwitterDefaults,
} from "./types.js";
import {
  optionalText,
  requiredText,
  resolveFavicons,
  resolveHttpUrl,
  validateThemeColors,
  validateVerification,
} from "./validation.js";

export function defineSiteConfig(input: SiteConfigInput): SiteConfig {
  const name = requiredText(input.name, "name", "SITE_CONFIG_INVALID");
  const description = requiredText(input.description, "description", "SITE_CONFIG_INVALID");
  const locale = requiredText(input.locale, "locale", "SITE_CONFIG_INVALID");
  const siteUrl = resolveHttpUrl(input.siteUrl, undefined, "siteUrl", "SITE_URL_INVALID");
  if (siteUrl.search || siteUrl.hash) {
    throw new SiteMetaError("siteUrl must not contain a query or fragment", {
      code: "SITE_URL_INVALID",
      path: "siteUrl",
    });
  }
  if (!siteUrl.pathname.endsWith("/")) siteUrl.pathname += "/";

  const defaultTitle = requiredText(input.title?.default ?? name, "title.default", "SITE_CONFIG_INVALID");
  const separator = input.title?.separator ?? " | ";
  if (!separator.trim() || /[\u0000-\u001f\u007f]/.test(separator)) {
    throw new SiteMetaError("title.separator is invalid", {
      code: "SITE_CONFIG_INVALID",
      path: "title.separator",
    });
  }
  const position = input.title?.position ?? "suffix";
  if (position !== "prefix" && position !== "suffix") {
    throw new SiteMetaError("title.position is invalid", {
      code: "SITE_CONFIG_INVALID",
      path: "title.position",
    });
  }

  const defaultRobots = normalizeRobots(
    input.defaultRobots ?? ["index", "follow", "max-image-preview:large"],
    "SITE_CONFIG_INVALID",
    "defaultRobots",
  );
  const openGraph = resolveOpenGraph(input.openGraph, name, siteUrl);
  const twitter = resolveTwitter(input.twitter, siteUrl);

  return {
    name,
    siteUrl,
    description,
    locale,
    title: { default: defaultTitle, separator, position },
    defaultRobots,
    openGraph,
    twitter,
    favicons: resolveFavicons(input.favicons ?? [], siteUrl, "SITE_CONFIG_INVALID"),
    themeColors: validateThemeColors(input.themeColors ?? [], "SITE_CONFIG_INVALID"),
    verification: validateVerification(input.verification ?? []),
  };
}

function resolveOpenGraph(
  input: SiteConfigInput["openGraph"],
  name: string,
  siteUrl: URL,
): false | OpenGraphDefaults {
  if (input === false) return false;
  const value = input ?? {};
  const image = value.image
    ? resolveHttpUrl(value.image, siteUrl, "openGraph.image", "SITE_CONFIG_INVALID")
    : undefined;
  return {
    type: optionalText(value.type, "openGraph.type", "SITE_CONFIG_INVALID") ?? "website",
    siteName: optionalText(value.siteName, "openGraph.siteName", "SITE_CONFIG_INVALID") ?? name,
    ...(value.locale !== undefined ? { locale: requiredText(value.locale, "openGraph.locale", "SITE_CONFIG_INVALID") } : {}),
    ...(image ? { image } : {}),
    ...(value.imageAlt !== undefined ? { imageAlt: requiredText(value.imageAlt, "openGraph.imageAlt", "SITE_CONFIG_INVALID") } : {}),
  };
}

function resolveTwitter(
  input: SiteConfigInput["twitter"],
  siteUrl: URL,
): false | TwitterDefaults {
  if (input === false) return false;
  const value = input ?? {};
  if (value.card && value.card !== "summary" && value.card !== "summary_large_image") {
    throw new SiteMetaError("twitter.card is invalid", { code: "SITE_CONFIG_INVALID", path: "twitter.card" });
  }
  const image = value.image
    ? resolveHttpUrl(value.image, siteUrl, "twitter.image", "SITE_CONFIG_INVALID")
    : undefined;
  return {
    ...(value.card ? { card: value.card } : {}),
    ...(value.site !== undefined ? { site: account(value.site, "twitter.site") } : {}),
    ...(value.creator !== undefined ? { creator: account(value.creator, "twitter.creator") } : {}),
    ...(image ? { image } : {}),
    ...(value.imageAlt !== undefined ? { imageAlt: requiredText(value.imageAlt, "twitter.imageAlt", "SITE_CONFIG_INVALID") } : {}),
  };
}

function account(value: string, path: string): string {
  const result = requiredText(value, path, "SITE_CONFIG_INVALID");
  if (!result.startsWith("@")) {
    throw new SiteMetaError(`${path} must start with @`, { code: "SITE_CONFIG_INVALID", path });
  }
  return result;
}
