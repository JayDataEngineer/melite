import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execSync } from "node:child_process";

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
    const walls = yml.split("- name: walls (staged TS/walls)")[1]?.split("- name:")[0] ?? "";
    expect(walls, "the walls job still exists in lefthook.yml").toContain(
      "node node_modules/vitest/vitest.mjs run --project node",
    );
    expect(walls, "the fleet must write to a file, never a closing pipe").toMatch(
      // /var/tmp, not /tmp: this box's /tmp janitor killed the log
      // between redirect and tail twice (2026-10-12); the repo-local
      // .scratch is the one tree the janitor provably never touches.
      /> \.scratch\/hook-walls\.log 2>&1/,
    );
    expect(walls, "the hook's temp tree rides the janitor-free /var/tmp").toMatch(
      /TMPDIR=\/var\/tmp\/melite-hook/,
    );
    expect(walls, "vitest's exit code must reach lefthook verbatim").toContain(
      "exit $code",
    );
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
    // through a spawnSync whose argv names the tracked config, and
    // its failure branch increments the failure tally (the script
    // exits non-zero on a red tier).
    const script = read("scripts/typecheck-tests.mjs");
    const call = script.match(
      /spawnSync\(\s*process\.execPath\s*,\s*\[tsc\s*,\s*"--noEmit"\s*,\s*"-p"\s*,\s*"tsconfig\.repotier\.json"\]/,
    );
    expect(call, "the repo tier runs through the tsc spawnSync naming tsconfig.repotier.json").not.toBeNull();
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
    const shipList = ship.split("COMPILED=(")[1]?.split(")")[0] ?? "";
    const pkgs = shipList.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#"));
    // (li-bo: 4, not 5 — the typert vendor died; the protocol is
    // upstream 0.2.0-rc.1 from the store now, prebuilt, so the ship
    // compiles the four estate server packages and nothing else.
    // li-bp RESTORED an in-tree copy at packages/vendor/typert-protocol
    // as a GENERATION FACE ONLY — the DSH Typert generator's identity
    // law requires the protocol's declarations inside a workspace
    // package under packages/ — but no runtime import resolves it and
    // the ship does NOT compile it (its lib ships verbatim, re-vendored
    // from the pinned reference): the count stays 4. Raising it to 5
    // would rebuild a copy-don't-invent tree; the hoist-shadow kill
    // and typert-artifact-law pin the seam.)
    expect(pkgs.length).toBeGreaterThanOrEqual(4);
    for (const p of pkgs) {
      const ts = read(`${p}/tsconfig.json`);
      expect(ts, `${p} must pin "noEmitOnError": true`).toContain('"noEmitOnError": true');
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
    expect(gate, `the gate pins the LIVE tsconfig count (${live.length}) — touch its literal when the estate grows`).toContain(`).toBe(${live.length})`);
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
});

describe("THE SHIP'S OWN HOLES (the lane audit's findings, 2026-10-10)", () => {
  const ship = read("scripts/ship-lane.sh");

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
    // DISCOVERED from every manifest now and pinned exactly: six
    // built bundles (./lib/client.js) plus the viewer's hot-loaded
    // ./src client, which is the one that must NOT be built.
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
            discovered.push({ pkg: p, target, built: target.replace("./", "") === "lib/client.js" });
          }
        }
        walkPkgs(p, depth + 1);
      }
    };
    walkPkgs(join(REPO, "packages"), 0);
    expect(discovered.map((d) => [d.pkg.replace(`${REPO}/`, ""), d.target, d.built]).sort(),
      "every manifest carrying a ./client export, and whether it is BUILT")
      .toEqual([
        ["packages/3d/img-to-mesh", "./lib/client.js", true],
        ["packages/motion/motion", "./lib/client.js", true],
        ["packages/video/h3-timeline", "./lib/client.js", true],
        // THE ONE-ROW LAW: card-base's own graph row — the studio
        // atoms compile once here, every card client requires it.
        ["packages/web/card-base", "./lib/client.js", true],
        ["packages/web/infer-gallery", "./lib/client.js", true],
        ["packages/web/melite-card-deck", "./lib/client.js", true],
        ["packages/web/melite-card-view", "./lib/client.js", true],
        ["packages/web/viewer", "./src/client/index.ts", false],
      ]);
    // the ship's own discovery must therefore carry all seven built
    // bundles — the export-map filter is the same law
    for (const d of discovered.filter((x) => x.built)) {
      expect(ship, `${d.pkg} is a built client bundle`).toContain(
        d.pkg.replace(`${REPO}/`, "").replace("packages/", "").split("/").pop() as string,
      );
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
    expect(start).toMatch(/const runId: string = door\.runId;/);
    expect(start).toMatch(/\n  door: \{\n    runId: string;/);
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
});
