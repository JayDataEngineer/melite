import '@testing-library/jest-dom/vitest'
import { beforeEach, afterEach } from 'vitest'

// Kinds lane seed (the fourth lane): the wire's first-party table
// (packages/melite-core/kinds/*.yaml) as a fixture — the jsdom suite has no
// server. Welded to the yaml by server-js/tests/gate.kinds.test.ts
// (lockstep; drift is CI failure).
//
// ORDER LAW: this file runs BEFORE each test file's vi.mock calls
// register, so it must ONLY import modules with ZERO runtime imports —
// cardSeam is pure (types only) and the fixture imports nothing. Going
// through pluginKinds here would transitively pre-load the store graph
// (pluginKinds → pluginShell → chrome → store) and bake the REAL
// editorClient into store modules before any mock applies — 83 tests
// died on exactly that (2026-08-19). The icon map is inlined for the
// same reason: lucide is a leaf, pluginShell is not.
import { registerCardKind } from '@melite/slots'
import { Box } from 'lucide-react'
import { MELITE_CORE_KINDS } from './fixtures/meliteCoreKinds'
for (const k of MELITE_CORE_KINDS) {
 registerCardKind({
  kind: k.kind,
  runnable: k.runnable,
  executable: k.executable,
  formSpec: k.formSpec,
  compound: k.compound,
  opensStudio: k.opensStudio,
  badgeTone: k.badgeTone,
  // Declarative runner family (the dispatcher's SSOT, 2026-09-05).
  // Forwarded from the fixture so the jsdom suite mirrors the
  // server's /v1/kinds wire. A future refactor that drops runner
  // here would silently misroute — the runner test pins it.
  ...(k.runner !== undefined ? { runner: k.runner } : { runner: "" }),
  ...(k.icon === 'Box' ? { icon: Box } : {}),
 })
}

// Mock localStorage
const store: Record<string, string> = {}
const ls = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true })

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
  writable: true,
})

// Mock ResizeObserver
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

// happy-dom lacks Element.getAnimations — @base-ui/react's ScrollAreaViewport
// calls viewport.getAnimations() from a delayed timer (scroll-linked
// animation pause). Without a stub, every base-ui scroll area throws an
// uncaught TypeError in tests. Empty array = "nothing to pause".
if (typeof Element.prototype.getAnimations !== "function") {
  Element.prototype.getAnimations = () => []
}

// Mock IntersectionObserver
globalThis.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

// Mock AudioContext
class MockAudioContext {
  currentTime = 0
  state: AudioContextState = 'running'
  createBufferSource(): { buffer: AudioBuffer | null; connect: () => void; start: () => void; stop: () => void; disconnect: () => void } {
    return { buffer: null, connect: () => {}, start: () => {}, stop: () => {}, disconnect: () => {} }
  }
  createGain() {
    return { gain: { value: 1 }, connect: () => {}, disconnect: () => {} }
  }
  decodeAudioData() {
    return Promise.resolve({
      getChannelData: () => new Float32Array(100),
      duration: 5,
      numberOfChannels: 1,
      length: 100,
      sampleRate: 44100,
    })
  }
  close() { return Promise.resolve() }
}
(globalThis as any).AudioContext = MockAudioContext

// Suppress console.error for expected test noise
const origError = console.error
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] || '')
    if (msg.includes('Warning:')) return
    origError.call(console, ...args)
  }
})
afterEach(() => {
  console.error = origError
})
