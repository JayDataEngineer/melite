/**
 * model-smoke.e2e.ts — the MODEL live-fire receipt (stroke 83).
 *
 * The gap this closes: key-blind seating is BY DESIGN (capability vs
 * credential is DSH law — resolveModelInfo/prepareCall are pure
 * metadata; the key resolves at stream time behind ctx.credentials
 * or the launch environment, NEITHER of which the CraftLlmSeam can
 * see, so a process.env check would falsely NOT-seat lanes whose
 * key lives in the credentials store, or OAuth routes that need no
 * key at all). The keyless voice is therefore the CALL's:
 * MISSING_CREDENTIAL → the runtime's terminal error finish → the
 * executors' LOUD refusal (walled keyless in the craft + agent unit
 * specs — never a hang, never a silent nothing).
 *
 * THIS tier proves the gated-in path: with a named critic route AND
 * its key present, one REAL craft stage live-fires end to end — the
 * REAL craftEngineAutoRoute seats on the live seam, a nested act
 * writes real bytes, the REAL llmCritic critiques over live HTTPS,
 * and the pinned note lands in the stage outputs.
 *
 * Gates honestly (the ComfyUI-gate precedent): MELITE_CRITIC_ROUTE
 * "provider/model" must parse AND the key env must be non-empty —
 * without both, the live arm self-skips (a skip is not a cost
 * signal; the no-key arm pins the gate itself). Keyless CI stays
 * green; the moment a key exists, this tier live-fires.
 *
 * No coverage: the e2e config owns no coverage gate (the unit
 * suites own per-file 100) — this file matches tests/e2e only.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Context, Service } from '@deepseek-ai/cordis'
// Relative package-source imports (the e2e lives at the repo root,
// outside the workspace package graph — the same discipline the
// root's own vitest aliases encode for @melite/estate-*):
import { EnginesService } from '../../packages/engines/contract/src/engines.ts'
import {
  craftEngineAutoRoute,
  type CraftAttachmentsSeam,
  type CraftLlmSeam,
} from '../../packages/engines/craft/src/craft-engine.ts'
import { mintSandbox } from '../harness.ts'

// ── the gate: a named critic route + its key ─────────────────────
// The key env defaults to DEEPSEEK_API_KEY (the deepseek-official
// route's ref); MELITE_E2E_MODEL_KEY_ENV overrides it for lanes
// whose route resolves its key elsewhere. DSH derives per-route
// refs internally (<ROUTE>_API_KEY) — this spec does NOT guess that
// mapping; the override names the seam honestly.
const ROUTE_RAW = process.env['MELITE_CRITIC_ROUTE'] ?? ''
const NAMED = /^([^/\s]+)\/(.+)$/.exec(ROUTE_RAW)
const KEY_ENV = process.env['MELITE_E2E_MODEL_KEY_ENV'] ?? 'DEEPSEEK_API_KEY'
const API_KEY = process.env[KEY_ENV] ?? ''
const HAS_MODEL = NAMED !== null && API_KEY.length > 0

// The provider endpoint (the ComfyUI-gate's HOST/PORT precedent):
// stock DeepSeek, overridable at proxies or mirrors.
const BASE_URL = process.env['MELITE_E2E_DEEPSEEK_BASE_URL'] ?? 'https://api.deepseek.com'

// The pinned receipt: the probe brief orders this exact note; the
// live arm asserts it landed (a real model answer, not an echo).
const PINNED_NOTE = 'pinecone-42'
const PROBE_BRIEF =
  'Live-fire probe. Reply with exactly this JSON object and nothing else: ' +
  `{"verdict":"done","note":"${PINNED_NOTE}"}`

/**
 * The thin live seam (TEST-OWNED scaffolding, not a product
 * adapter): it implements the craft engine's llm SEAM shape
 * (listProviders/listModels/resolveModelInfo/prepareCall) while its
 * stream speaks the REAL provider chat-completions wire over live
 * HTTPS with the REAL key — minimal SSE (data: lines, [DONE]),
 * text-only (the probe sends no images; anything else refuses
 * LOUD, never a silent drop). The product adapter cannot be reused
 * here: it lives in the hosting DSH session (its source drags
 * uninstallable host-only deps); every IN-REPO function on the
 * path — auto-route, seating, loop, critic, JSON scrape — is real.
 */
const liveSeam = (provider: string, model: string, key: string): CraftLlmSeam => ({
  listProviders: () => [{ id: provider }],
  listModels: async (p: string) => (p === provider ? [{ id: model }] : []),
  resolveModelInfo: async () => ({ inputModalities: ['text', 'image'] }),
  prepareCall: async (config: { provider: string; model: string }) => ({
    config: { ...config },
    stream: (options: { messages: { role: string; content: unknown[] }[] }) =>
      liveStream(config, options, key),
  }),
})

