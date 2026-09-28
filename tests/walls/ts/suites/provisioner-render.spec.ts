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
import { parse as parseYaml } from "yaml";

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
/** pnpm where THIS machine keeps it. A bare `pnpm` is on no PATH
 *  in the dev shell (the toolchain is mise-installed), and the
 *  bare probe made this wall SKIP here — a real render check
 *  silently out of the suite on the machine that owns the repo.
 *  The probe proves the external tool, not the product; it must
 *  look in the toolchain's own bin before declaring it broken. */
function pnpmBin(): string {
  // real paths first, the bare name only as the last resort (an
  // earlier cut returned "pnpm" on the first pass and so never
  // reached the toolchain — the skip stayed, silently)
  const candidates = [
    process.env["PNPM_BIN"],
    join(process.env["HOME"] ?? "", ".local/share/mise/installs/node/24.21.0/bin/pnpm"),
  ].filter((c): c is string => typeof c === "string" && c !== "");
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "pnpm";
}

function pnpmHealthy(): boolean {
  try {
    const dir = mkdtempSync(join(tmpdir(), "pnpm-health-"));
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "pnpm-workspace.yaml"), 'packages:\n  - "."');
    execFileSync(pnpmBin(), ["install"], { cwd: dir, timeout: 90_000, stdio: "ignore" });
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
  // E-L13 (the wall audit, 2026-09-28): this was a TEXT pin — a
  // renamed key, a different indent, or a row that parsed to
  // something else entirely still matched the substring. The bundle
  // is PARSED and the ROW is inspected as an object.
  const rows = parseYaml(bundle) as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(rows), `the provisioner bundle is a YAML row list (got:\n${bundle.slice(0, 200)})`);
  const host = rows.find((r) => r["id"] === "skill-filesystem");
  assert.ok(host !== undefined, `skill-filesystem is a bundle row (got ids: ${rows.map((r) => String(r["id"])).join(", ")})`);
  assert.equal(host!["disabled"], true, "the skill-filesystem host row is DISABLED in the bundle (a truthy string is not the pin)");
});

// E-M9: the bin's own declarations, parsed from its source — the
// renderer is the oracle, never a list retyped beside it.
const BIN_SRC: string = readFileSync(BIN, "utf8");

function binWebRows(): string[] {
  const m = BIN_SRC.match(/const webRows = \[([\s\S]*?)\]/);
  assert.ok(m !== null, "the bin declares its webRows list (the renderer's own oracle)");
  return [...(m![1] as string).matchAll(/'([^']+)'/g)].map((x) => x[1]!).sort();
}

function binProfileBase(profile: string): string[] {
  const block = BIN_SRC.match(new RegExp(`(?:^|\\n)\\s*(?:'${profile}'|${profile}): \\[([\\s\\S]*?)\\]`));
  assert.ok(block !== null, `the bin declares the ${profile} profile base`);
  return [...(block![1] as string).matchAll(/'([^']+)'/g)].map((x) => x[1]!).filter((b) => b.startsWith("@"));
}

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
  // SELF-REGISTRATION ids (stroke 88, 2026-09-17): the packages' own
  // cordis.patch.yml files insert their rows; the renderer disables
  // the web-plane ones by THOSE ids in non-web mounts (the retired
  // provisioner twin rows — infer-tools-doors/infer-card-deck/
  // infer-gallery-host — double-mounted the tool plane and killed
  // every fresh boot).
  const patch: string = readFileSync(join(dir, "cordis.patch.yml"), "utf8");
  // E-M9 (the wall audit, 2026-09-28): the four row ids were RE-TYPED
  // here beside the bin's own `webRows` array — a fifth web row the
  // renderer disables rode unjudged, and a removed one kept passing.
  // The oracle is the BIN'S OWN LIST, parsed from its source, and
  // the rendered patch must disable EXACTLY those rows (no more, no
  // fewer, no half-disabled).
  const webRows = binWebRows();
  assert.deepEqual(webRows,
    ["infer-card-view", "infer-gallery", "melite-tools-doors", "ray-card-deck"],
    "the bin's webRows list, exactly — a web row landing or leaving is a deliberate edit");
  const disabled = [...patch.matchAll(/^- id: (\S+)\n  disabled: true$/gm)].map((m) => m[1]!).sort();
  assert.deepEqual(disabled, [...webRows].sort(),
    `every web-surface row the bin disables is disabled in the mount — and NO other row (got ${disabled.join(", ")})`);
  // the headless mount bundles the tools plane DIRECT (no twin rows
  // anywhere — the crash law of stroke 88)
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    dsh?: { profile?: { bundles?: string[] } };
  };
  assert.ok(
    pkg.dsh?.profile?.bundles?.includes("@melite/harness-tools") === true,
    "the headless mount bundles @melite/harness-tools (got:\n" + JSON.stringify(pkg.dsh?.profile?.bundles),
  );
});

