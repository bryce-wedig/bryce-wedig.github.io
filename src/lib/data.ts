import { z } from 'zod';

import siteYaml from '../data/site.yml';
import tagsYaml from '../data/tags.yml';
import pressYaml from '../data/press.yml';
import publicationsYaml from '../data/publications.yml';
import teachingYaml from '../data/teaching.yml';
import mentoringYaml from '../data/mentoring.yml';
import talksYaml from '../data/talks.yml';
import honorsYaml from '../data/honors.yml';
import educationYaml from '../data/education.yml';
import experienceYaml from '../data/experience.yml';
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
    link_label: z.string().default('ADS'),
  }),
);

/**
 * One dated line of a CV-style list (talks, teaching, honors, …). `date` is free
 * text ("Spring 2025", "2014–2018"); a bare YAML year parses as a number, so
 * accept that too. `title` and each `details` line may contain inline HTML.
 */
const cvEntrySchema = z.object({
  date: z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .optional(),
  title: z.string(),
  details: z.array(z.string()).default([]),
  href: z.string().optional(),
});

const cvListSchema = z.array(cvEntrySchema);

const cvGroupsSchema = z.array(
  z.object({
    group: z.string(),
    // Only used where groups render as collapsible blocks (talks).
    open: z.boolean().default(true),
    items: cvListSchema,
  }),
);

export type CvEntry = z.infer<typeof cvEntrySchema>;

const outreachSchema = z.array(
  z.object({
    title: z.string(),
    body: z.string(),
    link_label: z.string().optional(),
    href: z.string().optional(),
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

export const teaching: z.infer<typeof cvListSchema> = parse(
  cvListSchema,
  teachingYaml,
  'src/data/teaching.yml',
);

export const mentoring: z.infer<typeof cvListSchema> = parse(
  cvListSchema,
  mentoringYaml,
  'src/data/mentoring.yml',
);

export const experience: z.infer<typeof cvListSchema> = parse(
  cvListSchema,
  experienceYaml,
  'src/data/experience.yml',
);

export const talks: z.infer<typeof cvGroupsSchema> = parse(
  cvGroupsSchema,
  talksYaml,
  'src/data/talks.yml',
);

export const honors: z.infer<typeof cvGroupsSchema> = parse(
  cvGroupsSchema,
  honorsYaml,
  'src/data/honors.yml',
);

export const education: z.infer<typeof cvGroupsSchema> = parse(
  cvGroupsSchema,
  educationYaml,
  'src/data/education.yml',
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
