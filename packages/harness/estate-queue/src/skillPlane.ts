// skillPlane.ts — the skills plane, RE-HOMED (REBUILD-16,
// 2026-09-10): the dead gateway's planes.ts skill arms (killed
// with the gateway app) port here BESIDE their peers — the skill
// INDEX (GET /v1/skills), the skill READ (GET /v1/skills/:id),
// the doc-tree walkers (modelRows / cardRows / engineDirs), the
// SkillRow gate + wire shape, and the flow rows (LEVEL 4: one
// gated row per registry declaration). The contiguous spans
// planes.ts:151-1090 (errors/fmt/flow decls/fs/walks) and
// 1195-1260 (FlowRow + registryBody + flowRows) port wholesale
// the manifest/orientation block between them (the lane-bundle
// machinery) is the LOAD stroke's
// meat, not the skills'. The skill.read ledger ride is preserved
// (appendLedger → the queue core's own seam, gateway ledger
// 2241-2250).
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DIR_ID_ALIASES, disclosureRoot, stem } from "./skillFs.ts";
import { gateSkill } from "./skillFrontmatter.ts";
import { projectToolProperties, flowDecls, readDoc, spawnRows, engineDirs, modelRows, cardRows, registryBody, flowRows } from "./skillRows.ts";
// the extracted planes re-export through the skill plane's door
export { disclosureRoot } from "./skillFs.ts";
export { engineDirs, modelRows, cardRows, flowRows } from "./skillRows.ts";
import { appendLedger } from "./queue.ts";
import {
  expandRegistryFlow,
  getRegistryFlow,
  registryFlowNames,
  registrySkillBody,
} from "./flowsData.ts";

/** A wire-contract refusal the disclosure engine could not
 *  construct around — the doors translate it to a structured 500
 *  (lane_disclosure.LaneWireError 100-102; the class NAME rides the
 *  boot error text via _section, so it stays "LaneWireError"). */
export class LaneWireError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaneWireError";
  }
}

// path scalars







// ---------------------------------------------------------------------------
// roots
// ---------------------------------------------------------------------------

/** Process boot seconds (Gateway.boot_at 1074: construction time;
 *  the module loads at server boot — the same instant). */
const BOOT_AT: number = Date.now() / 1000;

// ---------------------------------------------------------------------------
// the flow declarations (the flows registry — flowsData.ts, re-homed
// REBUILD-13 from the dead gateway package)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// lane-wire gates (lax wire validation)
// ---------------------------------------------------------------------------

export interface ManifestRow {
  readonly name: string;
  readonly version: number;
  readonly kind: string;
  readonly card: string;
  readonly flow: string;
  // PURGE S-snapshots: null rides (a model-less base row's model is
  // null — the /v1/tools door serves it verbatim, so the projection
  // preserves it and the doors agree; "" and null are both
  // model-less downstream).
  readonly model: string | null;
  readonly stageTitle: string;
  readonly description: string;
  readonly paramsSchema: {
    readonly type: string;
    readonly properties: Record<string, unknown>;
    // PURGE S-snapshots: the registry projection passes the
    // emitter's output VERBATIM (the emitter omits an empty
    // required — the /v1/tools overlay serves the same object, so
    // the doors agree byte-for-byte; JSON drops undefined).
    // Gate-built rows always carry the array.
    readonly required?: string[];
  };
  readonly hidden: boolean | null;
}


export interface StepRow {
  readonly id: string;
  readonly type: string;
  readonly plugin: string;
}

export interface SkillRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly scope: string;
  readonly genre: string | null;
  readonly card: string | null;
  readonly model: string | null;
  readonly steps: StepRow[] | null;
  readonly stepCount: number | null;
}

/** The served skill shape (SkillRow.wire 224-226): exclude_none in
 *  FIELD order. */
