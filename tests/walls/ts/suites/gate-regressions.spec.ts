import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execSync, execFileSync } from "node:child_process";

// GATE REGRESSIONS — one pin per WEDGE this estate has actually been
// wedged on (2026-10-10, the operator's law: "make sure we are
// making regression tests, we don't want to be wedged here again").
//
// Every wall here guards a gate SHAPE, not a behaviour: the incident
// class is always the same — a wall existed on paper, judged
// nothing, and the wedge surfaced days later as a phantom red or a
// silent pass. Textual pins are the honest tool for gate shape: the
// config IS the gate, and a regression is a config edit.

const REPO = join(import.meta.dirname, "..", "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO, path), "utf8");
}

describe("THE HOOK THAT CRIED RED (the SIGPIPE wedge)", () => {
  it("the walls job redirects to a file and propagates vitest's exit code", () => {
    // THE WEDGE: three commits bounced on a phantom red — the full
    // fleet's ~128s of output through lefthook's capture pipe
    // SIGPIPE'd node AFTER a fully-green summary (6037 passed, ✗
    // anyway), while the same command bare exited 0. The cure: the
    // fleet writes to a file; the verdict rides the last lines and
    // vitest's own exit code. A future edit back to bare piping is
    // exactly the edit this pin exists to catch.
    const yml = read("lefthook.yml");
    const walls = yml.split("- name: walls (staged anything)")[1]?.split("- name:")[0] ?? "";
    expect(walls, "the walls job still exists in lefthook.yml").toContain(
      "node node_modules/vitest/vitest.mjs run --project node",
    );
    expect(walls, "the fleet must write to a file, never a closing pipe").toMatch(
      // /var/tmp, not /tmp: this box's /tmp janitor killed the log
      // between redirect and tail twice (2026-10-12); the repo-local
      // .scratch is the one tree the janitor provably never touches.
      // PER-RUN (2026-10-13): the path carries the PID because two
      // hook runs used to share one file — the loser's `>` truncate
      // made it tail the winner's verdict.
      /> \.scratch\/hook-walls\.\$\$\.log 2>&1/,
    );
    expect(walls, "the hook's temp tree rides the janitor-free /var/tmp, PER RUN").toMatch(
      /mktemp -d \/var\/tmp\/melite-hook-XXXXXX/,
    );
    // and the run's own tree goes with the run — a fixed dir let two
    // hook runs sweep each other's LIVE trees through the tmp
    // sweeper's 1s mtime fence
    expect(walls, "the run's temp tree is removed when the hook ends").toMatch(/rm -rf "\$d"/);
    expect(walls, "vitest's exit code must reach lefthook verbatim").toContain(
      "exit $code",
    );
  });
});

describe("THE FRESH-CLONE HOOK (GT-01/GT-02, the round-5 gate audit)", () => {
  // GT-02: the walls run redirects into .scratch/, which a fresh
  // clone does not have — the redirect fails before vitest starts,
  // and the hook refused having judged nothing. The cure is mkdir -p
  // ahead of the redirect; this arm pins the ORDER, because the mkdir
  // landing anywhere after the redirect is the same dead hook.
  // GT-01: the run line must also keep its two mechanisms — no
  // `glob:` narrowing (a glob on the staged set lets the walls skip
  // most commits) and the log-keep branch (a red run keeps its log
  // for the name).
  const yml = read("lefthook.yml");
  const walls = yml.split("- name: walls (staged anything)")[1]?.split("- name:")[0] ?? "";
  const runLine = walls.split("run: ")[1] ?? "";

  it("the .scratch dir is created before the walls log redirects into it", () => {
    expect(runLine, "the walls run line exists").toContain("vitest.mjs run");
    const mkdirAt = runLine.indexOf("mkdir -p .scratch");
    const redirectAt = runLine.indexOf("> .scratch/");
    expect(mkdirAt, "the run creates .scratch").toBeGreaterThan(-1);
    expect(redirectAt, "the run redirects into .scratch").toBeGreaterThan(-1);
    expect(mkdirAt, "mkdir precedes the redirect (after it, the hook judges nothing on a fresh clone)")
      .toBeLessThan(redirectAt);
  });

  it("the walls job stages the whole tree (no glob:) and keeps the log on red", () => {
    // GT-01: a `glob:` key on the job narrows lefthook's file set —
    // most commits would skip the walls entirely while the job name
    // still reads green in the hook's summary.
    expect(walls, "no glob: may narrow the walls job's staged set").not.toMatch(/^\s*glob:/m);
    // the log-keep branch: a red run's evidence survives
    expect(runLine, "a red run keeps its log").toContain("if [ $code -ne 0 ]");
    expect(runLine, "the kept log is renamed for the name").toContain("mv .scratch/hook-walls.$$.log");
  });
});

