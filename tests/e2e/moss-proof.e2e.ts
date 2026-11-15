// A live one-shot proof (2026-11-12): comfy-kitchen 0.2.39 lacked
// group_norm_stats3d and every moss-image press died at VAEDecode
// (AttributeError in model.py strip_conv). The venv now rides 0.2.41.
// This spec presses moss-image ONCE through the estate door and
// asserts real image bytes past the VAE decode seat.
import { describe, it, expect } from 'vitest'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootModels } from '../../packages/engines/comfyui-cordis/src/models/service.ts'
import { lanePresenceMiss } from '../../packages/harness/estate-queue/src/cardsLanes.ts'
import { bootWorld, runCard, firstBytes } from './gpu-harness.ts'
import { ENGINE_FREE, ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'

describe.skipIf(!ENGINE_FREE)('moss proof: the kitchen 0.2.41 VAEDecode fix', () => {
  it('moss-image presses past VAEDecode and serves real bytes', async () => {
    // LANE PRESENCE, BOOTED (the arena's own gate law: judge the
    // miss loud after the table boots under the endpoint fixture)
    const fixture = join(tmpdir(), 'cards-gpu-weights-probe.json')
    writeFileSync(fixture, JSON.stringify({ url: `http://${ENGINE_HOST}:${ENGINE_PORT}` }) + '\n')
    process.env.INFERENCE_TEST_SANDBOX = '1'
    process.env.COMFYUI_ENDPOINT_CONFIG = fixture
    await bootModels()
    const miss = lanePresenceMiss('moss-image')
    expect(miss === null, `moss-image lane presence: ${miss === null ? '' : miss.message.slice(0, 200)}`).toBe(true)

    const w = await bootWorld('moss-proof')
    const s = await runCard(w, {
      model: 'moss-image',
      prompt: 'a single red cube on a white table, studio light',
      // THE GPU DIET (operator 2026-11-17, audit finding 11): the
      // row's whole subject is real bytes past VAEDecode — the
      // unstated geometry once rode the 1024×1024 schema default, a
      // free 4× versus the stated 512² floor.
      width: 512, height: 512,
      steps: 25,
      seed: 8675309,
    }, 'moss kitchen041 proof')
    expect(firstBytes(s).length > 1024, 'real image bytes past VAEDecode').toBe(true)
  }, 600_000)
})
