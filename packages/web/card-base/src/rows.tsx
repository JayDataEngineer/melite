/** rows.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react'
import { type SpecField } from './spec.ts'
import css from './card.module.css'
import { type SquareHost } from './square-provider.tsx'
import { SpecAtom } from './atoms.tsx'

/** THE SEED DICE (stroke 39 — the operator's QOL law): the seed
 *  knob carries the RANDOM sentinel -1 (GATE S: -1 mints a fresh
 *  seed in the lane, EVERY run). The dice sits at the key line's
 *  right end, across from the field's name: FILLED pips = random
 *  (a new seed every run), HOLLOW pips = fixed (this exact seed
 *  re-runs). The state DERIVES from the resolved value alone — no
 *  hidden mode to drift; the click writes the value: fixed → -1
 *  (random), random → a minted concrete int (the kit's own mint
 *  law, Math.floor(random * 2147483647)). Typing a number while
 *  random fixes it — the dice unfills by derivation, one source
 *  of truth. The input never paints the sentinel: random shows
 *  the placeholder, never "-1". */
export function SeedDice({ random, onToggle }: { random: boolean; onToggle(): void }): ReturnType<typeof h> {
  return h('button', {
    type: 'button',
    className: css.specDice + (random ? ' ' + css.specDiceOn : ''),
    'data-seed-dice': random ? 'random' : 'fixed',
    'aria-pressed': random,
    'aria-label': 'seed dice',
    title: random
      ? 'Random — a new seed every run. Click to fix one.'
      : 'Fixed seed — this exact seed re-runs. Click for a new one every run.',
    onClick: onToggle,
  },
    h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': 'true' },
      h('rect', { x: 1.4, y: 1.4, width: 13.2, height: 13.2, rx: 3.2, stroke: 'currentColor', strokeWidth: 1.3 }),
      // the 5-pip face: 4 corners + center — filled when random,
      // hollow when fixed (one glyph, the pip fill IS the state)
      h('circle', { cx: 5, cy: 5, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
      h('circle', { cx: 11, cy: 5, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
      h('circle', { cx: 8, cy: 8, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
      h('circle', { cx: 5, cy: 11, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
      h('circle', { cx: 11, cy: 11, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }),
    ))
}

export function SpecFieldRow({ f, value, onEdit, square, wireCandidates }: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
  wireCandidates?: Array<{ id: string; label: string; url: string }>
}): ReturnType<typeof h> {
  // the row is a DIV, not a wrapper label: the atoms self-label
  // (aria-label) — a button inside a <label> steals the label
  // association (interactive-in-label is the discouraged shape
  // anyway; the reset chips retired hour-26 — the unset path is the
  // tri-state's native undefined, no chrome needed)
  const seedKnob = f.name === 'seed'
  const seedRandom = seedKnob && (value === -1 || value === '-1')
  return h('div', { className: css.specField },
    seedKnob
      // THE DICE SEAT (stroke 39): the key line becomes a header —
      // name left, dice right, per the operator's placement law
      // ("a dice icon to the top right, across from Seed")
      ? h('div', { className: css.specFieldHead },
          h('span', { className: css.specFieldKey },
            f.label,
            f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
          ),
          h(SeedDice, {
            random: seedRandom,
            onToggle: () => {
              if (seedRandom) {
                // random → fixed: mint NOW (the kit's mint law) so
                // the visual shows the exact seed that will run
                onEdit(f.name, Math.floor(Math.random() * 2147483647))
              } else {
                // fixed → random: the sentinel — the lane mints
                // every run (GATE S)
                onEdit(f.name, -1)
              }
            },
          }),
        )
      : h('span', { className: css.specFieldKey },
          f.label,
          f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
        ),
    h(SpecAtom, {
      f,
      // THE SENTINEL NEVER PAINTS: random shows the placeholder,
      // never "-1" (the dice carries the state's face)
      value: seedRandom ? undefined : value,
      ...(seedRandom ? { placeholder: 'random — new every run' } : {}),
      onEdit, square, ...(wireCandidates !== undefined ? { wireCandidates } : {}),
    }),
    f.tooltip !== undefined && f.tooltip !== '' ? h('span', { className: css.specHint }, f.tooltip) : null,
  )
}
