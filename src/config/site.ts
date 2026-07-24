export type SiteConfig = {
  name: string;
  description: string;
  locale: string;
};

export const siteConfig: SiteConfig = {
  name: import.meta.env.PUBLIC_SITE_NAME ?? "ASC Example Site",
  description: "A minimal site built with albasimia-ssg-core.",
  locale: "ja",
};
