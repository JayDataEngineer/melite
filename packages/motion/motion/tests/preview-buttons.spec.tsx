// @vitest-environment happy-dom
/**
 * preview-buttons.spec.tsx — THE PREVIEW-PANE BUTTONS (operator volley
 * 2026-10-24, motion item: the preview pane's top-right buttons "read as
 * a gray pill"). Two fused defects: the DSH Button ghost/md box leak
 * (the primitives' .button base ships padding:0 14px, the default md
 * size is 36px tall — both bled into the 28px icon boxes) and the
 * single-pill container (one bordered .camPill fusing four glyphs into
 * one control). The cure: size="sm" at all four call sites, the
 * padding/border/background/box/flex reset on .camBtn/.frameBtn, the
 * container transparent + borderless, and each button its OWN bordered
 * idle face in the rail grammar (.railBtnIdle) — the single-pill read
 * was explicitly rejected (choice documented in component.module.css).
 *
 * THE WALL (law: every fix lands with an arm that reds on toggle):
 *  1. FOUR BUTTONS, 28px BOX — by aria-label, each riding the sm size
 *     class with computed height 28px + padding 0px + radius 999px.
 *  2. IDLE vs ACTIVE DISTINCT — the pressed framing rides the active
 *     face, the other the idle face, and a press flips both.
 *  3. NO SINGLE FACE — the pill container is borderless/transparent
 *     while each button carries its own face.
 *  4. CSS-CONTRACT — the module file carries the reset, the Tip-span
 *     rule, the idle borders, the borderless container, and
 *     MotionStageView.tsx seats size="sm" at all four call sites.
 * TOGGLES (each reds its arm, restore greens):
 *  padding-reset removal (drop `padding: 0` from the reset) reds arm 1
 *  — the injected DSH base sheet keeps the leak LIVE in-test, so the
 *  computed padding falls back to the sm 0 10px;
 *  idle-face revert (drop the idle 1px borders) reds arm 3's file half.
 *
 * happy-dom HAS no layout engine, so the wall mounts the cascade the
 * way filmSeam mounts getBoundingClientRect: the DSH Button base sheet
 * injects FIRST and this module's sheet SECOND (the bundle's own order
 * — MotionStageView.tsx imports the primitives before its module css,
 * pinned in arm 4), both rewritten onto the runtime hashed classes via
 * the module mapping the component itself uses. happy-dom drops
 * color-mix() declarations, so border/background FACES are judged on
 * the file plane (arm 4) + class bindings (arms 2-3), never computed —
 * the geometry (height/padding/radius/box/flex) IS computed.
 */
import { fireEvent } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, stubLoads, mountEditor } from './helpers.ts'
import s from '../src/ui/studio/component.module.css'

afterEach(() => resetStudio())

const LAW = 'packages/motion/motion/src/ui/studio/component.module.css'
const VIEW = 'packages/motion/motion/src/ui/studio/MotionStageView.tsx'
const LABELS = [
  'Rotate view left (45°)',
  'Full body framing',
  'Upper half framing',
  'Rotate view right (45°)',
] as const

function pillButton(name: string): HTMLButtonElement {
  const b = document.body.querySelector(`[aria-label="${name}"]`)
  if (b === null) throw new Error(`pill button missing: ${name}`)
  return b as HTMLButtonElement
}

/** The module file's own text IS the contract for faces (happy-dom
 *  drops color-mix, so borders/backgrounds never reach computed) —
 *  slice a rule's declaration block. */
function ruleBlock(law: string, selector: string): string | null {
  const at = law.indexOf(selector + ' {')
  if (at < 0) return null
  const end = law.indexOf('}', at)
  if (end < 0) return null
  return law.slice(at, end + 1)
}

/** Mount the editor, then the two-sheet cascade (DSH base first, this
 *  module second — the bundle order), rewritten onto the runtime
 *  hashed classes. Returns the style elements for teardown. */
async function mountedWithCascade(): Promise<{ dispose: () => void }> {
  stubLoads()
  mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
  await waitForText('30 fps · 4f')
  const sample = pillButton('Full body framing')
  const cls = sample.className.split(/\s+/)
  const btn = cls.find((c) => /_button_/.test(c) || c === 'button')!
  const sm = cls.find((c) => /_sm_/.test(c) || c === 'sm')!
  const ghost = cls.find((c) => /_ghost_/.test(c) || c === 'ghost')!
  const req = createRequire(import.meta.url)
  const pkgDir = dirname(req.resolve('@deepseek-ai/dsh-client-ui-primitives/package.json'))
  const dsh = readFileSync(join(pkgDir, 'lib/Button.module.css'), 'utf8')
    .split('.button').join('.' + btn)
    .split('.sm').join('.' + sm)
    .split('.ghost').join('.' + ghost)
  const m = s as unknown as Record<string, string>
  const own = readFileSync(LAW, 'utf8')
    .split('.camPill').join('.' + m.camPill)
    .split('.camBtn').join('.' + m.camBtn)
    .split('.frameBtn').join('.' + m.frameBtn)
    .split('.camDivider').join('.' + m.camDivider)
  const els = [dsh, own].map((text) => {
    const el = document.createElement('style')
    el.textContent = text
    document.head.appendChild(el)
    return el
  })
  return { dispose: (): void => els.forEach((el) => el.remove()) }
}

