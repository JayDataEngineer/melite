import { describe, it, expect } from "vitest";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);

// THE TYPECHECK GATE — the whole estate under tsc, as a wall
// (2026-10-10, the live ReferenceError).
//
// THE INCIDENT: the lane died mid-run with
//   ReferenceError: assertWiringAtSubmit is not defined
// — the host CALLED a symbol whose import had never landed. Every
// test passed (each injects its own wall, so the defaulting branch
// at the call site never fired), and NO gate ever typechecked the
// engine package: the ship playbook compiled the five ./lib-entry
// packages and nothing else. The check tool said ok because the
// check composes nothing — a missing import is invisible to every
// behavioural door and trivially visible to the one tool nobody
// ran. The first tsc pass over that package found SIX defects,
// including this one; the first sweep over the whole estate found
// four more packages' worth.
//
// THE LAW: every package that declares a tsconfig.json typechecks,
// every run of the suite. Discovery is dynamic — a named package
// list is exactly the list that rots (the five-package COMPILED list
// in the ship playbook is how the other thirty-five went unheard).

const REPO = join(import.meta.dirname, "..", "..", "..", "..");



/** Packages whose sources are NOT TypeScript, so tsc has nothing to
 *  read: the provisioner ships .mjs bin scripts and a cordis patch
 *  manifest. Named here rather than left as a silent gap — a package
 *  that grows a .ts file must delete its name from this list. */
const NO_TYPESCRIPT_SOURCES: readonly string[] = [
  "packages/harness/provisioner",
];

/** Every package directory the tree declares — a directory under
 *  packages/ that carries a package.json (the same walk the net
 *  uses, minus the tsconfig filter). Comparing the two is the
 *  coverage law: a package added without a tsconfig would otherwise
 *  leave the typecheck net silently, and the old pinned COUNT could
 *  only be maintained by hand. */
function manifestDirs(): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number): void => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory() && depth < 2) walk(p, depth + 1);
      else if (e.isFile() && e.name === "package.json") out.push(dir);
    }
  };
  walk(join(REPO, "packages"), 0);
  return out.filter((d) => !NO_TYPESCRIPT_SOURCES.includes(d.replace(/\\/g, "/").replace(`${REPO}/`, "")));
}

function packageDirs(): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number): void => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory() && depth < 2) walk(p, depth + 1);
      else if (e.isFile() && e.name === "tsconfig.json") out.push(dir);
    }
  };
  walk(join(REPO, "packages"), 0);
  return out.filter((d) => existsSync(join(d, "package.json")));
}

/** One tsc run per package; resolves to "" when clean, else the
 * first lines of the error report. */
async function typecheck(dir: string): Promise<string> {
  const candidates = [
    join(REPO, "node_modules/.pnpm/typescript@5.7.3/node_modules/typescript/bin/tsc"),
    join(REPO, "node_modules/typescript/bin/tsc"),
  ];
  const tsc = candidates.find((c) => existsSync(c));
  if (tsc === undefined) throw new Error("typecheck gate: no tsc binary in the tree");
  try {
    await run("node", [tsc, "--noEmit", "-p", "tsconfig.json"], {
      cwd: dir,
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return "";
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return (err.stdout ?? err.stderr ?? err.message ?? "unknown tsc failure")
      .split("\n").filter((l) => l.trim() !== "").slice(0, 6).join("\n");
  }
}

/** A bounded parallel pool — the sweep stays a wall, not a nap. */
async function pool<T>(items: string[], worker: (item: string) => Promise<T>, width = 8): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(width, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try { results[i] = { status: "fulfilled", value: await worker(items[i]) }; }
      catch (e) { results[i] = { status: "rejected", reason: e }; }
    }
  });
  await Promise.all(lanes);
  return results;
}

// DELEGATION SEAM (cruft row 2, 2026-10-12): the tier cost ~116s of
// identical tsc work, and CI paid it FIVE times per PR — once per
// OS leg of the unit matrix and once inside the coverage job — on
// top of the ship playbook's direct step. When
// MELITE_TIER_DELEGATED=1 the wall skips and the owning surface
// runs the same implementation itself; in CI that owner is the
// `typecheck` job (tests.yml :52-66, no env), and the delegating
// seats are the unit (:33-34) and coverage (:94-95) jobs, which
// set the env. A plain local
// `pnpm run test` sets no env and keeps the wall — the suite stays
// self-sufficient where the tier has no other owner.
const DELEGATED = process.env.MELITE_TIER_DELEGATED === "1";

