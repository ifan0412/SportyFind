#!/usr/bin/env node
/**
 * Concatenate supabase/migrations/*.sql in dependency order.
 * Usage: node scripts/combine-migrations.mjs [output-path]
 * Default output: supabase/staging-bootstrap.sql
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const outputPath =
  process.argv[2] ?? path.join(root, "supabase", "staging-bootstrap.sql");

const LEGACY_FILE = "000_legacy_base_schema.sql";

function migrationSortKey(filename) {
  const match = filename.match(/^(\d+)_/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function orderMigrations(files) {
  const sorted = [...files].sort((a, b) => {
    const diff = migrationSortKey(a) - migrationSortKey(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const legacy = sorted.find((f) => f === LEGACY_FILE);
  if (!legacy) return sorted;

  const rest = sorted.filter((f) => f !== LEGACY_FILE);
  const after002 = rest.findIndex((f) => f.startsWith("002_"));
  const insertAt = after002 >= 0 ? after002 + 1 : rest.length;
  rest.splice(insertAt, 0, legacy);
  return rest;
}

const files = orderMigrations(
  (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql"))
);

const parts = [
  "-- AUTO-GENERATED — do not edit by hand",
  "-- Run: npm run db:combine-migrations",
  `-- Generated: ${new Date().toISOString()}`,
  "-- Paste into Supabase SQL Editor on a NEW staging project.",
  `-- Order: 001–002, then ${LEGACY_FILE}, then 003+.`,
  "",
];

for (const file of files) {
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  parts.push(`-- ===== ${file} =====`, sql.trim(), "", "");
}

await writeFile(outputPath, parts.join("\n"), "utf8");
console.log(`Wrote ${files.length} migrations → ${path.relative(root, outputPath)}`);
