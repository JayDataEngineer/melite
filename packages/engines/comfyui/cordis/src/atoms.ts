// Schemastery atoms — the card knob vocabulary (Tier 3's Schema
// pieces). Mirrors the estate's python knob kinds (Text/Textarea/
// Number/Slider/Seed/Select/Boolean); every atom carries the wire
// metadata the card surface serves (label, group, order, tooltip).
import z from '@deepseek-ai/schemastery'

type Meta = { label?: string; group?: string; order?: number; tooltip?: string }

const atom = <T>(schema: T, meta: Meta): T => Object.assign(schema, { meta })

export const Text = (meta: Meta = {}) => atom(z.string(), meta)
export const Textarea = (meta: Meta = {}) => atom(z.string(), meta)
export const Number = (meta: Meta = {}) => atom(z.number(), meta)
export const Seed = (meta: Meta = {}) => atom(z.number().default(42), meta)
export const Slider = (meta: Meta = {}) => atom(z.number(), meta)
export const Select = <O extends string>(options: O[], meta: Meta = {}) =>
  atom(z.union(options.map((o) => z.const(o))), meta)
export const Boolean = (meta: Meta = {}) => atom(z.boolean(), meta)

export { z }