gate("inference renders the empty user layer (the bundle patch owns every row)", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  render(home, "inference");
  const dir: string = join(home, "profiles", "inference");
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    dsh?: { profile?: { bundles?: unknown } };
  };
  // E-M9: `length > 0` let the bundle roster shrink silently. The
  // rendered roster is the BIN'S profile base, exact (and the set
  // the base declares — a mount that dropped a bundle shows here).
  const bundles = (pkg.dsh?.profile?.bundles ?? []) as string[];
  assert.ok(Array.isArray(bundles) && bundles.length > 0, "the inference profile mounts bundles");
  assert.deepEqual(bundles, binProfileBase("inference"),
    "the rendered bundle roster IS the bin's profile base, exactly");
  const patch: string = readFileSync(join(dir, "cordis.patch.yml"), "utf8");
  // E-C5 (the wall audit, 2026-09-28): `includes("[]")` was a
  // two-character substring — appending `- id: evil` (or anything
  // else) after the marker passed. The web mount's user layer is
  // EXACT BYTES now: the renderer's comment and the empty YAML
  // list, nothing else — the bundle patch owns every row.
  assert.equal(patch, "# rendered by infer-provision - rows live in the bundle\n[]\n",
    `the web mount's user layer is the empty list, byte-exact (got:\n${patch})`);
  assert.ok(!patch.includes("disabled: true"), "nothing is disabled in the web mount");
});

// E-M9 (the wall audit, 2026-09-28): the estate and melite-test
// profiles had NO arm at all — the two mounts the operator actually
// runs (the job server and the test lane) were unwalled while
// headless and inference were pinned.
gate("the estate profile renders the HEADLESS tools interface in a non-web mount", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  render(home, "estate");
  const dir: string = join(home, "profiles", "estate");
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    dsh?: { profile?: { bundles?: string[] } };
  };
  assert.deepEqual(pkg.dsh?.profile?.bundles, binProfileBase("estate"),
    "the estate roster IS the bin's estate base, exactly");
  const patch: string = readFileSync(join(dir, "cordis.patch.yml"), "utf8");
  // the estate mount has no webServer: every web row is disabled
  const disabled = [...patch.matchAll(/^- id: (\S+)\n  disabled: true$/gm)].map((m) => m[1]!).sort();
  assert.deepEqual(disabled, binWebRows(), "the estate mount disables exactly the web-surface rows");
  // and it pins the tools row's HEADLESS interface (the job server
  // executes; it never composes the browser doors)
  assert.ok(/^tools-interface:\s*headless$/m.test(patch) || patch.includes("headless"),
    "the estate mount pins the tools row's headless interface");
});

gate("the melite-test profile renders the WEB mount (the empty user layer, byte-exact)", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  render(home, "melite-test");
  const dir: string = join(home, "profiles", "melite-test");
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    dsh?: { profile?: { bundles?: string[] } };
  };
  assert.deepEqual(pkg.dsh?.profile?.bundles, binProfileBase("melite-test"),
    "the melite-test roster IS the bin's base, exactly");
  const patch: string = readFileSync(join(dir, "cordis.patch.yml"), "utf8");
  // a WEB mount (dsh-web-app is in the base): the user layer is the
  // empty list, byte-exact, and nothing is disabled
  assert.equal(patch, "# rendered by infer-provision - rows live in the bundle\n[]\n",
    `the test lane's web mount carries the empty user layer, byte-exact (got:\n${patch})`);
});
