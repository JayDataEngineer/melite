/**
 * E2E: the input chips' CONTENT CONTRAST, measured in real Chromium
 * against the live host's own theme.
 *
 * THE DEFECT (operator, 2026-10-02 — "in the little input boxes in
 * the cards, there is an x button that does not render, the white
 * circle around the x does"): the detach chip and the pick chip both
 * read `background: var(--dsw-alias-bg-module, #fff)`. That token
 * does not exist in DSH's theme (it defines `--dsw-alias-bg-module-
 * platform`), so the rule's own `#fff` fallback always won: a WHITE
 * circle on the dark module, with `--dsw-alias-label-primary` painting
 * a near-white glyph on it. Measured on the live lane before the cure:
 * color rgb(249,250,251) on background rgb(255,255,255) — 1.005:1.
 * The circle rendered; the ✕ was white-on-white and simply not there.
 *
 * WHY A BROWSER WALL (the class of this defect): a jsdom/happy-dom
 * spec computes no colors — every in-process wall in the repo passed
 * while the glyph was invisible on the operator's screen. Contrast is
 * a paint property, so only a real engine can judge it.
 *
 * The wall reads the host's OWN stylesheets and token values (no
 * hard-coded palette, which would rot the moment DSH re-themes) and
 * fails when either chip's content/background pair falls under the
 * 3:1 non-text-contrast floor, or when the chip paints a hard-coded
 * fallback because its token is undefined in this theme.
 *
 * Self-skips without E2E_STUDIO_URL, the same law as the rest of this
 * suite. Run: E2E_STUDIO_URL='http://127.0.0.1:3088/?token=…' pnpm
 *   --filter @melite-plugin/dsh-card-view exec playwright test e2e/chip-contrast.spec.ts
 */
import { expect, test, type Page } from '@playwright/test'
import { STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the contrast wall measures the live host’s own theme')

/** The WCAG relative luminance of one `rgb(r, g, b)` triple. */
function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The WCAG contrast ratio between two `rgb()` triples (1:1 … 21:1). */
function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function parseRgb(value: string): [number, number, number] {
  const parts = value.match(/[\d.]+/g)
  if (parts === null || parts.length < 3) throw new Error(`not an rgb() color: ${value}`)
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])]
}

/** The CSS-module class the host actually serves for a source class. */
async function servedClass(page: Page, sourceName: string): Promise<string | null> {
  return page.evaluate((name) => {
    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList
      try { rules = sheet.cssRules } catch { continue }
      for (const rule of rules) {
        const selector = (rule as CSSStyleRule).selectorText
        if (selector === undefined || !selector.includes(name)) continue
        const match = selector.match(/\.([A-Za-z0-9_-]+)/)
        if (match !== null) return match[1] ?? null
      }
    }
    return null
  }, sourceName)
}

test('the input chips paint their glyph above the 3:1 floor (the blank ✕, cured)', async ({ page }) => {
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})

  const probes = await page.evaluate(async () => {
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;top:0;left:0;width:300px;z-index:2147483647'
    document.body.appendChild(host)

    const classOf = (sourceName: string): string => {
      for (const sheet of document.styleSheets) {
        let rules: CSSRuleList
        try { rules = sheet.cssRules } catch { continue }
        for (const rule of rules) {
          const selector = (rule as CSSStyleRule).selectorText
          if (selector === undefined || !selector.includes(sourceName)) continue
          const match = selector.match(/\.([A-Za-z0-9_-]+)/)
          if (match !== null) return match[1] ?? ''
        }
      }
      return ''
    }

    // THE DETACH CHIP renders its ✕ as text (square.tsx's squareX
    // face); THE PICK CHIP carries the Upload SVG, whose stroke is
    // currentColor — so the SVG is the glyph the contrast question is
    // about for that chip.
    const detach = document.createElement('button')
    detach.className = classOf('squareX')
    detach.textContent = '✕'
    const pick = document.createElement('button')
    pick.className = classOf('squarePick')
    pick.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/></svg>'
    host.append(detach, pick)

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    const read = (el: HTMLElement, sourceName: string) => {
      const cs = getComputedStyle(el)
      const box = el.getBoundingClientRect()
      return {
        sourceName,
        servedClass: el.className,
        color: cs.color,
        background: cs.backgroundColor,
        width: Number(box.width.toFixed(2)),
        height: Number(box.height.toFixed(2)),
      }
    }
    const out = [read(detach, 'squareX'), read(pick, 'squarePick')]
    host.remove()
    return out
  })

  for (const probe of probes) {
    expect(probe.servedClass, `${probe.sourceName} is served by the host (its CSS-module row loaded)`).not.toBe('')
    // THE PAINT GATE: content and surface must differ, or the glyph is
    // invisible exactly as the operator saw it. 3:1 is the WCAG floor
    // for non-text content (the glyph here is an icon-scale mark).
    const ratio = contrast(parseRgb(probe.color), parseRgb(probe.background))
    expect(ratio, `${probe.sourceName} paints ${probe.color} on ${probe.background} — contrast ${ratio.toFixed(2)}:1 (floor 3:1)`).toBeGreaterThanOrEqual(3)
    // A chip that collapsed has no glyph to paint either.
    expect(probe.width, `${probe.sourceName} has layout width`).toBeGreaterThan(4)
    expect(probe.height, `${probe.sourceName} has layout height`).toBeGreaterThan(4)
  }
})

