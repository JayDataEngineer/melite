// `@melite/gateway-core` — shared gateway contracts (STAGE 1 barrel).
//
// Wire SSOT routes, admission params, ctx/dispatch types, py value
// semantics, schema verbs, storage domains. Leaf plugin — no door,
// queue, or engine code.

export * from "./routes.ts";
export * from "./routeUtil.ts";
export * from "./core/errors.ts";
export * from "./core/params.ts";
export * from "./core/pyValue.ts";
export * from "./core/assetTables.ts";
export * from "./schema/verbs.ts";
export * from "./schema/formWire.ts";
export * from "./schema/promptGuide.ts";
export * from "./storage/store.ts";
export * from "./storage/hub.ts";
export * from "./storage/plugins.ts";
export * from "./storage/domains.ts";
export * from "./storage/scan.ts";
// Composer modules LAST (ESM DFS eval order): ctx/context/gateway
// pull the doors barrel, whose module-level consts read the leaf
// consts above (DOOR_KEYS etc.) — evaluating a composer first
// strands the doors on uninitialized leaf bindings (TDZ).
export * from "./ctx.ts";
export * from "./core/gateway.ts";
export * from "./core/context.ts";
export * from "./core/processShutdown.ts";
