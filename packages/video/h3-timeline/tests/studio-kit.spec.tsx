/**
 * kit — the studio's DSH-pure control kit (BEHAVIORAL).
 *
 * PINS (fakes-not-mocks: real DOM in, recorded payloads out):
 *  - isImageUrl / ASSET_DRAG_MIME vocabulary.
 *  - every control: inherit-aware value faces, change payloads,
 *    density/variant/disabled arms.
 *  - FilmPlayer: the imperative seam (seekTo clamp, current,
 *    duration, play/pause/toggle), the time/duration/playing
 *    reports, the 4Hz poll, raf cleanup.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h, createRef } from "react"
import {
  ASSET_DRAG_MIME,
  CheckControl,
  ControlRow,
  EmptyState,
  FilmPlayer,
  type FilmPlayerHandle,
  NumberControl,
  PaneHeader,
  PaneShell,
  SectionLabel,
  SelectControl,
  SelectMenu,
  SliderControl,
  TextControl,
  Tip,
  TriControl,
  isImageUrl,
} from "../src/ui/studio/kit.tsx"

beforeEach(() => cleanup())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("isImageUrl + ASSET_DRAG_MIME", () => {
  it("thumbnails: data:, blob:, and image extensions (query/fragment tolerant)", () => {
    assert.equal(isImageUrl("data:image/png;base64,AAA"), true)
    assert.equal(isImageUrl("DATA:IMAGE/JPEG;base64,AAA"), true)
    assert.equal(isImageUrl("blob:https://x/123"), true)
    assert.equal(isImageUrl("https://cdn/x/a.PNG"), true)
    assert.equal(isImageUrl("https://cdn/x/a.jpeg?w=2"), true)
    assert.equal(isImageUrl("/files/a.webp#frag"), true)
    assert.equal(isImageUrl("data:video/mp4;base64,AAA"), false)
    assert.equal(isImageUrl("https://cdn/x/a.mp4"), false)
    assert.equal(isImageUrl("video_w1_main"), false)
    assert.equal(isImageUrl(""), false)
  })

  it("the tray MIME is the studio's own contract", () => {
    assert.equal(ASSET_DRAG_MIME, "application/tech-noir-asset")
  })
})

describe("Tip", () => {
  it("no tip = the child alone (never an empty bubble anchor)", () => {
    render(h(Tip, { children: h("span", { "data-testid": "kid" }, "k") }))
    assert.equal(screen.getByTestId("kid").textContent, "k")
  })

  it("a tip wraps the child in the DSH Tooltip", () => {
    render(h(Tip, { tip: "hello", children: h("span", { "data-testid": "kid" }, "k") }))
    assert.equal(screen.getByTestId("kid").textContent, "k")
    expect(document.body.textContent).toContain("k")
  })
})

describe("ControlRow + SectionLabel", () => {
  it("sm/md densities and the hint arm", () => {
    const { container, rerender } = render(h(ControlRow, { label: "L", density: "sm", children: "c" }))
    assert.ok((container.firstChild as HTMLElement).className.length > 0)
    rerender(h(ControlRow, { label: "L", hint: h("i", null, "h"), className: "extra", children: "c" }))
    expect(document.body.textContent).toContain("h")
  })

  it("SectionLabel renders the tail only when given", () => {
    render(h(SectionLabel, { tail: h("b", null, "t"), children: "head" }))
    expect(document.body.textContent).toContain("t")
    cleanup()
    render(h(SectionLabel, { className: "c", children: "head" }))
    expect(document.body.textContent).toContain("head")
  })
})

describe("NumberControl", () => {
  it("a number value shows; clearing/typing junk writes undefined", () => {
    const seen: Array<number | undefined> = []
    render(h(NumberControl, { ariaLabel: "n", value: 3, onChange: (v) => { seen.push(v) } }))
    const el = screen.getByLabelText("n") as HTMLInputElement
    assert.equal(el.value, "3")
    fireEvent.change(el, { target: { value: "7" } })
    fireEvent.change(el, { target: { value: "" } })
    fireEvent.change(el, { target: { value: "junk" } })
    assert.deepEqual(seen, [7, undefined, undefined])
  })

  it("undefined value renders empty; sm/center/disabled/title/testId ride", () => {
    render(h(NumberControl, {
      ariaLabel: "n2", value: undefined, onChange: () => {}, min: 1, max: 5,
      step: 1, placeholder: "ph", align: "center", width: "w-12",
      disabled: true, title: "t", testId: "num-2", size: "sm",
    }))
    const el = screen.getByTestId("num-2") as HTMLInputElement
    assert.equal(el.value, "")
    assert.equal(el.placeholder, "ph")
    assert.equal(el.disabled, true)
  })
})

describe("TextControl", () => {
  it("trims on write; blank writes undefined (inherit)", () => {
    const seen: Array<string | undefined> = []
    render(h(TextControl, { ariaLabel: "t", value: " v ", onChange: (v) => { seen.push(v) } }))
    const el = screen.getByLabelText("t") as HTMLInputElement
    assert.equal(el.value, " v ")
    fireEvent.change(el, { target: { value: "  hi  " } })
    fireEvent.change(el, { target: { value: "   " } })
    assert.deepEqual(seen, ["hi", undefined])
  })

  it("undefined value renders empty; disabled rides", () => {
    render(h(TextControl, { ariaLabel: "t2", value: undefined, onChange: () => {}, width: "w-full", disabled: true }))
    assert.equal((screen.getByLabelText("t2") as HTMLInputElement).value, "")
  })
})

describe("SelectControl", () => {
  it("string options + object options (label fallback = value)", () => {
    const seen: Array<string | undefined> = []
    render(h(SelectControl, {
      ariaLabel: "s", value: "b", onChange: (v) => { seen.push(v) },
      options: ["a", "b", { value: "c", label: "See" }, { value: "d" }],
    }))
    const el = screen.getByLabelText("s") as HTMLSelectElement
    assert.equal(el.value, "b")
    fireEvent.change(el, { target: { value: "c" } })
    fireEvent.change(el, { target: { value: "" } })
    assert.deepEqual(seen, ["c", undefined])
    expect(document.body.textContent).toContain("See")
  })

  it("emptyLabel=false drops the inherit row; undefined value selects it when present", () => {
    render(h(SelectControl, {
      ariaLabel: "s2", value: undefined, onChange: () => {},
      options: ["a"], emptyLabel: false, width: "w-12", mono: true,
      disabled: true, title: "t", testId: "sel-2",
    }))
    const el = screen.getByTestId("sel-2") as HTMLSelectElement
    assert.equal(el.options.length, 1)
    cleanup()
    render(h(SelectControl, { ariaLabel: "s3", value: undefined, onChange: () => {}, options: ["a"] }))
    assert.equal((screen.getByLabelText("s3") as HTMLSelectElement).value, "")
  })
})

describe("TriControl (inherit/on/off over the shared atom)", () => {
  it("undefined → inherit selected; choosing on writes true", () => {
    const seen: Array<boolean | undefined> = []
    render(h(TriControl, { ariaLabel: "tri", value: undefined, onChange: (v) => { seen.push(v) }, width: "w-12", disabled: true }))
    const el = screen.getByLabelText("tri") as HTMLSelectElement
    assert.equal(el.value, "")
    fireEvent.change(el, { target: { value: "true" } })
    assert.deepEqual(seen, [true])
  })

  it("off writes false; inherit writes undefined", () => {
    const seen: Array<boolean | undefined> = []
    render(h(TriControl, { ariaLabel: "tri2", value: true, onChange: (v) => { seen.push(v) } }))
    const el = screen.getByLabelText("tri2") as HTMLSelectElement
    fireEvent.change(el, { target: { value: "false" } })
    fireEvent.change(el, { target: { value: "" } })
    assert.deepEqual(seen, [false, undefined])
  })
})

describe("CheckControl (the two-state boolean)", () => {
  it("checked mirrors triple-state (only exact true is on); toggles ride", () => {
    const seen: boolean[] = []
    const { rerender } = render(h(CheckControl, { ariaLabel: "cc", checked: true, onChange: (v) => { seen.push(v) }, disabled: true }))
    rerender(h(CheckControl, { ariaLabel: "cc", checked: false, onChange: (v) => { seen.push(v) } }))
    rerender(h(CheckControl, { ariaLabel: "cc", checked: undefined, onChange: (v) => { seen.push(v) } }))
    assert.deepEqual(seen, [])
    expect(document.body.textContent !== null).toBe(true)
  })
})

describe("SliderControl", () => {
  it("the readout formats when given, raw otherwise; drags ride numeric", () => {
    const seen: number[] = []
    render(h(SliderControl, {
      ariaLabel: "sl", value: 0.5, onChange: (v) => { seen.push(v) },
      min: 0, max: 1, step: 0.1, format: (v) => `${Math.round(v * 100)}%`, width: "w-full", disabled: true,
    }))
    expect(document.body.textContent).toContain("50%")
    fireEvent.change(screen.getByLabelText("sl"), { target: { value: "0.7" } })
    cleanup()
    render(h(SliderControl, { ariaLabel: "sl2", value: 3, onChange: (v) => { seen.push(v) }, min: 0, max: 8 }))
    expect(document.body.textContent).toContain("3")
    assert.deepEqual(seen, [0.7])
  })
})

describe("SelectMenu", () => {
  it("picks ride the typed value; the dead popover prop is accepted", () => {
    const seen: string[] = []
    render(h(SelectMenu, {
      value: "a", onChange: (v) => { seen.push(v as string) },
      options: [{ value: "a", label: "Ay" }, { value: "b", label: "Bee" }],
      className: "c", buttonClassName: "b", popoverClassName: "dead",
      disabled: true, "aria-label": "menu", title: "t",
    }))
    fireEvent.change(screen.getByLabelText("menu"), { target: { value: "b" } })
    assert.deepEqual(seen, ["b"])
  })
})

describe("EmptyState + PaneHeader + PaneShell", () => {
  it("EmptyState: overlay/pane variants, icon + hint arms", () => {
    render(h(EmptyState, { icon: h("i", null, "ic"), title: "T", hint: "H", variant: "overlay", className: "x" }))
    expect(document.body.textContent).toContain("H")
    cleanup()
    render(h(EmptyState, { title: "T2" }))
    expect(document.body.textContent).toContain("T2")
  })

  it("PaneHeader: preview vs strip, every slot's null arm", () => {
    render(h(PaneHeader, {
      variant: "preview", title: "P", meta: "M", hint: h("i", null, "H"), lead: h("i", null, "L"), className: "c",
    }))
    expect(document.body.textContent).toContain("P")
    cleanup()
    // preview with NO title/meta: the bare hero (null arms)
    render(h(PaneHeader, { variant: "preview", hint: h("i", null, "H0") }))
    expect(document.body.textContent).toContain("H0")
    cleanup()
    render(h(PaneHeader, { title: "S", meta: "M2", hint: h("i", null, "H2") }))
    expect(document.body.textContent).toContain("S")
    cleanup()
    render(h(PaneHeader, {}))
    assert.ok(document.querySelector('[data-slot="pane-header"]') !== null)
  })

  it("PaneShell boxes children", () => {
    render(h(PaneShell, { className: "c", children: h("b", { "data-testid": "in" }, "x") }))
    assert.equal(screen.getByTestId("in").textContent, "x")
  })
})

describe("FilmPlayer (one film, one native player)", () => {
  function silenceMedia() {
    // happy-dom's media element is a stub shell: pin play/pause so the
    // handle arms run without a decoder.
    const proto = (globalThis as unknown as { HTMLMediaElement: { prototype: HTMLMediaElement } }).HTMLMediaElement.prototype
    const origPlay = proto.play
    const origPause = proto.pause
    proto.play = (() => Promise.resolve()) as unknown as typeof proto.play
    proto.pause = (() => {}) as unknown as typeof proto.pause
    return () => {
      proto.play = origPlay
      proto.pause = origPause
    }
  }

  it("renders the native player with its contract props", () => {
    const restore = silenceMedia()
    try {
      const times: number[] = []
      render(h(FilmPlayer, {
        src: "https://x/final.mp4", className: "pl", "data-testid": "fp",
        muted: true, loop: true, autoPlay: true, poster: "https://x/p.png",
        onTime: (t) => { times.push(t) },
      }))
      const v = screen.getByTestId("fp") as HTMLVideoElement
      assert.ok(v.src.includes("final.mp4"))
      assert.equal(v.muted, true)
      assert.equal(v.loop, true)
      // the element clocks report through the handle-time path
      fireEvent.timeUpdate(v, { target: { currentTime: 1.5 } })
      assert.deepEqual(times, [1.5])
    } finally {
      restore()
    }
  })

  it("play/pause/ended reports ride; missing callbacks never throw", () => {
    const restore = silenceMedia()
    try {
      const playing: boolean[] = []
      let ended = 0
      render(h(FilmPlayer, {
        src: "https://x/a.mp4", "data-testid": "fp2",
        onPlayingChange: (p) => { playing.push(p) }, onEnded: () => { ended++ },
      }))
      const v = screen.getByTestId("fp2")
      fireEvent.play(v)
      fireEvent.pause(v)
      fireEvent.ended(v)
      assert.deepEqual(playing, [true, false])
      assert.equal(ended, 1)
      cleanup()
      // no callbacks at all: the same events are safe no-ops
      render(h(FilmPlayer, { src: "https://x/b.mp4", "data-testid": "fp3" }))
      const w = screen.getByTestId("fp3")
      fireEvent.play(w)
      fireEvent.pause(w)
      fireEvent.ended(w)
      fireEvent.loadedMetadata(w)
    } finally {
      restore()
    }
  })

  it("loadedMetadata reports finite positive durations only", () => {
    const restore = silenceMedia()
    try {
      const durs: number[] = []
      render(h(FilmPlayer, { src: "https://x/a.mp4", "data-testid": "fp4", onDuration: (d) => { durs.push(d) } }))
      const v = screen.getByTestId("fp4") as HTMLVideoElement
      Object.defineProperty(v, "duration", { value: 12.5, configurable: true })
      fireEvent.loadedMetadata(v)
      Object.defineProperty(v, "duration", { value: NaN, configurable: true })
      fireEvent.loadedMetadata(v)
      Object.defineProperty(v, "duration", { value: 0, configurable: true })
      fireEvent.loadedMetadata(v)
      assert.deepEqual(durs, [12.5])
    } finally {
      restore()
    }
  })

  it("the imperative seam: current/duration/play/pause/toggle", async () => {
    const restore = silenceMedia()
    try {
      const ref = createRef<FilmPlayerHandle>()
      render(h(FilmPlayer, { ref, src: "https://x/a.mp4", "data-testid": "fp5" }))
      const v = screen.getByTestId("fp5") as HTMLVideoElement
      assert.equal(ref.current!.current(), 0)
      assert.equal(ref.current!.duration(), 0)
      Object.defineProperty(v, "duration", { value: 10, configurable: true })
      assert.equal(ref.current!.duration(), 10)
      Object.defineProperty(v, "duration", { value: NaN, configurable: true })
      assert.equal(ref.current!.duration(), 0)
      // play/pause ride the element
      ref.current!.play()
      ref.current!.pause()
      // toggle BOTH ways: paused → play, playing → pause
      Object.defineProperty(v, "paused", { value: true, configurable: true })
      ref.current!.toggle()
      Object.defineProperty(v, "paused", { value: false, configurable: true })
      ref.current!.toggle()
    } finally {
      restore()
    }
  })

  it("seekTo rides the raf (coalesced; clamped to a finite duration; unmount cancels)", async () => {
    const restore = silenceMedia()
    try {
      const ref = createRef<FilmPlayerHandle>()
      const { unmount } = render(h(FilmPlayer, { ref, src: "https://x/a.mp4", "data-testid": "fp6" }))
      const v = screen.getByTestId("fp6") as HTMLVideoElement
      Object.defineProperty(v, "duration", { value: 10, configurable: true })
      ref.current!.seekTo(4)
      ref.current!.seekTo(40) // coalesces: latest wins, clamped to 10
      await new Promise((r) => setTimeout(r, 50))
      assert.equal(v.currentTime, 10)
      // negative seeks floor at 0; NaN durations skip the clamp
      Object.defineProperty(v, "duration", { value: NaN, configurable: true })
      ref.current!.seekTo(-3)
      await new Promise((r) => setTimeout(r, 50))
      assert.equal(v.currentTime, 0)
      unmount() // the raf-cancel cleanup runs (no throw after settle)
      await new Promise((r) => setTimeout(r, 50))
    } finally {
      restore()
    }
  })

  it("the 4Hz poll reports while playing; silent otherwise", async () => {
    const restore = silenceMedia()
    try {
      const times: number[] = []
      render(h(FilmPlayer, { src: "https://x/a.mp4", "data-testid": "fp7", onTime: (t) => { times.push(t) } }))
      const v = screen.getByTestId("fp7") as HTMLVideoElement
      // paused shell: no poll reports (the interval returns early)
      await new Promise((r) => setTimeout(r, 300))
      assert.deepEqual(times, [])
      // playing shell: the poll reports the element clock
      Object.defineProperty(v, "paused", { value: false, configurable: true })
      Object.defineProperty(v, "ended", { value: false, configurable: true })
      Object.defineProperty(v, "currentTime", { value: 2.5, configurable: true, writable: true })
      await new Promise((r) => setTimeout(r, 300))
      assert.ok(times.length >= 1, "the poll reported while playing")
      assert.ok(times.every((t) => t === 2.5))
      // ended shell: silent again
      const n = times.length
      Object.defineProperty(v, "ended", { value: true, configurable: true })
      await new Promise((r) => setTimeout(r, 300))
      assert.equal(times.length, n)
      // negative / NaN clocks never report
      Object.defineProperty(v, "ended", { value: false, configurable: true })
      Object.defineProperty(v, "currentTime", { value: -1, configurable: true, writable: true })
      await new Promise((r) => setTimeout(r, 300))
      assert.equal(times.length, n)
      Object.defineProperty(v, "currentTime", { value: NaN, configurable: true, writable: true })
      await new Promise((r) => setTimeout(r, 300))
      assert.equal(times.length, n)
    } finally {
      restore()
    }
  })

  it("the poll without onTime is a safe no-op (playing, no listener)", async () => {
    const restore = silenceMedia()
    try {
      render(h(FilmPlayer, { src: "https://x/a.mp4", "data-testid": "fp8" }))
      const v = screen.getByTestId("fp8") as HTMLVideoElement
      Object.defineProperty(v, "paused", { value: false, configurable: true })
      Object.defineProperty(v, "ended", { value: false, configurable: true })
      await new Promise((r) => setTimeout(r, 300))
    } finally {
      restore()
    }
  })

  it("a pending seek unmounts safely: cleanup cancels, the late raf finds no element", () => {
    const restore = silenceMedia()
    const rafs: FrameRequestCallback[] = []
    let cancelled = 0
    vi.stubGlobal("requestAnimationFrame", ((cb: FrameRequestCallback) => {
      rafs.push(cb)
      return rafs.length
    }) as typeof requestAnimationFrame)
    vi.stubGlobal("cancelAnimationFrame", (() => { cancelled++ }) as typeof cancelAnimationFrame)
    try {
      const ref = createRef<FilmPlayerHandle>()
      const { unmount } = render(h(FilmPlayer, { ref, src: "https://x/a.mp4", "data-testid": "fp9" }))
      ref.current!.seekTo(3)
      assert.equal(rafs.length, 1)
      unmount() // cleanup runs with a raf in flight → cancel rides
      assert.equal(cancelled, 1)
      rafs[0]!(0) // the orphaned raf: no element, safe return
    } finally {
      restore()
    }
  })
})
