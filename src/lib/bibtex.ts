/**
 * A small BibTeX reader for the ADS-exported papers.bib. It handles what ADS
 * emits (braced or quoted values, bare numbers and month macros) and turns
 * entries into the rows the Publications section renders.
 */

export type BibEntry = { type: string; key: string; fields: Record<string, string> };

export type Publication = {
  year: number;
  month: number;
  title: string;
  byline: string;
  position: string;
  href: string;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// AAS journal macros ADS may use in place of the full journal name.
const JOURNALS: Record<string, string> = {
  '\\aj': 'The Astronomical Journal',
  '\\apj': 'The Astrophysical Journal',
  '\\apjl': 'The Astrophysical Journal Letters',
  '\\apjs': 'The Astrophysical Journal Supplement Series',
  '\\mnras': 'Monthly Notices of the Royal Astronomical Society',
  '\\aap': 'Astronomy & Astrophysics',
  '\\pasp': 'Publications of the Astronomical Society of the Pacific',
  '\\prd': 'Physical Review D',
  '\\jcap': 'Journal of Cosmology and Astroparticle Physics',
  '\\nat': 'Nature',
  '\\natas': 'Nature Astronomy',
};

/** Reads a braced or quoted value starting at `i`, returning it and the index after it. */
function readDelimited(src: string, i: number): [string, number] {
  const close = src[i] === '{' ? '}' : '"';
  let depth = 0;
  let j = i + 1;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') {
      j++;
    } else if (c === '{') {
      depth++;
    } else if (c === '}' && depth > 0) {
      depth--;
    } else if (c === close && depth === 0) {
      break;
    }
  }
  return [src.slice(i + 1, j), j + 1];
}

export function parseBibtex(src: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const head = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let match: RegExpExecArray | null;
  while ((match = head.exec(src))) {
    const type = match[1].toLowerCase();
    if (type === 'comment' || type === 'string' || type === 'preamble') continue;
    const fields: Record<string, string> = {};
    let i = head.lastIndex;
    while (i < src.length) {
      const field = /\s*(\w+)\s*=\s*/y;
      field.lastIndex = i;
      const f = field.exec(src);
      if (!f) break;
      i = field.lastIndex;
      let value: string;
      if (src[i] === '{' || src[i] === '"') {
        [value, i] = readDelimited(src, i);
      } else {
        const bare = /[^,}\s]+/y;
        bare.lastIndex = i;
        value = bare.exec(src)?.[0] ?? '';
        i = bare.lastIndex;
      }
      fields[f[1].toLowerCase()] = value.replace(/\s+/g, ' ').trim();
      const sep = /\s*,?/y;
      sep.lastIndex = i;
      sep.exec(src);
      i = sep.lastIndex;
    }
    entries.push({ type, key: match[2], fields });
    head.lastIndex = i;
  }
  return entries;
}

/** Strips BibTeX grouping braces and the common LaTeX escapes. */
function clean(value: string): string {
  return value
    .replace(/\\&/g, '&')
    .replace(/~/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits an author list on top-level " and " and returns each author's last name. */
function lastNames(authors: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < authors.length; i++) {
    const c = authors[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (depth === 0 && authors.startsWith(' and ', i)) {
      parts.push(authors.slice(start, i));
      start = i + 5;
    }
  }
  parts.push(authors.slice(start));
  return parts.map((p) => clean(p.split(/,(?![^{]*\})/)[0]));
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Converts parsed entries into Publications rows, newest first. */
export function toPublications(entries: BibEntry[], author: string): Publication[] {
  return entries
    .map(({ key, fields }) => {
      const names = lastNames(fields.author ?? '');
      const index = names.findIndex((n) => n.toLowerCase() === author.toLowerCase());
      const position = index === 0 ? 'First author' : 'Co-author';

      const lead = names.length > 2 ? `${names[0]}, ${names[1]} et al.` : names.join(' & ');
      const journalRaw = fields.journal ?? fields.booktitle ?? '';
      const journal = clean(JOURNALS[journalRaw.trim()] ?? journalRaw);
      let venue = journal ? `<i>${escapeHtml(journal)}</i>` : '';
      if (fields.volume) venue += ` <b>${escapeHtml(clean(fields.volume))}</b>`;
      const page = fields.pages ?? fields.eid;
      if (page) venue += `${fields.volume ? ',' : ''} ${escapeHtml(clean(page))}`;
      const byline = venue ? `${escapeHtml(lead)} — ${venue}` : escapeHtml(lead);

      const doi = fields.doi ? `https://doi.org/${fields.doi}` : undefined;
      const arxiv = fields.eprint ? `https://arxiv.org/abs/${fields.eprint}` : undefined;
      const ads = fields.adsurl ? `${fields.adsurl}/abstract` : undefined;
      const href = ads ?? doi ?? arxiv;
      if (!href) throw new Error(`papers.bib › ${key}: needs an adsurl, doi or eprint`);

      const year = Number(fields.year);
      if (!Number.isFinite(year)) throw new Error(`papers.bib › ${key}: missing year`);
      const month = MONTHS.indexOf((fields.month ?? '').slice(0, 3).toLowerCase()) + 1;

      return { year, month, title: clean(fields.title ?? ''), byline, position, href };
    })
    .sort((a, b) => b.year - a.year || b.month - a.month);
}
