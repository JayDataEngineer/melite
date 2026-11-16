/**
 * AGENT DOCS PHOTOREAL BAN (operator 2026-11-16, days after the
 * original pre-rc.3 order went unlanded): the retired photoreal
 * family (z-image) is OUT of the docs and text — moss-image is its
 * replacement in every routing seat. The order was confirmed done
 * by the operator and never existed as bytes in any reachable git
 * object (all refs, all 149 dangling commits, the rc.3 tag, and
 * the served estate all carried the old routing — receipts in the
 * conversation, 2026-11-16); the deployed agent kept routing
 * "photorealistic product shot" to the retired family because the
 * tree still taught it. This wall makes the silence law absolute
 * and checks the replacement is actually taught.
 *
 * THE LAW, two arms:
 *   1. SILENCE — no agents doc under any package teaches the
 *      token "z-image" at all (routing rows, worked examples,
 *      vocabulary pairs). Absolute: the ban note itself spells the
 *      family as "the retired photoreal family", so the wall needs
 *      no exception carve-out.
 *   2. THE REPLACEMENT — the image-gen routing doc teaches
 *      moss-image as THE house photoreal (a ban that only checks
 *      absence would pass with photoreal routing deleted
 *      entirely; the operator's order was REPLACE, not REMOVE).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const PACKAGES = join(import.meta.dirname, '..', '..', '..', '..', 'packages')
const RETIRED = 'z-image'

const agentDocs = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory() && entry === 'agents') {
      out.push(...readdirSync(full).filter((f) => f.endsWith('.md')).map((f) => join(full, f)))
    } else if (st.isDirectory()) {
      out.push(...agentDocs(full))
    }
  }
  return out
}

test('SILENCE: no agents doc teaches the retired photoreal family', () => {
  const offenders: string[] = []
  for (const pkg of readdirSync(PACKAGES)) {
    const pkgDir = join(PACKAGES, pkg)
    if (!statSync(pkgDir).isDirectory()) continue
    let docs: string[]
    try {
      docs = agentDocs(pkgDir)
    } catch {
      continue
    }
    for (const doc of docs) {
      if (readFileSync(doc, 'utf8').includes(RETIRED)) offenders.push(doc)
    }
  }
  expect(offenders, 'the retired photoreal family is OUT of the docs and text (operator 2026-11-16): routing rows, worked examples, vocabulary pairs — moss-image is the replacement in every seat').toEqual([])
})

test('THE REPLACEMENT: image-gen teaches moss-image as the house photoreal', () => {
  const doc = readFileSync(join(PACKAGES, 'image', 'image-gen', 'src', 'agents', 'AGENT.md'), 'utf8')
  expect(doc, 'moss-image carries the photoreal routing seat').toMatch(/moss-image.*photoreal/s)
  expect(doc, 'the house-photoreal law is stated').toMatch(/THE HOUSE PHOTOREAL/)
})
