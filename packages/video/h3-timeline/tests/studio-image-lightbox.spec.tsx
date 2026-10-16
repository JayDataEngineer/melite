// studio-image-lightbox.spec.tsx — THE D2 PREVIEW WALL (operator
// 2026-11-06: "REF MODs must preview an IMAGE via the DSH primitive").
// The preview primitive is @deepseek-ai/dsh-client-ui-primitives'
// ImageLightbox (the SHIPPED face: rc.1's lib exports it — ImagePreview
// exists only in the d.ts, an upstream build gap this estate cannot
// import around). This wall drives the primitive through the EXACT
// seat pattern the chips ride — a thumb button whose click opens the
// lightbox, the close verb unmounting it — on a bare tree (mounting
// the portal inside the full studio harness wedges the jsdom pool;
// the in-studio arms judge the door's existence + labels, this wall
// judges the open/close law itself).
import { describe, expect, it, afterEach } from "vitest"
import { useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Button, ImageLightbox } from "@deepseek-ai/dsh-client-ui-primitives"

/** The seat pattern — one spelling of the thumb door the chips ride. */
function ThumbSeat({ src, alt, openLabel }: { src: string; alt: string; openLabel: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="ghost" aria-label={openLabel} onClick={() => { setOpen(true) }}>
        <img src={src} alt={alt} />
      </Button>
      {open ? (
        <ImageLightbox
          src={src}
          alt={alt}
          labels={{ dialog: "image preview", close: "close preview" }}
          onClose={() => { setOpen(false) }}
        />
      ) : null}
    </>
  )
}

afterEach(() => { cleanup() })

describe("D2: the DSH lightbox owns the image preview (no hand-rolled preview)", () => {
  it("the thumb click opens the primitive's dialog with the original URL; the close verb unmounts it", () => {
    render(<ThumbSeat src="data:image/png;base64,AA" alt="upload 1" openLabel="preview upload 1" />)
    expect(screen.queryByRole("dialog")).toBe(null)
    fireEvent.click(screen.getByRole("button", { name: "preview upload 1" }))
    const dialog = screen.getByRole("dialog")
    expect(dialog.getAttribute("aria-modal")).toBe("true")
    expect(dialog.querySelector('img[src="data:image/png;base64,AA"]')).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "close preview" }))
    expect(screen.queryByRole("dialog")).toBe(null)
  })

  it("the primitive ships in the installed build (the ImagePreview gap is why this seat exists)", async () => {
    const mod = await import("@deepseek-ai/dsh-client-ui-primitives")
    expect(typeof mod.ImageLightbox).toBe("function")
  })
})
