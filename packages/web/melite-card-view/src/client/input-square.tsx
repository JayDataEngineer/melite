/**
 * input-square.tsx — COMPAT FACE: the ONE square lives in the base
 * (@melite/card-base/square — the construction law: an emitted
 * image/file input constructs THIS component automatically; no card
 * hand-rolls an input ever again). This module keeps the view's
 * import path stable and adds nothing of its own.
 */
export {
  ASSET_DRAG_MIME,
  DEFAULT_SQUARE_ACCEPT,
  MESH_SQUARE_ACCEPT,
  isImageUrl,
  isMeshUrl,
  readAsDataUrl,
  InputSquare,
  type InputSquareVerbs,
  type InputSquareProps,
} from '@melite/card-base/client'
