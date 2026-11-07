/** The typed dictionary. Keys are stable copy ids; consumers pass
 *  exactly the params the entry declares — the type is the seat's
 *  own enforcement (a missing param is a compile error, not a
 *  runtime hole). */
// v8 ignore next -- exercised key-by-key by the chrome wall's census arm
export const chromeCopy = {
    /** The mixed knob's range aria-name suffix (the typed face owns the bare label). */
    sliderAriaWord: 'slider',
    /** Model axes heading + the model picker's accessible name (one word, two seats). */
    modelLabel: 'Model',
    /** Recipe row's visible key + the recipe picker's accessible name (one word, two seats). */
    recipeLabel: 'Recipe',
    /** The form submenu tablist's accessible name (the SegmentedTabs label is required). */
    paramGroupsLabel: 'parameter groups',
    /** Pack prompt note: the missing pack's id leads the sentence. */
    requiredPackNote: (p) => p.id + ' is required by this card but not installed on the engine.',
    /** Pack prompt install verb: the missing pack's id rides in. */
    installPackVerb: (p) => 'Install ' + p.id,
    /** Install/download request's in-flight word (one word, both prompts). */
    requestingWord: 'Requesting…',
    /** Pack install's queued receipt. */
    installQueuedNote: 'Install queued ✓ (restart the engine when it lands)',
    /** Pack install's failure note. */
    installFailedNote: 'Install request failed — retry from the assets tab',
    /** Download prompt note: the family's face leads the sentence. */
    offeredNotDownloadedNote: (p) => p.face + ' is offered by this card but not downloaded on this machine.',
    /** Download prompt verb: the family's face rides in. */
    downloadVerb: (p) => 'Download ' + p.face,
    /** Refused model row's suffix: titleCaseId(face) leads. */
    refusedModelSuffix: ' — not an offered model of this card',
    /** Absent family row's suffix: the DECL label leads. */
    notDownloadedSuffix: ' — not downloaded on this machine',
    /** Refused axis row: the invalid id leads, the axis + holder follow. */
    invalidAxisNote: (p) => p.id + ' — invalid ' + p.axis + ' for ' + p.holder,
    /** Refused-coord repair note (axis-unification P0#3): the one-pick
     *  cure is a verb — the repair button's lead-in sentence. */
    axisRepairNote: 'Not an offered coordinate of the held matrix — the nearest current cell is one click away:',
    /** Refused-coord repair verb: the nearest current cell's face rides in. */
    axisRepairVerb: (p) => 'Write ' + p.face,
    /** Recipe picker's resting placeholder (nothing held, or a
     *  hand-edited layer no row matches — the placeholder re-serves,
     *  never a lie; the custom face retired with the k blank row:
     *  the menu's blank is now a selectable WRITE, not a marker). */
    recipePlaceholder: '-- recipe --',
    /** Recipe menu's selectable blank row (k, 2026-11-08): picking it
     *  unstates the active recipe's stamps — the blank is a WRITE,
     *  distinct from the resting placeholder face. */
    recipeBlankRow: 'Blank — no recipe',
    /** Download's queued receipt. */
    downloadQueuedNote: 'Download queued ✓ (run when it lands)',
    /** Download's failure note. */
    downloadFailedNote: 'Download request failed — retry from the assets tab',
    /** Mod-system section heading. */
    modifiersTitle: 'Modifiers',
    /** History strip heading (shared preview chrome). */
    historyTitle: 'History',
    /** Glb stage empty state + the studio mesh seat's hint (kept verbatim — coordinator owns D1 dedupe). */
    emptyMeshHint: 'Run the card to see the mesh',
    /** Mesh layer group's accessible name. */
    meshLayersLabel: 'mesh layers',
    /** Stack add cell's accessible name: "Add <field label>". */
    stackAddCell: (p) => `Add ${p.label}`,
    /** Ghost-race refusal: the opened entry left the bag under the leaf; the kind label prefixes it. */
    ghostRaceRefusal: (p) => p.kindLabel + ' entry was removed from the bench while you edited it — the draft survives; the bag changed under the leaf.',
    /** Add-modifier square's accessible name. */
    addModifierAria: 'Add modifier',
    /** Add-modifier square's hover title. */
    addModifierTitle: 'Add a modifier',
    /** Chain-run picker row label: the estate run id, the lane it rode, and the scene count its chain stamp reports. */
    chainRunOptionLabel: (p) => `${p.run} — ${p.kind}, ${p.scenes} ${p.scenes === 1 ? 'scene' : 'scenes'}`,
    /** Chain-run picker's free-text affordance (the advanced fallback — a placeholder AND accessible name). */
    chainRunAdvancedLabel: 'Advanced — paste a run id',
    /** Chain-run picker's honest empty (the store check found no checkpointed run). */
    chainRunEmptyNote: 'No chain runs yet — a swap, repair, extend or refine press leaves its scenes here.',
    /** Named-presence popup title: "Name the <kind label>" (the add gesture opens one field, never a knob wall). */
    namedPresenceTitle: (p) => `Name the ${p.kindLabel}`,
    /** Named-presence popup's single input label + accessible name. */
    namedPresenceInputLabel: 'Save-file name',
    /** Named-presence input placeholder: the mint fallback owns an empty field. */
    namedPresencePlaceholder: 'leave empty to auto-name',
    /** Named-presence input hover law: what the name does at the engine. */
    namedPresenceHint: 'Names the file this mod saves. Leave empty and the build mints a unique name for the run.',
    /** Named-presence popup confirm control. */
    namedPresenceCreate: 'Add',
    /** Named-presence popup cancel control. */
    namedPresenceCancel: 'Cancel',
    /** Leaf modal title in create mode: "Add <kind label>". */
    leafCreateTitle: (p) => 'Add ' + p.kindLabel,
    /** Leaf modal title in edit mode: "Edit <kind label>". */
    leafEditTitle: (p) => 'Edit ' + p.kindLabel,
    /** Leaf modal close control. */
    leafCloseLabel: 'Close',
    /** Strength input placeholder (the served row's default applies). */
    rowDefaultPlaceholder: 'the row default',
    /** Steps range suffix: " <min>–<max>" (the row's declared domain, stated in the label). */
    stepsRange: (p) => ` ${p.min}\u2013${p.max}`,
    /** Steps fixed suffix: " (fixed at <steps>)" (the row pins one count). */
    fixedAtSteps: (p) => ` (fixed at ${p.steps})`,
    /** Steps-applied visible label + the number input's accessible name (one wording, two seats). */
    stepsAppliedLabel: 'Steps applied',
    /** Steps input hover law for ranged adapters: the domain bounds the dial, the sampler applies it. */
    adapterRangeTitle: (p) => `This adapter runs ${p.min}\u2013${p.max} steps — the dial bounds to the row's declared domain; the run\u2019s sampler applies it unless a call pins steps explicitly.`,
    /** Steps input hover law for distill rows: the row's own count, same sampler rule. */
    distillStepsTitle: 'The distill\u2019s own step count — the run\u2019s sampler applies it unless a call pins steps explicitly.',
    /** Ordered mod tile hover: drag to reorder, click to edit. */
    tileOrderedTitle: 'Drag to reorder · click to edit',
    /** Standalone mod tile hover: no order to set, click to edit. */
    tileStandaloneTitle: 'Click to edit (standalone — own output)',
    /** Stale-badge hover: return to the current generation. */
    staleReturnTitle: 'Return to the current generation',
    /** Dead-thumb tooltip: "<name> — the artifact file is gone". */
    artifactGoneTitle: (p) => `${p.name} — the artifact file is gone`,
    /** History-thumb tooltip suffix when a note differs: " (differs: <note>)". */
    historyDiffersSuffix: (p) => ` (differs: ${p.note})`,
    /** History-thumb tooltip suffix on the picked tile: viewing, click to return to current. */
    historyViewingCurrentSuffix: ' (viewing — click to return to current)',
    /** Film-thumb tooltip suffix on the faced tile: viewing, click to return to the film. */
    filmViewingSuffix: ' (viewing — click to return to the film)',
    /** Film-thumb tooltip suffix off the faced tile: click to preview. */
    filmPreviewSuffix: ' — click to preview',
    /** Text output copy button's accessible name. */
    textCopyAria: 'copy text output',
    /** Report card's accessible name: "run report <name>". */
    runReportAria: (p) => 'run report ' + p.name,
    /** Report chips group's accessible name. */
    reportChipsAria: 'report chips',
    /** Report rows group's accessible name. */
    reportRowsAria: 'report rows',
    /** Field info glyph's accessible name: "info: <tooltip prose>". */
    infoGlyphAria: (p) => `info: ${p.tooltip}`,
    /** Seed dice's accessible name. */
    seedDiceAria: 'seed dice',
    /** Seed dice hover while random: a new seed every run, click to fix one. */
    seedRandomTitle: 'Random — a new seed every run. Click to fix one.',
    /** Seed dice hover while fixed: this exact seed re-runs, click for a new one every run. */
    seedFixedTitle: 'Fixed seed — this exact seed re-runs. Click for a new one every run.',
    /** Seed input placeholder while random (the sentinel never paints). */
    seedRandomPlaceholder: 'random — new every run',
    /** Boolean face on-option label. */
    boolOnLabel: 'on',
    /** Boolean face off-option label. */
    boolOffLabel: 'off',
    /** Unset-face honesty word: nothing composes, the engine default applies. */
    inheritPlaceholder: 'inherit',
    /** Every error face's dismiss × accessible name (audit 017 C4): the
     *  shell error line and the toast banner share the one aria voice —
     *  the same words the card drilldown's faces carry. */
    dismissError: 'Dismiss error',
    /** Toast banner's dismiss action label (audit 017 C4): the DSH
     *  Toast's inline action seat — the press retires the toast now,
     *  ahead of its auto-retire clock. */
    dismissToast: 'Dismiss',
    /** Option-kind picker's EMPTY-ROSTER face (2026-11-15, the
     *  operator's Fibo LoRA burn: an empty roster rendered a freeform
     *  text box instead of the picker). The seat states the state and
     *  points at the upload seat beside it — never a typing box. */
    optionRosterEmptyFace: 'None seated yet',
    /** Option-kind picker's empty-roster hint, under the face: where a
     *  row comes from (the add-lora menu beside Apply; the engine's own
     *  shelf). */
    optionRosterEmptyHint: 'This card has no entries to pick from yet \u2014 press Add LoRA beside Apply to upload one and it seats here without a restart. A typed name is never accepted: the run refuses a LoRA the engine does not have.',
    /** The add-lora menu's door (2026-11-15, the operator's layout
     *  order: the upload sits behind a button NEXT TO Apply, so the
     *  bag's pick face stays one compact row and the upload is a
     *  deliberate menu of its own). */
    loraAddButton: 'Add LoRA\u2026',
    /** The add-lora menu's back action: leave the upload pane without
     *  uploading (the pending file is discarded, never silently
     *  half-committed). */
    loraBackButton: 'Back',
    /** The add-lora menu's commit action: upload the picked file with
     *  the typed name + default strength, then re-open the pick face. */
    loraApplyButton: 'Apply',
    /** The add-lora menu's rename field: the file's name on the
     *  engine's shelf — the id the picker commits after the upload. */
    loraNameLabel: 'Name',
    /** Rename field's placeholder: the picked file's own name. */
    loraNamePlaceholder: 'the picked file\u2019s name',
    /** Rename field's hover law: what the name becomes (the row id)
     *  and that the picked file's extension rides it. */
    loraNameHint: 'The name the uploaded row seats under \u2014 this becomes the id the picker commits. The picked file\u2019s extension always rides it.',
    /** Lora hand-upload verb (2026-11-15, the operator's feature): the
     *  mods-plane ghost row that opens the OS file dialog. */
    loraUploadVerb: 'Upload a LoRA\u2026',
    /** Lora hand-upload row's hover law: what the gesture does, where
     *  the file lands, and that no restart follows. */
    loraUploadHint: 'Upload a LoRA file from this machine \u2014 it lands on the engine\u2019s loras shelf for this card and serves in the picker without a restart. Drag-drop works too.',
    /** Lora upload strength dial: visible label + accessible name (one
     *  wording, two seats — the strength grammar's own law). */
    loraUploadStrengthLabel: 'Upload strength',
    /** Lora upload strength dial's placeholder: blank rides the door's
     *  default (1). */
    loraUploadStrengthPlaceholder: 'blank = 1',
    /** Lora upload strength dial's hover law: the ROW default this
     *  seats — picks seed from it, unstated strengths compose with it. */
    loraUploadStrengthTitle: 'The uploaded row\u2019s default strength \u2014 new picks seed from it, and a use that states no strength composes with it. 0\u20132.',
    /** Lora upload fallback refusal (the door seated no row and carried
     *  no refusal voice of its own). */
    loraUploadRefusedNote: 'The upload landed but no picker row was seated \u2014 check the families shelf with the Manager.',
};
/** Resolve one copy entry. Plain-string entries return verbatim;
 *  template entries receive their params (a plain entry given params
 *  ignores them; a template entry without params renders its holes
 *  empty — the wall pins every template's params at its seats).
 * @param key - the copy id to resolve.
 * @param params - the template's parameters (plain entries take none).
 * @returns the locale-owned copy string. */
export function chromeT(key, params) {
    const entry = chromeCopy[key];
    if (typeof entry === 'string')
        return entry;
    // a template resolved without its params renders the holes EMPTY —
    // the seat never leaks the string "undefined" into the UI.
    const holes = new Proxy(params ?? {}, {
        get: (given, name) => given[name] ?? '',
    });
    return entry(holes);
}
/** Every dictionary key with its resolved-or-templated text — the
 *  locale wall's census input (dead keys are findings, so the wall
 *  walks the whole dictionary, not a sample).
 * @param templateParams - params handed to every template entry.
 * @returns one [key, text] pair per dictionary key. */
export function allChromeCopy(templateParams) {
    return Object.keys(chromeCopy).map((k) => {
        const entry = chromeCopy[k];
        return [k, typeof entry === 'string' ? entry : entry(templateParams)];
    });
}
//# sourceMappingURL=chromeCopy.js.map