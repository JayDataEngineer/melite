/** THE OPERATOR-COPY LAW (operator 2026-11-10, quoted with the
 *  expletive elided — the verbatim rides the burn receipt: "WHY
 *  DOES THIS [EXPLETIVE] EXIST ON THE H3 CARD — Frames (Layer B —
 *  the timeline's calls own it; a stated span derives it at
 *  compose) — WHY DOES LAYER A HAVE A BUGGY PART FROM LAYER B").
 *
 *  THE SEAM: schemastery's meta.description IS the card's field
 *  LABEL (card-base spec.ts — `label: meta['description']`), and
 *  extra.tooltip rides the hover (i). Both are OPERATOR-FACING
 *  copy: the estate's architecture vocabulary (Layer A/B/C, DECL,
 *  compose door, the walk, manage seat) never paints there. Code
 *  comments may speak it; the served face may not.
 *
 *  DEPTH: this wall reads the REAL paramSchema.toJSON() — the SAME
 *  envelope the estate serves as the card's spec — never a frozen
 *  census, so a vocabulary leak in any future field fires here the
 *  day it lands. */
import { describe, expect, it } from 'vitest'
import { paramSchema } from '../src/schema.ts'

/** Architecture vocabulary that never renders to the operator.
 *  Each entry is a settled estate idiom with an operator-language
 *  replacement; grow the list when a new leak class fires. */
const BANNED_IN_LABELS: Array<{ re: RegExp, word: string }> = [
  { re: /Layer [ABC]\b/, word: 'Layer A/B/C' },
  { re: /\bDECL\b/, word: 'DECL' },
  { re: /\bcompose door\b/, word: 'compose door' },
  { re: /\bthe walk\b/, word: 'the walk' },
  { re: /\bmanage seat\b/, word: 'manage seat' },
  { re: /\bestate\b/i, word: 'estate' },
]
const BANNED_IN_TOOLTIPS: Array<{ re: RegExp, word: string }> = [
  { re: /Layer [ABC]\b/, word: 'Layer A/B/C' },
  { re: /\bDECL\b/, word: 'DECL' },
  { re: /\bcompose door\b/, word: 'compose door' },
  { re: /\bestate-proven\b|\bthe estate\b/i, word: 'estate' },
]

interface SerializedNode {
  type?: string
  dict?: Record<string, number>
  meta?: Record<string, unknown>
  extra?: Record<string, unknown>
  refs?: Record<string, SerializedNode>
  items?: Array<{ ref?: number }>
  uid?: number
}

/** Walk the serialized schema's object nodes and yield every field
 *  seat (name + label source + tooltip) — the truth the spec
 *  exporter reads (spec.ts fieldsOf), walked at the source. */
function fieldSeats(json: SerializedNode): Array<{ name: string, label: string, tooltip: string }> {
  const out: Array<{ name: string, label: string, tooltip: string }> = []
  const seen = new Set<number>()
  const walk = (node: SerializedNode): void => {
    const dict = node.dict ?? {}
    for (const [name, ref] of Object.entries(dict)) {
      const child = json.refs?.[String(ref)]
      if (child === undefined) continue
      const meta = child.meta ?? {}
      const extra = child.extra ?? {}
      const label = typeof meta['description'] === 'string' ? meta['description'] : ''
      const tooltip = typeof extra['tooltip'] === 'string' ? extra['tooltip'] : ''
      out.push({ name, label, tooltip })
      // nested objects (call sub-schemas, array items) walk too
      if (child.refs !== undefined && !seen.has(ref)) {
        seen.add(ref)
        walk(child)
      }
    }
  }
  walk(json.refs?.[String(json.uid)] ?? {})
  return out
}

describe('the operator-copy law (no architecture vocabulary on the served face)', () => {
  it("every served field label speaks operator language — never the estate's internals", () => {
    const json = paramSchema.toJSON() as unknown as SerializedNode
    const seats = fieldSeats(json)
    expect(seats.length, 'the walk found the served fields (the envelope shape changed if 0)').toBeGreaterThan(0)
    const leaks = seats.flatMap((seat) =>
      BANNED_IN_LABELS
        .filter((b) => b.re.test(seat.label))
        .map((b) => `field '${seat.name}' label "${seat.label}" carries '${b.word}'`),
    )
    expect(leaks, `architecture vocabulary leaked onto the operator's card:\n${leaks.join('\n')}`).toEqual([])
  })

  it('every served tooltip speaks operator language — Layer/DECL archi-speak never rides the hover', () => {
    const json = paramSchema.toJSON() as unknown as SerializedNode
    const seats = fieldSeats(json)
    const leaks = seats.flatMap((seat) =>
      BANNED_IN_TOOLTIPS
        .filter((b) => b.re.test(seat.tooltip))
        .map((b) => `field '${seat.name}' tooltip "${seat.tooltip}" carries '${b.word}'`),
    )
    expect(leaks, `architecture vocabulary leaked into a hover tip:\n${leaks.join('\n')}`).toEqual([])
  })
})
