import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchFormSpec } from '../../../packages/web/card-base/src/wire.ts'
import { fieldsOfEnvelope } from '../../../packages/web/card-base/src/spec.ts'
import { loadCardDefs } from '../../../packages/engines/comfyui-cordis/src/cardDefs.ts'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('form-spec read (keyless replay)', () => {
  it('reads a recorded form-spec envelope through the REAL wire judgment and projects it', async () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.equal(manifest.recordingPolicy, 'replay')
    const parent = selectGeneration(here)
    assert.equal(String(parent.rows[0]?.format), manifest.headerClass)
    assert.equal(parent.rows[1]?.text, 'Open the image-edit card and show me its form — I want to see every knob it exposes.')

    // The recorded door payload: a byte copy of the welded fixture
    // (packages/web/melite-card-view/tests/fixtures/image-edit-spec.json)
    // — the emission's committed shape evidence, served same-origin.
    const doc = JSON.parse(readFileSync(join(here, 'form-spec.doc.json'), 'utf8')) as Record<string, unknown>

    // Drive the REAL fetchFormSpec: v1Get transport + assertFormSpecDoc
    // (envelope shape, uid/refs, wtype membership over schema AND every
    // mod schema). The recorded payload must clear every judgment.
    const served: string[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      served.push(url)
      assert.equal(url, '/v1/form-spec?model=image-edit', 'the read hits exactly the form-spec door for the asked family')
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    let spec: Awaited<ReturnType<typeof fetchFormSpec>>
    try {
      spec = await fetchFormSpec('image-edit')
    } finally {
      globalThis.fetch = realFetch
    }
    assert.deepEqual(served, ['/v1/form-spec?model=image-edit'])

    // The envelope's own census — exact, from the recorded doc.
    assert.equal(spec.schema.uid, 3385)
    assert.equal(Object.keys(spec.schema.refs).length, 74)
    assert.equal(Object.keys(spec.variants).length, 7)
    assert.deepEqual(Object.keys(spec.mod_schemas), ['mask'])

    // THE PROJECTION (B3's law rides the snapshot tier): every dict id
    // in the recorded envelope resolves — the walk projects, never a
    // hole, never the refusal.
    const fields = fieldsOfEnvelope(spec.schema)
    assert.equal(fields.length, 12)

    // The refusal is pinned from the recorded shape itself: one dangling
    // dict id (a ref the table does not carry) refuses the whole form.
    const corrupt = JSON.parse(JSON.stringify(spec.schema)) as typeof spec.schema
    const firstDict = Object.values(corrupt.refs).find(
      (node) => typeof node === 'object' && node !== null && 'dict' in node,
    ) as { dict: Record<string, number> }
    firstDict.dict['ghost'] = 9999
    assert.throws(
      () => fieldsOfEnvelope(corrupt),
      /form-spec: field "ghost" points at ref 9999 the envelope's refs table does not carry/,
      'the dangling-ref refusal fires in the snapshot tier (B3)',
    )
  })

  it('composes the card defs the form-spec names (loadCardDefs)', async () => {
    // The other half of the unpoliced plane: the card-def compose the
    // catalog surfaces read. No network — the boot walks the committed
    // packages; the identity rung is asserted for every card by the
    // loader itself (cardDefs.ts:240).
    const defs = await loadCardDefs()
    // Exact: the compose seats 15 cards today — a card landing or
    // leaving MOVES this number and is argued here (the walls carry the
    // deeper census; this pin only proves the snapshot tier seats the
    // real compose, not a stub).
    assert.equal(defs.size, 15, 'the compose seated the estate\'s cards')
    assert.ok(defs.has('image-edit'), 'the recorded session\'s card is seated')
    const ident = defs.get('image-edit')?.identity
    assert.ok(typeof ident?.label === 'string' && ident.label !== '', 'the identity rung is present on the seated card')
  })
})
