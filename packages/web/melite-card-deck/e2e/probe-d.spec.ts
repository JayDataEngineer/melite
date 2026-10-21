import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

test('probe (d): h3 Final Cut second-pass visibility + refmod steps', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  // attach BEFORE navigation: the lane's socket opens on load
  const frames: string[] = []
  const seenUrls = new Set<string>()
  page.on('websocket', (ws) => {
    console.log('WS_URL=' + ws.url().slice(0, 120))
    ws.on('framereceived', (frame) => {
      const text = typeof frame.payload === 'string' ? frame.payload : ''
      if (!text.includes('"intent"')) return
      const m = text.match(/"draft_id":"([^"]+)","session":"([^"]+)","rev":(\d+)/)
      if (!m) return
      // stage summaries: id/card/param-keys only
      const stages: string[] = []
      const re = /"id":"([^"]+)","card":"([^"]+)","params":(\{)/g
      let g: RegExpExecArray | null
      while ((g = re.exec(text)) !== null) {
        if (!g[2].includes('h3')) continue
        const ps = text.indexOf('"params"', g.index)
        let depth = 0, end = ps + 9
        for (let i = text.indexOf('{', ps + 8); i < text.length && i < ps + 4000; i++) {
          if (text[i] === '{') depth++
          if (text[i] === '}') { depth--; if (depth === 0) { end = i; break } }
        }
        const ptext = text.slice(ps + 9, end + 1)
        stages.push(g[1] + ' PARAMS=' + ptext.slice(0, 900))
      }
      const line = m[1] + ' rev=' + m[3] + ' stages=[' + stages.slice(-1).join(' | ') + '] n=' + stages.length
      if (frames.length < 12) { frames.push(line); console.log('WS_BENCH=' + line) }
    })
  })
  page.on('response', async (r) => {
    const url = r.url()
    if ((url.includes('/api/') || url.includes('/v1/')) && !seenUrls.has(url.split('?')[0])) { seenUrls.add(url.split('?')[0]); console.log('API_URL=' + url.split('?')[0]) }
  })
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try { await notice.click({ timeout: 10_000 }); await page.waitForTimeout(1_000) } catch { /* again */ }
  }
  const expandSeat = page.locator('[data-sidebar-right-expand]').first()
  if ((await expandSeat.count()) === 0) {
    const hero = page.getByRole('textbox', { name: /Describe what you want to build/ })
    await hero.fill('probe d: h3 second pass visibility', { timeout: 15_000 })
    await hero.press('Enter')
    await page.waitForTimeout(8_000)
  }
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  await page.getByText('Media Flow', { exact: true }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  const roster = await page.evaluate(async () => {
    const forms = await (await fetch('/v1/forms')).json() as Record<string, unknown>
    const catalog = await (await fetch('/v1/model-catalog')).json() as { cards?: Record<string, { label?: string }> }
    return { forms: Object.keys(forms), labels: Object.fromEntries(Object.entries(catalog.cards ?? {}).map(([k, v]) => [k, v.label])) }
  })
  console.log('ROSTER=' + JSON.stringify(roster).slice(0, 600))
  await page.getByRole('button', { name: /^Add a card$/ }).first().click({ timeout: 30_000 })
  // picker: catalog label for h3?
  const h3pick = page.getByRole('button', { name: /^Generate Video$/i }).first()
  console.log('H3_PICK_COUNT=' + await page.getByRole('button', { name: /^Generate Video$/i }).count())
  await h3pick.click({ timeout: 30_000 })
  await page.waitForTimeout(4_000)
  // recipe seat state
  const recipe = page.locator('[data-recipe-select]').first()
  console.log('RECIPE_SEAT=' + await recipe.count())
  if (await recipe.count() > 0) {
    console.log('RECIPE_FACE_PRE=' + JSON.stringify((await recipe.textContent())?.trim() ?? ''))
    await recipe.click({ timeout: 15_000 })
    await page.waitForTimeout(800)
    const items = page.getByRole('menuitem')
    const n = await items.count()
    console.log('RECIPE_MENU_N=' + n)
    for (let i = 0; i < n; i++) console.log('RECIPE_ITEM_' + i + '=' + JSON.stringify((await items.nth(i).textContent())?.trim() ?? '').slice(0, 80))
    // pick Final Cut
    const fc = page.getByRole('menuitem', { name: /Final Cut/ })
    if (await fc.count() > 0) {
      await fc.first().click({ timeout: 15_000 })
      await page.waitForTimeout(2_000)
      console.log('RECIPE_FACE_POST=' + JSON.stringify((await recipe.textContent())?.trim() ?? ''))
    } else {
      console.log('NO_FINAL_CUT_OFFERED')
      await page.keyboard.press('Escape')
    }
  }
  // second pass tab/section presence
  const body = await page.locator('body').innerText()
  console.log('HAS_SECOND_PASS_TEXT=' + body.includes('Second Pass'))
  console.log('HAS_SR_SWITCH=' + (body.includes('Super-Res') || body.includes('sr_switch')))
  // steps face
  const stepsRow = page.locator('label').filter({ hasText: /^Steps/ }).first()
  console.log('STEPS_ROW=' + await stepsRow.count())
  if (await stepsRow.count() > 0) console.log('STEPS_FACE=' + JSON.stringify((await stepsRow.textContent())?.trim() ?? '').slice(0, 120))
  await page.screenshot({ path: '/tmp/probe-d-finalcut.png' })
  console.log('SCREENSHOT=/tmp/probe-d-finalcut.png')
  // THE SERVED TRUTH: the card's own form-spec doc — recipe rows'
  // defaults + families, exactly what the face derives against
  const served = await page.evaluate(async () => {
    const doc = await (await fetch('/v1/form-spec?model=h3-timeline')).json() as {
      model?: unknown, families?: unknown,
      features?: { variant_groups?: Record<string, { default?: unknown }> },
      variants?: Array<{ id?: unknown, group?: unknown, owner?: unknown, route?: unknown, defaults?: unknown }>
    }
    return {
      model: doc.model,
      families: doc.families,
      recipeDefault: doc.features?.variant_groups?.Recipe,
      recipes: (doc.variants ?? []).filter((v) => v.group === 'Recipe').map((v) => ({ id: v.id, owner: v.owner, route: v.route, defaults: v.defaults })),
    }
  })
  console.log('SERVED_RECIPES=' + JSON.stringify((served as { recipes: unknown }).recipes).slice(0, 2500))
  const servedKeys = await page.evaluate(async () => {
    const doc = await (await fetch('/v1/form-spec?model=h3-timeline')).json() as Record<string, unknown>
    return { keys: Object.keys(doc), hasParams: Array.isArray(doc.params), paramsLen: Array.isArray(doc.params) ? (doc.params as unknown[]).length : -1, hasLorAs: Array.isArray(doc.params) ? (doc.params as string[]).includes('loras') : null }
  })
  console.log('SERVED_KEYS=' + JSON.stringify(servedKeys))
  const recipeDefault = await page.evaluate(async () => {
    const doc = await (await fetch('/v1/form-spec?model=h3-timeline')).json() as { features?: { variant_groups?: Record<string, unknown> } }
    return doc.features?.variant_groups?.Recipe
  })
  console.log('RECIPE_DEFAULT=' + JSON.stringify(recipeDefault).slice(0, 400))
  // THE SECOND PASS TAB: click it, read whether the pick's stamp SHOWS
  const tabStrip = page.locator('body')
  await page.getByText('Second Pass', { exact: true }).first().click({ timeout: 15_000 })
  await page.waitForTimeout(1_000)
  const switches = await page.evaluate(() => {
    const out: string[] = []
    document.querySelectorAll('input[type="checkbox"], [role="switch"], [aria-checked]').forEach((el) => {
      const label = el.closest('label')?.textContent?.trim()?.slice(0, 60)
        ?? el.parentElement?.textContent?.trim()?.slice(0, 60) ?? '?'
      const state = el.getAttribute('aria-checked') ?? (el as HTMLInputElement).checked ?? '?'
      out.push(`${label} = ${state}`)
    })
    return out
  })
  console.log('SWITCHES=' + JSON.stringify(switches).slice(0, 900))
  console.log('HELD_FRAMES=' + JSON.stringify(frames.slice(-3)).slice(0, 1600))
  await page.screenshot({ path: '/tmp/probe-d-secondpass.png' })
})