test('the input chips resolve their colors from tokens this theme defines (no dead-name fallback)', async ({ page }) => {
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})

  const report = await page.evaluate(() => {
    // Every token the two chip rules name, and whether THIS theme
    // defines it. A chip whose background token is undefined is
    // painting the rule's hard-coded fallback — the 2026-10-02 root
    // cause, and the shape any future recurrence takes.
    const probe = document.createElement('div')
    document.body.appendChild(probe)
    const style = getComputedStyle(probe)
    const resolve = (name: string): string => style.getPropertyValue(name).trim()
    const tokens = {
      'interactive-bg-hover-solid': resolve('--dsw-alias-interactive-bg-hover-solid'),
      'label-primary': resolve('--dsw-alias-label-primary'),
      'border-l2': resolve('--dsw-alias-border-l2'),
    }
    probe.remove()
    return tokens
  })

  for (const [name, value] of Object.entries(report)) {
    expect(value, `--dsw-alias-${name} is defined by this theme (a dead name paints the rule's own fallback)`).not.toBe('')
  }
})

test('every served card chip rule names only tokens the host theme defines', async ({ page }) => {
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})

  // THE CLASS GATE (the "this keeps recurring" half): card-base's
  // served stylesheet must not reference a --dsw-alias-* name the host
  // theme leaves undefined. The known-debt list is the pre-existing
  // motion/3d `bg-module` uses, recorded rather than silently re-skinned
  // here; card-base's own chips are NOT on it, and re-adding one fails.
  const KNOWN_DEBT = [
    'bg-module', // the 3d action cards + motion viewers (not card-base)
  ]

  const offenders = await page.evaluate((debt) => {
    // THE TOKEN SNAPSHOT: a live CSSStyleDeclaration reads from the
    // element it came from, so a probe that is detached before the
    // sheet scan answers "" for every name and flags the whole
    // stylesheet. Snapshot the resolved values while it is attached.
    const probe = document.createElement('div')
    document.body.appendChild(probe)
    const defined = new Map<string, boolean>()
    const seen = new Set<string>()
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try { rules = sheet.cssRules } catch { continue }
      for (const rule of Array.from(rules)) {
        const text = (rule as CSSStyleRule).cssText ?? ''
        const isCardBase = /card-base|cardModule|_square|_modRow/.test(text)
        if (!isCardBase) continue
        for (const match of text.matchAll(/var\(--dsw-alias-([a-z0-9-]+)/g)) {
          const token = match[1] ?? ''
          if (token === '' || debt.includes(token)) continue
          if (!defined.has(token)) {
            defined.set(token, getComputedStyle(probe).getPropertyValue(`--dsw-alias-${token}`).trim() !== '')
          }
          if (defined.get(token) === false) seen.add(token)
        }
      }
    }
    probe.remove()
    return Array.from(seen)
  }, KNOWN_DEBT)

  expect(offenders, `card-base stylesheet references undefined theme tokens: ${offenders.join(', ')}`).toEqual([])
})
