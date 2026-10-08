// provisioner-render.spec.ts — the profile renderer renders
// (2026-09-11: infer-provision.mjs renders the boot profiles
// — melite-test / headless / estate — and nothing
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

// BUNDLE PIN (dev_docs/deployment/dsh-profiles.md — hermetic, plain `test`:
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

// (single-setup law 2026-10-18: the retired `inference` base carried
// the melite-test list exactly — its gate was this file's duplicate
// of the melite-test gate below, so it is gone with the base.)

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

// BUNDLE-COVERAGE (the :3088 boot refusal, 2026-10-18): every
// non-in-box bundle a rendered profile mounts must ALSO be a direct
// link: dep — @melite/card-base rode the melite-test base with no
// installed package and `dsh --profile melite-test`
// refused to boot ("cannot resolve profile bundle"). In-box
// @deepseek-ai/* bundles resolve from the DSH install, never the
// profile dir. The arm renders ALL THREE profiles through the bin's
// own door and judges the RENDERED roster against the RENDERED
// dependencies — a bundle landing in a base without its dep shows
// here, never at boot.
for (const profile of ["melite-test", "headless", "estate"]) {
  gate(`the ${profile} profile installs every non-in-box bundle it mounts (the coverage cure)`, () => {
    const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
    render(home, profile);
    const pkg = JSON.parse(readFileSync(join(home, "profiles", profile, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      dsh?: { profile?: { bundles?: string[] } };
    };
    const bundles = pkg.dsh?.profile?.bundles ?? [];
    const uncovered = bundles.filter(
      (b) => !b.startsWith("@deepseek-ai/") && !String(pkg.dependencies?.[b] ?? "").startsWith("link:"),
    );
    assert.deepEqual(uncovered, [],
      `every mounted non-in-box bundle is a direct link: dep (uncovered in ${profile}: ${uncovered.join(", ")})`);
  });
}

// CLIENT-EXTERNAL CLOSURE (the :3088 boot refusal, 2026-10-18 — the
// operator's "the testing must [REDACTED 2026-11-05] hard": the battery was green
// while the lane died at boot with `require("@melite/three-client/
// client") missed the module table`). Every `dsh.client.external` a
// mounted bundle declares must resolve to a MOUNTED bundle row —
// card-base/card-view/gallery externalize three-client/client, and
// nothing mounted the row that materializes it. The arm renders
// each profile through the bin's own door, follows the rendered
// link: deps to the packages' OWN manifests, and judges every
// external against the RENDERED roster (in-box @deepseek-ai/*
// resolve from the install, never the profile). A client external
// landing without its row shows here, never on the operator's
// screen. (The coverage arm above owns the uninstalled-bundle case
// — an external whose package is not even a dep is skipped here.)
for (const profile of ["melite-test", "headless", "estate"]) {
  gate(`the ${profile} profile mounts a row for every client external its bundles declare (the closure cure)`, () => {
    const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
    render(home, profile);
    const pkg = JSON.parse(readFileSync(join(home, "profiles", profile, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      dsh?: { profile?: { bundles?: string[] } };
    };
    const bundles = pkg.dsh?.profile?.bundles ?? [];
    const missing: string[] = [];
    for (const b of bundles) {
      if (b.startsWith("@deepseek-ai/")) continue;
      const spec = String(pkg.dependencies?.[b] ?? "");
      if (!spec.startsWith("link:")) continue;
      let manifest: { dsh?: { client?: { external?: unknown } } };
      try {
        manifest = JSON.parse(readFileSync(join(spec.slice("link:".length), "package.json"), "utf8"));
      } catch {
        continue;
      }
      const externals = manifest.dsh?.client?.external;
      if (!Array.isArray(externals)) continue;
      for (const e of externals) {
        const name = String(e).split("/").slice(0, -1).join("/");
        if (name === "" || name.startsWith("@deepseek-ai/")) continue;
        if (!bundles.includes(name)) {
          missing.push(`${b} externalizes ${String(e)} — ${name} is not a mounted bundle`);
        }
      }
    }
    assert.deepEqual(missing, [],
      `every declared client external resolves to a mounted row (missing in ${profile}: ${missing.join("; ")})`);
  });
}

// SEED ⊇ BASE (the "no test caught it" autopsy, 2026-10-18): the
// browser e2e lane (e2e-studio-lane.sh) boots its own committed
// seed profile, NOT the provisioner's melite-test render — and the
// seed already carried @melite/three-client while the base did not.
// Green battery, green browser wall, dead operator lane: the wall
// proved a composition the operator never runs. The invariant that
// was missing: the seed's bundle roster is a SUPERSET of the
// provisioner's web base — the browser wall must exercise EVERY
// bundle the operator's lane mounts (it may carry more: estate
// seats, motion/video cards, glb-viewer for the every-card walk).
// A bundle added to the base without the seed fails HERE, never on
// the operator's screen.
test("the e2e browser seed carries every bundle the provisioner's web base mounts (seed ⊇ base)", () => {
  const seed = JSON.parse(readFileSync(
    join(REPO, "packages/web/melite-card-view/e2e/profile-seed/package.json"), "utf8",
  )) as { dsh?: { profile?: { bundles?: string[] } } };
  const seedBundles = seed.dsh?.profile?.bundles ?? [];
  const base = binProfileBase("melite-test");
  const absent = base.filter((b) => !seedBundles.includes(b));
  assert.deepEqual(absent, [],
    `the e2e seed covers the operator's lane (base bundles missing from the seed: ${absent.join(", ")})`);
});
