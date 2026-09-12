// registry-parity.spec.ts — the shadcn registry is GONE (2026-09-12,
// the editor purge + kit retirement): gen-registry.ts and the
// committed packages/web-kit/generated/registry.json were the
// shadcn-CLI vendoring manifest for the deleted editor — no live
// consumer existed. This wall pins the deletion so the catalog flow
// cannot creep back: a component catalog implies a component LIBRARY
// to vendor from, and the estate's UI rides DSH atoms, not a kit.
//
// Run: npx vitest run tests/walls/ts/suites/registry-parity.spec.ts
// (or the whole gate: pnpm run test)
import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");

test("the shadcn registry plumbing stays deleted (script + committed catalog)", () => {
  assert.equal(
    existsSync(join(REPO, "packages", "web-kit", "scripts", "gen-registry.ts")),
    false,
    "gen-registry.ts must stay deleted — the shadcn flow died with the editor",
  );
  assert.equal(
    existsSync(join(REPO, "packages", "web-kit", "generated", "registry.json")),
    false,
    "generated/registry.json must stay deleted — no component catalog without a kit",
  );
});
