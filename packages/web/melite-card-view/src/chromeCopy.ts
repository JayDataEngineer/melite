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
  /** Loading face while the draft doc hydrates. */
  cardsLoading: 'cards…',
  /** Drill title: the host's "Card " prefix over the row's own (data) title. */
  cardTitle: (p: { name: string }): string => 'Card ' + p.name,
  /** Add-card door title + the bench grid's trailing Add tile name. */
  addCard: 'Add a card',
  /** Add-card picker close control. */
  closePicker: 'Close picker',
  /** Add-card picker search field placeholder. */
  searchPlaceholder: 'Search cards…',
  /** Add-card picker search field accessible name. */
  searchAria: 'Search cards',
  /** Bench tile title for a grouped stage (the child count is data). */
  groupTitle: (p: { count: number }): string => 'Group (' + String(p.count) + ')',
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
  transportTitle: (p: { health: string }): string => 'transport ' + p.health,
  /** Enhance note: the verb is already in flight. */
  enhanceAlreadyRunning: 'enhance already running',
  /** Enhance note: the prompt field is empty. */
  enhanceEmptyPrompt: 'nothing to enhance — the prompt is empty',
  /** Enhance note: no model selected for the enhance call. */
  enhanceNoModel: 'no model to enhance with — pick a Model first',
  /** Enhance note: the call succeeded but swept nothing (the server's field list is data). */
  enhanceNoFields: (p: { fields: string }): string => 'the enhancer returned no declared fields (' + p.fields + ')',
  /** Enhance note: the sweep landed N fields via the named route. */
  enhancedVia: (p: { via: string; count: number }): string => 'enhanced via ' + p.via + ' (' + String(p.count) + ' field' + (p.count === 1 ? '' : 's') + ')',
  /** Enhance note: the sweep landed N fields (no route named). */
  enhancedCount: (p: { count: number }): string => 'enhanced (' + String(p.count) + ' field' + (p.count === 1 ? '' : 's') + ')',
  /** Drill webhook feed's activity line accessible name. */
  engineActivity: 'engine activity',
  /** Preview seat's media-drilldown opener accessible name. */
  openMediaDrilldown: 'Open media drilldown',
  /** Zoom overlay + bar accessible name ("Stage " over the row's own name, which is data). */
  stageAria: (p: { name: string }): string => 'Stage ' + p.name,
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
  restartRequiredNote: (p: { detail: string }): string => p.detail + ' — restart required before activation.',
  /** Rescue done face's note (the engine's own detail leads). */
  runAgainWhenReady: (p: { detail: string }): string => p.detail + ' — run again when ready.',
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
  missingInstall: (p: { what: string }): string => 'Missing ' + p.what + ' — install through the manage seat?',
  /** Rescue missing-weight note (what the run lacked). */
  missingDownload: (p: { what: string }): string => 'Missing ' + p.what + ' — download through the manage seat?',
} as const

/** The dictionary's key union — the typed seat's domain. */
export type ChromeCopyKey = keyof typeof chromeCopy
