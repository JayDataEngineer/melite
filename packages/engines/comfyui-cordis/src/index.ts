// `@comfyui/cordis` — the comfyui engine's Cordis package: the
// models plane (declarations, registry, derived views) AND the
// compose plane (graph builder, cards, kit lanes, firing gates) —
// ONE package, two services (ctx.models + ctx.comfyui). Merged
// 2026-09-08 (the wrong-direction merge reversed: the models plane
// folds into the cordis package, the bundle-split leaf dies; the
// root surface below is unchanged so every importer moves by
// package name only).

export * from "./catalog.ts";
export * from "./comfyui.ts";

export * from "./models/models.ts";
export * from "./models/validate.ts";
export * from "./models/catalogEmission.ts";

export { GraphBuilder, OutputHandle } from "./graph.ts";
export type { PromptGraph, NodeRef, NodeInputs, JsonValue } from "./graph.ts";
export { ComfyUIService, ComposeRefusal } from "./service.ts";
export type { CardDefinition } from "./service.ts";
export { loadFacts } from "./facts.ts";
export type { FactsFile, FactsReads, ModelFacts, LaneInputsFacts } from "./facts.ts";
export { loadTextPair, decodeSave, stackLoras } from "./blocks/render-kit.ts";
export { emitParamsSchema } from "./params-emit.ts";
export type { ParamsSchema } from "./params-emit.ts";
export { loadCardDefs, theService } from "./cardDefs.ts";
