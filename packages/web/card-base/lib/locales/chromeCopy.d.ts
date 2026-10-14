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
    /** Model axes heading + the model picker's accessible name (one word, two seats). */
    readonly modelLabel: "Model";
    /** Recipe row's visible key + the recipe picker's accessible name (one word, two seats). */
    readonly recipeLabel: "Recipe";
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
    /** Recipe picker's resting placeholder (nothing held). */
    readonly recipePlaceholder: "-- recipe --";
    /** Recipe picker's custom face (a held stamp no row matches). */
    readonly recipeCustomFace: "-- custom --";
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
