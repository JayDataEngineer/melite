/**
 * chromeCopy.ts — THE OPERATOR-FACING MAINTENANCE CHROME DICTIONARY.
 *
 * Client UI copy is locale-owned (the estate's decision, mirrored from
 * card-base's square.ts and h3-timeline's studioCopy.ts): presentation
 * code owns no product-copy literals; it consumes them here through the
 * typed seat. A second locale plugs into this dictionary without
 * touching a single card-view component.
 *
 * THE BOUND: the host's OWN chrome — tab labels, button text,
 * placeholders, aria names, hover titles, and the enhance-verb notes.
 * Per-card strings that come from card `identity`/result metadata are
 * DATA at the seat and stay at the seat; computed law wordings that
 * narrate a lane's own rule with live values (the rescue's Missing
 * sentences, the restore report, the progress percents) likewise ride
 * the seat — the dictionary would only rename them, not own them.
 */
/** The typed dictionary. Keys are stable copy ids; parameterized
 *  entries are functions with typed params (the call renders the exact
 *  string the literal spelled — one character unchanged). */
/** The EngineRef suffix for the graph-receipt chip faces (one home
 *  for both faces — the separator and the # mark live here, never
 *  in the client): a stamped prompt_id rides as ` · #<id>`, an
 *  absent one leaves the legacy face byte-identical. */
