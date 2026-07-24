export type UrlInput = string | URL;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonLdObject
  | readonly JsonValue[];

export interface JsonLdObject {
  readonly [key: string]: JsonValue;
}

export interface TitlePolicyInput {
  default: string;
  separator?: string;
  position?: "prefix" | "suffix";
}

export interface TitlePolicy {
  readonly default: string;
  readonly separator: string;
  readonly position: "prefix" | "suffix";
}

export interface FaviconInput {
  rel: "icon" | "apple-touch-icon" | "mask-icon";
  href: UrlInput;
  type?: string;
  sizes?: string;
  color?: string;
}

export interface ResolvedFavicon extends Omit<FaviconInput, "href"> {
  readonly href: URL;
}

export interface ThemeColorMeta {
  color: string;
  media?: string;
}

export interface VerificationMeta {
  name: string;
  content: string;
}

export interface OpenGraphDefaultsInput {
  type?: string;
  siteName?: string;
  locale?: string;
  image?: UrlInput;
  imageAlt?: string;
}

export interface OpenGraphDefaults {
  readonly type: string;
  readonly siteName: string;
  readonly locale?: string;
  readonly image?: URL;
  readonly imageAlt?: string;
}

export interface TwitterDefaultsInput {
  card?: "summary" | "summary_large_image";
  site?: string;
  creator?: string;
  image?: UrlInput;
  imageAlt?: string;
}

export interface TwitterDefaults {
  readonly card?: "summary" | "summary_large_image";
  readonly site?: string;
  readonly creator?: string;
  readonly image?: URL;
  readonly imageAlt?: string;
}

export interface SiteConfigInput {
  name: string;
  siteUrl: UrlInput;
  description: string;
  locale: string;
  title?: TitlePolicyInput;
  defaultRobots?: readonly string[];
  openGraph?: false | OpenGraphDefaultsInput;
  twitter?: false | TwitterDefaultsInput;
  favicons?: readonly FaviconInput[];
  themeColors?: readonly ThemeColorMeta[];
  verification?: readonly VerificationMeta[];
}

export interface SiteConfig {
  readonly name: string;
  readonly siteUrl: URL;
  readonly description: string;
  readonly locale: string;
  readonly title: TitlePolicy;
  readonly defaultRobots: readonly string[];
  readonly openGraph: false | OpenGraphDefaults;
  readonly twitter: false | TwitterDefaults;
  readonly favicons: readonly ResolvedFavicon[];
  readonly themeColors: readonly ThemeColorMeta[];
  readonly verification: readonly VerificationMeta[];
}

export interface OpenGraphPageMeta {
  type?: string;
  title?: string;
  description?: string;
  image?: UrlInput;
  imageAlt?: string;
  locale?: string;
}

export interface TwitterPageMeta {
  card?: "summary" | "summary_large_image";
  title?: string;
  description?: string;
  image?: UrlInput;
  imageAlt?: string;
  site?: string;
  creator?: string;
}

export interface PageMetaBase {
  title?: string;
  titleMode?: "template" | "absolute";
  description?: string;
  robots?: readonly string[];
  openGraph?: false | OpenGraphPageMeta;
  twitter?: false | TwitterPageMeta;
  jsonLd?: JsonLdObject | readonly JsonLdObject[];
  favicons?: readonly FaviconInput[];
  themeColors?: readonly ThemeColorMeta[];
}

export type PageMeta = PageMetaBase & (
  | { canonicalPath?: string; canonicalUrl?: never }
  | { canonicalUrl: UrlInput; canonicalPath?: never }
);

export type SiteMetaErrorCode =
  | "SITE_CONFIG_INVALID"
  | "SITE_URL_INVALID"
  | "PAGE_META_INVALID"
  | "CANONICAL_URL_INVALID"
  | "JSON_LD_INVALID";

export interface SiteMetaErrorOptions {
  code: SiteMetaErrorCode;
  path?: string;
  details?: readonly string[];
  cause?: unknown;
}
