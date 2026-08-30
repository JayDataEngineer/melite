// provision_model.test - THE PROVISIONING TOOL CONTRACT (2026-08-26).
//
// The tool is a THIN SHIM over POST /v1/models/provision (+ a best-effort
// GET /v1/models/provision/status snapshot). Contract pinned here:
//   - happy path  -> Manager verdict surfaces as queued:true + save_path;
//   - variant     -> rides the POST body when supplied;
//   - non-2xx     -> RayGatewayError message carries the gateway body
//                    VERBATIM (the operator-facing 422s are the UX);
//   - status read failure NEVER fails the tool (best-effort snapshot);
//   - render      -> one model-facing line.
// All fetch mocked; runs under bun test from the package dir.
import { afterEach, describe, expect, test } from 'bun:test'
import type { ToolDefinition } from '../src/types.ts'
import { provisionModel } from '../src/tools/provision-model.ts'

const origFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = origFetch })

const def: ToolDefinition = provisionModel('http://g')
const exec = { signal: new AbortController().signal }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('provision_model', () => {
  test('happy path: Manager accepted -> queued:true, payload surfaced, status snapshot best-effort', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      if (calls.length === 1) {
        return jsonResponse(200, {
          model: 'z-image',
          payload: {
            name: 'z_image_bf16.safetensors',
            save_path: 'diffusion_models',
            url: 'https://huggingface.co/Comfy-Org/z_image/resolve/main/split_files/diffusion_models/z_image_bf16.safetensors',
            filename: 'z_image_bf16.safetensors',
            registry_match: true,
          },
          manager: { accepted: true, status: 200, worker_kicked: true },
          queue: [{ status: 'Pending' }],
        })
      }
      return jsonResponse(200, { reachable: true, manager_version: '3.x', queue: [] })
    }) as typeof fetch

    const value = (await def.execute!({ model: 'z-image' }, exec as never)) as Record<string, unknown>
    expect(calls[0]!.url).toBe('http://g/v1/models/provision')
    expect(calls[0]!.init!.method).toBe('POST')
    expect(calls[0]!.init!.body).toBe(JSON.stringify({ model: 'z-image' }))
    expect(value.queued).toBe(true)
    expect(value.model).toBe('z-image')
    expect(value.save_path).toBe('diffusion_models')
    expect(value.worker_kicked).toBe(true)
    expect(String(value.detail)).toContain('ACCEPTED')
    expect(calls[1]!.url).toBe('http://g/v1/models/provision/status')

    const rendered = def.output!.render!(def, value) as Array<{ text?: string }>
    expect(rendered[0]!.text).toContain('provision_model z-image')
    expect(rendered[0]!.text).toContain('ACCEPTED')
  })

  test('variant rides the POST body', async () => {
    let seenBody = ''
    let seenMethod = ''
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      if (!seenMethod) { seenMethod = String(init?.method); seenBody = String(init?.body) }
      return jsonResponse(200, { model: 'krea-2', variant: 'raw', manager: { accepted: true } })
    }) as typeof fetch
    await def.execute!({ model: 'krea-2', variant: 'raw' }, exec as never)
    expect(seenBody).toBe(JSON.stringify({ model: 'krea-2', variant: 'raw' }))
  })

  test('non-2xx: RayGatewayError carries the gateway body VERBATIM', async () => {
    globalThis.fetch = (async () =>
      jsonResponse(422, {
        error: "model 'x' declares no source: - MODEL DOWNLOAD LINKS ARE IN YAML (D2 vocabulary)",
      })) as typeof fetch
    try {
      await def.execute!({ model: 'x' }, exec as never)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as Error).message).toContain('422')
      expect((e as Error).message).toContain('MODEL DOWNLOAD LINKS ARE IN YAML')
    }
  })

  test('status snapshot failure never fails the tool', async () => {
    let n = 0
    globalThis.fetch = (async () => {
      n += 1
      if (n === 1) return jsonResponse(200, { model: 'z-image', manager: { accepted: true } })
      throw new Error('gateway down mid-read')
    }) as typeof fetch
    const value = (await def.execute!({ model: 'z-image' }, exec as never)) as Record<string, unknown>
    expect(value.queued).toBe(true)
    expect(value.manager_reachable).toBeNull()
  })
})
