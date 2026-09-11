#!/usr/bin/env node
/**
 * Refreshes src/data/github.json with star counts and recent authored pull
 * requests for every repository referenced by the software collection.
 *
 * Run by .github/workflows/refresh-github-data.yml on a nightly schedule so the
 * site renders this data statically at build time — no GitHub API call happens
 * in a visitor's browser, which keeps the pages working offline, under rate
 * limits, and for every visitor.
 *
 *   node scripts/fetch-github-data.mjs
 *
 * Reads GITHUB_TOKEN from the environment when present (raises the rate limit
 * and is provided automatically inside Actions); works unauthenticated too.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOFTWARE_DIR = path.join(ROOT, 'src', 'content', 'software');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'github.json');
const SITE_FILE = path.join(ROOT, 'src', 'data', 'site.yml');
const PER_PAGE = 8;

const token = process.env.GITHUB_TOKEN || '';

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'bryce-wedig.github.io-data-sync',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

/** Front-matter values we need, read without pulling in a YAML dependency. */
function frontMatterValue(source, key) {
  const match = source.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

async function softwareRepos() {
  const files = (await readdir(SOFTWARE_DIR)).filter((f) => /\.mdx?$/.test(f));
  const repos = [];

  for (const file of files) {
    const source = await readFile(path.join(SOFTWARE_DIR, file), 'utf8');
    const repo = frontMatterValue(source, 'repo');
    const showPrs = frontMatterValue(source, 'show_prs') === 'true';
    if (repo) repos.push({ repo, showPrs });
  }

  return repos;
}

async function api(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

async function fetchRepo({ repo, showPrs }, author) {
  const entry = { stars: null, prs: [] };

  const meta = await api(`https://api.github.com/repos/${repo}`);
  entry.stars = meta.stargazers_count;

  if (showPrs) {
    const query = encodeURIComponent(`repo:${repo} type:pr author:${author}`);
    const search = await api(
      `https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=${PER_PAGE}`
    );

    entry.prs = (search.items || []).map((pr) => ({
      title: pr.title,
      number: pr.number,
      url: pr.html_url,
      date: (pr.closed_at || pr.created_at || '').slice(0, 10),
      state: pr.pull_request && pr.pull_request.merged_at ? 'merged' : pr.state,
    }));
  }

  return entry;
}

async function main() {
  const config = await readFile(SITE_FILE, 'utf8');
  const author = frontMatterValue(config, 'github_username') || 'bryce-wedig';

  const repos = await softwareRepos();
  const out = { generated: new Date().toISOString(), repos: {} };

  // Keep whatever we already had, so one failing repo never blanks the site.
  let previous = { repos: {} };
  try {
    previous = JSON.parse(await readFile(OUT_FILE, 'utf8'));
  } catch (e) {
    /* first run */
  }

  let failures = 0;

  for (const entry of repos) {
    try {
      out.repos[entry.repo] = await fetchRepo(entry, author);
      console.log(
        `${entry.repo}: ★ ${out.repos[entry.repo].stars}, ${out.repos[entry.repo].prs.length} PRs`
      );
    } catch (error) {
      failures += 1;
      console.error(`${entry.repo}: ${error.message}`);
      if (previous.repos && previous.repos[entry.repo]) {
        out.repos[entry.repo] = previous.repos[entry.repo];
        console.error(`${entry.repo}: kept previous data`);
      }
    }
  }

  await writeFile(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, OUT_FILE)}`);

  if (failures === repos.length && repos.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