export function wireSkill(r: SkillRow): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: r.id,
    name: r.name,
    description: r.description,
    scope: r.scope,
  };
  if (r.genre !== null) out["genre"] = r.genre;
  if (r.card !== null) out["card"] = r.card;
  if (r.model !== null) out["model"] = r.model;
  if (r.steps !== null) {
    out["steps"] = r.steps.map(
      (s: StepRow): Record<string, unknown> => ({
        id: s.id,
        type: s.type,
        plugin: s.plugin,
      }),
    );
  }
  if (r.stepCount !== null) out["step_count"] = r.stepCount;
  return out;
}

// ---------------------------------------------------------------------------
// walks (lane_disclosure 130-337)
// ---------------------------------------------------------------------------

export interface DocRow {
  readonly row: SkillRow;
  readonly path: string;
}

/** THE BINDING-VOCABULARY INDEX (the no-dump rework, 2026-09-21).
 *
 *  The operator's law: WE NEVER LIST ALL THE SKILLS AT ONCE. The
 *  flat row dump was the core breach — an agent scanning 63 rows
 *  picked a card-scoped generic ("image-craft") over the family's
 *  lane doc and ran a distilled turbo at 25 steps; the index ITSELF
 *  taught the wrong path. Disclosure flows through the OWNING
 *  SURFACE: melite_load serves a card's/family's tier-1 skill
 *  lines; THIS door serves only the vocabulary — one row per
 *  FAMILY and per CARD (skill counts + the entrance row id), plus
 *  the flow count. A skill id is never listed here.
 *
 *  `entrance` is the owning surface's AGENT.md row id (model:<mid>
 *  / card:<cname>) — null when the family ships only a GUIDE or the
 *  card only skills (nothing to read first). */
export interface BindingRow {
  readonly id: string;
  readonly genre: string | null;
  readonly skills: number;
  readonly entrance: string | null;
}