describe('the four pill buttons ride the 28px box (the ghost/md leak is dead)', () => {
  test('by aria-label: sm size class, computed 28px + padding 0 + radius 999px', async () => {
    const { dispose } = await mountedWithCascade()
    try {
      for (const name of LABELS) {
        const b = pillButton(name)
        // size="sm" reaches the runtime (the DSH size class is bound).
        expect(b.className).toMatch(/_sm_/);
        // the 28px icon box: the injected DSH base keeps the md/ghost
        // leak live (36px/0 14px), so these computed values judge the
        // reset + sm, not the absence of opposition.
        const cs = getComputedStyle(b)
        expect(cs.height).toBe('28px')
        expect(cs.padding).toBe('0px')
        expect(cs.borderRadius).toBe('999px')
        expect(cs.boxSizing).toBe('border-box')
      }
      // the framing pair binds the face classes; the arrows the cam face.
      expect(pillButton('Rotate view left (45°)').className).toMatch(/camBtn/)
      expect(pillButton('Rotate view right (45°)').className).toMatch(/camBtn/)
      expect(pillButton('Full body framing').className).toMatch(/frameBtn/)
      expect(pillButton('Upper half framing').className).toMatch(/frameBtn/)
    } finally {
      dispose()
    }
  });
});

describe('idle vs active faces are distinct (never one gray read)', () => {
  test('the pressed framing rides the active face; a press flips both faces', async () => {
    const { dispose } = await mountedWithCascade()
    try {
      const full = pillButton('Full body framing')
      const upper = pillButton('Upper half framing')
      expect(full.getAttribute('aria-pressed')).toBe('true')
      expect(upper.getAttribute('aria-pressed')).toBe('false')
      expect(full.className).toMatch(/frameBtnActive/)
      expect(upper.className).toMatch(/frameBtnIdle/)
      expect(upper.className).not.toMatch(/frameBtnActive/)
      fireEvent.click(upper)
      await vi.waitFor(() => {
        if (upper.getAttribute('aria-pressed') !== 'true') throw new Error('upper not pressed yet')
      }, { timeout: 10000 })
      expect(upper.className).toMatch(/frameBtnActive/)
      expect(full.className).toMatch(/frameBtnIdle/)
    } finally {
      dispose()
    }
  });
});

describe('the pill is not a single face (transparent container, bordered buttons)', () => {
  test('borderless container; every idle button carries its own 1px ring on the file plane', async () => {
    const { dispose } = await mountedWithCascade()
    try {
      const pill = pillButton('Full body framing').closest('div[class*="camPill"]') as HTMLElement
      expect(pill).not.toBeNull()
      // all four buttons live in the one container (the layout), but
      // the container itself voices nothing — judged on the file plane
      // (arm 4: border:0 + transparent + no 1px solid), since happy-dom
      // drops the color-mix the old pill's ring was made of.
      for (const name of LABELS) expect(pill.contains(pillButton(name))).toBe(true)
      const law = readFileSync(LAW, 'utf8')
      const container = ruleBlock(law, '.camPill')
      expect(container).not.toBeNull()
      expect(container).toContain('border: 0')
      expect(container).toContain('background: transparent')
      expect(container).not.toContain('1px solid')
      // the INDIVIDUAL faces: both idle rings exist (arrows + framing
      // idle), each its own 1px border in the rail grammar.
      expect(ruleBlock(law, '.camBtn')).toContain('border: 1px solid')
      expect(ruleBlock(law, '.frameBtnIdle')).toContain('border: 1px solid')
      // idle and active are different declarations, not one gray voice.
      const idle = ruleBlock(law, '.frameBtnIdle')
      const active = ruleBlock(law, '.frameBtnActive')
      expect(idle).not.toBeNull()
      expect(active).not.toBeNull()
      expect(idle).not.toBe(active)
    } finally {
      dispose()
    }
  });
});

describe('the CSS contract — the reset, the Tip-span rule, and the four sm seats', () => {
  test('the DSH-box reset zeroes padding/border/background with border-box + flex:none', async () => {
    const law = readFileSync(LAW, 'utf8')
    const reset = ruleBlock(law, '.camBtn, .frameBtn')
    expect(reset, 'the .camBtn/.frameBtn reset must exist').not.toBeNull()
    expect(reset).toContain('padding: 0')
    expect(reset).toContain('border: 0')
    expect(reset).toContain('background: transparent')
    expect(reset).toContain('box-sizing: border-box')
    expect(reset).toContain('flex: none')
  });

  test('the Tip spans are pinned as non-flexing inline-flex items', async () => {
    const law = readFileSync(LAW, 'utf8')
    const spans = ruleBlock(law, '.camPill > span')
    expect(spans, '.camPill > span must exist (Tip renders a span anchor)').not.toBeNull()
    expect(spans).toContain('flex: none')
    expect(spans).toContain('display: inline-flex')
  });

  test('all four Button call sites seat size="sm" (never a bare md leak again)', async () => {
    const view = readFileSync(VIEW, 'utf8')
    const smSites = view.match(/<Button variant="ghost" size="sm"/g) ?? []
    const allSites = view.match(/<Button variant="ghost"/g) ?? []
    expect(allSites.length).toBe(4)
    expect(smSites.length).toBe(4)
    // the bundle order that lets the reset win its ties: the
    // primitives import precedes this module's own css import.
    expect(view.indexOf('from "@deepseek-ai/dsh-client-ui-primitives"')).toBeLessThan(
      view.indexOf('from "./component.module.css"'))
  });
});
