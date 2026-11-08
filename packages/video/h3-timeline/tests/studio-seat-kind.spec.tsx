// THE SEAT'S MEDIA-KIND DISCIPLINE (the modleaf-add journey audit,
// 2026-11-16, findings 3 and the seat-discipline arm): the drop seam
// had NO judge — a video/mp4 File dropped on the IMAGE seat reached
// onFile unrefused (the OS dialog's accept is a soft filter the drop
// path bypasses), and From-flow on the studio rail offered the staged
// .mp4 to an image seat (the wire built one candidates list for every
// seat). ONE derivation owns the seat's file kind (seatFileKindOf —
// the same law the OS accept rides), and both doors refuse/filter by
// it: the judge at onFile (both OS + drop route through it), the
// candidatesFor seam threaded on the studio wire.
//
// Depth: the drop arm rides the REAL ModifiersSection leaf over the
// real served h3 spec (the edit kind's own seats — the operator's
// exact drop); the from-flow arms ride the same candidatesFor the
// studio wire threads over real refArtifacts. The unit arm pins the
// vocabulary law itself (one derivation, no second spelling).
import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, it, vi } from "vitest";
import assert from "node:assert/strict";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ModifiersSection, ASSET_DRAG_MIME, assetKindRefusal, fileKindRefusal, seatFileKindOf, urlKindOf } from "@melite/card-base/client";
import { specBody } from "../../../harness/melite-tools/src/discovery.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { theService } from "@melite/comfyui-cordis";

const VIDEO_FILE = new File([new Uint8Array([1, 2, 3])], "take.mp4", { type: "video/mp4" });
const IMAGE_FILE = new File([new Uint8Array([4, 5, 6])], "ref.png", { type: "image/png" });

