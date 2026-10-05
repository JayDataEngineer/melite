import { taggerSaveText, TAGGER_CAPTION_TASKS } from "@melite/comfyui-card-kit";
/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parseTagFacts(_raw) {
    return {};
}
/** The image prompt-inversion action: the Florence-2 captioner —
 * LoadImage (or the wired spell), the fp16 model loader, Florence2Run
 * on the stated vision task, SaveText under <run>/tags. */
export const tag = {
    id: "tag",
    inputs: [],
    outputs: [{ name: "text", kind: "TEXT" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the tagger
    // card schema's own types and bounds — the family door judges
    // defaults and variant presets against this row. The closed task
    // set resolves from the ONE kit vocabulary, never hand-copied;
    // checkpoint is admitted (the variant rail stamps it), not
    // rendered, and the family door judges the stamp as a string.
    params: [
        { name: "input_image", type: "string" },
        { name: "checkpoint", type: "string" },
        { name: "caption_task", type: "enum", options: TAGGER_CAPTION_TASKS },
    ],
    facts: parseTagFacts,
    build({ p, g, runId }) {
        const img = typeof p.input_image === "string" ? p.input_image : "";
        if (!img.trim()) {
            throw new Error("required param 'input_image' missing or blank on the tagger card (the tagger inverts an image; nothing to tag is a refusal)");
        }
        const src = img.startsWith("$") ? img : g.node("LoadImage", { image: img }).out();
        const fl2 = g.node("DownloadAndLoadFlorence2Model", {
            model: p.checkpoint,
            precision: "fp16",
        });
        const run = g.node("Florence2Run", {
            image: src,
            florence2_model: fl2.out(),
            text_input: "",
            task: p.caption_task,
            fill_mask: true,
        });
        return taggerSaveText(g, run.out(2), `${runId}/tags`).out();
    },
};
//# sourceMappingURL=actions.js.map
