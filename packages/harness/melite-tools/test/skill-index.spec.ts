// skill_index walls (vitest, estate mocked — no gateway): the tier-1
// scan lists rows verbatim with a count echo, tolerates a missing /
// misshapen rows member, and renders the count (0 on sparse values).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { skillIndex } from '../src/tools/skill-index.ts'
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

describe('skill_index presentCall — the streaming tile', () => {
  test('the scan has one static face', () => {
    const tool = skillIndex((async () => ({})) as EstateRequest)
    assert.deepEqual(tool.presentCall!(), { card: 'generic', title: 'Skill index', kind: 'search' })
  })
})

describe('skill_index execute — the cheap scan', () => {
  test('rows ride verbatim with a count echo', async () => {
    const rows = [
      { id: 'run-recovery', name: 'Run recovery', description: 'resume work', genre: 'text' },
      { id: 'model:krea:photo', name: 'Photo', description: 'stills', genre: 'image', model: 'krea' },
    ]
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/skills')
      return { skills: rows }
    })
    const tool = skillIndex(seen.request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.equal(out.count, 2)
    assert.deepEqual(out.skills, rows)
    assert.equal(out.error, undefined)
  })

  test('a missing rows member scans empty (never a crash)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = skillIndex(request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.deepEqual(out, { count: 0, skills: [] })
  })

  test('a misshapen rows member scans empty', async () => {
    const { request } = mockRequest(() => ({ skills: 'soon' }))
    const tool = skillIndex(request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.deepEqual(out, { count: 0, skills: [] })
  })

  test('non-object args throw at the wrapper gate (presence contract)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = skillIndex(request)
    await assert.rejects(tool.execute(undefined as never, exec), ToolArgsError)
  })
})

describe('skill_index render — the human line', () => {
  test('the count rides the line (0 on sparse values)', () => {
    const tool = skillIndex((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(text({ count: 3 }), 'skill_index: 3 skills (load one with skill_read)')
    assert.equal(text({}), 'skill_index: 0 skills (load one with skill_read)')
  })
})
