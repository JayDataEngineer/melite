/**
 * AnnyPhotoUpload — the OS file paths, pinned end to end (2026-09-06).
 *
 * Operator report (verbatim): "I click and drag photo from my
 * comptuer!!!!!" + "Nothing attaches". The well is kit SlotSquare;
 * this pins BOTH ingress paths through the REAL component (drop on
 * the square + pick via the hidden input): the file's bytes ride
 * FileReader → POST /v1/uploads, and the E1 channel writes the
 * returned estate path (never the browser-local data: URL — the
 * run-9e8fd6b813a2 class). Non-images refuse before any POST.
 */
import { it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, waitFor } from "@testing-library/react"
import { renderTenant } from "./assembly-tenant-shared"
import { AnnyPhotoUpload } from "@melite/3d-anny/ui/studio/component"

const UPLOAD_PATH = "data/input/shot-abc12345.png"

function stubUploads() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown) => {
      if (String(url) === "/v1/uploads") {
        return {
          ok: true,
          text: async () => JSON.stringify({ path: UPLOAD_PATH }),
        }
      }
      throw new Error("unexpected fetch " + String(url))
    }),
  )
}

beforeEach(() => {
  stubUploads()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function pngFile() {
  return new File(["fake-png-bytes"], "shot.png", { type: "image/png" })
}

it("OS drop on the square uploads and writes the estate path", async () => {
  const onSave = vi.fn()
  renderTenant(<AnnyPhotoUpload photo={null} onSave={onSave} />)
  const square = document.querySelector("[data-slot-square]")
  expect(square).toBeTruthy()
  const dt = new DataTransfer()
  dt.items.add(pngFile())
  fireEvent.drop(square!, { dataTransfer: dt })
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(onSave).toHaveBeenCalledWith({ source_image: UPLOAD_PATH })
})

it("file picker uploads and writes the estate path", async () => {
  const onSave = vi.fn()
  renderTenant(<AnnyPhotoUpload photo={null} onSave={onSave} />)
  const input = document.querySelector(
    '[data-slot-input]',
  ) as HTMLInputElement
  expect(input).toBeTruthy()
  fireEvent.change(input, { target: { files: [pngFile()] } })
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(onSave).toHaveBeenCalledWith({ source_image: UPLOAD_PATH })
})

it("a non-image refuses before any POST", async () => {
  const onSave = vi.fn()
  renderTenant(<AnnyPhotoUpload photo={null} onSave={onSave} />)
  const square = document.querySelector("[data-slot-square]")
  const dt = new DataTransfer()
  dt.items.add(new File(["nope"], "notes.txt", { type: "text/plain" }))
  fireEvent.drop(square!, { dataTransfer: dt })
  // The refusal note paints; the E1 channel stays silent and fetch
  // never fires (uploads is image-only).
  await waitFor(() =>
    expect(document.body.textContent).toMatch(/not an image/),
  )
  expect(onSave).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})
