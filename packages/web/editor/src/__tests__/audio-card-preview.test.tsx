/**
 * Audio card preview — the waveform contract (2026-08-10).
 *
 * ACE-Step (music) cards carry `genre: "audio"` and produce a .wav (or
 * data:audio/) artifact. Two surfaces render that output, and BOTH must
 * show waves — never a broken <img> (the tile) and never a bare
 * <audio controls> with no waveform (the drilldown):
 *
 * • CardTile thumbnail — a mini WaveSurfer waveform (visualization only;
 * pointer-events-none so the click opens the drilldown, where the
 * interactive transport lives).
 * • CardPreview (drilldown) — the full AudioPlayer (WaveSurfer waveform
 * + play/pause + seek-on-click). "the waves … interact with on click."
 *
 * The WaveSurfer components themselves are mocked here — this pins the
 * ROUTING (does CardTile pick the waveform branch, not the broken <img>?),
 * not WaveSurfer's canvas rendering (a jsdom concern).
 */
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { CardTile } from "../surfaces/flow/FlowCard"
import { formSpecStub } from "../../tests/fixtures/formSpecStub"
// The tile's preview cell + run affordance ride the ui-claim WIRE now
// (cardElements lane parity, 2026-08-21) — seed the lane exactly as the
// app's boot does, or the cells render null (this spec's own blank-tile
// failure mode). audio's viewer claim rides the SAME sync: the diff
// law disposes anything a later sync omits, so two sequential seeds
// would unmount the first one's claims.
import { syncPluginUi } from "@/shell/pluginUi"
import "@/shell/pluginUi"

beforeAll(async () => {
  // chrome is static (pluginUi import); the audio VIEWER is a plugin
  // claim — seed exactly that entry.
  await syncPluginUi([
    { plugin: "audio", id: "audio-viewer", slot: "audio-viewer", precedence: 10 },
  ])
})
import { CardPreview } from "../surfaces/flow/CardDetailModal"
import type { CardStage } from "@melite/contracts"
// ── Mock the WaveSurfer components — stubs with stable test IDs ──────────
// The real components dynamically import wavesurfer.js and render canvas;
// jsdom can't do that. We only need to assert the branch was taken.
vi.mock("@melite-plugin/audio/ui/viewers", () => ({
  AudioWaveform: ({ audioUrl }: { audioUrl: string }) => (
    <div data-testid="tile-waveform" data-url={audioUrl} />
  ),
  AudioPlayer: ({ src }: { src: string }) => (
    <div data-testid="drilldown-audio-player" data-src={src} />
  ),
}))

// ── Minimal catalog + formSpec stubs (CardTile's render path) ────────────
vi.mock("@melite/catalog/modelCatalog", () => ({
 studioOf: vi.fn(() => undefined),
 loadCatalog: vi.fn().mockResolvedValue({ models: {}, families: {} }),
 getCachedCatalog: vi.fn().mockReturnValue({ models: {}, families: {} }),
 familiesForForm: vi.fn().mockReturnValue([]),
 familyGenre: vi.fn().mockReturnValue("audio"),
 familyLabel: vi.fn().mockImplementation((k: string) => k),
 familyCardSummary: vi.fn().mockReturnValue(null),
 variantLabel: vi.fn().mockReturnValue(""),
 routeCoordinates: vi.fn().mockReturnValue({ variant: undefined, quant: undefined }),
 composeVariantRoute: vi.fn().mockReturnValue(""),
 axisCellExists: vi.fn().mockReturnValue(true), // filter pinned in model-catalog.test.ts
 dropdownModels: vi.fn().mockReturnValue([]),
 variantSiblings: vi.fn().mockReturnValue([]),
}))
// Door B (2026-08-11): the spec fetch lives in the specContractStore —
// loadFormSpec/useFormSpec were deleted from lib/formSpec.
vi.mock("../surfaces/shared/specContractStore", () => {
 const records: Record<string, any> = {}
 const stateRef = { records }
 const loadFormSpec = async (model: string) => {
  const record: import("../surfaces/shared/specContractStore").SpecContractRecord = {
   spec: formSpecStub(),
   state: "loaded", violations: [], error: null,
  }
  records[model] = record
  return record
 }
 const useSpecContractStore = Object.assign(
  (selector: (s: { records: Record<string, any> }) => any) => selector(stateRef),
  { getState: () => ({ loadFormSpec, records, retryFormSpec: () => {} }) },
 )
 return { useSpecContractStore }
})
vi.mock("../lib/formSpec", () => ({
 optionValue: vi.fn(),
 optionLabel: vi.fn(),
 evalVisibleWhen: vi.fn().mockReturnValue(true),
}))

function makeAudioStage(over: Partial<CardStage> = {}): CardStage {
 return {
 id: "s0",
 title: "Generate music",
 subtitle: "ace-step",
 kind: "generation",
 service: "ace-step",
 params: { prompt: "lo-fi beat" },
 inputs: [],
 inputIndices: [],
 result: { assetUrls: ["data:audio/wav;base64,AAAA"], artifacts: {}, metadata: {}, durationSec: 30 },
 status: "done",
 meta: {},
 genre: "audio",
 ...over,
 }
}

