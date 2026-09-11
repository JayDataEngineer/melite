// provisioner-render.spec.ts — the profile renderer renders
// (2026-09-11: infer-provision.mjs renders the boot profiles
// — inference / headless / estate / melite-test — and nothing
// exercised it. A template rename or a dropped web-row disable
// would boot clean and surface only as a hung non-web mount or
// a double-registered tools plane).
//
// The wall shells the bin's OWN door (`profile <name>
// --dsh-home <tmp>`) — never a reimplementation — into a tmp
// DSH_HOME (the operator's ~/.dsh is never touched) and asserts
// the render contract: the profile dir with a bundles package.json,
// the web-surface rows DISABLED in the headless mount (no webServer
// there — activation would pend forever), the empty row set in the
// web mount (the bundle patch owns every row, no drift). The bin's
// trailing `pnpm install` only links local link: deps (offline-safe).
//
// Run: npx vitest run tests/walls/ts/suites/provisioner-render.spec.ts
// (or the whole gate: pnpm run test)
import { test } from "vitest";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");
const BIN: string = join(REPO, "packages", "harness", "provisioner", "bin", "infer-provision.mjs");

// ENVIRONMENTAL SELF-SKIP (same class as the with-key e2e self-skip):
// the BIN's trailing `pnpm install` needs a working pnpm store, and a
// broken store (this sandbox: ERR_SQLITE_ERROR on a bare install)
// fails the BIN after the render the contract asserts. Preflight pnpm
// itself in a bare fixture — when pnpm works (CI) the full gate runs;
// when pnpm is broken the tests skip instead of masking a render
// regression as an install failure. The preflight proves the external,
// never the product.
function pnpmHealthy(): boolean {
  try {
    const dir = mkdtempSync(join(tmpdir(), "pnpm-health-"));
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "pnpm-workspace.yaml"), 'packages:\n  - "."');
    execFileSync("pnpm", ["install"], { cwd: dir, timeout: 90_000, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const PNPM_OK = pnpmHealthy();
const gate = test.skipIf(!PNPM_OK);

// BUNDLE PIN (docs/deployment/dsh-profiles.md — hermetic, plain `test`:
// it scans the checked-in bundle, needs no pnpm, and stays green where
// the render arms above self-skip). The HOST `skill-filesystem` row is
// pinned OFF for every profile the provisioner bundle mounts —
// otherwise the headless profile auto-injects workspace skills into
// every agent context (the pre-loaded-surface bug).
test("provisioner bundle pins the skill-filesystem host row OFF", () => {
  const bundle = readFileSync(
    join(REPO, "packages", "harness", "provisioner", "cordis.patch.yml"),
    "utf8",
  );
  assert.ok(
    bundle.includes("- id: skill-filesystem\n  disabled: true"),
    `skill-filesystem pin missing from the provisioner bundle (got:\n${bundle.slice(0, 400)})`,
  );
});

function render(home: string, profile: string): string {
  return execFileSync(
    process.execPath,
    [BIN, "profile", profile, "--dsh-home", home],
    { encoding: "utf8", cwd: REPO, timeout: 300_000 },
  );
}

gate("headless renders with the web-surface rows disabled (no webServer in that mount)", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  render(home, "headless");
  const dir: string = join(home, "profiles", "headless");
  assert.ok(existsSync(join(dir, "package.json")), "package.json renders");
  assert.ok(existsSync(join(dir, "cordis.yml")), "cordis.yml renders");
  const patch: string = readFileSync(join(dir, "cordis.patch.yml"), "utf8");
  for (const row of ["infer-tools-doors", "infer-card-view", "infer-card-deck", "infer-gallery-host"]) {
    assert.ok(
      patch.includes("- id: " + row + "\n  disabled: true"),
      `${row} is disabled in the headless mount (got:\n${patch})`,
    );
  }
});

gate("inference renders the empty user layer (the bundle patch owns every row)", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  render(home, "inference");
  const dir: string = join(home, "profiles", "inference");
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    dsh?: { profile?: { bundles?: unknown } };
  };
  assert.ok(
    Array.isArray(pkg.dsh?.profile?.bundles) && (pkg.dsh?.profile?.bundles as unknown[]).length > 0,
    "the inference profile mounts bundles",
  );
  const patch: string = readFileSync(join(dir, "cordis.patch.yml"), "utf8");
  assert.ok(patch.includes("[]"), `the web mount keeps the empty user layer (got:\n${patch})`);
  assert.ok(!patch.includes("disabled: true"), "nothing is disabled in the web mount");
});
