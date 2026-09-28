/** preview-kinds.ts — the preview seam consult + the params chip +
 * the artifact harvest (pure projections, extracted from CardsTab.tsx
 * hour 15). */

import type { FormSpecDoc } from './spec-form.tsx'
import { mediaKindOf } from '../../../../web-kit/contracts/src/mediaKinds.ts'

/** THE PREVIEW SEAM CONSULT (hour-9 law: "Where the VIDEO PREVIEW
 *  and the IMAGE PREVIEW of other cards go in a SLOT with SHARED DSH
 *  PRIMITIVES"): one consult, keyed by media kind, the card-base
 *  shared previews as the DEFAULTS. Every card's rendered output
 *  previews through this — image cards get the shared image preview,
 *  video cards the shared video one; a studio's own stage view is
 *  its specialization (the claim-over-default law).
 *
 *  ONE CLASSIFIER (the li-ay stroke, 2026-10-11): this private
 *  three-regex sniff was the FIFTH media vocabulary on the estate —
 *  it carried avif but dropped svg/bmp (an .svg artifact got NO
 *  preview) and missed mkv/avi/aac entirely. The contract's
 *  mediaKindOf classifies now; this seat keeps only its own two
 *  concerns — the query string a served url may carry, and the UI's
 *  'mesh' spelling for the vocab's 'model' kind. */
export function previewKindFor(url: string): 'video' | 'image' | 'audio' | 'mesh' | null {
  const kind = mediaKindOf(url.split("?")[0] as string)
  if (kind === undefined) return null
  return kind === 'model' ? 'mesh' : kind
}

/** THE PRIMARY-OUTPUT RESOLUTION (2026-09-13): the card's DECLARED
 *  primary output — the served form-spec's `outputs.default` — is
 *  the preview's kind, never a url sniff. The sniff stays ONLY as
 *  the fallback: when no spec is in hand (a flow row without card
 *  identity), or when the declaration names a non-previewable kind
 *  (text/seg) whose artifacts may still carry a renderable url —
 *  mask-studio declares 'seg' and its artifact IS a png; the sniff
 *  keeps its gallery alive. Declared-previewable ALWAYS wins: an
 *  audio card previews audio even before artifacts land (the empty
 *  state names the kind), a mesh card rides the raw-three stage. */
const PREVIEWABLE_KINDS: ReadonlySet<string> = new Set(['video', 'image', 'audio', 'mesh'])

export function primaryKindFor(spec: FormSpecDoc | null | undefined, url: string): 'video' | 'image' | 'audio' | 'mesh' | null {
  const declared = spec?.outputs?.['default']
  if (typeof declared === 'string' && PREVIEWABLE_KINDS.has(declared)) {
    return declared as 'video' | 'image' | 'audio' | 'mesh'
  }
  return previewKindFor(url)
}

/** THE PARAMS CHIP (the output-component stroke — the operator's
 *  law: old generations are tagged by the parameters that differ):
 *  the comma-joined KEYS whose values differ between an archived
 *  generation's params snapshot and the live params. undefined when
 *  the snapshot is absent (an entry archived before the stroke) or
 *  nothing differs — same params, same picture, no noise. */
export function paramsDiffKeys(a: unknown, b: unknown): string | undefined {
  const ok = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
  if (!ok(a) || !ok(b)) return undefined
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const diff: string[] = []
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diff.push(k)
  }
  if (diff.length === 0) return undefined
  return diff.slice(0, 4).join(', ') + (diff.length > 4 ? '…' : '')
}

/** The stage row's preview artifacts, harvested from the estate's
 *  result shape (artifacts name→url map first, the flat assetUrls
 *  list second — the harvest law the h3 adapter states).
 *  ONE FILE, ONE ARTIFACT (2026-09-20, the operator's catch: "two
 *  rowsets under the preview image"): rows written before the
 *  observer's de-stamp carry the same url under two keys (the
 *  legacy 'video' stamp + the gallery name) — the harvest dedupes
 *  BY URL so those rows render ONE artifact, and the legacy
 *  'video' name never paints (retitled 'output'): the word
 *  'video' on an image card is the phantom's face. */
