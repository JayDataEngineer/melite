/**
 * 3d ui/viewers — the GLB VIEWER ELEMENTS (§16.9 tenant library).
 * Public surface: "@melite-plugin/3d/ui/viewers".
 *
 * MeshPoster (GLB → cached static PNG poster), AnimatedGLBViewer (the
 * interactive turntable + rig inspection), Stage (the multi-asset
 * flow viewport — TRELLIS props + Anny avatars + Kimodo motion
 * coexisting, drop-placement + gizmo repositioning; the 2026-09-04
 * operator architecture order: never embedded Blender), and the
 * poster cache store — moved out of web/editor
 * surfaces/{assets,shared} 2026-08-21: GLB rendering is 3d domain
 * (the ui/mesh + ui/viewer3d tenants already live here); kernel
 * AssetMedia / CardDetailModal consume them through the declared
 * workspace edge.
 *
 * MultiAngleGLBViewer was NOT moved: zero importers, zero tests — a
 * corpse of the pre-turntable era, deleted in the same edit.
 */
export * from "./MeshPoster";
export * from "./AnimatedGLBViewer";
export * from "./meshPosterStore";
export * from "./Stage";
