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
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  binProfileBase as censusProfileBase,
  binWebRows as censusWebRows,
  selfRegisteringWebFaces as censusWebFaces,
} from "./provisioner-census.ts";

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

// The two census reads live in provisioner-census.ts: the boot wall
// judges the served graph against the same reads (the H3 composition
// audit F1/F2, 2026-10-10 — the render plane and the boot plane must
// agree on which faces exist and which ones a base promises).
const binWebRows = (): string[] => censusWebRows(BIN_SRC);

const binProfileBase = (profile: string): string[] => censusProfileBase(BIN_SRC, profile);

const selfRegisteringWebFaces = (): string[] => censusWebFaces(REPO);

function render(home: string, profile: string, ...flags: string[]): string {
  return execFileSync(
    process.execPath,
    [BIN, "profile", profile, "--dsh-home", home, ...flags],
    { encoding: "utf8", cwd: REPO, timeout: 300_000 },
  );
}

/** Runs the bin expecting a LOUD failure; returns its stderr. */
function renderDies(profile: string, ...flags: string[]): string {
  try {
    execFileSync(
      process.execPath,
      [BIN, "profile", profile, "--dsh-home", mkdtempSync(join(tmpdir(), "provisioner-die-")), ...flags],
      { encoding: "utf8", cwd: REPO, timeout: 300_000 },
    );
  } catch (err) {
    const e = err as { stderr?: string };
    assert.ok(e.stderr !== undefined && e.stderr.includes("infer-provision:"),
      `the bin dies loud with its own name (got: ${e.stderr ?? "<none>"})`);
    return e.stderr!;
  }
  assert.fail(`the render was expected to die loud (flags: ${flags.join(" ")}) — it exited 0`);
}

// F7 (provisioner audit, cured 2026-10-21): an unknown profile name
// used to fall back to the headless composition and exit 0 — a typo
// in a documented command produced a bootable-looking directory with
// the wrong rows. The refusal is pinned here: die loud, name the
// known list, render NOTHING.
gate("an unknown profile name dies loud and renders nothing (F7)", () => {
  const stderr: string = renderDies("inferecne");
  assert.match(stderr, /unknown profile 'inferecne' — known: melite-test, headless, estate/,
    "the refusal names the typo and the known profiles");
});

gate("headless renders with the web-surface rows disabled (no webServer in that mount)", () => {  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
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
  // THE DELEGATED-OPERATOR PIN: the headless mount RUNS jobs — the
  // tools row selects the HEADLESS interface (melite_flow +
  // run_status). The faceless-maker commission (2026-10-21) proved
  // the compose-only mount: benches composed, every execution
  // refused at the absent verb.
  assert.match(
    patch,
    /- id: melite-tools\n  config:\n    headless: true/,
    "the headless mount pins the tools row's HEADLESS interface (the run doors)",
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

gate("the melite-test profile renders the WEB mount with the estate seat pin", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  render(home, "melite-test");
  const dir: string = join(home, "profiles", "melite-test");
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    dsh?: { profile?: { bundles?: string[] } };
  };
  assert.deepEqual(pkg.dsh?.profile?.bundles, binProfileBase("melite-test"),
    "the melite-test roster IS the bin's base, exactly");
  const patch: string = readFileSync(join(dir, "cordis.patch.yml"), "utf8");
  // E-M9 (same oracle law as the webRows gate): the seat pin is
  // inspected as PARSED rows, never matched as text. A WEB mount
  // carries exactly the estate pin — repoRoot is the RENDER'S OWN
  // repo root (mechanical; the wall derives it the same way), no
  // agentRoute without the flag, no melite bundle row, nothing
  // disabled.
  const rows = parseYaml(patch) as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(rows), `the web mount patch is a YAML row list (got:\n${patch.slice(0, 200)}`);
  assert.equal(rows.length, 1, `exactly the estate pin row (got ${rows.length}: ${rows.map((r) => String(r["id"])).join(", ")})`);
  const estate = rows[0]!;
  assert.equal(estate["id"], "melite-estate", "the pin row addresses the estate row by id");
  const config = estate["config"] as Record<string, unknown>;
  assert.equal(config["repoRoot"], REPO,
    `repoRoot is the render's own repo root, unqualified (got ${String(config["repoRoot"])})`);
  assert.ok(!("agentRoute" in config),
    "no agentRoute without the flag — the engine stays honestly unseated");
});