export function previewArtifactsFor(row: Record<string, unknown>): Array<{ name: string, url: string }> {
  const result = typeof row['result'] === 'object' && row['result'] !== null ? row['result'] as Record<string, unknown> : {}
  const out: Array<{ name: string, url: string }> = []
  const seen = new Set<string>()
  const arts = typeof result['artifacts'] === 'object' && result['artifacts'] !== null ? result['artifacts'] as Record<string, unknown> : {}
  // TWO PASSES: real names claim their urls first; the legacy
  // 'video' stamp fills only UNCLAIMED urls — so a double-keyed
  // legacy row keeps its REAL gallery name, and a lone stamp still
  // renders (retitled 'output': the word 'video' never paints on
  // an image row).
  for (const [name, val] of Object.entries(arts)) {
    if (name === 'video') continue
    if (typeof val === 'string' && val !== '' && !seen.has(val)) {
      seen.add(val)
      out.push({ name, url: val })
    }
  }
  for (const [name, val] of Object.entries(arts)) {
    if (name !== 'video') continue
    if (typeof val === 'string' && val !== '' && !seen.has(val)) {
      seen.add(val)
      out.push({ name: 'output', url: val })
    }
  }
  if (out.length === 0 && Array.isArray(result['assetUrls'])) {
    for (const u of result['assetUrls']) {
      if (typeof u === 'string' && u !== '') out.push({ name: 'output', url: u })
    }
  }
  if (out.length === 0 && typeof result['url'] === 'string' && result['url'] !== '') {
    out.push({ name: 'output', url: result['url'] as string })
  }
  return out
}

/** The stage row's REPORT harvest (ROADMAP 11e): the named
 *  machine-readable verdicts a run writes beside its media — the
 *  same object the agent loop gates on, rendered by the result
 *  row's ONE default atom (card-base's ReportView, claimed by
 *  kind). ONLY kind-'report' entries harvest; a degenerate value
 *  (not an object) never renders — the contract's validator names
 *  it at the writer, the reader just stays silent. */
export function previewReportsFor(row: Record<string, unknown>): Array<{ name: string, report: {
  kind: 'report'
  status: 'pass' | 'fail' | 'warn'
  title?: string
  chips?: string[]
  rows?: Record<string, string | number | boolean>
} }> {
  const result = typeof row['result'] === 'object' && row['result'] !== null ? row['result'] as Record<string, unknown> : {}
  const raw = typeof result['reports'] === 'object' && result['reports'] !== null && !Array.isArray(result['reports'])
    ? result['reports'] as Record<string, unknown> : {}
  const out: Array<{ name: string, report: { kind: 'report', status: 'pass' | 'fail' | 'warn', title?: string, chips?: string[], rows?: Record<string, string | number | boolean> } }> = []
  for (const [name, val] of Object.entries(raw)) {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) continue
    const rep = val as Record<string, unknown>
    if (rep['kind'] !== 'report') continue
    if (rep['status'] !== 'pass' && rep['status'] !== 'fail' && rep['status'] !== 'warn') continue
    out.push({
      name,
      report: {
        kind: 'report',
        status: rep['status'],
        ...(typeof rep['title'] === 'string' && rep['title'] !== '' ? { title: rep['title'] } : {}),
        ...(Array.isArray(rep['chips']) && rep['chips'].every((c) => typeof c === 'string' && c !== '') ? { chips: rep['chips'] as string[] } : {}),
        ...(typeof rep['rows'] === 'object' && rep['rows'] !== null && !Array.isArray(rep['rows'])
          && Object.values(rep['rows'] as Record<string, unknown>).every((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
          ? { rows: rep['rows'] as Record<string, string | number | boolean> } : {}),
      },
    })
  }
  return out
}
