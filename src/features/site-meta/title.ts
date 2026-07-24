import type { PageMetaBase, TitlePolicy } from "./types.js";
import { SiteMetaError } from "./errors.js";
import { requiredText } from "./validation.js";

export function createPageTitle(
  page: Pick<PageMetaBase, "title" | "titleMode">,
  policy: TitlePolicy,
): string {
  const defaultTitle = requiredText(policy.default, "title.default", "SITE_CONFIG_INVALID");
  const separator = policy.separator;
  if (typeof separator !== "string" || !separator.trim() || /[\u0000-\u001f\u007f]/.test(separator)) {
    throw new SiteMetaError("title.separator is invalid", {
      code: "SITE_CONFIG_INVALID",
      path: "title.separator",
    });
  }
  if (policy.position !== "prefix" && policy.position !== "suffix") {
    throw new SiteMetaError("title.position is invalid", {
      code: "SITE_CONFIG_INVALID",
      path: "title.position",
    });
  }
  if (page.titleMode !== undefined && page.titleMode !== "template" && page.titleMode !== "absolute") {
    throw new SiteMetaError("titleMode is invalid", {
      code: "PAGE_META_INVALID",
      path: "titleMode",
    });
  }
  if (page.title === undefined) return defaultTitle;
  const pageTitle = requiredText(page.title, "title", "PAGE_META_INVALID");
  if (pageTitle === defaultTitle || page.titleMode === "absolute") return pageTitle;
  return policy.position === "prefix"
    ? `${defaultTitle}${separator}${pageTitle}`
    : `${pageTitle}${separator}${defaultTitle}`;
}
