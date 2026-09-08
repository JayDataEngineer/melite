/**
 * SMOKE: Sidebar + Library card canvas — the ONE authoring surface.
 *
 * Fast (no GPU). Rewritten 2026-08-06 (R1): the per-service sidebar form
 * sweep died with AssetsTab — services now live behind capability cards on
 * the Library canvas. The remaining shell contract this spec proves:
 *   1. The ActivityBar's 8 nav buttons render.
 *   2. The Library rail's capability groups render with their schema-driven
 *      counts (Image 5 / Video 1 / … — the catalog, never hardcoded names).
 *   3. Library → add card → capability picker → Generate tile lands a card
 *      tile + auto-opens the detail modal (the authoring loop).
 *   4. No console errors across the whole tour.
 *
 * (Sidebar nav + capability chips are also asserted in editor.spec.ts —
 * this spec's unique value is the Library canvas authoring loop + the
 * console-error guard around it.)
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/smoke-sidebar.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  // App-boot signal: the ActivityBar's Agent button (the landing tab). The
  // old `text=TECH NOIR` wait died with the header bar (71a796af, 2026-08-10)
  // — the brand text now lives only inside the Chat History drawer, which is
  // closed at boot.
  await page.getByRole('button', { name: 'Agent', exact: true }).waitFor({ state: 'visible', timeout: 30_000 })
}

test.describe('Sidebar + Library card canvas', () => {
  test('sidebar nav buttons are present', async ({ page }) => {
    await gotoEditor(page)
    // 'Flow Nodes' is GONE (ONE_SURFACE Phase 4) — the drawer merged
    // into the Library rail; the ActivityBar is now the four tiers below.
    // The 8 items are the CURRENT ActivityBar union (ActivityBar.tsx) —
    // 'Character Library' died 2026-08-08 (the body card drilldown owns
    // presets + mesh) and 'Copilot' was renamed 'Agent' in the rail rework
    // 2026-08-10; the old label list had been stale since then, hidden
    // behind the dead TECH NOIR boot wait.
    // exact: true — substring matching would collide ('Agent' vs the
    // "Manage AI Model — keys that power the agent…" button).
    for (const label of ['Agent', 'Library', 'History / Media', 'Chat History', 'Video', 'Pose', 'Animate', 'Settings']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
  })

  test('Library rail groups render with catalog counts', async ({ page }) => {
    await gotoEditor(page)
    // The capability chips live in the Library rail (the ONE discovery
    // surface, ONE_SURFACE Phase 4) — section headers carry the schema-driven
    // count ("Image 5", never hardcoded names). The old `.bg-sidebar` chip
    // row died when the chips moved out of the left rail (2026-08-08
    // grouping rework); the genre list is the rail's LIBRARY_GENRE_ORDER.
    await page.getByRole('button', { name: /^Library$/ }).first().click()
    const rail = page.locator('[data-rail="right"]')
    await expect(rail).toBeVisible()
    for (const cap of ['Image', 'Video', 'Audio', 'Text', 'Other']) {
      await expect(rail.getByRole('button', { name: new RegExp(`^${cap} \\d+$`) })).toBeVisible()
    }
    // The Flows header — the former Flow Nodes drawer, merged into
    // this rail (Phase 4, plan D2).
    await expect(rail.getByRole('button', { name: /^Flows \d+$/ })).toBeVisible()
  })

  test('Library canvas: add card → picker → tile + detail modal, no console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

    await gotoEditor(page)

    // The app boots to the Agent tab (user decision 2026-08-06); the Library
    // card canvas is a header tab, not the landing surface.
    await page.getByRole('button', { name: /^Library$/ }).first().click()
    await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })

    // Add the first card → the capability picker opens.
    const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
    await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await addBtn.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })

    // Capability tiles, NOT model names — the user authors by intent. The
    // labels come from the schema (packages/melite-core/models/capabilities.
    // yaml — the ONE source the picker + LibrarySidebar derive from); one
    // representative per kind with their CURRENT labels (the old
    // Generate Image / Video / Audio / Enhance Image names died in the
    // capability-layer rework).
    for (const label of ['Create Image', 'Edit Image', 'Create Video', 'Speech', '3D', 'Motion']) {
      await expect(dialog.getByRole('button', { name: new RegExp(`^${label} `) })).toBeVisible()
    }
    await expect(dialog.getByRole('button', { name: /^Krea 2/ })).toHaveCount(0)

    // Pick Create Image → the card auto-expands inline (the focused card
    // renders [data-card-detail] via CardDetailInline — not a collapsed
    // [data-card-tile], which only siblings render). The detail carries
    // the service badge + capability title.
    await dialog.getByRole('button', { name: /^Create Image/ }).click()
    const modal = page.locator('[data-card-detail]')
    await modal.waitFor({ state: 'visible', timeout: 15_000 })
    // 'Krea 2' — the model display name (selected option), not the slug:
    // the detail modal shows model display names, not service ids.
    await expect(modal).toContainText('Krea 2')
    await expect(modal).toContainText('Create Image')
    await expect(modal).toContainText('No output yet')
    await expect(modal.getByRole('button', { name: 'Run' })).toBeVisible()

    // The tour must be clean: no React crashes, no fetch failures.
    const critical = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('chrome-extension') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('Failed to load resource') &&
      !e.includes('net::ERR')
    )
    expect(critical, `unexpected console errors: ${critical.join('; ')}`).toHaveLength(0)
    console.log('  ✓ Library authoring loop clean (no console errors)')
  })
})
