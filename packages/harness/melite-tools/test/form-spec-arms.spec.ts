// form-spec-arms.spec.ts — the form-spec door's malformed-input arms.
// Every doc the door serves is `unknown` on the wire (the engine
// plane's serialization), so the served contract is a predicate, not
// a type. These walls drive the ENGINE arm through its own injection
// seam with docs the predicate must refuse: a doc with no form name, a
// doc whose schema is not an envelope, and an envelope whose refs are
// not an object. The door's law is that a malformed doc REFUSES BY
// NAME — never a served contract that is a lie.
import { describe, expect, test } from 'vitest'
import { formSpecArm } from '../src/discovery.ts'

const envelope = (refs: unknown): Record<string, unknown> => ({ uid: 1, refs })

describe('the engine form-doc arm (the injection seam)', () => {
  test('a well-formed engine doc is served verbatim', async () => {
    const doc = { form: 'engine', schema: envelope({ 1: { dict: {} } }) }
    const engineDocs = new Map([['agent', () => doc]])
    const got = await formSpecArm('agent', engineDocs)
    expect(got).toEqual(doc)
  })

  test('a doc with NO form name refuses, naming the model', async () => {
    const engineDocs = new Map([['agent', () => ({ schema: envelope({}) })]])
    await expect(formSpecArm('agent', engineDocs)).rejects.toThrow(
      /engine 'agent' built a form doc without a form name/,
    )
  })

  test('a doc whose schema is not an envelope refuses by the same voice', async () => {
    // the array arm and the primitive arm of the same predicate: a
    // serialized envelope is never an array, and never a bare value
    for (const schema of [[{ uid: 1 }], 'envelope', 7]) {
      const engineDocs = new Map([['agent', () => ({ form: 'engine', schema })]])
      await expect(formSpecArm('agent', engineDocs)).rejects.toThrow(
        /malformed schema envelope/,
      )
    }
  })

  test('an envelope whose refs are an array is not an envelope', async () => {
    const engineDocs = new Map([['agent', () => ({
      form: 'engine',
      schema: { uid: 1, refs: [{ dict: {} }] },
    })]])
    await expect(formSpecArm('agent', engineDocs)).rejects.toThrow(
      /malformed schema envelope/,
    )
  })

  test('an engine whose factory builds nothing refuses (never a served empty doc)', async () => {
    const engineDocs = new Map<string, () => Record<string, unknown>>([
      ['agent', () => ({})],
    ])
    await expect(formSpecArm('agent', engineDocs)).rejects.toThrow(
      /without a form name/,
    )
  })
})
