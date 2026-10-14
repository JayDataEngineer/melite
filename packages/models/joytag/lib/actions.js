import { taggerSaveText, parseWeightlessFacts, assertTagInput } from "@melite/comfyui-card-kit";
/** The image prompt-inversion action: the JoyTag booru tagger —
 * LoadImage (or the wired spell), CXH_JoyTag with the add/remove
 * tag lists, SaveText under <run>/tags. */
export const tag = {
    id: "tag",
    inputs: [],
    outputs: [{ name: "text", kind: "TEXT" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the tagger
    // card schema's own types and bounds — the family door judges
    // defaults and variant presets against this row. The node takes no
    // model input (a pack-local checkpoint), so no checkpoint key
    // rides this arm.
    params: [
        { name: "input_image", type: "string" },
        { name: "threshold", type: "number", bounds: [0, 1] },
        { name: "add_tag", type: "string" },
        { name: "remove_tag", type: "string" },
    ],
    facts: parseWeightlessFacts,
    build({ p, g, runId }) {
        const img = assertTagInput(p);
        const src = img.startsWith("$") ? img : g.node("LoadImage", { image: img }).out();
        const tags = g.node("CXH_JoyTag", {
            image: src,
            THRESHOLD: p.threshold,
            addTag: p.add_tag,
            removeTag: p.remove_tag,
        });
        return taggerSaveText(g, tags.out(0), `${runId}/tags`).out();
    },
};
//# sourceMappingURL=actions.js.map
