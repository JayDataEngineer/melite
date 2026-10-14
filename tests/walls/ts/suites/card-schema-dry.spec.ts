/**
 * card-schema-dry.spec.ts — THE SCHEMA-PLANE DRY LAW (the card-ui
 * audit, 2026-11-02): the schema declaration fragments cards
 * hand-copied — the `schemaFn` cast (14 copies), seed-row bags
 * (8 copies), the prompt-pair bags (2 copies), the input-image slot
 * (3 spellings) — live in `@melite/comfyui-card-kit` now
 * (callableSchema in admission, seedExtra/promptPairExtra/
 * inputImageExtra in fields), spelled once. A card that hand-rolls
 * any of them again reds here.
 *
 * Census axes (all rosters DERIVED from the cards' own sources —
 * no hand-maintained card list):
 * 1. THE CAST: no card.ts carries the inline
 *    `as unknown as (v: unknown)` callable-face cast; the kit seat
 *    exists and behaves (identity probe).
 * 2. THE PROMPT ROSTER: every card.ts declaring `negative_prompt:`
 *    routes its bags through promptPairExtra(.
 * 3. THE SEED ROSTER: every card.ts declaring a `seed:` schema key
 *    routes its bag through seedExtra(.
 * 4. THE INPUT ROSTER: every card.ts declaring an UNSCOPED
 *    `input_image:` schema key (no `families:` scope on the line —
 *    img-to-mesh's square-crop lane is a different concept and keeps
 *    its own declaration) routes its bag through inputImageExtra(
 *    AND spells the canonical label 'Input image'.
 * 5. THE ARMS FIRE: each roster predicate reds a synthetic negative
 *    (pure functions, no tree mtimes) — a wall that cannot red is a
 *    log line.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { callableSchema } from '@melite/comfyui-card-kit/admission'

const ROOT = join(import.meta.dirname, '..', '..', '..', '..')
const PKG = join(ROOT, 'packages')

interface CardFile { path: string; rel: string; text: string }

/** Every card declaration: each package's src/card.ts. */
function cardFiles(): CardFile[] {
  const out: CardFile[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) {
        if (name === 'lib' || name === 'node_modules' || name === 'mods' || name === 'dist') continue
        walk(full)
        continue
      }
      if (name !== 'card.ts') continue
      out.push({ path: full, rel: full.slice(PKG.length + 1), text: readFileSync(full, 'utf8') })
    }
  }
  walk(PKG)
  return out.sort((a, b) => (a.rel < b.rel ? -1 : 1))
}

/** Files whose schema declares a negative-prompt row. */
function promptCards(cards: CardFile[]): CardFile[] {
  return cards.filter((f) => f.text.includes('negative_prompt:'))
}

/** Files whose schema declares a seed row (a `seed:` schema key). */
function seedCards(cards: CardFile[]): CardFile[] {
  return cards.filter((f) => /^\s*seed:/m.test(f.text))
}

/** Files whose schema declares an UNSCOPED input-image slot: an
 *  `input_image:` zod-declaration line (a `z.` chain — the actions'
 *  `inputs:` maps name the same key and are not declarations)
 *  without a `families:` scope. A scoped slot (img-to-mesh's
 *  square-crop lane) is a different concept and keeps its own
 *  declaration. */
function unscopedInputCards(cards: CardFile[]): CardFile[] {
  return cards.filter((f) =>
    f.text
      .split('\n')
      .some((line) => line.includes('input_image:') && line.includes('z.') && !line.includes('families:')),
  )
}

describe('THE SCHEMA-PLANE DRY LAW', () => {
  it('no card.ts carries the inline callable-face cast (the kit owns the one baseline)', () => {
    const offenders = cardFiles()
      .filter((f) => f.text.includes('as unknown as (v: unknown)'))
      .map((f) => f.rel)
    expect(offenders).toEqual([])
  })

  it('the kit seat exists and behaves (callableSchema is the identity face)', () => {
    expect(typeof callableSchema).toBe('function')
    const probe = { resolve: () => ({}) }
    expect(callableSchema(probe as never)).toBe(probe)
  })

  it('every negative-prompt card routes its bags through promptPairExtra', () => {
    const cards = cardFiles()
    const roster = promptCards(cards).map((f) => f.rel)
    expect(roster.length).toBeGreaterThan(0)
    const offenders = promptCards(cards)
      .filter((f) => !f.text.includes('promptPairExtra('))
      .map((f) => f.rel)
    expect(offenders).toEqual([])
  })

  it('every seed card routes its bag through seedExtra', () => {
    const cards = cardFiles()
    const roster = seedCards(cards).map((f) => f.rel)
    expect(roster.length).toBeGreaterThan(0)
    const offenders = seedCards(cards)
      .filter((f) => !f.text.includes('seedExtra('))
      .map((f) => f.rel)
    expect(offenders).toEqual([])
  })

  it('every unscoped input-image slot routes its bag through inputImageExtra with the canonical label', () => {
    const cards = cardFiles()
    const roster = unscopedInputCards(cards).map((f) => f.rel)
    expect(roster.length).toBeGreaterThan(0)
    const helperOffenders = unscopedInputCards(cards)
      .filter((f) => !f.text.includes('inputImageExtra('))
      .map((f) => f.rel)
    expect(helperOffenders).toEqual([])
    const labelOffenders = unscopedInputCards(cards)
      .filter((f) => !f.text.includes("description('Input image')") && !f.text.includes('description("Input image")'))
      .map((f) => f.rel)
    expect(labelOffenders).toEqual([])
  })

  it('the arms FIRE (each roster predicate reds a synthetic negative)', () => {
    const negPrompt = [{ rel: 'x/card.ts', text: 'negative_prompt: z.string()' } as CardFile]
    expect(promptCards(negPrompt).length).toBe(1)
    expect(negPrompt.filter((f) => !f.text.includes('promptPairExtra(')).length).toBe(1)
    const seed = [{ rel: 'x/card.ts', text: '  seed: z.number()' } as CardFile]
    expect(seedCards(seed).length).toBe(1)
    expect(seed.filter((f) => !f.text.includes('seedExtra(')).length).toBe(1)
    const scoped = [{ rel: 'x/card.ts', text: "  input_image: z.string(), families: ['a']" } as CardFile]
    expect(unscopedInputCards(scoped).length).toBe(0)
    // the actions' inputs: map names the key without a zod chain —
    // not a declaration, never in the roster
    const inputsMap = [{ rel: 'x/card.ts', text: "      inputs: { input_image: 'image' }," } as CardFile]
    expect(unscopedInputCards(inputsMap).length).toBe(0)
    const unscoped = [{ rel: 'x/card.ts', text: '  input_image: z.string()' } as CardFile]
    expect(unscopedInputCards(unscoped).length).toBe(1)
    expect(unscoped.filter((f) => !f.text.includes('inputImageExtra(')).length).toBe(1)
  })
})
