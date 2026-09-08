// @comfyui/cordis — the engine's Cordis compose plane (Law 0
// amendment, 2026-09-07). See docs/design/cordis-compose-runtime-2026-09-07.md.
export { GraphBuilder, OutputHandle } from './graph.ts'
export type { PromptGraph, NodeRef, NodeInputs, JsonValue } from './graph.ts'
export { ComfyUIService, ComposeRefusal } from './service.ts'
export type { CardDefinition } from './service.ts'
export { loadFacts } from './facts.ts'
export type { FactsFile, ModelFacts, LaneInputsFacts } from './facts.ts'
export { loadTextPair, decodeSave, stackLoras } from './blocks/render-kit.ts'
export { emitParamsSchema } from './params-emit.ts'
export type { ParamsSchema } from './params-emit.ts'
export { loadCardDefs, theService } from './cardDefs.ts'
