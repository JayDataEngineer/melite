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

/** A machine-readable verdict an agent loop writes beside its media
 *  (ROADMAP 11e — the rig→validate→fix loop's gate). INLINE DATA,
 *  never a file: `reports` rides the result row beside `artifacts`,
 *  each entry declaring its own kind — today exactly 'report'. The
 *  agent loop reads the same object the result row renders; the
 *  ONE-FILE-ONE-KEY law governs `artifacts` (urls) and never sees
 *  this map. */
export interface BenchReport {
  /** the kind declaration — the claim key. Always 'report'. */
  kind: 'report'
  /** the gate's verdict. */
  status: 'pass' | 'fail' | 'warn'
  /** display title; omitted → the entry's own name renders. */
  title?: string
  /** short status chips (the check names that make up the verdict). */
  chips?: string[]
  /** the key-value body — the machine-readable rows. */
  rows?: Record<string, string | number | boolean>
}

/** The bench row's result face — what a run writes onto the stage. */
export interface BenchStageResult {
  /** The producing run's identity (stable across the run cycle:
   * the start patch and the terminal patch carry the same id). */
  run_id: string
  /** The primary output's url (the hero's own file). */
  url?: string
  /** Named artifacts → urls. ONE FILE, ONE KEY (see the law above). */
  artifacts?: Record<string, string>
  /** Named machine-readable verdicts (kind 'report') — INLINE, no
   *  urls, never subject to the one-file-one-key law. */
  reports?: Record<string, BenchReport>
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
  if (r.reports !== undefined) {
    if (typeof r.reports !== 'object' || r.reports === null || Array.isArray(r.reports)) {
      defects.push('reports: not an object (the name→verdict map)')
    } else {
      for (const [k, v] of Object.entries(r.reports as Record<string, unknown>)) {
        if (typeof v !== 'object' || v === null || Array.isArray(v)) {
          defects.push(`reports.${k}: not an object (kind 'report' entry)`)
          continue
        }
        const rep = v as Record<string, unknown>
        if (rep['kind'] !== 'report') {
          defects.push(`reports.${k}: kind is not 'report' (the only entry kind)`)
        }
        if (rep['status'] !== 'pass' && rep['status'] !== 'fail' && rep['status'] !== 'warn') {
          defects.push(`reports.${k}: status is not pass|fail|warn`)
        }
        if (rep['title'] !== undefined && (typeof rep['title'] !== 'string' || rep['title'] === '')) {
          defects.push(`reports.${k}.title: present but not a non-empty string`)
        }
        if (rep['chips'] !== undefined) {
          if (!Array.isArray(rep['chips'])) {
            defects.push(`reports.${k}.chips: not an array`)
          } else {
            rep['chips'].forEach((c, i) => {
              if (typeof c !== 'string' || c === '') {
                defects.push(`reports.${k}.chips[${String(i)}]: not a non-empty string`)
              }
            })
          }
        }
        if (rep['rows'] !== undefined) {
          if (typeof rep['rows'] !== 'object' || rep['rows'] === null || Array.isArray(rep['rows'])) {
            defects.push(`reports.${k}.rows: not an object (the key-value body)`)
          } else {
            for (const [rk, rv] of Object.entries(rep['rows'] as Record<string, unknown>)) {
              if (typeof rv !== 'string' && typeof rv !== 'number' && typeof rv !== 'boolean') {
                defects.push(`reports.${k}.rows.${rk}: not a string|number|boolean`)
              }
            }
          }
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

/** THE DOWNLOAD FILENAME (the boundary audit's C5, promoted to the
 *  contract by A-M10): a source URL names a file by its PATHNAME's
 *  last segment, percent-decoded — never the query, never the
 *  fragment, never "". `split("/").pop()` kept both, so the manager
 *  downloaded under a clean name while the row inspected one with
 *  "f.safetensors?download=1" glued on, and the post-download check
 *  reported model-not-landed for a model that WAS on disk. A URL
 *  ending in "/" names no file: the result is "" and the caller's
 *  destination check refuses it by name. One derivation, contract-
 *  owned, so the wall can DRIVE it (a source-substring pin passed on
 *  dead code). */
export function artifactFileName(sourceUrl: string): string {
  let pathname = sourceUrl
  try {
    pathname = new URL(sourceUrl).pathname
  } catch {
    // not an absolute URL — take everything before # and ?
    pathname = sourceUrl.split("#")[0]?.split("?")[0] ?? sourceUrl
  }
  // A PATHNAME ENDING IN "/" NAMES A DIRECTORY, NOT A FILE: the
  // documented law (the caller's destination check refuses an empty
  // name by name) was FALSE against the implementation — the empty
  // segments were filtered, so ".../models/x/" yielded "x", the
  // directory's own name, and the downloader was handed a filename
  // that is not a file. Honoured here, once.
  if (pathname.endsWith("/")) return ""
  const last = pathname.split("/").filter((s) => s !== "").pop() ?? ""
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}
