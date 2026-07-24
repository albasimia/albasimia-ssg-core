import { SiteMetaError } from "./errors.js";
import type { SiteMetaErrorCode } from "./types.js";

export function normalizeRobots(
  directives: readonly string[],
  code: SiteMetaErrorCode = "PAGE_META_INVALID",
  path = "robots",
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  directives.forEach((value, index) => {
    const directive = typeof value === "string" ? value.trim() : "";
    if (!directive || directive.includes(",") || /[\u0000-\u001f\u007f]/.test(directive)) {
      throw new SiteMetaError(`${path}.${index} is invalid`, {
        code,
        path: `${path}.${index}`,
      });
    }
    if (!seen.has(directive)) {
      seen.add(directive);
      result.push(directive);
    }
  });
  if (result.length === 0) {
    throw new SiteMetaError(`${path} must contain at least one directive`, {
      code,
      path,
    });
  }
  return result;
}

export function serializeRobots(directives: readonly string[]): string {
  return normalizeRobots(directives).join(", ");
}
