/**
 * Remove news URLs that could never have been safe to click (ARCA-73).
 *
 *   bun run scripts/purge-unsafe-news-urls.ts          # report only
 *   bun run scripts/purge-unsafe-news-urls.ts --write  # actually clear them
 *
 * ## Why this exists
 *
 * `POST /api/news` accepted anything from anyone, with no credential, until ARCA-73. Whatever is in
 * `market_news` on a deployed instance was written under no rules at all, so guarding the write does
 * not make the table safe — it only stops it getting worse.
 *
 * ## Why it clears the url rather than deleting the row
 *
 * A row with a bad URL may still be a real news item somebody wrote; the URL is the part that cannot
 * be trusted. Deleting the row throws away the title, the source and the sentiment to fix a field.
 * Clearing the field removes the danger and keeps the evidence — including the evidence that
 * somebody once put something odd in there, which is worth being able to see.
 *
 * Reports before it writes, and requires `--write` to change anything, because a script that mutates
 * a table on being run is one nobody dares run.
 */

import { Database } from "bun:sqlite";
import { join } from "node:path";
import { isSafeHttpUrl } from "../modules/news/url-safety.ts";

const WRITE = process.argv.includes("--write");
const DB_PATH = process.env.ARCA_DB_PATH ?? join(import.meta.dir, "..", "data", "arca.db");

const db = new Database(DB_PATH);
const rows = db
  .query("select id, title, url from market_news where url is not null")
  .all() as Array<{
  id: string;
  title: string;
  url: string;
}>;

const bad = rows.filter((r) => !isSafeHttpUrl(r.url));

console.log(`market_news: ${rows.length} row(s) with a url, ${bad.length} unsafe.`);
for (const r of bad) {
  // The URL is printed so whoever runs this can see what was in their database. That is the point of
  // running it.
  console.log(`  ${r.id}  ${JSON.stringify(r.url)}  — ${r.title.slice(0, 60)}`);
}

if (bad.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

if (!WRITE) {
  console.log("\nRe-run with --write to clear these urls (the rows themselves are kept).");
  process.exit(0);
}

const stmt = db.prepare("update market_news set url = null where id = ?");
for (const r of bad) stmt.run(r.id);

const left = (
  db.query("select id, url from market_news where url is not null").all() as Array<{ url: string }>
).filter((r) => !isSafeHttpUrl(r.url));

// Counted afterwards rather than trusted: a silent no-op is the failure this repo has met before
// (ARCA-44), and "cleared 3 urls" printed by a loop that wrote nothing reads exactly the same.
if (left.length > 0) {
  console.error(`❌ ${left.length} unsafe url(s) still present after the update.`);
  process.exit(1);
}
console.log(`✅ Cleared ${bad.length} unsafe url(s). ${rows.length - bad.length} left untouched.`);
