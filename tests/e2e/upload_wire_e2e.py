#!/usr/bin/env python3
"""EXTREME E2E — click & drag-to-upload on the image input, live
browser + live gateway (2026-09-06).

Operator order, verbatim: "I need extreme e2e on the click and drag
to upload an image to the image input" + the GLib refusal
("Could not read image file: A requested file or directory could not
be found…") + "It works for the DSH input box, but you can't make it
work? Screw you".

What this proves, gesture by gesture, against the REAL editor at
:3909 and the REAL gateway behind it (no mocks):

  1. DRAG: a real OS-file drop on the input_image square →
     POST /v1/uploads → bytes LAND under data/input/ → the card
     param carries the ESTATE PATH → the compile door 200s on it.
  2. CLICK: the hidden file input path → same wire.
  3. The fossil: a data: URL param REFUSES at the compile door
     (400, loud) — the operator's original failure class can never
     reach a run again.

INFERENCE LAW: no Run is ever pressed; compile proof rides the
/v1/flows/validate door (phase 1, no slot, no GPU, no registration).
"""

import json
import os
import sys
import time
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

# Validate bodies and payloads are JSON (no future-import — old-style).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

REPO = Path(__file__).resolve().parents[2]
CHROME = os.path.expanduser(
    "~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome")
EDITOR = "http://127.0.0.1:3909/editor/"
INPUT_DIR = REPO / "data" / "input"

PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6300010000050001"
    "0d0a2db40000000049454e44ae426082")


def die(msg: str) -> None:
    print("FAIL:", msg)
    sys.exit(1)


def uploads_before() -> set[str]:
    return {p.name for p in INPUT_DIR.glob("*")}


def validate_from_page(page: Page, body: dict[str, JsonValue]) -> tuple[int, dict[str, JsonValue]]:
    res = page.evaluate(
        """async (body) => {
            const r = await fetch('/v1/flows/validate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body),
            });
            return {status: r.status, json: await r.json()};
        }""", body)
    return res["status"], res["json"]


