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
