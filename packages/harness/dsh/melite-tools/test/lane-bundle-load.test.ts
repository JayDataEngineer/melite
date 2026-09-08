// lane_bundle_load wire-contract gate (fetch mocked — no gateway).
//
// The 2026-09-05 duck-typing audit: the tool DECLARES required
// ['lane','kind','agent'] in its output schema, but the old walk
// emitted `agent: null` on a malformed bundle — a silently-hollow
// success violating its own declared contract (the model saw
// "0 tool(s) · 0 skill(s)" with no reason). Pins:
//   1. clean bundle passes through with the declared members intact
//   2. agent-less bundle → LOUD error naming agent.content,
//      never a silent null-attach
//   3. nameless tool row → LOUD error (a nameless tool cannot be
//      called)
//   4. gateway error field rides verbatim (the pre-existing law)

import { afterEach, describe, expect, test } from 'bun:test'
import { laneBundleLoad } from '../src/tools/lane-bundle-load.ts'

const origFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = origFetch })

function mockOnce(body: unknown, status = 200): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status })) as typeof fetch
}

async function run(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const tool = laneBundleLoad('http://localhost:33081')
  return await tool.execute(args, { signal: new AbortController().signal })
    .then((v: unknown) => v as Record<string, unknown>)
}

const CLEAN = {
  lane: 'image-gen',
  kind: 'action_card',
  agent: { source: 'card', name: 'AGENT.md', content: '# compose laws' },
  tools: [{ name: 'image_gen', params_schema: { type: 'object' } }],
  skills: [{ id: 's1', name: 'guide', description: 'd' }],
  read_first: ['s1'],
}

describe('lane_bundle_load wire contract', () => {
  test('clean bundle passes through with the declared members', async () => {
    mockOnce(CLEAN)
    const out = await run({ kind: 'action_card', name: 'image-gen' })
    expect(out.error).toBeUndefined()
    expect(out.lane).toBe('image-gen')
    expect(out.kind).toBe('action_card')
    expect(out.tool_count).toBe(1)
    expect((out.agent as { content: string }).content).toContain('compose laws')
  })

  test('agent-less bundle refuses LOUDLY, never a silent null-attach', async () => {
    mockOnce({ ...CLEAN, agent: null })
    const out = await run({ kind: 'action_card', name: 'image-gen' })
    expect(typeof out.error).toBe('string')
    expect(out.error).toContain('agent.content')
    expect(out.agent ?? null).toBeNull()
  })

  test('empty-string agent content is missing too', async () => {
    mockOnce({ ...CLEAN, agent: { name: 'AGENT.md', content: '' } })
    const out = await run({ kind: 'action_card', name: 'image-gen' })
    expect(out.error).toContain('agent.content')
  })

  test('nameless tool row refuses — a nameless tool cannot be called', async () => {
    mockOnce({ ...CLEAN, tools: [{ params_schema: {} }, { name: 'ok' }] })
    const out = await run({ kind: 'action_card', name: 'image-gen' })
    expect(out.error).toContain('no name')
  })

  test('gateway error field rides verbatim', async () => {
    mockOnce({ error: 'no such lane' })
    const out = await run({ kind: 'action_card', name: 'nope' })
    expect(out.error).toBe('no such lane')
  })
})
