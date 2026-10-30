/** square-provider.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react';
import { type InputSquareVerbs } from './square.js';
import { type SpecField } from './spec.js';
/** THE OS-DIALOG ACCEPT, derived per field (primitive ③): mesh rows
 *  offer the GLB pair; video-hinted rows offer the video formats
 *  (the same media hint the picker rides); everything else keeps
 *  the image triad (the historic default). The provider's ONE
 *  hidden input re-targets imperatively at click time — the accept
 *  is a property of the field being picked, never of the provider
 *  instance. */
export declare function acceptOfField(f: SpecField | null): string;
/** THE ONE square provider (the old SlotGrid law, DSH substrate):
 *  every slot-shaped field of a stage gets the same verbs — file
 *  upload (the /v1/uploads door + the data-URL mirror), media drop
 *  (the asset MIME → the param), and THE PICKER (a DSH Menu anchored
 *  on the square listing the other stages' latest outputs; picking
 *  one writes the PARAM — the slot is the wire, no separate wiring
 *  mechanic exists). ONE definition; the constructor and every
 *  claimed atom ride it. */
export declare function useSquareProvider(onEdit: (name: string, v: unknown) => void, wire: SquareWire): {
    square: (f: SpecField) => SquareHost | undefined;
    wireMenu: ReturnType<typeof h> | null;
};
/** The field-atom claim the constructor accepts — the seam's runtime
 *  consult result (the composition passes what the slot machinery
 *  holds; undefined = the base's built-in atom renders). */
export type FieldAtomClaim = (props: {
    f: SpecField;
    value: unknown;
    onEdit(name: string, v: unknown): void;
    square?: SquareHost;
}) => ReturnType<typeof h>;
/** THE GENERIC SOURCE ROW (2026-09-13, the operator's law: ONE
 *  generic input component — "EVEN FOR THE ADVANCED STUDIO CARDS…
 *  sources from ONE SYSTEM with NO EXCEPTIONS"). CardForm fields get
 *  the row through the constructor; every NON-field surface (studio
 *  cards, bespoke rails) rides THIS wrapper: the same plus square,
 *  the same three-entry menu (From flow / From media / From file),
 *  the same picker modal — with the surface's OWN flow candidates
 *  and an optional seam claim. One grammar, zero bespoke slots. */
export interface SourceRowProps {
    /** Short key shown under the square. */
    label: string;
    /** The ACCESSIBLE seat name when the visible caption is not it
     *  (the input stacks, #37: visible = the cell's index, aria = the
     *  full "List name N"). Falls back to `label`. */
    ariaLabel?: string;
    /** Hide the caption under the square — the owning section already
     *  names it (2026-09-15: the studio's First/Last frame subcards
     *  rendered the label TWICE). Default shows it. */
    hideLabel?: boolean;
    /** 'image' narrows the media modal to image; anything else lists
     *  the whole library (the file face). */
    kind?: 'image' | 'file';
    /** THE EDGE-BEARING SEAT NAME (the list-seat law, 2026-09-26): a
     *  stack cell's visible caption is its INDEX, but the From-flow
     *  picker narrows by the OWNING field's declared edge kind
     *  (reference_images → image_list accepts image producers).
     *  Absent keeps the legacy '__source_row__' name (no edge,
     *  unfiltered). */
    name?: string;
    /** Attached value (thumbnail when it passes isImageUrl). */
    value?: string | null;
    /** The ONE write verb — every source funnels here. */
    onEdit: (v: string) => void;
    /** The surface's own upstream outputs (the From flow rows). */
    candidates?: Array<{
        id: string;
        label: string;
        url: string;
    }>;
    /** THE PER-FIELD NARROWING (the edge law): present = the From-flow
     *  picker lists only rows whose card outputs a kind this field's
     *  edge accepts. The stack cells pass the OWNING field's name so
     *  the list seat narrows like any input (the list-seat law). */
    candidatesFor?: (f: SpecField) => Array<{
        id: string;
        label: string;
        url: string;
    }>;
    /** The surface's media source (the mounted media namespace's
     *  fetchMediaLibrary, or a test fake) — absent = the picker shows
     *  no media rows (honest, never a hidden fetch). */
    loadMedia?: SquareWire['loadMedia'];
    /** The surface's own file law (From file + OS drops route here). */
    onFile?: (file: File) => void;
    /** THE ROW'S PICKER FILTER — the OS dialog's accept. Audio/video
     *  lanes pass their MIME family ('audio/*', 'video/*'); absent =
     *  the image triad (the historic default, image rows). */
    accept?: SquareWire['accept'];
    /** The seam claim (same grammar as the field wire). */
    renderSourcePick?: SquareWire['renderSourcePick'];
}
/** What a host hands the constructor for slot-shaped fields: the
 *  square's verbs + an optional display mirror (the fresh-upload
 *  preview while the PARAM carries the estate path — the old
 *  upload-rail law). */
