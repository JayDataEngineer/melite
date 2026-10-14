/**
 * assetsCopy.ts — THE ASSET-BROWSER CHROME COPY DICTIONARY (the deck's
 * locale-owned copy surface, 2026-11-05). Client UI copy is locale-owned
 * (the estate's decision, mirrored from card-base's square.ts and the h3
 * studio's studioCopy.ts): presentation code owns no product-copy
 * literals; it consumes them here by property. This module is the LOCALE
 * OWNER for every user-visible string the ComfyUI Manager sidebar renders
 * — client/assets-tab.tsx (the manager tab: health, endpoint, declared
 * resources, extensions, models, snapshots, logs, lifecycle) and
 * client/lora-section.tsx (the LoRA block). Melite ships one locale
 * (English); a second locale plugs into this dictionary without touching
 * a single panel component. THE BOUND: static chrome faces live here
 * (group labels, action buttons, empty states, aria names, field labels,
 * placeholders); live wire DATA (run ids, file names, counts, version
 * rows, detail strings) rides dict functions with typed params — the
 * dictionary owns the static sentence shape, the site feeds the values.
 */

/** The typed dictionary. Keys are stable copy ids; template entries take exactly the params they declare. */
// v8 ignore next -- exercised key-by-key by the client-copy census wall (the deck tree pins zero)
export const assetsCopy = {
  /** Next-button label for the status arm. */
  actionRefreshStatus: 'Refresh status',
  /** Next-button label for the endpoint arm. */
  actionSetEndpoint: 'Set endpoint',
  /** Next-button label for the installed-packs review arm. */
  actionReviewPacks: 'Review installed packs',
  /** Next-button label for the declared-packs install arm. */
  actionInstallDeclared: 'Install declared packs',
  /** Next-button label for the raw-URL pack arm. */
  actionOpenRawPack: 'Open raw-URL pack install',
  /** Next-button label for the model-search arm. */
  actionSearchModels: 'Search models',
  /** Next-button label for the declared-model provision arm. */
  actionProvisionModel: 'Provision declared model',
  /** Next-button label for the raw-URL model arm. */
  actionOpenRawModel: 'Open raw-URL model download',
  /** Next-button label for the LoRA-list arm. */
  actionListLoras: 'List LoRAs the engine accepts',
  /** Next-button label for the LoRA-install arm. */
  actionCopyLora: 'Copy a LoRA in',
  /** Next-button label for the snapshot-review arm. */
  actionReviewSnapshots: 'Review snapshots',
  /** Next-button label for the snapshot-restore arm. */
  actionRestoreSnapshot: 'Restore snapshot',
  /** Next-button label for the launch arm. */
  actionLaunch: 'Launch ComfyUI',
  /** Next-button label for the restart arm. */
  actionRestart: 'Restart ComfyUI',
  /** Next-button label for the stop arm. */
  actionStop: 'Stop ComfyUI',
  /** Manager queue roll-up; params are the live queue counters. */
  queueSummary: (p: { processing: boolean; active: number; done: number; total: number }): string => (p.processing ? 'working' : 'idle') + ' · ' + String(p.active) + ' active · ' + String(p.done) + '/' + String(p.total) + ' complete',
  /** Freshness word for a stale status payload. */
  freshnessStale: 'stale',
  /** Freshness word for a just-received status payload. */
  freshnessFresh: 'fresh',
  /** Freshness sentence; the site feeds the live age in seconds. */
  freshnessAged: (p: { seconds: number }): string => String(p.seconds) + 's old',
  /** Received-time suffix; the site feeds the preformatted clock time. */
  receivedUtc: (p: { time: string }): string => p.time + ' UTC',
  /** Health state while the first status is in flight. */
  healthLoading: 'Loading status',
  /** Health state when the last confirmed status is old or error-backed. */
  healthStale: 'Stale status',
  /** Health state when engine and manager both answer. */
  healthReachable: 'Engine + manager reachable',
  /** Health state when the manager door refuses. */
  healthManagerFailure: 'Manager failure',
  /** Health state when the engine endpoint refuses. */
  healthEngineFailure: 'Engine failure',
  /** Health state when no status was ever confirmed. */
  healthUnavailable: 'Status unavailable',
  /** Fallback label for a resource with no reference. */
  resourceFallback: 'resource',
  /** Accessible name of the raw result-output panes. */
  resultOutputAria: 'Result output',
  /** Result badge for a partial mutation. */
  resultPartial: 'PARTIAL',
  /** Result badge when the mutation needs a restart. */
  resultRestartRequired: 'RESTART REQUIRED',
  /** Result badge for a refused dispatch. */
  resultRefused: 'REFUSED',
  /** Result badge for a clean dispatch. */
  resultOk: 'OK',
  /** Accessible name of the last-mutation record. */
  mutationResultAria: 'Last mutation result',
  /** Accessible name of the latest-read record. */
  readResultAria: 'Latest read result',
  /** Fallback token when the wire names no action. */
  unknownFallback: 'unknown',
  /** Fallback token when the wire names no item. */
  itemFallback: 'item',
  /** Fallback token when a provision list is empty. */
  noneFallback: 'none',
  /** Kind tag of the last-mutation record. */
  mutationKind: 'last mutation',
  /** Kind tag of the latest-read record. */
  readKind: 'latest read',
  /** Result-meta label for the envelope state. */
  stateLabel: 'State:',
  /** Result-meta label for the envelope operation id. */
  operationIdLabel: 'operation_id:',
  /** Result-meta label for the refusal code. */
  errorCodeLabel: 'Error code:',
  /** Result-meta label for the receive time. */
  receivedLabel: 'Received:',
  /** Result-body label for the human detail. */
  detailLabel: 'Detail:',
  /** Fallback refusal code when the wire names none. */
  refusedCodeFallback: 'manage/refused',
  /** HTTP-status suffix; the site feeds the live status code. */
  httpSuffix: (p: { status: number }): string => ' · HTTP ' + String(p.status),
  /** Result-flags label for the partial bit. */
  partialLabel: 'Partial:',
  /** Result-flags label for the restart bit. */
  restartRequiredLabel: 'Restart required:',
  /** Flag value for a set bit. */
  yesValue: 'yes',
  /** Flag value for a clear bit. */
  noValue: 'no',
  /** Follow-up button sentence; the site feeds the resolved action label. */
  nextLabel: (p: { label: string }): string => 'Next: ' + p.label,
  /** Provision-flags label for the requested ids. */
  requestedLabel: 'Requested:',
  /** Provision-flags label for the succeeded ids. */
  succeededLabel: 'Succeeded:',
  /** Provision-flags label for the missed ids. */
  missedLabel: 'Missed:',
  /** Provision-flags label for the miss details. */
  detailsLabel: 'Details:',
  /** Fallback token when a provision error names no file. */
  errorFileFallback: 'error',
  /** Fallback token when a provision error carries no message. */
  errorDetailFallback: 'failed',
  /** Result-data section label for a raw payload. */
  outputLabel: 'Output',
  /** Resource-row operation id; the site feeds the live id. */
  operationIdValue: (p: { id: string }): string => 'operation_id: ' + p.id,
  /** Confirm-sentence tail for the one-shot force control. */
  forceSentence: (p: { on: boolean }): string => ' Force override: ' + (p.on ? 'ON.' : 'OFF.'),
  /** Panel title of the manager tab. */
  panelTitle: 'ComfyUI Manager',
  /** Health section title. */
  healthTitle: 'Health',
  /** Health refresh button. */
  refreshButton: 'Refresh',
  /** Refresh-failure note; the site feeds the live error and whether a confirmed status stands behind it. */
  refreshFailedNote: (p: { error: string; showingLast: boolean }): string => 'Refresh failed: ' + p.error + (p.showingLast ? ' · showing the last confirmed status' : ''),
  /** Loading note while a refresh covers a confirmed status. */
  refreshingNote: 'Refreshing · showing the last confirmed status',
  /** Health-grid term for the engine URL. */
  endpointTerm: 'Endpoint',
  /** Health-grid fallback when the wire reports no value. */
  notReported: 'not reported',
  /** Health-grid term for the engine reachability row. */
  engineTerm: 'Engine',
  /** Reachability value when the door answers. */
  reachableValue: 'reachable',
  /** Reachability value when the door refuses. */
  failureValue: 'failure',
  /** Health-grid term for the ComfyUI version row. */
  comfyuiTerm: 'ComfyUI',
  /** Health-grid term for the manager reachability row. */
  managerTerm: 'Manager',
  /** Health-grid term for the manager version row. */
  managerVersionTerm: 'Manager version',
  /** Health-grid term for the manager queue row. */
  managerQueueTerm: 'Manager queue',
  /** Health-grid term for the security row. */
  securityTerm: 'Security',
  /** Health-grid term for the manager unit row. */
  managerUnitTerm: 'Manager unit',
  /** Health-grid term for the active-runs row. */
  runsTerm: 'Runs',
  /** Runs value when no run reads active. */
  runsIdle: 'idle',
  /** Runs value; the site feeds the live count and run ids. */
  runsActive: (p: { count: number; names: string }): string => String(p.count) + ' active · ' + p.names,
  /** Health-grid term for the routing row. */
  routingTerm: 'Routing',
  /** Freshness prefix before the status timestamp. */
  updatedLabel: 'Updated',
  /** Fallback token when a device names no GPU. */
  gpuFallback: 'gpu',
  /** Device VRAM line; the site feeds the preformatted free/total figures. */
  vramSummary: (p: { free: string; total: string }): string => p.free + ' / ' + p.total + ' GB free',
  /** Endpoint fold summary. */
  endpointSettings: 'Endpoint settings',
  /** Endpoint field label. */
  serverUrlField: 'server url',
  /** Endpoint set button. */
  setButton: 'Set',
  /** Result-dock section title. */
  resultDockTitle: 'Result dock',
  /** Result-dock clear button. */
  clearResultButton: 'Clear result',
  /** Declared-resources section title (the live count rides its own span). */
  declaredResourcesTitle: 'Declared resources',
  /** Empty state when the status names no declared resources. */
  noDeclaredResources: 'No declared resources reported.',
  /** Scan-wide seam note; the site feeds the live scan detail. */
  resourceScanNote: (p: { detail: string }): string => 'Resource scan: ' + p.detail,
  /** Extensions section title. */
  extensionsTitle: 'Extensions',
  /** Installed-packs filter field label. */
  filterInstalledField: 'filter installed',
  /** Installed-packs filter placeholder. */
  filterInstalledPlaceholder: 'kj, moge…',
  /** Installed-packs review button. */
  installedPacksButton: 'Installed packs',
  /** Empty state when no pack is installed. */
  noPacksInstalled: 'no packs installed',
  /** Declared-registry-ids field label. */
  declaredIdsField: 'declared registry ids',
  /** Declared-registry-ids field placeholder. */
  declaredIdsPlaceholder: 'ComfyUI-KJNodes, ComfyUI-VideoHelperSuite',
  /** Declared-packs install button. */
  installButton: 'Install',
  /** Operator-only badge shared by the raw-URL folds. */
  operatorBadge: 'Operator only · raw URL',
  /** Raw-URL extension fold summary. */
  installFromUrlSummary: 'Install extension from URL',
  /** Raw-URL extension operator warning. */
  rawUrlNote: 'This bypasses the declared registry ids. Use only for an operator-vetted source.',
  /** Raw-URL extension git-URL field label. */
  gitUrlField: 'git URL (ComfyUI-Manager)',
  /** Raw-URL extension git-URL placeholder. */
  gitUrlPlaceholder: 'https://github.com/…',
  /** Raw-URL extension ref-pin field label. */
  refPinField: 'ref pin (commit SHA or tag, optional)',
  /** Raw-URL extension ref-pin placeholder. */
  refPinPlaceholder: 'leave empty to float with branch head',
  /** Raw-URL extension install button. */
  installFromUrlButton: 'Install from URL',
  /** Models section title. */
  modelsTitle: 'Models',
  /** External-index search field label. */
  modelSearchField: 'search Manager external index',
  /** External-index search placeholder. */
  modelSearchPlaceholder: 'sdxl, wan…',
  /** External-index search button. */
  searchButton: 'Search',
  /** Declared-model provision fold summary. */
  provisionSummary: 'Provision a declared model',
  /** Provision catalog-id field label. */
  provisionCatalogField: 'provision catalog id',
  /** Provision catalog-id placeholder. */
  provisionCatalogPlaceholder: 'Search declared models…',
  /** Provision variant field label. */
  variantField: 'variant',
  /** Provision quant field label. */
  quantField: 'quant',
  /** Provision variant placeholder when the catalog names no variant. */
  defaultVariantPlaceholder: 'Default variant',
  /** Provision quant placeholder when the variant names no quant. */
  defaultQuantPlaceholder: 'Default quant',
  /** Declared-model provision button. */
  provisionButton: 'Provision',
  /** Model-catalog seam note; the site feeds the live catalog detail. */
  modelCatalogNote: (p: { detail: string }): string => 'Model catalog: ' + p.detail,
  /** Raw-URL model fold summary. */
  downloadSummary: 'Download a model from URL',
  /** Raw-URL model operator warning. */
  rawDownloadNote: 'Prefer a declared catalog id. Raw downloads are outside the resource declaration.',
  /** Raw-URL model download-URL field label. */
  downloadUrlField: 'download URL (Manager)',
  /** Raw-URL model download-URL placeholder. */
  downloadUrlPlaceholder: 'https://…/model.safetensors',
  /** Raw-URL model relative-path field label. */
  relativePathField: 'relative path',
  /** Raw-URL model relative-path placeholder. */
  relativePathPlaceholder: 'models/checkpoints',
  /** Raw-URL model filename field label. */
  filenameField: 'filename',
  /** Raw-URL model filename placeholder. */
  filenamePlaceholder: 'model.safetensors',
  /** Raw-URL model download button. */
  downloadButton: 'Download',
  /** Snapshots section title. */
  snapshotsTitle: 'Snapshots',
  /** Snapshot discipline note. */
  snapshotsNote: 'Save before update or version switch. Restore needs restart and uses its own one-shot force control.',
  /** Snapshot-list button. */
  listSnapshotsButton: 'List snapshots',
  /** Snapshot save button (also the snapshot_save Next label). */
  saveSnapshot: 'Save snapshot',
  /** Snapshot-row restore button. */
  restoreButton: 'Restore',
  /** Empty state when no snapshot exists. */
  noSnapshots: 'no snapshots — save one before switch/update',
  /** One-shot force checkbox for the next snapshot restore. */
  forceRestoreLabel: 'Force the next snapshot restore',
  /** Logs section title. */
  logsTitle: 'Logs',
  /** Log tail-lines field label. */
  tailLinesField: 'tail lines',
  /** Log view button. */
  viewLogsButton: 'View logs',
  /** Lifecycle section title. */
  lifecycleTitle: 'Lifecycle',
  /** Guarded-actions warning; the site feeds the live active-run count. */
  guardedRunsNote: (p: { count: number }): string => String(p.count) + ' active run(s). Guarded actions refuse unless their one-shot force control is ON.',
  /** Lifecycle restart button. */
  restartButton: 'Restart',
  /** Lifecycle stop button. */
  stopButton: 'Stop',
  /** Free-VRAM button (also the free Next label). */
  freeVram: 'Free VRAM',
  /** One-shot force checkbox for the next guarded lifecycle action. */
  forceLifecycleLabel: 'Force the next guarded lifecycle action',
  /** Advanced-update fold summary. */
  advancedUpdateSummary: 'Advanced update',
  /** Lifecycle update button (also the update Next label). */
  updateComfyui: 'Update ComfyUI',
  /** Version-switch fold summary (also the switch_version Next label). */
  switchVersionSummary: 'Switch ComfyUI version',
  /** Version-switch field label. */
  switchToVersionField: 'switch to version',
  /** Version-switch placeholder when no catalog version exists. */
  switchVersionPlaceholder: 'commit / tag',
  /** Version-switch placeholder when the catalog names versions. */
  selectVersionPlaceholder: 'Select version / tag',
  /** Version-catalog seam note; the site feeds the live catalog detail. */
  versionCatalogNote: (p: { detail: string }): string => 'Version catalog: ' + p.detail,
  /** Version-switch button. */
  switchButton: 'Switch',
  /** Lifecycle note while status has never loaded. */
  lifecycleLockedNote: 'Lifecycle controls unlock after status loads.',
  /** Lifecycle note for a bring-your-own endpoint. */
  byoNote: 'BYO endpoint selected. Estate lifecycle controls are unavailable; use Endpoint settings to choose the managed engine.',
  /** Lifecycle launch button. */
  launchButton: 'Launch',
  /** LoRA block title. */
  loraTitle: 'LoRAs',
  /** LoRA refresh button once the block is open. */
  loraRefresh: 'Refresh',
  /** LoRA open button before the first load. */
  loraShow: 'Show LoRAs',
  /** LoRA discipline note while the block is closed. */
  loraClosedNote: 'Add a LoRA you already have: the engine accepts only the names in its own list, so copy the file in, restart, then add a row.',
  /** Engine-acceptance sentence; the site feeds the live accepted-name count. */
  engineAcceptsNote: (p: { count: number }): string => 'The engine accepts ' + String(p.count) + ' LoRA name(s) — a name outside its list refuses at run time, so add the file first.',
  /** Install-dir line; the site feeds the live directory path. */
  installDirNote: (p: { dir: string }): string => 'install dir: ' + p.dir,
  /** Unboarded-rows warning lead; the site feeds the live row count. */
  unboardedNote: (p: { count: number }): string => String(p.count) + ' of your row(s) are not in the engine list yet (install the file, then restart the engine):',
  /** User-rows label (the live count and path ride their own seats). */
  yourRowsLabel: 'your rows:',
  /** Refused-row prefix; the site feeds the live wire problem string. */
  refusedRowNote: (p: { row: string }): string => 'refused row — ' + p.row,
  /** LoRA file-picker field label. */
  loraFileField: 'LoRA file (.safetensors, .ckpt, .pt, .bin, .gguf) — or drop it here',
  /** Civit download-boundary note. */
  civitNote: 'Downloads stay in your browser: civit.ai needs your account, so you download, the estate only copies bytes it is handed.',
  /** Absolute-path field label. */
  absolutePathField: 'absolute path on this machine',
  /** Absolute-path placeholder. */
  absolutePathPlaceholder: '/abs/path/to/my_lora.safetensors',
  /** Families dropdown field label. */
  familiesField: 'families',
  /** Families empty option when the provision catalog names none. */
  noFamiliesOption: 'no families listed',
  /** Families placeholder option when the catalog names families. */
  addFamilyOption: 'add a family…',
  /** LoRA copy-in button. */
  copyLoraButton: 'Copy LoRA in',
  /** Accessible name of a picked family's remove control; the site feeds the live family label. */
  removeFamilyLabel: (p: { label: string }): string => 'remove family ' + p.label,
  /** Restart-boundary note after a copy. */
  restartNote: 'A copied file enters the engine list only after a restart — the button below asks for one.',
  /** LoRA-block restart button. */
  restartEngineButton: 'Restart engine',
} as const

/** The dictionary's key union — the typed seat's domain. */
export type AssetsCopyKey = keyof typeof assetsCopy
