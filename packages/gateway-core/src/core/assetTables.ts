// HAND-OWNED (frozen at the NO-ESTATE-PYTHON cut, 2026-09-08 —
// the capture_assets.py generator and its python/editor_runs +
// python/asset_ledger sources are deleted; these tables ARE the
// contract now). Edit deliberately with an assets-wall regold,
// never by regeneration.
// Frozen source of truth (probed, never hand-copied, at capture):
//   python/editor_runs.content_type_of  -> CONTENT_TYPES
//   python/editor_runs._INPUT_IMAGE_EXTS -> INPUT_EXTS
//   python/asset_ledger._MESH/_DOC      -> MESH_EXTS/DOC_EXTS
// The media-kind ext sets stay DATA: doors/assets.ts reads
// packages/web/dsh/media-plugin/media-kinds.json at request
// time (repo-anchored). Unknown exts fall back to
// application/octet-stream exactly as content_type_of does.
//
// Erasable-syntax TS only (node --experimental-strip-types):
// plain constants, no enums.

// ext (lowercase, no dot) -> wire content-type.
export const CONTENT_TYPES: Record<string, string> = {
  "aac": "application/octet-stream",
  "bmp": "application/octet-stream",
  "csv": "application/octet-stream",
  "fbx": "application/octet-stream",
  "flac": "audio/flac",
  "gif": "image/gif",
  "glb": "model/gltf-binary",
  "gltf": "model/gltf+json",
  "html": "text/html; charset=utf-8",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "json": "application/json",
  "m4a": "audio/mp4",
  "md": "text/plain; charset=utf-8",
  "mkv": "application/octet-stream",
  "mov": "application/octet-stream",
  "mp3": "audio/mpeg",
  "mp4": "video/mp4",
  "obj": "application/octet-stream",
  "ogg": "audio/ogg",
  "ply": "application/octet-stream",
  "png": "image/png",
  "stl": "application/octet-stream",
  "svg": "image/svg+xml",
  "txt": "text/plain; charset=utf-8",
  "usdz": "application/octet-stream",
  "wav": "audio/wav",
  "webm": "video/webm",
  "webp": "image/webp",
  "yaml": "text/yaml",
  "yml": "application/octet-stream",
};

// The inputs-door allowlist (ext -> content-type).
export const INPUT_EXTS: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Mesh / document extension vocab (asset_ledger kind_for).
export const MESH_EXTS: readonly string[] = ["fbx", "glb", "gltf", "obj", "ply", "stl", "usdz"];
export const DOC_EXTS: readonly string[] = ["csv", "json", "md", "txt", "yaml", "yml"];