export function buildSkillIndex(repo: string): Record<string, unknown> {
  const engines: string[] = engineDirs(join(repo, "packages", "engines"));
  const families = new Map<string, { genre: string | null; skills: number; entrance: string | null }>();
  const cards = new Map<string, { genre: string | null; skills: number; entrance: string | null }>();
  let count = 0;
  try {
    for (const engine of engines) {
      for (const r of modelRows(engine)) {
        if (r.row.scope.endsWith("-spawn")) continue;
        count += 1;
        const mid = r.row.model;
        if (mid === null) continue;
        const cell = families.get(mid) ?? { genre: r.row.genre, skills: 0, entrance: null };
        if (r.row.scope === "model-skill") cell.skills += 1;
        if (r.row.scope === "model") cell.entrance = r.row.id;
        families.set(mid, cell);
      }
      for (const r of cardRows(engine, repo).rows) {
        if (r.row.scope.endsWith("-spawn")) continue;
        count += 1;
        const cname = r.row.card;
        if (cname === null) continue;
        const cell = cards.get(cname) ?? { genre: r.row.genre, skills: 0, entrance: null };
        if (r.row.scope === "card-skill") cell.skills += 1;
        if (r.row.scope === "card") cell.entrance = r.row.id;
        cards.set(cname, cell);
      }
    }
    const flows = flowRows(repo);
    count += flows.length;
    const famRows: BindingRow[] = [...families.entries()]
      .map(([id, c]) => ({ id, genre: c.genre, skills: c.skills, entrance: c.entrance }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const cardRowsOut: BindingRow[] = [...cards.entries()]
      .map(([id, c]) => ({ id, genre: c.genre, skills: c.skills, entrance: c.entrance }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return {
      count,
      families: famRows,
      cards: cardRowsOut,
      flows: { count: flows.length, ids: flows.map((f) => f.row.id) },
      note: "skills bind to their owner — open a card or family with melite_load to see its tier-1 skill lines; this index never lists skill rows",
    };
  } catch (e) {
    /* v8 ignore next -- the walks throw LaneWireError only (readDoc
       swallows I/O to null): the wrap never fires (2026-09-12) */
    if (!(e instanceof LaneWireError)) {
      throw new LaneWireError(
        "skills envelope refusal: " + (e instanceof Error ? e.message : String(e)),
      );
    }
    throw e;
  }
}

interface AgentBlock {
  readonly source: string;
  readonly name: string;
  readonly content: string;
}

/** The inline agent block (lane_disclosure._agent_block 780-793):

/** Skill lookup across flow + model + card rows
 *  (lane_disclosure.skill_read 844-863). Flow rows may carry the
 *  rendered registry text (bodyText) instead of a file path. */
export function findSkill(
  repo: string,
  sid: string,
): { row: SkillRow; path: string | null; bodyText: string | null } | null {
  for (const fr of flowRows(repo)) {
    if (fr.row.id === sid) {
      return { row: fr.row, path: fr.bodyPath, bodyText: fr.bodyText };
    }
  }
  const engines: string[] = engineDirs(join(repo, "packages", "engines"));
  for (const engine of engines) {
    for (const r of modelRows(engine)) {
      if (r.row.id === sid) return { row: r.row, path: r.path, bodyText: null };
    }
    for (const r of cardRows(engine, repo).rows) {
      if (r.row.id === sid) return { row: r.row, path: r.path, bodyText: null };
    }
  }
  return null;
}

/** GET /v1/skills/*: flow rows first, then model+card rows;
 *  success ledgers skill.read (compact envelope — queue.ts
 *  appendLedger). */
export function hSkillRead(
  repo: string,
  stateRoot: string,
  sid: string,
): { status: number; payload: unknown } {
  try {
    const found: { row: SkillRow; path: string | null; bodyText: string | null } | null =
      findSkill(repo, sid);
    if (found === null) {
      return { status: 404, payload: { error: "no such skill: " + JSON.stringify(sid) } };
    }
    // THE SPAWN PLANE DOOR LAW: `-spawn` scoped leaves are the
    // spawned subagent's private briefs — the HTTP read door
    // (skill_read, the constructor's tool) refuses them by id; the
    // spawn injection reads them through findSkill directly, never
    // through this door.
    if (found.row.scope.endsWith("-spawn")) {
      return { status: 404, payload: { error: "no such skill: " + JSON.stringify(sid) } };
    }
    let body: string;
    if (found.bodyText !== null) {
      body = found.bodyText;
    } else {
      /* v8 ignore next 3 -- every real DocRow carries a path (readDoc
         pins it; flow rows render bodies — probe 2026-09-19): the
         neither-arm is the fence against a future body-less row shape */
      if (found.path === null) {
        return { status: 500, payload: { error: "skill row carries neither body nor path" } };
      }
      try {
        body = readFileSync(found.path, "utf8");
      } catch (e) {
        /* v8 ignore next -- found paths come from the same live walk
           (TOCTOU-only): the 500 never fires (2026-09-12) */
        return {
          status: 500,
          payload: {
            error: "unreadable: " + (e instanceof Error ? e.message : String(e)),
          },
        };
      }
    }
    // SkillDocRow gate (id/name/description/scope/content) —
    // refusal is a code bug (the skill doc refusal). The rows ride
    // the walks (never empty) and "" misses 404 above — the fence
    // never fires, but it stays.
    /* v8 ignore next */
    if (
      sid.length < 1 ||
      found.row.name.length < 1 ||
      found.row.scope.length < 1
    ) {
      throw new LaneWireError(
        "skill doc refusal (" + sid + "): name: Field required",
      );
    }
    appendLedger(stateRoot, "skill.read", { id: sid });
    return {
      status: 200,
      payload: {
        id: sid,
        name: found.row.name,
        description: found.row.description,
        scope: found.row.scope,
        content: body,
      },
    };
  } catch (e) {
    /* v8 ignore next -- findSkill throws LaneWireError only and the
       journal never throws (appendLedger swallows): the rethrow never
       fires (2026-09-12) */
    if (!(e instanceof LaneWireError)) throw e;
    return { status: 500, payload: { error: (e as Error).message } };
  }
}
