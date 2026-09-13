// jest-dom matchers via the /matchers entry + our OWN expect import —
// NOT '@testing-library/jest-dom/vitest' (2026-09-09): that entry does
// `import { expect } from 'vitest'` from JEST-DOM'S module context, which
// resolves to a SECOND vitest module record in this worker; extending
// that copy splits the runner's assertion state (snapshot state went
// missing — 'SnapshotClient.setup()' — and rejects.toThrow(regex)
// broke) whenever a second vitest copy (a ^5 pin in a sibling package)
// drifted the resolution. /matchers imports no vitest at all; the
// expect below is the same record the tests use.
import * as jestDomMatchers from '@testing-library/jest-dom/matchers'
import { expect, beforeEach, afterEach } from 'vitest'

expect.extend(jestDomMatchers)

// Kinds lane seed (the fourth lane): the wire's first-party table
// (packages/melite-core/kinds/*.yaml) as a fixture — the jsdom suite has no
// server. Welded to the yaml by server-js/tests/gate.kinds.test.ts
// (lockstep; drift is CI failure).
//
// ORDER LAW: this file runs BEFORE each test file's vi.mock calls
// register, so it must ONLY import modules with ZERO runtime imports.
// (2026-09-13: the card-kind registration block died with @melite/slots —
// the registry had no runtime readers; the kinds wire is estate-served.)

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
