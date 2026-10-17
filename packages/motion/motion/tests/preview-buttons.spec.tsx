// @vitest-environment happy-dom
/**
 * preview-buttons.spec.tsx — THE PREVIEW-PANE BUTTONS, DSH-NATIVE
 * (operator volley 2026-10-24 + the motion-params audit F5). The
 * volley's cure was hand CSS (size="sm" + a module reset + per-button
 * idle skins); the audit's cure REPLACED it: the four top-right
 * buttons now ride the DSH Button primitives' own faces — icon verbs
 * ghost, the pressed framing primary, the idle framing outline, all
 * size="sm" — and the module css pins layout only (.camPill row
 * geometry, the divider, the Tip spans). The hand skin families
 * (.camBtn/.frameBtn/.frameBtnIdle/.frameBtnActive + the reset) died;
 * the rail-seat census's skin-scan arm names any that grows back.
 *
 * THE WALL (law: every fix lands with an arm that reds on toggle):
 *  1. FOUR BUTTONS, THE PRIMITIVE'S OWN sm BOX — by aria-label, each
 *     riding the sm size class with computed height 28px and the sm
 *     padding 10px — the primitives' box wins, no module reset fights
 *     it (the old ghost/md leak law, now judged as "the sm face IS
 *     the box", never "a reset fixed the leak").
 *  2. IDLE vs ACTIVE DISTINCT — the pressed framing rides the primary
 *     variant face, the other the outline face, and a press flips
 *     both (aria-pressed stays the a11y truth).
 *  3. NO SINGLE FACE — the container is layout-only (computed
 *     border-width 0, transparent; the file plane carries no face
 *     declarations), and the module css carries NO button-skin class
 *     at all (the census vocabulary, judged here on the pill's file).
 *  4. THE SOURCE CONTRACT — all four MotionStageView call sites seat
 *     size="sm" with a variant from the DSH set and carry no s.*
 *     skin class; the primitives import precedes the module css
 *     import (the bundle order that keeps the primitives' faces
 *     authoritative).
 *
 * happy-dom HAS no layout engine, so the wall mounts the cascade the
 * way it always has: the DSH Button base sheet injects FIRST and this
 * module's sheet SECOND (the bundle's own order — pinned in arm 4),
 * both rewritten onto the runtime hashed classes via the module
 * mapping the component itself uses. Geometry (height/padding) IS
 * computed; color faces are judged on class bindings (arm 2) and the
 * file plane (arms 3-4) — happy-dom drops color-mix().
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

/** THE SKIN VOCABULARY (the motion-params audit's hand-skin inventory):
 *  the class families the variant map killed. A re-plant reds. */
const SKIN_VOCABULARY = /(?:^|[^a-zA-Z])(railBtn|stampBtn|reposeBtn|bgBtnIdle|camBtn|frameBtn)/

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

/** Every class selector the module css defines — the derived roster
 *  the skin arms judge. Comments are stripped first: prose naming
 *  the dead families never counts (only rules can bind a class). */
