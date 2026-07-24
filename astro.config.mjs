import { defineConfig } from "astro/config";

const site = process.env.PUBLIC_SITE_URL ?? "https://example.com";

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  server: {
    host: "0.0.0.0",
  },
});
