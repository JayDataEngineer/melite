// family-coverage.spec.ts — THE FAMILY-COVERAGE WALL (2026-10-23).
//
// The lesion it kills: every earlier wall checked FAMILY truth or
// CARD truth and none checked the EDGE between them. url-liveness
// proves a DECL's URLs resolve; the registry and against-cards walls
// are exact censuses plus default-domain checks keyed by the OWNING
// card — a family owned by no card has no defaults to validate and
// passes vacuously; the dead-ref check runs card→family only. So a
// family could declare weights, resolve them live, pass every wall,
// and no card in the estate could ever run it — the operator hit the
// class head-on (card 'mask' refuses model 'mask', boards: none) and
// the census behind the refusal: 48 families, 14 cards, 26 boarded,
// 24 unboarded — 20 unoffered atoms of which 12 were bound by NO
// consumer at all, and 4 generative families (ace-step, anycreature,
// moss, skintokens) with resolving URLs and zero doors.
//
// THE CONTRACT (every family is reachable through the card plane):
// 1. BOARDED — the family id appears in at least one card's boarded
//    rows (the pickable offer; the card arm's admission check is the
//    same set).
// 2. UNOFFERED-BOUND — the DECL carries unoffered: true (a tool or
//    aux atom that must not gain a catalog row) AND at least one
//    consumer outside the family's own package names the id (a card
//    source, the flow wiring, or another family's actions). Declared
//    and consumed, or it does not ship.
// Every boarded entry must also RESOLVE: a family id or a live route
// (a variant-route offer like the tts cards' qwen3-tts-base) — a
// board naming nothing is drift the next boot inherits.
//
// Run: npx vitest run tests/walls/ts/suites/family-coverage.spec.ts
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import "../../../helpers/boot-models.ts";
import { modelsService } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { loadCardDefs, cardPackages } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import type { CardDefinition } from "../../../../packages/engines/comfyui-cordis/src/service.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const MODELS = join(ROOT, "packages/models");

/** family id -> the package dir that declares it (the DECL's home;
 *  the family id and the dir name diverge lawfully: family
 *  mask-select lives in packages/models/mask). */
function familyDirs(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of readdirSync(MODELS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const src = join(MODELS, entry.name, "src/index.ts");
    if (!existsSync(src)) continue;
    const body = readFileSync(src, "utf8");
    const id = body.match(/"id":\s*"([^"]+)"/)?.[1];
    if (id) map.set(id, join(MODELS, entry.name));
  }
  return map;
}

/** The consumer roots: every card package's src (resolved from the
 *  cardPackages SSOT rows), the flow wiring, and every OTHER family's
 *  src — a binding in another family's actions composes lawfully. */
function consumerRoots(selfDir: string): string[] {
  const roots: string[] = [];
  for (const row of cardPackages) {
    const spec = typeof row === "string" ? row : (row as { package?: string; specifier?: string }).package ?? (row as { specifier?: string }).specifier ?? "";
    const m = spec.match(/^@melite\/([a-z0-9-]+)-([a-z0-9-]+)(\/card)?$/);
    const dir = m ? join(ROOT, "packages", m[1], m[2]) : "";
    if (dir && existsSync(dir) && dir !== selfDir) roots.push(join(dir, "src"));
  }
  for (const extra of ["packages/harness/estate-queue/src", "packages/web/melite-estate/src"]) {
    const dir = join(ROOT, extra);
    if (existsSync(dir)) roots.push(dir);
  }
  return roots;
}

export type CoverageRow = {
  family: string;
  unoffered: boolean;
  boardedBy: string[];
  boundBy: string[];
};

/** The full coverage census: reachability per family, computed from
 *  the booted table, the card defs, and the consumer scan. */
export function coverageCensus(defs: Map<string, CardDefinition>): { rows: CoverageRow[]; dead: CoverageRow[]; phantomBoards: string[] } {
  const svc = modelsService();
  const families = [...svc.table.keys()].sort();
  const dirs = familyDirs();
  const routes = svc.routes instanceof Map ? svc.routes : new Map(Object.entries(svc.routes as object));
  const boardedBy = new Map<string, string[]>();
  const phantom: string[] = [];
  for (const [cid, def] of defs) {
    for (const b of def.boarded ?? []) {
      if (!families.includes(b) && !routes.has(b)) phantom.push(`${b} (boarded by card '${cid}' — resolves to no family and no route)`);
      boardedBy.set(b, [...(boardedBy.get(b) ?? []), cid]);
    }
  }
  const rows: CoverageRow[] = [];
  const dead: CoverageRow[] = [];
  for (const fam of families) {
    const boards = boardedBy.get(fam) ?? [];
    const unoffered = (svc.table.get(fam) as { unoffered?: boolean }).unoffered === true;
    let boundBy: string[] = [];
    if (unoffered && boards.length === 0) {
      const selfDir = dirs.get(fam) ?? "";
      const roots = consumerRoots(selfDir).filter((r) => r !== "");
      if (roots.length > 0) {
        try {
          const out = execFileSync("grep", ["-rl", "-F", fam, ...roots, "--include=*.ts", "--include=*.tsx"], { encoding: "utf8" });
          boundBy = out.split("\n").filter((f) => f !== "").map((f) => f.replace(ROOT + "/", ""));
        } catch {
          boundBy = [];
        }
      }
    }
    const row: CoverageRow = { family: fam, unoffered, boardedBy: boards, boundBy };
    rows.push(row);
    const reachable = boards.length > 0 || (unoffered && boundBy.length > 0);
    if (!reachable) dead.push(row);
  }
  return { rows, dead, phantomBoards: phantom };
}

describe("family-coverage (every family is reachable through the card plane)", () => {
  it("every family is boarded by a card, or declared unoffered and bound by a consumer — never declared into a void", async () => {
    const defs = await loadCardDefs();
    const { dead, phantomBoards } = coverageCensus(defs);
    const rendered = dead.map((r) =>
      r.unoffered
        ? `${r.family}: unoffered atom bound by NO consumer — declared into a void (board it, or bind it where it is consumed)`
        : `${r.family}: generative family (URLs live, catalog row served) boarded by NO card — the door is dead (boards: ${r.boardedBy.join(", ") || "none"})`,
    ).join("\n");
    expect(rendered, `${dead.length} family/families are unreachable through the card plane:\n${rendered}`).toBe("");
    expect(phantomBoards, `boarded rows naming no family and no route:\n${phantomBoards.join("\n")}`).toEqual([]);
  }, 120_000);
});
