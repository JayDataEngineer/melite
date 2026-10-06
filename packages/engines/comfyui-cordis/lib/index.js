// `@melite/comfyui` — the comfyui engine's Cordis package: the
// models plane (declarations, registry, derived views) AND the
// compose plane (graph builder, cards, kit lanes, firing gates) —
// ONE package, two services (ctx.models + ctx.comfyui). Merged
// 2026-09-08 (the wrong-direction merge reversed: the models plane
// folds into the cordis package, the bundle-split leaf dies; the
// root surface below is unchanged so every importer moves by
// package name only).
export * from "./catalog.js";
export * from "./comfyui.js";
// The non-plugin execute face (walls/probes/unit — no Context) plus
// its graph row type: the tools plane's observe arm rides it to run
// one-off utility graphs (the melite_view sheet render), the same
// seat the estate's own probes use — one truth for graph submission.
export * from "./comfyui-execute.js";
export * from "./models/models.js";
export { enhanceRecipes, enhanceRecipeFor } from "./models/enhanceRecipes.js";
export * from "./models/validate.js";
export * from "./models/catalogEmission.js";
// The engine's OWN cordis copy (the registry-keyed instance its
// services are built against), re-exported for cross-copy consumers:
// the estate-queue compose rim mounts its throwaway Context on the
// instance ComfyUIService was built for (the documented two-cordis
// topology — structural seam, never instanceof across copies).
export { Context as EngineContext } from "@deepseek-ai/cordis";
export { GraphBuilder, OutputHandle } from "@melite/comfyui-card-kit/graph";
export { ComfyUIService, ComposeRefusal, resolveCardFlowOutputs } from "./service.js";
export { gatedResolve } from "./admission.js";
export { LORAS_RIDERS, LANPAINT_RIDERS, MASK_RIDERS, QVOICE_RIDERS, QVOICE_SAVE_RIDERS } from "./mods/packs.js";
export { loadFacts } from "@melite/comfyui-card-kit/facts";
export { loadTextPair, decodeSave, stackLoras } from '@melite/comfyui-card-kit';
export { emitKnob, emitParamsSchema, emitParamsSpec, emitModifierKinds } from "./params-emit.js";
export { declaredDefaults, unwalkedParams } from "./no-cheat.js";
export { assertCardIdentity, cardDefsNow, cardPackages, composeCards, composeModPlane, loadCardDefs, pluginPackage, provisionsByFamily, refreshCardDefs, theService } from "./cardDefs.js";
export { ASSET_RUNS_PREFIX, resolveLinkedInput, runsRoot } from "./linked.js";
// LIVE VOCABULARIES for serving surfaces (hand-owned, wall-pinned):
// the card-kind table (the kinds arm), the flow edge-kind set (the
// schema arm's kinds). The catalog-level slot vocabulary is DELETED
// (2026-09-18) — seat truth rides each model row's input_slots.
export { CARD_KINDS, KindValues } from "./generated/vocab.js";
export { cardWireName } from "./service.js";
//# sourceMappingURL=index.js.map
