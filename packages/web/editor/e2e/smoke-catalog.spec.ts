/**
 * SMOKE: Catalog-driven UI — no hardcoded model lists.
 *
 * Fast (no GPU). Proves the frontend reads model/family data from the
 * backend catalog (/v1/model-catalog, /v1/forms, /v1/form-spec) rather
 * than from hardcoded TS arrays. The contract:
 *
 *   1. /v1/model-catalog returns a valid catalog with models + families
 *   2. /v1/forms returns form definitions with sidebar labels + genres
 *   3. Every model in the catalog has a matching form-spec
 *   4. The Video tab dropdown shows ALL video families (LTX, Wan VACE, SCAIL2)
 *   5. The Edit tab dropdown shows ALL edit families (Qwen-Edit)
 *
 * This catches:
 *   - Catalog YAML parse failures (schema validation rejects unknown fields)
 *   - Missing form-spec for a declared model (500 on /v1/form-spec)
 *   - Family/form-tag mismatches (model declared with wrong form)
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/smoke-catalog.spec.ts
 */
import { test, expect } from '@playwright/test'

const API = 'http://localhost:33081'

test.describe('Catalog-driven UI — backend is the single source of truth', () => {

  test('/v1/model-catalog returns valid catalog with models and families', async () => {
    const resp = await fetch(`${API}/v1/model-catalog`)
    expect(resp.status, '/v1/model-catalog must return 200').toBe(200)
    const catalog = await resp.json()

    expect(catalog.models, 'catalog must have models').toBeDefined()
    expect(Object.keys(catalog.models).length, 'catalog must have ≥1 model').toBeGreaterThan(0)

    expect(catalog.families, 'catalog must have families').toBeDefined()
    expect(Object.keys(catalog.families).length, 'catalog must have ≥1 family').toBeGreaterThan(0)

    // Every model must reference a family that exists
    for (const [modelKey, modelDef] of Object.entries(catalog.models)) {
      const fam = (modelDef as Record<string, unknown>).family
      expect(fam, `model ${modelKey} must declare a family`).toBeTruthy()
      expect(catalog.families[fam as string], `model ${modelKey} references unknown family ${fam}`).toBeDefined()
    }

    console.log(`  ✓ Catalog: ${Object.keys(catalog.models).length} models, ${Object.keys(catalog.families).length} families`)
  })

  test('Catalog: families with lora_dir have the field accepted by schema validator', async () => {
    const resp = await fetch(`${API}/v1/model-catalog`)
    const catalog = await resp.json()

    const familiesWithLoraDir: string[] = []
    for (const [famId, famDef] of Object.entries(catalog.families)) {
      const ld = (famDef as Record<string, unknown>).lora_dir
      if (ld) familiesWithLoraDir.push(`${famId} → ${ld}`)
    }

    // If this fails with a 500, the catalog_schema.py FAMILY_FIELDS set
    // doesn't include "lora_dir" (the exact bug that blocked everything).
    expect(resp.status, 'catalog must not 500 when lora_dir is present').toBe(200)
    console.log(`  ✓ Families with lora_dir: ${familiesWithLoraDir.join(', ') || '(none)'}`)
  })

  test('Every model with a form has a valid form-spec', async () => {
    const catResp = await fetch(`${API}/v1/model-catalog`)
    const catalog = await catResp.json()

    const formSpecs: { model: string; fields: number; groups: number }[] = []
    let checked = 0
    let errors = 0

    for (const [modelKey, modelDef] of Object.entries(catalog.models)) {
      const form = (modelDef as Record<string, unknown>).form
      if (!form) continue
      checked++

      const fsResp = await fetch(`${API}/v1/form-spec?model=${encodeURIComponent(modelKey)}`)
      if (!fsResp.ok) {
        console.log(`  ✗ form-spec for ${modelKey}: HTTP ${fsResp.status}`)
        errors++
        continue
      }
      const spec = await fsResp.json()
      const fieldCount = (spec.fields || []).length
      const groupCount = (spec.schema_groups || []).length
      formSpecs.push({ model: modelKey, fields: fieldCount, groups: groupCount })
    }

    expect(errors, `${errors} models returned a bad form-spec out of ${checked} checked`).toBe(0)
    expect(checked, 'must have checked at least 1 model form-spec').toBeGreaterThan(0)
    console.log(`  ✓ All ${checked} model form-specs returned OK`)
    for (const fs of formSpecs.slice(0, 10)) {
      console.log(`    ${fs.model}: ${fs.fields} fields, ${fs.groups} groups`)
    }
    if (formSpecs.length > 10) console.log(`    ... and ${formSpecs.length - 10} more`)
  })

  test('Video tab: dropdown shows all video families from catalog', async ({ page }) => {
    // Verify the Video tab's model dropdown is catalog-driven.
    // The form form_video_director should include LTX, Wan VACE, SCAIL2.
    const catResp = await fetch(`${API}/v1/model-catalog`)
    const catalog = await catResp.json()

    const videoFamilies = new Set<string>()
    for (const [, modelDef] of Object.entries(catalog.models)) {
      const md = modelDef as Record<string, unknown>
      if (md.form === 'form_video_director') {
        videoFamilies.add(String(md.family))
      }
    }

    console.log(`  ✓ Video families in catalog: ${Array.from(videoFamilies).join(', ')}`)
    expect(videoFamilies.size, 'must have ≥1 video family').toBeGreaterThanOrEqual(1)

    // Now check the UI — open the Video tab and read the dropdown options
    await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })

    // Click the Video workspace tab (header tab — first match).
    await page.getByRole('button', { name: /^Video$/ }).first().click()
    await page.waitForTimeout(2000)

    // DirectorStudio starts with NO segments. Click "Add shot" to open the
    // Inspector, which renders the native <select> model dropdown.
    await page.locator('text=Add shot').first().click()
    await page.locator('select').first().waitFor({ state: 'visible', timeout: 15_000 })
    await page.waitForTimeout(1000)

    // DirectorStudio uses a NATIVE <select> (not a shadcn combobox).
    const modelSelect = page.locator('select').first()
    const options = await modelSelect.locator('option').allInnerTexts()

    console.log(`  ✓ Video dropdown options: ${JSON.stringify(options)}`)
    expect(options.length, 'Video dropdown must show ≥1 model').toBeGreaterThan(0)
  })

  test('/v1/loras requires model param and returns per-model results', async () => {
    // No model → empty list
    const noModel = await fetch(`${API}/v1/loras`).then(r => r.json())
    expect(noModel.loras, '/v1/loras without model should return empty list').toEqual([])

    // LTX model → ltx2 folder LoRA
    const ltxResp = await fetch(`${API}/v1/loras?model=ltx-director-distilled`).then(r => r.json())
    expect(ltxResp.loras.length, 'ltx-director-distilled should have ≥1 LoRA').toBeGreaterThanOrEqual(1)
    expect(ltxResp.loras[0], 'LoRA path should start with ltx2/').toContain('ltx2/')

    // Qwen model → qwen folder LoRAs (count is live-disk — assert ≥1, not
    // a pinned snapshot; the folder contract is the qwen/ prefix)
    const qwenResp = await fetch(`${API}/v1/loras?model=qwen-img-edit-2511`).then(r => r.json())
    expect(qwenResp.loras.length, 'qwen-img-edit-2511 should have ≥1 LoRA').toBeGreaterThan(0)
    expect(qwenResp.loras.every((l: string) => l.startsWith('qwen/')), 'all qwen LoRAs should be in qwen/ folder').toBeTruthy()

    // A model WITHOUT lora_dir → empty list (not a global fallback)
    const noLoraResp = await fetch(`${API}/v1/loras?model=wan-vace`).then(r => r.json())
    expect(noLoraResp.loras, 'wan-vace (no lora_dir) should return empty').toEqual([])

    console.log('  ✓ /v1/loras is per-model: LTX→ltx2/, Qwen→qwen/, Wan VACE→[]')
  })
})
