/**
 * motion ui/viewers — the MOTION (NPZ) VIEWER ELEMENTS (§16.9
 * tenant library). Public surface: "@melite-plugin/motion/ui/viewers".
 *
 * MotionViewer (skinned playback canvas), MotionPoster (frame-12
 * static poster via @melite/formats skinning), and the render-snapshot
 * cache both motion surfaces read — moved out of web/editor
 * surfaces/assets 2026-08-21: NPZ motion preview is motion domain; kernel
 * AssetMedia consumes it through the declared workspace edge.
 */
export * from "./MotionViewer.js";
export { default as MotionViewer } from "./MotionViewer.js";
export * from "./MotionPoster.js";
export * from "./motionImageStore.js";
