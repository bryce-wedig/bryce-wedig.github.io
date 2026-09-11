# bryce-wedig.github.io

Bryce Wedig's personal website

## Adding or editing content

| To change | Edit |
|---|---|
| A research project | `src/content/projects/<name>.mdx` |
| A software package | `src/content/software/<name>.mdx` |
| Press items | `src/data/press.yml` |
| Publications | `src/data/publications.yml` |
| Teaching & mentoring | `src/data/teaching.yml` |
| Outreach & science policy | `src/data/outreach.yml` |
| Research filter tags | `src/data/tags.yml` |
| Name, links, contact block, hero copy | `src/data/site.yml` |

Every one of these files is validated against a schema when the site builds, so
a typo or a missing field fails the build with the file, the field, and what it
expected — rather than silently rendering an empty section. The schemas live in
`src/content.config.ts` (projects and software) and `src/lib/data.ts` (the YAML
lists).

**A new research project** is a new file in `src/content/projects/`. Copy an
existing one, set `key`, `order` (controls both the tile order and the "Next:"
cycle), `tags` (must match ids in `src/data/tags.yml`), the tile fields, and the
`rail:` list. The URL comes from the filename: `roman.mdx` → `/research/roman/`.
The homepage grid is three columns and reflows to any number of projects.

**A new software package** is a new file in `src/content/software/`. Set `repo:`
to the `owner/name` GitHub slug and `show_prs: true` to get star counts and the
recent pull request list; the nightly sync picks up new repos automatically.

Press items render in file order, not date order — the first five are what
visitors see before expanding, so put the ones that matter most at the top.

## Images

Images live in `src/images/` and are referenced by a path relative to the file
using them, which lets Astro resize them, convert them to WebP, and emit a
responsive `srcset`. Frontmatter takes the path directly:

```yaml
thumb: ../../images/roman_fov.png
```

A figure inside a project body imports the image, then uses the `Figure`
component:

```mdx
import Figure from '@components/Figure.astro';
import romanFov from '../../images/roman_fov.png';

<Figure n="1" src={romanFov} alt="…" caption="…" />
```

Referencing a file that doesn't exist fails the build. The `favicon.ico` and the
CV PDF are served as-is from `public/` and are not processed.

Source images are kept at full resolution; only the generated variants ship. The
build prunes the originals from `dist/` afterwards
(`scripts/prune-orphan-assets.mjs`), because Astro emits them even though no page
links to them.

## Local development

```bash
npm install
npm run dev           # http://localhost:4321, hot-reloads on change
npm run build         # production build into dist/
npm run preview       # serve the built site
npm run check         # type-check components and validate all content
npm run sync-github   # manually sync the star counts and PRs with `scripts/fetch-github-data.mjs`
```
