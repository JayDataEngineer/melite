/**
 * galleryCopy.ts — THE INFER-GALLERY COPY DICTIONARY (the copy-scope
 * extension, 2026-11-05). Client UI copy is locale-owned (the estate's
 * decision, the DSH verify-client-ui-i18n law): presentation code owns
 * no copy literals; it consumes them here through the typed seat. A
 * second locale plugs into this dictionary without touching a single
 * gallery component.
 *
 * THE BOUND: static user-visible FACES live here (panel title, tab and
 * sort pills, select/confirm verbs, empty and failure states, aria
 * names, the walk + pagination faces, the kind labels, the mesh tile
 * and mesh viewer copy). Parameterized sentences whose shape is fixed
 * but whose slots are live live here as typed dict functions (the
 * square.ts pattern) — the site passes exactly the params the entry
 * declares. DATA never rides the dictionary: refusal-identity Error
 * leads (`delete failed —`, `rename failed (bad_rename_answer)`, the
 * `HTTP <status>` feed identity, the bench refusal formatting) stay in
 * artifact-ops/useFeed/bench-load — they are wire identities callers
 * and tests match, not presentation copy.
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const galleryCopy = {
  // ── MediaPanel header ────────────────────────────────────────────────
  /** The panel's title face. */
  panelTitle: "Infer Media",
  /** The header stat line's runs/artifacts body. */
  statRunsArtifacts: (p: { runs: number; artifacts: number }): string => `${p.runs} runs · ${p.artifacts} artifacts`,
  /** The header stat line's gateway-error suffix (pluralized). */
  statGatewayNotes: (p: { count: number }): string => ` · ${p.count} gateway note${p.count > 1 ? "s" : ""}`,
  /** The header stat line's truncation suffix. */
  statCapped: (p: { count: number }): string => ` · ${p.count} capped`,
  /** The flows tab pill face. */
  tabFlows: (p: { count: number }): string => `Flows ${p.count}`,
  /** The artifacts tab pill face. */
  tabArtifacts: (p: { count: number }): string => `Artifacts ${p.count}`,
  /** The sort pill: newest first. */
  sortNewest: "Newest",
  /** The sort pill: oldest first. */
  sortOldest: "Oldest",
  /** The sort pill: alphabetical by file. */
  sortAlpha: "A–Z",
  // ── Select mode ──────────────────────────────────────────────────────
  /** The multi-select toggle pill. */
  selectAction: "Select",
  /** The live selection count. */
  selectedCount: (p: { count: number }): string => `${p.count} selected`,
  /** The selection-clearing pill. */
  clearAction: "Clear",
  /** The armed destructive pill (names the count). */
  confirmDelete: (p: { count: number }): string => `Confirm delete ${p.count}?`,
  /** The un-armed destructive pill. */
  deleteSelected: "Delete selected",
  /** The search box placeholder. */
  searchPlaceholder: "search prompt, file…",
  // ── Kind chips + labels ──────────────────────────────────────────────
  /** The all-kinds chip face. */
  chipAll: "All",
  /** Kind label: video. */
  kindVideo: "Video",
  /** Kind label: images (the gallery's image face is plural). */
  kindImages: "Images",
  /** Kind label: audio. */
  kindAudio: "Audio",
  /** Kind label: 3D meshes (the tile badge's face too). */
  kindModel: "3D",
  /** Kind label: text artifacts. */
  kindText: "Text",
  // ── Sidebar tab registration (the entry's faces, the 2026-11-05 cure) ─
  /** The Media tab's chip + guide-row title (one home, both read it). */
  mediaTabTitle: "Media",
  /** The guide row's description under the Media title. */
  mediaTabGuide: "Every run's artifacts — the archive, with the lightbox, chips, search and the cards wand.",
  /** The estate-artifact tab's title when the address decodes to no file. */
  artifactFallbackTitle: "artifact",
  // ── Flows tab ────────────────────────────────────────────────────────
  /** The empty flows face. */
  emptyDrafts: "no composed cards yet — build one in a chat.",
  /** A draft row's fallback kind word when the model is unknown. */
  draftKindFallback: "card",
  // ── Artifacts states ─────────────────────────────────────────────────
  /** The open-failure banner lead. */
  openFailed: (p: { error: string }): string => `open failed: ${p.error}`,
  /** The feed-failure banner lead. */
  feedFailed: (p: { error: string }): string => `failed to load runs: ${p.error}`,
  /** The first-load face. */
  loadingRuns: "loading runs…",
  /** The empty-filter face. */
  noArtifacts: "no artifacts match.",
  // ── The history wand ─────────────────────────────────────────────────
  /** The wand's Tooltip face. */
  wandTooltip: "Open as cards — this run, live in the cards tab",
  /** The wand's accessible name. */
  wandAria: "Open as cards — this run",
  /** The in-flight restore voice beside the wand (never hover-gated). */
  restoringAction: "restoring…",
  // ── Pagination ───────────────────────────────────────────────────────
  /** The previous-page pill. */
  prevPage: "‹ Prev",
  /** The page position line. */
  pageOf: (p: { page: number; pages: number; count: number }): string => `page ${p.page} of ${p.pages} · ${p.count} artifacts`,
  /** The next-page pill. */
  nextPage: "Next ›",
  // ── Mesh tile preview (was MESH_TILE_COPY) ───────────────────────────
  /** The idle chip's label. */
  tileLoadPreview: "Preview 3D",
  /** The armed seat's collapse affordance. */
  tileClosePreview: "Close preview",
  /** The idle chip's accessible name for one artifact. */
  tileLoadPreviewOf: (file: string): string => `Load 3D preview of ${file}`,
  // ── Mesh viewer ──────────────────────────────────────────────────────
  /** The canvas's accessible name for one artifact. */
  viewOf: (file: string): string => `3D view of ${file}`,
  /** The .gltf honest failure (sidecar buffers the route never serves). */
  viewUnavailableGltf: "3D view unavailable — this .gltf references external buffers the media route does not serve. Download it to open it in a 3D tool.",
  /** The not-a-mesh honest failure, naming the file. */
  viewUnavailableNotArtifact: (p: { name: string }): string => `3D view unavailable — "${p.name}" is not a .glb/.gltf artifact.`,
  /** The loading line for one artifact. */
  loadingFile: (file: string): string => `loading ${file}…`,
  /** The estate-artifact tab's malformed-address refusal. */
  addressUnreadable: "artifact address unreadable — the viewer cannot decode it",
  // ── Shared chrome (ui.tsx) ───────────────────────────────────────────
  /** The refresh button's busy face. */
  refreshBusy: "loading…",
  /** The refresh button's idle face. */
  refreshIdle: "refresh",
  /** One gateway's warning line. */
  gatewayNote: (p: { gateway: string; message: string }): string => `gateway ${p.gateway}: ${p.message}`,
  // ── Drilldown ────────────────────────────────────────────────────────
  /** The text view's fetch-failure face. */
  textLoadFailed: "the text could not load —",
  /** The generic loading word. */
  loadingWord: "loading…",
  /** The download link face for one artifact. */
  downloadFile: (file: string): string => `download ${file}`,
  /** The sidebar hand-off link face. */
  openInSidebar: "open 3D view in sidebar",
  /** The modal title's fallback when the item has no file name. */
  previewTitleFallback: "media preview",
  /** The close button's accessible name. */
  closePreviewAria: "Close preview",
  /** The walk-previous button's accessible name. */
  prevMediaAria: "Previous media",
  /** The walk-next button's accessible name. */
  nextMediaAria: "Next media",
  /** The rename verb's face. */
  renameAction: "Rename",
  /** The rename verb's accessible name. */
  renameAria: "Rename media file",
  /** The delete verb's face. */
  deleteAction: "Delete",
  /** The delete verb's accessible name. */
  deleteAria: "Delete media file",
  /** The delete confirmation line, naming the file. */
  deleteConfirmLine: (file: string): string => `Delete ${file}?`,
  /** The deleting busy face. */
  deletingWord: "Deleting…",
  /** The delete confirmation verb's face. */
  confirmDeleteWord: "Confirm delete",
  /** The delete confirmation verb's accessible name. */
  confirmDeleteAria: "Confirm delete media file",
  /** The cancel verb's face (both mutation flows). */
  cancelWord: "Cancel",
  /** The cancel verb's accessible name in the delete flow. */
  cancelDeleteAria: "Cancel delete",
  /** The rename input's accessible name. */
  renameInputAria: "New file name",
  /** The renaming busy face. */
  renamingWord: "Renaming…",
  /** The rename save verb's face. */
  saveWord: "Save",
  /** The rename save verb's accessible name. */
  saveRenameAria: "Save new file name",
  /** The cancel verb's accessible name in the rename flow. */
  cancelRenameAria: "Cancel rename",
  /** The lightbox's escape hint. */
  escHint: "Esc or click the mask to close",
} as const;
