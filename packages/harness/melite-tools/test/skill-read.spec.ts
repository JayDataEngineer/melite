// melite_skill_read walls (vitest, estate mocked — no gateway): the tier-2
// body loads exactly one id (empty ids throw before any fetch,
// missing ids throw at the wrapper gate), sparse rows fall back to
// the requested id + null echoes + empty content, and the render
// prefers the call id, then the value id, then '?'.
//
// F-1 seam (2026-11-05): the tool plane speaks the typed lanes; the
// URL grammar is the browser face's. The URL-spelling arm re-rolled
// to the typed lane + args via `seen`; every other arm is a seam swap.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { skillRead } from '../src/tools/skill-read.ts'
import type { Estate } from '../src/estate.ts'
import { fakeEstate } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'

/** The typed-lane mock (F-1, 2026-11-05): the tool plane's tests
 *  stub the ESTATE seam, never a URL transport. `seen` records the
 *  lane a tool rode; skillRead is this spec's one lane. */
function mockEstate(handler: () => unknown): {
  seen: Array<{ lane: string; args: unknown[] }>;
  estate: Estate;
} {
  return fakeEstate({
    skillRead: (_id: string, _signal: AbortSignal, _timeoutMs?: number) => handler(),
  })
}

function stubEstate(): Estate {
  return fakeEstate({ skillRead: () => ({}) }).estate
}

const exec = fakeExec(AbortSignal.timeout(2000))

describe('melite_skill_read presentCall — the streaming tile', () => {
  test('names the skill; junk renders generic (the re-attached presenter)', () => {
    const tool = skillRead(stubEstate())
    // The tile always answers the generic card — narrow the
    // ToolCallView union to read its rawInput.
    assert.equal(tool.presentCall!({ id: 'run-recovery' } as never)!.title, 'Read skill run-recovery')
    assert.equal((tool.presentCall!({ id: 'run-recovery' } as never)! as GenericCallView).rawInput, 'run-recovery')
    assert.equal(tool.presentCall!({} as never)!.title, 'Read skill ?')
    assert.equal(tool.presentCall!(null as never)!.title, 'Read skill ?')
    assert.equal(tool.presentCall!('x' as never)!.title, 'Read skill ?')
  })
})

describe('melite_skill_read execute — the tier-2 body', () => {
  test('a missing id throws at the wrapper gate (presence contract)', async () => {
    const { seen, estate } = mockEstate(() => ({}))
    const tool = skillRead(estate)
    await assert.rejects(tool.execute({} as never, exec), ToolArgsError)
    assert.equal(seen.length, 0)
  })

  test('an empty id throws before any fetch', async () => {
    const { seen, estate } = mockEstate(() => ({}))
    const tool = skillRead(estate)
    await assert.rejects(tool.execute({ id: '' }, exec), /"id" is required/)
    assert.equal(seen.length, 0)
  })

  test('a full row rides verbatim (the id rides the typed lane verbatim)', async () => {
    const row = {
      id: 'model:krea:photo', name: 'Photo', description: 'stills',
      genre: 'image', model: 'krea', content: '# photo\nbody',
    }
    const { seen, estate } = mockEstate(() => row)
    const tool = skillRead(estate)
    const out = await tool.execute({ id: 'model:krea:photo' }, exec) as Record<string, unknown>
    assert.deepEqual(out, row)
    // THE TYPED LANE (F-1, 2026-11-05): the tool plane speaks the typed
    // lanes; the URL grammar is the browser face's. The old arm spelled
    // GET /v1/skills/<enc id> — the id rides the lane verbatim, with
    // the tool's own 15s bound.
    assert.deepEqual(seen[0], { lane: 'skillRead', args: ['model:krea:photo', exec.signal, 15_000] })
  })

  test('a sparse row falls back (requested id + null echoes + empty body)', async () => {
    const { estate } = mockEstate(() => ({}))
    const tool = skillRead(estate)
    const out = await tool.execute({ id: 'run-recovery' }, exec) as Record<string, unknown>
    assert.deepEqual(out, {
      id: 'run-recovery', name: null, description: null, genre: null, model: null, content: '',
    })
  })
})

describe('melite_skill_read render — the body rides (tier 2)', () => {
  const tool = skillRead(stubEstate())
  const text = (a: unknown, v: unknown) =>
    (tool.output.render(a as never, v as never) as Array<{ text?: string }>)[0].text ?? ''

  test('the body rides under the header (the agent reads the craft)', () => {
    assert.equal(
      text({ id: 'a' }, { id: 'a', name: 'N', content: 'write it thus' }),
      'melite_skill_read a: N\nwrite it thus',
    )
  })

  test('the call id wins, then the value id, then ?; empty body says so', () => {
    assert.equal(text({}, { id: 'b' }), 'melite_skill_read b: loaded\n(no body)')
    assert.equal(text({}, {}), 'melite_skill_read ?: loaded\n(no body)')
    assert.equal(text(null, { id: 'b', name: 'N', content: '' }), 'melite_skill_read b: N\n(no body)')
  })

  test('a refused read renders REFUSED (the refusal is the honest answer)', () => {
    assert.equal(
      text({ id: 'run-recovery' }, { id: 'run-recovery', content: '', error: 'no such skill' }),
      'melite_skill_read REFUSED: no such skill',
    )
  })
})
