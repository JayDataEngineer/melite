// rejection-voice.spec.ts — the two lossless voices, wall unit-level
// (the component specs pin the rendered lines; this wall pins the
// arms the component paths cannot reach: the empty body, the
// JSON-without-error body, and a body read that itself throws).
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { rejectionVoice, refusalVoice } from '../src/client/rejection-voice.ts'

describe('rejectionVoice (thrown values, verbatim)', () => {
  test('an Error speaks its message', () => {
    assert.equal(rejectionVoice(new Error('door down')), 'door down')
  })
  test('a plain value surfaces verbatim (never a fixed fallback)', () => {
    assert.equal(rejectionVoice('gone'), 'gone')
  })
})

describe('refusalVoice (refused responses, lossless)', () => {
  test("a JSON body's error field speaks itself", async () => {
    const res = new Response(JSON.stringify({ error: 'taken' }), { status: 409 })
    assert.equal(await refusalVoice(res), 'taken')
  })
  test('a non-JSON body names the status and carries the raw text', async () => {
    const res = new Response('taken', { status: 409 })
    assert.equal(await refusalVoice(res), 'HTTP 409: taken')
  })
  test('an empty body still names the status (never "undefined")', async () => {
    const res = new Response('', { status: 502 })
    assert.equal(await refusalVoice(res), 'HTTP 502')
  })
  test('a JSON body without an error field falls to status + raw text', async () => {
    const res = new Response(JSON.stringify({ ok: false }), { status: 400 })
    assert.equal(await refusalVoice(res), 'HTTP 400: {"ok":false}')
  })
  test('a body read that itself throws still names the status', async () => {
    const res = new Response('x', { status: 500 })
    res.text = () => Promise.reject(new Error('stream gone'))
    assert.equal(await refusalVoice(res), 'HTTP 500')
  })
})
