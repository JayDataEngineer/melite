/**
 * add-stage.ts — the bench add-stage wire door caller (the tab's
 * add-card path). The remote's signature is (sessionKey, doc) — the
 * args frame carries BOTH named; the doc holds card/author/engine/
 * params/expect_rev (the CAS law: the caller reads bench/get first
 * and chains the rev). */
import { nextRpcId } from './cards-resource.ts'

export async function addStageWire(doc: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const rpcId = nextRpcId()
  const res = await fetch('/api/bench/add-stage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: 'bench/add-stage',
      payload: { args: { sessionKey: 'main', doc } },
    }),
    ...(signal === undefined ? {} : { signal }),
  })
  if (!res.ok) throw new Error('bench/add-stage: HTTP ' + String(res.status))
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null
      || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error('bench/add-stage: malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null) throw new Error('bench/add-stage: malformed result')
  if (Reflect.get(result, 'ok') !== true) {
    const error: unknown = Reflect.get(result, 'error')
    throw new Error(typeof error === 'object' && error !== null && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') as string : 'bench/add-stage refused')
  }
  const value: unknown = Reflect.get(result, 'value')
  if (typeof value !== 'object' || value === null) throw new Error('bench/add-stage: not an object')
  return value as Record<string, unknown>
}

/** The bench remove-stage wire door caller (the drill's Remove path).
 *  Same frame as the add (sessionKey, doc); the doc holds stage/
 *  expect_rev (the CAS law: the caller chains the bench rev it
 *  rendered, so a concurrent edit refuses instead of slicing wrong). */
export async function removeStageWire(doc: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const rpcId = nextRpcId()
  const res = await fetch('/api/bench/remove-stage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: 'bench/remove-stage',
      payload: { args: { sessionKey: 'main', doc } },
    }),
    ...(signal === undefined ? {} : { signal }),
  })
  if (!res.ok) throw new Error('bench/remove-stage: HTTP ' + String(res.status))
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null
      || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error('bench/remove-stage: malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null) throw new Error('bench/remove-stage: malformed result')
  if (Reflect.get(result, 'ok') !== true) {
    const error: unknown = Reflect.get(result, 'error')
    throw new Error(typeof error === 'object' && error !== null && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') as string : 'bench/remove-stage refused')
  }
  const value: unknown = Reflect.get(result, 'value')
  if (typeof value !== 'object' || value === null) throw new Error('bench/remove-stage: not an object')
  return value as Record<string, unknown>
}

/** The bench reorder wire door caller (the drag-reorder path). Doc:
 *  stage/to/expect_rev — `to` is the post-splice target index. */
export async function reorderStageWire(doc: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const rpcId = nextRpcId()
  const res = await fetch('/api/bench/reorder', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: 'bench/reorder',
      payload: { args: { sessionKey: 'main', doc } },
    }),
    ...(signal === undefined ? {} : { signal }),
  })
  if (!res.ok) throw new Error('bench/reorder: HTTP ' + String(res.status))
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null
      || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error('bench/reorder: malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null) throw new Error('bench/reorder: malformed result')
  if (Reflect.get(result, 'ok') !== true) {
    const error: unknown = Reflect.get(result, 'error')
    throw new Error(typeof error === 'object' && error !== null && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') as string : 'bench/reorder refused')
  }
  const value: unknown = Reflect.get(result, 'value')
  if (typeof value !== 'object' || value === null) throw new Error('bench/reorder: not an object')
  return value as Record<string, unknown>
}

/** The bench rewire wire door caller (the wire gesture). Doc:
 *  stage/input/from/expect_rev — from is {stage, output} | {initial}
 *  | ABSENT to clear. */
export async function rewireStageWire(doc: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const rpcId = nextRpcId()
  const res = await fetch('/api/bench/rewire', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: 'bench/rewire',
      payload: { args: { sessionKey: 'main', doc } },
    }),
    ...(signal === undefined ? {} : { signal }),
  })
  if (!res.ok) throw new Error('bench/rewire: HTTP ' + String(res.status))
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null
      || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error('bench/rewire: malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null) throw new Error('bench/rewire: malformed result')
  if (Reflect.get(result, 'ok') !== true) {
    const error: unknown = Reflect.get(result, 'error')
    throw new Error(typeof error === 'object' && error !== null && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') as string : 'bench/rewire refused')
  }
  const value: unknown = Reflect.get(result, 'value')
  if (typeof value !== 'object' || value === null) throw new Error('bench/rewire: not an object')
  return value as Record<string, unknown>
}
