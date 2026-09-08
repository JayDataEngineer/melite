/**
 * Audio models — browser-driven test of the audio surfaces in the R1
 * editor (capability layer — docs/design/capability-layer.md).
 *
 * The user authors on the Library card canvas: the picker's audio
 * capability tiles (TTS | Music | Sound Effects | Voice Lock —
 * capabilities/) land cards; MODELS ARE NOT ENTRIES (operator order,
 * 2026-09-04: the All-models expander is GONE), so a specific model
 * (ace-step, moss-tts, …) is chosen on the CARD's Model select — the
 * form-wide flat model list (dropdownModels). Each route's form renders
 * in the card detail modal; Run executes through the ONE run protocol
 * (POST /v1/flows/start (flat) → poll → artifact URL — no b64, no /v1/run).
 *
 * SYNC NOTE (2026-08-06, task #68): rewritten from the pre-R1 sidebar
 * navigation (tts_speak/generate_music/… via check/lib/nav, POST /v1/run
 * b64 responses) — that UI and wire are dead. The regression this spec
 * guards (task #67) is unchanged: a catalog route whose form spec 500s
 * surfaces as "Form fields failed to load" in the UI.
 *
 * Two levels per surface:
 *   1. FORM LOAD (fast, no GPU) — picking a capability + route must
 *      render the form without the failed-to-load toast.
 *   2. GENERATION (live, GPU) — prompt → Run → the card completes with a
 *      real audio artifact rendered in the modal's <audio> preview.
 *
 * Run (backend on :33081, Vite on :5173):
 *   npx playwright test e2e/audio-models.spec.ts
 */
import { test, expect } from '@playwright/test'
import {
  gotoLibrary,
  openPicker,
  switchCardModel,
  waitCardDetail,
  fillPrompt,
} from './helpers/r1Card'
/** Click the TTS capability tile (qwen3-tts default); the picker closes
 *  and a card auto-expands. The audio suite is four DISCRETE tiles
 *  (TTS | Music | Sound Effects | Voice Lock) — there is no generic
 *  "Audio" tile, and no model tiles (models are not entries). */
async function landAudioCard(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('dialog').getByRole('button', { name: 'TTS', exact: true }).click()
  await page.waitForSelector('[data-card-detail]', { timeout: 15_000 })
}

/**
 * The card's detail modal renders the route's form: prompt typeable
 * immediately (not behind an Edit click), Run present, and — the
 * regression this guards — NO "failed to load" toast (a form-spec 500).
 */
async function expectFormLoaded(page: import('@playwright/test').Page, service: string): Promise<void> {
  const modal = page.locator('[data-card-detail]')
  await modal.waitFor({ state: 'visible', timeout: 15_000 })
  await expect(modal.getByText(/failed to load/i)).toHaveCount(0)
  await expect(modal.getByRole('button', { name: 'Run' })).toBeVisible()
  // The card modal's prompt field is params-driven (ParamEditor renders the
  // hardcoded "Prompt" label with no htmlFor) — the structural locator, NOT
  // getByLabel, which can never associate it.
  await fillPrompt(modal, 'hello from the playwright audio test')
  console.log(`  ✓ ${service}: form rendered, prompt typeable, no failed-to-load toast`)
}

// ────────────────────────────────────────────────────────────────────────────
// FORM LOAD — fast, no GPU
// ────────────────────────────────────────────────────────────────────────────

test('FORM LOAD — Audio tile lands a qwen3-tts card (default) without "failed to load"', async ({ page }) => {
  await gotoLibrary(page)
  await openPicker(page)
  await landAudioCard(page)

  // The card auto-expands — assert against [data-card-detail] (the
  // detail carries the title + service badge).
  const tile = page.locator('[data-card-detail]')
  await expect(tile).toContainText('qwen3-tts')
  await expect(tile).toContainText('Audio')
  await expectFormLoaded(page, 'qwen3-tts (form_tts)')
})

