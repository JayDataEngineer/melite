// THE CONSTRUCT-VERB SINGLE-HOME WALL (the skills-vs-dsh-autodocs
// audit's cure 1, 2026-11-12): the verb set was spelled four ways in
// melite-construct.ts — the header comment (stale: missing clear +
// floor), MUTATION_VERBS, the schema enum, and the param description
// — with no gate asserting any two agree. CONSTRUCT_VERBS is the one
// home; this wall is the regenerate-in-test judge (DSH's --check
// pattern in miniature, no file on disk): the RENDERED schema must
// equal the const. No @contract marker: package-local law.
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { meliteConstruct, CONSTRUCT_VERBS } from '../src/tools/melite-construct.ts'
import { fakeEstate } from './fake-estate.ts'

describe('CONSTRUCT_VERBS — one home, every rendering derives', () => {
  const tool = meliteConstruct(fakeEstate({}).estate)

  test('the schema enum IS the const (a stale spelling cannot diverge)', () => {
    const schema = tool.parameters as unknown as {
      properties: { verb: { enum?: string[] } }
    }
    assert.deepEqual(
      schema.properties.verb.enum,
      [...CONSTRUCT_VERBS],
      'the rendered enum must equal the exported const, same order',
    )
  })

  test('the param description names exactly the const\'s verbs', () => {
    const schema = tool.parameters as unknown as {
      properties: { verb: { description?: string } }
    }
    const desc = schema.properties.verb.description ?? ''
    for (const v of CONSTRUCT_VERBS) {
      assert.ok(desc.includes(v), `the param description must name the verb ${v}`)
    }
    const named = desc.replace(/[|().]/g, ' ').split(/\s+/).filter((w) => (CONSTRUCT_VERBS as readonly string[]).includes(w))
    assert.equal(new Set(named).size, CONSTRUCT_VERBS.length, 'every verb appears in the rendered list exactly once')
  })

  test('the header comment lists every const verb (the stale-header class dies here)', () => {
    const src = readFileSync(new URL('../src/tools/melite-construct.ts', import.meta.url), 'utf8')
    const header = src.slice(0, src.indexOf('export const CONSTRUCT_VERBS'))
    for (const v of CONSTRUCT_VERBS) {
      assert.ok(
        header.includes(`   ${v.padEnd(13)}`) || header.includes(`   ${v} `),
        `the file-header verb list must carry ${v} (the audit found clear + floor missing)`,
      )
    }
  })
})
