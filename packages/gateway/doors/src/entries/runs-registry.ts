// Loadable address for the runs-registry provider (stroke 2b):
// the manifest row imports this subpath and mounts its default
// export — one address per plugin (the MCP-as-cards rail). Provides
// ctx.runs (RunsService: the RUNS Map + bus slot + probe); every
// runs-plane consumer injects it.
export { runsRegistry as default } from "../doors/flowsRun.ts";
