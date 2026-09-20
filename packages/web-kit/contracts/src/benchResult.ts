/** benchResult.ts — THE BENCH STAGE RESULT CONTRACT (the operator's
 * law, 2026-09-20: "this can all be validated by contract"). The
 * run observer patches this row onto the bench stage; every
 * consumer (the preview harvest, the drill, the studio adapters)
 * reads through this shape. The contract carries its own runtime
 * validator — `benchResultDefects` — and the WRITER asserts it
 * before patching, the READER normalizes through it, and the WALLS
 * pin it against real served bytes. A fixture can lie; a contract
 * pinned to the live shape cannot.
 *
 * THE ONE-FILE-ONE-KEY LAW: every url appears under EXACTLY ONE
 * artifacts key. A file under two keys renders twice — the doubled
 * rowset disease (the legacy 'video' stamp wrote the stage url —
 * which IS gallery[0] — under a second key, so every image-gen
 * result rendered the same picture as hero AND rest-thumb). The
 * primary `url` field may NAME a file that also lives in the map
 * (it is the primary POINTER, not a second key) — but the map's
 * VALUES are unique, always. */

/** The bench row's result face — what a run writes onto the stage. */
export interface BenchStageResult {
  /** The producing run's identity (stable across the run cycle:
   * the start patch and the terminal patch carry the same id). */
  run_id: string
  /** The primary output's url (the hero's own file). */
  url?: string
  /** Named artifacts → urls. ONE FILE, ONE KEY (see the law above). */
  artifacts?: Record<string, string>
  /** The flat url list (primary first) — consumers that don't key
   * by name (the h3 timeline's stitch-first list). */
  assetUrls?: string[]
  /** A failed run's reason, verbatim (the silent-failure cure). */
  error?: string
}

/** Validate a result row against the contract. Returns the defect
 * list — EMPTY means the row is lawful. Each defect names the law
 * and the offending keys, in the door's own voice. */
export function benchResultDefects(row: unknown): string[] {
  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return ['result: not an object']
  }
  const r = row as Record<string, unknown>
  const defects: string[] = []
  if (typeof r.run_id !== 'string' || r.run_id === '') {
    defects.push('run_id: missing or empty (every result names its run)')
  }
  if (r.url !== undefined && (typeof r.url !== 'string' || r.url === '')) {
    defects.push('url: present but not a non-empty string')
  }
  if (r.artifacts !== undefined) {
    if (typeof r.artifacts !== 'object' || r.artifacts === null || Array.isArray(r.artifacts)) {
      defects.push('artifacts: not an object (the name→url map)')
    } else {
      const seen = new Map<string, string[]>()
      for (const [k, v] of Object.entries(r.artifacts as Record<string, unknown>)) {
        if (typeof v !== 'string' || v === '') {
          defects.push(`artifacts.${k}: not a non-empty string url`)
          continue
        }
        const keys = seen.get(v) ?? []
        keys.push(k)
        seen.set(v, keys)
      }
      for (const [url, keys] of seen) {
        if (keys.length > 1) {
          defects.push(
            'one-file-one-key: ' + url + ' rides ' + keys.length + ' keys (' + keys.join(', ') +
            ') — a file under two keys renders twice',
          )
        }
      }
    }
  }
  if (r.assetUrls !== undefined) {
    if (!Array.isArray(r.assetUrls)) {
      defects.push('assetUrls: not an array')
    } else {
      r.assetUrls.forEach((u, i) => {
        if (typeof u !== 'string' || u === '') {
          defects.push(`assetUrls[${String(i)}]: not a non-empty string url`)
        }
      })
    }
  }
  if (r.error !== undefined && typeof r.error !== 'string') {
    defects.push('error: present but not a string')
  }
  return defects
}
