export function createCanonicalUrl(pathname: string, site: URL): URL {
  return new URL(pathname, site);
}