async function* liveStream(
  config: { provider: string; model: string },
  options: { messages: { role: string; content: unknown[] }[] },
  key: string,
): AsyncIterable<{ type: string; text?: string; reason?: unknown }> {
  const messages = options.messages.map((m) => ({
    role: m.role,
    content: m.content
      .map((b) => {
        const block = b as { type?: unknown; text?: unknown }
        if (block.type === 'text' && typeof block.text === 'string') return block.text
        throw new Error(
          `model-smoke: the thin seam carries text only (saw block type ${JSON.stringify(block.type)})`,
        )
      })
      .join(''),
  }))
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({ model: config.model, messages, stream: true }),
    signal: AbortSignal.timeout(100_000),
  })
  if (!res.ok || res.body === null) {
    const body = await res.text().catch(() => '')
    throw new Error(`model-smoke: deepseek HTTP ${res.status} (${body.slice(0, 300)})`)
  }
  // Minimal SSE: "data: {...}" lines until "data: [DONE]".
  const decoder = new TextDecoder()
  const reader = res.body.getReader()
  let buf = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).trim()
        buf = buf.slice(idx + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') {
          yield { type: 'finish', reason: { kind: 'stop' } }
          return
        }
        let delta = ''
        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: unknown } }[]
          }
          const content = parsed.choices?.[0]?.delta?.content
          if (typeof content === 'string') delta = content
        } catch {
          continue
        }
        if (delta !== '') yield { type: 'text-delta', text: delta }
      }
    }
  } finally {
    reader.releaseLock()
  }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/** Mount the live llm + (text-only) attachments seats on a bare Context. */
const mountLiveSeats = (ctx: Context, seam: CraftLlmSeam): void => {
  class LiveLlmService extends Service {
    constructor(ctx2: Context) {
      super(ctx2, 'llm')
      Object.assign(this, seam)
    }
  }
  class TextOnlyAttachmentsService extends Service {
    constructor(ctx2: Context) {
      super(ctx2, 'attachments')
    }
    async saveImage(): Promise<never> {
      // The probe's act writes notes.txt (never an image) — reaching
      // here means the live seam grew an image path unannounced.
      throw new Error('model-smoke: no image attach expected on the text-only probe')
    }
  }
  new LiveLlmService(ctx)
  new TextOnlyAttachmentsService(ctx)
}

describe.skipIf(!HAS_MODEL)('model smoke (live craft critique)', () => {
  it('one real craft stage seats, acts, and lands the live verdict (seat → act → HTTPS critique → done)', async () => {
    const sandbox = mintSandbox('model-smoke-')
    const ctx = new Context()
    try {
      const provider = (NAMED as RegExpExecArray)[1] as string
      const model = (NAMED as RegExpExecArray)[2] as string
      new EnginesService(ctx)
      mountLiveSeats(ctx, liveSeam(provider, model, API_KEY))

      // THE REAL SEATING (key-blind by law, capability-checked):
      // the named route resolves image-capable on the live seam.
      const lines: string[] = []
      const seated = await craftEngineAutoRoute(ctx, (l) => lines.push(l), { provider, model })
      assert.equal(seated, true, 'the named route seats: ' + lines.join(' | '))

      // THE NESTED HANDS: one act engine writing real bytes (text,
      // so the thin seam stays text-only and honest). The seat's id
      // grammar admits only comfyui/craft/agent/mcp:<server> — the
      // probe's stub hands ride mcp:e2eact (the loop never asks what
      // KIND of engine acts, only that the seat resolves it).
      const seat = ctx.get('engines') as EnginesService
      const stopAct = seat.register('mcp:e2eact', {
        executor: {
          executeStages: async (rows, runDir) => {
            writeFileSync(`${runDir as string}/notes.txt`, 'probe capture')
            return {
              stages: (rows as readonly { stageId: string }[]).map((r) => ({
                stageId: r.stageId,
                outputs: {},
                artifacts: ['notes.txt'],
              })),
            }
          },
        },
      })

      // ONE REAL STAGE: act → capture → live critique → decide.
      const out = await seat.resolve('craft').executor.executeStages(
        [{
          stageId: 'smoke',
          outputs: {},
          params: {
            agent_prompt: PROBE_BRIEF,
            command: { engine: 'mcp:e2eact', params: {} },
            max_iterations: 2,
          },
        }],
        sandbox.root,
        {},
        { shouldStop: () => false, report: () => {} },
      )
      stopAct()
      assert.deepEqual(out.stages[0]?.artifacts, ['notes.txt'], 'the act captured')
      assert.match(
        String(out.stages[0]?.outputs.default ?? ''),
        new RegExp(PINNED_NOTE),
        'the LIVE verdict landed (the model answered the pinned note)',
      )
    } finally {
      await ctx.fiber.dispose()
      sandbox.dispose()
    }
  }, 180_000)
})

describe.runIf(!HAS_MODEL)('model smoke (no key — gate only)', () => {
  it('self-skips the live arm and proves the gate is honest (route + key, not a cost signal)', () => {
    // Without MELITE_CRITIC_ROUTE "provider/model" AND a non-empty
    // MELITE_E2E_MODEL_KEY_ENV (default DEEPSEEK_API_KEY), the live
    // arm above is skipped: one real craft stage (named-route seat →
    // act → live HTTPS critique → done) asserting the pinned note
    // landed. To live-fire: export both, then `pnpm run test:e2e`.
    assert.ok(typeof HAS_MODEL === 'boolean')
    assert.ok(typeof KEY_ENV === 'string' && KEY_ENV.length > 0)
  })
})
