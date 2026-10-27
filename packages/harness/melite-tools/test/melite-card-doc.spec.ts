// @contract infra-agent-flow-card-doc
// THE JUST-IN-TIME CARD DOC (agent-flow rework slice 4b): the landing
// carries the landed card's own agent doc inline as refinement
// material, deduped per session by DOC DIGEST (a changed doc re-sends
// flagged), and never gates the landing. The render prints the body,
// names the dedupe, and marks the change. Source: DSH agent-experience
// "Use locality" (commit 22ddee3792; dev_docs/research/agent-surfaces/
// deepseek-harness-agent-experience-2026-10-23.md).
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { meliteConstruct } from '../src/tools/melite-construct.ts'
import { fakeEstate, fakeEstateRecorded } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'

function exec() {
  return fakeExec(AbortSignal.timeout(5000))
}

function stubEstate() {
  return fakeEstate({}).estate
}

function mockEstate(handler: (lane: string, args: unknown[]) => unknown) {
  const seen: Array<{ lane: string; args: unknown[]; timeoutMs?: number }> = []
  return { ...fakeEstateRecorded(seen, handler), seen }
}
describe('melite_construct add_stage — THE JUST-IN-TIME CARD DOC (slice 4b)', () => {
  // Operator 2026-11-12: "the card doc rides the add_stage result,
  // deduped per session" — DSH's agent-experience law: "include a
  // bounded amount of likely needed adjacent context with an
  // operation's result ... Mark omissions and truncation explicitly,
  // and provide a way to retrieve more."
  // (references/deepseek-harness/packages/preset/agent-preset/skills/agent-experience/SKILL.md)
  const agents = [
    { path: 'cards/image-gen/agent.md', text: 'IMAGE-GEN: compose the prompt yourself.' },
    { path: 'cards/image-gen/notes.md', text: 'Lane law: model is a seat.' },
  ]
  const handler = (lane: string, args: unknown[]) => {
    if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 7, stage: 's2' }
    if (lane === 'benchGet') return { session: 'main', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
    if (lane === 'runsValidate') return { ok: true }
    if (lane === 'loadCard') return { agents }
    throw new Error('unmocked lane ' + lane)
  }

  test('the landed card doc rides the result inline', async () => {
    const { seen, estate } = mockEstate(handler)
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'add_stage', card: 'image-gen', expect_rev: 6 }, exec()) as Record<string, unknown>
    const doc = out.doc as { card?: string; digest?: string; files?: unknown[]; changed?: unknown }
    assert.equal(doc.card, 'image-gen')
    assert.match(String(doc.digest), /^[0-9a-f]{16}$/)
    assert.deepEqual(doc.files, agents)
    assert.equal(doc.changed, undefined, 'the first send is not a change')
    const load = seen.find((r) => r.lane === 'loadCard')
    assert.deepEqual(load?.args.slice(0, 2), ['card', 'image-gen'])
  })

  test('a second landing of the same doc is not re-sent', async () => {
    const { estate } = mockEstate(handler)
    const tool = meliteConstruct(estate)
    const first = await tool.execute({ verb: 'add_stage', card: 'image-gen', expect_rev: 6 }, exec()) as Record<string, unknown>
    const second = await tool.execute({ verb: 'add_stage', card: 'image-gen', expect_rev: 7 }, exec()) as Record<string, unknown>
    const doc = second.doc as { digest?: string; unchanged?: boolean; files?: unknown }
    assert.equal(doc.unchanged, true)
    assert.equal(doc.files, undefined, 'the dedupe withholds the body')
    assert.equal(doc.digest, (first.doc as { digest?: string }).digest)
  })

  test('a CHANGED doc re-sends flagged', async () => {
    let text = agents[0]!.text
    const { estate } = fakeEstateRecorded([], (lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 7, stage: 's2' }
      if (lane === 'benchGet') return { session: 'main', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      if (lane === 'loadCard') return { agents: [{ path: agents[0]!.path, text }] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    await tool.execute({ verb: 'add_stage', card: 'image-gen', expect_rev: 6 }, exec())
    text = 'IMAGE-GEN: the lane law changed.'
    const out = await tool.execute({ verb: 'add_stage', card: 'image-gen', expect_rev: 7 }, exec()) as Record<string, unknown>
    const doc = out.doc as { changed?: boolean; files?: unknown }
    assert.equal(doc.changed, true)
    assert.equal((doc.files as unknown[]).length, 1)
  })

  test('a doc-less card and a failed doc fetch never gate the landing', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 7, stage: 's2' }
      if (lane === 'benchGet') return { session: 'main', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      if (lane === 'loadCard') throw new Error('doc plane down')
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'add_stage', card: 'image-gen', expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    assert.equal(out.doc, undefined)

    const bare = fakeEstateRecorded([], (lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 7, stage: 's2' }
      if (lane === 'benchGet') return { session: 'main', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      if (lane === 'loadCard') return { agents: [] }
      throw new Error('unmocked lane ' + lane)
    }).estate
    const tool2 = meliteConstruct(bare)
    const out2 = await tool2.execute({ verb: 'add_stage', card: 'image-gen', expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out2.ok, true)
    assert.equal(out2.doc, undefined)
  })

  test('the render prints the doc, and names the dedupe', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'add_stage' },
      {
        verb: 'add_stage', bench: 'main', ok: true, rev: 7, stage: 's2',
        doc: { card: 'image-gen', digest: 'abc123', files: agents },
      } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.match(text, /card doc \(rides once per session; refinement only/)
    assert.ok(text.includes('IMAGE-GEN: compose the prompt yourself.'), 'the body rides the model-visible text')
    assert.ok(text.includes('--- cards/image-gen/agent.md ---'))

    const again = tool.output.render(
      { verb: 'add_stage' },
      { verb: 'add_stage', bench: 'main', ok: true, rev: 8, stage: 's3', doc: { card: 'image-gen', digest: 'abc123', unchanged: true } } as never,
    ) as Array<{ text?: string }>
    const againText = again.map((p) => p?.text ?? '').join('\n')
    assert.match(againText, /already sent this session .*not re-sent/)
    assert.ok(!againText.includes('IMAGE-GEN'), 'the dedupe withholds the body')
  })
})