gate("--estate-agent-route pins the agent brain verbatim", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  const route = "opencode-go/muse-spark-1.3-contributor";
  render(home, "melite-test", "--estate-agent-route", route);
  const patchYaml: string = readFileSync(join(home, "profiles", "melite-test", "cordis.patch.yml"), "utf8");
  const rows = parseYaml(patchYaml) as Array<Record<string, unknown>>;
  const estate = rows.find((r) => r["id"] === "melite-estate") as Record<string, unknown>;
  assert.ok(estate !== undefined, "the estate pin row renders");
  assert.equal((estate["config"] as Record<string, unknown>)["agentRoute"], route,
    "agentRoute lands verbatim — the render never reshapes the brain name");
});

test("--estate-agent-route rejects a malformed route loud (no install needed)", () => {
  const stderr = renderDies("melite-test", "--estate-agent-route", "no-slash-here");
  assert.ok(stderr.includes("--estate-agent-route") && stderr.includes("provider/model"),
    `the failure names the flag and its wanted shape (got: ${stderr})`);
});

gate("--profile-rows splices operator rows verbatim", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  const rowsFile = join(home, "operator-rows.yml");
  writeFileSync(rowsFile,
    "# operator brain — the profile layer's provider rows\n"
    + "- id: llm-pi-ai\n"
    + "  name: \"@deepseek-ai/dsh-llm-pi-ai\"\n"
    + "  config:\n"
    + "    providers:\n"
    + "      opencode-go:\n"
    + "        apiKeyEnv: OPENCODE_API_KEY\n"
    + "        api: openai-responses\n"
    + "        baseURL: https://opencode.ai/zen/go/v1\n"
    + "        models:\n"
    + "          - id: muse-spark-1.3-contributor\n"
    + "            name: Muse Spark 1.3 (Contributor)\n"
    + "            contextWindow: 200000\n"
    + "            input: [text, image]\n",
  );
  render(home, "melite-test", "--profile-rows", rowsFile);
  const patch = readFileSync(join(home, "profiles", "melite-test", "cordis.patch.yml"), "utf8");
  const rows = parseYaml(patch) as Array<Record<string, unknown>>;
  const llm = rows.find((r) => r["id"] === "llm-pi-ai") as Record<string, unknown>;
  assert.ok(llm !== undefined, "the operator llm row rides the profile layer");
  const provider = ((llm["config"] as Record<string, unknown>)["providers"] as Record<string, unknown>)["opencode-go"] as Record<string, unknown>;
  assert.equal(provider["apiKeyEnv"], "OPENCODE_API_KEY",
    "the splice preserves field content verbatim (never re-serialized)");
  assert.ok(patch.includes("- id: llm-pi-ai"),
    "the raw row text survives the splice byte-for-byte");
  // the seat pin still renders alongside the operator rows
  assert.ok(rows.some((r) => r["id"] === "melite-estate"),
    "the estate seat pin renders beside the operator rows");
  // F5 (same render): the provenance stamp records the operator
  // rows by path + content hash — a re-render with edited rows is
  // distinguishable from this one without diffing the profile.
  const prov = JSON.parse(readFileSync(
    join(home, "profiles", "melite-test", "render-provenance.json"), "utf8",
  )) as { flags?: { profileRows?: { path?: unknown; sha256?: unknown } | null } };
  const rowsBytes: string = readFileSync(rowsFile, "utf8");
  assert.equal(prov.flags?.profileRows?.path, rowsFile, "the stamp names the rows file");
  assert.equal(prov.flags?.profileRows?.sha256, createHash("sha256").update(rowsBytes, "utf8").digest("hex"),
    "the stamp hashes the rows content");
});

