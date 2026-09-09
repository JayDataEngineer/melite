// `@melite/comfyui` — the comfyui engine's Cordis package: the
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

export { GraphBuilder, OutputHandle } from "@melite/card-kit/graph";
export type { PromptGraph, NodeRef, NodeInputs, JsonValue } from "@melite/card-kit/graph";
export { ComfyUIService, ComposeRefusal } from "./service.ts";
export type { CardDefinition } from "./service.ts";
export { loadFacts } from "@melite/card-kit/facts";
export type { FactsFile, FactsReads, ModelFacts, LaneInputsFacts } from "@melite/card-kit/facts";
export { loadTextPair, decodeSave, stackLoras } from '@melite/card-kit';
export { emitParamsSchema, emitParamsSpec } from "./params-emit.ts";
export type { ParamsSchema, ParamsSpec, ParamSpecNode } from "./params-emit.ts";
export { cardPackages, composeCards, loadCardDefs, theService } from "./cardDefs.ts";

export { cardWireName } from './service.ts'
