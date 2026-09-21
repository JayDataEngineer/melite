// skillCatalog.ts — THE SELECTION CATALOG (the skill-system rework's
// closing stroke, 2026-09-21). THE CATALOG IS THE SELECTION, nothing
// else: a DSH skill provider whose list() serves ZERO rows when the
// bench is empty (discovery stays a paid tool call — melite_discover
// bootstraps its own vocabulary), and exactly the bench's
// card+family craft rows the moment a stage lands (the operator's
// remembered system: "when the family was called, its skills
// carried on automatically").
//
// THE INVALIDATE WIRE (the first proof run's lesson): the skills
// seat snapshots once before the first request — a mid-session
// stage landing reaches the model ONLY through control.invalidate()
// re-snapshotting the catalog into a complete-replacement
// system-reminder. The wire below fingerprints the drafts storage's
// bench docs (name+mtime+size) and invalidates on change — the
// catalog follows the bench with one poll's latency, no context
// spent until it changes.
import { join } from "node:path";
import type { Context } from "@deepseek-ai/cordis";
import { benchPicks, benchFingerprint } from "@melite/estate-queue";
import type { StagePick } from "@melite/estate-queue";
export { benchPicks, benchFingerprint };
export type { StagePick };
import { hSkillRead, modelRows, cardRows, engineDirs } from "@melite/estate-queue";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import type { SkillRow } from "@melite/estate-queue";

interface MeliteCandidate {
  name: string;
  description: string;
  whenToUse: string;
  source: string;
  rank: number;
  provider: string;
  content: string;
  invocation: { modelInvocable: boolean; userInvocable: boolean };
}

const INVOCATION = { modelInvocable: true, userInvocable: true } as const;


function kebab(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

/** The selection's rows: the card's entrance doc + its skills, the
 *  family's lane doc + its skills. NOTHING else. */
export function selectionRows(picks: StagePick[], stateRoot: string): MeliteCandidate[] {
  const repo = resolveRepoRoot();
  const cards = new Set(picks.map((p) => p.card).filter((c): c is string => c !== null));
  const models = new Set(picks.map((p) => p.model).filter((m): m is string => m !== null));
  if (cards.size === 0 && models.size === 0) return [];
  const wanted: SkillRow[] = [];
  for (const engine of engineDirs(join(repo, "packages", "engines"))) {
    for (const r of modelRows(engine)) {
      if (r.row.model !== null && models.has(r.row.model)) wanted.push(r.row);
    }
    for (const r of cardRows(engine, repo).rows) {
      if (r.row.card !== null && cards.has(r.row.card)) wanted.push(r.row);
    }
  }
  const seen = new Set<string>();
  const out: MeliteCandidate[] = [];
  for (const row of wanted) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const owner = row.model ?? row.card ?? "estate";
    const isEntrance = row.id === `model:${owner}` || row.id === `card:${owner}`;
    const stem = row.id.split(":").slice(-1)[0] ?? "";
    const name = kebab(isEntrance ? `${owner}-lane` : `${owner}-${stem}`);
    if (name === "") continue;
    let content = "";
    try {
      const read = hSkillRead(repo, stateRoot, row.id) as { status: number; payload?: { content?: unknown } };
      if (read.status === 200 && typeof read.payload?.content === "string") content = read.payload.content;
    } catch {
      // a read failure serves the row's description only
    }
    out.push({
      name,
      description: row.description !== "" ? row.description : `${stem} craft for ${owner}`,
      whenToUse: `composing ${owner} on the Melite estate`,
      source: "melite",
      rank: 50,
      provider: "melite",
      content,
      invocation: INVOCATION,
    });
  }
  return out;
}

/** The provider plugin. Registers into the DSH skills seat; the
 *  fingerprint poll below is THE INVALIDATE WIRE — a bench edit
 *  re-snapshots the catalog (complete:false also keeps every
 *  observation uncacheable; the poll is what makes the change
 *  REACH the seat mid-session). */
export const SKILL_CATALOG_SEAT_NAME = "melite-skill-catalog";
