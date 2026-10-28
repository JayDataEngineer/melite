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
import type { ReactNode } from 'react'

/** The typed dictionary. Keys are stable copy ids; consumers pass
 *  exactly the params the entry declares — the type is the seat's
 *  own enforcement (a missing param is a compile error, not a
 *  runtime hole). */
// v8 ignore next -- exercised key-by-key by the locale wall's census arm
export const squareCopy = {
  /** Menu row + modal title: pick from the other stages' outputs. */
  fromFlow: 'From flow',
  /** Menu row + modal title: pick from the runs library. */
  fromMedia: 'From media',
  /** Menu row: open the OS file dialog. */
  fromFile: 'From file',
  /** Menu danger row: clear the slot. */
  clearSlot: '— clear —',
  /** Flow-modal description; the kind suffix names the filter. */
  flowDescription: (p: { kindSuffix: string }): string => 'The other stages\u2019 latest outputs' + p.kindSuffix,
  /** Media-modal description; the kind suffix names the filter. */
  mediaDescription: (p: { kindSuffix: string }): string => 'The runs library' + p.kindSuffix,
  /** Modal close control (both picker modes). */
  closePicker: 'Close picker',
  /** Empty state while the media list loads. */
  loading: 'loading\u2026',
  /** Empty state when the media door refused. */
  mediaUnavailable: (p: { reason: string }): string => 'media library unavailable \u2014 ' + p.reason,
  /** Empty state: the list is honestly empty. */
  nothingToPick: 'nothing to pick yet',
  /** Picker search field placeholder + aria name (2026-11-12). */
  searchPlaceholder: 'Search by name',
  /** Filtered-empty face: the query matched no row (2026-11-12). */
  noMatchFor: (p: { query: string }): string => 'no match for “' + p.query + '”',
  /** The detach button (square). */
  detach: 'Detach',
  /** The held face's hover title: the slot holds a value no preview
   *  can render (a bare artifact name, an unresolved path). */
  heldNoPreview: 'attached — no preview',
  /** Accessible name of the detach button: "Detach <seat>". */
  detachSeat: (p: { seat: string }): string => 'Detach ' + p.seat,
  /** Accessible name of the square when no caption stands. */
  sourceFallback: 'source',
  /** Accessible-name suffix of a captioned square: "<seat> source". */
  seatSource: (p: { seat: string }): string => p.seat + ' source',
  /** The file-pick button: "Pick a file for <label>". */
  pickFileFor: (p: { label: string }): string => 'Pick a file for ' + p.label,
  /** Wire-picker title: "Wire <slot> from an earlier card". */
  wireTitle: (p: { slot: string }): string => `Wire ${p.slot} from an earlier card`,
  /** Wire-picker close control. */
  closeWirePicker: 'Close wire picker',
  /** The unwire button's full contract sentence. */
  unwire: 'Unwire \u2014 this slot will ask for a file or wire again',
  /** Wire-picker empty state. */
  noEarlierCards: 'No earlier cards yet \u2014 add a card before this one to wire from it.',
  /** Single-output row label (the unnamed primary artifact). */
  primaryOutput: 'primary',
  /** Row sub-line when an upstream ran but produced nothing. */
  noArtifacts: 'no artifacts',
  /** Row sub-line for an upstream that has not run. */
  notRunYet: 'not run yet',
  /** Selected-row tag. */
  wired: 'wired',
  /** In-flight upload face: "uploading <name>…" — a tens-of-MB
   *  clip's base64 POST runs minutes with no engine events, and the
   *  old mute face (empty string, rendered as nothing) read as a
   *  dead square (the operator's upload-lag burn). */
  uploading: (p: { name: string }): string => 'uploading ' + p.name + '\u2026',
}

/** The dictionary's key union — the typed `t` seat's domain. */
export type SquareCopyKey = keyof typeof squareCopy

/** Resolve one copy entry. Plain-string entries return verbatim;
 *  template entries receive their params (a plain entry given params
 *  ignores them; a template entry without params renders its holes
 *  empty — the wall pins every template's params at its seats).
 * @param key - the copy id to resolve.
 * @param params - the template's parameters (plain entries take none).
 * @returns the locale-owned copy string. */
export function t(key: SquareCopyKey, params?: Record<string, string>): string {
  const entry = squareCopy[key] as string | ((p: Record<string, string>) => string)
  if (typeof entry === 'string') return entry
  // a template resolved without its params renders the holes EMPTY —
  // the seat never leaks the string "undefined" into the UI.
  const holes = new Proxy(params ?? {}, {
    get: (given, name: string): string => (given as Record<string, string>)[name] ?? '',
  })
  return entry(holes)
}

/** Every dictionary key with its resolved-or-templated text — the
 *  locale wall's census input (dead keys are findings, so the wall
 *  walks the whole dictionary, not a sample).
 * @param templateParams - params handed to every template entry.
 * @returns one [key, text] pair per dictionary key. */
export function allSquareCopy(templateParams: Record<string, string>): Array<[SquareCopyKey, ReactNode]> {
  return (Object.keys(squareCopy) as SquareCopyKey[]).map((k) => {
    const entry = squareCopy[k] as string | ((p: Record<string, string>) => string)
    return [k, typeof entry === 'string' ? entry : entry(templateParams)]
  })
}
