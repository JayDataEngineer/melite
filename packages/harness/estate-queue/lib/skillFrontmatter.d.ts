import type { SkillRow, StepRow } from "./skillPlane.ts";
export declare function frontmatter(text: string): {
    name: string;
    description: string;
};
/** SkillRow constructor (lane_wire 190-226 shapes the row): the
 *  callers pre-gate — readDoc builds valid doc rows (exactly one of
 *  card/model, paired steps), flowRows pre-checks stages — so the
 *  refusal arms have no live caller and are not built here. */
export declare function gateSkill(id: string, name: string, description: string, scope: string, genre: string | null, card: string | null, model: string | null, steps: StepRow[] | null, stepCount: number | null): SkillRow;
//# sourceMappingURL=skillFrontmatter.d.ts.map