/**
 * 3d ui/viewer3d — the 3D pose viewer tenant (§16 E-TENANTS, the
 * former @melite/viewers module, byte-identical move). The index.ts IS the
 * lane marker: a ui/<subdir> is either a SLOT CLAIM ({ui.yaml +
 * component.tsx}, the overrides lane) or a TENANT LIBRARY (this index —
 * the plugin's public surface; consumers import
 * "@melite-plugin/motion/ui/viewer3d" and never a deep filename).
 *
 * Pure rendering over @melite/formats data (three.js island): the pose/mesh
 * stage + the joint manipulator runtime. STATE stays core-side
 * (the body card's store lives beside it: cards/body/bodyStudio.ts —
 * * the @melite/viewers package is DEAD, 2026-08-21).
 */
export * from "./PoseViewer3D";
export * from "./PoseEditMode";
