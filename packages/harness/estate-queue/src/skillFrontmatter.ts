// skillFrontmatter.ts — skill-leaf frontmatter parsing + the law
// gate (extracted from skillPlane.ts): the FM/KV grammars. No fs.
import type { SkillRow, StepRow } from "./skillPlane.ts";
// ---------------------------------------------------------------------------
// frontmatter (lane_disclosure 110-127)
// ---------------------------------------------------------------------------

const FM_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
const KV_RE = /^(name|description):\s*([\s\S]+?)\s*$/;

export function frontmatter(text: string): { name: string; description: string } {
  let name = "";
  let description = "";
  const m: RegExpExecArray | null = FM_RE.exec(text);
  if (m !== null) {
    for (const line of (m[1] as string).split("\n")) {
      const kv: RegExpExecArray | null = KV_RE.exec(line);
      if (kv !== null) {
        // .strip('"\'') strips ALL leading/trailing quote chars.
        const val: string = (kv[2] as string).replace(/^["']+|["']+$/g, "");
        if (kv[1] === "name") name = val;
        else description = val;
      }
    }
  }
  if (name === "") {
    const h: RegExpExecArray | null = /^#\s+(.+)$/m.exec(text);
    name = h !== null ? (h[1] as string).trim() : "";
  }
  return { name, description };
}

/** SkillRow constructor (lane_wire 190-226 shapes the row): the
 *  callers pre-gate — readDoc builds valid doc rows (exactly one of
 *  card/model, paired steps), flowRows pre-checks stages — so the
 *  refusal arms have no live caller and are not built here. */
export function gateSkill(
  id: string,
  name: string,
  description: string,
  scope: string,
  genre: string | null,
  card: string | null,
  model: string | null,
  steps: StepRow[] | null,
  stepCount: number | null,
): SkillRow {
  return {
    id,
    name,
    description,
    scope,
    genre,
    card,
    model,
    steps,
    stepCount,
  };
}
