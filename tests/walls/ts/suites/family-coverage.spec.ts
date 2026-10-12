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
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

import { Context } from "@deepseek-ai/cordis";
import "../../../helpers/boot-models.ts";
import { modelsService } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { loadCardDefs, cardPackages } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import type { CardDefinition } from "../../../../packages/engines/comfyui-cordis/src/service.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";

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

  it("LANDABILITY (2026-10-24, the operator's scream — 'how does the card offer models that don't work'): every boarded offer lands its weights through a NAMED channel", async () => {
    // The second edge the mask lesion exposed: a board may RESOLVE
    // (arm 1 passes) while the weights behind it can never arrive.
    // The estate's landing channels, judged in order: unoffered (a
    // tool atom — the card's own provisions own its bytes),
    // provisions rows, a variant-cell artifact, a typed source row,
    // lane_inputs/lane_homes (the lane-file channel — the run gate
    // probes the store folder at press). An offer with NONE is one
    // of two pinned truths below, named in every run: a weights-free
    // form lane (lawful, pinned), or an engine-side-name offer (a
    // standing debt — the weights exist only if the operator
    // installed them by hand; the cure is provisions rows, and the
    // list shrinks only as those land, the store floor's own law).
    const WEIGHTS_FREE_LANES = [
      "input", // form_input passthrough — no weights vocabulary at all
    ];
    const ENGINE_SIDE_OFFERS = [
      // the taggers name their checkpoints engine-side (variant
      // resolver_defaults.checkpoint); no estate channel promises
      // the bytes — the Run press works only on a hand-stocked
      // engine. Provisions rows are the cure (audit debt, named).
      // JOY-CAPTION GRADUATION (the weightless cure): joycaption
      // left this list — its beta-one tree rides a pinned snapshot
      // row + the declared tree/home the run gate probes (the lane
      // files channel), so the debt is paid for the default.
      "florence2",
      "wd14",
    ];
    const defs = await loadCardDefs();
    const svc = modelsService();
    const unpinned: string[] = [];
    const deadOffers: string[] = [];
    for (const [cid, def] of defs) {
      for (const b of def.boarded ?? []) {
        const fam = svc.table.has(b) ? b : (svc.routes instanceof Map ? svc.routes.get(b) : undefined);
        const decl = fam !== undefined ? svc.table.get(fam) : undefined;
        if (decl === undefined) continue; // phantom boards fire in arm 1
        const channel =
          decl.unoffered === true ? "unoffered" :
          (decl.provisions ?? []).length > 0 ? "provisions" :
          (decl.variants ?? []).some((v) => (v.cells ?? []).some((c) => (c.artifact?.source_url ?? "") !== "")) ? "cell artifact" :
          (decl.source?.repo_id ?? "") !== "" ? "typed source" :
          Object.keys(decl.lane_inputs ?? {}).length > 0 ? "lane files" :
          WEIGHTS_FREE_LANES.includes(decl.id) ? "weights-free (pinned)" :
          ENGINE_SIDE_OFFERS.includes(decl.id) ? "engine-side name (pinned debt)" :
          "";
        if (channel === "") {
          deadOffers.push(`${cid} boards '${b}': no landing channel at all — the offer can never land weights`);
        }
      }
    }
    // the pinned lists are exhaustive and current: a pin naming an
    // id no board offers is stale, and an engine-side debt that
    // gained an estate channel must leave its list (the store
    // floor's own law — the list shrinks only as cures land)
    const boardedIds = new Set<string>();
    for (const def of defs.values()) for (const b of def.boarded ?? []) boardedIds.add(b);
    for (const id of [...WEIGHTS_FREE_LANES, ...ENGINE_SIDE_OFFERS]) {
      if (!boardedIds.has(id)) unpinned.push(`${id}: pinned but no card boards it — the pin is stale`);
      const decl = svc.table.get(id);
      if (decl === undefined) continue;
      const hasChannel =
        decl.unoffered === true ||
        (decl.provisions ?? []).length > 0 ||
        (decl.variants ?? []).some((v) => (v.cells ?? []).some((c) => (c.artifact?.source_url ?? "") !== "")) ||
        (decl.source?.repo_id ?? "") !== "" ||
        Object.keys(decl.lane_inputs ?? {}).length > 0;
      if (hasChannel && ENGINE_SIDE_OFFERS.includes(id)) {
        unpinned.push(`${id}: gained an estate channel — leave the engine-side debt list`);
      }
    }
    expect(deadOffers, `boarded offers whose weights can never land:\n${deadOffers.join("\n")}`).toEqual([]);
    expect(unpinned, `pinned landability lists drifted:\n${unpinned.join("\n")}`).toEqual([]);
    // the engine-side debt is NAMED, not green: this bound reds the
    // moment every tagger gains provisions — edit the list to []
    // together with that landing (ratchet, 2026-10-24).
    // JOY-CAPTION GRADUATION: 3 -> 2 — joycaption's beta-one tree
    // landed (the weightless cure); florence2 + wd14 remain.
    expect(ENGINE_SIDE_OFFERS.length, "the engine-side debt is named — provisioning one shrinks this list").toBe(2);
  }, 120_000);

  it("LANE ADMISSION (2026-10-24): every boarded offer resolves through prepareCardParams — the same code a run executes", async () => {
    // The third edge: a board may pass the registry's includes
    // check yet compose dead — the id admits but the compose
    // pipeline's resolves tri-check (facts ∪ family-fold ∪ mids)
    // refuses, so every Run press on that offer dies at phase one.
    // This arm drives the REAL compose seat (prepareCardParams,
    // one spelling with the run seat) per boarded pair and judges
    // only the lane door's voice: 'no model unit for model: …'.
    // Other compose refusals (a missing required param, a dangling
    // ref) are the param doors' truth, not this edge's.
    const defs = await loadCardDefs();
    // the compose seat reads the queue seat's stateRoots manifest for
    // the dangling sweep (J12, config-named — no env seam): a bare
    // Context throws TypeError per call and the catch would swallow
    // it into a vacuous green (the probe caught exactly that, so the
    // stub is the arm's soundness, not a convenience)
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "famcov-")),
      stateRoots: [] as string[],
    };
    const registry = new CardRegistryService(ctx);
    await registry.prime();
    const deadLanes: string[] = [];
    let probes = 0;
    for (const [cid, def] of defs) {
      for (const b of def.boarded ?? []) {
        probes += 1;
        try {
          prepareCardParams(registry, { model: b }, b, "serve");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("no model unit for model:")) {
            deadLanes.push(`${cid} boards '${b}': the compose seat refuses the id — ${msg}`);
          } else if (msg.includes("Cannot read properties of undefined")) {
            deadLanes.push(`${cid} boards '${b}': the seat itself is broken (a stub is missing) — ${msg}`);
          }
        }
      }
    }
    expect(probes, "the lane probe must drive at least one boarded pair — an empty loop is a vacuous green").toBeGreaterThan(0);
    expect(deadLanes, `boarded offers the run's own compose code cannot resolve:\n${deadLanes.join("\n")}`).toEqual([]);
    await registry.dispose?.();
  }, 120_000);
});
