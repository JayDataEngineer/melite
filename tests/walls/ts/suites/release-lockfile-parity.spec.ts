// release-lockfile-parity.spec.ts — THE LOCKFILE RIDES THE BUMP
// (the v0.3.0-alpha Docs burn, 2026-11-19): the release bump moved
// 84 workspace manifests to 0.3.0-alpha but scripts/bump-release-
// version.mjs carries no lockfile seat — pnpm-lock.yaml still named
// 0.2.3-rc.4 in 46 root-importer specifiers, every CI frozen
// install red on the released commit (Docs run 44525246018:
// "lockfile: 0.2.3-rc.4, manifest: 0.3.0-alpha" ×84), and the
// push-set sentry never caught it because the battery's own install
// is not frozen. pnpm's --frozen-lockfile refuses exactly this
// drift — this wall is that refusal, run locally at battery time
// so the drift reds BEFORE the push, not after.
//
// THE LAW: for every lockfile importer dependency whose resolution
// is a workspace link (`version: link:<dir>`), the specifier MUST
// equal the linked package manifest's version field. The root
// importer's @melite/@melite-plugin seats are literal version pins
// (the "root seat pins" the bump script itself moves) — a bump that
// moves manifests but not these specifiers is a release whose CI
// cannot even install.
//
// ARM 1 — PARITY: every link-resolved specifier equals its target
//   manifest's version (zero drift, names the offenders).
// ARM 2 — THE CENSUS EXISTS: the lockfile carries at least one
//   link-resolved specifier (an empty census is the loudest red —
//   a parser change that silently judges nothing).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

const ROOT = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));

interface DepRow { specifier?: string; version?: string }

const lock = YAML.parse(readFileSync(join(ROOT, "pnpm-lock.yaml"), "utf8")) as {
  importers?: Record<string, Record<"dependencies" | "devDependencies", Record<string, DepRow> | undefined>>;
};

/** Every (importer, dep, row) whose resolution is a workspace link. */
const links: Array<{ importer: string; dep: string; row: DepRow }> = [];
for (const [importer, deps] of Object.entries(lock.importers ?? {})) {
  for (const seat of ["dependencies", "devDependencies"] as const) {
    for (const [dep, row] of Object.entries(deps[seat] ?? {})) {
      if (typeof row.version === "string" && row.version.startsWith("link:")) {
        links.push({ importer, dep, row });
      }
    }
  }
}

/** The linked target's manifest version (null: target manifest unreadable). */
function targetVersion(link: string): string | null {
  try {
    return (JSON.parse(readFileSync(join(ROOT, link.slice("link:".length), "package.json"), "utf8")) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}

describe("release-lockfile-parity — the lockfile rides the bump", () => {
  it("ARM 2 — THE CENSUS EXISTS: the lockfile carries link-resolved workspace seats to judge", () => {
    expect(
      links.length,
      "no link-resolved specifiers found in pnpm-lock.yaml — the census is judging nothing (parser or lockfile format drift); this wall must be re-seated, never silently green",
    ).toBeGreaterThan(0);
  });

  it("ARM 1 — PARITY: every LITERAL link-resolved specifier equals its target manifest's version (the frozen-lockfile refusal, run pre-push)", () => {
    // workspace:* / workspace:~ are protocol seats pnpm resolves as
    // links at ANY target version — the drift class is the LITERAL
    // version specifier (the root seat pins the bump script moves).
    const drift = links
      .filter((l) => l.row.specifier !== undefined && !/^workspace:/u.test(l.row.specifier) && targetVersion(l.row.version!) !== null && l.row.specifier !== targetVersion(l.row.version!))
      .map((l) => `${l.importer} → ${l.dep}: lockfile specifier ${l.row.specifier} ≠ manifest ${targetVersion(l.row.version!)}`);
    expect(
      drift,
      `lockfile/manifest version drift — pnpm --frozen-lockfile refuses this on every CI seat (the v0.3.0-alpha Docs burn):\n${drift.join("\n")}`,
    ).toEqual([]);
  });
});
