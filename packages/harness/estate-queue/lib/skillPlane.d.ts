import type { FlowsSeat } from "./flowsData.js";
import type { FamilyModelsSeat } from "./flowsFamilyCompose.js";
export { disclosureRoot } from "./skillFs.js";
export { engineDirs, modelRows, cardRows, flowRows } from "./skillRows.js";
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
export declare function buildSkillIndex(repo: string): Record<string, unknown>;
/** The inline agent block (lane_disclosure._agent_block 780-793):

/** Skill lookup across flow + model + card rows
 *  (lane_disclosure.melite_skill_read 844-863). Flow rows may carry the
 *  rendered registry text (bodyText) instead of a file path. */
/** @param modelsSeat the context's models service when mounted — the
 *  flow rows compose from the seat the runs doors thread (the
 *  lane-seat law); the booted singleton otherwise */
export declare function findSkill(repo: string, sid: string, modelsSeat?: FamilyModelsSeat | null, flowsSeat?: FlowsSeat | null): {
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
//# sourceMappingURL=skillPlane.d.ts.map
