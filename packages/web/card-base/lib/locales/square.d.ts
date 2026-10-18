/** square.ts — THE input-selection copy dictionary (2026-10-27,
 * the operator's DSH conformance order: "full dsh doc conformance
 * and dry treatment… the input selection squares across all the
 * cards"). This module is the LOCALE OWNER for every user-visible
 * string the input-selection machinery renders — square.tsx,
 * square-provider.tsx, wirePicker.tsx. Presentation code owns no
 * copy literals; it consumes them here through the typed `t` seat.
 *
 * Melite ships one locale (English). The dictionary is the seat a
 * second locale plugs into — the consumer contract (`t`) is the
 * same shape DSH's client UI uses, so the wall that guards it
 * (square-copy-locale.spec.ts) transfers unchanged. */
import type { ReactNode } from 'react';
/** The typed dictionary. Keys are stable copy ids; consumers pass
 *  exactly the params the entry declares — the type is the seat's
 *  own enforcement (a missing param is a compile error, not a
 *  runtime hole). */
export declare const squareCopy: {
    /** Menu row + modal title: pick from the other stages' outputs. */
    fromFlow: string;
    /** Menu row + modal title: pick from the runs library. */
    fromMedia: string;
    /** Menu row: open the OS file dialog. */
    fromFile: string;
    /** Menu danger row: clear the slot. */
    clearSlot: string;
    /** Flow-modal description; the kind suffix names the filter. */
    flowDescription: (p: {
        kindSuffix: string;
    }) => string;
    /** Media-modal description; the kind suffix names the filter. */
    mediaDescription: (p: {
        kindSuffix: string;
    }) => string;
    /** Modal close control (both picker modes). */
    closePicker: string;
    /** Empty state while the media list loads. */
    loading: string;
    /** Empty state when the media door refused. */
    mediaUnavailable: (p: {
        reason: string;
    }) => string;
    /** Empty state: the list is honestly empty. */
    nothingToPick: string;
    /** The detach button (square). */
    detach: string;
    /** The held face's hover title: the slot holds a value no preview
     *  can render (a bare artifact name, an unresolved path). */
    heldNoPreview: string;
    /** Accessible name of the detach button: "Detach <seat>". */
    detachSeat: (p: {
        seat: string;
    }) => string;
    /** Accessible name of the square when no caption stands. */
    sourceFallback: string;
    /** Accessible-name suffix of a captioned square: "<seat> source". */
    seatSource: (p: {
        seat: string;
    }) => string;
    /** The file-pick button: "Pick a file for <label>". */
    pickFileFor: (p: {
        label: string;
    }) => string;
    /** Wire-picker title: "Wire <slot> from an earlier card". */
    wireTitle: (p: {
        slot: string;
    }) => string;
    /** Wire-picker close control. */
    closeWirePicker: string;
    /** The unwire button's full contract sentence. */
    unwire: string;
    /** Wire-picker empty state. */
    noEarlierCards: string;
    /** Single-output row label (the unnamed primary artifact). */
    primaryOutput: string;
    /** Row sub-line when an upstream ran but produced nothing. */
    noArtifacts: string;
    /** Row sub-line for an upstream that has not run. */
    notRunYet: string;
    /** Selected-row tag. */
    wired: string;
};
/** The dictionary's key union — the typed `t` seat's domain. */
export type SquareCopyKey = keyof typeof squareCopy;
/** Resolve one copy entry. Plain-string entries return verbatim;
 *  template entries receive their params (a plain entry given params
 *  ignores them; a template entry without params renders its holes
 *  empty — the wall pins every template's params at its seats).
 * @param key - the copy id to resolve.
 * @param params - the template's parameters (plain entries take none).
 * @returns the locale-owned copy string. */
export declare function t(key: SquareCopyKey, params?: Record<string, string>): string;
/** Every dictionary key with its resolved-or-templated text — the
 *  locale wall's census input (dead keys are findings, so the wall
 *  walks the whole dictionary, not a sample).
 * @param templateParams - params handed to every template entry.
 * @returns one [key, text] pair per dictionary key. */
export declare function allSquareCopy(templateParams: Record<string, string>): Array<[SquareCopyKey, ReactNode]>;
//# sourceMappingURL=square.d.ts.map