# Changelog

All notable changes to this package are documented here.

## 0.1.2 - 2026-07-26

- Added the `asc init [directory]` CLI for generating a minimal static Astro consumer.
- Added packed-package verification that invokes the installed CLI and builds its generated site.

## 0.1.1 - 2026-07-26

- Fixed GitHub dependency installs by generating `package-dist/` from the npm `prepare` lifecycle.
- Kept Sass and TypeScript as package build dependencies instead of consumer dependencies.

## 0.1.0 - 2026-07-25

- Added the `site-meta`, `sitemap`, `content-source`, `git-content`, and `deploy-status` public subpaths.
- Added the package-ready `layouts/BaseLayout.astro` entry and compile済み `styles/theme.css` / `styles/global.css` entries.
- Added generic GitHub GitOps operations for repository content, atomic multi-file commits, and Actions run status.
- Added a copyable GitHub Actions and Cloudflare Pages deployment template.
- Added ESM JavaScript, declarations, an explicit export map, a distribution allowlist, and packed-package consumer verification.
