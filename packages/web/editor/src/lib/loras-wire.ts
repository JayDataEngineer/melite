/**
 * loras-wire.ts — the lora catalog wire caller (the picker's seam).
 *
 * THE /v1/loras DOOR DIED WITH THE GATEWAY APP (nothing serves /v1,
 * by design). The lora list is FAMILY-OWNED DATA living in the mods
 * tree (packages/models/<family>/mods/loras.ts); the estate's loras
 * remote (Typert namespace `loras`, mounted by @melite-plugin/
 * melite-estate) serves one family's pick catalog over the wire
 * frame — same-origin POST /api/loras/list carrying the
 * client-request frame (api-gateway.md, the sanctioned caller for
 * plugins outside the DSH web kernel; the wire field is the adapter
 * parameter name, `model`).
 *
 * The answer shape is the old lane's row VERBATIM (loras[], meta{}
 * keyed by filename stem, note) — the picker's UI logic is untouched.
 */

/** Catalog-declared per-LoRA metadata (keyed by filename stem). */
export interface LoraMeta {
  label?: string
  category?: string
  default_strength?: number
}

/** `loras/list`'s answer (the picker's consumption shape). */
export interface LoraListResponse {
  model: string
  loras: string[]
  note?: string | null
  meta?: Record<string, LoraMeta>
}

/** Correlation id for one client-request frame (crypto.randomUUID is
 *  the browser standard). */
function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID()
  return 'rpc-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

/** One family's lora catalog over the wire. A refusal throws the
 *  RemoteError branch's message; a channel surprise throws honestly
 *  (the picker surfaces it — never a silent empty). */
export async function lorasList(model: string): Promise<LoraListResponse> {
  const rpcId = nextRpcId()
  const res = await fetch('/api/loras/list', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: 'loras/list',
      payload: { args: { model } },
    }),
  })
  if (!res.ok) throw new Error('loras/list: HTTP ' + String(res.status))
  const body: unknown = await res.json().catch((): null => null)
  if (typeof body !== 'object' || body === null
      || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error('loras/list: malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null) {
    throw new Error('loras/list: malformed result')
  }
  if (Reflect.get(result, 'ok') !== true) {
    const error: unknown = Reflect.get(result, 'error')
    const message = typeof error === 'object' && error !== null
      && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') : 'loras/list refused'
    throw new Error(message)
  }
  const value = Reflect.get(result, 'value') as Record<string, unknown> | null
  if (typeof value !== 'object' || value === null || !Array.isArray(value['loras'])) {
    throw new Error('loras/list: not a catalog row')
  }
  return value as unknown as LoraListResponse
}
