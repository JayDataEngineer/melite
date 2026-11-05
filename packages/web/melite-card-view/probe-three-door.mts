/** THREE-DOOR PROBE (owed P0 — operator: the UI refuses the same
 *  t4r inject-keys doc the estate 200s + runs): what does the live
 *  /v1/flows/validate say about
 *  (a) a guided single-call h3 row carrying sr_switch (the burn
 *      shape — derives t4r; both unit doors refuse it),
 *  (b) the identical row without the inject key (control — must 200),
 *  (c) a text-only single-call row carrying sr_switch (t4_open lane
 *      — must 200: the key is sanctioned there)? */
import { chromium } from '@playwright/test'
import { settle } from './e2e/tour.ts'

const url = process.env.E2E_STUDIO_URL ?? ''
if (url === '') throw new Error('E2E_STUDIO_URL required')

const GUIDE_CALLS = [
  { text: 'one shot', start_frame: 0, end_frame: 90, image: 'webp/run1/pin-0.png' },
]
const TEXT_CALLS = [
  { text: 'one shot', start_frame: 0, end_frame: 90 },
]

const STAGES = {
  burn_guided_sr_switch: {
    id: 's_11', engine: 'comfyui', card: 'h3-timeline',
    params: {
      model: 'h3', variant: 'timeline', quant: 'int8',
      calls: GUIDE_CALLS, sr_switch: true,
    },
  },
  burn_keyframes_channel_quartet: {
    id: 's_11', engine: 'comfyui', card: 'h3-timeline',
    params: {
      model: 'h3', variant: 'timeline', quant: 'int8',
      keyframes: [{ image: 'webp/run1/pin-0.png', frame: 0 }],
      calls: TEXT_CALLS,
      interpolate_enabled: true, second_pass_enabled: true,
      sharpen_enabled: true, sr_switch: true,
    },
  },
  green_film_sr_switch: {
    id: 's_11', engine: 'comfyui', card: 'h3-timeline',
    params: {
      model: 'h3', variant: 'timeline', quant: 'int8',
      calls: [
        { text: 'one', start_frame: 0, end_frame: 90 },
        { text: 'two', start_frame: 90, end_frame: 175 },
      ],
      sr_switch: true,
    },
  },
  control_guided_clean: {
    id: 's_11', engine: 'comfyui', card: 'h3-timeline',
    params: {
      model: 'h3', variant: 'timeline', quant: 'int8',
      calls: GUIDE_CALLS,
    },
  },
  control_text_sr_switch: {
    id: 's_11', engine: 'comfyui', card: 'h3-timeline',
    params: {
      model: 'h3', variant: 'timeline', quant: 'int8',
      calls: TEXT_CALLS, sr_switch: true,
    },
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
    return { status: r.status, text: (await r.text()).slice(0, 900) }
  }, { flow_inline: { id: 'probe-three-door', stages: [stage] } })
  console.log(`\n===== ${name} → /v1/flows/validate: HTTP ${verdict.status}`)
  console.log(verdict.text)
}
await browser.close()
