/**
 * timeline/dragMime — the asset-tray drag MIME payload key (DSH-pure UI
 * law: the shared UI kit is gone from this package).
 *
 * Value verbatim from the old SlotSquare tray
 * ("application/tech-noir-asset"): the audio lanes read the tray drop
 * payload through this key, and trays elsewhere still write it — the
 * wire format is unchanged, only the import moves in-package.
 */
export const ASSET_DRAG_MIME = "application/tech-noir-asset"
