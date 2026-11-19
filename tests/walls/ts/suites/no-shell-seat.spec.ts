// no-shell-seat.spec.ts — THE SHELL-FREE ESTATE (operator ruling,
// 2026-11-19: "WHY IS THIS PROJECT TIED TO FUCKING LINUX. YOU
// LITERALLY USE PYTHON, NOTHING SHOULD BE TIED TO ANY FUCKING SH
// SCRIPTS AT ALL. THIS IS NPM AND PYTHON, NOT SHELL SCRIPT."). The
// 14 tracked shell seats (the lane playbook, the lane sync/rebuild
// pair, the four e2e GPU launchers, the commission supervisor, the
// promote door, the engine boot, the profile installers, the resume
// door, the freshness lib) are deleted; every one is a node port
// with the same flags, exit codes, and stdout strings. This wall
// refuses the class's return in four arms: the census (no tracked
// .sh anywhere), the script rows (package.json drives node, never a
// shell wrapper), the shebang sweep (no bash seat sneaks back into
// the tooling trees), and the ports' own parse door (every retired
// seat's replacement still parses under node).
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "../../../..");

/** The retired shell seats and their node ports — the roster the
 *  2026-11-19 port wave landed (one port per retired script). */
const PORTS = [
  "scripts/ship-lane.mjs",
  "scripts/lane-rebuild.mjs",
  "scripts/lane-sync.mjs",
  "scripts/lane-dev.mjs",
  "scripts/e2e-gpu-lane.mjs",
  "scripts/e2e-h3-gpu-lane.mjs",
  "scripts/e2e-studio-lane.mjs",
  "scripts/commission-supervisor.mjs",
  "scripts/promote-prod.mjs",
  "scripts/comfy-engine.mjs",
  "scripts/headless-resume.mjs",
  "scripts/lib/lane-freshness.mjs",
  "packages/harness/install-profile.mjs",
  "packages/harness/uninstall-profile.mjs",
  "infra/comfyui/boot-engine.mjs",
];

describe("THE SHELL-FREE ESTATE (npm and python, never shell script)", () => {
  it("the census: ZERO tracked .sh files in the repository", () => {
    // The ruling is absolute — not "no .sh in scripts/" but no shell
    // seat anywhere git tracks. A reintroduced wrapper reds here the
    // moment it lands (the toggle proof: `git add` any .sh).
    const r = spawnSync("git", ["ls-files", "*.sh"], { cwd: ROOT, encoding: "utf8" });
    expect(r.status, "git ls-files refused").toBe(0);
    const tracked = (r.stdout ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    expect(tracked, "no tracked shell script may return — the estate is node (+ python where engines require)").toEqual([]);
  });

  it("the script rows drive node — no row names a shell wrapper or .sh target", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    const offenders = Object.entries(pkg.scripts ?? {})
      .filter(([, v]) => /(\.sh\b|\bbash\s|\bsh\s-c)/.test(v))
      .map(([k, v]) => `${k}: ${v}`);
    expect(offenders, `shell-driving script rows: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("no bash/sh shebang lives in the tooling trees", () => {
    // The census judges tracked files; this arm catches an untracked
    // or exec-bit seat before it is ever committed (scripts/, tools/,
    // packages/harness/, infra/ — the trees the ruling names).
    const offenders: string[] = [];
    const walk = (dir: string, rel: string): void => {
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        const r = rel === "" ? e.name : rel + "/" + e.name;
        if (e.isDirectory()) walk(p, r);
        else if (/\.(sh|bash)$/.test(e.name)) offenders.push(r);
        else if (e.name.endsWith(".mjs") || e.name.endsWith(".py")) {
          const head = readFileSync(p, "utf8").slice(0, 32);
          if (/^#!.*(bash|\/sh)/.test(head)) offenders.push(r);
        }
      }
    };
    for (const tree of ["scripts", "tools", "packages/harness", "infra"]) {
      if (existsSync(join(ROOT, tree))) walk(join(ROOT, tree), tree);
    }
    expect(offenders, `shell seats: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("every retired seat's node port exists and parses", () => {
    // The ports are the cure's substance: one missing or broken port
    // means the deletion took a door with it. node --check is the
    // parse door (the lane launchers are GPU seats — never RUN them
    // from a wall; parse + the hermetic spec tiers own verification).
    const broken: string[] = [];
    for (const rel of PORTS) {
      const p = join(ROOT, rel);
      if (!existsSync(p) || !statSync(p).isFile()) { broken.push(rel + " (missing)"); continue; }
      const r = spawnSync(process.execPath, ["--check", p], { encoding: "utf8" });
      if (r.status !== 0) broken.push(rel + " (parse: " + String(r.stderr ?? "").split("\n")[0] + ")");
    }
    expect(broken, `broken ports: ${broken.join(" | ")}`).toEqual([]);
  });
});
