// `@melite/gateway` — the gateway HTTP shell + queue.
//
// routes.ts is the AUTHORED wire SSOT (generators STEP 2 flip).
// The shell lands here (index boot, ctx + dispatcher normalization,
// queue registry, sidecar I/O) with one
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

// The app-tier rim surface (apps/gateway/src/main.ts imports by
// package name — the DSH app/package boundary): every symbol the
// rim needs is re-exported here; the rim holds no package paths.
export { dispatch } from "./ctx.ts";
export type { DispatchResult } from "./ctx.ts";
export { defaultAssetRoots, unquotePy } from "./doors/assets.ts";
export { handleWsUpgrade } from "./doors/runs.ts";
export { bootGatewayContext, refusalLine } from "./core/context.ts";
export { createProcessShutdown } from "./core/processShutdown.ts";
export { BOOT_ENGINE, bootState } from "./core/gateway.ts";
