// profile-insert-rows.spec.ts — THE PROFILE INSERT WALL: every
// `- insert:` row in the composition profiles that names a FILE by
// absolute path must (1) exist on this machine, (2) be tracked by
// git, and (3) point INSIDE this checkout — the three facts
// `scripts/regen-profile-paths.mjs` exists to keep true when the
// repo moves. A fresh clone proves them here instead of assuming
// them; the failure message names the regen command.
//
// Package-name rows (`@melite/...`) resolve through node_modules —
// a different law, not this wall's; only `/`-prefixed names judge.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const PROFILES = ["profile/cordis.base.yml", "profile/cordis.patch.yml"] as const;

interface InsertRow {
  id?: unknown;
  name?: unknown;
}

/** Walk a parsed profile for every `insert:` array, wherever it sits
 *  in the document, and collect its rows. */
function insertRowsOf(doc: unknown, out: InsertRow[] = []): InsertRow[] {
  if (Array.isArray(doc)) {
    for (const entry of doc) insertRowsOf(entry, out);
    return out;
  }
  if (doc === null || typeof doc !== "object") return out;
  const record = doc as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === "insert" && Array.isArray(value)) {
      for (const row of value) {
        if (row !== null && typeof row === "object") out.push(row as InsertRow);
      }
      continue;
    }
    insertRowsOf(value, out);
  }
  return out;
}

describe("the profile insert rows resolve (the regen script's law, proven on every clone)", () => {
  const toplevel = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: ROOT, encoding: "utf8" }).trim();

  for (const rel of PROFILES) {
    const rows = insertRowsOf(parseYaml(readFileSync(join(ROOT, rel), "utf8")));
    const pathRows = rows
      .filter((row) => typeof row.name === "string" && row.name.startsWith("/"))
      .map((row) => ({ id: String(row.id), name: row.name as string }));

    it(`${rel}: carries at least one path-named insert row (the parse found the block)`, () => {
      assert.ok(
        pathRows.length >= 1,
        `${rel} yielded no path-named insert rows — either the insert block moved or this wall's parse rotted`,
      );
    });

    for (const row of pathRows) {
      it(`${rel} [${row.id}]: the named file exists, is tracked, and points inside this checkout`, () => {
        assert.equal(
          existsSync(row.name),
          true,
          `${rel} insert row '${row.id}' names a file that does not exist: ${row.name}`,
        );
        const relToRepo = row.name.startsWith(`${toplevel}/`) ? row.name.slice(toplevel.length + 1) : row.name;
        execFileSync("git", ["ls-files", "--error-unmatch", relToRepo], { cwd: ROOT, stdio: "pipe" });
        assert.equal(
          row.name.startsWith(toplevel),
          true,
          `${rel} insert row '${row.id}' points outside this checkout (${row.name}) — run \`pnpm run profile:regen\``,
        );
      });
    }
  }
});
