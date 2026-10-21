import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

// probe (j2-sides): dump the agent doc's modifiers/fields verbatim —
// the ambient MCPs tiles census must survive the card fold.
test('probe (j2-sides): agent-doc census dump', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try { await notice.click({ timeout: 10_000 }); await page.waitForTimeout(1_000) } catch { /* again */ }
  }
  const dump = await page.evaluate(async () => {
    const agent = await (await fetch('/v1/form-spec?model=agent')).json() as Record<string, unknown>
    const mcpDoc = await (await fetch('/v1/form-spec?model=mcp')).json() as Record<string, unknown>
    const feats = agent['features'] as { modifiers?: Array<Record<string, unknown>> } | undefined
    const mods = feats?.modifiers ?? []
    const fields = ((mods[0] ?? {})['fields'] as Array<Record<string, unknown>>) ?? []
    const mcpFeats = mcpDoc['features'] as { modifiers?: Array<Record<string, unknown>> } | undefined
    const mcpFields = (((mcpFeats?.modifiers ?? [])[0] ?? {})['fields'] as Array<Record<string, unknown>>) ?? []
    return {
      agentFieldKeys: fields.map((f) => String(f['key'] ?? f['name'] ?? '?')),
      agentServerOptions: fields.flatMap((f) => String(f['key'] ?? f['name'] ?? '') === 'server' ? ((f['options'] as Array<{ value?: unknown }>) ?? []).map((o) => String(o.value)) : []),
      mcpDocFieldKeys: mcpFields.map((f) => String(f['key'] ?? f['name'] ?? '?')),
      mcpDocServerOptions: mcpFields.flatMap((f) => String(f['key'] ?? f['name'] ?? '') === 'server' ? ((f['options'] as Array<{ value?: unknown }>) ?? []).map((o) => String(o.value)) : []),
    }
  })
  console.log('DUMP=' + JSON.stringify(dump))
  expect(true).toBe(true)
})
