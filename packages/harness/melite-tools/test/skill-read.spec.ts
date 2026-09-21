// melite_skill_read walls (vitest, estate mocked — no gateway): the tier-2
// body loads exactly one id (empty ids throw before any fetch,
// missing ids throw at the wrapper gate), sparse rows fall back to
// the requested id + null echoes + empty content, and the render
// prefers the call id, then the value id, then '?'.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { skillRead } from '../src/tools/skill-read.ts'
import type { EstateRequest } from '../src/estate.ts'

function mockRequest(
  handler: (method: string, path: string, body: unknown) => unknown,
): { calls: Array<{ method: string; path: string }>; request: EstateRequest } {
  const calls: Array<{ method: string; path: string }> = []
  const request = (async (method: string, path: string): Promise<unknown> => {
    calls.push({ method, path })
    return handler(method, path, undefined)
  }) as EstateRequest
  return { calls, request }
}

const exec = { signal: AbortSignal.timeout(2000) }

describe('melite_skill_read presentCall — the streaming tile', () => {
  test('names the skill; junk renders generic (the re-attached presenter)', () => {
    const tool = skillRead((async () => ({})) as EstateRequest)
    assert.equal(tool.presentCall!({ id: 'run-recovery' } as never).title, 'Read skill run-recovery')
    assert.equal(tool.presentCall!({ id: 'run-recovery' } as never).rawInput, 'run-recovery')
    assert.equal(tool.presentCall!({} as never).title, 'Read skill ?')
    assert.equal(tool.presentCall!(null as never).title, 'Read skill ?')
    assert.equal(tool.presentCall!('x' as never).title, 'Read skill ?')
  })
})

describe('melite_skill_read execute — the tier-2 body', () => {
  test('a missing id throws at the wrapper gate (presence contract)', async () => {
    const seen = mockRequest(() => ({}))
    const tool = skillRead(seen.request)
    await assert.rejects(tool.execute({} as never, exec), ToolArgsError)
    assert.equal(seen.calls.length, 0)
  })

  test('an empty id throws before any fetch', async () => {
    const seen = mockRequest(() => ({}))
    const tool = skillRead(seen.request)
    await assert.rejects(tool.execute({ id: '' }, exec), /"id" is required/)
    assert.equal(seen.calls.length, 0)
  })

  test('a full row rides verbatim (the id encodes onto the path)', async () => {
    const row = {
      id: 'model:krea:photo', name: 'Photo', description: 'stills',
      genre: 'image', model: 'krea', content: '# photo\nbody',
    }
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/skills/' + encodeURIComponent('model:krea:photo'))
      return row
    })
    const tool = skillRead(seen.request)
    const out = await tool.execute({ id: 'model:krea:photo' }, exec) as Record<string, unknown>
    assert.deepEqual(out, row)
  })

  test('a sparse row falls back (requested id + null echoes + empty body)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = skillRead(request)
    const out = await tool.execute({ id: 'run-recovery' }, exec) as Record<string, unknown>
    assert.deepEqual(out, {
      id: 'run-recovery', name: null, description: null, genre: null, model: null, content: '',
    })
  })
})

describe('melite_skill_read render — the body rides (tier 2)', () => {
  const tool = skillRead((async () => ({})) as EstateRequest)
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
