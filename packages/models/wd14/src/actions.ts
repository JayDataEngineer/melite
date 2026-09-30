// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the tag action the tagger card binds. The lane is
// WEIGHTLESS — no lane_inputs exist for this family, so the facts
// door is vacuous (nothing to parse, nothing to drift); the
// checkpoint rides the variant rail's stamped param. The segment
// factory is the wd14 arm of the legacy taggerLane verbatim —
// byte-identical graphs on the same doc (proven in
// tests/action.spec.ts). Creation order IS node-id order (the
// recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { taggerSaveText } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the tag segment reads: nothing — the arm
 * is weightless (every wire value comes from params). */
export type TagFacts = Record<string, never>;

/** The gated params doc the tag segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * the arm reads its own subset of the card's union surface). */
export type TagParams = Record<string, unknown>;

/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parseTagFacts(_raw: LaneInputsFacts): TagFacts {
  return {};
}

/** The image prompt-inversion action: the WD14 booru interrogator —
 * LoadImage (or the wired spell), WD14Tagger|pysssss at the
 * confidence floors, SaveText under <run>/tags. */
export const tag: ComfyActionSpec<TagParams, TagFacts> = {
  id: "tag",
  outputs: [{ name: "text", kind: "TEXT" }],
  params: [],
  facts: parseTagFacts,
  build({ p, g, runId }) {
    const img = typeof p.input_image === "string" ? p.input_image : "";
    if (!img.trim()) {
      throw new Error("required param 'input_image' missing or blank on the tagger card (the tagger inverts an image; nothing to tag is a refusal)");
    }
    // THE SPELLED ANCHOR (same law — the arm bypasses the loader
    // for a wired image; the card admits the spell).
    const src = img.startsWith("$") ? img : g.node("LoadImage", { image: img }).out();
    const tags = g.node("WD14Tagger|pysssss", {
      image: src,
      model: p.checkpoint,
      threshold: p.threshold,
      character_threshold: p.character_threshold,
      replace_underscore: p.replace_underscore,
      trailing_comma: p.trailing_comma,
      exclude_tags: p.exclude_tags,
    });
    return taggerSaveText(g, tags.out(0), `${runId}/tags`).out();
  },
};
