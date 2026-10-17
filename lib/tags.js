import { sql } from './db';
import { badRequest } from './api';
import { slugify } from './slug';

const MAX_TAGS = 5;
const TAG_NAME_RE = /^[a-z0-9][a-z0-9 .+#-]*$/;

export function normalizeTagNames(input) {
  if (input == null) return [];
  if (!Array.isArray(input)) throw badRequest('tags must be an array of tag names');

  const names = [];
  for (const raw of input) {
    if (typeof raw !== 'string') throw badRequest('Each tag must be a string');
    const name = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase();
    if (!name) continue;
    if (name.length > 30) throw badRequest(`Tag "${name}" is longer than 30 characters`);
    if (!TAG_NAME_RE.test(name)) {
      throw badRequest(`Tag "${name}" may only contain letters, numbers, spaces and . + # -`);
    }
    if (!names.includes(name)) names.push(name);
  }
  if (names.length > MAX_TAGS) throw badRequest(`A post can have at most ${MAX_TAGS} tags`);
  return names;
}

/**
 * Upserts tags by name: reuses an existing tag whose name (or slug) matches,
 * otherwise creates it. Returns the tag ids in input order.
 */
export async function upsertTags(input) {
  const names = normalizeTagNames(input);
  const ids = [];

  for (const name of names) {
    const slug = slugify(name, '');
    if (!slug) throw badRequest(`Tag "${name}" is not valid`);

    const find = () => sql`select id from tags where name = ${name} or slug = ${slug} limit 1`;
    let [tag] = await find();
    if (!tag) {
      [tag] = await sql`insert into tags (name, slug) values (${name}, ${slug}) on conflict do nothing returning id`;
      // Lost a race with a concurrent request creating the same tag.
      if (!tag) [tag] = await find();
      if (!tag) throw new Error(`Could not create tag "${name}"`);
    }
    if (!ids.includes(tag.id)) ids.push(tag.id);
  }
  return ids;
}
