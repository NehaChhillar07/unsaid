// Anonymity regression guard (plan-mandated).
// The public views are the ONLY way clients read posts/comments. If any of them
// ever selects author_id, every client could deanonymize every author. This test
// parses the schema migrations and fails if that ever happens — so a careless
// `select p.*` or `author_id` in a future view edit cannot ship silently.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const migDir = join(here, '..', 'supabase', 'migrations');

// concatenate all migrations (a view could be redefined in a later migration)
const sql = readdirSync(migDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(migDir, f), 'utf8'))
  .join('\n');

const PUBLIC_VIEWS = ['feed_posts', 'post_comments', 'saved_posts'];

/** extract the body of `create ... view <name> as <body>;` (last definition wins) */
function viewBody(name) {
  // matches plain AND materialized views (a future `create materialized view`
  // must not slip past this guard)
  const re = new RegExp(
    `create\\s+(?:or\\s+replace\\s+)?(?:materialized\\s+)?view\\s+(?:public\\.)?${name}\\b[\\s\\S]*?;`,
    'gi',
  );
  const matches = sql.match(re);
  return matches ? matches[matches.length - 1] : null;
}

/**
 * The PROJECTION (the column list) is what actually reaches clients. author_id
 * legitimately appears in JOIN/WHERE clauses (joins to identities, mute filters)
 * — that is not a leak. We assert only the projected columns are clean.
 */
function viewProjection(name) {
  const body = viewBody(name);
  if (!body) return null;
  // from the LAST 'select' that follows 'as', up to the next top-level ' from '
  const m = /\bas\b\s*select\b([\s\S]*?)\bfrom\b/i.exec(body);
  return m ? m[1] : null;
}

for (const view of PUBLIC_VIEWS) {
  test(`public view ${view} exists`, () => {
    assert.ok(viewBody(view), `view ${view} not found in migrations`);
  });

  test(`public view ${view} never projects author_id`, () => {
    const proj = viewProjection(view);
    assert.ok(proj, `could not parse projection for ${view}`);
    assert.ok(
      !/\bauthor_id\b/i.test(proj),
      `ANONYMITY LEAK: view ${view} projects author_id:\n${proj}`,
    );
  });

  test(`public view ${view} surfaces role_title (pseudonym), not raw identity`, () => {
    const proj = viewProjection(view) ?? '';
    assert.ok(/role_title/i.test(proj), `view ${view} should expose role_title`);
  });
}

// belt-and-suspenders: no public view should ever `select *` (would pull author_id)
test('no public view does select * (would pull author_id)', () => {
  for (const view of PUBLIC_VIEWS) {
    const proj = viewProjection(view) ?? '';
    assert.ok(
      !/^\s*\*/.test(proj),
      `view ${view} uses select * — enumerate columns so author_id can't leak in`,
    );
  }
});
