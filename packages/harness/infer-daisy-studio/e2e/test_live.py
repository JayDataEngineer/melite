"Live E2E proofs - real chromium against the live studio and the live gateway."
from __future__ import annotations
import collections.abc
import json
import time
import urllib.request
import pytest
from playwright.sync_api import Page, sync_playwright

# Decoded gateway JSON (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

BASE = "http://127.0.0.1:33092"
GW = "http://localhost:33081"
WARN = "should not be used in production"
TERMINAL = ("succeeded", "completed", "done", "error", "failed", "stopped")


@pytest.fixture(scope="module")
def pg() -> collections.abc.Iterator[Page]:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium-browser",
                                      args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        yield page
        page.context.close()
        browser.close()


def _watch(pg: Page) -> tuple[list[str], list[str]]:
    errors = []
    failed = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("requestfailed", lambda r: failed.append(r.url))
    return errors, failed


def _clean(errors: list[str], failed: list[str]) -> None:
    real = [e for e in errors if WARN not in e]
    assert real == [], str(real)
    assert failed == [], str(failed)


def _gw(path: str) -> JsonValue:
    with urllib.request.urlopen(GW + path, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def test_operate_tab(pg: Page) -> None:
    errors, failed = _watch(pg)
    pg.goto(BASE + "/")
    pg.wait_for_load_state("networkidle")
    body = pg.content()
    assert "Voice Lock" in body
    assert "menu-title" in body
    assert pg.locator(".tab-active").count() == 1
    assert "Operate" in pg.locator(".tab-active").inner_text()
    pg.screenshot(path="/tmp/e2e-op.png")
    _clean(errors, failed)


def test_chat_tab_chrome(pg: Page) -> None:
    errors, failed = _watch(pg)
    pg.goto(BASE + "/chat")
    pg.wait_for_load_state("networkidle")
    assert pg.locator("#chat-form").count() == 1
    assert pg.locator("#chat-prompt").count() == 1
    assert pg.locator("#chat-send").count() == 1
    assert "Chat" in pg.locator(".tab-active").inner_text()
    pg.screenshot(path="/tmp/e2e-chat-empty.png")
    _clean(errors, failed)


def test_gallery_tab(pg: Page) -> None:
    errors, failed = _watch(pg)
    pg.goto(BASE + "/gallery")
    pg.wait_for_load_state("networkidle")
    assert "Gallery" in pg.locator(".tab-active").inner_text()
    pg.screenshot(path="/tmp/e2e-gal.png")
    _clean(errors, failed)


def test_tts_lane_form(pg: Page) -> None:
    errors, failed = _watch(pg)
    pg.goto(BASE + "/flow/tts")
    pg.wait_for_load_state("networkidle")
    assert pg.locator("[name=text]").count() == 1
    assert "Validate" in pg.content()
    assert "Start run" in pg.content()
    pg.screenshot(path="/tmp/e2e-tts.png")
    _clean(errors, failed)

def test_chat_streams_and_renders_markdown(pg: Page) -> None:
    errors, failed = _watch(pg)
    pg.goto(BASE + "/chat?session=e2estream" + str(int(time.time())))
    pg.wait_for_load_state("networkidle")
    pg.fill("#chat-prompt", "E2E **bold** proof")
    pg.locator("#chat-send").click(force=True)
    pg.locator("#message-1-content").wait_for(timeout=30000)
    pg.locator("#message-1-content strong").wait_for(timeout=30000)
    assert "bold" in pg.locator("#message-1-content").inner_text()
    assert pg.locator("#message-0 .chat-bubble-primary").count() == 1
    pg.locator("#chat-send:not([disabled])").wait_for(timeout=30000)
    pg.screenshot(path="/tmp/e2e-chat-stream.png")
    _clean(errors, failed)


def test_new_chat_clears(pg: Page) -> None:
    errors, failed = _watch(pg)
    pg.goto(BASE + "/chat?session=e2eclear" + str(int(time.time())))
    pg.wait_for_load_state("networkidle")
    pg.fill("#chat-prompt", "remember this")
    pg.locator("#chat-send").click(force=True)
    pg.locator("#message-1-content").wait_for(timeout=30000)
    pg.locator("#chat-send:not([disabled])").wait_for(timeout=30000)
    pg.get_by_text("New chat").click()
    pg.get_by_text("Start a conversation").wait_for(timeout=15000)
    _clean(errors, failed)

def test_tts_validate_then_gpu_run(pg: Page) -> None:
    errors, failed = _watch(pg)
    q = _gw("/v1/queue")
    assert q.get("running", 0) == 0, "gpu busy - refusing to stomp a live run"
    pg.goto(BASE + "/flow/tts")
    pg.wait_for_load_state("networkidle")
    pg.fill("[name=text]", "Playwright parity proof.")
    pg.get_by_role("button", name="Validate").click()
    pg.get_by_text("Compile clean").wait_for(timeout=60000)
    pg.get_by_role("button", name="Start run").click()
    pg.get_by_text("Queued run").wait_for(timeout=60000)
    href = pg.locator(".alert-info a").first.get_attribute("href")
    rid = href.split("/")[-1]
    assert len(rid) > 4
    status = ""
    detail = ""
    for _ in range(150):
        time.sleep(5)
        body = _gw("/v1/flows/status/" + rid)
        status = str(body.get("status", "")).lower()
        detail = str(body)[:400]
        if status in TERMINAL:
            break
    assert status == "completed", "run " + rid + " ended as " + status + " " + detail
    full = _gw("/v1/flows/status/" + rid)
    urls = [s.get("url") for s in full.get("stages", []) if s.get("url")]
    assert urls, "completed run exposes no stage artifact url"
    media = urllib.request.urlopen(GW + urls[0], timeout=60)
    blob = media.read()
    assert media.status == 200 and len(blob) > 1000, "artifact bytes missing"
    pg.goto(BASE + "/run/" + rid)
    pg.wait_for_load_state("networkidle")
    assert "completed" in pg.content().lower()
    pg.screenshot(path="/tmp/e2e-run.png")
    pg.goto(BASE + "/gallery")
    pg.wait_for_load_state("networkidle")
    assert rid[:8] in pg.content()
    pg.screenshot(path="/tmp/e2e-gal-run.png")
    _clean(errors, failed)
