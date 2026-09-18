/** preview-kinds.ts — the preview seam consult + the params chip +
 * the artifact harvest (pure projections, extracted from CardsTab.tsx
 * hour 15). */

import type { FormSpecDoc } from './spec-form.tsx'

/** THE PREVIEW SEAM CONSULT (hour-9 law: "Where the VIDEO PREVIEW
 *  and the IMAGE PREVIEW of other cards go in a SLOT with SHARED DSH
 *  PRIMITIVES"): one consult, keyed by media kind, the card-base
 *  shared previews as the DEFAULTS. Every card's rendered output
 *  previews through this — image cards get the shared image preview,
 *  video cards the shared video one; a studio's own stage view is
 *  its specialization (the claim-over-default law). */
export function previewKindFor(url: string): 'video' | 'image' | 'audio' | 'mesh' | null {
  const u = url.toLowerCase()
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(u)) return 'video'
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/.test(u)) return 'image'
  if (/\.(mp3|wav|ogg|flac|m4a|aac)(\?|$)/.test(u)) return 'audio'
  if (/\.(glb|gltf)(\?|$)/.test(u)) return 'mesh'
  return null
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
 *  list second — the harvest law the h3 adapter states). */
export function previewArtifactsFor(row: Record<string, unknown>): Array<{ name: string, url: string }> {
  const result = typeof row['result'] === 'object' && row['result'] !== null ? row['result'] as Record<string, unknown> : {}
  const out: Array<{ name: string, url: string }> = []
  const arts = typeof result['artifacts'] === 'object' && result['artifacts'] !== null ? result['artifacts'] as Record<string, unknown> : {}
  for (const [name, val] of Object.entries(arts)) {
    if (typeof val === 'string' && val !== '') out.push({ name, url: val })
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
