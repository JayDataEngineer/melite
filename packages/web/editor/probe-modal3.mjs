// probe-modal3.mjs — DETERMINISTIC reproduction of the empty Adapter
// dropdown, no gateway dependency. /v1/form-spec is route-mocked with a
// body built from the SAME source the real emission reads (the on-disk
// lora dirs). Phases:
//  1. krea-2 fresh card -> Add LoRA modal -> dump (expect 12 options)
//  1b. add EVERY adapter via the UI -> reopen -> dump until ZERO remain
//      (the user's symptom: "Adapter▼ / ---", click does nothing)
//  2. reload = "fresh session" -> restored card -> modal dump
//  3. z-image fresh card -> modal dump (7 options expected)
import { chromium } from '@playwright/test'
import { homedir } from 'node:os'
import path from 'node:path'
import { readdirSync } from 'node:fs'

const CHROMIUM_PATH = path.join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
const step = (m) => console.log(`\n== ${m}`)
const ok = (m) => console.log(`   ✓ ${m}`)
const BASE = 'http://127.0.0.1:5173/editor/'

// ── Build mock specs from the on-disk dirs (same source as emission) ────
const LORA_ROOT = '/opt/ComfyUI/models/loras'
const CN_ROOT = '/opt/ComfyUI/models/controlnet'
const human = (b) => b.replace(/\.safetensors$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function optionsFor(dir) {
  return readdirSync(path.join(LORA_ROOT, dir))
    .filter((f) => f.endsWith('.safetensors'))
    .sort()
    .map((f) => ({
      value: `${dir}/${f}`,
      label: human(f),
      model: `${dir}/${f}`,
      defaults: { strength: 1.0 },
      installed: true,
    }))
}
const LORA_FIELDS = [
  { name: 'name', type: 'string', label: 'Adapter' },
  { name: 'strength', type: 'float', min: -2, max: 5, step: 0.05, default: 1, label: 'Strength' },
]
const CN_OPTIONS = readdirSync(CN_ROOT)
  .filter((f) => f.endsWith('.safetensors') || !f.includes('.'))
  .map((f) => ({ value: f.replace(/\.safetensors$/, ''), label: human(f), model: f, installed: true }))

function specBody(model) {
  const modifiers = []
  if (model === 'krea-2') {
    modifiers.push({ kind: 'lora', label: 'LoRA Adapters', cardinality: 'list', param_key: 'loras', fields: LORA_FIELDS, options: optionsFor('krea-2'), options_scanned: true, upload_dir: 'krea-2' })
  } else if (model === 'z-image') {
    modifiers.push({ kind: 'controlnet', label: 'ControlNets', cardinality: 'list', param_key: 'controlnets', fields: [{ name: 'type', type: 'string', label: 'Type' }, { name: 'image_b64', type: 'image', label: 'Reference Image' }, { name: 'strength', type: 'float', label: 'Strength' }], options: CN_OPTIONS.slice(0, 7), options_scanned: true, upload_dir: 'controlnet' })
    modifiers.push({ kind: 'lora', label: 'LoRA Adapters', cardinality: 'list', param_key: 'loras', fields: LORA_FIELDS, options: optionsFor('z-image'), options_scanned: true, upload_dir: 'z-image' })
  }
  return { model, family: model, features: { modifiers } }
}

const browser = await chromium.launch({
  executablePath: CHROMIUM_PATH,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
})
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log(`   [console.error] ${m.text().slice(0, 250)}`) })
page.on('pageerror', (e) => console.log(`   [pageerror] ${String(e).slice(0, 250)}`))

// ── Route-mock ONLY /v1/form-spec — everything else stays live ──────────
await page.route('**/v1/form-spec*', (route) => {
  const u = new URL(route.request().url())
  const model = u.searchParams.get('model') ?? 'krea-2'
  const body = specBody(model)
  console.log(`   [mock form-spec] ${model} -> lora=${(body.features.modifiers.find((m) => m.kind === 'lora')?.options ?? []).length} cn=${(body.features.modifiers.find((m) => m.kind === 'controlnet')?.options ?? []).length}`)
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
})

async function boot(retry = 3) {
  for (let a = 1; a <= retry; a++) {
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 })
      await page.getByRole('button', { name: 'Agent', exact: true }).waitFor({ state: 'visible', timeout: 60_000 })
      await page.getByRole('button', { name: /^Library$/ }).first().click()
      await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 60_000 })
      await page.getByRole('button', { name: /add your first card|add a card/i }).first().click()
      const dialog = page.getByRole('dialog')
      await dialog.getByText('What do you want to make?').waitFor({ state: 'visible', timeout: 30_000 })
      return dialog
    } catch (e) {
      console.log(`   boot attempt ${a} failed: ${String(e).slice(0, 150)}`)
      if (a === retry) throw e
      await page.waitForTimeout(10_000)
    }
  }
}

async function openLoraModal(detail) {
  await detail.locator('[data-subcard-add="mod"]').click()
  const pick = page.locator('[data-mod-pick="lora"]')
  await pick.waitFor({ state: 'visible', timeout: 15_000 })
  await pick.click()
  const modal = page.getByRole('dialog', { name: /Add LoRA/i })
  await modal.waitFor({ state: 'visible', timeout: 15_000 })
  return modal
}

