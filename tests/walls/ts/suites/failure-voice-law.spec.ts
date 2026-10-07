/** The failure-voice law (R4 unmask, f2d9c36f-style): a caught
 *  rejection voices the thrower's own words — `rejectionVoice(e)` —
 *  never a fixed string literal that masks what was thrown. The
 *  lossless inline voice (`e instanceof Error ? e.message :
 *  String(e)`) passes; a literal false-branch (`: 'upload failed'`)
 *  fails.
 *
 *  The scan is repo-wide over shipped sources because the law is
 *  estate-wide; two sibling-batch files are NAMED exemptions (their
 *  batch owns the cure, this wall only pins the debt):
 *  - packages/engines/comfyui/src/action_cards/motion/ui/viewers/MotionViewer.tsx
 *  - packages/motion/motion/src/ui/studio/useMotionMedia.ts
 *  (five masked literals). When their batch lands its unmask, the
 *  exemptions shrink to nothing — never grow.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..', '..')

const EXEMPT = new Set([
  'packages/engines/comfyui/src/action_cards/motion/ui/viewers/MotionViewer.tsx',
  'packages/motion/motion/src/ui/studio/useMotionMedia.ts',
])

function stripComments(body: string): string {
  return body
    // block-comment CONTENT dies but its newlines survive (reported
    // line numbers stay file-true)
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
    .replace(/(^|\s)\/\/[^\n]*/g, '$1')
}

/** The line with its string bodies blanked to SPACES (same length —
 *  positions stay file-true): branch-colon search never trips on a
 *  `": "` inside the true-branch. Template `${}` nests are opaque
 *  (accepted edge). */
function blankStrings(line: string): string {
  let out = ''
  let i = 0
  while (i < line.length) {
    const c = line[i]
    if (c === "'" || c === '"' || c === '`') {
      const q = c
      out += ' '
      i++
      while (i < line.length && line[i] !== q) {
        if (line[i] === '\\') { out += '  '; i += 2; continue }
        out += line[i] === '\n' ? '\n' : ' '
        i++
      }
      out += ' '
      i++
      continue
    }
    out += c
    i++
  }
  return out
}
/** A masked voice: `instanceof Error ? <voice> : '<literal>'` — the
 *  false-branch opens with a string literal. The lossless
 *  `: String(e)` / `: e.foo` / `: new X(...)` forms open with an
 *  identifier and pass. */
function maskedLines(rel: string, body: string): string[] {
  const out: string[] = []
  const clean = stripComments(body).split('\n')
  clean.forEach((line, i) => {
    if (!line.includes('instanceof Error')) return
    // the LAST ? opens the innermost ternary; its branch colon is
    // the FIRST colon after it — searched on the string-blanked
    // line, judged on the original (same positions)
    const blank = blankStrings(line)
    const q = blank.lastIndexOf('?')
    const c = blank.indexOf(':', q + 1)
    if (q === -1 || c === -1) return
    const tail = line.slice(c + 1).trimStart()
    if (tail.startsWith("'") || tail.startsWith('"') || tail.startsWith('`')) {
      out.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`)
    }
  })
  return out
}

describe('failure-voice law — no masked rejection fallback (R4)', () => {
  it('no shipped source masks a caught rejection behind a string literal', () => {
    const offenders: string[] = []
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        // specs assert ON the voice (matchers like `: ''`) — the law
        // judges shipped sources, not the specs that pin them
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue
        if (e.name === 'test' || e.name === 'tests' || e.name === '__tests__' || e.name === 'fixtures' || e.name === 'e2e') continue
        const p = join(d, e.name)
        if (e.isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx)$/.test(e.name) || e.name.endsWith('.d.ts')) continue
        if (/\.spec\.(ts|tsx)$/.test(e.name)) continue
        const rel = p.replace(ROOT + '/', '')
        if (EXEMPT.has(rel)) continue
        offenders.push(...maskedLines(rel, readFileSync(p, 'utf8')))
      }
    }
    walk(join(ROOT, 'packages'))
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('the exemptions name only sibling-batch files that still mask', () => {
    // The exempt set never grows: every exempt file must STILL mask
    // (a cured file leaves the set), and every exempt file stays
    // outside this batch's walls (no action_cards, no motion studio).
    for (const rel of EXEMPT) {
      const hits = maskedLines(rel, readFileSync(join(ROOT, rel), 'utf8'))
      expect(hits.length > 0, `${rel} no longer masks — lift the exemption`).toBe(true)
    }
  })
})
