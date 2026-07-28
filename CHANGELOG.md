# Changelog

All notable changes to this package are documented here.

## 0.1.4 - 2026-07-28

- Added the `content-assets` public subpath for syncing co-located Content assets to static public directories.
- Added safe relative-path, extension, file-size, symlink, and source/output boundary validation.
- Added an asset catalog for existence checks and public URL resolution.
- Documented the reusable Content Asset convention and its derived-project boundary.

## 0.1.3 - 2026-07-27

- Added reusable Astro UI primitives for layout, section headings, metadata, tags, links, skip navigation, and visually hidden text.
- Added an opt-in Light / Dark / Auto theme boot script and accessible theme switcher.
- Added resolved light/dark theme selectors and muted color tokens while keeping all tokens consumer-overridable.
- Kept site navigation, footer content, project cards, and domain content in derived projects.

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
