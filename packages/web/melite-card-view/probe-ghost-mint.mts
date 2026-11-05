/** GHOST-MINT PROBE (F56, 2026-11-14 — operator: "trim's add_stage
 *  misrouted into the krea-2/turbo image lane demanding a prompt.
 *  The family-less tool card never reached its own surface" + the
 *  live form-spec refusal "'image-upscale' does not resolve"):
 *  what does the estate's /v1/flows/validate say about
 *  (a) an UNKNOWN card id ('image-upscale' — the real id is
 *      'upscale-tools'; the tile landed on the bench anyway),
 *  (b) a CLEAN family-less trim row (the card's own surface),
 *  (c) a trim row whose params carry model 'krea-2' (the misroute
 *      shape — does the door 200 a doc the run would compose as a
 *      krea image demanding prompt)? */
import { chromium } from '@playwright/test'
import { settle } from './e2e/tour.ts'

const url = process.env.E2E_STUDIO_URL ?? ''
if (url === '') throw new Error('E2E_STUDIO_URL required')

const CLIP = '/melite-media/runs/run-e4ae729c2337-9805af52/h3-film/window1_SaveVideo.0_h3_t4_w1_00001_.mp4'

const STAGES = {
  unknown_upscale_nomodel: {
    id: 's_0', engine: 'comfyui', card: 'image-upscale',
    params: {},
  },
  unknown_upscale_model: {
    id: 's_0', engine: 'comfyui', card: 'image-upscale',
    params: {
      model: 'krea-2', prompt: 'x',
      image: '/melite-media/runs/run-e4ae729c2337-9805af52/h3-film/window1_SaveVideo.0_h3_t4_w1_00001_.mp4',
    },
  },
  trim_clean: {
    id: 's_0', engine: 'comfyui', card: 'trim',
    params: { clip: CLIP, start_seconds: 0, end_seconds: -1 },
  },
  trim_krea_model: {
    id: 's_0', engine: 'comfyui', card: 'trim',
    params: { model: 'krea-2', clip: CLIP, start_seconds: 0, end_seconds: -1 },
  },
} as const

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto(url)
await settle(page)

for (const [name, stage] of Object.entries(STAGES)) {
  const verdict = await page.evaluate(async (body) => {
    const r = await fetch('/v1/flows/validate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    })
    return { status: r.status, text: (await r.text()).slice(0, 700) }
  }, { flow_inline: { id: 'probe-ghost-mint', stages: [stage] } })
  console.log(`\n===== ${name} → /v1/flows/validate: HTTP ${verdict.status}`)
  console.log(verdict.text)
}
await browser.close()