function engineRefSuffix(promptId) {
    return promptId !== undefined && promptId !== "" ? " · #" + promptId : "";
}
// v8 ignore next -- exercised key-by-key by the copy census wall (every entry consumed at its seats)
export const chromeCopy = {
    /** Brand badge on the flow-cards header (both planes). */
    brand: 'melite',
    /** Model slot fallback when neither the draft intent nor the call names a model. */
    flowFallback: 'flow',
    /** Legacy header state: a settled call whose result predates the draft contract. */
    cardsEarlierDraft: 'cards · earlier draft',
    /** Loading face when the draft id will never resolve (an errored call). */
    draftFailed: 'draft failed',
    /** Loading face while the draft id is still composing. */
    composing: 'composing…',
    /** Header badge when the call's args body is corrupt (never header-less). */
    argsUnparseable: 'args unparseable — corrupted call record',
    /** Retry affordance suffix after a load error. */
    retrySuffix: ' · retry',
    /** Header door to the shell's Media page (the card runs' archive). */
    openMedia: 'open media',
    /** The flow-edit card's link: opens the edited flow (the session
     *  bench) in the Cards tab — the operator's "clickable link opens
     *  the right sidebar flow view" verb. No hover title: hover text
     *  rides the estate Tip, never a native title (the tip canon). */
    openFlow: 'open flow',
    /** The flow-edit card's verdict title — the host presentCall's
     *  `Bench <verb>[ · <stage|card>]` wording, mirrored from the
     *  frozen args (the keyed toolview replaces the generic row, so
     *  the title face lives here; the copy census owns the
     *  literals — presentation code carries none). */
    constructTitle: (p) => 'Bench ' + p.verb + (p.on !== '' ? ' · ' + p.on : ''),
    /** The sidebar tab's chip + guide title — the bench page is titled this
     *  no matter which address form reached it (the address law, 2026-09-11). */
    cardsTabTitle: 'Media Flow',
    /** The cards tab guide row's description under the tab title. */
    cardsTabGuide: 'The media flow — the shared bench and its runs.',
    /** A chat file mention's tooltip title, naming the live kind + value. */
    mentionTitle: (p) => `melite ${p.kind} ${p.value} — opens the Media page`,
    /** Loading face while the draft doc hydrates. */
    cardsLoading: 'cards…',
    /** Drill title: the host's "Card " prefix over the row's own (data) title. */
    cardTitle: (p) => 'Card ' + p.name,
    /** Add-card door title + the bench grid's trailing Add tile name. */
    addCard: 'Add a card',
    /** Add-card picker close control. */
    closePicker: 'Close picker',
    /** Add-card picker search field placeholder. */
    searchPlaceholder: 'Search cards…',
    /** Add-card picker search field accessible name. */
    searchAria: 'Search cards',
    /** Bench tile title for a grouped stage (the child count is data). */
    groupTitle: (p) => 'Group (' + String(p.count) + ')',
    /** Play button hover while the pass is running. */
    passRunning: 'the pass is running',
    /** Play button hover: the pass runs every card in bench order. */
    runAllHint: 'run every card in bench order — one run per card, stop on failure',
    /** Clear button hover once armed (the second press clears). */
    clearConfirm: 'confirm: every stage leaves the bench (undo restores them)',
    /** Clear button hover while idle (the wedge cure's one-click door). */
    clearHint: 'clear the whole bench — every stage out, one rev, undo restores them',
    /** Undo button hover when the log holds an unreverted action. */
    undoHint: 'revert the newest bench action (one log entry per press — its own inverse, by rev)',
    /** Undo button hover when the log holds no unreverted action. */
    nothingToUndo: 'nothing to undo — the log holds no unreverted action',
    /** Save-flow name field placeholder. */
    flowNamePlaceholder: 'flow name',
    /** Save button hover: mint the bench as a named flow. */
    saveFlowHint: 'mint this bench as a named flow (restores from the Flows face)',
    /** Run button word (rides after the play/spinner glyph — the leading space is verbatim). */
    playLabel: ' Play',
    /** Save button word (the mint press + the save-panel confirm). */
    saveButton: 'Save',
    /** Save-panel cancel word. */
    cancelButton: 'Cancel',
    /** Tab face when the cards resource hook is absent (a broken provider, voiced loud). */
    cardsHookUnavailable: 'cards resource hook unavailable',
    /** Tab face when a live snapshot carries no value (a broken provider, voiced loud). */
    cardsNoValue: 'cards resource gave no value',
    /** Card drill close control. */
    closeCard: 'Close card',
    /** Restore button hover when the run names no draft. */
    restoreNoDraft: 'this run names no draft — nothing to restore',
    /** Restore button hover: copy the run's stages back onto the bench. */
    restoreHint: 'copy this run’s stages back onto the bench as your own',
    /** Draft face back button (the stage left the draft). */
    backToBench: 'Back to the bench',
    /** Run face back button. */
    backToBenchRun: 'Back to bench',
    /** Extension-rescue install button hover (the DECL owns the URL). */
    installViaManage: 'install via /v1/manage (the declaration owns the URL)',
    /** Weight popup title once the acquisition landed. */
    weightReady: 'Weight ready',
    /** Weight popup close control (both faces). */
    closeWeightPopup: 'Close weight popup',
    /** Weight button hover when no stage names the owning family or card. */
    noProvisionTarget: 'no stage names the owning family or card — provision via the agent door',
    /** Weight button hover (the DECL owns the URL). */
    downloadViaManage: 'download via /v1/manage (the declaration owns the URL)',
    /** Weight popup title on a missing model file. */
    missingWeight: 'Missing weight',
    /** Restart face: the engine is restarting (the full door — reload, then Run). */
    restartWaiting: 'Restarting… waiting for the engine to become active. Reload the page or engine, then press Run.',
    /** Restart face: the engine is restarting (the short door beside the button). */
    restartWaitingShort: 'Restarting… waiting for the engine to become active.',
    /** Rescue done face: the caller's own re-run. */
    runAgain: 'Run again',
    /** Weight offer button word (the dismissed popup's inline offer). */
    downloadWeight: 'Download weight',
    /** Weight tracker note while the download polls acquire_weight. */
    downloadingLive: 'Downloading… live bytes from the estate (polling acquire_weight).',
    /** Weight tracker rate line once polls have timed the flight (the
     *  operator's "TRACKING OF BYTES ALONE IS INEXCUSABLE" burn):
     *  the status is the core's human rate/ETA voice ("247.6 MB/s ·
     *  ~8 s left", or "stalled — no bytes landing"). */
    weightRateLive: (p) => 'Downloading… ' + p.status + ' — live from the estate.',
    /** Tile spinner accessible name while the row runs. */
    tileRunning: 'running',
    /** Tile + drill percent faces' accessible name. */
    progressPercent: 'progress percent',
    /** Tile trash button accessible name. */
    removeStage: 'Remove stage',
    /** Tile + zoom stop button accessible name. */
    stopRun: 'Stop run',
    /** Tile + zoom run button accessible name. */
    runStage: 'Run stage',
    /** Tile wired-mark hover (the agent-recorded inputs.source edge). */
    sourceWired: 'source wired',
    /** Tile health-face hover (the transport word is data). */
    transportTitle: (p) => 'transport ' + p.health,
    /** Enhance note: the verb is already in flight. */
    enhanceAlreadyRunning: 'enhance already running',
    /** Enhance note: the prompt field is empty. */
    enhanceEmptyPrompt: 'nothing to enhance — the prompt is empty',
    /** Enhance note: no model selected for the enhance call. */
    enhanceNoModel: 'no model to enhance with — pick a Model first',
    /** Enhance note: the call succeeded but swept nothing (the server's field list is data). */
    enhanceNoFields: (p) => 'the enhancer returned no declared fields (' + p.fields + ')',
    /** Enhance note: the sweep landed N fields via the named route. */
    enhancedVia: (p) => 'enhanced via ' + p.via + ' (' + String(p.count) + ' field' + (p.count === 1 ? '' : 's') + ')',
    /** Enhance note: the sweep landed N fields (no route named). */
    enhancedCount: (p) => 'enhanced (' + String(p.count) + ' field' + (p.count === 1 ? '' : 's') + ')',
    /** Drill webhook feed's activity line accessible name. */
    engineActivity: 'engine activity',
    /** Preview seat's media-drilldown opener accessible name. */
    openMediaDrilldown: 'Open media drilldown',
    /** Zoom overlay + bar accessible name ("Stage " over the row's own name, which is data). */
    stageAria: (p) => 'Stage ' + p.name,
    /** Zoom model-dropdown accessible name (the enhance verb's selector). */
    enhanceModelAria: 'Enhance model',
    /** Zoom enhance capsule accessible name. */
    agentEnhanceAria: 'Agent Enhance',
    /** Zoom enhance capsule word (the ✦ verb's own mark — the estate's agent-enhance brand glyph, not a catalog concept). */
    enhanceWord: '✦ Enhance',
    /** Zoom enhance capsule busy word (the promise's in-flight face). */
    enhanceBusyWord: '✦ enhancing…',
    /** Zoom close pill accessible name. */
    collapseCard: 'Collapse card',
    /** Zoom model-dropdown Auto option (the estate's preference chain server-side). */
    autoOption: 'Auto',
    /** Zoom stop pill word (rides beside the stop glyph). */
    stopWord: 'Stop',
    /** Zoom run pill word (rides beside the play glyph). */
    runWord: 'Run',
    /** Zoom close pill word (rides beside the ✕ glyph). */
    closeWord: 'Close',
    /** Error-dismiss control accessible name (the red × beside every
     *  error face — the operator's "errors stick there FOREVER" cure:
     *  closing the face retires it). No hover title: hover text rides
     *  the estate Tip, never a native title (the tip canon). */
    dismissError: 'Dismiss error',
    /** The gate-refusal banner's unstamp verb (SD-7, the
     *  refusal-without-cure cure): the banner names a field the form
     *  does not render, so the words must ACT — one click unstamps the
     *  named key through the bench door. Composed with the field name
     *  at the render seat ("Unstamp 'double_reference'"). */
    unstampWord: 'Unstamp',
    /** THE STAGE-VIEW LOAD REFUSAL (2026-11-09, the fallback
     *  extermination): a card whose served spec declares a studio
     *  (FormSpecDoc.stage_view) must never wear the generic form when
     *  the lane's module table lacks the plugin — the dispatch's miss
     *  renders THIS voice instead (there is no such thing as a
     *  fallback, only suppressed errors). */
    stageViewRefusal: (p) => "The '" + p.card + "' studio failed to load — this lane has no '" + p.plugin + "' bundle mounted.",
    /** The refusal's fix line: the mount is a build fact, not a UI toggle. */
    stageViewRefusalFix: 'Rebuild the web bases and reload this lane (the studio\'s mount row is missing or its bundle is stale). The generic form is suppressed on purpose: it would edit the studio\'s params with different rules.',
    /** Run view's cancel verb (danger face — the live run stops). */
    cancelRunWord: 'Cancel run',
    /** Run view's cancel in-flight face. */
    cancellingWord: 'cancelling…',
    /** Run view's restore verb (the run's stages land back on the bench). */
    restoreToBench: 'Restore to bench',
    /** Run view's restore in-flight face. */
    restoringWord: 'Restoring…',
    /** Group sub-view's ungroup verb. */
    ungroupWord: 'Ungroup',
    /** Group sub-view's ungroup in-flight face. */
    ungroupingWord: 'ungrouping…',
    /** Rescue restart verb (the restart-required face's confirm). */
    restartToActivate: 'Restart to activate',
    /** Rescue restart verb's in-flight face. */
    restartingWord: 'Restarting…',
    /** Rescue restart-required note (the engine's own detail leads). */
    restartRequiredNote: (p) => p.detail + ' — restart required before activation.',
    /** Rescue done face's note (the engine's own detail leads). */
    runAgainWhenReady: (p) => p.detail + ' — run again when ready.',
    /** Rescue extension face's confirm (install through the manage seat). */
    installContinue: 'Install & continue',
    /** Rescue extension confirm's in-flight face. */
    installingWord: 'installing…',
    /** Rescue weight popup's download verb. */
    downloadWord: 'Download',
    /** Rescue weight download's start face. */
    startingWord: 'starting…',
    /** Rescue weight download's polling face. */
    downloadingWord: 'downloading…',
    /** Rescue missing-extension note (what the run lacked). */
    missingInstall: (p) => 'Missing ' + p.what + ' — install through the manage seat?',
    /** Rescue missing-weight note (what the run lacked). */
    missingDownload: (p) => 'Missing ' + p.what + ' — download through the manage seat?',
    /** Rescue missing-runtime note (E2-2: what the run lacked — the
     *  engine's own tool runtime, provisioned where the engine
     *  lives, never through the estate). */
    missingRuntime: (p) => 'Missing engine runtime "' + p.runtime + '" — the run needs its tool runtime, and the engine does not have it.',
    /** Rescue runtime face's provision voice (E2-2): the engine's own
     *  provision command, verbatim — the command IS the offer (no
     *  estate door provisions runtimes, so no button is faked). */
    runtimeProvision: (p) => 'Provision it where the engine lives: ' + p.command,
    /** Rescue runtime face's env-override voice (E2-2): the engine
     *  names its escape hatch when one exists. */
    runtimeEnvOverride: (p) => 'Or point an existing runtime at ' + p.env + '.',
    /** Rescue runtime face's dismiss label (the × every rescue face carries). */
    closeRuntimeFace: 'Close runtime notice',
    /** Weight popup title when the acquisition ended STUCK (frozen
     *  bytes across polls or an expired poll ceiling) — never the
     *  ready face (the purge P5 rescue honesty, ERRORS k2/m). */
    weightStuck: 'Weight stuck',
    /** Weight stuck face's note: the engine's last truth leads
     *  (state + the human progress line — "4.8/6.8 GB (71%)", never
     *  raw byte walls), and the two honest exits are named. An empty
     *  progress (no declared total) voices the undeclared size. */
    stuckNote: (p) => 'Stuck — the download is no longer progressing: the engine last reported state "' + p.state + '"'
        + (p.progress !== '' ? ' at ' + p.progress : ' (no declared total)') + '. Retry the fetch or delete the stuck operation.',
    /** Run view's graph-receipt chip on the complete face (the silent
     *  UI-drop purge's P1): every stated scalar rode the composed
     *  graph — the node count is data. The engine-minted prompt_id
     *  (GAP B: the receipt carried it, no face rendered it) rides as
     *  an EngineRef suffix wherever the estate stamped one — absent
     *  prompt_id leaves the legacy face byte-identical. */
    graphReceiptCarried: (p) => 'graph ✓ ' + String(p.nodes) + 'n' + engineRefSuffix(p.promptId),
    /** Run view's graph-receipt chip on the partial face: the composed
     *  graph dropped doc scalars — the names are data (the estate's
     *  sorted receipt, joined by the seat). The EngineRef suffix rides
     *  here too (both faces name the queued engine call). */
    graphReceiptDropped: (p) => 'graph ✕ dropped ' + p.dropped.join(', ') + engineRefSuffix(p.promptId),
    /** Run view's bake chip (study §7 item 2 — the run voice prices the
     *  bake): the receipt's price string is data composed from the
     *  graph's own extract node; the seat renders it verbatim. */
    bakeReceipt: (p) => 'bake · ' + p.price,
    /** Weight stuck face's retry verb (re-rides the acquire_weight door). */
    retryDownload: 'Retry the download',
    /** Weight stuck face's delete verb (the discard rides the manage seat). */
    deleteStuck: 'Delete stuck operation',
    /** The stuck face's run refusal — a run press on an incomplete
     *  weight is refused loudly, never fired silently (the purge P5). */
    stuckRunRefusal: 'The weight is not complete — the run stays refused until the fetch lands (retry) or the stuck operation is deleted.',
    /** Weight tracker line when the engine declared no total (a DECL
     *  row without size seeds 0): the voice says so — no dead
     *  0-of-0 meter dressed as 0% (the purge P5's total=0 face). */
    undeclaredTotal: (p) => p.bytes + ' downloaded — total undeclared (the engine reported no size)',
    /** The Q1 Auto-mode popup's On row (the composer `+` popup's
     *  label + blast-radius detail: On hands the AI the run press). */
    autoModeOnLabel: 'Auto mode on',
    autoModeOnDetail: 'The AI starts runs itself — generations no longer wait for your Run press',
    /** The popup's Off row (Off hands the run press back to the user). */
    autoModeOffLabel: 'Auto mode off',
    autoModeOffDetail: 'Runs wait for your Run press again — the AI only stages',
};
//# sourceMappingURL=chromeCopy.js.map
