/**
 * index.ts — @melite/card-base: the seam layer of the melite card UI.
 *
 * THE BASE PLUGIN LAW (the @melite/viewer-base precedent, mirrored
 * 1:1): the base owns SEAMS and CONSTRUCTION only — the emission
 * contract (spec.ts), the SlotMap seams (slots.ts), the constructor
 * + the default atoms (form.tsx), the ONE input square (square.tsx),
 * and the /v1 wire facts (wire.ts). A card package EMITS; the base
 * CONSTRUCTS from the emission (operator order, 2026-09-12: "the
 * package to construct the card ui should see that the card package
 * emits an image input, then constructs the input component
 * automatically"). Cards ship client halves only as TAKEOVERS —
 * claims into the seams.
 *
 * No cordis host apply of its own — the loader's row import applies
 * the HOST marker at `exports['.']` (src/host.ts, which registers
 * nothing); this barrel is the client surface behind the /client
 * door.
 *
 * THE ONE-ROW LAW (operator order, 2026-10-01: "OUR CARD SHOULD NOT
 * DIFFER AT ALL FROM DSH-WEBVIEW... BOTH INTERFACES ON THE SAME
 * SYSTEM"): this package is ONE module-table graph row, the mirror
 * of DSH's platform-seed ui atoms (getStaticModules,
 * dsh-client-web/src/seed.ts — every bundle sees the same
 * instance). The browser face compiles ONCE into lib/client.js and
 * every card client REQUIRES it (`dsh.client.external` — the
 * loader's require, manifest.ts:15-24); no consumer bundle may
 * inline a second compiled copy. The root below therefore carries
 * the full client-consumed surface — client-plane code imports the
 * '/client' specifier only (`@melite/card-base/client` — the
 * DSH door: types resolve to src/client/index.ts, the browser
 * require hits the row through stripClientSuffix, the tsdown
 * external row matches the exact request). Node-plane consumers
 * keep the subpaths (exports resolve them normally); they avoid
 * this barrel's css faces, which node cannot execute.
 */
export * from "./abortable.js";
export * from "./spec.js";
export * from "./rejection-voice.js";
export * from "./layout.js";
export { WirePickerModal } from "./wirePicker.js";
export * from "./mods.js";
export * from "./owners.js";
export * from "./slots.js";
export * from "./wire.js";
export * from "./square.js";
export * from "./form.js";
export * from "./use-resolved.js";
export * from "./stage3d.js";
export * from "./studio.js";
export * from "./icons.js";
export * from "./chrome.js";
export * from "./toast.js";
export * from "./preview.js";
export * from "./estate-remote.js";
export * from "./cards-address.js";
export * from "./runs-policy.js";
export * from "./media-library.js";
export * from "./shell.js";
//# sourceMappingURL=index.js.map