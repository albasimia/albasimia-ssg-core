# Architecture

## Core principle

ASC contains only functionality that can be reused by multiple static sites.

Project-specific content models and domain behavior should remain outside the
core.

## Initial boundaries

### Included

- Astro static output configuration
- Base layouts
- Site configuration
- Shared styling foundation
- Content Collections foundation
- SEO utilities
- Testing and CI
- Static-hosting-oriented GitOps workflow

### Excluded

- Event-specific schemas
- Artist and timetable management
- Portfolio-specific project and career schemas
- Database access
- SSR
- Runtime authentication
- Backend application APIs

## Extraction policy

Code should move into ASC only after it has a plausible second use case.

The initial validation projects are:

1. catharsiswatari-events
2. amano-pj
