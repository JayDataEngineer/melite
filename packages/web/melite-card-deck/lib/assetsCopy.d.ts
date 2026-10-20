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
export declare const assetsCopy: {
    /** Next-button label for the status arm. */
    readonly actionRefreshStatus: "Refresh status";
    /** Next-button label for the endpoint arm. */
    readonly actionSetEndpoint: "Set endpoint";
    /** Next-button label for the installed-packs review arm. */
    readonly actionReviewPacks: "Review installed packs";
    /** Next-button label for the declared-packs install arm. */
    readonly actionInstallDeclared: "Install declared packs";
    /** Next-button label for the raw-URL pack arm. */
    readonly actionOpenRawPack: "Open raw-URL pack install";
    /** Next-button label for the model-search arm. */
    readonly actionSearchModels: "Search models";
    /** Next-button label for the declared-model provision arm. */
    readonly actionProvisionModel: "Provision declared model";
    /** Next-button label for the raw-URL model arm. */
    readonly actionOpenRawModel: "Open raw-URL model download";
    /** Next-button label for the LoRA-list arm. */
    readonly actionListLoras: "List LoRAs the engine accepts";
    /** Next-button label for the LoRA-install arm. */
    readonly actionCopyLora: "Copy a LoRA in";
    /** Next-button label for the snapshot-review arm. */
    readonly actionReviewSnapshots: "Review snapshots";
    /** Next-button label for the snapshot-restore arm. */
    readonly actionRestoreSnapshot: "Restore snapshot";
    /** Next-button label for the launch arm. */
    readonly actionLaunch: "Launch ComfyUI";
    /** Next-button label for the restart arm. */
    readonly actionRestart: "Restart ComfyUI";
    /** Next-button label for the stop arm. */
    readonly actionStop: "Stop ComfyUI";
    /** Manager queue roll-up; params are the live queue counters. */
    readonly queueSummary: (p: {
        processing: boolean;
        active: number;
        done: number;
        total: number;
    }) => string;
    /** Freshness word for a stale status payload. */
    readonly freshnessStale: "stale";
    /** Freshness word for a just-received status payload. */
    readonly freshnessFresh: "fresh";
    /** Freshness sentence; the site feeds the live age in seconds. */
    readonly freshnessAged: (p: {
        seconds: number;
    }) => string;
    /** Received-time suffix; the site feeds the preformatted clock time. */
    readonly receivedUtc: (p: {
        time: string;
    }) => string;
    /** Health state while the first status is in flight. */
    readonly healthLoading: "Loading status";
    /** Health state when the last confirmed status is old or error-backed. */
    readonly healthStale: "Stale status";
    /** Health state when engine and manager both answer. */
    readonly healthReachable: "Engine + manager reachable";
    /** Health state when the manager door refuses. */
    readonly healthManagerFailure: "Manager failure";
    /** Health state when the engine endpoint refuses. */
    readonly healthEngineFailure: "Engine failure";
    /** Health state when no status was ever confirmed. */
    readonly healthUnavailable: "Status unavailable";
    /** Fallback label for a resource with no reference. */
    readonly resourceFallback: "resource";
    /** Accessible name of the raw result-output panes. */
    readonly resultOutputAria: "Result output";
    /** Result badge for a partial mutation. */
    readonly resultPartial: "PARTIAL";
    /** Result badge when the mutation needs a restart. */
    readonly resultRestartRequired: "RESTART REQUIRED";
    /** Result badge for a refused dispatch. */
    readonly resultRefused: "REFUSED";
    /** Result badge for a clean dispatch. */
    readonly resultOk: "OK";
    /** Accessible name of the last-mutation record. */
    readonly mutationResultAria: "Last mutation result";
    /** Accessible name of the latest-read record. */
    readonly readResultAria: "Latest read result";
    /** Fallback token when the wire names no action. */
    readonly unknownFallback: "unknown";
    /** Fallback token when the wire names no item. */
    readonly itemFallback: "item";
    /** Fallback token when a provision list is empty. */
    readonly noneFallback: "none";
    /** Kind tag of the last-mutation record. */
    readonly mutationKind: "last mutation";
    /** Kind tag of the latest-read record. */
    readonly readKind: "latest read";
    /** Result-meta label for the envelope state. */
    readonly stateLabel: "State:";
    /** Result-meta label for the envelope operation id. */
    readonly operationIdLabel: "operation_id:";
    /** Result-meta label for the refusal code. */
    readonly errorCodeLabel: "Error code:";
    /** Result-meta label for the receive time. */
    readonly receivedLabel: "Received:";
    /** Result-body label for the human detail. */
    readonly detailLabel: "Detail:";
    /** Fallback refusal code when the wire names none. */
    readonly refusedCodeFallback: "manage/refused";
    /** HTTP-status suffix; the site feeds the live status code. */
    readonly httpSuffix: (p: {
        status: number;
    }) => string;
    /** Result-flags label for the partial bit. */
    readonly partialLabel: "Partial:";
    /** Result-flags label for the restart bit. */
    readonly restartRequiredLabel: "Restart required:";
    /** Flag value for a set bit. */
    readonly yesValue: "yes";
    /** Flag value for a clear bit. */
    readonly noValue: "no";
    /** Follow-up button sentence; the site feeds the resolved action label. */
    readonly nextLabel: (p: {
        label: string;
    }) => string;
    /** Provision-flags label for the requested ids. */
    readonly requestedLabel: "Requested:";
    /** Provision-flags label for the succeeded ids. */
    readonly succeededLabel: "Succeeded:";
    /** Provision-flags label for the missed ids. */
    readonly missedLabel: "Missed:";
    /** Provision-flags label for the miss details. */
    readonly detailsLabel: "Details:";
    /** Fallback token when a provision error names no file. */
    readonly errorFileFallback: "error";
    /** Fallback token when a provision error carries no message. */
    readonly errorDetailFallback: "failed";
    /** Result-data section label for a raw payload. */
    readonly outputLabel: "Output";
    /** Resource-row operation id; the site feeds the live id. */
    readonly operationIdValue: (p: {
        id: string;
    }) => string;
    /** Confirm-sentence tail for the one-shot force control. */
    readonly forceSentence: (p: {
        on: boolean;
    }) => string;
    /** Panel title of the manager tab. */
    readonly panelTitle: "ComfyUI Manager";
    /** The sidebar guide row's description under the panel title (the tab type's guide entry). */
    readonly comfyGuide: "The estate's ComfyUI manager — packs, snapshots, status.";
    /** Health section title. */
    readonly healthTitle: "Health";
    /** Health refresh button. */
    readonly refreshButton: "Refresh";
    /** Refresh-failure note; the site feeds the live error and whether a confirmed status stands behind it. */
    readonly refreshFailedNote: (p: {
        error: string;
        showingLast: boolean;
    }) => string;
    /** Loading note while a refresh covers a confirmed status. */
    readonly refreshingNote: "Refreshing · showing the last confirmed status";
    /** Health-grid term for the engine URL. */
    readonly endpointTerm: "Endpoint";
    /** Health-grid fallback when the wire reports no value. */
    readonly notReported: "not reported";
    /** Health-grid term for the engine reachability row. */
    readonly engineTerm: "Engine";
    /** Reachability value when the door answers. */
    readonly reachableValue: "reachable";
    /** Reachability value when the door refuses. */
    readonly failureValue: "failure";
    /** Health-grid term for the ComfyUI version row. */
    readonly comfyuiTerm: "ComfyUI";
    /** Health-grid term for the manager reachability row. */
    readonly managerTerm: "Manager";
    /** Health-grid term for the manager version row. */
    readonly managerVersionTerm: "Manager version";
    /** Health-grid term for the manager queue row. */
    readonly managerQueueTerm: "Manager queue";
    /** Health-grid term for the security row. */
    readonly securityTerm: "Security";
    /** Health-grid term for the manager unit row. */
    readonly managerUnitTerm: "Manager unit";
    /** Health-grid term for the active-runs row. */
    readonly runsTerm: "Runs";
    /** Runs value when no run reads active. */
    readonly runsIdle: "idle";
    /** Runs value; the site feeds the live count and run ids. */
    readonly runsActive: (p: {
        count: number;
        names: string;
    }) => string;
    /** Health-grid term for the routing row. */
    readonly routingTerm: "Routing";
    /** Freshness prefix before the status timestamp. */
    readonly updatedLabel: "Updated";
    /** Fallback token when a device names no GPU. */
    readonly gpuFallback: "gpu";
    /** Device VRAM line; the site feeds the preformatted free/total figures. */
    readonly vramSummary: (p: {
        free: string;
        total: string;
    }) => string;
    /** Endpoint fold summary. */
    readonly endpointSettings: "Endpoint settings";
    /** Endpoint field label. */
    readonly serverUrlField: "server url";
    /** Endpoint set button. */
    readonly setButton: "Set";
    /** Result-dock section title. */
    readonly resultDockTitle: "Result dock";
    /** Result-dock clear button. */
    readonly clearResultButton: "Clear result";
    /** Declared-resources section title (the live count rides its own span). */
    readonly declaredResourcesTitle: "Declared resources";
    /** Empty state when the status names no declared resources. */
    readonly noDeclaredResources: "No declared resources reported.";
    /** Scan-wide seam note; the site feeds the live scan detail. */
    readonly resourceScanNote: (p: {
        detail: string;
    }) => string;
    /** THE CENSUS PARTIAL MARK (the anima burn, 2026-10-20: a timed-out
     * scan served its truncated roster as the whole "Declared
     * resources" truth — "1/1 failed" over byte-exact files). Rendered
     * whenever the status carries census_partial: the count is not the
     * whole truth; Refresh re-runs the scan. */
    readonly censusPartialNote: "Scan incomplete — the check ran out of its status budget before every resource was verified. Counts may be partial; press Refresh to re-scan.";
    /** THE RESOURCE ACTION DOORS (audit B2-4, the anima burn's
     *  follow-up: the fold offered no way to act on a dead row —
     *  acquire_retry/acquire_discard existed door-side only). Label
     *  for the retry door on a failed/blocked row that carries an
     *  operation_id. */
    readonly resourceRetryButton: "Retry fetch";
    /** Label for the discard door on the same rows. */
    readonly resourceDiscardButton: "Discard dead row";
    /** Confirm sentence for the retry door; the id rides it. */
    readonly resourceRetryConfirm: (p: {
        id: string;
    }) => string;
    /** Confirm sentence for the discard door; the id rides it. */
    readonly resourceDiscardConfirm: (p: {
        id: string;
    }) => string;
    /** Extensions section title. */
    readonly extensionsTitle: "Extensions";
    /** Installed-packs filter field label. */
    readonly filterInstalledField: "filter installed";
    /** Installed-packs filter placeholder. */
    readonly filterInstalledPlaceholder: "kj, moge…";
    /** Installed-packs review button. */
    readonly installedPacksButton: "Installed packs";
    /** Empty state when no pack is installed. */
    readonly noPacksInstalled: "no packs installed";
    /** Declared-registry-ids field label. */
    readonly declaredIdsField: "declared registry ids";
    /** Declared-registry-ids field placeholder. */
    readonly declaredIdsPlaceholder: "ComfyUI-KJNodes, ComfyUI-VideoHelperSuite";
    /** Declared-packs install button. */
    readonly installButton: "Install";
    /** Operator-only badge shared by the raw-URL folds. */
    readonly operatorBadge: "Operator only · raw URL";
    /** Raw-URL extension fold summary. */
    readonly installFromUrlSummary: "Install extension from URL";
    /** Raw-URL extension operator warning. */
    readonly rawUrlNote: "This bypasses the declared registry ids. Use only for an operator-vetted source.";
    /** Raw-URL extension git-URL field label. */
    readonly gitUrlField: "git URL (ComfyUI-Manager)";
    /** Raw-URL extension git-URL placeholder. */
    readonly gitUrlPlaceholder: "https://github.com/…";
    /** Raw-URL extension ref-pin field label. */
    readonly refPinField: "ref pin (commit SHA or tag, optional)";
    /** Raw-URL extension ref-pin placeholder. */
    readonly refPinPlaceholder: "leave empty to float with branch head";
    /** Raw-URL extension install button. */
    readonly installFromUrlButton: "Install from URL";
    /** Models section title. */
    readonly modelsTitle: "Models";
    /** External-index search field label. */
    readonly modelSearchField: "search Manager external index";
    /** External-index search placeholder. */
    readonly modelSearchPlaceholder: "sdxl, wan…";
    /** External-index search button. */
    readonly searchButton: "Search";
    /** Declared-model provision fold summary. */
    readonly provisionSummary: "Provision a declared model";
    /** Provision catalog-id field label. */
    readonly provisionCatalogField: "provision catalog id";
    /** Provision catalog-id placeholder. */
    readonly provisionCatalogPlaceholder: "Search declared models…";
    /** Provision variant field label. */
    readonly variantField: "variant";
    /** Provision quant field label. */
    readonly quantField: "quant";
    /** Provision variant placeholder when the catalog names no variant. */
    readonly defaultVariantPlaceholder: "Default variant";
    /** Provision quant placeholder when the variant names no quant. */
    readonly defaultQuantPlaceholder: "Default quant";
    /** Declared-model provision button. */
    readonly provisionButton: "Provision";
    /** Model-catalog seam note; the site feeds the live catalog detail. */
    readonly modelCatalogNote: (p: {
        detail: string;
    }) => string;
    /** Raw-URL model fold summary. */
    readonly downloadSummary: "Download a model from URL";
    /** Raw-URL model operator warning. */
    readonly rawDownloadNote: "Prefer a declared catalog id. Raw downloads are outside the resource declaration.";
    /** Raw-URL model download-URL field label. */
    readonly downloadUrlField: "download URL (Manager)";
    /** Raw-URL model download-URL placeholder. */
    readonly downloadUrlPlaceholder: "https://…/model.safetensors";
    /** Raw-URL model relative-path field label. */
    readonly relativePathField: "relative path";
    /** Raw-URL model relative-path placeholder. */
    readonly relativePathPlaceholder: "models/checkpoints";
    /** Raw-URL model filename field label. */
    readonly filenameField: "filename";
    /** Raw-URL model filename placeholder. */
    readonly filenamePlaceholder: "model.safetensors";
    /** Raw-URL model download button. */
    readonly downloadButton: "Download";
    /** Snapshots section title. */
    readonly snapshotsTitle: "Snapshots";
    /** Snapshot discipline note. */
    readonly snapshotsNote: "Save before update or version switch. Restore needs restart and uses its own one-shot force control.";
    /** Snapshot-list button. */
    readonly listSnapshotsButton: "List snapshots";
    /** Snapshot save button (also the snapshot_save Next label). */
    readonly saveSnapshot: "Save snapshot";
    /** Snapshot-row restore button. */
    readonly restoreButton: "Restore";
    /** Empty state when no snapshot exists. */
    readonly noSnapshots: "no snapshots — save one before switch/update";
    /** One-shot force checkbox for the next snapshot restore. */
    readonly forceRestoreLabel: "Force the next snapshot restore";
    /** Logs section title. */
    readonly logsTitle: "Logs";
    /** Log tail-lines field label. */
    readonly tailLinesField: "tail lines";
    /** Log view button. */
    readonly viewLogsButton: "View logs";
    /** Lifecycle section title. */
    readonly lifecycleTitle: "Lifecycle";
    /** Guarded-actions warning; the site feeds the live active-run count. */
    readonly guardedRunsNote: (p: {
        count: number;
    }) => string;
    /** Lifecycle restart button. */
    readonly restartButton: "Restart";
    /** Lifecycle stop button. */
    readonly stopButton: "Stop";
    /** Free-VRAM button (also the free Next label). */
    readonly freeVram: "Free VRAM";
    /** One-shot force checkbox for the next guarded lifecycle action. */
    readonly forceLifecycleLabel: "Force the next guarded lifecycle action";
    /** Advanced-update fold summary. */
    readonly advancedUpdateSummary: "Advanced update";
    /** Lifecycle update button (also the update Next label). */
    readonly updateComfyui: "Update ComfyUI";
    /** Version-switch fold summary (also the switch_version Next label). */
    readonly switchVersionSummary: "Switch ComfyUI version";
    /** Version-switch field label. */
    readonly switchToVersionField: "switch to version";
    /** Version-switch placeholder when no catalog version exists. */
    readonly switchVersionPlaceholder: "commit / tag";
    /** Version-switch placeholder when the catalog names versions. */
    readonly selectVersionPlaceholder: "Select version / tag";
    /** Version-catalog seam note; the site feeds the live catalog detail. */
    readonly versionCatalogNote: (p: {
        detail: string;
    }) => string;
    /** Version-switch button. */
    readonly switchButton: "Switch";
    /** Lifecycle note while status has never loaded. */
    readonly lifecycleLockedNote: "Lifecycle controls unlock after status loads.";
    /** Lifecycle note for a bring-your-own endpoint. */
    readonly byoNote: "BYO endpoint selected. Estate lifecycle controls are unavailable; use Endpoint settings to choose the managed engine.";
    /** Lifecycle launch button. */
    readonly launchButton: "Launch";
    /** LoRA block title. */
    readonly loraTitle: "LoRAs";
    /** LoRA refresh button once the block is open. */
    readonly loraRefresh: "Refresh";
    /** LoRA open button before the first load. */
    readonly loraShow: "Show LoRAs";
    /** LoRA discipline note while the block is closed. */
    readonly loraClosedNote: "Add a LoRA you already have: the engine accepts only the names in its own list, so copy the file in, restart, then add a row.";
    /** Engine-acceptance sentence; the site feeds the live accepted-name count. */
    readonly engineAcceptsNote: (p: {
        count: number;
    }) => string;
    /** Install-dir line; the site feeds the live directory path. */
    readonly installDirNote: (p: {
        dir: string;
    }) => string;
    /** Unboarded-rows warning lead; the site feeds the live row count. */
    readonly unboardedNote: (p: {
        count: number;
    }) => string;
    /** User-rows label (the live count and path ride their own seats). */
    readonly yourRowsLabel: "your rows:";
    /** Refused-row prefix; the site feeds the live wire problem string. */
    readonly refusedRowNote: (p: {
        row: string;
    }) => string;
    /** LoRA file-picker field label. */
    readonly loraFileField: "LoRA file (.safetensors, .ckpt, .pt, .bin, .gguf) — or drop it here";
    /** Civit download-boundary note. */
    readonly civitNote: "Downloads stay in your browser: civit.ai needs your account, so you download, the estate only copies bytes it is handed.";
    /** Absolute-path field label. */
    readonly absolutePathField: "absolute path on this machine";
    /** Absolute-path placeholder. */
    readonly absolutePathPlaceholder: "/abs/path/to/my_lora.safetensors";
    /** Families dropdown field label. */
    readonly familiesField: "families";
    /** Families empty option when the provision catalog names none. */
    readonly noFamiliesOption: "no families listed";
    /** Families placeholder option when the catalog names families. */
    readonly addFamilyOption: "add a family…";
    /** LoRA copy-in button. */
    readonly copyLoraButton: "Copy LoRA in";
    /** Accessible name of a picked family's remove control; the site feeds the live family label. */
    readonly removeFamilyLabel: (p: {
        label: string;
    }) => string;
    /** Restart-boundary note after a copy. */
    readonly restartNote: "A copied file enters the engine list only after a restart — the button below asks for one.";
    /** LoRA-block restart button. */
    readonly restartEngineButton: "Restart engine";
};
/** The dictionary's key union — the typed seat's domain. */
export type AssetsCopyKey = keyof typeof assetsCopy;
//# sourceMappingURL=assetsCopy.d.ts.map