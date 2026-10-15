// index.ts — the engine-contract barrel: the pure types, the
// grammar, and the 'engines' seat provider (stroke 53).
export type {
  EngineParamValue,
  EngineStageRow,
  EngineStageOutcome,
  EngineRunOutcome,
  EngineRunOptions,
  EngineExecutor,
  EngineRecord,
  EngineRef,
} from "./types.ts";
export type { PortSpec, ParamSpec, ActionSpec } from "./vocabulary.ts";
export {
  AGENT_ENGINE_ID,
  COMFYUI_ENGINE_ID,
  CRAFT_ENGINE_ID,
  EnginesService,
  engineIdOk,
  enginesContract,
} from "./engines.ts";
export { enginesContract as default } from "./engines.ts";
