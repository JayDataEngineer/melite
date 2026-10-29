// discover-h3-repair-words.spec.ts — THE H3 REPAIR-WORDS WALL
// (h3-timeline friction report F1): `discover "repair reshoot
// camera fix hands"` returned fuzzy noise with h3-timeline absent —
// the repair/reshoot/extend arms live on the h3-timeline card but
// the catalog words never named them (searchCards scores id +
// identity label/description + tags + boarded family ids; the four
// mod sections are NOT in the corpus).
//
// THE CURE (packages/video/h3-timeline/src/card.ts): the card
// DECLARES repair/reshoot/extend as retrieval tags and names
// repair/reshoot/camera/fix/hands in its identity description.
// This wall rides the REAL door (the searchCards pure over the
// LIVE card.ts words — every card file parsed, no hand-maintained
// roster) and asserts the query routes to h3-timeline FIRST with
// the WHY facets, plus per-token routing for each arm word.
//
// @contract infra-discover-h3-repair-words
//
// Run: npx vitest run --project walls tests/walls/ts/suites/discover-h3-repair-words.spec.ts
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { searchCards } from "../../../../packages/harness/estate-queue/src/discloseRegistry.ts";
import type { SearchableCard } from "../../../../packages/harness/estate-queue/src/discloseRegistry.ts";
import {
  BOARDED as H3_BOARDED,
  identity as H3_IDENTITY,
  VARIANT_ADDRESSES as H3_VARIANTS,
} from "../../../../packages/video/h3-timeline/src/card.ts";

const ROOT = join(import.meta.dirname, "../../../..");
const QUERY = "repair reshoot camera fix hands";

/** One card file's searchable surface (the discover corpus row:
 *  identity + tags + boarded — the exact facets scoreToken reads).
 *  Boarded spreads ([...BOARDED]) resolve at boot to family ids;
 *  only literal entries ride here — none of this query's words can
 *  hide in a family id (krea-2, z-image, anima, qwen-*, flux-klein,
 *  moss-*, music3, yue2, qwen3-tts: no exact/modality/operation
 *  facet fires, and the 12-point margin below dwarfs any fuzzy
 *  crumb they could add). */
function parseCardFile(file: string): { id: string; card: SearchableCard } | null {
  const src = readFileSync(file, "utf8");
  const reg = /registerCard\(\s*\{[\s\S]*?id:\s*'([^']+)'/.exec(src);
  const firstId = /id:\s*'([^']+)'/.exec(src);
  const id = (reg?.[1] ?? firstId?.[1]) as string | undefined;
  if (id === undefined) return null;
  const identBlock = /export const identity\s*=\s*\{([\s\S]*?)\n\}/.exec(src);
  const scope = identBlock?.[1] ?? src;
  const pick = (re: RegExp): string => {
    const m = re.exec(scope) ?? re.exec(src);
    return (m?.[1] ?? "") as string;
  };
  const label = pick(/label:\s*'([^']+)'/);
  const description = pick(/description:\s*'([^']+)'/);
  const genre = pick(/genre:\s*'([^']+)'/);
  const tagsBlock = /tags:\s*\[([\s\S]*?)\]/.exec(src);
  const tags = tagsBlock !== null
    ? [...(tagsBlock[1] as string).matchAll(/'([^']+)'/g)].map((m) => m[1] as string)
    : [];
  const boardedBlock = /boarded:\s*\[([\s\S]*?)\]/.exec(src);
  const boarded = boardedBlock !== null
    ? [...(boardedBlock[1] as string).matchAll(/'([^']+)'/g)].map((m) => m[1] as string)
    : [];
  return { id, card: { identity: { label, description, genre }, tags, boarded } };
}

/** THE LIVE CORPUS: every card file parsed (derived roster — the
 *  two-level packages walk, never a hand count). h3-timeline's row
 *  rides the live identity/boarded exports (the exact objects
 *  registerCard serves) with its tags read from the same file the
 *  composition reads — a copy regression (words removed from
 *  card.ts) reds the ranking below, never behind a parsed shadow
 *  of the words that matter. */
function liveCorpus(): Map<string, SearchableCard> {
  const out = new Map<string, SearchableCard>();
  const files: string[] = [];
  for (const dirent of readdirSync(join(ROOT, "packages"), { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const direct = join(ROOT, "packages", dirent.name, "src", "card.ts");
    if (existsSync(direct)) files.push(direct);
    const sub = join(ROOT, "packages", dirent.name);
    for (const subent of readdirSync(sub, { withFileTypes: true })) {
      if (!subent.isDirectory()) continue;
      const p = join(sub, subent.name, "src", "card.ts");
      if (existsSync(p)) files.push(p);
    }
  }
  for (const f of files) {
    const row = parseCardFile(f);
    if (row !== null) out.set(row.id, row.card);
  }
  // h3-timeline rides its live exports (same objects registerCard serves);
  // its tags ride the file text (the cured surface — parsed, never frozen).
  const h3Src = readFileSync(join(ROOT, "packages/video/h3-timeline/src/card.ts"), "utf8");
  const h3TagsBlock = /tags:\s*\[([\s\S]*?)\]/.exec(h3Src);
  const h3Tags = h3TagsBlock !== null
    ? [...(h3TagsBlock[1] as string).matchAll(/'([^']+)'/g)].map((m) => m[1] as string)
    : [];
  out.set("h3-timeline", {
    identity: {
      label: H3_IDENTITY.label,
      description: H3_IDENTITY.description,
      genre: (H3_IDENTITY as { genre?: string }).genre ?? "video",
    },
    tags: h3Tags,
    boarded: [...H3_BOARDED, ...H3_VARIANTS],
  });
  return out;
}

describe("discover routes the h3 repair/reshoot words to h3-timeline (friction F1)", () => {
  it("the full F1 query surfaces h3-timeline FIRST with the arm facets", () => {
    const out = searchCards(liveCorpus(), QUERY, "");
    expect(out.length, "the F1 query matches at least one card").toBeGreaterThan(0);
    expect(out[0]?.id, `the F1 query must route to h3-timeline first (got ${out.map((r) => r.id).join(", ")})`).toBe("h3-timeline");
    expect(out[0]?.score).toBe(3 + 3 + 2 + 2 + 2);
    expect(out[0]?.matched_by).toBe("tag:repair; tag:reshoot; word:camera; word:fix; word:hands");
  });

  const perToken: Array<[string, string]> = [
    ["repair", "tag:repair"],
    ["reshoot", "tag:reshoot"],
    ["extend", "tag:extend"],
    ["camera", "word:camera"],
    ["fix", "word:fix"],
    ["hands", "word:hands"],
  ];
  for (const [tok, facet] of perToken) {
    it(`the ${tok} arm-word routes to h3-timeline (${facet})`, () => {
      const out = searchCards(liveCorpus(), tok, "");
      const h3 = out.find((r) => r.id === "h3-timeline");
      expect(h3, `token '${tok}' must surface h3-timeline (got ${out.map((r) => r.id).join(", ")})`).toBeDefined();
      expect(h3?.matched_by.split("; ").includes(facet)).toBe(true);
      expect(out[0]?.id, `token '${tok}' must rank h3-timeline first`).toBe("h3-timeline");
    });
  }
});
