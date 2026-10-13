// chrome-capability.spec.ts — THE CAPABILITY DRAG PAIR (chrome.ts
// half 2): parseCapabilityDrop answers the resolved card or null (a
// foreign drag falls through to the asset/file path — never a
// throw), and isMalformedCapabilityDrop separates the corrupt drag
// (MIME present but unparseable — the consumer badges it) from the
// foreign one (MIME absent — silent). The L9 fallback audit's whole
// point: null once covered both worlds and the corrupt body died
// silent; these walls pin the split.
import { expect, test } from 'vitest'

import { isMalformedCapabilityDrop, parseCapabilityDrop } from '../src/chrome.ts'

test('parseCapabilityDrop: the absent payload is null (a foreign drag falls through, never throws)', () => {
  expect(parseCapabilityDrop('')).toBeNull()
})

test('parseCapabilityDrop: a resolved card rides through with its optional passengers', () => {
  expect(parseCapabilityDrop(JSON.stringify({ service: 'trellis2', title: 'Image to Mesh' })))
    .toEqual({ service: 'trellis2', title: 'Image to Mesh' })
  const full = { service: 'trellis2', title: 'Image to Mesh', params: { steps: 20 }, kind: 'mesh' }
  expect(parseCapabilityDrop(JSON.stringify(full))).toEqual(full)
})

test('parseCapabilityDrop: shape-wrong bodies are null (the asset/file path owns them)', () => {
  // each half of the service+title conjunction fails on its own arm —
  // the guard is the pair, never one field
  expect(parseCapabilityDrop(JSON.stringify({ title: 'No Service' }))).toBeNull()
  expect(parseCapabilityDrop(JSON.stringify({ service: 'trellis2' }))).toBeNull()
  expect(parseCapabilityDrop(JSON.stringify({ service: 7, title: 'Numeric Service' }))).toBeNull()
  expect(parseCapabilityDrop(JSON.stringify({ service: 'trellis2', title: 7 }))).toBeNull()
  // THE TYPEOF-ONLY LAW: the guard is a string-type conjunction, not
  // an emptiness check — empty strings still ride (the drop handler,
  // not the parser, owns emptiness)
  expect(parseCapabilityDrop(JSON.stringify({ service: '', title: '' }))).toEqual({ service: '', title: '' })
  // a JSON array is an object the guard must not honor
  expect(parseCapabilityDrop('[]')).toBeNull()
  expect(parseCapabilityDrop('null')).toBeNull()
})

test('parseCapabilityDrop: corrupt text is null (never a throw off a drop event)', () => {
  expect(parseCapabilityDrop('not-json{{{')).toBeNull()
  expect(parseCapabilityDrop('{"service":')).toBeNull()
})

test('isMalformedCapabilityDrop: the foreign drag stays silent (absent is not corrupt)', () => {
  expect(isMalformedCapabilityDrop('')).toBe(false)
})

test('isMalformedCapabilityDrop: a well-formed payload is not malformed (passengers do not taint it)', () => {
  expect(isMalformedCapabilityDrop(JSON.stringify({ service: 'trellis2', title: 'Image to Mesh' }))).toBe(false)
  expect(isMalformedCapabilityDrop(JSON.stringify({ service: 's', title: 't', params: {}, kind: 'x', extra: 1 }))).toBe(false)
})

test('isMalformedCapabilityDrop: a present-but-shape-wrong body badges true (the consumer must badge, never no-op)', () => {
  expect(isMalformedCapabilityDrop(JSON.stringify({ title: 'No Service' }))).toBe(true)
  expect(isMalformedCapabilityDrop(JSON.stringify({ service: 'trellis2' }))).toBe(true)
  expect(isMalformedCapabilityDrop(JSON.stringify({ service: 's', title: 7 }))).toBe(true)
  expect(isMalformedCapabilityDrop('[]')).toBe(true)
})

test('isMalformedCapabilityDrop: present-but-not-JSON badges true (the corrupt drag this boolean exists for)', () => {
  expect(isMalformedCapabilityDrop('not-json{{{')).toBe(true)
})
