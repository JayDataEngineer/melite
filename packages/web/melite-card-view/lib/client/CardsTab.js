// ── THE SPLIT SURFACE (hour 15): the seams live in their own files;
// this module re-exports the stable surface every importer (index.ts +
// the door-contract specs) already rides — no importer moves.
export { CardsTab, resolveCardsAddress } from "./cards-tab-body.js";
export { loadFormsEdgeMeta } from "./forms-edge-meta.js";
export { runCardStage, runBenchSequential } from "./stage-run.js";
export { previewKindFor, primaryKindFor, paramsDiffKeys, previewArtifactsFor, previewReportsFor } from "./preview-kinds.js";
export { groupStagesByCard, benchRow } from "./bench-row.js";
//# sourceMappingURL=CardsTab.js.map
