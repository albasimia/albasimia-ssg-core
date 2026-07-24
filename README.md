# albasimia-ssg-core

**ASC** is a GitOps-oriented static site generation core built with Astro.

It is intended as a reusable foundation for portfolio sites, event sites,
service landing pages, and other sites that can be delivered through static
hosting services.

## Goals

- Generate static HTML with Astro
- Keep site content and configuration in Git
- Connect easily to static hosting services
- Separate reusable infrastructure from project-specific content
- Provide a small, readable foundation for derived projects

## Non-goals

ASC does not provide:

- SSR
- Authentication as an application feature
- Databases
- Runtime API servers
- Stateful backend processing
- General-purpose CMS functionality

Projects that require those capabilities should use a different foundation.

## Repository structure

```text
.
├── docs/
├── public/
├── src/
│   ├── components/
│   ├── config/
│   ├── content/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   └── styles/
├── tests/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Getting started

```sh
npm install
npm run dev
```

Before publishing:

```sh
npm run check
npm run test
npm run build
```

## Derived projects

ASC is intended to become the common foundation for projects such as:

- `catharsiswatari-events`
- `amano-pj`

Project-specific schemas, copy, visual identity, and domain features should
remain in each derived project.

## License

MIT
