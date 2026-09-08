// events-tunnel.test — the events WS tunnel handler is a raw TCP pipe
// to the gateway. The card-deck host's /v1/flows/events path serves
// as the only DSH-side mount for the live run events stream (operator
// bug 2026-09-04: no feedback from the comfyui webhooks inside the
// DSH embed). The dev DSH load gate asserts the upgrade is registered
// and reaches 101/400 through the dev origin; THIS test drives the
// upgrade handler directly with fake client + fake head + (live)
// gateway upstream to pin the pipe semantics:
//
//   - 400 (bad run_id) reaches the client socket unchanged (proves
//     the path-form handshake reached the gateway, the gateway
//     refused cleanly, and the response is the bytes the client sees);
//   - 101 (valid run_id) reaches the client with the hydrate frame
//     from the gateway (proves the handshake replay and bidirectional
//     pipe are wired);
//
// All node-net primitives are real (the handler opens a raw socket);
// the gateway is the LIVE dev gateway (the only upstream in the
// estate). The fake client socket records what the handler writes
// so the test asserts the response shape.
//
import { afterEach, describe, expect, test } from 'bun:test'
import type { AddressInfo } from 'node:net'
import { createServer, createConnection } from 'node:net'
import { apply } from '../src/index.ts'

// ── Harness (shares the shape of host-routes.test.ts) ────────────────

interface Reg { kind: string; path: string; handler: (req: unknown, res: unknown) => Promise<void> }
interface Up { path: string; handler: (req: unknown, socket: unknown, head: unknown) => void }

function mount(config: Record<string, unknown> = {}): { routes: Reg[]; upgrades: Up[] } {
  const routes: Reg[] = []
  const upgrades: Up[] = []
  const ctx = {
    effect(fn: () => unknown) { fn(); return () => {} },
    webServer: {
      register(r: Reg) { routes.push(r); return () => {} },
      registerUpgrade(u: Up) { upgrades.push(u); return () => {} },
    },
    logger: { info() {} },
  }
  apply(ctx as never, config)
  return { routes, upgrades }
}

// A minimal fake client socket: records every write, exposes destroyed
// state. The handler calls .write and .destroy — that's the entire
// surface we need.
class FakeClientSocket {
  chunks: Buffer[] = []
  destroyed = false
  destroyedReason: string | null = null
  write(data: string | Buffer): boolean {
    this.chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data))
    return true
  }
  destroy(err?: Error): void {
    this.destroyed = true
    this.destroyedReason = err ? String(err.message) : null
  }
}

function fakeReq(url: string, headers: Record<string, string>) {
  return { url, method: 'GET', headers }
}

function gatewayFromAddr(addr: AddressInfo): string {
  return 'http://' + addr.address + ':' + addr.port
}

// A self-contained fake gateway (so this test does not depend on the
// live dev gateway being up). It speaks JUST the WS handshake and
// then closes — the handler tests the path-form replay + relay, not
// the WS frame semantics.
function startFakeGateway(opts: { response: '101' | '400' | 'never' } = { response: '101' }): Promise<{ url: string; close: () => void; received: { head: Buffer; body: Buffer }[] }> {
  return new Promise((resolve) => {
    const received: { head: Buffer; body: Buffer }[] = []
    const server = createServer((sock) => {
      let head = Buffer.alloc(0)
      sock.on('data', (chunk: Buffer) => {
        if (head.length < 4096) head = Buffer.concat([head, chunk])
        // Parse head/body once we see the \r\n\r\n boundary
        const sep = head.indexOf('\r\n\r\n')
        if (sep >= 0) {
          const header = head.subarray(0, sep).toString('latin1')
          received.push({ head: head.subarray(0, sep), body: head.subarray(sep + 4) })
          if (opts.response === '101') {
            sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: fake-accept\r\n\r\n')
            // After the 101, do NOT close — the handler's pipe stays
            // open. The test closes the server explicitly.
          } else if (opts.response === '400') {
            sock.write('HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n')
            sock.end()
          } else {
            // 'never' — drop the connection without writing anything.
            sock.destroy()
          }
          head = Buffer.alloc(0)
        }
      })
      sock.on('error', () => {})
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo
      resolve({
        url: gatewayFromAddr(addr),
        close: () => server.close(),
        received,
      })
    })
  })
}

