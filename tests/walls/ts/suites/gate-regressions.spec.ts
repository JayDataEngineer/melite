import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
      /> \/tmp\/hook-walls\.log 2>&1/,
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
    const script = read("scripts/typecheck-tests.mjs");
    expect(script).toContain('"-p", "tsconfig.repotier.json"');
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

  it("every compiled package carries noEmitOnError (a red build must not emit)", () => {
    // THE WEDGE: without noEmitOnError the build's failure exit came
    // AFTER the stale lib was already on disk — the ship failed and
    // the damage shipped anyway on the next restart.
    const shipList = ship.split("COMPILED=(")[1]?.split(")")[0] ?? "";
    const pkgs = shipList.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#"));
    expect(pkgs.length).toBeGreaterThanOrEqual(5);
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
  it("the discovery pin is exact — no floor form remains", () => {
    // THE WEDGE: expect(count).toBeGreaterThanOrEqual(85) let the
    // count drift silently down to 85 while packages went dark, and
    // never heard a new package at all. The exact pin's own
    // regression is the floor FORM creeping back into the spec.
    const gate = read("tests/walls/ts/suites/typecheck-gate.spec.ts");
    expect(gate).not.toMatch(/toBeGreaterThanOrEqual\(8\d\)/);
    expect(gate).toContain(").toBe(88)");
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
});