function cssClassRoster(law: string): string[] {
  const bare = law.replace(/\/\*[\s\S]*?\*\//g, '')
  const names: string[] = []
  for (const m of bare.matchAll(/\.([a-zA-Z][\w-]*)\s*[,{]/g)) names.push(m[1]!)
  return names
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
  const primary = cls.find((c) => /_primary_/.test(c) || c === 'primary')!
  const ghost = pillButton('Rotate view left (45°)').className.split(/\s+/)
    .find((c) => /_ghost_/.test(c) || c === 'ghost')!
  const outline = pillButton('Upper half framing').className.split(/\s+/)
    .find((c) => /_outline_/.test(c) || c === 'outline')!
  const req = createRequire(import.meta.url)
  const pkgDir = dirname(req.resolve('@deepseek-ai/dsh-client-ui-primitives/package.json'))
  const dsh = readFileSync(join(pkgDir, 'lib/Button.module.css'), 'utf8')
    .split('.button').join('.' + btn)
    .split('.sm').join('.' + sm)
    .split('.primary').join('.' + primary)
    .split('.ghost').join('.' + ghost)
    .split('.outline').join('.' + outline)
  const m = s as unknown as Record<string, string>
  const own = readFileSync(LAW, 'utf8')
    .split('.camPill').join('.' + m.camPill)
    .split('.camDivider').join('.' + m.camDivider)
  const els = [dsh, own].map((text) => {
    const el = document.createElement('style')
    el.textContent = text
    document.head.appendChild(el)
    return el
  })
  return { dispose: (): void => els.forEach((el) => el.remove()) }
}

describe('the four pill buttons ride the primitive\u2019s own sm box (no module reset)', () => {
  test('by aria-label: sm size class, computed 28px height + the sm padding', async () => {
    const { dispose } = await mountedWithCascade()
    try {
      for (const name of LABELS) {
        const b = pillButton(name)
        // size="sm" reaches the runtime (the DSH size class is bound).
        expect(b.className).toMatch(/_sm_/);
        // the primitive's own box: the injected DSH base keeps the md
        // leak live (36px / 0 14px), so these computed values judge
        // the sm class — 28px tall, the 0 10px padding — with NO
        // module reset opposing it. The old cure zeroed the padding
        // by hand; the audit's cure deleted the need.
        const cs = getComputedStyle(b)
        expect(cs.height).toBe('28px')
        expect(cs.padding).toBe('0px 10px')
        expect(cs.boxSizing).toBe('border-box')
        // no hand skin class rides any pill button.
        expect(SKIN_VOCABULARY.test(b.className), `${name} carries a hand skin class: ${b.className}`).toBe(false)
      }
    } finally {
      dispose()
    }
  });
});

describe('idle vs active faces are the variants\u2019 own (never one gray read)', () => {
  test('the pressed framing rides primary; the idle framing outline; a press flips both', async () => {
    const { dispose } = await mountedWithCascade()
    try {
      const full = pillButton('Full body framing')
      const upper = pillButton('Upper half framing')
      expect(full.getAttribute('aria-pressed')).toBe('true')
      expect(upper.getAttribute('aria-pressed')).toBe('false')
      expect(full.className).toMatch(/_primary_/)
      expect(upper.className).toMatch(/_outline_/)
      expect(upper.className).not.toMatch(/_primary_/)
      fireEvent.click(upper)
      await vi.waitFor(() => {
        if (upper.getAttribute('aria-pressed') !== 'true') throw new Error('upper not pressed yet')
      }, { timeout: 10000 })
      expect(upper.className).toMatch(/_primary_/)
      expect(full.className).toMatch(/_outline_/)
      // the rotate arrows stay the ghost icon verbs.
      expect(pillButton('Rotate view left (45°)').className).toMatch(/_ghost_/)
      expect(pillButton('Rotate view right (45°)').className).toMatch(/_ghost_/)
    } finally {
      dispose()
    }
  });
});

describe('the pill is not a single face (layout-only container)', () => {
  test('borderless transparent container; no button-skin class exists in the module', async () => {
    const { dispose } = await mountedWithCascade()
    try {
      const pill = pillButton('Full body framing').closest('div[class*="camPill"]') as HTMLElement
      expect(pill).not.toBeNull()
      // all four buttons live in the one container (the layout), but
      // the container itself voices nothing — computed (the layout-only
      // rule sets no border/background) and on the file plane.
      for (const name of LABELS) expect(pill.contains(pillButton(name))).toBe(true)
      // the container voices nothing — judged on the FILE plane (the
      // old arm's own discipline: happy-dom has no cascade engine,
      // so a missing face is judged where it is written, the rule).
      const law = readFileSync(LAW, 'utf8')
      const container = ruleBlock(law, '.camPill')
      expect(container).not.toBeNull()
      expect(container).not.toContain('border')
      expect(container).not.toContain('background')
      expect(container).not.toContain('1px solid')
      // THE SKIN ROSTER IS EMPTY: no rule for any dead skin family
      // exists in the module — the variant map replaced them all.
      const roster = cssClassRoster(law).filter((name) => SKIN_VOCABULARY.test(name))
      expect(roster, `hand skin rules grew back: ${roster.join(', ')} — the DSH variants own the faces (the motion-params audit F5)`).toEqual([])
    } finally {
      dispose()
    }
  });
});

describe('the source contract — variant seats at every pill call site', () => {
  test('all four call sites seat size="sm" + a DSH variant, no skin class; bundle order pinned', () => {
    const view = readFileSync(VIEW, 'utf8')
    const sites = view.match(/<Button variant=\{?[^>]*size="sm"/g) ?? []
    expect(sites.length).toBe(4)
    for (const site of sites) {
      // every site names at least one DSH variant family — a static
      // variant or the pressed ternary (both names present).
      expect(site).toMatch(/"(?:primary|outline|ghost|toolbar)"/)
      expect(SKIN_VOCABULARY.test(site), `a pill call site still carries a hand skin: ${site.split('\n')[0]}`).toBe(false)
    }
    // the bundle order that keeps the primitives' faces authoritative:
    // the primitives import precedes this module's own css import.
    expect(view.indexOf('from "@deepseek-ai/dsh-client-ui-primitives"')).toBeLessThan(
      view.indexOf('from "./component.module.css"'))
  });
});
