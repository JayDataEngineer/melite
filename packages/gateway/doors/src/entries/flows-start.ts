// Loadable address for the flows-start door (STAGE 2): the
// manifest row imports this subpath and mounts its default
// export — one address per plugin (the MCP-as-cards rail).
// The named handleFlowsStart export is the ONE submit arm the
// reproduce door re-rides (the exact-resubmit, 2026-09-09): one
// code path, zero restatement.
export { flowsStartDoors as default, handleFlowsStart } from "../doors/flowsRun.ts";
