import { z } from 'zod';

import siteYaml from '../data/site.yml';
import tagsYaml from '../data/tags.yml';
import pressYaml from '../data/press.yml';
import publicationsYaml from '../data/publications.yml';
import teachingYaml from '../data/teaching.yml';
import outreachYaml from '../data/outreach.yml';
import githubJson from '../data/github.json';

/**
 * YAML parsers turn bare `2026-04-22` into a Date, but the page prints the plain
 * ISO day, so accept either and normalize back to a string.
 */
const isoDate = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value));

/** Validates a YAML file, failing the build with the file name and the exact bad field. */
function parse<T extends z.ZodType>(schema: T, value: unknown, file: string): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const detail = result.error.issues
      .map(
        (issue) =>
          `  ${file}${issue.path.length ? ` › ${issue.path.join(' › ')}` : ''}: ${issue.message}`,
      )
      .join('\n');
    throw new Error(`Invalid data in ${file}:\n${detail}`);
  }
  return result.data;
}

const siteSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  lang: z.string().default('en'),
  author: z.object({ name: z.string(), email: z.string() }),
  github_username: z.string(),
  links: z.object({
    cv: z.string(),
    github: z.string(),
    orcid: z.string(),
    ads: z.string(),
    linkedin: z.string(),
    advisor: z.string(),
  }),
  contact: z.object({ address: z.array(z.string()), email: z.string() }),
  hero: z.object({ lede_html: z.string() }),
  press_visible: z.number().default(5),
});

const tagsSchema = z.array(z.object({ id: z.string(), label: z.string() }));

const pressSchema = z.array(
  z.object({
    date: isoDate,
    title: z.string(),
    href: z.string(),
    note: z.string().optional(),
  }),
);

const publicationsSchema = z.array(
  z.object({
    year: z.number(),
    title: z.string(),
    byline: z.string(),
    position: z.string(),
    href: z.string(),
  }),
);

const teachingSchema = z.array(z.object({ year: z.number(), body: z.string() }));

const outreachSchema = z.array(
  z.object({
    title: z.string(),
    body: z.string(),
    link_label: z.string(),
    href: z.string(),
  }),
);

const githubSchema = z.object({
  generated: z.string(),
  repos: z.record(
    z.string(),
    z.object({
      stars: z.number(),
      prs: z.array(
        z.object({
          title: z.string(),
          number: z.number(),
          url: z.string(),
          date: z.string(),
          state: z.string(),
        }),
      ),
    }),
  ),
});

export const site: z.infer<typeof siteSchema> = parse(siteSchema, siteYaml, 'src/data/site.yml');

export const tags: z.infer<typeof tagsSchema> = parse(tagsSchema, tagsYaml, 'src/data/tags.yml');

// Press order is curated in the file, not sorted.
export const press: z.infer<typeof pressSchema> = parse(
  pressSchema,
  pressYaml,
  'src/data/press.yml',
);

export const publications: z.infer<typeof publicationsSchema> = parse(
  publicationsSchema,
  publicationsYaml,
  'src/data/publications.yml',
);

export const teaching: z.infer<typeof teachingSchema> = parse(
  teachingSchema,
  teachingYaml,
  'src/data/teaching.yml',
);

export const outreach: z.infer<typeof outreachSchema> = parse(
  outreachSchema,
  outreachYaml,
  'src/data/outreach.yml',
);

/** Star counts and recent pull requests, refreshed nightly and rendered at build time. */
export const github: z.infer<typeof githubSchema> = parse(
  githubSchema,
  githubJson,
  'src/data/github.json',
);

export function repoData(repo: string | null | undefined) {
  return repo ? github.repos[repo] : undefined;
}
