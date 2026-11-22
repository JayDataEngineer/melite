// config-subprocess-law.spec.ts — LAW 8 CONFIG SUBPROCESSES
// (AGENTS.md Conventions: "Config subprocesses run built lib/ under
// plain Node; source regressions use their declared launcher"). The
// 2026-10-18 conventions-plane audit (§LAW 8) held the plane clean
// on one-time censuses with no wall owning the law — the clean
// verdict decayed silently once already: the audit's "zero
// child_process in src" literal is false today (the manage trio's
// engine-lifecycle doors and the face stamp's git runner arrived
// after it). Goal-e1b6bd6b slice 4 asked for the §8 wall; this is
// it. Three invariants, one firing arm each:
//   1. THE PLAIN-NODE LAUNCH LAW — no package.json script row
//      launches source through tsx/ts-node. This repo's rows drive
//      built lib under plain node (vitest, plain node, playwright,
//      python are the declared launchers); the dsh CLI's own
//      `node --import tsx/esm` source launch is upstream's seat,
//      outside this repo's script rows.
//   2. THE MANIFEST POINTER LAW — the dsh/melite config blocks
//      (bundle, client, profile, publish, and the flat
//      dsh.bundle.patch spelling) point at built/config artifacts,
//      never a src/ path.
//   3. THE OWNED-SPAWN ROSTER — product src imports child_process
//      in exactly the rostered doors: the manage trio's
//      systemctl/journalctl engine-lifecycle doors (the truth of
//      registry row infra-manage-plane-status-truth, whose wall
//      runs them against PATH shims) and the face stamp's git
//      runner (F-7; walls inject fakes). The roster is the drift
//      alarm in BOTH directions: a new importer reds by name; a
//      retired door reds the stale roster.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "../../../..");
const PACKAGES = join(ROOT, "packages");

const SKIP_DIRS = new Set(["node_modules", "lib", "dist", ".git", "data", "references"]);

/** Every package.json under the repo root (the walk mirrors the
 *  check-package-readmes gate: real tree, no name list). */
function manifests(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.name === "package.json") {
        out.push(join(dir, entry.name));
      }
    }
  };
  walk(ROOT);
  return out;
}

/** Source files under packages/**, only inside a `src` path segment
 *  (the product plane; tests, walls, and tooling spawn lawfully). */
function srcFiles(): string[] {
  const out: string[] = [];
  const CODE = /\.(ts|tsx|mts|cts|mjs|cjs|js|jsx)$/;
  const walk = (dir: string, inSrc: boolean): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name === "tests" || entry.name === "test" || entry.name === "e2e") continue;
        walk(p, inSrc || entry.name === "src");
      } else if (inSrc && CODE.test(entry.name) && statSync(p).isFile()) {
        out.push(p);
      }
    }
  };
  walk(PACKAGES, false);
  return out;
}

// A script value drives tsx/ts-node when the token stands alone or
// heads a subpath (`tsx src/boot.ts`, `node --import tsx/esm`); a
// `.tsx` filename suffix never matches (the char before the token
// is a dot, not a separator).
const LAUNCHER = /(^|[\s"'=])(tsx|ts-node)\b/;

describe("LAW 8 CONFIG SUBPROCESSES (the plain-node launch, manifest-pointer, and owned-spawn laws)", () => {
  it("THE PLAIN-NODE LAUNCH LAW: no package.json script row launches source through tsx/ts-node", () => {
    const offenders: string[] = [];
    for (const manifestPath of manifests()) {
      let manifest;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch {
        continue; // unparseable manifests are the other walls' finding
      }
      for (const [name, value] of Object.entries(manifest.scripts ?? {})) {
        if (LAUNCHER.test(String(value))) offenders.push(`${relative(ROOT, manifestPath)} :: ${name} = ${value}`);
      }
    }
    expect(offenders, `script rows launching source through tsx/ts-node (config subprocesses run built lib under plain node): ${offenders.join(" | ")}`).toEqual([]);
  });

  it("THE MANIFEST POINTER LAW: the dsh/melite config blocks carry no src/ path", () => {
    const offenders: string[] = [];
    for (const manifestPath of manifests()) {
      let manifest;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch {
        continue;
      }
      const blocks = {
        dsh: manifest.dsh ?? null,
        melite: manifest.melite ?? null,
        flatPatch: manifest["dsh.bundle.patch"] ?? null,
      };
      const pointers = (value: unknown, keyPath: string): void => {
        if (typeof value === "string") {
          if (/src\//.test(value)) offenders.push(`${relative(ROOT, manifestPath)} :: ${keyPath} = ${value}`);
        } else if (Array.isArray(value)) {
          value.forEach((v, i) => pointers(v, `${keyPath}[${i}]`));
        } else if (value !== null && typeof value === "object") {
          for (const [k, v] of Object.entries(value)) pointers(v, `${keyPath}.${k}`);
        }
      };
      pointers(blocks.dsh, "dsh");
      pointers(blocks.melite, "melite");
      pointers(blocks.flatPatch, "dsh.bundle.patch");
    }
    expect(offenders, `dsh/melite config blocks pointing into src/ (they name built/config artifacts): ${offenders.join(" | ")}`).toEqual([]);
  });

  it("THE OWNED-SPAWN ROSTER: product src imports child_process in exactly the rostered doors", () => {
    // The roster IS the law: each door names why its spawn is the
    // product's own capability, and the census is exact both ways —
    // a new importer outside this list reds by name, a retired door
    // reds the stale roster.
    const OWNED_SPAWN_ROSTER: Record<string, string> = {
      "packages/harness/estate-queue/src/managePlane.ts":
        "the manage plane's engine-lifecycle doors (systemctl/journalctl) — the truth of infra-manage-plane-status-truth, walled against PATH shims",
      "packages/harness/estate-queue/src/manageOps.ts":
        "the manage verbs' systemctl start/stop door — the estate engine lifecycle",
      "packages/harness/estate-queue/src/manageProbe.ts":
        "the probe door's systemctl/journalctl read — the engine-unit census",
      "packages/harness/melite-tools/src/faceStamp.ts":
        "the F-7 face stamp's git runner (git rev-parse HEAD + dirty) — walls inject fakes",
    };
    const IMPORTS = /from\s+["'](node:)?child_process["']|import\(\s*["'](node:)?child_process["']\s*\)|require\(\s*["'](node:)?child_process["']\s*\)/;
    const census = srcFiles()
      .filter((f) => IMPORTS.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f))
      .sort();
    const roster = Object.keys(OWNED_SPAWN_ROSTER).sort();
    const unowned = census.filter((f) => !OWNED_SPAWN_ROSTER[f]);
    const stale = roster.filter((f) => !census.includes(f));
    expect(
      unowned,
      `child_process importers outside the owned-spawn roster — a product src door spawns a process no law owns; roster the door (with its owner) or delete the spawn: ${unowned.join(" | ")}`,
    ).toEqual([]);
    expect(
      stale,
      `owned-spawn roster entries with no live import (the roster is stale — prune it): ${stale.join(" | ")}`,
    ).toEqual([]);
  });
});