test("--profile-rows dies loud on a missing file (no install needed)", () => {
  const stderr = renderDies("melite-test", "--profile-rows", "/nonexistent/rows.yml");
  assert.ok(stderr.includes("--profile-rows") && stderr.includes("no such file"),
    `the failure names the flag and the file (got: ${stderr})`);
});

test("--profile-rows dies loud on a non-row file (no install needed)", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-die-"));
  const rowsFile = join(home, "not-rows.yml");
  writeFileSync(rowsFile, "providers:\n  some: map\n");
  const stderr = renderDies("melite-test", "--profile-rows", rowsFile);
  assert.ok(stderr.includes("row list") || stderr.includes('- "'),
    `the failure names the wanted shape (got: ${stderr})`);
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
// operator's "the testing must [REDACTED 2026-11-05 profanity ruling]
// hard": the battery was green
// while the lane died at boot with `require("@melite/three-client/
// client") missed the module table`). The module table is fed by
// ROWS, and a row materializes when a mounted bundle's OWN
// cordis.patch.yml inserts it (the rendered profile's patch is
// empty by design — "rows live in the bundle"; the provisioner
// bundle's patch mounts @melite/3d-img-to-mesh on every lane the
// same way, the composition-seams audit's S4, so iterating the
// ROSTER's bundles — not the roster's names — covers every row
// source). Every row-named package's `dsh.client.external` must
// resolve to another row: three-client out of the roster means its
// patch never applies, its row never lands, and card-base /
// card-view / gallery dangle — the exact incident. (The arm asserts
// a non-empty row set first: its first cut parsed the empty profile
// patch, judged nothing, and stayed green on BOTH sides — the
// negative control caught the vacuous wall, and this assertion is
// the lesson wired in.)
for (const profile of ["melite-test", "headless", "estate"]) {
  gate(`the ${profile} profile mounts a row for every client external its mounted bundles declare (the closure cure)`, () => {
    const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
    render(home, profile);
    const pkg = JSON.parse(readFileSync(join(home, "profiles", profile, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      dsh?: { profile?: { bundles?: string[] } };
    };
    const deps = pkg.dependencies ?? {};
    const bundles = (pkg.dsh?.profile?.bundles ?? []).filter((b) => !b.startsWith("@deepseek-ai/"));
    const rows: string[] = [];
    for (const b of bundles) {
      const spec = String(deps[b] ?? "");
      if (!spec.startsWith("link:")) continue;
      let patch: unknown;
      try {
        patch = parseYaml(readFileSync(join(spec.slice("link:".length), "cordis.patch.yml"), "utf8"));
      } catch {
        continue;
      }
      if (!Array.isArray(patch)) continue;
      for (const entry of patch) {
        if (typeof entry !== "object" || entry === null || !Array.isArray((entry as { insert?: unknown }).insert)) continue;
        for (const row of (entry as { insert: Array<{ name?: unknown }> }).insert) {
          if (typeof row?.name === "string" && row.name !== "") rows.push(row.name);
        }
      }
    }
    assert.ok(rows.length > 0,
      `the ${profile} row set parsed empty — the closure model drifted from the renderer's composition (vacuous walls are the incident's shape)`);
    // PLATFORM LAW (this arm's first real catch, 2026-10-18): the
    // provisioner's patch mounts @melite/3d-img-to-mesh on every
    // lane, and its external (@melite/card-base/client) only rides
    // the web base — a dangling external on headless/estate. But
    // the package's dsh.client declares platform: web, and web
    // client bytes compose only in a web mount (the loader's own
    // law): the external is inert on server profiles, whose
    // composition drift the B0 dump pin in provisioner-boot.spec.ts
    // owns instead. Judge web-platform externals only where a web
    // tier actually mounts.
    const web = (pkg.dsh?.profile?.bundles ?? []).includes("@deepseek-ai/dsh-web-app");
    const missing: string[] = [];
    for (const name of rows) {
      if (name.startsWith("@deepseek-ai/")) continue;
      const spec = String(deps[name] ?? "");
      if (!spec.startsWith("link:")) continue;
      let manifest: { dsh?: { client?: { external?: unknown; platform?: unknown } } };
      try {
        manifest = JSON.parse(readFileSync(join(spec.slice("link:".length), "package.json"), "utf8"));
      } catch {
        continue;
      }
      const client = manifest.dsh?.client;
      if (!web && client?.platform === "web") continue;
      const externals = client?.external;
      if (!Array.isArray(externals)) continue;
      for (const e of externals) {
        const pkgName = String(e).split("/").slice(0, -1).join("/");
        if (pkgName === "" || pkgName.startsWith("@deepseek-ai/")) continue;
        if (!rows.includes(pkgName)) {
          missing.push(`${name} externalizes ${String(e)} — no mounted row names ${pkgName}`);
        }
      }
    }
    assert.deepEqual(missing, [],
      `every declared client external resolves to a mounted row (missing in ${profile}: ${missing.join("; ")})`);
  });
}

// S7a/S8 (composition-seams audit :32/:34, cured 2026-10-21): the
// disable guard above reads the bin's OWN webRows list (E-M9's
// fix) — a self-oracle. The two joins the audit owed, both derived
// from MOUNTED manifests, never retyped:
//   S7a — every disabled id (the rendered profile patch AND any
//   mounted bundle's patch) is a row some mounted bundle actually
//   inserts; a disable naming no inserted row is the silent no-op
//   ("patch: entry not found", render-vs-boot.md:265-289).
//   S8 — every mounted row whose package injects the web surface
//   is in webRows; a self-registering web row outside the list
//   pends forever in non-web mounts with no red anywhere.
for (const profile of ["melite-test", "headless", "estate"]) {
  gate(`the ${profile} profile joins its disables and web surface to mounted rows (S7a/S8)`, () => {
    const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
    render(home, profile);
    const dir: string = join(home, "profiles", profile);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      dsh?: { profile?: { bundles?: string[] } };
    };
    const deps = pkg.dependencies ?? {};
    const bundles = pkg.dsh?.profile?.bundles ?? [];
    // EVERY patch-bearing layer this mount reads: the rendered
    // profile patch and each mounted bundle's patch (the provisioner
    // bundle rides its skill-filesystem override that way; a link:
    // dep that is NOT a mounted bundle contributes no patch layer —
    // its rows warn "entry not found" at boot, the exact no-op class
    // this join pins). @deepseek-ai bundles resolve through the
    // reference tree (the vendored DSH source).
    const patchDirs: string[] = [dir];
    for (const b of bundles) {
      if (b.startsWith("@deepseek-ai/")) {
        const short = b.replace(/^@deepseek-ai\/dsh-/, "");
        const ref = join(REPO, "references", "deepseek-harness", "packages", "bundle", short);
        if (existsSync(join(ref, "cordis.patch.yml"))) patchDirs.push(ref);
        continue;
      }
      const spec = String(deps[b] ?? "");
      if (spec.startsWith("link:") && existsSync(join(spec.slice("link:".length), "cordis.patch.yml"))) {
        patchDirs.push(spec.slice("link:".length));
      }
    }
    // insert ids (with the owning row names, for S8) and disabled
    // ids, across every layer
    const insertIds = new Set<string>();
    const insertRows: Array<{ id: string; name: string; pkgDir: string }> = [];
    const disabledIds = new Set<string>();
    for (const pdir of patchDirs) {
      let doc: unknown;
      try {
        doc = parseYaml(readFileSync(join(pdir, "cordis.patch.yml"), "utf8"));
      } catch {
        continue;
      }
      if (!Array.isArray(doc)) continue;
      for (const entry of doc) {
        if (typeof entry !== "object" || entry === null) continue;
        const e = entry as { id?: unknown; disabled?: unknown; insert?: unknown };
        if (typeof e.id === "string" && e.disabled === true) disabledIds.add(e.id);
        if (!Array.isArray(e.insert)) continue;
        for (const row of e.insert as Array<{ id?: unknown; name?: unknown }>) {
          if (typeof row?.id !== "string" || row.id === "") continue;
          insertIds.add(row.id);
          if (typeof row.name === "string" && row.name !== "") {
            insertRows.push({ id: row.id, name: row.name, pkgDir: pdir });
          }
        }
      }
    }
    assert.ok(insertIds.size > 0, `the ${profile} insert set parsed empty — the join model drifted (vacuous wall)`);
    assert.ok(disabledIds.size > 0, `the ${profile} disable set parsed empty — the join model drifted (vacuous wall)`);
    // THE ROW PLANE (the H3 composition audit F2, 2026-10-10): the
    // bundle list is not the mount. A self-registering web face rides
    // the profile as a BUNDLE while its row lives in its OWN patch —
    // delete that row and the bundle still mounts (the base ⊇ faces
    // wall above passes), the disable set still lands (S7a passes),
    // and the face never reaches the served graph: the timeline bar
    // vanished exactly this way with the whole battery green. Every
    // base-bundled self-registering face must be named by a row some
    // layer INSERTS.
    const faceNames = new Set(insertRows.map((r) => r.name));
    // VACUITY GUARD: the census itself resolves (the same guard the
    // base ⊇ faces wall carries) — an empty scan would pass the check
    // below on nothing. The bundled subset is per-profile: the headless
    // and estate mounts bundle no web faces at all (S7a pins their web
    // rows disabled).
    const faces = selfRegisteringWebFaces();
    assert.ok(faces.includes("@melite/card-base"),
      `the face scan resolves the workspace manifests (got: ${faces.join(", ")})`);
    const bundledFaces = faces.filter((face) => bundles.includes(face));
    const rowless = bundledFaces.filter((face) => !faceNames.has(face)).sort();
    assert.deepEqual(rowless, [],
      `every self-registering web face the ${profile} base bundles is named by an inserted row (rowless: ${rowless.join(", ")})`);
    // S7a: every disabled id is a mounted row — except the pinned
    // no-op warn set (the web-row disables for packages this profile
    // does not bundle; render-vs-boot.md:265-289 reproduces the 3-line
    // "patch: entry not found" and the follow-up scopes disables to
    // mounted rows). Anything orphaned OUTSIDE that set is a typo'd
    // id, a retired row, or a silent no-op — the S7a catch.
    const noOpWarnSet = profile === "melite-test" ? [] : ["infer-card-view", "infer-gallery", "ray-card-deck"];
    const orphaned = [...disabledIds].filter((id) => !insertIds.has(id) && !noOpWarnSet.includes(id)).sort();
    assert.deepEqual(orphaned, [],
      `every disabled id is a mounted row or a pinned no-op (orphaned disables in ${profile}: ${orphaned.join(", ")})`);
    // S7a landing pin — the AUDIT's law, not upstream's internals:
    // the base bundle carries its own optional-entry disables
    // (agent-instructions, tool-*, …) that legitimately land; those
    // belong to DSH, and pinning them here would make every upstream
    // bump redden this wall. What THIS repo owns is the web-plane
    // join: melite-test mounts its web rows live (none disabled),
    // and headless/estate land exactly ONE web-row disable — the
    // tools door the server planes bundle direct — leaving the
    // pinned three-row no-op warn set (render-vs-boot.md:285-289).
    const webRows = binWebRows();
    const webLanding = [...disabledIds].filter((id) => webRows.includes(id) && insertIds.has(id)).sort();
    const expectedWebLanding = profile === "melite-test" ? [] : ["melite-tools-doors"];
    assert.deepEqual(webLanding, expectedWebLanding,
      `the web-row disables that land in ${profile} (got ${webLanding.join(", ")})`);
    if (profile !== "melite-test") {
      const noOps = [...disabledIds].filter((id) => !insertIds.has(id)).sort();
      assert.deepEqual(noOps, noOpWarnSet,
        `the exact no-op warn set in ${profile} (got ${noOps.join(", ")})`);
    }
    // S8 (web mount only — the profile whose rows decide webRows):
    // every mounted row whose package injects the web surface is in
    // the bin's webRows list. The inject declaration lives in each
    // row package's src (the row name's subpath names the file).
    if (profile === "melite-test") {
      const webInjected: string[] = [];
      for (const row of insertRows) {
        const dep = Object.entries(deps).find(([n]) => row.name === n || row.name.startsWith(`${n}/`));
        if (dep === undefined) continue;
        const spec = String(dep[1] ?? "");
        if (!spec.startsWith("link:")) continue;
        const sub = row.name.slice(dep[0].length + 1);
        const srcFile = sub === ""
          ? join(spec.slice("link:".length), "src", "index.ts")
          : join(spec.slice("link:".length), "src", `${sub}.ts`);
        let src: string;
        try {
          src = readFileSync(srcFile, "utf8");
        } catch {
          continue;
        }
        const m = src.match(/export const inject[^=]*=\s*\[([^\]]*)\]/);
        if (m !== null && m[1]!.includes("'webServer'")) webInjected.push(row.id);
      }
      const forgotten = [...new Set(webInjected)].filter((id) => !webRows.includes(id)).sort();
      // VACUITY GUARD (the closure gate's own lesson): the derivation
      // resolves row names to src files by convention — if that
      // convention drifts, webInjected parses empty and this arm
      // passes while proving nothing. The three known injectors
      // (tools-doors, card-deck, gallery) must ALL surface.
      assert.deepEqual([...new Set(webInjected)].sort(), ["infer-gallery", "melite-tools-doors", "ray-card-deck"],
        "the derived web-surface set parsed non-vacuously");
      assert.deepEqual(forgotten, [],
        `every mounted web-injecting row is in webRows (forgotten: ${forgotten.join(", ")})`);
    }
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

// BASE ⊇ SELF-REGISTERING WEB FACES (the H3 timeline-bar autopsy,
// 2026-10-10): the operator's H3 card rendered the generic fallback —
// no timeline bar — while the whole battery was green. The studio
// (@melite/video-h3-timeline) owns its row in its own bundle patch
// (h3-studio), and @melite/harness-provisioner's patch carries NO twin
// row for it — the comment there says why: "NO row here — the profile
// bundles it". Nothing bundled it. The package rode the profile as a
// link: DEP (the provisioner's own manifest declares it) with no row
// anywhere, so the browser graph never carried its client entry,
// `cards.stage.view` went unclaimed for `h3-timeline`, and the card fell
// back to the generic form. The seed ⊇ base wall above cannot see that
// direction: the e2e seed DID mount the studio, the live base did not
// (the seed-has-it-base-does-not drift, third occurrence). The invariant
// that was missing: a package whose ONLY door is its own bundle layer is
// mounted by the web base. No legal alternative exists — mounting it
// from a second patch is the twin-row crash law, so "owns a bundle
// patch" leaves exactly one correct mount.
test("the provisioner's web base mounts every self-registering web face (base ⊇ faces)", () => {
  const faces = selfRegisteringWebFaces();
  // VACUITY GUARD: the scan walks packages/ and reads the two manifest
  // fields — @melite/card-base (the ONE-ROW LAW package every card
  // externalizes) must surface, so a degraded walk fails HERE instead of
  // passing on an empty set.
  assert.ok(faces.includes("@melite/card-base"),
    `the face scan resolves the workspace manifests (got: ${faces.join(", ")})`);
  const base = binProfileBase("melite-test");
  const orphaned = faces.filter((face) => !base.includes(face)).sort();
  assert.deepEqual(orphaned, [],
    `every self-registering web face is mounted by the melite-test base (orphaned: ${orphaned.join(", ")})`);
});

// ── F5/F6 (provisioner audit, cured 2026-10-22) ─────────────────────
// F5: a rendered profile dir was an artifact with no memory — no
// stamp of who/what/when/flags laid it. Every render writes
// render-provenance.json; the arm below judges the stamp against
// the tree it rendered from (own package.json, own git HEAD).
// F6: the install ran with no timeout/catch and both callers
// ignored the `false` return. The failure arms run with hermetic
// doubles (a stub pnpm, an empty PATH, a pre-held lock) — no real
// pnpm is reached, so they run as plain tests outside the
// pnpm-health gate above.

gate("every render stamps render-provenance.json with the source and flags (F5)", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  const route = "opencode-go/muse-spark-1.3-contributor";
  render(home, "melite-test", "--estate-agent-route", route);
  const dir: string = join(home, "profiles", "melite-test");
  const prov = JSON.parse(readFileSync(join(dir, "render-provenance.json"), "utf8")) as {
    renderedAt?: unknown; renderer?: unknown;
    provisioner?: { name?: unknown; version?: unknown };
    source?: { root?: unknown; commit?: unknown; dirty?: unknown };
    profile?: unknown; bundles?: unknown;
    flags?: { estateAgentRoute?: unknown; estateStateRoot?: unknown; profileRows?: unknown };
  };
  assert.equal(prov.renderer, "infer-provision", "the stamp names its renderer");
  const manifest = JSON.parse(readFileSync(
    join(REPO, "packages", "harness", "provisioner", "package.json"), "utf8",
  )) as { name?: unknown; version?: unknown };
  assert.equal(prov.provisioner?.name, manifest.name, "the stamp names the provisioner package");
  assert.equal(prov.provisioner?.version, manifest.version, "the stamp pins the provisioner version");
  assert.equal(prov.profile, "melite-test", "the stamp names the rendered profile");
  assert.deepEqual(prov.bundles, binProfileBase("melite-test"), "the stamp rosters the mounted bundles");
  assert.equal(prov.source?.root, REPO, "the stamp roots at the rendering tree");
  const head: string = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  assert.match(String(prov.source?.commit ?? ""), /^[0-9a-f]{40}$/, "the stamp carries a full commit sha");
  assert.equal(prov.source?.commit, head, "the stamp commits to the tree it rendered from");
  assert.equal(typeof prov.source?.dirty, "boolean", "the stamp says dirty or clean, never maybe");
  assert.ok(!Number.isNaN(Date.parse(String(prov.renderedAt ?? ""))), "the stamp carries a parseable instant");
  assert.equal(prov.flags?.estateAgentRoute, route, "the shaping flags land verbatim");
  assert.equal(prov.flags?.estateStateRoot, null, "unnamed flags stamp null, never absent-vs-empty ambiguity");
  assert.equal(prov.flags?.profileRows, null, "unnamed flags stamp null, never absent-vs-empty ambiguity");
  // the render leaves no lock and no tmp behind (F6's hygiene half)
  assert.ok(!existsSync(join(dir, ".render.lock")), "the lock releases after the render");
  assert.deepEqual(
    readdirSync(dir).filter((f) => f.endsWith(".tmp")),
    [],
    "no atomic-write tmp survives the render",
  );
});

/** Runs the bin with a controlled env into a GIVEN home, expecting a
 *  LOUD failure; returns the stderr. (The home is caller-made so
 *  arms can pre-lay lock files inside it.) */
function runBinDiesAt(home: string, env: Record<string, string | undefined>, ...args: string[]): string {
  try {
    execFileSync(process.execPath, [BIN, ...args, "--dsh-home", home], {
      encoding: "utf8", cwd: REPO, timeout: 300_000, env,
    });
  } catch (err) {
    const e = err as { stderr?: unknown };
    assert.ok(typeof e.stderr === "string" && (e.stderr as string).includes("infer-provision:"),
      `the bin dies loud with its own name (got: ${String(e.stderr ?? "<none>").slice(0, 300)})`);
    return e.stderr as string;
  }
  assert.fail(`the render was expected to die loud (args: ${args.join(" ")}) — it exited 0`);
}

/** Runs the bin with a controlled env into a fresh home, expecting a LOUD failure. */
function runBinDies(env: Record<string, string | undefined>, ...args: string[]): { home: string; stderr: string } {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-f6-"));
  return { home, stderr: runBinDiesAt(home, env, ...args) };
}

test("a failed pnpm install dies loud naming the manual command (F6)", () => {
  // the hermetic double: a `pnpm` that fails fast. Reaching the
  // failure line proves the bin invoked the install (no vacuous
  // refusal) — and the render below proves render-before-install.
  const stubDir: string = mkdtempSync(join(tmpdir(), "provisioner-f6-pnpm-"));
  const stub = join(stubDir, "pnpm");
  writeFileSync(stub, "#!/bin/sh\nexit 1\n");
  chmodSync(stub, 0o755);
  const { home, stderr } = runBinDies(
    { ...process.env, PATH: stubDir }, "profile", "estate");
  const dir: string = join(home, "profiles", "estate");
  assert.ok(stderr.includes("pnpm install") && stderr.includes(dir),
    `the failure names the install and the profile dir (got: ${stderr.slice(0, 300)})`);
  assert.ok(stderr.includes(`(cd ${dir} && pnpm install)`),
    "the failure hands the exact manual command");
  assert.ok(existsSync(join(dir, "package.json")) && existsSync(join(dir, "render-provenance.json")),
    "the render landed BEFORE the install ran (render-then-install order)");
  assert.ok(!existsSync(join(dir, ".render.lock")), "the lock releases on the failure path too");
});

test("a missing pnpm dies loud instead of printing boot lines (F6)", () => {
  // the old shape printed a WARNING, then the boot lines, then exit
  // 0 — a lane that boots into bundle-resolution failure. The
  // `false` return is honored now: no boot lines, exit ≠ 0.
  const emptyBin: string = mkdtempSync(join(tmpdir(), "provisioner-f6-empty-"));
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-f6-home-"));
  const stderr: string = runBinDiesAt(home,
    { ...process.env, PATH: emptyBin, HOME: home }, "profile", "estate");
  assert.ok(stderr.includes("(cd ") && stderr.includes("pnpm install"),
    `the refusal hands the manual command (got: ${stderr.slice(0, 300)})`);
});

test("a held render lock refuses the second render (F6)", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-f6-"));
  const dir: string = join(home, "profiles", "headless");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".render.lock"), `${String(process.pid)}\n`);
  const stderr: string = runBinDiesAt(home, { ...process.env }, "profile", "headless");
  assert.ok(stderr.includes(".render.lock") && stderr.includes(String(process.pid)),
    `the refusal names the lock and the live holder (got: ${stderr.slice(0, 300)})`);
});

