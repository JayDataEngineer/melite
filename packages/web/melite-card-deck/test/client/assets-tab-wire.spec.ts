import { afterEach, describe, expect, it } from 'vitest'

import { postManage, seatManageNamespace, type ManageLane } from '../../src/client/assets-tab.tsx'
import type { ManageActDoc, ManageEnvelopeRow } from '@melite/estate-manage/types'
// The manage seat's refusal code (the envelope rides the details —
// the same declaration manageRegistry makes at the seat; declared
// here type-only so this wall builds without the seat's graph).
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'manage/refused': {
      readonly action?: string
      readonly status?: number
      readonly code?: string
      readonly data?: unknown
    }
  }
}
import { RemoteError, type RemoteFailure, type RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

/** Seat ONE fake manage lane (the apply seam — the deck's real apply
 *  seats ctx.remote.manage the same way; the Connection, its codecs,
 *  and the transport are NOT under test here, only the panel's
 *  envelope mapping and its voices). */
function seat(
  act: (doc: ManageActDoc, signal?: AbortSignal) => Promise<RemoteResult<ManageEnvelopeRow>>,
): void {
  seatManageNamespace({ act })
}

const ok = (value: ManageEnvelopeRow): RemoteResult<ManageEnvelopeRow> => ({ ok: true, value })
const refused = (error: RemoteFailure): RemoteResult<ManageEnvelopeRow> => ({ ok: false, error })

afterEach(() => {
  seatManageNamespace(undefined)
})

describe('postManage doc', () => {
  it('rides the seated manage lane (action + payload verbatim)', async () => {
    const docs: ManageActDoc[] = []
    seat(async (doc) => {
      docs.push(doc)
      return ok({ action: 'status', ok: true, detail: 'up', data: { a: 1 } })
    })
    const reply = await postManage('status', {})
    expect(reply).toEqual({ action: 'status', ok: true, detail: 'up', data: { a: 1 } })
    expect(docs).toEqual([{ action: 'status' }])
  })

  it('carries the optional abort signal', async () => {
    let seen: AbortSignal | undefined
    seat(async (_doc, signal) => {
      seen = signal
      return ok({ action: 'x', ok: true, detail: '' })
    })
    const controller = new AbortController()
    await postManage('status', {}, controller.signal)
    expect(seen).toBe(controller.signal)
  })

  it('rethrows cancellation', async () => {
    seat(async (): Promise<RemoteResult<ManageEnvelopeRow>> => {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    })
    await expect(postManage('status', {})).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('refuses LOUD when the lane was never seated (never a silent ok:false)', async () => {
    seatManageNamespace(undefined)
    await expect(postManage('status', {})).rejects.toThrow(/manage remote not mounted/)
  })
})

describe('postManage transports', () => {
  it('maps Error and bare-string throws off the lane', async () => {
    seat(async (): Promise<RemoteResult<ManageEnvelopeRow>> => { throw new Error('socket reset') })
    expect(await postManage('logs', {})).toEqual({ action: 'logs', ok: false, code: 'manage/transport', detail: 'socket reset' })
    seat(async (): Promise<RemoteResult<ManageEnvelopeRow>> => { throw 'bare string failure' })
    expect(await postManage('logs', {})).toEqual({ action: 'logs', ok: false, code: 'manage/transport', detail: 'bare string failure' })
  })
})

describe('postManage contract fields', () => {
  it('maps a RemoteError refusal with code, status, state, operation, and flags', async () => {
    seat(async () => refused(new RemoteError('manage/refused', 'partial provisioning', {
      action: 'provision_model',
      status: 500,
      code: 'manage/refused',
      data: {
        state: 'partial',
        operation_id: 'op-1',
        partial: true,
        restart_required: false,
        next_action: 'provision_model',
        items: [],
      },
    })))
    expect(await postManage('provision_model', {})).toEqual({
      action: 'provision_model',
      ok: false,
      detail: 'partial provisioning',
      data: {
        state: 'partial',
        operation_id: 'op-1',
        partial: true,
        restart_required: false,
        next_action: 'provision_model',
        items: [],
      },
      code: 'manage/refused',
      status: 500,
      state: 'partial',
      operation_id: 'op-1',
      partial: true,
      restart_required: false,
      next_action: 'provision_model',
    })
  })

  it('falls back to the call action and honest refusal values', async () => {
    seat(async () => refused(new RemoteError('manage/refused', 'nope', {})))
    expect(await postManage('stop', {})).toEqual({ action: 'stop', ok: false, code: 'manage/refused', detail: 'nope', data: undefined })
    seat(async () => refused(new RemoteError('manage/refused', '', {})))
    expect(await postManage('stop', {})).toEqual({ action: 'stop', ok: false, code: 'manage/refused', detail: 'manage wire: refused', data: undefined })
  })

  it('extracts top-level contract fields and falls back to data', async () => {
    seat(async () => ok({
      action: 'install_extension',
      ok: true,
      detail: 'installed',
      state: 'restart_required',
      next_action: 'restart',
      operation_id: 'op-top',
      partial: false,
      restart_required: true,
      data: { state: 'active', operation_id: 'op-data' },
    }))
    expect(await postManage('install_extension', {})).toMatchObject({
      state: 'restart_required',
      next_action: 'restart',
      operation_id: 'op-top',
      partial: false,
      restart_required: true,
    })

    seat(async () => ok({
      action: 'snapshot_restore',
      ok: true,
      detail: 'restored',
      data: { state: 'restart_required', operation_id: 'op-data', restart_required: true, next_action: 'restart' },
    }))
    expect(await postManage('snapshot_restore', {})).toMatchObject({
      state: 'restart_required',
      operation_id: 'op-data',
      restart_required: true,
      next_action: 'restart',
    })
  })
})
