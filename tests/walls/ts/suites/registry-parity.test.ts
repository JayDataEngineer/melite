// registry-parity.test.ts — the component catalog is DERIVED
// (2026-09-11: gen-registry.ts emits packages/web-kit/generated/
// registry.json from TS package exports; the committed file is the
// golden and --check exits 1 on drift. Nothing ran --check in any
// gate — a new ui/ export with no regenerated catalog would boot
// clean and surface only as a missing component downstream).
//
// The wall shells the script's own --check (its documented parity
// door) and asserts exit 0. Regeneration itself stays a human act
// (--write), never a test side effect.
//
// Run: node --test tests/walls/ts/suites/registry-parity.test.ts
// (or the whole plane: node tests/walls/ts/run.mjs)
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");
const SCRIPT: string = join(REPO, "packages", "web-kit", "scripts", "gen-registry.ts");

test("the committed registry.json matches the package exports (--check exits 0)", () => {
  let out: string;
  try {
    out = execFileSync(
      process.execPath,
      ["--experimental-strip-types", SCRIPT, "--check"],
      { encoding: "utf8", cwd: REPO, timeout: 120_000 },
    );
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    assert.fail(
      `registry drift — run --write and commit the catalog:\n${err.stdout ?? ""}\n${err.stderr ?? ""}\n${err.message ?? ""}`,
    );
  }
  assert.match(out as string, /matches the packages \(\d+ items\)/);
});