// Non-default audio models are chosen ON THE CARD: each tile lands its
// default route, then the card's Model select (the form-wide flat list)
// swaps to the target model. Each must render its own form shape
// (form_music / form_sound / form_tts) with no failed-to-load toast.
for (const [route, tile, detailText] of [
  ['ace-step', 'Music', /ace-step/i],
  ['moss-sfx', 'Sound Effects', /moss-sfx/i],
  ['moss-tts', 'TTS', /moss-tts/i],
] as const) {
  test(`FORM LOAD — ${tile} tile → card Model select → ${route} renders its form`, async ({ page }) => {
    await gotoLibrary(page)
    const dialog = await openPicker(page)
    // Tiles carry no switcher (2026-08-16) and no family tiles exist
    // (2026-09-04) — the model is the card's Model select value.
    await dialog.getByRole('button', { name: tile, exact: true }).click()
    const modal = page.locator('[data-card-detail]')
    await modal.waitFor({ state: 'visible', timeout: 15_000 })
    await switchCardModel(modal, route)
    await waitCardDetail(page, detailText)
    await expectFormLoaded(page, `${route} (card Model select)`)
  })
}

// The VOICE surface is the Voice Lock tile (qwen3-tts-voicedesign — the
// old form_voice / form_voice_studio families, and their task #67
// speaker-gap 500, retired with the catalog; the failed-to-load toast
// guard below covers the same regression class on the current form).
test('FORM LOAD — Voice Lock tile lands qwen3-tts-voicedesign rendering its form', async ({ page }) => {
  await gotoLibrary(page)
  await openPicker(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Voice Lock', exact: true }).click()
  await waitCardDetail(page, /qwen3-tts-voicedesign/i)
  await expectFormLoaded(page, 'qwen3-tts-voicedesign (voice surface)')
})

// ────────────────────────────────────────────────────────────────────────────
// GENERATION — live, GPU. One run per surface through the ONE protocol.
// ────────────────────────────────────────────────────────────────────────────

async function runAudioGeneration(page: import('@playwright/test').Page, prompt: string, service: string): Promise<void> {
  test.setTimeout(300_000) // cold model load can take minutes
  const modal = page.locator('[data-card-detail]')
  await fillPrompt(modal, prompt)
  await modal.getByRole('button', { name: 'Run' }).click()

  // The modal renders the artifact when the run completes (isAudio → <audio>).
  const audio = modal.locator('audio[src]').first()
  await audio.waitFor({ state: 'visible', timeout: 240_000 })
  const src = await audio.getAttribute('src')
  expect(src).toBeTruthy()
  console.log(`  ✓ ${service} artifact: ${src?.slice(0, 90)}`)
}

test('GENERATION — Speech via qwen3-tts produces a real audio artifact', async ({ page }) => {
  await gotoLibrary(page)
  await openPicker(page)
  await landAudioCard(page)
  await runAudioGeneration(page, 'Hello from the Playwright audio test.', 'qwen3-tts (speech)')
})

test('GENERATION — Music via ace-step produces a real audio artifact', async ({ page }) => {
  await gotoLibrary(page)
  const dialog = await openPicker(page)
  await dialog.getByRole('button', { name: 'Music', exact: true }).click()
  const modal = page.locator('[data-card-detail]')
  await modal.waitFor({ state: 'visible', timeout: 15_000 })
  await switchCardModel(modal, 'ace-step')
  await waitCardDetail(page, 'ace-step')
  await runAudioGeneration(page, 'lo-fi hip hop, mellow piano, 90 BPM, instrumental', 'ace-step (music)')
})

test('GENERATION — Sound via moss-sfx produces a real audio artifact', async ({ page }) => {
  await gotoLibrary(page)
  const dialog = await openPicker(page)
  // The Sound Effects tile's default route IS moss-sfx — no switch needed.
  await dialog.getByRole('button', { name: 'Sound Effects', exact: true }).click()
  await waitCardDetail(page, 'moss-sfx')
  await runAudioGeneration(page, 'a short thunder rumble', 'moss-sfx (sound)')
})
