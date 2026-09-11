// input-card-editor.spec.tsx — proves the Input card editor is driven by
// the DECLARED applicability matrix (input_prep.yaml transforms:).
//
// The input family's params shape is FIXED by the family signature, but
// WHICH fields render for a given media type + which get stripped on a
// source-type change are BOTH driven by the catalog declaration (the same
// transforms: block the backend _validate_params_for_media raises from).
// This test primes a fake catalog mirroring that declaration; the editor
// then gates fields from familyTransformMatrix — one source, two consumers.
//
// MASK REMOVED (2026-08-14): the fake catalog no longer declares the mask
// transform / optional output, mirroring the real input_prep.yaml — the
// editor renders no mask painter, and the card's only output is media.
import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import { InputCardEditor, detectMediaType } from "../surfaces/flow/InputCardEditor"
import { primeCatalog } from "@melite/catalog"
import type { CardStage } from "@melite/contracts"
// InputCardEditor renders SlotSquare/Tip tooltips (Radix) — the app mounts
// TooltipProvider at its root (App.tsx); tests must wrap the same way.
function renderEditor(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

// Prime the catalog with the input family's DECLARED transforms matrix,
// mirroring the real input_prep.yaml (production gets this via
// /v1/model-catalog). The matrix drives field gating + stripping — the
// SSOT the editor reads, no hardcoded image/video/audio branches.
beforeAll(() => {
  primeCatalog({
    families: {
      input: {
        label: "Input Prep",
        genre: "image",
        primary_output: "media",
        transforms: [
          { name: "crop", applies_to: ["image"] },
          { name: "scale", applies_to: ["image", "video"] },
          { name: "trim", applies_to: ["video", "audio"] },
          { name: "volume", applies_to: ["audio"] },
        ],
      },
    },
    models: {},
  } as any)
})

function makeStage(params: Record<string, unknown> = { source: null }): CardStage {
  return {
    id: "stage-input-1",
    title: "Input / Media Prep",
    kind: "input",
    service: "input",
    params,
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
  }
}

describe("detectMediaType", () => {
  it("detects image / video / audio from data: URLs", () => {
    expect(detectMediaType("data:image/png;base64,xxx")).toBe("image")
    expect(detectMediaType("data:video/mp4;base64,xxx")).toBe("video")
    expect(detectMediaType("data:audio/wav;base64,xxx")).toBe("audio")
  })
  it("detects from filename extensions", () => {
    expect(detectMediaType("photo.png")).toBe("image")
    expect(detectMediaType("/input/photo.JPG")).toBe("image")
    expect(detectMediaType("clip.mp4")).toBe("video")
    expect(detectMediaType("song.mp3")).toBe("audio")
  })
  it("returns null for unknown / missing", () => {
    expect(detectMediaType(null)).toBeNull()
    expect(detectMediaType(undefined)).toBeNull()
    expect(detectMediaType("")).toBeNull()
    expect(detectMediaType("foo.xyz")).toBeNull()
  })
})

describe("InputCardEditor — source attach + media-type gating", () => {
  it("renders only the source picker when no source is set", () => {
    renderEditor(<InputCardEditor stage={makeStage()} onSave={() => {}} />)
    expect(screen.getByText("Source")).toBeTruthy()
    expect(screen.queryByText("Crop (px) — optional")).toBeNull()
    expect(screen.queryByText("Trim (seconds) — optional")).toBeNull()
    expect(screen.queryByText(/Volume/)).toBeNull()
  })

  it("renders crop + scale for an image source", () => {
    renderEditor(<InputCardEditor stage={makeStage({ source: "data:image/png;base64,xxx" })} onSave={() => {}} />)
    expect(screen.getByText("Crop (px) — optional")).toBeTruthy()
    expect(screen.getByText("Scale — optional")).toBeTruthy()
    // No video/audio fields on an image.
    expect(screen.queryByText("Trim (seconds) — optional")).toBeNull()
    expect(screen.queryByText(/Volume/)).toBeNull()
  })

  it("renders scale + trim for a video source", () => {
    renderEditor(<InputCardEditor stage={makeStage({ source: "clip.mp4" })} onSave={() => {}} />)
    expect(screen.getByText("Scale — optional")).toBeTruthy()
    expect(screen.getByText("Trim (seconds) — optional")).toBeTruthy()
    // No image crop on a video.
    expect(screen.queryByText("Crop (px) — optional")).toBeNull()
    expect(screen.queryByText(/Volume/)).toBeNull()
  })

  it("renders trim + volume for an audio source", () => {
    renderEditor(<InputCardEditor stage={makeStage({ source: "song.mp3" })} onSave={() => {}} />)
    expect(screen.getByText("Trim (seconds) — optional")).toBeTruthy()
    expect(screen.getByText(/Volume/)).toBeTruthy()
    // No image/video fields on audio.
    expect(screen.queryByText("Crop (px) — optional")).toBeNull()
    expect(screen.queryByText("Scale — optional")).toBeNull()
  })

  it("live-saves partial crop patches through onSave (merge, not replace)", () => {
    const onSave = vi.fn()
    renderEditor(
      <InputCardEditor
        stage={makeStage({ source: "data:image/png;base64,xxx", crop: null })}
        onSave={onSave}
      />,
    )
    const x = screen.getByLabelText("x") as HTMLInputElement
    fireEvent.change(x, { target: { value: "10" } })
    expect(onSave).toHaveBeenCalledWith({ crop: { x: 10 } })
  })

  it("clear-crop sends crop: null (NOT an empty dict)", () => {
    const onSave = vi.fn()
    renderEditor(
      <InputCardEditor
        stage={makeStage({ source: "data:image/png;base64,xxx", crop: { x: 10, y: 0, width: 100, height: 100 } })}
        onSave={onSave}
      />,
    )
    fireEvent.click(screen.getByText("clear crop"))
    expect(onSave).toHaveBeenCalledWith({ crop: null })
  })

  it("attaching a video source strips stale image-only transforms (crop)", async () => {
    const onSave = vi.fn()
    renderEditor(
      <InputCardEditor
        stage={makeStage({
          source: "data:image/png;base64,xxx",
          crop: { x: 10, y: 0, width: 100, height: 100 },
        })}
        onSave={onSave}
      />,
    )
    // Simulate the user picking a video file.
    const file = new File(["fake"], "clip.mp4", { type: "video/mp4" })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    act(() => {
      fireEvent.change(input, { target: { files: [file] } })
    })
    // FileReader.readAsDataURL fires onload asynchronously — waitFor polls
    // until the save lands (the old fixed 20ms sleep was load-sensitive:
    // flaked under gate's parallel arms).
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    // The save must carry: source (the new url), crop: null (image-only →
    // stripped), volume: null (audio-only → stripped). scale/trim stay
    // absent (image had no scale; trim wasn't there either). The patch
    // is a MERGE — updateStageParams spreads it over the existing params.
    expect(onSave).toHaveBeenCalled()
    const last = onSave.mock.calls.at(-1)![0] as Record<string, unknown>
    expect(last.source).toMatch(/^data:video\/mp4/)
    expect(last.crop).toBeNull()       // image-only, stripped
    expect(last.volume).toBeNull()     // audio-only, stripped
    // trim is COMPATIBLE with video — it's not stripped. The stage had no
    // trim set, so it's not in the patch either (undefined = untouched).
    expect(last.trim).toBeUndefined()
    // scale is compatible too — same: not stripped, not previously set.
    expect(last.scale).toBeUndefined()
  })

  it("clear-source wipes ALL transforms (full reset)", () => {
    const onSave = vi.fn()
    renderEditor(
      <InputCardEditor
        stage={makeStage({
          source: "data:image/png;base64,xxx",
          crop: { x: 10, y: 0, width: 100, height: 100 },
          scale: { width: 1024, height: 1024, method: "lanczos" },
        })}
        onSave={onSave}
      />,
    )
    // The detach X is Tip-wrapped (aria-label, no title attr) since the
    // flow surface rework — query the accessible name.
    fireEvent.click(screen.getByLabelText("Detach"))
    expect(onSave).toHaveBeenCalledWith({
      source: null,
      crop: null,
      scale: null,
      trim: null,
      volume: null,
    })
  })

  it("shows an unknown-type hint when the source format can't be detected", () => {
    renderEditor(<InputCardEditor stage={makeStage({ source: "foo.xyz" })} onSave={() => {}} />)
    expect(screen.getByText(/Unknown media type/)).toBeTruthy()
  })

  // ── Mask painter ABSENT (removed 2026-08-14) ───────────────────────────
  //
  // The mask feature (optional output + MaskEditor) is gone from the input
  // card. Even an image source must render NO mask section — a stale
  // ``mask`` param in a saved stage stays inert (the family no longer takes
  // it; the catalog no longer declares the output).
  it("renders NO mask editor for image sources", () => {
    renderEditor(
      <InputCardEditor
        stage={makeStage({ source: "data:image/png;base64,xxx", mask: "data:image/png;base64,yyy" })}
        onSave={() => {}}
      />,
    )
    expect(document.querySelector('[data-optional-output="mask"]')).toBeNull()
    expect(screen.queryByText(/Mask — optional/i)).toBeNull()
  })
})
