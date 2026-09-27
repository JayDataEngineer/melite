import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

describe("THE TYPECHECK GATE — every package, every run", () => {
  const dirs = packageDirs();

  it("the net reaches the estate (discovery is dynamic, not a named list)", () => {
    // The five-package era is over: if this count ever reads ~5,
    // discovery broke and the estate is half-unheard again.
    expect(dirs.length).toBeGreaterThanOrEqual(30);
    // The incident's package is in the net BY NAME (the engine ran
    // from source, so no build step ever saw it).
    expect(dirs.map((d) => d.replace(/\\/g, "/")).some((d) => d.endsWith("engines/comfyui-cordis"))).toBe(true);
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
    // through.
    expect(script).toMatch(/TYPECHECK|find .*tsconfig\.json|compgen.*tsconfig/);
  });
});
