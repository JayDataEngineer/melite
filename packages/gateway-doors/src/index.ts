// `@melite/gateway-doors` — the 15 door plugins (STAGE 1 barrel).
//
// Explicit surface (no export *: five resolveRepoRoot copies + deep
// door helpers must not leak ambiguous names — STAGE 2 converges
// them). Plugin consts first, then the cross-package helpers the
// composer (core/context) and the rim (apps/gateway) need.

export { assetsDoors } from "./doors/assets.ts";
export { bridgesDoors } from "./doors/bridges.ts";
export { chromeDoors } from "./doors/chromeDoors.ts";
export { discoveryDoors } from "./doors/discovery.ts";
export { draftsDoors } from "./doors/drafts.ts";
export {
  flowsStartDoors,
  flowsStopDoors,
  runsRegistry,
  RunsService,
} from "./doors/flowsRun.ts";
export type { BusPublisher } from "./doors/flowsRun.ts";
export { validateDoors } from "./doors/flowsValidate.ts";
export { planesDoors } from "./doors/planes.ts";
export { flowsStatusDoors, runsDoors } from "./doors/runs.ts";
export { studiosDoors } from "./doors/studios.ts";
export { uploadsDoors } from "./doors/uploads.ts";

export {
  defaultAssetRoots,
  dumpsPy,
  parseJson,
  pyReprString,
  contentTypeOf,
  unquotePy,
  INPUT_URL_PREFIX,
  ERR_JSON,
} from "./doors/assets.ts";
export type { AssetResult } from "./doors/assets.ts";
export {
  enqueueResurrected,
  liveRunStatus,
  queueSnapshot,
  hydrateSnapshot,
  setBusPublisher,
  handleFlowsStatus,
  handleFlowsStop,
  handleFlowsStart,
  parseIncludeLog,
  resetFlowsRunForTests,
} from "./doors/flowsRun.ts";
export { handleWsUpgrade } from "./doors/runs.ts";
export {
  CardRegistryService,
  cardRegistryProvider,
  needCardRegistry,
} from "./doors/flowsCard.ts";
export type {
  CardDeclRow,
  ModelFactsRow,
  OverlaidCard,
  Phase1Card,
  PreparedCard,
} from "./doors/flowsCard.ts";
export { resolveInputDir } from "./doors/uploads.ts";
export { toolBaseRows, DIR_ID_ALIASES } from "./doors/toolProjection.ts";
export type { ToolBaseRow } from "./doors/toolProjection.ts";