afterEach(cleanup)

describe("CardTile audio thumbnail — the waveform, not a broken <img>", () => {
 it("renders the WaveSurfer waveform for a genre:'audio' result (NO broken img)", () => {
 const url = "data:audio/wav;base64,AAAA"
 const { container, getByTestId } = renderWithTooltip(
 <CardTile
 stage={makeAudioStage()}
 running={false}
 index={0}
 onOpen={() => {}}
 onRemove={() => {}}
 />,
 )
 // The waveform branch was taken — the stub rendered with the URL.
 const wf = getByTestId("tile-waveform")
 expect(wf.getAttribute("data-url")).toBe(url)
 // CRITICAL: NO <img> whose src is the audio URL — that was the
 // "bugs out" broken-image-icon regression.
 const imgs = container.querySelectorAll("img")
 const audioImgs = Array.from(imgs).filter((im) =>
 (im.getAttribute("src") ?? "").startsWith("data:audio/"),
 )
 expect(audioImgs).toHaveLength(0)
 })

 it("detects audio by .wav extension even without genre:'audio' (legacy fallback)", () => {
 const { getByTestId } = renderWithTooltip(
 <CardTile
 stage={makeAudioStage({
 genre: undefined,
 result: { assetUrls: ["/srv/artifacts/run1/out.wav"], artifacts: {}, metadata: {}, durationSec: 12 },
 })}
 running={false}
 index={0}
 onOpen={() => {}}
 onRemove={() => {}}
 />,
 )
 expect(getByTestId("tile-waveform").getAttribute("data-url")).toBe(
 "/srv/artifacts/run1/out.wav",
 )
 })

 it("does NOT render the waveform for an image card (regression guard)", () => {
 const { container } = renderWithTooltip(
 <CardTile
 stage={makeAudioStage({
 genre: "image",
 result: { assetUrls: ["data:image/png;base64,iVBOR"], artifacts: {}, metadata: {} },
 })}
 running={false}
 index={0}
 onOpen={() => {}}
 onRemove={() => {}}
 />,
 )
 // Image card → the normal <img> path, NO waveform stub.
 expect(container.querySelector('[data-testid="tile-waveform"]')).toBeNull()
 expect(container.querySelector("img")?.getAttribute("src")).toBe(
 "data:image/png;base64,iVBOR",
 )
 })
})

describe("CardPreview drilldown — the full interactive AudioPlayer", () => {
 it("renders the AudioPlayer (waves + transport) for an audio output, NOT a bare <audio>", () => {
 const url = "data:audio/wav;base64,AAAA"
 const { getByTestId, container } = renderWithTooltip(
 <CardPreview stage={makeAudioStage()} />,
 )
 // The AudioPlayer stub rendered with the source URL.
 expect(getByTestId("drilldown-audio-player").getAttribute("data-src")).toBe(url)
 // NO bare <audio controls> element — the old "bugs out" path that
 // rendered no waveform at all.
 expect(container.querySelector("audio")).toBeNull()
 })

 it("renders the AudioPlayer by genre when the URL has no audio extension (the broken-img regression)", () => {
 // Artifact URLs don't always carry an audio suffix — genre:audio must
 // still route to the waveform, not the <img> fallback.
 const url = "/srv/artifacts/run1/output"
 const { getByTestId, container } = renderWithTooltip(
 <CardPreview
 stage={makeAudioStage({
 result: { assetUrls: [url], artifacts: {}, metadata: {}, durationSec: 30 },
 })}
 />,
 )
 expect(getByTestId("drilldown-audio-player").getAttribute("data-src")).toBe(url)
 // CRITICAL: no <img> rendering that URL — that WAS the broken image.
 const audioImgs = Array.from(container.querySelectorAll("img")).filter(
 (im) => (im.getAttribute("src") ?? "") === url,
 )
 expect(audioImgs).toHaveLength(0)
 })

 it("detects audio with a query-string URL (.wav?download=1 — extension match must be suffix-safe)", () => {
 const url = "/srv/artifacts/run1/out.wav?download=1"
 const { getByTestId, container } = renderWithTooltip(
 <CardPreview
 stage={makeAudioStage({
 genre: undefined,
 result: { assetUrls: [url], artifacts: {}, metadata: {}, durationSec: 12 },
 })}
 />,
 )
 expect(getByTestId("drilldown-audio-player").getAttribute("data-src")).toBe(url)
 expect(container.querySelector('img[src*="out.wav"]')).toBeNull()
 })

 it("does NOT render the AudioPlayer for a video output (regression guard)", () => {
 const { container } = renderWithTooltip(
 <CardPreview
 stage={makeAudioStage({
 genre: "video",
 result: { assetUrls: ["data:video/mp4;base64,AAAA"], artifacts: {}, metadata: {} },
 })}
 />,
 )
 expect(container.querySelector('[data-testid="drilldown-audio-player"]')).toBeNull()
 expect(container.querySelector("video")).toBeTruthy()
 })
})
