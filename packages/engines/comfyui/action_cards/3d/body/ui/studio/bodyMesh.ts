/**
 * bodyMesh — the Body Studio's import of the shared bind-mesh module.
 *
 * The mesh-shape surface (types, the per-coefficient fetchBindMesh
 * cache, identity-space reads, flat-position geometry) is THE shared
 * @melite/formats poserSkin module since the 2026-09-05 dedup order —
 * Body Studio (this plugin) and Pose Studio's viewer (motion plugin)
 * import the same functions and share the same cache, so a shape
 * previewed here is a zero-network hit there. This file keeps the
 * studio-local import paths (`./bodyMesh`) stable and re-exports the
 * canonical API; the implementation lives nowhere else.
 */
export {
  fetchBindMesh, fetchIdentitySpace, buildFlatPositions as buildGeometry,
  type SkinMeshData, type IdentityGroup, type LocalChangeGroup,
  type LocalChangeSpace, type CustomTargetItem, type CustomTargetSpace,
  type IdentitySpace, type PreviewPose,
} from "@melite/formats/poserSkin"