async function dumpAdapter(modal, label) {
  const out = { label }
  out.emptyBox = await modal.locator('text=No LoRAs declared for this model').count()
  const combo = modal.getByRole('combobox', { name: 'Choose a LoRA' })
  out.comboCount = await combo.count()
  if (out.comboCount > 0) {
    out.triggerText = (await combo.innerText()).slice(0, 60)
    // Popup may already be open (left-over state) — opening on an open
    // popup re-verifies the click against the popup and times out.
    const alreadyOpen = (await combo.getAttribute('data-popup-open')) !== null
    if (!alreadyOpen) {
      await combo.click()
      await page.waitForTimeout(600)
    }
    const opts = page.locator('[role="option"]')
    out.optionCount = await opts.count()
    out.visibleOptions = await opts.evaluateAll((els) => els.filter((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }).length)
    out.firstTexts = (await opts.allInnerTexts()).slice(0, 3).map((t) => t.slice(0, 60))
    const lb = page.locator('[role="listbox"]')
    out.listboxCount = await lb.count()
    out.listboxVisible = out.listboxCount > 0 ? await lb.first().isVisible() : false
    if (out.optionCount === 0) {
      out.popupText = (await page.locator('[data-slot="select-content"]').innerText().catch(() => '')).slice(0, 160)
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  } else {
    out.modalText = (await modal.innerText()).slice(0, 300)
  }
  console.log(`   ${label}: ${JSON.stringify(out)}`)
  return out
}

// ── Phase 1: krea-2 fresh card ───────────────────────────────────────────
step('Phase 1: krea-2 fresh card — open Add LoRA modal (mock wire)')
const dialog = await boot()
await dialog.getByRole('button', { name: /^Create Image/ }).click()
const detail = page.locator('[data-card-detail]')
await detail.waitFor({ state: 'visible', timeout: 60_000 })
await page.locator('[data-subcard-grid]').waitFor({ state: 'visible', timeout: 30_000 })
ok('grid visible')
const m1 = await openLoraModal(detail)
await dumpAdapter(m1, 'P1 fresh krea-2')
await page.keyboard.press('Escape')
await page.waitForTimeout(600)

// ── Phase 1b: add every adapter via the UI ───────────────────────────────
step('Phase 1b: add adapters one by one until none remain')
let added = 0
for (let i = 1; i <= 20; i++) {
  let modal
  try {
    modal = await openLoraModal(detail)
  } catch (e) {
    console.log(`   iteration ${i}: could not open modal — ${String(e).slice(0, 120)}`)
    break
  }
  const combo = modal.getByRole('combobox', { name: 'Choose a LoRA' })
  await combo.click()
  await page.waitForTimeout(500)
  const opts = page.locator('[role="option"]')
  const n = await opts.count()
  if (n === 0) {
    console.log(`   iteration ${i}: ZERO options in popup — user symptom state reached (${added} added)`)
    await dumpAdapter(modal, `P1b ${added} adapters already on card — ZERO remain`)
    await page.keyboard.press('Escape')
    break
  }
  const first = opts.first()
  const text = (await first.innerText()).slice(0, 45).replace(/\n/g, ' | ')
  await first.click()
  await page.waitForTimeout(300)
  await modal.getByRole('button', { name: 'Add', exact: true }).click()
  await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(400)
  added++
  console.log(`   iteration ${i}: added "${text}" — ${n - 1} remain (${added} on card)`)
}

// ── Phase 2: RELOAD = "fresh session", flow from localStorage ────────
step('Phase 2: reload — the user\'s "fully fresh session"')
await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 })
try {
  await page.getByRole('button', { name: 'Agent', exact: true }).waitFor({ state: 'visible', timeout: 60_000 })
  ok('app shell booted after reload')
  // Back to the Library tab — the persisted flow lives there.
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  const tile = page.locator('[data-card-tile]').first()
  await tile.waitFor({ state: 'visible', timeout: 30_000 })
  ok('persisted card restored')
  const tileCount = await page.locator('[data-card-tile]').count()
  console.log(`   tiles restored: ${tileCount}`)
  await tile.click()
  const detail2 = page.locator('[data-card-detail]')
  await detail2.waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(2_000)
  const m2 = await openLoraModal(detail2)
  await dumpAdapter(m2, 'P2 fresh session, restored card with 12 loras')
  await page.keyboard.press('Escape')
  // ALSO: the grid must show the 12 restored lora tiles
  const loraTiles = await page.locator('[data-subcard-row="lora"] [data-card-sub-tile], [data-subcard-row="lora"] [draggable="true"]').count()
  console.log(`   lora tiles in restored grid: ${loraTiles}`)
} catch (e) {
  console.log(`   ✗ Phase 2 failed: ${String(e).slice(0, 200)}`)
}

// ── Phase 3: z-image fresh card ──────────────────────────────────────────
step('Phase 3: new z-image card — modal healthy fresh?')
try {
  await page.getByRole('button', { name: /add a card/i }).first().click()
  const dialog3 = page.getByRole('dialog')
  await dialog3.getByText('What do you want to make?').waitFor({ state: 'visible', timeout: 20_000 })
  await dialog3.locator('select').first().selectOption('z-image')
  await dialog3.getByRole('button', { name: /^Create Image/ }).click()
  const detail3 = page.locator('[data-card-detail]')
  await detail3.waitFor({ state: 'visible', timeout: 60_000 })
  await page.locator('[data-subcard-grid]').waitFor({ state: 'visible', timeout: 30_000 })
  ok('z-image grid visible')
  const m3 = await openLoraModal(detail3)
  await dumpAdapter(m3, 'P3 z-image fresh card')
} catch (e) {
  console.log(`   ✗ Phase 3 failed: ${String(e).slice(0, 200)}`)
}

await browser.close()
console.log('\nDONE')