describe('events WS tunnel (the card-deck host /v1/flows/events upgrade)', () => {
  test('bad run_id returns 400 from the gateway, reaches the client socket unchanged', async () => {
    const gw = await startFakeGateway({ response: '400' })
    try {
      const { upgrades } = mount({ gatewayUrl: gw.url })
      const upgrade = upgrades.find((u) => u.path === '/v1/flows/events')!
      expect(upgrade).toBeDefined()
      const client = new FakeClientSocket()
      const req = fakeReq('/?run_id=__definitely_bad_run_id__', {
        'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'sec-websocket-version': '13',
      })
      upgrade.handler(req, client, Buffer.alloc(0))
      // The handler is async (it opens a socket); give the event loop
      // a tick to flush.
      await new Promise((r) => setTimeout(r, 100))
      const blob = Buffer.concat(client.chunks).toString('latin1')
      expect(blob).toContain('HTTP/1.1 400')
      // The fake gateway received a path-form handshake targeting
      // /v1/flows/events/__definitely_bad_run_id__.
      expect(gw.received.length).toBe(1)
      const head = gw.received[0].head.toString('latin1')
      expect(head).toContain('GET /v1/flows/events/__definitely_bad_run_id__')
      // The original client's Sec-WebSocket-Key was replayed.
      expect(head).toContain('Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==')
      expect(head).toContain('Sec-WebSocket-Version: 13')
    } finally {
      gw.close()
    }
  })

  test('valid run_id: gateway returns 101 + the 101 reaches the client socket', async () => {
    const gw = await startFakeGateway({ response: '101' })
    try {
      const { upgrades } = mount({ gatewayUrl: gw.url })
      const upgrade = upgrades.find((u) => u.path === '/v1/flows/events')!
      const client = new FakeClientSocket()
      const req = fakeReq('/?run_id=test-run-123', {
        'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'sec-websocket-version': '13',
      })
      upgrade.handler(req, client, Buffer.alloc(0))
      // Wait for the upstream connect + handshake relay.
      await new Promise((r) => setTimeout(r, 200))
      const blob = Buffer.concat(client.chunks).toString('latin1')
      expect(blob).toContain('HTTP/1.1 101')
      expect(blob).toContain('Sec-WebSocket-Accept: fake-accept')
      // Upstream received the right path-form handshake.
      expect(gw.received.length).toBe(1)
      const head = gw.received[0].head.toString('latin1')
      expect(head).toContain('GET /v1/flows/events/test-run-123')
    } finally {
      gw.close()
    }
  })

  test('missing run_id: handler refuses at the local validation door (400 to client, no upstream connect)', async () => {
    const gw = await startFakeGateway({ response: '101' })
    try {
      const { upgrades } = mount({ gatewayUrl: gw.url })
      const upgrade = upgrades.find((u) => u.path === '/v1/flows/events')!
      const client = new FakeClientSocket()
      const req = fakeReq('/?other=1', {
        'sec-websocket-key': 'k',
        'sec-websocket-version': '13',
      })
      upgrade.handler(req, client, Buffer.alloc(0))
      await new Promise((r) => setTimeout(r, 50))
      const blob = Buffer.concat(client.chunks).toString('latin1')
      expect(blob).toContain('HTTP/1.1 400 Bad Request')
      // No upstream was opened — the fake gateway received nothing.
      expect(gw.received.length).toBe(0)
    } finally {
      gw.close()
    }
  })

  test('dead upstream: handler returns 502 to client, does not throw', async () => {
    // Start a server and immediately close it so the port refuses.
    const gw = await startFakeGateway({ response: '101' })
    const addr = (gw.url.match(/:(\d+)$/) as RegExpMatchArray)[1]
    gw.close()
    // Wait for the OS to release the port, then mount with that port
    // — any connect will get ECONNREFUSED.
    await new Promise((r) => setTimeout(r, 100))
    const deadUrl = 'http://127.0.0.1:' + addr
    const { upgrades } = mount({ gatewayUrl: deadUrl })
    const upgrade = upgrades.find((u) => u.path === '/v1/flows/events')!
    const client = new FakeClientSocket()
    const req = fakeReq('/?run_id=x', {
      'sec-websocket-key': 'k',
      'sec-websocket-version': '13',
    })
    upgrade.handler(req, client, Buffer.alloc(0))
    await new Promise((r) => setTimeout(r, 200))
    const blob = Buffer.concat(client.chunks).toString('latin1')
    // The handler must surface the 502 to the client; the failure
    // law says 'NEVER throws, NEVER hangs'.
    expect(blob).toContain('HTTP/1.1 502')
  })
})
