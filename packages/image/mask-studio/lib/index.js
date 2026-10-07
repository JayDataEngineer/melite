// index.ts — @melite/image-mask-studio's root door.
//
// The canvases stay behind their own subpath rows (./paint-canvas,
// ./bbox-canvas — React leaf faces, imported by card-view). The root
// door is the dependency-free leaf data both canvases share: the paint
// stroke ink (canvas DATA, not chrome), importable under plain Node
// with no React in the graph.
export * from "./paintInk.js";
//# sourceMappingURL=index.js.map
