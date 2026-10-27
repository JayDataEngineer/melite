// THE MOD-FACE CONTRACTS (stroke 79 — the seam-law unification;
// REWORKED stroke 95 — the mask leaf rework, the operator's
// design: "Inputs bar, then the Mods bar; the mods open a popup
// with visual preview"): the leaf-face owner props live HERE, in
// the shared contracts package, beside their siblings
// (PreviewOwnerProps in stagePreview.ts, StageViewOwnerProps in
// stageView.ts, the regions Props) — never inside the consumer
// package that first hosted them. A leaf face is a HOST-delivered
// component: the card DECLARES the face (leaf_face on the kind
// row), the fold SERVES it verbatim, the client plane delivers
// the component, and the base degrades without it (the plain
// inputs hold). These props are pure data + callbacks — no React
// types ride, so any plane (the client bundle, a test double, a
// future non-React host) can speak the contract.
//
// THE EMBEDDED LAW (stroke 95): a leaf face is an EMBEDDED CANVAS
// — the visual preview INSIDE the mod leaf popup, never a nested
// modal behind a button. The face renders the reference image
// with its interaction (a dragged rectangle; brush strokes) and
// reports EVERY committed change through `onChange` — the leaf's
// own Add/Save/Cancel buttons own the commit chrome. The retired
// modal-shaped contracts (onSave/onCancel + a fixed backdrop)
// died with the verb buttons that opened them.
export {};
//# sourceMappingURL=modifierFaces.js.map