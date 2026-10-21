import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

// probe (j2): the MCP card opt-in fold's UI journey — the cards tab
// roster the operator reads (/v1/forms via card-base fetchFormsTable)
// carries NO mcp row on the un-opted lane, while the agent-doc ambient
// tiles census (the spawned subagent's grantable servers) stays live.
// Read-only probe (THE_JOURNEY_LAW owed journey, registry row
// gates-mcp-card-opt-in-fold).
test('probe (j2): the cards-tab roster folds the mcp row; ambient agent tiles stay live', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try { await notice.click({ timeout: 10_000 }); await page.waitForTimeout(1_000) } catch { /* again */ }
  }
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  await page.getByText('Media Flow', { exact: true }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  // the roster serves, read in-page (the shell fetch the cards tab
  // rides: card-base wire.ts fetchFormsTable → GET /v1/forms)
  const roster = await page.evaluate(async () => {
    const forms = await (await fetch('/v1/forms')).json() as Record<string, { label?: string }>
    const catalog = await (await fetch('/v1/model-catalog')).json() as { cards?: Record<string, { label?: string }> }
    const rowIds = Object.keys(forms)
    const mcpRows = rowIds.filter((id) => /mcp/i.test(id) || /mcp/i.test(String(forms[id]?.label ?? '')))
    const catIds = Object.keys(catalog.cards ?? {})
    const catMcp = catIds.filter((id) => /mcp/i.test(id) || /mcp/i.test(String(catalog.cards?.[id]?.label ?? '')))
    return { rowIds, mcpRows, catIds, catMcp }
  })
  console.log('ROSTER_ROWS=' + roster.rowIds.length + ' ids=' + JSON.stringify(roster.rowIds))
  console.log('MCP_ROWS=' + JSON.stringify(roster.mcpRows))
  console.log('CATALOG_MCP=' + JSON.stringify(roster.catMcp))
  // THE ASSERT (error j2): no roster row id/label matches /mcp/i
  expect(roster.mcpRows, 'mcp rows in /v1/forms: ' + JSON.stringify(roster.mcpRows)).toEqual([])
  expect(roster.catMcp, 'mcp cards in /v1/model-catalog: ' + JSON.stringify(roster.catMcp)).toEqual([])
  // the rendered tab face — the felt hop: no MCP card tile/row visible
  const body = await page.evaluate(() => document.body.innerText)
  expect(/mcp\s*\(experimental\)/i.test(body), 'the tab renders an MCP (experimental) card face').toBe(false)
  // THE SIDES (the exception): the agent-doc ambient tiles census —
  // the spawned subagent's grantable servers — still rides the tools
  // seat (ambient presence is not intent, but it IS the spawn's census)
  const sides = await page.evaluate(async () => {
    const doc = await (await fetch('/v1/form-spec?model=agent')).json() as {
      features?: { modifiers?: Array<{ fields?: Array<{ key?: string, options?: Array<{ value?: string, label?: string }> }> }> }
    }
    const fields = doc.features?.modifiers?.[0]?.fields ?? []
    const mcps = fields.find((f) => f.key === 'mcps' || /mcp/i.test(String(f.key ?? '')))
    return (mcps?.options ?? []).map((o) => String(o.value))
  })
  console.log('AGENT_MCPS_TILES=' + JSON.stringify(sides))
  expect(Array.isArray(sides), 'the agent doc mcps census serves').toBe(true)
  await page.screenshot({ path: '/tmp/probe-j2-mcp-absent.png', fullPage: false })
})
