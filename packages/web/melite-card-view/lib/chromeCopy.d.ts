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
export declare const chromeCopy: {
    /** Brand badge on the flow-cards header (both planes). */
    readonly brand: "melite";
    /** Model slot fallback when neither the draft intent nor the call names a model. */
    readonly flowFallback: "flow";
    /** Legacy header state: a settled call whose result predates the draft contract. */
    readonly cardsEarlierDraft: "cards · earlier draft";
    /** Loading face when the draft id will never resolve (an errored call). */
    readonly draftFailed: "draft failed";
    /** Loading face while the draft id is still composing. */
    readonly composing: "composing…";
    /** Header badge when the call's args body is corrupt (never header-less). */
    readonly argsUnparseable: "args unparseable — corrupted call record";
    /** Retry affordance suffix after a load error. */
    readonly retrySuffix: " · retry";
    /** Header door to the shell's Media page (the card runs' archive). */
    readonly openMedia: "open media";
    /** The flow-edit card's link: opens the edited flow (the session
     *  bench) in the Cards tab — the operator's "clickable link opens
     *  the right sidebar flow view" verb. No hover title: hover text
     *  rides the estate Tip, never a native title (the tip canon). */
    readonly openFlow: "open flow";
    /** The flow-edit card's verdict title — the host presentCall's
     *  `Bench <verb>[ · <stage|card>]` wording, mirrored from the
     *  frozen args (the keyed toolview replaces the generic row, so
     *  the title face lives here; the copy census owns the
     *  literals — presentation code carries none). */
    readonly constructTitle: (p: {
        verb: string;
        on: string;
    }) => string;
    /** The sidebar tab's chip + guide title — the bench page is titled this
     *  no matter which address form reached it (the address law, 2026-09-11). */
    readonly cardsTabTitle: "Media Flow";
    /** The cards tab guide row's description under the tab title. */
    readonly cardsTabGuide: "The media flow — the shared bench and its runs.";
    /** A chat file mention's tooltip title, naming the live kind + value. */
    readonly mentionTitle: (p: {
        kind: string;
        value: string;
    }) => string;
    /** Loading face while the draft doc hydrates. */
    readonly cardsLoading: "cards…";
    /** Drill title: the host's "Card " prefix over the row's own (data) title. */
    readonly cardTitle: (p: {
        name: string;
    }) => string;
    /** Add-card door title + the bench grid's trailing Add tile name. */
    readonly addCard: "Add a card";
    /** Add-card picker close control. */
    readonly closePicker: "Close picker";
    /** Add-card picker search field placeholder. */
    readonly searchPlaceholder: "Search cards…";
    /** Add-card picker search field accessible name. */
    readonly searchAria: "Search cards";
    /** Bench tile title for a grouped stage (the child count is data). */
    readonly groupTitle: (p: {
        count: number;
    }) => string;
    /** Play button hover while the pass is running. */
    readonly passRunning: "the pass is running";
    /** Play button hover: the pass runs every card in bench order. */
    readonly runAllHint: "run every card in bench order — one run per card, stop on failure";
    /** Clear button hover once armed (the second press clears). */
    readonly clearConfirm: "confirm: every stage leaves the bench (undo restores them)";
    /** Clear button hover while idle (the wedge cure's one-click door). */
    readonly clearHint: "clear the whole bench — every stage out, one rev, undo restores them";
    /** Undo button hover when the log holds an unreverted action. */
    readonly undoHint: "revert the newest bench action (one log entry per press — its own inverse, by rev)";
    /** Undo button hover when the log holds no unreverted action. */
    readonly nothingToUndo: "nothing to undo — the log holds no unreverted action";
    /** Save-flow name field placeholder. */
    readonly flowNamePlaceholder: "flow name";
    /** Save button hover: mint the bench as a named flow. */
    readonly saveFlowHint: "mint this bench as a named flow (restores from the Flows face)";
    /** Run button word (rides after the play/spinner glyph — the leading space is verbatim). */
    readonly playLabel: " Play";
    /** Save button word (the mint press + the save-panel confirm). */
    readonly saveButton: "Save";
    /** Save-panel cancel word. */
    readonly cancelButton: "Cancel";
    /** Tab face when the cards resource hook is absent (a broken provider, voiced loud). */
    readonly cardsHookUnavailable: "cards resource hook unavailable";
    /** Tab face when a live snapshot carries no value (a broken provider, voiced loud). */
    readonly cardsNoValue: "cards resource gave no value";
    /** Card drill close control. */
    readonly closeCard: "Close card";
    /** Restore button hover when the run names no draft. */
    readonly restoreNoDraft: "this run names no draft — nothing to restore";
    /** Restore button hover: copy the run's stages back onto the bench. */
    readonly restoreHint: "copy this run’s stages back onto the bench as your own";
    /** Draft face back button (the stage left the draft). */
    readonly backToBench: "Back to the bench";
    /** Run face back button. */
    readonly backToBenchRun: "Back to bench";
    /** Extension-rescue install button hover (the DECL owns the URL). */
    readonly installViaManage: "install via /v1/manage (the declaration owns the URL)";
    /** Weight popup title once the acquisition landed. */
    readonly weightReady: "Weight ready";
    /** Weight popup close control (both faces). */
    readonly closeWeightPopup: "Close weight popup";
    /** Weight button hover when no stage names the owning family or card. */
    readonly noProvisionTarget: "no stage names the owning family or card — provision via the agent door";
    /** Weight button hover (the DECL owns the URL). */
    readonly downloadViaManage: "download via /v1/manage (the declaration owns the URL)";
    /** Weight popup title on a missing model file. */
    readonly missingWeight: "Missing weight";
    /** Restart face: the engine is restarting (the full door — reload, then Run). */
    readonly restartWaiting: "Restarting… waiting for the engine to become active. Reload the page or engine, then press Run.";
    /** Restart face: the engine is restarting (the short door beside the button). */
    readonly restartWaitingShort: "Restarting… waiting for the engine to become active.";
    /** Rescue done face: the caller's own re-run. */
    readonly runAgain: "Run again";
    /** Weight offer button word (the dismissed popup's inline offer). */
    readonly downloadWeight: "Download weight";
    /** Weight tracker note while the download polls acquire_weight. */
    readonly downloadingLive: "Downloading… live bytes from the estate (polling acquire_weight).";
    /** Tile spinner accessible name while the row runs. */
    readonly tileRunning: "running";
    /** Tile + drill percent faces' accessible name. */
    readonly progressPercent: "progress percent";
    /** Tile trash button accessible name. */
    readonly removeStage: "Remove stage";
    /** Tile + zoom stop button accessible name. */
    readonly stopRun: "Stop run";
    /** Tile + zoom run button accessible name. */
    readonly runStage: "Run stage";
    /** Tile wired-mark hover (the agent-recorded inputs.source edge). */
    readonly sourceWired: "source wired";
    /** Tile health-face hover (the transport word is data). */
    readonly transportTitle: (p: {
        health: string;
    }) => string;
    /** Enhance note: the verb is already in flight. */
    readonly enhanceAlreadyRunning: "enhance already running";
    /** Enhance note: the prompt field is empty. */
    readonly enhanceEmptyPrompt: "nothing to enhance — the prompt is empty";
    /** Enhance note: no model selected for the enhance call. */
    readonly enhanceNoModel: "no model to enhance with — pick a Model first";
    /** Enhance note: the call succeeded but swept nothing (the server's field list is data). */
    readonly enhanceNoFields: (p: {
        fields: string;
    }) => string;
    /** Enhance note: the sweep landed N fields via the named route. */
    readonly enhancedVia: (p: {
        via: string;
        count: number;
    }) => string;
    /** Enhance note: the sweep landed N fields (no route named). */
    readonly enhancedCount: (p: {
        count: number;
    }) => string;
    /** Drill webhook feed's activity line accessible name. */
    readonly engineActivity: "engine activity";
    /** Preview seat's media-drilldown opener accessible name. */
    readonly openMediaDrilldown: "Open media drilldown";
    /** Zoom overlay + bar accessible name ("Stage " over the row's own name, which is data). */
    readonly stageAria: (p: {
        name: string;
    }) => string;
    /** Zoom model-dropdown accessible name (the enhance verb's selector). */
    readonly enhanceModelAria: "Enhance model";
    /** Zoom enhance capsule accessible name. */
    readonly agentEnhanceAria: "Agent Enhance";
    /** Zoom enhance capsule word (the ✦ verb's own mark — the estate's agent-enhance brand glyph, not a catalog concept). */
    readonly enhanceWord: "✦ Enhance";
    /** Zoom enhance capsule busy word (the promise's in-flight face). */
    readonly enhanceBusyWord: "✦ enhancing…";
    /** Zoom close pill accessible name. */
    readonly collapseCard: "Collapse card";
    /** Zoom model-dropdown Auto option (the estate's preference chain server-side). */
    readonly autoOption: "Auto";
    /** Zoom stop pill word (rides beside the stop glyph). */
    readonly stopWord: "Stop";
    /** Zoom run pill word (rides beside the play glyph). */
    readonly runWord: "Run";
    /** Zoom close pill word (rides beside the ✕ glyph). */
    readonly closeWord: "Close";
    /** Error-dismiss control accessible name (the red × beside every
     *  error face — the operator's "errors stick there FOREVER" cure:
     *  closing the face retires it). No hover title: hover text rides
     *  the estate Tip, never a native title (the tip canon). */
    readonly dismissError: "Dismiss error";
    /** Run view's cancel verb (danger face — the live run stops). */
    readonly cancelRunWord: "Cancel run";
    /** Run view's cancel in-flight face. */
    readonly cancellingWord: "cancelling…";
    /** Run view's restore verb (the run's stages land back on the bench). */
    readonly restoreToBench: "Restore to bench";
    /** Run view's restore in-flight face. */
    readonly restoringWord: "Restoring…";
    /** Group sub-view's ungroup verb. */
    readonly ungroupWord: "Ungroup";
    /** Group sub-view's ungroup in-flight face. */
    readonly ungroupingWord: "ungrouping…";
    /** Rescue restart verb (the restart-required face's confirm). */
    readonly restartToActivate: "Restart to activate";
    /** Rescue restart verb's in-flight face. */
    readonly restartingWord: "Restarting…";
    /** Rescue restart-required note (the engine's own detail leads). */
    readonly restartRequiredNote: (p: {
        detail: string;
    }) => string;
    /** Rescue done face's note (the engine's own detail leads). */
    readonly runAgainWhenReady: (p: {
        detail: string;
    }) => string;
    /** Rescue extension face's confirm (install through the manage seat). */
    readonly installContinue: "Install & continue";
    /** Rescue extension confirm's in-flight face. */
    readonly installingWord: "installing…";
    /** Rescue weight popup's download verb. */
    readonly downloadWord: "Download";
    /** Rescue weight download's start face. */
    readonly startingWord: "starting…";
    /** Rescue weight download's polling face. */
    readonly downloadingWord: "downloading…";
    /** Rescue missing-extension note (what the run lacked). */
    readonly missingInstall: (p: {
        what: string;
    }) => string;
    /** Rescue missing-weight note (what the run lacked). */
    readonly missingDownload: (p: {
        what: string;
    }) => string;
    /** Weight popup title when the acquisition ended STUCK (frozen
     *  bytes across polls or an expired poll ceiling) — never the
     *  ready face (the purge P5 rescue honesty, ERRORS k2/m). */
    readonly weightStuck: "Weight stuck";
    /** Weight stuck face's note: the engine's last truth leads (state
     *  + bytes/total), and the two honest exits are named. */
    readonly stuckNote: (p: {
        state: string;
        bytes: number;
        total: number;
    }) => string;
    /** Weight stuck face's retry verb (re-rides the acquire_weight door). */
    readonly retryDownload: "Retry the download";
    /** Weight stuck face's delete verb (the discard rides the manage seat). */
    readonly deleteStuck: "Delete stuck operation";
    /** The stuck face's run refusal — a run press on an incomplete
     *  weight is refused loudly, never fired silently (the purge P5). */
    readonly stuckRunRefusal: "The weight is not complete — the run stays refused until the fetch lands (retry) or the stuck operation is deleted.";
    /** Weight tracker line when the engine declared no total (a DECL
     *  row without size seeds 0): the voice says so — no dead
     *  0-of-0 meter dressed as 0% (the purge P5's total=0 face). */
    readonly undeclaredTotal: (p: {
        bytes: string;
        total: string;
    }) => string;
};
/** The dictionary's key union — the typed seat's domain. */
export type ChromeCopyKey = keyof typeof chromeCopy;
//# sourceMappingURL=chromeCopy.d.ts.map