describe("THE REPO TIER (tools/ + tests/ typed by nothing)", () => {
  it("the tier script names the repo config and runs it as an arm", () => {
    // THE WEDGE: tools/ and the repo-level tests/ (harness, helpers,
    // e2e) were typed by NOTHING until li-aq.5; its first sweep
    // found six live defects. If the arm is deleted from the script,
    // the plane goes dark again — silently, because the package loop
    // never covered it.
    // C-M9 (the wall audit, 2026-09-28): the second pin
    // (`/repo tier/`) matched the CONSOLE STRINGS — delete the
    // spawnSync that runs the repo tier, keep the two log lines, and
    // the arm still passed with the plane dark. The arm is now
    // pinned by its FUNCTIONAL call shape: the repo tier's tsc runs
    // through an awaited tsc call whose argv names the tracked
    // config, and its failure branch increments the failure tally
    // (the script exits non-zero on a red tier). The call went
    // async with the pool fix (0141a7ea) — spawnSync became
    // execFileP; the pin follows the call shape, not the spelling.
    const script = read("scripts/typecheck-tests.mjs");
    const call = script.match(
      /execFileP\(\s*process\.execPath\s*,\s*\[tsc\s*,\s*"--noEmit"\s*,\s*"-p"\s*,\s*"tsconfig\.repotier\.json"\]/,
    );
    expect(call, "the repo tier runs through the awaited tsc call naming tsconfig.repotier.json").not.toBeNull();
    // and the failure branch of THAT call feeds the exit tally (a
    // run whose result is ignored would report green while dark)
    const after = script.slice((call?.index ?? 0) + (call?.[0].length ?? 0), (call?.index ?? 0) + 700);
    expect(after).toMatch(/failed\+\+|status\s*!==?\s*0|status\s*===\s*0/);
    // the console line survives as the operator's receipt
    expect(script).toMatch(/repo tier/);
  });

  it("the tracked config exists and covers tools/, tests/*.ts, tests/e2e", () => {
    const cfgPath = join(REPO, "tsconfig.repotier.json");
    expect(existsSync(cfgPath), "tsconfig.repotier.json must stay tracked at the root").toBe(true);
    const cfg = read("tsconfig.repotier.json");
    expect(cfg).toContain('"tools/**/*.ts"');
    expect(cfg).toContain('"tests/*.ts"');
    expect(cfg).toContain('"tests/e2e/**/*.ts"');
  });
});

describe("THE SHIP'S GATE ORDER (build before typecheck, --no-build skipping gates)", () => {
  const ship = read("scripts/ship-lane.sh");

  it("the typecheck net runs BEFORE the build guard, on every ship", () => {
    // THE WEDGE: the builds ran first (a red build still emitted —
    // no noEmitOnError), and --no-build skipped EVERY gate. The
    // order is the gate: the net's say must precede the DO_BUILD
    // conditional, and the build loop must live inside it.
    const netAt = ship.indexOf('say "TYPECHECK every package');
    const guardAt = ship.indexOf('if [ "$DO_BUILD" -eq 1 ]; then');
    expect(netAt).toBeGreaterThan(-1);
    expect(guardAt).toBeGreaterThan(-1);
    expect(netAt, "the net must judge the tree before any emit").toBeLessThan(guardAt);
    const buildSay = ship.indexOf('say "BUILD the compiled-lib packages');
    expect(buildSay).toBeGreaterThan(guardAt);
  });

  it("--no-build keeps the gates (the tier arm rides outside the guard too)", () => {
    const tierAt = ship.indexOf("TYPECHECK the test tier + the repo tier");
    expect(tierAt).toBeGreaterThan(-1);
    expect(tierAt, "a restart-only ship must still typecheck the tiers").toBeLessThan(
      ship.indexOf('if [ "$DO_BUILD" -eq 1 ]; then'),
    );
  });

  it("the ship's refusals are BEHAVIOURAL (a bogus --unit exits 2, prints FAIL, refuses before any gate)", () => {
    // THE M9 KILL: this arm judged the playbook by substring — four
    // regexes over ship-lane.sh's text — while the script's own
    // refusal path had never been executed by anything but the
    // operator. The first behavioural probe caught a live bug every
    // regex blessed: the --unit refusal called bad() before bash had
    // defined it, so the console said "bad: command not found" where
    // the FAIL line belonged. Behaviour is the receipt now.
    const syntax = spawnSync("bash", ["-n", join(REPO, "scripts/ship-lane.sh")]);
    expect(syntax.status, "ship-lane.sh must stay syntactically whole").toBe(0);
    const res = spawnSync(
      "bash",
      [join(REPO, "scripts/ship-lane.sh"), "--unit", "bogus.service"],
      { encoding: "utf8", timeout: 15000 },
    );
    expect(res.status, "an unsanctioned --unit must refuse (exit 2)").toBe(2);
    const out = res.stdout + res.stderr;
    expect(out).toMatch(/FAIL/);
    expect(out).toMatch(/sanctioned lane/);
    expect(out, "the refusal is EARLY — no gate section may run first").not.toMatch(/== /);
  });

  it("every compiled package carries noEmitOnError (a red build must not emit)", () => {
    // THE WEDGE: without noEmitOnError the build's failure exit came
    // AFTER the stale lib was already on disk — the ship failed and
    // the damage shipped anyway on the next restart.
    // THE ROSTER IS DERIVED (2026-10-13, the ship audit): the ship
    // script no longer hand-lists COMPILED — a package is compiled iff
    // the host imports it from lib/, decided by its own manifest. This
    // wall asks the SAME question the way the ship does, by running
    // the ship script's own derivation, so a new compiled package is
    // judged the moment it joins the set.
    const derived = execFileSync("bash", ["-c", 'cd "' + REPO + '" && source <(sed -n "/^derive_compiled()/,/^COMPILED=/p" scripts/ship-lane.sh); printf "%s " "${COMPILED[@]}"'], { encoding: "utf8" });
    const pkgs = derived.trim().split(/\s+/).filter(Boolean);
    // The estate's compiled half must never empty out: a derivation
    // that silently returns nothing would ship a host with no lib.
    for (const p of pkgs) {
      // DUAL-FACE F4 (2026-10-17): a solution-only root ("files": [],
      // references only) carries no program — its emit face is
      // tsconfig.build.json, so THAT is where noEmitOnError must ride.
      // A single-face package keeps pinning it at the root.
      const root = read(`${p}/tsconfig.json`);
      const face = /"files"\s*:\s*\[\s*\]/u.test(root) ? `${p}/tsconfig.build.json` : `${p}/tsconfig.json`;
      expect(read(face), `${face} must pin "noEmitOnError": true (the emit face)`).toContain('"noEmitOnError": true');
    }
  });
});

describe("THE PRE-PUSH BATTERY'S FLEET (round-6, 2026-10-13)", () => {
  it("the battery runs every vitest project, never a narrowed one", () => {
    // The pre-commit job runs `--project node` for speed, so the dom
    // / dom18 / deck projects had no local owner; the CI unit job
    // that runs them fires on main/master only. The battery is the
    // last local gate before a push and must run the whole fleet.
    const battery = read("tools/hook-full-battery.mjs");
    const spawn = battery.match(/spawnSync\(vitest,\s*\[([^\]]*)\]/);
    expect(spawn, "the battery spawns vitest").not.toBeNull();
    expect(spawn![1], "the battery's vitest argv names no --project (a narrowed fleet hides the dom/deck seats)")
      .not.toContain("--project");
  });
});

describe("THE COVERAGE RATCHET'S OWN EXCLUSIONS (GT-08, the round-5 gate audit)", () => {
  it("every coverage-exclude literal names a real file", () => {
    // An exclude row pointing at a deleted file excludes nothing —
    // it keeps a dead exemption's name alive after the exemption
    // died, and the ratchet cannot shrink a row that is not real.
    const cfg = read("vitest.config.ts");
    const covAt = cfg.indexOf("coverage: {");
    expect(covAt, "the coverage block exists").toBeGreaterThan(-1);
    const open = cfg.indexOf("exclude: [", covAt);
    expect(open, "the coverage exclude block exists").toBeGreaterThan(-1);
    const block = cfg.slice(open, cfg.indexOf("]", open));
    const literals = [...block.matchAll(/'(packages\/[^']+)'/g)]
      .map((m) => m[1]!)
      .filter((p) => !p.includes("*")); // glob rows name classes, not files
    expect(literals.length, "the exclude block carries package-path literals — the parse is armed").toBeGreaterThan(5);
    const ghosts = literals.filter((p) => !existsSync(join(REPO, p)));
    expect(ghosts, `coverage excludes naming deleted files: ${ghosts.join(", ")}`).toEqual([]);
  });
});

describe("THE DANGLING STORE PATH (round-6, 2026-10-13)", () => {
  it("no tracked file pins a pnpm store path by exact version", () => {
    // node_modules/.pnpm/<pkg>@<x.y.z>/ is a LOCKFILE artifact: the
    // next bump leaves the literal dangling and whatever named it
    // dies at load or ENOENT. The class hit React (the web lane's
    // hardcoded react@19.2.8 went red when the store moved to
    // 19.3.0) and typescript (the repo tier's compiler pin). Both
    // now derive their paths; this arm keeps a third instance out.
    const offenders: string[] = [];
    const files = execFileSync("git", ["ls-files"], { cwd: REPO, encoding: "utf8" })
      .split("\n")
      .filter((f) => /\.(ts|tsx|mjs|js|json|sh|yml)$/u.test(f));
    for (const f of files) {
      const text = readFileSync(join(REPO, f), "utf8");
      const hits = text.match(/node_modules\/\.pnpm\/[A-Za-z@/_-]+@\d+\.\d+\.\d+/gu);
      if (hits !== null) offenders.push(`${f}: ${hits[0]}`);
    }
    expect(offenders, `tracked files pinning a pnpm store version path: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("the compiler has one derivation, and both repo-tier seats use it", () => {
    expect(existsSync(join(REPO, "tools", "tsc-path.mjs")), "tools/tsc-path.mjs exists").toBe(true);
    const helper = read("tools/tsc-path.mjs");
    expect(helper, "the helper follows the workspace's own resolution").toContain("workspaceTally");
    for (const seat of ["scripts/typecheck-tests.mjs", "scripts/ship-lane.sh"]) {
      expect(read(seat), `${seat} resolves the compiler through the helper`).toContain("tsc-path.mjs");
    }
  });
});

describe("THE LAX TRIPLE (strict:false anywhere)", () => {
  it("no package tsconfig turns strict (or its halves) off", () => {
    // THE WEDGE: card-view was the estate's only strict:false +
    // strictNullChecks:false + noImplicitAny:false triple — 8 src
    // defects and 19 spec ones lived under it, invisible. The pin:
    // the triple may never return, in any package, under any name.
    const offenders: string[] = [];
    const walk = (dir: string, depth: number): void => {
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return }
      for (const e of entries) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        if (e.isDirectory() && depth < 2) walk(p, depth + 1);
        if (e.name === "tsconfig.json" && e.isFile()) {
          const body = readFileSync(p, "utf8");
          if (/"strict":\s*false/.test(body) ||
              /"strictNullChecks":\s*false/.test(body) ||
              /"noImplicitAny":\s*false/.test(body)) {
            offenders.push(p.replace(REPO + "/", ""));
          }
        }
      }
    };
    walk(join(REPO, "packages"), 0);
    expect(offenders, `lax tsconfigs: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("THE DRIFT FLOOR (>= 85 let packages go dark)", () => {
  it("the discovery pin is exact — no floor form remains, and the number is LIVE", () => {
    // THE WEDGE: expect(count).toBeGreaterThanOrEqual(85) let the
    // count drift silently down to 85 while packages went dark, and
    // never heard a new package at all. The exact pin's own
    // regression is the floor FORM creeping back into the spec.
    // C-C5 (the wall audit, 2026-09-28): the ban only matched 80s —
    // a `>= 70` or `>= 120` floor walked past — and the meta-pin
    // HARDCODED 88, so the two literals could drift apart silently.
    // The ban is total now (ANY numeric floor on the count), and the
    // expected number is DERIVED by the same walk the gate itself
    // runs: adding a package without touching the gate's literal
    // fails HERE, with the arithmetic spelled out.
    const gate = read("tests/walls/ts/suites/typecheck-gate.spec.ts");
    expect(gate, "no numeric floor may replace the exact pin (any decade)").not.toMatch(/toBeGreaterThanOrEqual\(\d+\)/);
    // The pin became a DERIVED EQUALITY (the flake audit, 2026-10-15):
    // the gate compares the discovered net against every package
    // directory in the tree, so a package added without a tsconfig
    // fails by construction and nothing needs hand-editing. What must
    // not come back is a COUNT: any `toBe(<number>)` on the census
    // would reintroduce the arithmetic chore this wall policed.
    expect(gate, "the census is derived — a pinned count must not return").not.toMatch(/toBe\(\d+\)/);
    // derive the live count exactly as the gate does
    const live: string[] = [];
    const walk = (dir: string, depth: number): void => {
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return }
      for (const e of entries) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        if (e.isDirectory() && depth < 2) walk(p, depth + 1);
        else if (e.isFile() && e.name === "tsconfig.json") live.push(dir);
      }
    };
    walk(join(REPO, "packages"), 0);
    expect(live.length, "census floor: the walk sees the estate (the derivation rotted)").toBeGreaterThan(10);
    // the gate must compare that SAME walk against the package set —
    // the equality is the pin now, and it is derived from the tree
    expect(gate, "the gate derives its census from the package tree").toMatch(/manifestDirs/);
  });
});

describe("THE STALE-LIB SHIP (a green ship must prove the lane runs THIS tree)", () => {
  // THE WEDGE (the lane audit's P0-3, 2026-10-10): the ship's only
  // content receipt greped a marker string inside the built lib —
  // a string that predates the fixes of the day — so a --no-build
  // ship passed every gate and probe while the lane kept running
  // the old code (the assertWiringAtSubmit era). The receipt is a
  // CONTENT STAMP now: src hashed at build time, re-verified on
  // every ship, --no-build included.
  const ship = read("scripts/ship-lane.sh");

  it("writes the src stamp in BOTH build loops", () => {
    expect(ship).toMatch(/write_stamp "\$p"\n\s+ok "\$p"/);
    expect(ship).toMatch(/write_stamp "\$p"\n\s+ok "\$p client bundle"/);
  });

  it("verifies the stamps OUTSIDE the DO_BUILD guard (--no-build keeps the gate)", () => {
    // the verify call must sit AFTER the build section's last line —
    // outside the `if DO_BUILD` block, so --no-build runs it too
    const buildEnd = ship.indexOf("no client bundle carries a removed face");
    const verifyAt = ship.indexOf("verify_stamps || exit 1");
    expect(buildEnd).toBeGreaterThan(-1);
    expect(verifyAt).toBeGreaterThan(buildEnd);
  });

  it("a stamp mismatch REFUSES with the cure (re-run without --no-build)", () => {
    expect(ship).toMatch(/is STALE .*re-run WITHOUT --no-build/);
  });

  it("THE STALE-FACE VOCABULARY IS DERIVED FROM THE WALLS' HELPER and judges EVERY client bundle (the li-ba stroke)", () => {
    // F3 (the deferred findings): the gate grepped ONE literal
    // ("STALE TAB") on ONE bundle while the walls' helper spells the
    // full five-pattern ban — four faces could ride any other
    // bundle green, and a sixth pattern added to the helper would
    // never reach the gate. The extraction, the census floor, and
    // the all-bundles loop are all pinned now, and the extraction is
    // EXECUTED here against the live helper so a helper shape the
    // sed cannot parse reds in the suite, not silently at ship time.
    expect(ship).toContain("sed -n 's#^  /\\(.*\\)/i\\?,$#\\1#p'");
    expect(ship).toContain("tests/walls/helpers/stale-tab-vocabulary.ts");
    expect(ship).toContain("tr -cd '|' | wc -c");
    expect(ship).toContain('if [ "$(printf \'%s\' "$STALE_RE" | tr -cd \'|\' | wc -c)" -lt 4 ]');
    expect(ship).toContain('for p in "${CLIENT_BUNDLES[@]}"; do');
    expect(ship).toContain('if grep -Eiq "$STALE_RE"');
    // the derivation is REAL: run the gate's own extraction and
    // compare against the helper's declared bodies
    const helper = read("tests/walls/helpers/stale-tab-vocabulary.ts");
    const declared = [...helper.matchAll(/^  \/(.+)\/i?,\s*$/gm)].map((m) => m[1]);
    expect(declared.length, "the helper still declares the five faces").toBeGreaterThanOrEqual(5);
    const extracted = execSync(
      "sed -n 's#^  /\\(.*\\)/i\\?,$#\\1#p' tests/walls/helpers/stale-tab-vocabulary.ts | paste -sd'|' -",
      { cwd: REPO, encoding: "utf8" },
    ).trim();
    expect(extracted).toBe(declared.join("|"));
  });

  it("the studio lane refuses a host log that carries a module-resolution failure", () => {
    // The stale-lib wedge again, at the DOOR: the lane booted green
    // while the host silently skipped a capability behind a
    // "Cannot find module" line. Playwright's verdict alone cannot
    // see the host's own log; the lane greps it and refuses.
    const lane = read("scripts/e2e-studio-lane.sh");
    expect(lane, "the lane owns the studio host door").toContain("e2e-studio-lane.sh");
    expect(lane, "the host-log verdict greps the failure class").toContain('grep -q "Cannot find module"');
  });

  it("the studio lane refuses a host whose boot carried activation failures", () => {
    // The 3-entry boot: dsh-app-boot warns "N entries did not
    // activate" for OPTIONAL entries and still serves. The lane run
    // that taught this burned 1.1h starving thirteen specs on a
    // half-dead host (the dead estate/tools entries emptied the
    // catalog API). A boot diagnostic is never benign here either.
    const lane = read("scripts/e2e-studio-lane.sh");
    expect(lane, "the boot verdict greps the activation-failure class").toContain('grep -q "did not activate"');
    expect(lane, "the refusal names the dead entries, not just the count").toContain('grep -nE "did not activate|failed to import"');
  });
});

describe("THE COMMITTED LIB (an emitted import Node can actually resolve)", () => {
  // The studio lane's host booted and silently logged "card-plane
  // cross-validation skipped: Cannot find module …/lib/mods/packs.ts"
  // (2026-10-13): src/cardDefs.ts dynamic-imports './mods/packs.ts',
  // the committed lib was stale, and the emitted JS still carried the
  // .ts specifier — unresolvable under plain Node. GT-06's untracked
  // sweep judges only ADDED lib files; staleness that breaks runtime
  // imports had no judge. Two signatures, both machine-checked here:
  // a relative .ts specifier in emitted JS (the rewrite flag's
  // failure), and any relative specifier whose target file is absent.
  // Every tracked lib .js file, from git — any lib/ segment at any
  // depth, INCLUDING lib-root files. (2026-10-27) the derivation
  // rode a pathspec glob whose double-star segment never matches a
  // lib-ROOT file: lib/client.js, lib/index.js and every root
  // artifact escaped the census, the .ts-specifier arm and the
  // dangling-import arm below — the pin was self-consistent on a
  // 167-file subset of the true 578.
  const libFiles = execFileSync("git", ["ls-files"], { cwd: REPO, encoding: "utf8" })
    .split("\n")
    .filter((f) => /(^|\/)lib\/.*\.js$/.test(f));
  // THE CENSUS PIN (2026-10-12: the floor below was lowerable
  // silently — 165→100 greens while a wholesale deletion walks
  // through). The literal EQUALS the derived count (measured at
  // load on the settled tree — tracked files are index reads, so
  // the derivation is deterministic per tree state): a deletion
  // reds (derived < literal), lowering the literal below derived
  // reds, and a conscious addition forces the literal up. History:
  // 166 (2026-10-18 client consolidation) → 165 (THE QWEN FOLD,
  // 2026-10-26) → 152 (mid-reshape transient: the sweep's staged
  // package deletions minus 14 melite-tools tool libs the transient
  // index briefly dropped) → 166 (repinned 2026-10-12 on the settled
  // tree: the sweep's 13 package libs are gone AND the melite-tools
  // libs stand — b06f0ec6e "lib rebuild in step with src"; the
  // transient window's 152 was an index artifact, not a tree truth.
  // Recount at load, repin deliberately).
  // 166 → 167 (repinned 2026-10-27: the literal was mispinned at the
  // repin — the derived file list is byte-identical between the repin
  // commit 90bd40f33 and HEAD (diff of both sorted lists: empty), so
  // no lib was added or removed; the count never was 166. Verified
  // by derivation, not by bump-to-green.)
  // 167 → 578 (repinned 2026-10-27, same day: the derivation itself
  // was the hole — the pathspec never matched lib-ROOT files, so the
  // pin rode a 167-file subset while root artifacts walked past the
  // census, the .ts-specifier arm, and the dangling-import arm. The
  // derivation now filters `git ls-files` for any lib/ segment; 578
  // is the TRUE census recounted on the settled tree. Repin
  // deliberately, never bump-to-green.)
  // 578 → 574 (repinned 2026-11-02: the 2026-11-01 gate-honesty
  // audit measured 572 — the six retired-UI libs named there
  // (3d/ui railTabs, audio/ui viewers ×3, video/ui viewers ×2)
  // verified STILL absent from index and disk — then the tree grew
  // two genuine faces, both machine-mapped to src: the plane-canon
  // seat (@melite/contracts/lib/planes.js ← planes.ts, the L1–L4
  // refusal home) and one net surface addition from inter-session
  // package growth. All 574 indexed lib .js map to a real face
  // (src face, scripts face incl. the provision scripts' load-
  // bearing lib/src closure, mods face, generated face, typert
  // published files, tsdown client bundles, in-place UI viewer
  // faces) — derivation verified file-by-file, zero orphans.
  // Exact toBe(574) fires BOTH directions as before.)
  // 574 → 578 (repinned 2026-11-05: the copy-census campaign added
  // four locale-dictionary sources, each emitting one tracked lib
  // face — mask-studio paintCopy.js, card-base locales/chromeCopy.js,
  // card-deck assetsCopy.js, card-view chromeCopy.js — all four
  // machine-mapped to their src dicts, zero orphans.)
  const LIB_CENSUS_PIN = 578;
  const specRe = /(?:from\s*|import\(\s*)(["'])(\.[^"']*)\1/g;

  it("the census is exact (a deletion OR a lowered floor reds — the count is pinned, not floored)", () => {
    expect(libFiles.length, `tracked lib .js files (pinned at ${LIB_CENSUS_PIN} — a deletion drops the derived count, a lowered literal breaks equality; repin deliberately)`).toBe(LIB_CENSUS_PIN);
  });

  it("the census is real (a wholesale lib deletion cannot green this arm)", () => {
    // 166 measured 2026-10-18: the tsdown client consolidation bundled
    // the per-file node faces into loader-factory client.js artifacts
    // (lib-sync proves the staged tree IS the build's fixpoint), so
    // the tracked .js census fell from the tsc-era 200+ — the floor
    // rides at the consolidated count, not the pruned history's.
    // 166 -> 165 (THE QWEN FOLD, 2026-10-26: qwen3-tts +
    // qwen3-tts-voicedesign merged into ONE family qwen3-tts — the
    // dead packages/models/qwen3-tts-voicedesign/ package (with its
    // committed lib) is deleted, so the tracked lib .js census drops;
    // this is a floor pin — a wholesale deletion still greens nothing
    // below the new floor).
    expect(libFiles.length, "tracked lib .js files").toBeGreaterThanOrEqual(LIB_CENSUS_PIN);
  });

  it("no emitted JS names a relative .ts specifier", () => {
    const offenders: string[] = [];
    for (const f of libFiles) {
      if (/(?:from\s*|import\(\s*)(["'])\.[^"']*\.ts\1/.test(read(f))) offenders.push(f);
    }
    expect(offenders, `emitted JS carrying a .ts specifier: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("no emitted d.ts names a relative .ts specifier", () => {
    // (2026-10-27) a24e56923 shipped six contracts d.ts carrying
    // "./x.ts" specifiers: the hand-run build missed the build
    // face's rewriteRelativeImportExtensions, and the .js arm
    // above cannot see that class — a type-only package's
    // relative imports erase from JS emit, so the declaration
    // file is the only plane the specifier lives on. Same regex
    // law, own derivation (any lib/ segment, root included).
    const dtsFiles = execFileSync("git", ["ls-files"], { cwd: REPO, encoding: "utf8" })
      .split("\n")
      .filter((f) => /(^|\/)lib\/.*\.d\.ts$/.test(f));
    const offenders: string[] = [];
    for (const f of dtsFiles) {
      if (/(?:from\s*|import\(\s*)(["'])\.[^"']*\.ts\1/.test(read(f))) offenders.push(f);
    }
    expect(offenders, `emitted d.ts carrying a .ts specifier: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("every relative specifier in emitted JS resolves to a file on disk", () => {
    const offenders: string[] = [];
    for (const f of libFiles) {
      for (const m of read(f).matchAll(specRe)) {
        const base = join(REPO, f, "..", m[2]);
        const candidates = [
          base,
          `${base}.js`,
          `${base}.json`,
          `${base}/index.js`,
          `${base}/index.json`,
          `${base}/index.mjs`,
          `${base}/index.cjs`,
          `${base}/index.node`,
        ];
        if (!candidates.some((c) => existsSync(c))) offenders.push(`${f} -> ${m[2]}`);
      }
    }
    expect(offenders, `emitted JS with a dangling relative import: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("the build plane resolves its compiler through tsc-path (a store-first walk emits the stale bytes)", () => {
    // The stale-lib root (2026-10-13): build-plane.mjs picked the
    // store's FIRST typescript@ dir (5.7.3), whose emit rewrites only
    // VARIABLE dynamic-import specifiers — literal "./x.ts" survived,
    // and the battery's lib-sync arm rebuilt the stale bytes and
    // blessed them. The majority compiler (tsc-path.mjs, shared with
    // the typecheck gates and the ship lane) rewrites literals.
    const plane = read("tools/build-plane.mjs");
    expect(plane).toContain("tools/tsc-path.mjs");
    expect(plane).not.toContain("startsWith('typescript@')");
  });
});

describe("THE SHIP'S OWN HOLES (the lane audit's findings, 2026-10-10)", () => {
  const ship = read("scripts/ship-lane.sh");

  /** Every manifest under packages/ carrying a ./client export row. */
  function discoveredRows(): Array<{ pkg: string; target: string; built: boolean }> {
    const discovered: Array<{ pkg: string; target: string; built: boolean }> = [];
    const walkPkgs = (dir: string, depth: number): void => {
      if (depth > 2) return;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name === "node_modules" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        const manifest = join(p, "package.json");
        if (existsSync(manifest)) {
          const data = JSON.parse(readFileSync(manifest, "utf8")) as {
            exports?: Record<string, { default?: string } | string>;
          };
          const client = data.exports?.["./client"];
          const target = typeof client === "string" ? client : client?.default;
          if (typeof target === "string") {
            // built = the FACTORY bundle the loader materializes
            // (GT6-08: an artifact-plane directory door under lib/ was
            // counted "built" while serving raw tsc ESM the browser
            // refused — "Cannot use import statement outside a
            // module", five entries did not activate)
            discovered.push({ pkg: p, target, built: target === "./lib/client.js" });
          }
        }
        walkPkgs(p, depth + 1);
      }
    };
    walkPkgs(join(REPO, "packages"), 0);
    return discovered;
  }

  it("the client-bundle list is DISCOVERED from the export map (a film UI edit shipped stale)", () => {
    // Three packages export ./client → ./lib/client.js (motion,
    // h3-timeline, img-to-mesh) and the browser fetches them like the
    // web ones — but a hand list omitted all three, so a film UI edit
    // "shipped green" while the operator ran yesterday's bytes. The
    // list is now derived from the export map itself.
    expect(ship).toContain('(data.get("exports") or {}).get("./client")');
    // C-M11 (the wall audit, 2026-09-28): the arm named THREE of the
    // packages the export map carries — a fourth built bundle would
    // have joined the ship while this arm watched three. The set is
    // DISCOVERED from every manifest now and pinned exactly: TEN
    // built bundles, every dsh.client seat compiled to lib (the
    // viewer's src-hot-load note was stale — no consumer serves src).
    const discovered = discoveredRows();
    expect(discovered.map((d) => [d.pkg.replace(`${REPO}/`, ""), d.target, d.built]).sort(),
      "every manifest carrying a ./client export, and whether it is BUILT")
      .toEqual([
        ["packages/3d/img-to-mesh", "./lib/client.js", true],
        ["packages/motion/motion", "./lib/client.js", true],
        ["packages/video/h3-timeline", "./lib/client.js", true],
        // the timeline UI kit re-exports the door's Tip/icon set on
        // its own client face (the phantom-require cure, 2026-10-13)
        ["packages/web-kit/timeline", "./lib/client.js", true],
        // THE ONE-ROW LAW: card-base's own graph row — the studio
        // atoms compile once here, every card client requires it.
        ["packages/web/card-base", "./lib/client.js", true],
        ["packages/web/infer-gallery", "./lib/client.js", true],
        ["packages/web/melite-card-deck", "./lib/client.js", true],
        ["packages/web/melite-card-view", "./lib/client.js", true],
        // THE ONE-ROW LAW FOR 3D: the three graph row — three and
        // its six addon modules compile once here, every 3D-touching
        // client requires it (the multiple-copies cure, 2026-10-13)
        ["packages/web/three-client", "./lib/client.js", true],
        ["packages/web/viewer", "./lib/client.js", true],
      ]);
    // the ship's own discovery must therefore carry all ten built
    // bundles — the export-map filter is the same law
    for (const d of discovered.filter((x) => x.built)) {
      expect(ship, `${d.pkg} is a built client bundle`).toContain(
        d.pkg.replace(`${REPO}/`, "").replace("packages/", "").split("/").pop() as string,
      );
    }
  });

  it("every built client bundle is FACTORY FORMAT (the loader fetches classic scripts)", () => {
    // GT6-08 (the round-6 re-audit, 2026-10-13): every melite client
    // entry's exports row pointed at the tsc per-file emit — raw ESM
    // (`import { createElement } from 'react'`) that the DSH loader's
    // classic <script> tag cannot parse: "Cannot use import statement
    // outside a module", five web entries did not activate, and the
    // served path had been dead since the web-graph rows landed. The
    // wire names the factory bundle (window.__ModuleLoader__.load —
    // externals resolve through the injected require), and this arm
    // refuses any regression to module-format bytes on the wire.
    const built = discoveredRows();
    expect(built.length, "the discovered set carries the ten bundles").toBe(10);
    for (const row of built) {
      const file = join(row.pkg, "lib", "client.js");
      expect(existsSync(file), `${file} exists (build it: pnpm exec tsdown in the package)`).toBe(true);
      if (!existsSync(file)) continue;
      const head = readFileSync(file, "utf8").slice(0, 64);
      expect(head.startsWith("window.__ModuleLoader__.load("),
        `${file} must open with the loader registration (factory format), found: ${head.slice(0, 40)}`).toBe(true);
      const body = readFileSync(file, "utf8");
      const rawEsm = body.match(/^(?:import|export)[^()]/m);
      expect(rawEsm, `${file} carries a module-format statement the classic script tag would refuse`).toBeNull();
    }
  });

  /** Directory of every workspace package, keyed by manifest name. */
  function packageDirs(): Map<string, string> {
    const dirs = new Map<string, string>();
    const walkPkgs = (dir: string, depth: number): void => {
      if (depth > 2) return;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name === "node_modules" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        const manifest = join(p, "package.json");
        if (existsSync(manifest)) {
          const data = JSON.parse(readFileSync(manifest, "utf8")) as { name?: string };
          if (typeof data.name === "string") dirs.set(data.name, p);
        }
        walkPkgs(p, depth + 1);
      }
    };
    walkPkgs("packages", 0);
    return dirs;
  }

  it("every @melite client EXTERNAL is row-mountable (the loader's require must land in the table)", () => {
    // The factory cure's own follow-on (2026-10-13): the lane booted
    // the new bundles and the browser answered `require("@melite/
    // card-base/client") missed the module table` — the five card
    // entries externalized a package no profile row materializes.
    // A declared external is a SERVED-PLANE promise: the target is
    // either a DSH platform module (their law) or a workspace
    // package whose own bundle patch mounts its graph row.
    const dirs = packageDirs();
    const meliteExternals = new Set<string>();
    for (const row of discoveredRows()) {
      const manifest = JSON.parse(readFileSync(join(row.pkg, "package.json"), "utf8"));
      for (const spec of manifest.dsh?.client?.external ?? []) {
        if (spec.startsWith("@melite/")) meliteExternals.add(spec);
      }
    }
    expect(meliteExternals.size, "the estate carries @melite client externals to judge").toBeGreaterThan(0);
    for (const spec of meliteExternals) {
      const targetPkg = spec.replace(/\/client$/u, "");
      const target = dirs.get(targetPkg);
      expect(target, `${spec}: the target package exists in the workspace`).toBeDefined();
      if (target === undefined) continue;
      const manifest = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
      expect(manifest.dsh?.bundle?.patch,
        `${spec} is externalized but ${targetPkg} mounts no graph row — declare dsh.bundle.patch (the ONE-ROW LAW) or stop externalizing it`).toBeDefined();
      expect(existsSync(join(target, String(manifest.dsh.bundle.patch))),
        `${targetPkg}: the declared bundle patch exists`).toBe(true);
    }
  });

  it("the lane seed bundles every @melite package its bundles externalize", () => {
    // The profile-plane half of the externals law (2026-10-13): a
    // row-mountable target still misses the table when the PROFILE
    // never bundles it. The seed is the lane's own profile; every
    // @melite external of every bundled package must itself appear
    // in the seed's bundle list, or the boot dies on the wire.
    const dirs = packageDirs();
    const seedPath = join("packages", "web", "melite-card-view", "e2e", "profile-seed", "package.json");
    const seed = JSON.parse(readFileSync(seedPath, "utf8"));
    const bundles: string[] = seed.dsh?.profile?.bundles ?? [];
    const externalTargets = new Set<string>();
    for (const bundle of bundles) {
      if (!bundle.startsWith("@melite/") && !bundle.startsWith("@melite-plugin/")) continue;
      const pkgDir = dirs.get(bundle);
      if (pkgDir === undefined) continue;
      const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
      for (const spec of manifest.dsh?.client?.external ?? []) {
        if (spec.startsWith("@melite/") || spec.startsWith("@melite-plugin/")) {
          externalTargets.add(spec.replace(/\/client$/u, ""));
        }
      }
    }
    expect(externalTargets.size, "the seed's bundles carry @melite externals to judge").toBeGreaterThan(0);
    for (const target of externalTargets) {
      expect(bundles, `${target} is externalized by a bundled package but the seed never mounts it`).toContain(target);
    }
  });

  it("three compiles ONCE — the three-client row is the only tree seat that imports a three specifier", () => {
    // THE ONE-ROW LAW FOR 3D (the multiple-copies cure, 2026-10-13):
    // the lane's wire probe caught `THREE.WARNING: Multiple
    // instances of Three.js being imported` on a bench carrying the
    // img-to-mesh and glb-viewer entries — `three` rode
    // `dependencies`, so every 3D-touching client bundle inlined
    // its own compiled copy. The cure is ONE graph row
    // (@melite/three-client) every consumer REQUIRES through
    // dsh.client.external. This arm holds the SOURCE half: a bare
    // three import anywhere outside the row is a second copy
    // re-entering the tree.
    const offenders: string[] = [];
    const walkSrc = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory() && !/\.(ts|tsx|mts|cts)$/.test(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name === "lib" || e.name.startsWith(".")) continue;
          walkSrc(p);
          continue;
        }
        const body = readFileSync(p, "utf8");
        if (/from\s+['"]three(?:\/|['"])/u.test(body) || /import\(\s*['"]three(?:\/|['"])/u.test(body)) {
          offenders.push(p.replace(`${REPO}/`, ""));
        }
      }
    };
    walkSrc(join(REPO, "packages"));
    const outside = offenders.filter((p) => !p.startsWith("packages/web/three-client/"));
    expect(offenders.length, "the row's own src imports three (else this wall judges nothing)").toBeGreaterThan(0);
    expect(outside, "a bare three import re-entered the tree — route it through @melite/three-client/client").toEqual([]);
  });

  it("exactly one manifest declares three, and no @react-three rides the tree", () => {
    // The DEPENDENCY half of the one-row law: `three` in any other
    // package's dependencies is a second copy the next bundle
    // inlines (the original wedge), and @react-three/* was banned
    // from client bundles outright (card-base/preview.tsx: NO
    // @react-three — r3f's react-reconciler version-skew throws at
    // boot). Both spellings re-enter through package.json.
    const threeHolders: string[] = [];
    const r3fHolders: string[] = [];
    const walkPkgs = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name === "node_modules" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        const manifest = join(p, "package.json");
        if (existsSync(manifest)) {
          const data = JSON.parse(readFileSync(manifest, "utf8")) as {
            name?: string; dependencies?: Record<string, string>;
          };
          if (data.dependencies?.three !== undefined) threeHolders.push(data.name ?? p);
          for (const dep of Object.keys(data.dependencies ?? {})) {
            if (dep.startsWith("@react-three/")) r3fHolders.push(`${data.name ?? p} → ${dep}`);
          }
        }
        walkPkgs(p);
      }
    };
    walkPkgs(join(REPO, "packages"));
    expect(threeHolders, "three rides exactly one manifest — the three-client row's own")
      .toEqual(["@melite/three-client"]);
    expect(r3fHolders, "@react-three/* is banned from this tree (the boot-skew class)").toEqual([]);
  });

  it("no built client bundle inlines a compiled three copy — the row is the artifact owner", () => {
    // The ARTIFACT half of the one-row law: three's own source
    // embeds its instance guard's warning text
    // ('WARNING: Multiple instances of Three.js being imported.',
    // three/src/Three.Core.js) — a bundle that inlines three carries
    // the literal, so the text is a machine-checkable copy marker.
    // Every built bundle EXCEPT the row's own must carry zero
    // occurrences, and every bundle whose manifest externalizes the
    // row must carry the bare require the loader answers.
    const rowPkg = join(REPO, "packages", "web", "three-client");
    const rowBundle = readFileSync(join(rowPkg, "lib", "client.js"), "utf8");
    expect(rowBundle.includes("Multiple instances of Three.js being imported"),
      "the three-client row's bundle carries three itself (rebuild it if this fails)").toBe(true);
    for (const row of discoveredRows()) {
      if (row.pkg === rowPkg) continue;
      const file = join(row.pkg, "lib", "client.js");
      if (!existsSync(file)) continue;
      const body = readFileSync(file, "utf8");
      expect(body.includes("Multiple instances of Three.js being imported"),
        `${row.pkg}/lib/client.js inlines a compiled three copy — externalize @melite/three-client/client instead`).toBe(false);
      const manifest = JSON.parse(readFileSync(join(row.pkg, "package.json"), "utf8"));
      const externalizes = (manifest.dsh?.client?.external ?? []).includes("@melite/three-client/client");
      const requires = body.includes('require("@melite/three-client/client")');
      if (externalizes) {
        expect(requires, `${row.pkg} declares the three external but its bundle never requires it (stale build?)`).toBe(true);
      }
    }
  });

  it("a missing client package FAILS the ship (never skips)", () => {
    // C-M12 (the wall audit, 2026-09-28): a NEGATIVE regex cannot
    // see a reintroduction written differently — a split-line `if`,
    // an `&&`, or `[[ -d ]]` all match neither the old pattern nor
    // its absence. The pin is POSITIVE now: the loop's own body is
    // read, and the missing-directory branch must NAME the failure
    // and exit non-zero (a `continue` or a bare test would ship a
    // 404ing bundle).
    const loopAt = ship.indexOf('for p in "${CLIENT_BUNDLES[@]}"; do');
    expect(loopAt, "the client-bundle loop exists").toBeGreaterThan(-1);
    const loop = ship.slice(loopAt);
    // the branch is the lines between the loop head and the build
    // step that follows it (read by shape, not by a fixed offset)
    const buildAt = loop.indexOf("node node_modules/tsdown");
    expect(buildAt, "the client build step follows the existence check").toBeGreaterThan(-1);
    const branch = loop.slice(0, loop.lastIndexOf("\n", buildAt));
    expect(branch, "the loop's missing-directory branch is present").toContain('[ ! -d "$REPO/$p" ]');
    expect(branch, "a missing client bundle is named and FAILS the ship").toMatch(/bad\s+"[^"]*"/);
    expect(branch, "the branch exits non-zero (never continues past a 404ing bundle)").toMatch(/exit 1/);
  });

  it("every probe is FATAL — a gate that cannot fail is a log line", () => {
    // the model board and both declaration checks printed FAIL and
    // the script still printed SHIPPED: a fail-open model board, a
    // gateless form and a blind agent face all shipped green.
    const probeBlock = ship.slice(ship.indexOf('say "PROVE the lane runs this tree'));
    // C-L17 (the wall audit, 2026-09-28): the scan looked 400
    // CHARACTERS ahead — an `exit 1` written 401 chars later (or
    // after a long message) read as a fail-open gate, and a long
    // message wrote the same gate both fatal and non-fatal
    // depending on the day. The scan is now STRUCTURAL: each `bad`
    // line's own branch is its indentation span (from the line to
    // the next line at the same-or-lower indent), and the branch
    // must carry the exit. The one exemption — the cleanup warning
    // that says the operator must act by hand — is matched on the
    // MESSAGE ITSELF, wherever the line wraps it.
    const lines = probeBlock.split("\n");
    const badLines = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => /^\s*bad "/.test(line));
    expect(badLines.length, "the prove section has gates to judge").toBeGreaterThan(0);
    const EXEMPT = "could not remove the probe stage";
    const nonFatal: string[] = [];
    for (const { line, i } of badLines) {
      if (line.includes(EXEMPT)) continue; // named exemption: the operator acts by hand
      const indent = line.length - line.trimStart().length;
      let exit = false;
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j] ?? "";
        const trimmed = next.trim();
        if (trimmed === "") continue;
        // a `then` BLOCK's body shares the `bad` line's indent, so
        // same-indent lines are still inside the branch; the branch
        // ends at its own closer (`fi` / `done` / `}` / `;;`) or at
        // a line indented LESS than the gate.
        const nextIndent = next.length - next.trimStart().length;
        const isCloser = ["fi", "done", "esac", "}", ";;", ")"].includes(trimmed)
          || trimmed.startsWith("fi ") || trimmed.startsWith("done ");
        if (isCloser) break;
        if (nextIndent < indent) break;
        if (/\bexit\b/.test(next)) { exit = true; break }
      }
      if (!exit) nonFatal.push(line.trim().slice(0, 90));
    }
    expect(nonFatal, `non-fatal gates (a ` + "`bad`" + ` with no exit in its own branch): ${nonFatal.join(" | ")}`).toEqual([]);
  });

  it("the load bundle's lane contract is PROVEN on the live lane", () => {
    expect(ship).toContain("/v1/load?name=tts&inference_type=card");
  });

  it("--unit and --origin are bound (a ship that restarts one lane and proves another certifies nothing)", () => {
    expect(ship).toContain("A ship that restarts one lane and proves another certifies nothing");
    expect(ship).toMatch(/UNIT_OVERRIDE/);
    expect(ship).toMatch(/ORIGIN_OVERRIDE/);
  });

  it("the net re-runs AFTER the emit (the pre-build net judged stale .d.ts files)", () => {
    const postEmit = ship.indexOf("TYPECHECK AGAINST THE EMITTED LIBS");
    expect(postEmit).toBeGreaterThan(-1);
    // it must live inside the build block, after the builds
    const buildLoop = ship.indexOf("BUILD the compiled-lib packages");
    expect(postEmit).toBeGreaterThan(buildLoop);
  });

  it("a missing lib/ FAILS the stamp verification (the skip let an absent build walk past)", () => {
    const verify = ship.slice(ship.indexOf("verify_stamps() {"), ship.indexOf("if [ \"$DO_BUILD\" -eq 1 ]; then"));
    expect(verify).toContain("no lib/ to verify");
    expect(verify).not.toMatch(/\[ -d "\$REPO\/\$p\/lib" \] \|\| continue/);
  });
});

describe("THE BOOT BUDGET REACHES EVERY PROJECT (the hook's 5s bounces, 2026-09-28)", () => {
  // The budget lived at the vitest ROOT for a year, and a vitest
  // project does not inherit the root's testTimeout — so every
  // project started from the 5s default anyway, and the pre-commit
  // hook (which runs the whole node project) kept bouncing green
  // trees on "Test timed out in 5000ms". The failures vanished in
  // isolation, so the lesson that got written down was "flaky",
  // which is the wrong lesson: the budget was never applied.
  //
  // The budget is now spread per project through BOOT_BUDGET. This
  // arm requires every project in the config to carry it, so a
  // project added later (or the spread removed) refuses here rather
  // than at the hook, two hundred commits later.
  it("every vitest project inherits the boot budget (a project that does not is a 5s wall)", () => {
    const src = read("vitest.config.ts");
    const projects = (src.match(/^\s*name: '[^']+',$/gm) ?? []).length;
    const budgets = (src.match(/\.\.\.BOOT_BUDGET/g) ?? []).length;
    expect(projects, "the config declares projects (a config with none defeats this arm)").toBeGreaterThan(0);
    expect(budgets, `every project spreads BOOT_BUDGET (${String(projects)} projects, ${String(budgets)} spreads)`)
      .toBe(projects);
    // and the budget is the honest one, not a token value
    expect(src).toMatch(/BOOT_BUDGET = \{ testTimeout: 30_000, hookTimeout: 30_000 \}/);
    // the root's own copy is kept for anything that reads it, and
    // the correction is written down where the next reader looks
    expect(src).toMatch(/does NOT inherit the root's testTimeout/);
  });
});

describe("THE IDENTITY LAW: a value that crosses a door has ONE producer (2026-09-28)", () => {
  // The run id had THREE (the registry composing, the registry
  // registering, the start chain's own mint) and every composed
  // graph's `${runId}/gen` forward reference then named a run that
  // was never created — the operator's live refusal. The bench stage
  // id had TWO (the row handed to admission, the row stored), which
  // is the same seam with the judge and the store able to disagree
  // about which row they are looking at.
  //
  // The walls that existed could not see this: they pin SHAPES, and
  // two correctly-typed producers of the same value are shape-legal.
  // The law is about IDENTITY — the value must have exactly one
  // producer, and where a type can express that (a required
  // argument), the type does, so a second producer does not compile.
  it("the run id has exactly one producer, and no fallback mint anywhere", () => {
    const registry = read("packages/harness/estate-queue/src/runsRegistry.ts");
    const start = read("packages/harness/estate-queue/src/runsStart.ts");
    // ONE mint function, in ONE module
    const core = read("packages/harness/estate-queue/src/queueCore.ts");
    expect((core.match(/export function newRunId\(/g) ?? []).length, "one newRunId, one home").toBe(1);
    // ONE call site in the registry (the start chain takes it as an
    // argument; a `?? newRunId()` there is a second producer)
    expect((registry.match(/newRunId\(\)/g) ?? []).length,
      "the registry mints the run id exactly once").toBe(1);
    // a CALL is a second producer; the import and the comment that
    // names the retired fallback are not
    const startCalls = (start.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*")))
      .filter((l) => /newRunId\(/.test(l) && !/^import /.test(l.trim()) && !/import \{/.test(l)).length;
    expect(startCalls, "the start chain CALLS no mint of its own — the id is the caller's")
      .toBe(0);
    // and the type says so: the door is required, its runId required
    // (and BRANDED — the opaque-id convention; the brand, not the
    // bare string, is what a second producer would collide on)
    expect(start).toMatch(/const runId: RunId = door\.runId;/);
    expect(start).toMatch(/\n  door: \{\n    runId: RunId;/);
  });

  it("the bench stage id has ONE producer (the admitted row and the stored row cannot differ)", () => {
    const bench = read("packages/estate/drafts/src/bench.ts");
    // THE LAW, AND THE SHAPE IT NOW HAS (2026-10-11). This arm used
    // to grep for one `Math.max(acc, Number(m[1]))` and for exactly
    // three `mintStageId(` call sites. Both held while the file
    // carried the duplication anyway: the LOAD path minted its own
    // repair id with a second copy of the same arithmetic, and
    // `addStageBench` called the mint twice (its own comment claiming
    // "there is one producer of the value" sat directly above the
    // two calls). A count of one is not a law about a FORMULA; it is
    // a law about a spelling, and a rename moves it.
    //
    // The arithmetic now lives in named helpers — `highestStageSuffix`
    // reads the bench's highest suffix, `nextStageId` picks the next
    // free one — and both id producers call them. The law is restated
    // as what it always meant: the arithmetic is DEFINED once, and no
    // site spells its own.
    for (const helper of ["function highestStageSuffix(", "function nextStageId(", "function takenStageIds("]) {
      expect((bench.match(new RegExp(helper.replace(/[()]/g, "\\$&"), "g")) ?? []).length,
        `${helper} is defined exactly once — two definitions are two producers of "the next id"`)
        .toBe(1);
    }
    // NO site re-derives the max+1 by hand any more
    expect(bench, "no site writes the max+1 arithmetic by hand (highestStageSuffix owns it)")
      .not.toMatch(/Math\.max\((?:acc|max), Number\(m\[1\]\)\)/);
    // the mint is exported, and the WRITE door binds its value ONCE
    // and reads it for both the admitted and the stored row
    expect(bench, "the one mint is exported for the wall and for every door")
      .toMatch(/export function mintStageId\(/);
    expect((bench.match(/mintStageId\(/g) ?? []).length,
      "the mint is called from the wall-visible definition and from the write door only")
      .toBe(2);
    expect(bench, "the stored row READS the admitted row's id (one call, not two producers)")
      .toMatch(/const stageId: string = stageIdForAdmit;/);
    expect(bench).not.toMatch(/"s_" \+\s*\n\s*String\(/);
  });

  it("the estate's TS modules are tested by TS — no pytest bridges into a .ts module", () => {
    // The python plane once tested userLoras.ts through a node
    // eval.mts bridge spawned from pytest (batch AW deleted it —
    // Layer A is typescript; a python shell around a TS proof is
    // an invented system). The class survives as a wall: every
    // pytest seat under tests/ may load VENDORED python (Layer C
    // packs, the sidecar writer) but never a .ts module.
    const bridges: string[] = [];
    for (const f of readdirSync(join(REPO, "tests"))) {
      if (!f.endsWith(".py")) continue;
      const text = readFileSync(join(REPO, "tests", f), "utf8");
      if (/(node_eval|--experimental-strip-types|\.ts["']|file:\/\/.*\.ts)/.test(text)) {
        bridges.push(f);
      }
    }
    expect(bridges,
      "a pytest seat bridging into a .ts module — port the proof to vitest (the census law: Layer A is typescript)")
      .toEqual([]);
  });
});