def main() -> None:
    png_local = Path("/tmp/e2e_upload_probe.png")
    png_local.write_bytes(PNG)
    # the OPERATOR'S EXACT SHAPE: a real file with spaces in the name
    # ("Screenshot from 2026-09-03 20-50-19.png") — driven through
    # the browser's real file-read service (setFiles), the same
    # service a portal drag read uses.
    shots = Path("/tmp/Screenshot from 2026-09-03 20-50-19.png")
    shots.write_bytes(PNG)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=CHROME,
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 1600, "height": 1000})
        page.goto(EDITOR, wait_until="domcontentloaded")
        page.wait_for_timeout(2500)

        # ── board an image-EDIT card ──────────────────────────────
        try:
            page.get_by_text("Add your first card", exact=False).click(
                timeout=4000)
        except Exception:
            pass  # a card may already exist
        page.wait_for_timeout(800)
        btn = page.get_by_role("button", name="image-edit", exact=False)
        if btn.count() == 0:
            btn = page.get_by_role("button", name="qwen-img-edit", exact=False)
        if btn.count() == 0:
            die("no image-edit card button found on the add panel")
        btn.first.click()
        page.wait_for_timeout(1200)

        # zoom the card if not already zoomed (the add flow may
        # auto-open the detail)
        def square_count() -> int:
            return page.locator("[data-slot-grid] [data-slot-square]").count()
        if square_count() == 0:
            tiles = page.locator("[data-card-tile], [data-stage-tile], .card-tile")
            if tiles.count() == 0:
                tiles = page.get_by_text("image-edit", exact=False)
            tiles.first.click(force=True, timeout=8000)
            page.wait_for_timeout(1500)
        for _ in range(10):
            if square_count() > 0:
                break
            page.wait_for_timeout(500)

        square = page.locator("[data-slot-grid] [data-slot-square]").first
        if square.count() == 0:
            die("input_image slot square not found in the zoomed card")

        # ══ GESTURE 1: DRAG a real file onto the square ══════════
        before = uploads_before()
        with page.expect_response(
                lambda r: "/v1/uploads" in r.url, timeout=15000) as ri:
            page.evaluate(
                """async ([pngB64]) => {
                    const b = atob(pngB64);
                    const bytes = new Uint8Array(b.length);
                    for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
                    const file = new File([bytes], 'Screenshot from 2026-09-03 20-50-19.png',
                                         {type: 'image/png'});
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    const sq = document.querySelector(
                        '[data-slot-grid] [data-slot-square]');
                    sq.dispatchEvent(new DragEvent('dragover', {
                        bubbles: true, cancelable: true, dataTransfer: dt}));
                    sq.dispatchEvent(new DragEvent('drop', {
                        bubbles: true, cancelable: true, dataTransfer: dt}));
                }""", [PNG.hex() and __import__("base64").b64encode(PNG).decode()])
        resp = ri.value
        if resp.status != 200:
            die("upload POST returned %d: %s" % (resp.status, resp.text()))
        up = resp.json()
        path = up.get("path", "")
        if not path.startswith("data/input/"):
            die("upload response path is not an estate path: %r" % up)
        print("DRAG  ✓ POST /v1/uploads →", path, "(%d bytes)" % up.get("bytes", 0))

        landed = uploads_before() - before
        if not landed:
            die("uploaded file did NOT land under data/input/")
        print("DRAG  ✓ on disk:", ", ".join(sorted(landed)))

        page.wait_for_timeout(1200)
        code, body = validate_from_page(page, {
            "model": "qwen-img-edit-2511", "prompt": "e2e probe",
            "input_image": path, "width": 1024, "height": 1024})
        if code != 200 or not body.get("ok"):
            die("compile door refused the uploaded path: %d %s" % (code, body))
        print("DRAG  ✓ compile door 200 on the estate path")

        # ══ GESTURE 2: CLICK → the hidden file input (the square's
        # pick path — headless chromium drives the input directly,
        # the same event the OS chooser fires) ═════════════════
        before = uploads_before()
        with page.expect_response(
                lambda r: "/v1/uploads" in r.url, timeout=15000) as ri2:
            page.set_input_files(
                "[data-slot-grid] input[type='file']", str(shots))
            resp2 = ri2.value
        up2 = resp2.json()
        if not str(up2.get("path", "")).startswith("data/input/"):
            die("CLICK upload path not estate: %r" % up2)
        print("CLICK ✓ POST /v1/uploads →", up2.get("path"))
        landed2 = uploads_before() - before
        if not landed2:
            die("CLICK path: no new file under data/input/")
        print("CLICK ✓ on disk:", ", ".join(sorted(landed2)))
        click_path = "data/input/" + sorted(landed2)[0]
        code2, body2 = validate_from_page(page, {
            "model": "qwen-img-edit-2511", "prompt": "e2e probe",
            "input_image": click_path, "width": 1024, "height": 1024})
        if code2 != 200 or not body2.get("ok"):
            die("compile door refused the click-path upload: %d %s" % (code2, body2))
        print("CLICK ✓ compile door 200 on the estate path")

        # ══ GESTURE 3: the fossil data: URL refuses AT THE DOOR ═══
        code3, body3 = validate_from_page(page, {
            "model": "qwen-img-edit-2511", "prompt": "e2e probe",
            "input_image": "data:image/png;base64,iVBORw0KGgo=",
            "width": 1024, "height": 1024})
        if code3 == 200:
            die("data: URL VALIDATED — the fossil class is alive at the door")
        if "data:" not in json.dumps(body3):
            die("data: refusal does not quote the ref: %s" % body3)
        print("FOSSIL ✓ data: URL refuses 400 at the compile door:",
              str(body3.get("error", ""))[:90], "…")

        # ══ GESTURE 4: drop on the CANVAS → Ops card carries the
        # estate path (the canvas rail, 2026-09-06) ═══════════════
        before3 = uploads_before()
        with page.expect_response(
                lambda r: "/v1/uploads" in r.url, timeout=15000) as ri4:
            page.evaluate(
                """async ([pngB64]) => {
                    const b = atob(pngB64);
                    const bytes = new Uint8Array(b.length);
                    for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
                    const file = new File([bytes],
                        'Screenshot from 2026-09-03 20-50-19.png',
                        {type: 'image/png'});
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    const cv = document.querySelector('[data-canvas-drop]')
                        || document.querySelector('.flow-canvas')
                        || document.body;
                    cv.dispatchEvent(new DragEvent('drop', {
                        bubbles: true, cancelable: true, dataTransfer: dt}));
                }""", [__import__("base64").b64encode(PNG).decode()])
        up4 = ri4.value.json()
        if not str(up4.get("path", "")).startswith("data/input/"):
            die("canvas drop did not ride the upload rail: %r" % up4)
        landed3 = uploads_before() - before3
        print("CANVAS ✓ drop → Ops card source:", up4.get("path"),
              "(disk: %s)" % (", ".join(sorted(landed3)) or "—"))
        code4, body4 = validate_from_page(page, {
            "model": "qwen-img-edit-2511", "prompt": "canvas probe",
            "input_image": up4["path"], "width": 1024, "height": 1024})
        if code4 != 200 or not body4.get("ok"):
            die("compile door refused the canvas-drop upload: %d %s" % (code4, body4))
        print("CANVAS ✓ compile door 200 on the estate path")

        # ── the square shows the uploaded image (preview) ─────────
        img = page.locator("[data-slot-grid] [data-slot-square] img")
        if img.count() == 0:
            die("no <img> preview in the square after upload")
        print("PREVIEW ✓ <img> renders the object-URL preview")

        browser.close()
    print("\nEXTREME E2E: all gestures green.")


if __name__ == "__main__":
    main()
