import type { SkillDraft } from "./skillAuthored.ts";
import type { FlowsSeat } from "./flowsData.ts";
import type { FamilyModelsSeat } from "./flowsFamilyCompose.ts";
export { disclosureRoot } from "./skillFs.ts";
export { engineDirs, modelRows, cardRows, flowRows } from "./skillRows.ts";
/** A wire-contract refusal the disclosure engine could not
 *  construct around — the doors translate it to a structured 500
 *  (lane_disclosure.LaneWireError 100-102; the class NAME rides the
 *  boot error text via _section, so it stays "LaneWireError"). */
export declare class LaneWireError extends Error {
    constructor(message: string);
}
export interface ManifestRow {
    readonly name: string;
    readonly version: number;
    readonly kind: string;
    readonly card: string;
    readonly flow: string;
    readonly model: string | null;
    readonly stageTitle: string;
    readonly description: string;
    readonly paramsSchema: {
        readonly type: string;
        readonly properties: Record<string, unknown>;
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
export declare function wireSkill(r: SkillRow): Record<string, unknown>;
export interface DocRow {
    readonly row: SkillRow;
    readonly path: string;
    /** The inline body for a row that has no file — a flow whose text
     *  comes from the registry, and the synthesized family lane
     *  (skillRows.modelFamilyLane). Absent means the file is the body. */
    readonly bodyText?: string;
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
/**
 * The binding-vocabulary index (GET /v1/skills): the OWNING SURFACES'
 * rows for the live bench's selection — one row per FAMILY and per
 * CARD, plus the flow count. Never a skill-id listing (the
 * no-dump rework, 2026-09-21).
 *
 * @param repo the disclosure root the walks read (engines, cards,
 * flows).
 * @param queueStateRoot the queue seat's state root — the ONE-ROOT
 * law's reader half (audit 2026-10-31 §8.3, the skillPlane
 * reader/root orphan): the estate composition derives the drafts
 * WRITER's storage tree from this same root
 * (`storageRoot: join(stateRoot, "storage")`, melite-estate
 * index.ts:676), so the reader follows the writer at every
 * deployment shape — a config.stateRoot pin and the cold-profile
 * default both re-seat reader and writer together. Undefined: the
 * direct-caller fallback (the store's own default law, the
 * repo-relative tree) — a lane with no queue seat has no writer
 * either.
 * @returns the index envelope (count, families, cards, flows).
 */
export declare function buildSkillIndex(repo: string, queueStateRoot?: string): Record<string, unknown>;
/** The inline agent block (lane_disclosure._agent_block 780-793):

/** Skill lookup across flow + model + card rows
 *  (lane_disclosure.melite_skill_read 844-863). Flow rows may carry the
 *  rendered registry text (bodyText) instead of a file path. */
/** @param modelsSeat the context's models service when mounted — the
 *  flow rows compose from the seat the runs doors thread (the
 *  lane-seat law); the booted singleton otherwise */
export declare function findSkill(repo: string, sid: string, modelsSeat?: FamilyModelsSeat | null, flowsSeat?: FlowsSeat | null, stateRoot?: string): {
    row: SkillRow;
    path: string | null;
    bodyText: string | null;
} | null;
/** GET /v1/skills/*: flow rows first, then model+card rows;
 *  success ledgers skill.read (compact envelope — queue.ts
 *  appendLedger). */
/** @param modelsSeat the context's models service when mounted (the
 *  same seat-threading law as findSkill) */
export declare function hSkillRead(repo: string, stateRoot: string, sid: string, modelsSeat?: FamilyModelsSeat | null, flowsSeat?: FlowsSeat | null): {
    status: number;
    payload: unknown;
};
/** POST /v1/skills: land one authored skill doc (the agent's write
 *  door — melite_skill_write). The doc lands in the state root's
 *  authored plane and the same walk that serves tracked skills serves
 *  it: written and read are one law. The write ledgers skill.write,
 *  so which skills the agent authored is auditable exactly as which
 *  it read.
 *  @param repo the checkout root (the family seat is verified there)
 *  @param stateRoot the estate's state root
 *  @param draft the skill as the door's caller stated it
 *  @returns 200 with the served answer, or 400 carrying the refusal
 *    voice (missing field, unsafe leaf, unseated family, or an
 *    existing doc without replace) */
export declare function hSkillWrite(repo: string, stateRoot: string, draft: SkillDraft): {
    status: number;
    payload: unknown;
};
//# sourceMappingURL=skillPlane.d.ts.map