describe("the seat's media-kind discipline (the drop judge + the from-flow filter)", () => {
  it("ARM 1 — THE VOCABULARY LAW: one derivation serves the accept, the judge, and the filter", () => {
    // the image seat refuses a video file, names both kinds, never drops silent
    const refusal = fileKindRefusal({ name: "source_clip", type: "file", media: "video" } as never, VIDEO_FILE);
    assert.equal(refusal, null, "the VIDEO seat takes the video file");
    const imgSeat = { name: "mask", type: "image" } as never;
    const refused = fileKindRefusal(imgSeat, VIDEO_FILE);
    assert.ok(refused !== null && refused.includes("video") && refused.includes("image"),
      `the image seat's refusal names both kinds: ${String(refused)}`);
    assert.equal(fileKindRefusal(imgSeat, IMAGE_FILE), null, "the image seat takes the image file");
    // the unhinted file seat takes everything (the library law)
    assert.equal(fileKindRefusal({ name: "any", type: "file" } as never, VIDEO_FILE), null);
    // an untyped file rides (the door owns content truth)
    assert.equal(fileKindRefusal(imgSeat, new File([new Uint8Array([1])], "x.glb")), null);
    // the URL vocabulary matches the seat vocabulary
    assert.equal(urlKindOf("runs/r1/clips/clip.mp4"), "video");
    assert.equal(urlKindOf("runs/r1/frames/f.png"), "image");
    assert.equal(urlKindOf("runs/r1/meshes/m.glb"), "mesh");
    assert.equal(urlKindOf("runs/r1/blobs/b.bin"), "", "unknown extensions ride");
    // THE ESTATE'S OWN VOCABULARY, NO PRIVATE REGEX (the (c) debt):
    // svg and avif were images to mediaVocab and '' to the private
    // extension list — an avif artifact was INVISIBLE to an image
    // seat's from-flow rows. Every gallery extra classifies through
    // the one classifier now.
    assert.equal(urlKindOf("runs/r1/img/a.avif"), "image", "avif is an image to the estate");
    assert.equal(urlKindOf("runs/r1/img/i.svg"), "image", "svg is an image to the estate");
    assert.equal(urlKindOf("runs/r1/img/b.bmp"), "image", "bmp is an image to the estate");
    assert.equal(urlKindOf("runs/r1/clips/take.mkv"), "video", "the matroska container is a video");
    assert.equal(urlKindOf("runs/r1/clips/take.m4v"), "video");
    assert.equal(urlKindOf("runs/r1/clips/take.avi"), "video");
    assert.equal(urlKindOf("runs/r1/audio/vo.mp3"), "", "audio rides (the door owns content truth)");
    assert.equal(urlKindOf("runs/r1/clips/clip.mp4?tok=1"), "video", "query strips before the classifier");
    assert.equal(urlKindOf("runs/r1/tags/tags.txt"), "", "text rides");
    // the URL judge is the file judge's twin (the (b) debt): a keyed
    // seat refuses a wrong-kind URL with the same sentence shape
    assert.equal(assetKindRefusal(imgSeat, "runs/r1/clips/take.mp4") !== null, true,
      "the image seat refuses a dragged .mp4 row");
    assert.equal(assetKindRefusal(imgSeat, "runs/r1/frames/mask.png"), null,
      "the image seat takes a dragged .png row");
    assert.equal(assetKindRefusal({ name: "any", type: "file" } as never, "runs/r1/clips/take.mp4"), null,
      "the unhinted seat takes any dragged row (the library law)");
    assert.equal(assetKindRefusal(imgSeat, "runs/r1/blobs/b.bin"), null,
      "an unknown-extension row rides (the door owns content truth)");
    assert.equal(seatFileKindOf({ name: "s", type: "file", media: "video" } as never), "video");
    assert.equal(seatFileKindOf({ name: "s", type: "file" } as never), "all");
  });

  it("ARM 2 — THE DROP JUDGE ON THE REAL LEAF: a wrong-kind file refuses loud on the seat, never reaches a door", async () => {
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    });
    const kinds = ((body.features as Record<string, unknown> | undefined)?.modifiers ?? []) as never[];
    assert.ok(kinds.length > 0, "the served spec offers the edit kind");
    const doorHits: string[] = [];
    vi.stubGlobal("fetch", (url: unknown, init?: unknown) => {
      const u = typeof url === "string" ? url : String((url as { url?: string })?.url ?? "")
      if (u.startsWith("/v1/form-spec")) {
        return Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }))
      }
      doorHits.push(u + " " + String((init as { method?: string } | undefined)?.method ?? "GET"))
      return Promise.resolve(new Response(JSON.stringify({ error: "no door" }), { status: 404 }))
    });
    const edits: Array<[string, unknown]> = [];
    render(
      <ModifiersSection
        kinds={kinds}
        values={{}}
        onEdit={(n, v) => { edits.push([n, v]) }}
        onPatch={() => {}}
        candidates={[]}
        loadMedia={() => Promise.resolve([])}
      />,
    );
    // open the edit leaf through THE ONE DOOR (+ box → kind picker),
    // then the static-mask read via §0.8's flow face: check the
    // Repair section and turn the Mask source dial to the staged
    // PNG (the static read is the mask slot's value, never a pill)
    const plusBox = document.querySelector('[data-subcard-add="mod"]')
    assert.ok(plusBox, "the + box must render")
    fireEvent.click(plusBox as Element)
    fireEvent.click(await screen.findByText("Video edit"))
    fireEvent.click(await screen.findByRole("button", { name: "Mask source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: /Static PNG/i }))
    await screen.findByRole("button", { name: "Add" })
    const squares = Array.from(document.querySelectorAll<HTMLElement>("[data-slot-square]"))
    assert.ok(squares.length >= 2, `the static-mask leaf renders both seats (found ${squares.length})`)
    // THE RIGHT KIND RIDES: the video-hinted source seat takes the .mp4
    // — a door IS reached (the upload begins)
    const videoSeat = squares.find((s) => (s.getAttribute("aria-label") ?? "").toLowerCase().includes("clip"))
      ?? squares[0]
    fireEvent.drop(videoSeat, { dataTransfer: { getData: () => "", files: [VIDEO_FILE] } })
    await waitFor(() => assert.ok(doorHits.length > 0, "the right-kind drop reaches the upload door"))
    // THE WRONG KIND REFUSES LOUD: the image seat (the mask) refuses
    // the same .mp4 into its face — no door, no value, the sentence
    // names both kinds
    // RE-QUERY after the leaf's re-render (the first drop's upload
    // face replaced the squares' subtree)
    const imageSeat = Array.from(document.querySelectorAll<HTMLElement>("[data-slot-square]"))
      .find((s) => (s.getAttribute("aria-label") ?? "").toLowerCase().includes("mask"))
    assert.ok(imageSeat !== undefined, "the edit leaf carries the image (mask) seat")
    const doorsBefore = doorHits.length
    const editsBefore = edits.length
    fireEvent.drop(imageSeat, { dataTransfer: { getData: () => "", files: [VIDEO_FILE] } })
    // THE EXACT FACE, keyed by the seat's own field name — an
    // ambient-prose match ("video" appears in the leaf's captions)
    // cannot stand in for the judge; the toggle-proof depends on
    // this arm firing when the judge is stripped
    await waitFor(() => {
      const face = document.querySelector('[data-slot-error="mask"]')
      assert.ok(face !== null, "the refusal face renders under the mask seat")
      assert.ok((face.textContent ?? "").includes("take.mp4 is a video file"),
        `the refusal names the refused file and its kind — got: ${String(face.textContent)}`)
    })
    assert.equal(doorHits.length, doorsBefore, "the wrong-kind drop NEVER reaches a door")
    assert.equal(edits.length, editsBefore, "and it never lands as a value either")
  });

  it("ARM 3 — THE FROM-FLOW FILTER: the studio wire's candidatesFor offers only the seat's kind", () => {
    // the real derivation the studio wire threads (RunRecipeEngine):
    // a video seat sees only video artifacts; an image seat sees only
    // image artifacts; an unhinted file seat sees all.
    const artifacts = [
      { name: "clip.mp4", url: "runs/r1/clips/clip.mp4" },
      { name: "frame.png", url: "runs/r1/frames/frame.png" },
      { name: "mesh.glb", url: "runs/r1/meshes/mesh.glb" },
    ];
    const candidatesFor = (f: { type: string; media?: string }): Array<{ id: string }> => {
      const want = seatFileKindOf(f as never);
      if (want === "all") return artifacts.map((a) => ({ id: a.name }));
      return artifacts.filter((a) => urlKindOf(a.url) === want).map((a) => ({ id: a.name }));
    };
    assert.deepEqual(candidatesFor({ type: "file", media: "video" }).map((c) => c.id), ["clip.mp4"],
      "the video seat is never offered the staged image or mesh");
    assert.deepEqual(candidatesFor({ type: "image" }).map((c) => c.id), ["frame.png"],
      "the image seat is never offered the staged .mp4 — the audit's exact burn");
    assert.deepEqual(candidatesFor({ type: "file" }).map((c) => c.id), ["clip.mp4", "frame.png", "mesh.glb"],
      "the unhinted seat keeps the whole library");
  });

  // THE (b) DEBT — the dragged asset row (URL payload, not a File):
  // it entered onAsset with NO judge and a wrong-kind URL landed AS
  // THE VALUE. Same law as the file door, same refusal face.
  it("ARM 4 — THE DRAGGED ASSET REFUSES BY KIND ON THE REAL LEAF: a .mp4 row dropped on the mask seat never lands", async () => {
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    });
    const kinds = ((body.features as Record<string, unknown> | undefined)?.modifiers ?? []) as never[];
    vi.stubGlobal("fetch", (url: unknown) => {
      const u = typeof url === "string" ? url : String((url as { url?: string })?.url ?? "")
      if (u.startsWith("/v1/form-spec")) {
        return Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }))
      }
      return Promise.resolve(new Response(JSON.stringify({ error: "no door" }), { status: 404 }))
    });
    const edits: Array<[string, unknown]> = [];
    render(
      <ModifiersSection
        kinds={kinds}
        values={{}}
        onEdit={(n, v) => { edits.push([n, v]) }}
        onPatch={() => {}}
        candidates={[]}
        loadMedia={() => Promise.resolve([])}
      />,
    );
    fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as Element)
    fireEvent.click(await screen.findByText("Video edit"))
    fireEvent.click(await screen.findByRole("button", { name: "Mask source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: /Static PNG/i }))
    await screen.findByRole("button", { name: "Add" })
    const maskSeat = (): HTMLElement | undefined =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-slot-square]"))
        .find((s) => (s.getAttribute("aria-label") ?? "").toLowerCase().includes("mask"))
    assert.ok(maskSeat() !== undefined, "the static-mask leaf carries the image (mask) seat")
    const editsBefore = edits.length
    // THE WRONG KIND: a run row's .mp4 payload dropped on the image seat
    fireEvent.drop(maskSeat() as Element, {
      dataTransfer: {
        getData: (mime: string) => mime === ASSET_DRAG_MIME ? JSON.stringify({ url: "runs/r1/clips/take.mp4" }) : "",
        files: [],
      },
    })
    await waitFor(() => {
      const face = document.querySelector('[data-slot-error="mask"]')
      assert.ok(face !== null, "the dragged-row refusal face renders under the mask seat")
      assert.ok((face.textContent ?? "").includes("take.mp4 is a video file"),
        `the refusal names the dragged artifact and its kind — got: ${String(face.textContent)}`)
    })
    assert.equal(edits.length, editsBefore, "the wrong-kind dragged row NEVER lands as a value")
    // THE RIGHT KIND RIDES: the same drag with a .png payload commits
    // — the seat's held-value face carries the URL (the leaf drafts
    // internally, so the SEAT's own face is the observable)
    fireEvent.drop(maskSeat() as Element, {
      dataTransfer: {
        getData: (mime: string) => mime === ASSET_DRAG_MIME ? JSON.stringify({ url: "runs/r1/frames/mask.png" }) : "",
        files: [],
      },
    })
    await waitFor(() => assert.ok(
      (maskSeat()?.textContent ?? "").includes("runs/r1/frames/mask.png"),
      "the right-kind dragged row lands on the mask seat"))
  });

  // EVERY DOOR (the journey's done-when): a card that threads NO
  // candidatesFor serves the picker the RAW candidate list — the
  // pick door answers the same law the drag and file doors answer.
  it("ARM 5 — THE PICKER DOOR: an unfiltered candidate list never lands a wrong-kind row on a keyed seat", async () => {
    const body = specBody(theService(), await loadCardDefs(), {
      card: "h3-timeline", service: "h3-timeline", model: "h3-timeline",
    });
    const kinds = ((body.features as Record<string, unknown> | undefined)?.modifiers ?? []) as never[];
    vi.stubGlobal("fetch", (url: unknown) => {
      const u = typeof url === "string" ? url : String((url as { url?: string })?.url ?? "")
      if (u.startsWith("/v1/form-spec")) {
        return Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }))
      }
      return Promise.resolve(new Response(JSON.stringify({ error: "no door" }), { status: 404 }))
    });
    const edits: Array<[string, unknown]> = [];
    render(
      <ModifiersSection
        kinds={kinds}
        values={{}}
        onEdit={(n, v) => { edits.push([n, v]) }}
        onPatch={() => {}}
        // NO candidatesFor: the raw rows, exactly the unfiltered card
        candidates={[
          { id: "take.mp4", label: "take.mp4", url: "runs/r1/clips/take.mp4" },
          { id: "mask.png", label: "mask.png", url: "runs/r1/frames/mask.png" },
        ]}
        loadMedia={() => Promise.resolve([])}
      />,
    );
    fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as Element)
    fireEvent.click(await screen.findByText("Video edit"))
    fireEvent.click(await screen.findByRole("button", { name: "Mask source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: /Static PNG/i }))
    await screen.findByRole("button", { name: "Add" })
    const maskSeat = (): HTMLElement | undefined =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-slot-square]"))
        .find((s) => (s.getAttribute("aria-label") ?? "").toLowerCase().includes("mask"))
    assert.ok(maskSeat() !== undefined, "the static-mask leaf carries the image (mask) seat")
    fireEvent.click(maskSeat() as Element)
    fireEvent.click(await screen.findByText("From flow"))
    const editsBefore = edits.length
    // THE WRONG KIND: the raw list offers the .mp4 row; clicking it refuses
    const wrongRow = (await screen.findAllByTestId("source-pick-row"))
      .find((r) => (r.textContent ?? "").includes("take.mp4"))
    assert.ok(wrongRow !== undefined, "the unfiltered list offers the .mp4 row")
    fireEvent.click(wrongRow)
    await waitFor(() => {
      const face = document.querySelector('[data-slot-error="mask"]')
      assert.ok(face !== null && (face.textContent ?? "").includes("take.mp4 is a video file"),
        `the pick refusal renders under the mask seat — got: ${String(face?.textContent ?? null)}`)
    })
    assert.equal(edits.length, editsBefore, "the wrong-kind pick NEVER lands as a value")
    // THE RIGHT KIND RIDES: re-open and pick the .png row
    fireEvent.click(maskSeat() as Element)
    fireEvent.click(await screen.findByText("From flow"))
    const rows = await screen.findAllByTestId("source-pick-row")
    const pngRow = rows.find((r) => (r.textContent ?? "").includes("mask.png"))
    assert.ok(pngRow !== undefined, "the right-kind row is offered")
    fireEvent.click(pngRow)
    await waitFor(() => assert.ok(
      (maskSeat()?.textContent ?? "").includes("runs/r1/frames/mask.png"),
      "the right-kind pick lands on the mask seat"))
  });
});
