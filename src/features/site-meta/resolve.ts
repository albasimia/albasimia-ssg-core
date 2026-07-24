import { createCanonicalUrl, resolveCanonicalOverride } from "./canonical";
import { SiteMetaError } from "./errors";
import { serializeJsonLd } from "./json-ld";
import { normalizeRobots } from "./robots";
import { createPageTitle } from "./title";
import type {
  PageMeta,
  ResolvedFavicon,
  SiteConfig,
  ThemeColorMeta,
  VerificationMeta,
} from "./types";
import {
  optionalText,
  requiredText,
  resolveFavicons,
  resolveHttpUrl,
  validateThemeColors,
} from "./validation";

interface PageMetaContext {
  pathname: string;
}

interface ResolvedOpenGraphMeta {
  readonly type: string;
  readonly url: URL;
  readonly title: string;
  readonly description: string;
  readonly image?: URL;
  readonly imageAlt?: string;
  readonly siteName: string;
  readonly locale?: string;
}

interface ResolvedTwitterMeta {
  readonly card: "summary" | "summary_large_image";
  readonly title: string;
  readonly description: string;
  readonly image?: URL;
  readonly imageAlt?: string;
  readonly site?: string;
  readonly creator?: string;
}

interface ResolvedPageMeta {
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: URL;
  readonly robots: string;
  readonly openGraph: false | ResolvedOpenGraphMeta;
  readonly twitter: false | ResolvedTwitterMeta;
  readonly serializedJsonLd: readonly string[];
  readonly favicons: readonly ResolvedFavicon[];
  readonly themeColors: readonly ThemeColorMeta[];
  readonly verification: readonly VerificationMeta[];
}

export function resolvePageMeta(
  site: SiteConfig,
  page: PageMeta,
  context: PageMetaContext,
): ResolvedPageMeta {
  if ("canonicalUrl" in page && page.canonicalUrl !== undefined && page.canonicalPath !== undefined) {
    throw new SiteMetaError("canonicalUrl and canonicalPath cannot be used together", {
      code: "PAGE_META_INVALID",
      path: "canonicalUrl",
    });
  }
  const title = createPageTitle(page, site.title);
  const description = optionalText(page.description, "description", "PAGE_META_INVALID")
    ?? site.description;
  const canonicalUrl = "canonicalUrl" in page && page.canonicalUrl !== undefined
    ? resolveCanonicalOverride(page.canonicalUrl)
    : createCanonicalUrl(page.canonicalPath ?? context.pathname, site.siteUrl);
  const robots = normalizeRobots(page.robots ?? site.defaultRobots).join(", ");
  const favicons = page.favicons === undefined
    ? site.favicons
    : resolveFavicons(page.favicons, site.siteUrl, "PAGE_META_INVALID");
  const themeColors = page.themeColors === undefined
    ? site.themeColors
    : validateThemeColors(page.themeColors, "PAGE_META_INVALID");
  const openGraph = resolveOpenGraph(site, page, canonicalUrl, title, description);
  const twitter = resolveTwitter(site, page, openGraph, title, description);
  const jsonLd = page.jsonLd === undefined
    ? []
    : Array.isArray(page.jsonLd) ? page.jsonLd : [page.jsonLd];

  return {
    title,
    description,
    canonicalUrl,
    robots,
    openGraph,
    twitter,
    serializedJsonLd: jsonLd.map(serializeJsonLd),
    favicons,
    themeColors,
    verification: site.verification,
  };
}

function resolveOpenGraph(
  site: SiteConfig,
  page: PageMeta,
  canonicalUrl: URL,
  title: string,
  description: string,
): false | ResolvedOpenGraphMeta {
  if (site.openGraph === false || page.openGraph === false) return false;
  const value = page.openGraph ?? {};
  const image = value.image === undefined
    ? site.openGraph.image
    : resolveHttpUrl(value.image, site.siteUrl, "openGraph.image", "PAGE_META_INVALID");
  return {
    type: optionalText(value.type, "openGraph.type", "PAGE_META_INVALID") ?? site.openGraph.type,
    url: canonicalUrl,
    title: optionalText(value.title, "openGraph.title", "PAGE_META_INVALID") ?? title,
    description: optionalText(value.description, "openGraph.description", "PAGE_META_INVALID") ?? description,
    ...(image ? { image } : {}),
    ...(value.imageAlt !== undefined
      ? { imageAlt: requiredText(value.imageAlt, "openGraph.imageAlt", "PAGE_META_INVALID") }
      : site.openGraph.imageAlt ? { imageAlt: site.openGraph.imageAlt } : {}),
    siteName: site.openGraph.siteName,
    ...(value.locale !== undefined
      ? { locale: requiredText(value.locale, "openGraph.locale", "PAGE_META_INVALID") }
      : site.openGraph.locale ? { locale: site.openGraph.locale } : {}),
  };
}

function resolveTwitter(
  site: SiteConfig,
  page: PageMeta,
  openGraph: false | ResolvedOpenGraphMeta,
  title: string,
  description: string,
): false | ResolvedTwitterMeta {
  if (site.twitter === false || page.twitter === false) return false;
  const value = page.twitter ?? {};
  if (value.card !== undefined && value.card !== "summary" && value.card !== "summary_large_image") {
    throw new SiteMetaError("twitter.card is invalid", {
      code: "PAGE_META_INVALID",
      path: "twitter.card",
    });
  }
  const image = value.image !== undefined
    ? resolveHttpUrl(value.image, site.siteUrl, "twitter.image", "PAGE_META_INVALID")
    : site.twitter.image ?? (openGraph === false ? undefined : openGraph.image);
  const resolvedTitle = optionalText(value.title, "twitter.title", "PAGE_META_INVALID")
    ?? (openGraph === false ? title : openGraph.title);
  const resolvedDescription = optionalText(value.description, "twitter.description", "PAGE_META_INVALID")
    ?? (openGraph === false ? description : openGraph.description);
  const siteAccount = resolveAccount(value.site, "twitter.site") ?? site.twitter.site;
  const creator = resolveAccount(value.creator, "twitter.creator") ?? site.twitter.creator;

  return {
    card: value.card ?? site.twitter.card ?? (image ? "summary_large_image" : "summary"),
    title: resolvedTitle,
    description: resolvedDescription,
    ...(image ? { image } : {}),
    ...(value.imageAlt !== undefined
      ? { imageAlt: requiredText(value.imageAlt, "twitter.imageAlt", "PAGE_META_INVALID") }
      : site.twitter.imageAlt ? { imageAlt: site.twitter.imageAlt }
      : openGraph !== false && openGraph.imageAlt ? { imageAlt: openGraph.imageAlt } : {}),
    ...(siteAccount ? { site: siteAccount } : {}),
    ...(creator ? { creator } : {}),
  };
}

function resolveAccount(value: string | undefined, path: string): string | undefined {
  if (value === undefined) return undefined;
  const account = requiredText(value, path, "PAGE_META_INVALID");
  if (!account.startsWith("@")) {
    throw new SiteMetaError(`${path} must start with @`, { code: "PAGE_META_INVALID", path });
  }
  return account;
}
