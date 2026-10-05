import { renderGLBViewsNode } from "@melite/comfyui-card-kit";
/** The fit-seat facts door: the seat reads NOTHING off a lane
 *  (analytic bone-scale fitting — no weights load), so the door is
 *  the weightless vacuous parse, present to keep the action
 *  contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseFitFacts(_raw) {
    return {};
}
/** THE FIT ROW — the FitRow node's own declared defaults, verbatim
 *  (vendor/comfyui_extensions/melite-poser-nodes/fit_nodes.py:105-116),
 *  with ONE exception below.
 *
 *  THE BONE IS NOT A DEFAULT, BECAUSE THE ENGINE HAS NONE: the
 *  vendor's row gate refuses an empty Bone before it chooses a mode
 *  (fit_surgery.py:66-68 — "fit row needs Bone (which bone carries
 *  it)"; socket mode is chosen AFTER that check, not instead of it).
 *  A named bone belongs to the body being fitted, so it is the
 *  CALLER's value: the door's initial vocabulary carries a `text`
 *  kind for a bare name, and the flow declares the bone REQUIRED, so
 *  a request without one is refused at the door rather than here. */
export const FIT_ROW = {
    model_name: "prop",
    align: "socket",
    position: "0,0,0",
    rotation: "0,0,0",
    fit_ratio: 0.0,
    fit_ref_bone: "",
    fit_ref_bone2: "",
    seat_ratio: 0.22,
    finger_bone: "",
    thumb_bone: "",
    target_width: 0.0,
};
/** The seat action (the flow 'fit-seat' the meld chips drive):
 *  FitRow (the analytic fit row) → FitProp (body ∪ prop under the
 *  row) → the 4-view proof sheet. */
export const seat = {
    id: "seat",
    inputs: [],
    laneIndependent: true,
    outputs: [{ name: "seat", kind: "mesh" }],
    // THE BODY AND THE PROP ARE THE REQUEST (both are files the caller
    // names, both gate-validated by the flow's initialValidators); THE
    // FIT ROW IS THE VERB'S (stroke-89's law: a knob never joins the
    // request schema, and the door's own type admits only photo/glb/
    // bake_params — a stage spelling `$fit_ratio` names a key no flow
    // can declare, and the merged worker refuses it by name). The row's
    // twelve fields are the FitRow node's own declared defaults, named
    // here once so the declaration owns the verb's vocabulary.
    // THE DECLARED SURFACE (the write plane, phase 2): the three keys
    // the verb reads, typed from the fit-seat flow row's own initial
    // kinds — no fit card schema row survives (the 2026-09-16
    // retirement), so the row's `glb`, `glb` and `text` validators are
    // the door's own types.
    params: [{ name: "body", type: "string" }, { name: "prop", type: "string" }, { name: "bone", type: "string" }],
    facts: parseFitFacts,
    build({ p, g }) {
        // THE BONE IS THE CALLER'S, NOT A CONSTANT (the verb's other
        // fields are the node's declared defaults; a bone names a bone
        // in the body being fitted, which no constant can know).
        //
        // WHERE EACH CHECK LIVES: the door owns the bone's SHAPE (a bare
        // name, via the text initial kind) and its PRESENCE (the flow
        // declares it required, so a request without one never
        // registers); the engine owns whether the name EXISTS in the
        // body handed to it — the vendor resolves it against a SOMAX
        // body (mixamorig bones, fit_nodes.py:26). So a request can
        // pass every door check and still earn the engine's own verdict
        // on the bone, which is the right owner for it.
        const bone = p.bone;
        if (typeof bone !== "string" || bone.trim() === "") {
            throw new Error("fit.seat: the fit verb needs a BONE (which bone carries the prop) — the " +
                "vendor's FitRow refuses an empty one. The door's initial gate refuses an " +
                "absent or empty bone before a run registers.");
        }
        const row = g.node("FitRow", { ...FIT_ROW, bone: bone.trim() });
        const seatNode = g.node("FitProp", {
            body_glb_path: p.body,
            prop_glb_path: p.prop,
            row_json: row.out(0),
        });
        // THE PROOF SHEET IS RENDERED, NOT RETURNED (the skin verb's
        // shape): the declared output is the seated mesh, so the handle
        // is the node that produces it; the renderer stays a terminal and
        // the harvest finds its PNG there.
        renderGLBViewsNode(g, seatNode.out(0), {
            resolution: 768,
            framing: 1.2,
            focal_length: 50,
            samples: 64,
            transparent: true,
        });
        return seatNode.out(0);
    },
};
//# sourceMappingURL=actions.js.map
