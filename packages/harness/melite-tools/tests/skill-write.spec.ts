// melite_skill_write walls (vitest, estate mocked — no gateway): the
// authoring door posts ONE document through the typed lane, the
// required trio rides as stated, the optional bags never widen to
// junk (a non-string example is dropped, not stringified), the render
// names the served id and prints REFUSED verbatim, and the presenter
// keeps its single gated seat.

// @contract gates-skill-doc-body-cap

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { skillWrite } from '../src/tools/skill-write.ts'
import { fakeEstate } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'

const exec = fakeExec(AbortSignal.timeout(2000))

const ANSWER = {
  id: 'model:krea-2:lora-hand-off',
  name: 'lora-hand-off',
  description: 'How the dropped lora is run',
  path: '/state/skills/krea-2/lora-hand-off/SKILL.md',
  replaced: false,
}

describe('melite_skill_write presentCall — the streaming tile', () => {
  test('names the family/leaf; the gate owns the junk face', () => {
    const { estate } = fakeEstate({ skillWrite: () => ANSWER })
    const tool = skillWrite(estate)
    const tile = tool.presentCall!({ model: 'krea-2', name: 'lora-hand-off', description: 'd' } as never)!
    assert.equal(tile.title, 'Write skill krea-2/lora-hand-off')
    assert.equal((tile as GenericCallView).rawInput, 'krea-2/lora-hand-off')
    assert.equal(tool.presentCall!({} as never), undefined)
    assert.equal(tool.presentCall!(null as never), undefined)
  })
})

describe('melite_skill_write execute — the authoring door', () => {
  test('the required trio is refused at the wrapper gate before any fetch', async () => {
    const { seen, estate } = fakeEstate({ skillWrite: () => ANSWER })
    const tool = skillWrite(estate)
    await assert.rejects(tool.execute({ model: 'krea-2', name: 'x' } as never, exec), ToolArgsError)
    assert.equal(seen.length, 0)
  })

  test('posts one document: the required trio stated, the optional bags never widened to junk', async () => {
    const { seen, estate } = fakeEstate({ skillWrite: () => ANSWER })
    const tool = skillWrite(estate)
    const value = await tool.execute(
      {
        model: 'krea-2',
        name: 'lora-hand-off',
        description: 'How the dropped lora is run',
        trigger_words: ['shapstraction', 'geometric abstraction'],
        examples: ['matte cream backdrop'],
        body: 'strength 0.9',
        lora: 'Shapstraction_x.safetensors',
        replace: true,
      } as never,
      exec,
    )
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.lane, 'skillWrite')
    const doc = seen[0]!.args[0] as Record<string, unknown>
    assert.equal(doc['model'], 'krea-2')
    assert.equal(doc['name'], 'lora-hand-off')
    assert.equal(doc['description'], 'How the dropped lora is run')
    assert.deepEqual(doc['trigger_words'], ['shapstraction', 'geometric abstraction'])
    assert.deepEqual(doc['examples'], ['matte cream backdrop'])
    assert.equal(doc['body'], 'strength 0.9')
    assert.equal(doc['lora'], 'Shapstraction_x.safetensors')
    assert.equal(doc['replace'], true)
    assert.equal((value as { id?: string }).id, 'model:krea-2:lora-hand-off')
    assert.equal((value as { replaced?: boolean }).replaced, false)
  })

  test('a non-string example is refused at the wrapper gate (never stringified into the doc)', async () => {
    const { seen, estate } = fakeEstate({ skillWrite: () => ANSWER })
    const tool = skillWrite(estate)
    await assert.rejects(
      tool.execute({ model: 'krea-2', name: 'n', description: 'd', examples: ['ok', 7] } as never, exec),
      ToolArgsError,
    )
    assert.equal(seen.length, 0)
  })

  test('an absent optional bag posts the empty spelling, never undefined', async () => {
    const { seen, estate } = fakeEstate({ skillWrite: () => ANSWER })
    const tool = skillWrite(estate)
    await tool.execute({ model: 'krea-2', name: 'n', description: 'd' } as never, exec)
    const doc = seen[0]!.args[0] as Record<string, unknown>
    assert.deepEqual(doc['trigger_words'], [])
    assert.deepEqual(doc['examples'], [])
    assert.equal(doc['body'], '')
    assert.equal(doc['lora'], '')
    assert.equal(doc['replace'], false)
  })

  // ── THE AUTHORED-DOC CAP (tool-context audit F5, 2026-11-22) ──
  // The body rides melite_skill_read WHOLE, so an unbounded write was
  // the one UNBOUNDED path into the context. The write door refuses
  // LOUD past 32KB (the load seat's own budget is the house
  // precedent) and the seat never meets an over-cap doc.
  test('THE AUTHORED-DOC CAP: a body past 32KB refuses at the door naming the bytes — the seat never sees it', async () => {
    const { seen, estate } = fakeEstate({ skillWrite: () => ANSWER })
    const tool = skillWrite(estate)
    const big = 'x'.repeat(32 * 1024 + 1)
    await assert.rejects(
      tool.execute({ model: 'krea-2', name: 'n', description: 'd', body: big } as never, exec),
      /skill doc body 32769 bytes, over the 32KB authored-doc cap/,
    )
    assert.equal(seen.length, 0, 'the estate seat never meets an over-cap doc')
  })

  test('the cap edge: a body at exactly 32KB rides — the door bounds, never narrows an honest write', async () => {
    const { seen, estate } = fakeEstate({ skillWrite: () => ANSWER })
    const tool = skillWrite(estate)
    const edge = 'y'.repeat(32 * 1024)
    await tool.execute({ model: 'krea-2', name: 'n', description: 'd', body: edge } as never, exec)
    assert.equal(seen.length, 1)
    const doc = seen[0]!.args[0] as Record<string, unknown>
    assert.equal(doc['body'], edge)
  })

  test('the render names the served id and voices a refusal verbatim', async () => {
    const { estate } = fakeEstate({ skillWrite: () => ANSWER })
    const tool = skillWrite(estate)
    const ok = tool.output!.render!({ model: 'krea-2', name: 'lora-hand-off' } as never, ANSWER as never)
    const okText = (ok as Array<{ text: string }>)[0]!.text
    assert.ok(okText.includes('melite_skill_write model:krea-2:lora-hand-off'))
    assert.ok(okText.includes('/state/skills/krea-2/lora-hand-off/SKILL.md'))
    const refused = tool.output!.render!({} as never, { error: 'skill write refusal: model: Field required' } as never)
    assert.equal(
      (refused as Array<{ text: string }>)[0]!.text,
      'melite_skill_write REFUSED: skill write refusal: model: Field required',
    )
  })
})
