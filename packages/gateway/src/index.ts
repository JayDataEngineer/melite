// `@melite/gateway` — the gateway HTTP shell + queue.
//
// Phase 0 (.scratch/gateway-ts-map.md §5): the ROUTES generated
// mirror only. Phase 1+ lands the shell here (index boot, ctx +
// dispatcher normalization, queue registry, sidecar I/O) with one
// door module per section under src/doors/ (runs, assets, studios,
// discovery, models, drafts, manage, bridge, agent, chrome) plus
// the mcp_door port — every door calls IN to @comfyui/cordis for
// compose and PROXIES manage/lane data, never reimplements
// inference (LAW 0 / INFERENCE LAW).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, no namespaces — import type for types, .ts specifiers
// for relative imports.

export { ROUTES, ROUTE_COUNT } from "./routes.ts";
export type { BodyKind, GatewayRoute } from "./routes.ts";
