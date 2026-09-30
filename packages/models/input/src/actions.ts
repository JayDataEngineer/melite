// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the prep action the input-prep card binds. The lane is
// WEIGHTLESS — no model ever loads — so the facts door is vacuous
// (nothing to parse, nothing to drift). The segment factory is the
// legacy inputPrepLane verbatim (the staged-source transform:
// passthrough audio, crop/scale images — the source admission stays
// on the card) — byte-identical graphs on the same doc (proven in
// tests/action.spec.ts). Creation order IS node-id order (the
// recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the prep segment reads: nothing — the
 * lane is weightless (every wire value comes from params). */
export type PrepFacts = Record<string, never>;

/** The staged-source row the prep segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * crop/scale rows are re-validated here because the node build reads
 * their members raw). */
interface CropRow { x: number; y: number; width: number; height: number }
interface ScaleRow { width: number; height: number; method?: string }
export type PrepParams = Record<string, unknown>;

/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parsePrepFacts(_raw: LaneInputsFacts): PrepFacts {
  return {};
}

/** The staged-source transform action: audio passthrough
 * (LoadAudio→SaveAudio) or image LoadImage→[crop]→[scale]→SaveImage
 * under <run>/input_prep. */
export const prep: ComfyActionSpec<PrepParams, PrepFacts> = {
  id: "prep",
  outputs: [{ name: "image", kind: "IMAGE" }],
  params: [],
  facts: parsePrepFacts,
  build({ p, g, runId }) {
    const prefix = `${runId}/input_prep`;

    if (p.media_type === "audio") {
      const loaded = g.node("LoadAudio", { audio: p.source as string });
      return g.node("SaveAudio", { audio: loaded.out(), filename_prefix: prefix }).out();
    }

    let img: OutputHandle = g.node("LoadImage", { image: p.source as string }).out(0);
    const crop = p.crop as CropRow | undefined;
    if (crop) {
      for (const k of ["x", "y", "width", "height"] as const) {
        if (typeof crop[k] !== "number") {
          throw new Error(`crop row refused on the input-prep card: '${k}' must be a number (got ${JSON.stringify(crop[k])})`);
        }
      }
      img = g.node("ImageCrop", { image: img, x: crop.x, y: crop.y, width: crop.width, height: crop.height }).out(0);
    }
    const scale = p.scale as ScaleRow | undefined;
    if (scale) {
      if (typeof scale.width !== "number" || typeof scale.height !== "number") {
        throw new Error(`scale row refused on the input-prep card: 'width'/'height' must be numbers (got ${JSON.stringify(scale)})`);
      }
      const method = typeof scale.method === "string" ? scale.method : "lanczos";
      img = g.node("ImageScale", { image: img, upscale_method: method, width: scale.width, height: scale.height, crop: "disabled" }).out(0);
    }
    return g.node("SaveImage", { images: img, filename_prefix: prefix }).out();
  },
};
