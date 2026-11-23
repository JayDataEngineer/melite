/** chromeCopy.ts — THE shared-chrome copy dictionary (the shared-faces
 * audit §1c cure: the chrome face — section headings, control aria
 * names, placeholders, hover titles, history/preview suffixes, report
 * aria, seed faces, the mesh empty hint — owns its copy here, never
 * inline in presentation components). This module is the LOCALE OWNER
 * for every user-visible string the shared chrome renders — axes.tsx,
 * form.tsx, glb-stage.tsx, studio.tsx, mods.tsx, preview.tsx,
 * report-view.tsx, rows.tsx, spec.ts (its unset-face label). Wire-layer
 * refusal voices (wire.ts, estate-remote.ts) and the poser viewport id
 * are DATA, not chrome — they stay at their seats (see the cure
 * report). Input-selection copy is a DIFFERENT face — square.ts owns
 * it; nothing input-selection grows here.
 *
 * SCHEMA-COPY SEAM (audit h3-frames-anima B1-4): model/card schema
 * `.description()` strings NEVER pass through this dictionary — they
 * arrive as runtime DATA on the served form spec (fieldsOf reads
 * meta.description verbatim as the label, extra.tooltip as the
 * hover) and render with no dictionary hop, so no client-side i18n
 * gate can see them. Their law lives estate-side: the
 * operator-copy-estate wall (tests/walls/ts/suites/operator-copy-estate.spec.ts)
 * walks every served family + card schema and refuses architecture
 * vocabulary. If a schema string needs locale ownership one day, the
 * seat is the serving projection (emitParamsSpec), not this file.
 *
 * Melite ships one locale (English). The dictionary is the seat a
 * second locale plugs into — the consumer contract (`chromeT`) is the
 * same shape DSH's client UI uses, so a wall guarding it transfers
 * unchanged. */
import type { ReactNode } from 'react';
/** The typed dictionary. Keys are stable copy ids; consumers pass
 *  exactly the params the entry declares — the type is the seat's
 *  own enforcement (a missing param is a compile error, not a
 *  runtime hole). */
