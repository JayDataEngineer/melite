// form-spec-census-arms.spec.ts — THE CENSUS ARM SPLIT (2026-10-13):
// /v1/form-spec must tell an unbooted models table from an unknown
// name. The door serves several censuses (engine id → card alias →
// model family → mcp server); each arm answers its OWN absence, and
// only the model-family arm may speak the table's voice.
//
// THE ORDER LAW: the unbooted pins run FIRST — nothing in this file
// may boot the models table before them (loadCardDefs boots the CARD
// plane only; the models table boots solely on cascadeInit below).
// Do not reorder these tests.
import { describe, expect, test } from 'vitest'
import { boardedMap, formSpecArm, resolveSpecKey } from '../src/discovery.ts'
import { cascadeInit, loadCardDefs } from '@melite/comfyui-cordis'

describe('the form-spec census arms — unbooted table (pinned first: nothing has booted the models seat)', () => {
  test('a model-family name on an unbooted table throws the TABLE\'s own refusal — never a 404 null', async () => {
    const defs = await loadCardDefs()
    expect(() => resolveSpecKey('krea-2', defs, boardedMap(defs))).toThrow(/models service not booted/)
    // and the arm itself rides the seat's throw verbatim to the door
    await expect(formSpecArm('krea-2')).rejects.toThrow(/models service not booted/)
  })

  test('an mcp server census key on an unbooted table is the CENSUS\'s 404 — never the table\'s voice', async () => {
    // the roadmap's own pair: a bare 'mcp' and a named server
    expect(await formSpecArm('mcp')).toBeNull()
    expect(await formSpecArm('mcp:blender')).toBeNull()
  })

  test('a card-id alias key needs NO table — the card arm answers its own', async () => {
    // loadCardDefs is enough for the alias arm; the family
    // discriminator (isFamilyKey) swallows the unbooted throw by
    // design: the card plane never asks the models seat.
    const defs = await loadCardDefs()
    const cardIds = [...defs.keys()]
    expect(cardIds.length).toBeGreaterThan(0)
    const res = resolveSpecKey(cardIds[0]!, defs, boardedMap(defs))
    expect(res?.card).toBe(cardIds[0])
  })
})

describe('the form-spec census arms — booted table', () => {
  test('a booted table resolves the family arm (the boot, once, HERE)', async () => {
    await cascadeInit()
    const defs = await loadCardDefs()
    const res = resolveSpecKey('krea-2', defs, boardedMap(defs))
    expect(res).not.toBeNull()
    expect(res?.service).toBe('krea-2')
  })

  test('a booted table\'s unknown name is the arm\'s own 404 null', async () => {
    const defs = await loadCardDefs()
    expect(resolveSpecKey('not-a-model', defs, boardedMap(defs))).toBeNull()
    await expect(formSpecArm('not-a-model')).resolves.toBeNull()
  })
})
