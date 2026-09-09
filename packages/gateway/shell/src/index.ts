// `@melite/gateway` — the gateway BUNDLE (STAGE 1).
//
// dsh-base shape: composition + manifest ownership, code lives in
// the leaves. Re-exports the rim surface (apps/gateway imports by
// package name — the DSH app/package boundary) and owns
// cordis.patch.yml (the boot row SSOT, dsh-base `- insert:` shape)
// + dsh.bundle.patch.

export { ROUTES, ROUTE_COUNT } from "@melite/gateway-core";
export type { BodyKind, GatewayRoute } from "@melite/gateway-core";
export type { DispatchResult } from "@melite/gateway-core";
export { defaultAssetRoots, unquotePy } from "@melite/gateway-doors";
export { handleWsUpgrade } from "@melite/gateway-doors";
export { bootGatewayContext, refusalLine } from "@melite/gateway-core";
export { createProcessShutdown } from "@melite/gateway-core";
export { BOOT_ENGINE, bootState } from "@melite/gateway-core";
export { CardRegistryService } from "@melite/gateway-doors";
