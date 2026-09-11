import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

/** One row of the sticky fact rail on a detail page. */
const railItem = z.object({
  label: z.string(),
  value: z.string().optional(),
  href: z.string().optional(),
  suffix: z.string().optional(),
  tone: z.enum(['ok', 'accent', 'dim', 'mut']).optional(),
  links: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) => z.object({
    key: z.string(),
    order: z.number(),
    title: z.string(),
    short_title: z.string().optional(),
    description: z.string(),
    tags: z.array(z.string()),

    // Homepage tile
    thumb: image(),
    status_short: z.string(),
    status_tone: z.enum(['published', 'ongoing', 'quiet']).default('quiet'),
    blurb: z.string(),

    lede: z.string(),
    rail: z.array(railItem).default([]),
  }),
});

const software = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/software' }),
  schema: z.object({
    key: z.string(),
    order: z.number(),
    title: z.string(),
    description: z.string(),

    // `repo` is the owner/name slug the GitHub sync keys off. Null when the slug
    // isn't known yet, in which case repo_link carries an external docs URL.
    repo: z.string().nullable().default(null),
    repo_link: z.string().optional(),
    repo_link_label: z.string().optional(),
    show_prs: z.boolean().default(false),

    role: z.string(),
    stack: z.string(),

    // Homepage tile
    blurb: z.string(),

    lede: z.string(),
    used_in: z
      .array(z.object({ project: z.string(), label: z.string().optional() }))
      .default([]),
  }),
});

export const collections = { projects, software };