export interface SquareHost {
    verbs: InputSquareVerbs;
    display?: string | null;
    /** The last upload refusal's voice for this field (THE REFUSAL
     *  FACE): '' while an attempt is in flight, the refusal text after
     *  a failure, absent after any successful settle. NEVER a param
     *  value — the value seam stays estate-path-only. The attempt's
     *  own face is `busy`, never this seat in danger color. */
    error?: string | null;
    /** The in-flight upload's filename (THE UPLOADING FACE): present
     *  from the first tick of an attempt until its settle (success
     *  or refusal). The square renders it neutrally — in flight is
     *  not a refusal. */
    busy?: string | null;
    /** The finished in-flight line (THE ALREADY-LOCALIZED PROP): the
     *  provider assembles t('uploading') and the face renders it
     *  verbatim — atoms.tsx owns no dictionary key. Null exactly when
     *  `busy` is null (no attempt in flight). */
    busyVoice?: string | null;
}
/** The picker half of the square provider: candidates are the OTHER
 *  stages' LATEST OUTPUTS (title + the media-route url the run wrote
 *  onto their bench rows). Picking one WRITES THE PARAM — the input
 *  slot is the wire, there is no separate wiring mechanic.
 *
 * THE EDGE LAW (2026-09-12): `candidatesFor` narrows the list PER
 *  FIELD — only rows whose card DECLARES an output of the field's
 *  input-edge kind. The static `candidates` list is the fallback for
 *  fields with no declared edge (the picker never blocks on a meta
 *  miss — it just stops guessing kinds it cannot verify). */
export interface SquareWire {
    candidates: Array<{
        id: string;
        label: string;
        url: string;
    }>;
    /** THE MEDIA SOURCE (stroke 81's one-lane law): the picker's
     *  media rows arrive INJECTED — the host surface owns the estate
     *  lane (the mounted media namespace); the base form carries no
     *  transport of its own. Absent → the picker degrades to an empty
     *  list (honest, never a hidden fetch). */
    loadMedia?: (kind: string, signal: AbortSignal) => Promise<Array<{
        url: string;
        name: string;
    }>>;
    candidatesFor?: (f: SpecField) => Array<{
        id: string;
        label: string;
        url: string;
    }>;
    /** The surface's OWN file law (optional): when present, From file
     *  and OS drops route here instead of the default upload door —
     *  bespoke vocabularies (the studio's inline data:-URL cap) keep
     *  their semantics under the same three-entry grammar. */
    onFile?: (file: File) => void;
    /** THE ROW'S PICKER FILTER (2026-09-18, the two-audio conviction:
     *  "you literally can't even add two audios" — the hidden file
     *  input hard-coded the image triad, so the OS dialog GRAYED OUT
     *  every audio and video on file rows). Rows whose lane is not
     *  images pass their MIME family here ('audio/*', 'video/*');
     *  absent → the image triad stands (image rows, unchanged). */
    accept?: string;
    /** THE SOURCE-PICK SEAM (2026-09-13, the operator's law: one
     *  system, no exceptions): the host may claim the picker modal's
     *  face — same grammar as the stage-view consult. The fallback is
     *  the base's own modal (the plain filtered list). */
    renderSourcePick?: (req: {
        mode: 'flow' | 'media';
        kind: string;
        field: SpecField;
        candidates: Array<{
            id: string;
            label: string;
            url: string;
        }>;
    }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>;
}
//# sourceMappingURL=square-provider.d.ts.map
