import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { partitionQueue, queueEntryPromptId } from '../../../../tests/e2e/queue-ownership.ts'

// THE QUEUE OWNERSHIP LAW (the operator's-bench burn, 2026-11-20):
// the e2e drain once wiped the engine queue whole beside the
// operator's live bench — the serial-battery assumption licensed a
// `clear: true` + blind interrupt that deleted THEIR pending
// renders. The cure is exact ownership: the drain partitions the
// queue by its own run's ENGINE-SIDE prompt id (the sidecar
// receipt's graph_receipt.prompt_id), clears only ours, and names
// foreign work without touching it. These arms judge the partition
// the drain rides — the pure face, both engine queue entry shapes,
// and the fail-closed direction (an unclassifiable entry is never
// ours: the dangerous act is clearing foreign work, so the extractor
// must never guess an id).

describe('THE QUEUE OWNERSHIP LAW (the drain clears only its own prompt — the operator\u2019s bench burn, 2026-11-20)', () => {
  const arrayFace = (id: string): unknown => [7, id, { class_type: 'KSampler' }]
  const objectFace = (id: string): unknown => ({ prompt_id: id, prompt: {} })

  it('both engine queue entry faces read their prompt_id — array face and object face', () => {
    assert.equal(queueEntryPromptId(arrayFace('r_ours')), 'r_ours')
    assert.equal(queueEntryPromptId(objectFace('r_ours')), 'r_ours')
  })

  it('unclassifiable entries own NO id — never guessed (the dangerous direction is clearing foreign work)', () => {
    assert.equal(queueEntryPromptId(undefined), '')
    assert.equal(queueEntryPromptId('r_ours'), '')
    assert.equal(queueEntryPromptId(42), '')
    assert.equal(queueEntryPromptId([7, 42, {}]), '', 'a non-string array id is not an id')
    assert.equal(queueEntryPromptId({ prompt_id: 42 }), '', 'a non-string object id is not an id')
    assert.equal(queueEntryPromptId({ no_id: true }), '')
    assert.equal(queueEntryPromptId(null), '')
  })

  it('the partition separates OURS from FOREIGN by exact id — ours matched, foreign counted', () => {
    const queue = [arrayFace('r_foreign_1'), objectFace('r_ours'), arrayFace('r_ours'), objectFace('r_foreign_2')]
    const { ours, foreign } = partitionQueue(queue, 'r_ours')
    assert.equal(ours.length, 2, 'both faces of our own prompt match')
    assert.equal(foreign, 2, 'the foreign items are counted, never matched')
  })

  it('a foreign-only queue partitions to zero ours — the drain neither clears nor reds on it', () => {
    const queue = [arrayFace('r_op_1'), objectFace('r_op_2'), [3, 'r_op_3']]
    const { ours, foreign } = partitionQueue(queue, 'r_ours')
    assert.equal(ours.length, 0)
    assert.equal(foreign, 3)
  })

  it('an unjudgable run (no owned id) partitions to zero ours — the drain\u2019s fail-closed face reds instead of clearing', () => {
    // the drain refuses to judge the queue at all when its own run
    // carries no prompt id (gpu-harness\u2019s empty-id throw); the
    // partition itself must agree: nothing is ours without the id
    const queue = [objectFace('r_ours')]
    const { ours, foreign } = partitionQueue(queue, '')
    assert.equal(ours.length, 0, 'an empty owned id matches NOTHING — the wipe path is unreachable')
    assert.equal(foreign, 1)
  })
})
