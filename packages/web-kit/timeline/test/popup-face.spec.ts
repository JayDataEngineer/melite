/**
 * popup-face.spec.ts — THE POPUP-FACE WALL (stroke 84, the
 * operator's fifth white-on-white report): a native <select> popup
 * is UA CHROME — no DSW token reliably paints it. The one law,
 * proven across every report since hour-24 stroke 13: the OPEN
 * popup pins `option { background: Canvas; color: CanvasText }` +
 * `color-scheme: light` on the select — system colors that follow
 * the pinned scheme, deterministic on every theme. The closed
 * select keeps the card's own inherited face.
 *
 * WHY A SWEEP: each earlier fix patched the site the operator had
 * just hit (specSelect ×2, h3 recipe, ideogram fields) while new
 * sites shipped without the law (.modSelect — the lora picker —
 * drillLlm, the ideogram aspect select, the deck manager select),
 * and a tokenification pass rewrote the working rules to
 * var(--dsw-alias-*) — re-minting white-on-white on the dark theme.
 * This wall reads EVERY css module under the guarded roots:
 *   1. every `option` rule paints Canvas/CanvasText (the var()
 *      regression and hex literals both refuse),
 *   2. every file that styles a select outside a :where() reset
 *      carries the law (color-scheme: light + an option rule) —
 *      a new select site without the law fails the wall at CI.
 * `:where(input, textarea, select, button)` resets style no popup
 * face and are exempt.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const here = import.meta.dirname

/** The guarded roots: every package whose css modules style selects. */
const ROOTS = [
  join(here, '../../../web'),
  join(here, '../../../video'),
  join(here, '../../../image'),
  join(here, '../../'), // web-kit itself
]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (name.endsWith('.module.css')) out.push(full)
  }
  return out
}

const cssModules = ROOTS.flatMap((root) => walk(root))

/** css with block comments stripped — prose is not a rule. */
function bare(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Selector groups that STYLE a select's own face (the popup law
 * applies). `:where(...)` multi-control resets style no popup;
 * `user-select` and prose comments are not <select> styles. */
function stylesSelect(css: string): boolean {
  for (const rule of bare(css).split('}')) {
    const head = rule.slice(0, rule.indexOf('{'))
    // (?<!-)select — `user-select` is a property, not the element
    if (!/(?<![-a-z])select/.test(head)) continue
    if (head.includes(':where(')) continue
    if (head.trim() === '') continue
    return true
  }
  return false
}

const OPTION_DECL = /(?<![-a-z])option[^{]*\{[^}]*\}/g

test('every option rule paints Canvas/CanvasText (no token, no literal)', () => {
  // non-vacuity floor: the guarded roots carry 9+ css modules today
  // (this sweep already caught real offenders at 15; the count fell
  // 11 → 9 when ideogram4 retired with its card, 2026-09-17)
  expect(cssModules.length).toBeGreaterThan(8)
  const offenders: string[] = []
  for (const file of cssModules) {
    const css = bare(readFileSync(file, 'utf8'))
    const rules = css.match(OPTION_DECL) ?? []
    for (const rule of rules) {
      if (!rule.includes('background: Canvas') || !rule.includes('color: CanvasText')) {
        offenders.push(`${file}: ${rule.replace(/\s+/g, ' ').slice(0, 80)}`)
      }
    }
  }
  expect(offenders, `option rules off the law:\n${offenders.join('\n')}`).toEqual([])
})

test('every select-styling css module carries the popup law', () => {
  const offenders: string[] = []
  for (const file of cssModules) {
    const css = bare(readFileSync(file, 'utf8'))
    if (!stylesSelect(css)) continue
    if (!css.includes('color-scheme: light')) {
      offenders.push(`${file}: styles a select but pins no color-scheme: light`)
    }
    if (!(css.match(OPTION_DECL) ?? []).some((r) => r.includes('background: Canvas'))) {
      offenders.push(`${file}: styles a select but no Canvas option rule`)
    }
  }
  expect(offenders, `select sites missing the law:\n${offenders.join('\n')}`).toEqual([])
})