describe.skipIf(DELEGATED)("THE TYPECHECK GATE — every package, every run", () => {
  const dirs = packageDirs();

  it("the net reaches the estate (discovery is dynamic, not a named list)", () => {
    // DERIVED, NOT A PINNED COUNT (the flake audit, 2026-10-15): the
    // old exact number made every package addition an arithmetic
    // chore (the trailing comment carried an eight-entry edit log),
    // and the edit log is exactly what decays. The contract is
    // COVERAGE: every workspace member pnpm-workspace.yaml declares
    // is in the typecheck net, and the net carries nothing else. A
    // package added without a tsconfig fails here by construction;
    // one removed takes its row with it.
    expect(dirs.map((d) => d.replace(/\\/g, "/")).sort()).toEqual(
      manifestDirs().map((d) => d.replace(/\\/g, "/")).sort(),
    );
    // The incident's package is in the net BY NAME (the engine ran
    // from source, so no build step ever saw it).
    expect(dirs.map((d) => d.replace(/\\/g, "/")).some((d) => d.endsWith("engines/comfyui-cordis"))).toBe(true);
  });

  it("every NO_TYPESCRIPT_SOURCES package still ships no .ts (the exemption does not rot)", () => {
    // A8c: the JSDoc said a package growing a .ts "must delete its
    // name from this list" — nothing enforced it. The exemption is
    // only honest while the named trees genuinely carry no .ts; the
    // day one grows a source file, this arm refuses until the name
    // leaves the list (and the package joins the net above).
    const rotted: string[] = [];
    for (const rel of NO_TYPESCRIPT_SOURCES) {
      const dir = join(REPO, rel);
      const ts: string[] = [];
      const walk = (d: string): void => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          if (e.name === "node_modules" || e.name.startsWith(".")) continue;
          const p = join(d, e.name);
          if (e.isDirectory()) walk(p);
          else if (/\.(ts|tsx|mts|cts)$/.test(e.name)) ts.push(p.slice(dir.length + 1));
        }
      }
      walk(dir);
      if (ts.length > 0) rotted.push(`${rel}: grew ${ts.join(", ")} — delete it from NO_TYPESCRIPT_SOURCES so tsc sees it`);
    }
    expect(rotted, "packages exempt from tsc that now carry TypeScript").toEqual([]);
  });

  it("every package with a tsconfig typechecks clean", async () => {
    const settled = await pool(dirs, typecheck);
    const failures: string[] = [];
    for (let i = 0; i < dirs.length; i++) {
      const r = settled[i];
      if (r === undefined) continue;
      if (r.status === "rejected") {
        failures.push(`${dirs[i]} — gate error: ${String(r.reason)}`);
      } else if (r.value !== "") {
        failures.push(`${dirs[i]}\n${r.value}`);
      }
    }
    expect(failures, failures.join("\n\n")).toEqual([]);
  }, 240_000);

  it("the ship playbook typechecks what it does not compile (no five-package list)", () => {
    const script = readFileSync(join(REPO, "scripts", "ship-lane.sh"), "utf8");
    // The playbook must DISCOVER packages, not name five. The old
    // COMPILED list is fine for ./lib building; a typecheck that
    // only visits those is the hole the ReferenceError walked
    // through. THE SUBSTANCE (li-aq.3, the design audit's L6 — a
    // vocabulary match is not a net): the loop must actually RUN
    // tsc --noEmit per discovered tsconfig and REFUSE the ship on
    // red (an exit-1 that never fires is a check that says ok).
    expect(script).toMatch(/find .*tsconfig\.json.*-printf '%h\\n'/s);
    expect(script).toMatch(/\$TSC.*--noEmit.*-p tsconfig\.json/s);
    expect(script).toMatch(/TCFAIL=1/s);
    expect(script).toMatch(/TCFAIL.*-ne 0[\s\S]*?exit 1/s);
  });

  it("F-M5: the discovery command EXECUTES (a fixture tree proves the find's own law)", () => {
    // The arms above are substring regexes — the claim is
    // behavioural: the pipeline DISCOVERS tsconfig dirs while
    // skipping node_modules. The SHIPPED command is extracted from
    // the script text (never retyped here — one derivation) and run
    // against a fixture tree containing every trap: a real package,
    // a NESTED package, a tsconfig inside node_modules (must be
    // skipped), and a dot-dir (skipped by the repo walk's own law
    // only if the command says so — here we pin the command's raw
    // behaviour and the ship loop's `*/packages/*` guard).
    const script = readFileSync(join(REPO, "scripts", "ship-lane.sh"), "utf8");
    const m = script.match(/find "[^"]*" -name tsconfig[.]json -not -path '[*][/]node_modules[/][*]' -printf '%h.n'/);
    expect(m, "the shipped find command is extractable (one derivation — a retype here would drift)").not.toBeNull();
    const fixture = mkdtempSync(join(tmpdir(), "tc-gate-fixture-"));
    const mk = (rel: string): string => {
      mkdirSync(join(fixture, rel), { recursive: true });
      writeFileSync(join(fixture, rel, "tsconfig.json"), "{}\n");
      return rel;
    };
    const real = mk("packages/alpha");
    const nested = mk("packages/group/beta");
    mk("packages/alpha/node_modules/trap"); // must NOT be discovered
    writeFileSync(join(fixture, "tsconfig.json"), "{}\n"); // outside packages/ — not discovered
    const cmd = m![0].replace('find "$REPO/packages"', `find "${fixture}/packages"`);
    const out = execFileSync("/usr/bin/env", ["bash", "-c", cmd], { encoding: "utf8" });
    const found = out.trim().split("\n").filter(Boolean)
      .map((l) => l.replace(`${fixture}/`, "")).sort();
    expect(found).toEqual([real, nested].sort());
  });

  it("THE TEST TIER rides both gates (spec files are a plane — one implementation, two callers)", () => {
    // li-aq.3, the rules audit's HIGH-2: package tsconfigs include
    // src/** only, so SPEC files were typed by nothing — a spec
    // importing a name a module never exported (TS2724, live in 22
    // card-view files) was invisible to every wall. The judge lives
    // in scripts/typecheck-tests.mjs (discovery + per-package
    // synthesized config via tsc --showConfig + noEmit); the wall
    // asserts the CALLER SUBSTANCE, and the tier's own green is the
    // next test.
    const script = readFileSync(join(REPO, "scripts", "typecheck-tests.mjs"), "utf8");
    expect(script).toMatch(/--showConfig/);
    expect(script).toMatch(/noEmit/);
    expect(script).toMatch(/rootDir/); // the flatten's one deletion
    const ship = readFileSync(join(REPO, "scripts", "ship-lane.sh"), "utf8");
    expect(ship).toMatch(/typecheck-tests\.mjs[\s\S]*?exit 1/s);
    // F-L4 (the wall audit, 2026-09-28): the last line read THIS
    // FILE and matched its own text — a wall grepping itself proves
    // nothing (delete the runner call and the assertion still
    // passed on the comment). Dropped: the arm BELOW runs the
    // script for real, which is the only proof that exists.
  });

  it("the test tier typechecks clean (the TS2724 class dies at the wall)", async () => {
    try {
      // TC_POOL=3 (li-aq.3): the tier is the heaviest thing the suite
      // runs, and at the script's default 8 parallel tsc processes it
      // STARVED the fleet sharing the run — the dom tier's WebGL
      // contexts failed to create and the real-binary media tests
      // blew their timeouts (15 failures, every one of them passing in
      // isolation). A wall that destabilises the suite is not a wall.
      // Three lanes judge the same 85 packages; the ship runs the
      // script at full width when nothing else is competing.
      await run("node", [join(REPO, "scripts", "typecheck-tests.mjs")], {
        cwd: REPO,
        timeout: 900_000,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, TC_POOL: "3" },
      });
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      const report = err.stdout ?? err.stderr ?? err.message ?? "unknown";
      // only the failing lines matter for the wall's voice
      throw new Error("the test tier is red (spec files must typecheck):\n" +
        report.split("\n").filter((l) => l.startsWith("✗")).slice(0, 10).join("\n"));
    }
  }, 960_000);
});
