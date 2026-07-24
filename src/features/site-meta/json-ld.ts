import { SiteMetaError } from "./errors.js";
import type { JsonLdObject } from "./types.js";

export function serializeJsonLd(value: JsonLdObject): string {
  if (Array.isArray(value)) throw invalidJsonLd("jsonLd");
  validateJsonValue(value, new Set<object>(), "jsonLd");
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch (cause) {
    throw new SiteMetaError("JSON-LD cannot be serialized", {
      code: "JSON_LD_INVALID",
      path: "jsonLd",
      cause,
    });
  }
  if (!serialized) throw invalidJsonLd("jsonLd");
  return serialized
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function validateJsonValue(value: unknown, stack: Set<object>, path: string): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw invalidJsonLd(path);
    return;
  }
  if (typeof value !== "object") throw invalidJsonLd(path);
  if (stack.has(value)) throw invalidJsonLd(path);
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw invalidJsonLd(path);
  }
  stack.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateJsonValue(item, stack, `${path}.${index}`));
  } else {
    Object.entries(value).forEach(([key, item]) => validateJsonValue(item, stack, `${path}.${key}`));
  }
  stack.delete(value);
}

function invalidJsonLd(path: string): SiteMetaError {
  return new SiteMetaError(`${path} is not JSON serializable`, {
    code: "JSON_LD_INVALID",
    path,
  });
}
