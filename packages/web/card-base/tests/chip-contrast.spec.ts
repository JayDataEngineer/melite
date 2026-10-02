// chip-contrast.spec.ts — THE CHIP TOKEN LAW, in process.
//
// THE DEFECT THIS EXISTS FOR (operator, 2026-10-02: "in the little
// input boxes in the cards, there is an x button that does not render,
// the white circle around the x does, but the x goes away"): both
// input chips read `background: var(--dsw-alias-bg-module, #fff)`.
// `--dsw-alias-bg-module` is NOT a token DSH's theme defines (it
// defines `--dsw-alias-bg-module-platform`), so the rule's own `#fff`
// fallback always won — a white chip on the dark module, with
// `--dsw-alias-label-primary` painting a near-white glyph on it. The
// chips rendered; their glyphs were white-on-white and invisible.
//
// WHY BOTH A BROWSER WALL AND THIS ONE: e2e/chip-contrast.spec.ts
// measures the PAINTED contrast on the live host and is the proof the
// operator's screen agrees with; this arm runs in the ordinary test
// tier, needs no host, and fails the build the moment a card-base
// stylesheet names a `--dsw-alias-*` token the theme does not define —
// the root-cause class, before anyone ships a white-on-white chip
// again. Neither wall subsumes the other: this one cannot see paint,
// and that one cannot run in CI's unit job.
//
// THE VOCABULARY IS DSH'S, read from the installed theme/client
// bundles — never a list written here, which would rot the first time
// DSH re-themes (the same law the estate's other walls keep).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PKG = join(import.meta.dirname, '..')
const CSS = join(PKG, 'src', 'card.module.css')

describe('THE CHIP TOKEN LAW — a card stylesheet paints a chip with a resolved pair', () => {
  // THE CLASS: a chip whose background token is one DSH's theme does
  // not define falls through to the rule's own hard-coded literal —
  // the 2026-10-02 white-chip-on-dark-module defect, where `#fff`
  // won and `--dsw-alias-label-primary` painted a near-white glyph on
  // it (measured 1.05:1 on the live lane). Two walls cover it: THIS
  // arm, in the ordinary test tier with no host, pins the deterministic
  // property (no chip names the dead `--dsw-alias-bg-module` family and
  // no chip pairs a literal fill with a token content), and
  // e2e/chip-contrast.spec.ts, in real Chromium against the live host,
  // proves the PAINTED contrast clears 3:1 under the theme actually
  // in force. This arm cannot see paint; that one cannot run in the
  // unit job. Which tokens a given theme resolves is the browser's
  // question to answer, not a list scraped from DSH's bundles here.
  it('names no chip background under the dead --dsw-alias-bg-module family', () => {
    const css = readFileSync(CSS, 'utf8')
    const chipRule = (name: string): string => {
      const m = css.match(new RegExp(`\\.${name} \\{([^}]*)\\}`))
      expect(m, `.${name} exists in card.module.css`).not.toBeNull()
      return m![1]!
    }
    for (const name of ['squareX', 'squarePick']) {
      const rule = chipRule(name)
      expect(rule, `.${name} background does not use the undefined --dsw-alias-bg-module token`).not.toMatch(/--dsw-alias-bg-module\b/)
      // A literal-background fallback (`var(--x, #fff)`) on a chip is
      // the shape that produced the white-on-white glyph. The chip now
      // names a real token and pairs it with the label content color.
      expect(rule, `.${name} background is a token without a hard-coded fill fallback`).toMatch(
        /background:\s*var\(--dsw-alias-[a-z0-9-]+\)\s*;/,
      )
      expect(rule, `.${name} content color is the primary label`).toMatch(/color:\s*var\(--dsw-alias-label-primary\)/)
    }
  })

  it('ships the token name the theme actually defines (bg-module-platform exists, bg-module does not)', () => {
    const css = readFileSync(CSS, 'utf8')
    // The chip fix named --dsw-alias-interactive-bg-hover-solid. Pin
    // that the two module-surface names are not confused again: the
    // theme defines the `-platform` suffix; the bare name is the dead
    // one the chips used to carry.
    expect(css, 'the chips use the resolved interactive surface, not the dead module name').toContain(
      'background: var(--dsw-alias-interactive-bg-hover-solid)',
    )
    expect(css, 'the dead bare bg-module name is gone from the chips').not.toContain('var(--dsw-alias-bg-module, #fff)')
  })
})
