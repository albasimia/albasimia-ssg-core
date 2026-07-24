import { SiteMetaError } from "./errors.js";
import type {
  FaviconInput,
  ResolvedFavicon,
  SiteMetaErrorCode,
  ThemeColorMeta,
  UrlInput,
  VerificationMeta,
} from "./types.js";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function requiredText(
  value: unknown,
  path: string,
  code: SiteMetaErrorCode,
): string {
  if (typeof value !== "string" || !value.trim() || CONTROL_CHARACTERS.test(value)) {
    throw invalidValue(path, code);
  }
  return value.trim();
}

export function optionalText(
  value: string | undefined,
  path: string,
  code: SiteMetaErrorCode,
): string | undefined {
  return value === undefined ? undefined : requiredText(value, path, code);
}

export function resolveHttpUrl(
  value: UrlInput,
  base: URL | undefined,
  path: string,
  code: SiteMetaErrorCode,
): URL {
  let url: URL;
  try {
    url = value instanceof URL
      ? new URL(value.href)
      : base
        ? new URL(value, base)
        : new URL(value);
  } catch (cause) {
    throw new SiteMetaError(`${path} must be a valid URL`, { code, path, cause });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SiteMetaError(`${path} must use HTTP or HTTPS`, { code, path });
  }
  return url;
}

export function resolveFavicons(
  inputs: readonly FaviconInput[],
  siteUrl: URL,
  code: SiteMetaErrorCode,
  path = "favicons",
): ResolvedFavicon[] {
  const seen = new Set<string>();
  return inputs.map((input, index) => {
    const itemPath = `${path}.${index}`;
    const rel = requiredText(input.rel, `${itemPath}.rel`, code) as FaviconInput["rel"];
    if (rel !== "icon" && rel !== "apple-touch-icon" && rel !== "mask-icon") {
      throw invalidValue(`${itemPath}.rel`, code);
    }
    const type = optionalText(input.type, `${itemPath}.type`, code);
    const sizes = optionalText(input.sizes, `${itemPath}.sizes`, code);
    const color = optionalText(input.color, `${itemPath}.color`, code);
    const identity = `${rel}|${type ?? ""}|${sizes ?? ""}`;
    if (seen.has(identity)) throw invalidValue(itemPath, code);
    seen.add(identity);
    return {
      rel,
      href: resolveHttpUrl(input.href, siteUrl, `${itemPath}.href`, code),
      ...(type ? { type } : {}),
      ...(sizes ? { sizes } : {}),
      ...(color ? { color } : {}),
    };
  });
}

export function validateThemeColors(
  inputs: readonly ThemeColorMeta[],
  code: SiteMetaErrorCode,
  path = "themeColors",
): ThemeColorMeta[] {
  const seen = new Set<string>();
  return inputs.map((input, index) => {
    const itemPath = `${path}.${index}`;
    const color = requiredText(input.color, `${itemPath}.color`, code);
    if (/[<>"']/.test(color)) throw invalidValue(`${itemPath}.color`, code);
    const media = optionalText(input.media, `${itemPath}.media`, code);
    const identity = `${color}|${media ?? ""}`;
    if (seen.has(identity)) throw invalidValue(itemPath, code);
    seen.add(identity);
    return { color, ...(media ? { media } : {}) };
  });
}

export function validateVerification(
  inputs: readonly VerificationMeta[],
): VerificationMeta[] {
  const seen = new Set<string>();
  return inputs.map((input, index) => {
    const path = `verification.${index}`;
    const name = requiredText(input.name, `${path}.name`, "SITE_CONFIG_INVALID");
    if (seen.has(name)) throw invalidValue(`${path}.name`, "SITE_CONFIG_INVALID");
    seen.add(name);
    if (typeof input.content !== "string" || !input.content.trim() || CONTROL_CHARACTERS.test(input.content)) {
      throw new SiteMetaError("Verification content is invalid", {
        code: "SITE_CONFIG_INVALID",
        path: `${path}.content`,
      });
    }
    return { name, content: input.content.trim() };
  });
}

function invalidValue(path: string, code: SiteMetaErrorCode): SiteMetaError {
  return new SiteMetaError(`${path} is invalid`, { code, path });
}