export declare const chromeCopy: {
    /** The mixed knob's range aria-name suffix (the typed face owns the bare label). */
    readonly sliderAriaWord: "slider";
    /** Model axes heading + the model picker's accessible name (one word, two seats). */
    readonly modelLabel: "Model";
    /** Recipe row's visible key + the recipe picker's accessible name (one word, two seats). */
    readonly recipeLabel: "Recipe";
    /** The form submenu tablist's accessible name (the SegmentedTabs label is required). */
    readonly paramGroupsLabel: "parameter groups";
    /** Pack prompt note: the missing pack's id leads the sentence. */
    readonly requiredPackNote: (p: {
        id: string;
    }) => string;
    /** Pack prompt install verb: the missing pack's id rides in. */
    readonly installPackVerb: (p: {
        id: string;
    }) => string;
    /** Install/download request's in-flight word (one word, both prompts). */
    readonly requestingWord: "Requesting…";
    /** Pack install's queued receipt. */
    readonly installQueuedNote: "Install queued ✓ (restart the engine when it lands)";
    /** Pack install's failure note. */
    readonly installFailedNote: "Install request failed — retry from the assets tab";
    /** Download prompt note: the family's face leads the sentence. */
    readonly offeredNotDownloadedNote: (p: {
        face: string;
    }) => string;
    /** Download prompt verb: the family's face rides in. */
    readonly downloadVerb: (p: {
        face: string;
    }) => string;
    /** Refused model row's suffix: titleCaseId(face) leads. */
    readonly refusedModelSuffix: " — not an offered model of this card";
    /** Absent family row's suffix: the DECL label leads. */
    readonly notDownloadedSuffix: " — not downloaded on this machine";
    /** Refused axis row: the invalid id leads, the axis + holder follow. */
    readonly invalidAxisNote: (p: {
        id: string;
        axis: string;
        holder: string;
    }) => string;
    /** Refused-coord repair note (axis-unification P0#3): the one-pick
     *  cure is a verb — the repair button's lead-in sentence. */
    readonly axisRepairNote: "Not an offered coordinate of the held matrix — the nearest current cell is one click away:";
    /** Refused-coord repair verb: the nearest current cell's face rides in. */
    readonly axisRepairVerb: (p: {
        face: string;
    }) => string;
    /** Recipe picker's resting placeholder (nothing held, or a
     *  hand-edited layer no row matches — the placeholder re-serves,
     *  never a lie; the custom face retired with the k blank row:
     *  the menu's blank is now a selectable WRITE, not a marker). */
    readonly recipePlaceholder: "-- recipe --";
    /** Recipe menu's selectable blank row (k, 2026-11-08): picking it
     *  unstates the active recipe's stamps — the blank is a WRITE,
     *  distinct from the resting placeholder face. */
    readonly recipeBlankRow: "Blank — no recipe";
    /** Download's queued receipt. */
    readonly downloadQueuedNote: "Download queued ✓ (run when it lands)";
    /** Download's failure note. */
    readonly downloadFailedNote: "Download request failed — retry from the assets tab";
    /** Mod-system section heading. */
    readonly modifiersTitle: "Modifiers";
    /** History strip heading (shared preview chrome). */
    readonly historyTitle: "History";
    /** Glb stage empty state + the studio mesh seat's hint (kept verbatim — coordinator owns D1 dedupe). */
    readonly emptyMeshHint: "Run the card to see the mesh";
    /** Mesh layer group's accessible name. */
    readonly meshLayersLabel: "mesh layers";
    /** Stack add cell's accessible name: "Add <field label>". */
    readonly stackAddCell: (p: {
        label: string;
    }) => string;
    /** Ghost-race refusal: the opened entry left the bag under the leaf; the kind label prefixes it. */
    readonly ghostRaceRefusal: (p: {
        kindLabel: string;
    }) => string;
    /** Add-modifier square's accessible name. */
    readonly addModifierAria: "Add modifier";
    /** Add-modifier square's hover title. */
    readonly addModifierTitle: "Add a modifier";
    /** Chain-run picker row label: the estate run id, the lane it rode, and the scene count its chain stamp reports. */
    readonly chainRunOptionLabel: (p: {
        run: string;
        kind: string;
        scenes: number;
    }) => string;
    /** Chain-run picker's free-text affordance (the advanced fallback — a placeholder AND accessible name). */
    readonly chainRunAdvancedLabel: "Advanced — paste a run id";
    /** Chain-run seat's degraded placeholder (no loader / dead load): names what the field wants, never an empty box. */
    readonly chainRunDegradedPlaceholder: "Pick a finished run for the 2x pass (dropdown unavailable — type its run id)";
    /** Chain-run seat's no-lane note (the host threaded no runs loader): where the run ids would have come from. */
    readonly chainRunNoLaneNote: "Dropdown unavailable here — type a run id from Runs (a finished swap, repair, extend or refine).";
    /** Chain-run seat's failed-load note (the loader died): the honest retry story, never a blank face. */
    readonly chainRunFailedNote: "Could not load your runs — type a run id from Runs, or reopen this form to retry.";
    /** The mod leaf's advanced fold row (2026-11-09, the Plan-trio cure): fields the DECL marks `advanced` fold behind this one-word title. */
    readonly advancedFoldTitle: "Advanced";
    /** The mod leaf's posture-chip row (2026-11-09, the coexistence cure): the DECL's served sections ride as client draft-patchers — one press seeds the lawful companion values. */
    /** Chain-run picker's honest empty (the store check found no checkpointed run). */
    readonly chainRunEmptyNote: "No chain runs yet — a swap, repair, extend or refine press leaves its scenes here.";
    /** Named-presence popup title: "Name the <kind label>" (the add gesture opens one field, never a knob wall). */
    readonly namedPresenceTitle: (p: {
        kindLabel: string;
    }) => string;
    /** Named-presence popup's single input label + accessible name. */
    readonly namedPresenceInputLabel: "Save-file name";
    /** Named-presence input placeholder: the mint fallback owns an empty field. */
    readonly namedPresencePlaceholder: "leave empty to auto-name";
    /** Named-presence input hover law: what the name does at the engine. */
    readonly namedPresenceHint: "Names the file this mod saves. Leave empty and the build mints a unique name for the run.";
    /** Named-presence popup confirm control. */
    readonly namedPresenceCreate: "Add";
    /** Named-presence popup cancel control. */
    readonly namedPresenceCancel: "Cancel";
    /** Leaf modal title in create mode: "Add <kind label>". */
    readonly leafCreateTitle: (p: {
        kindLabel: string;
    }) => string;
    /** Leaf modal title in edit mode: "Edit <kind label>". */
    readonly leafEditTitle: (p: {
        kindLabel: string;
    }) => string;
    /** Leaf modal close control. */
    readonly leafCloseLabel: "Close";
    /** Strength input placeholder (the served row's default applies). */
    readonly rowDefaultPlaceholder: "the row default";
    /** Steps range suffix: " <min>–<max>" (the row's declared domain, stated in the label). */
    readonly stepsRange: (p: {
        min: number;
        max: number;
    }) => string;
    /** Steps fixed suffix: " (fixed at <steps>)" (the row pins one count). */
    readonly fixedAtSteps: (p: {
        steps: number;
    }) => string;
    /** Steps-applied visible label + the number input's accessible name (one wording, two seats). */
    readonly stepsAppliedLabel: "Steps applied";
    /** Steps input hover law for ranged adapters: the domain bounds the dial, the sampler applies it. */
    readonly adapterRangeTitle: (p: {
        min: number;
        max: number;
    }) => string;
    /** Steps input hover law for distill rows: the row's own count, same sampler rule. */
    readonly distillStepsTitle: "The distill’s own step count — the run’s sampler applies it unless a call pins steps explicitly.";
    /** Ordered mod tile hover: drag to reorder, click to edit. */
    readonly tileOrderedTitle: "Drag to reorder · click to edit";
    /** Standalone mod tile hover: no order to set, click to edit. */
    readonly tileStandaloneTitle: "Click to edit (standalone — own output)";
    /** Stale-badge hover: return to the current generation. */
    readonly staleReturnTitle: "Return to the current generation";
    /** Dead-thumb tooltip: "<name> — the artifact file is gone". */
    readonly artifactGoneTitle: (p: {
        name: string;
    }) => string;
    /** History-thumb tooltip suffix when a note differs: " (differs: <note>)". */
    readonly historyDiffersSuffix: (p: {
        note: string;
    }) => string;
    /** History-thumb tooltip suffix on the picked tile: viewing, click to return to current. */
    readonly historyViewingCurrentSuffix: " (viewing — click to return to current)";
    /** Film-thumb tooltip suffix on the faced tile: viewing, click to return to the film. */
    readonly filmViewingSuffix: " (viewing — click to return to the film)";
    /** Film-thumb tooltip suffix off the faced tile: click to preview. */
    readonly filmPreviewSuffix: " — click to preview";
    /** Text output copy button's accessible name. */
    readonly textCopyAria: "copy text output";
    /** Report card's accessible name: "run report <name>". */
    readonly runReportAria: (p: {
        name: string;
    }) => string;
    /** Report chips group's accessible name. */
    readonly reportChipsAria: "report chips";
    /** Report rows group's accessible name. */
    readonly reportRowsAria: "report rows";
    /** Field info glyph's accessible name: "info: <tooltip prose>". */
    readonly infoGlyphAria: (p: {
        tooltip: string;
    }) => string;
    /** Seed dice's accessible name. */
    readonly seedDiceAria: "seed dice";
    /** Seed dice hover while random: a new seed every run, click to fix one. */
    readonly seedRandomTitle: "Random — a new seed every run. Click to fix one.";
    /** Seed dice hover while fixed: this exact seed re-runs, click for a new one every run. */
    readonly seedFixedTitle: "Fixed seed — this exact seed re-runs. Click for a new one every run.";
    /** Seed input placeholder while random (the sentinel never paints). */
    readonly seedRandomPlaceholder: "random — new every run";
    /** Boolean face on-option label. */
    readonly boolOnLabel: "on";
    /** Boolean face off-option label. */
    readonly boolOffLabel: "off";
    /** Unset-face honesty word: nothing composes, the engine default applies. */
    readonly inheritPlaceholder: "inherit";
    /** Every error face's dismiss × accessible name (audit 017 C4): the
     *  shell error line and the toast banner share the one aria voice —
     *  the same words the card drilldown's faces carry. */
    readonly dismissError: "Dismiss error";
    /** Toast banner's dismiss action label (audit 017 C4): the DSH
     *  Toast's inline action seat — the press retires the toast now,
     *  ahead of its auto-retire clock. */
    readonly dismissToast: "Dismiss";
    /** Option-kind picker's EMPTY-ROSTER face (2026-11-15, the
     *  operator's Fibo LoRA burn: an empty roster rendered a freeform
     *  text box instead of the picker). The seat states the state and
     *  points at the upload seat beside it — never a typing box. */
    readonly optionRosterEmptyFace: "None seated yet";
    /** Option-kind picker's empty-roster hint, under the face: where a
     *  row comes from (the add-lora menu beside Apply; the engine's own
     *  shelf). */
    readonly optionRosterEmptyHint: "This card has no entries to pick from yet — press Add LoRA beside Apply to upload one and it seats here without a restart. A typed name is never accepted: the run refuses a LoRA the engine does not have.";
    /** The add-lora menu's door (2026-11-15, the operator's layout
     *  order: the upload sits behind a button NEXT TO Apply, so the
     *  bag's pick face stays one compact row and the upload is a
     *  deliberate menu of its own). */
    readonly loraAddButton: "Add LoRA…";
    /** The add-lora menu's back action: leave the upload pane without
     *  uploading (the pending file is discarded, never silently
     *  half-committed). */
    readonly loraBackButton: "Back";
    /** The add-lora menu's commit action: upload the picked file with
     *  the typed name + default strength, then re-open the pick face. */
    readonly loraApplyButton: "Apply";
    /** The add-lora menu's rename field: the file's name on the
     *  engine's shelf — the id the picker commits after the upload. */
    readonly loraNameLabel: "Name";
    /** Rename field's placeholder: the picked file's own name. */
    readonly loraNamePlaceholder: "the picked file’s name";
    /** Rename field's hover law: what the name becomes (the row id)
     *  and that the picked file's extension rides it. */
    readonly loraNameHint: "The name the uploaded row seats under — this becomes the id the picker commits. The picked file’s extension always rides it.";
    /** Lora hand-upload verb (2026-11-15, the operator's feature): the
     *  mods-plane ghost row that opens the OS file dialog. */
    readonly loraUploadVerb: "Upload a LoRA…";
    /** Lora hand-upload row's hover law: what the gesture does, where
     *  the file lands, and that no restart follows. */
    readonly loraUploadHint: "Upload a LoRA file from this machine — it lands on the engine’s loras shelf for this card and serves in the picker without a restart. Drag-drop works too.";
    /** Lora upload strength dial: visible label + accessible name (one
     *  wording, two seats — the strength grammar's own law). */
    readonly loraUploadStrengthLabel: "Upload strength";
    /** Lora upload strength dial's placeholder: blank rides the door's
     *  default (1). */
    readonly loraUploadStrengthPlaceholder: "blank = 1";
    /** Lora upload strength dial's hover law: the ROW default this
     *  seats — picks seed from it, unstated strengths compose with it. */
    readonly loraUploadStrengthTitle: "The uploaded row’s default strength — new picks seed from it, and a use that states no strength composes with it. 0–2.";
    /** Lora upload fallback refusal (the door seated no row and carried
     *  no refusal voice of its own). */
    readonly loraUploadRefusedNote: "The upload landed but no picker row was seated — check the families shelf with the Manager.";
};
/** The dictionary's key union — the typed `chromeT` seat's domain. */
export type ChromeCopyKey = keyof typeof chromeCopy;
/** Resolve one copy entry. Plain-string entries return verbatim;
 *  template entries receive their params (a plain entry given params
 *  ignores them; a template entry without params renders its holes
 *  empty — the wall pins every template's params at its seats).
 * @param key - the copy id to resolve.
 * @param params - the template's parameters (plain entries take none).
 * @returns the locale-owned copy string. */
export declare function chromeT(key: ChromeCopyKey, params?: Record<string, string | number>): string;
/** Every dictionary key with its resolved-or-templated text — the
 *  locale wall's census input (dead keys are findings, so the wall
 *  walks the whole dictionary, not a sample).
 * @param templateParams - params handed to every template entry.
 * @returns one [key, text] pair per dictionary key. */
export declare function allChromeCopy(templateParams: Record<string, string | number>): Array<[ChromeCopyKey, ReactNode]>;
//# sourceMappingURL=chromeCopy.d.ts.map