gate("a stale render lock is taken with a warning (F6)", () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-wall-"));
  const dir: string = join(home, "profiles", "headless");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".render.lock"), "999999999\n");
  const stdout: string = execFileSync(process.execPath,
    [BIN, "profile", "headless", "--dsh-home", home],
    { encoding: "utf8", cwd: REPO, timeout: 300_000 });
  assert.ok(stdout.includes("stale render lock"),
    `the take says so on stdout (got: ${stdout.slice(0, 300)})`);
  assert.ok(existsSync(join(dir, "render-provenance.json")), "the render proceeded after the stale take");
  assert.ok(!existsSync(join(dir, ".render.lock")), "the taken lock releases after");
});

test("the install carries a timeout and the writes go through temp+rename (F6, source oracle)", () => {
  // behavior arms above pin the loud side; the ceiling itself and
  // the atomic shape are structural — pinned against the bin's own
  // source (the E-M9 oracle law this file already follows).
  assert.match(BIN_SRC, /const INSTALL_TIMEOUT_MS = \d+/,
    "the install ceiling is a named constant, never a magic number");
  assert.ok(BIN_SRC.includes("timeout: INSTALL_TIMEOUT_MS"),
    "the pnpm install passes the ceiling to execSync");
  assert.ok(BIN_SRC.includes("writeFileAtomic") && BIN_SRC.includes("renameSync"),
    "rendered files go through temp+rename");
  assert.ok(BIN_SRC.includes("renderInstall") && BIN_SRC.includes("acquireLock"),
    "both commands share the locked render+install door");
});
