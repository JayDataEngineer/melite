// dsh-version-convergence.spec.ts — THE DSH VERSION WALL (operator
// 2026-11-06: "we need ONE VERSION OF DSH, NOT MULTI VERSIONS — HOW
// IS THIS NOT CHECKED FOR"). The estate once resolved two dsh-brand
// copies and two dsh-llm-pi-ai copies because ONE package pinned
// 0.2.0-rc.2 in an all-rc.1 tree: two runtimes of the same library
// in one process graph, drifting types and duplicated state, with
// no judge anywhere. Two planes, both live:
//
// 1. THE PIN PLANE — every @deepseek-ai/* name carries exactly one
//    specifier spelling per dependency kind (dependencies /
//    devDependencies / peerDependencies) across every manifest in
//    the estate. A second spelling (`0.2.0-rc.2` beside `rc.1`, or
//    a bare `3.18.4` beside `^3.18.4`) is the drift seed.
// 2. THE RESOLUTION PLANE — the installed store itself: every
//    @deepseek-ai/* name resolves to exactly ONE version under
//    node_modules/.pnpm. The pin plane can pass while a transitive
//    (or a stale lock) still lands a second copy — the store is the
//    truth the runtime actually loads.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const KINDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;

/** Every manifest in the estate: the root plus every package.json
 *  under packages/ (never node_modules, never the references tree). */
function estateManifests(): string[] {
  const out: string[] = [join(ROOT, "package.json")];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const sub = join(dir, entry.name);
      const manifest = join(sub, "package.json");
      if (existsSync(manifest)) out.push(manifest);
      walk(sub);
    }
  };
  walk(join(ROOT, "packages"));
  return out;
}

/** name -> kind -> Set(specifier) for every @deepseek-ai/* pin. */
function pinCensus(): Map<string, Map<string, Set<string>>> {
  const census = new Map<string, Map<string, Set<string>>>();
  for (const manifest of estateManifests()) {
    const json: unknown = JSON.parse(readFileSync(manifest, "utf8"));
    if (typeof json !== "object" || json === null) continue;
    for (const kind of KINDS) {
      const deps = (json as Record<string, unknown>)[kind];
      if (typeof deps !== "object" || deps === null) continue;
      for (const [name, specifier] of Object.entries(deps as Record<string, unknown>)) {
        if (!name.startsWith("@deepseek-ai/")) continue;
        if (typeof specifier !== "string") continue;
        if (!census.has(name)) census.set(name, new Map());
        const byKind = census.get(name)!;
        if (!byKind.has(kind)) byKind.set(kind, new Set());
        byKind.get(kind)!.add(specifier);
      }
    }
  }
  return census;
}

/** name -> Set(version) from the installed store (.pnpm truth). The
 *  directory names carry peer-resolution hashes after `_` — the
 *  version is the segment between `name@` and the first `_`. */
function storeCensus(): Map<string, Set<string>> {
  const store = join(ROOT, "node_modules", ".pnpm");
  const census = new Map<string, Set<string>>();
  for (const entry of readdirSync(store, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("@deepseek-ai+")) continue;
    // @deepseek-ai+name@version[_peerhash]
    const at = entry.name.indexOf("@", "@deepseek-ai+".length);
    if (at === -1) continue;
    const name = "@deepseek-ai/" + entry.name.slice("@deepseek-ai+".length, at);
    const rest = entry.name.slice(at + 1);
    const version = rest.split("_")[0]!.replace(/\(.*/, "");
    if (!census.has(name)) census.set(name, new Set());
    census.get(name)!.add(version);
  }
  return census;
}

describe("THE DSH VERSION WALL (operator 2026-11-06: ONE version of DSH, not multi versions)", () => {
  it("the pin plane: every @deepseek-ai/* name carries ONE specifier spelling per dependency kind across the whole estate", () => {
    const offenders: string[] = [];
    for (const [name, byKind] of pinCensus()) {
      for (const [kind, spellings] of byKind) {
        if (spellings.size > 1) {
          offenders.push(`${name} ${kind}: ${[...spellings].sort().join(" + ")}`);
        }
      }
    }
    expect(offenders, `second spellings are the drift seed:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the estate pins DSH at all (a degenerate empty census would pass vacuously)", () => {
    const census = pinCensus();
    expect(census.size).toBeGreaterThan(20);
    // the lane version moves with the dsh family's lockstep (the
    // 2026-11-09 bump: the 0.2.1-rc.2 line, cordis ^4.0.5) — the
    // literal IS the SSOT pin this wall judges the manifests against.
    expect(census.get("@deepseek-ai/cordis")?.get("dependencies")?.has("^4.0.5")).toBe(true);
  });

  it("the resolution plane: every @deepseek-ai/* name resolves to exactly ONE installed version", () => {
    const offenders: string[] = [];
    for (const [name, versions] of storeCensus()) {
      if (versions.size > 1) {
        offenders.push(`${name}: ${[...versions].sort().join(" + ")}`);
      }
    }
    expect(offenders, `the store carries second copies — two runtimes of one library:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the resolution plane sees the estate at all (a missing store would pass vacuously)", () => {
    const census = storeCensus();
    expect(census.size).toBeGreaterThan(20);
    expect(census.get("@deepseek-ai/cordis")).toEqual(new Set(["4.0.5"]));
  });
});
