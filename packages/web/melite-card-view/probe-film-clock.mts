/** FILM-CLOCK PROBE (F55 — the join shares ONE clock): what does
 *  the live /v1/flows/validate say about
 *  (a) a two-window film with doc interp on ×2 whose second call
 *      pins knobs.interpolate_enabled = false (the burn shape —
 *      must 400 with the one-clock voice, pre-GPU),
 *  (b) the same film whose second call pins interp_multiplier 4
 *      against the film's ×2 (must 400, both clocks named),
 *  (c) the clean interp film, no pins (control — must 200)? */
import { chromium } from '@playwright/test'
import { settle } from './e2e/tour.ts'

const url = process.env.E2E_STUDIO_URL ?? ''
if (url === '') throw new Error('E2E_STUDIO_URL required')

const FILM_CALLS = [
  { text: 'one', start_frame: 0, end_frame: 90 },
  { text: 'two', start_frame: 90, end_frame: 175 },
]

const STAGES = {
  burn_split_off: {
    id: 's_11', engine: 'comfyui', card: 'h3-timeline',
    params: {
      model: 'h3', variant: 'timeline', quant: 'int8',
      second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2,
      calls: [FILM_CALLS[0], { ...FILM_CALLS[1], knobs: { interpolate_enabled: false } }],
    },
  },
  burn_split_mult: {
    id: 's_11', engine: 'comfyui', card: 'h3-timeline',
    params: {
      model: 'h3', variant: 'timeline', quant: 'int8',
      second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2,
      calls: [FILM_CALLS[0], { ...FILM_CALLS[1], knobs: { interp_multiplier: 4 } }],
    },
  },
  green_clean_interp: {
    id: 's_11', engine: 'comfyui', card: 'h3-timeline',
    params: {
      model: 'h3', variant: 'timeline', quant: 'int8',
      second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2,
      calls: FILM_CALLS,
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
  }, { flow_inline: { id: 'probe-film-clock', stages: [stage] } })
  console.log(`===== ${name} → /v1/flows/validate: HTTP ${verdict.status}`)
  console.log(verdict.text)
}
await browser.close()
