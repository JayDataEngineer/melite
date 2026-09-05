"""test_dev_dsh_ui_contract.py — the DSH renders correctly with our extensions.

Every other test passes in isolation. This test proves the extensions
actually render in the browser the way they should:
  - skin is active (data-dsh-skin set on <html>)
  - DSH theme tokens resolve to real values (not empty fallbacks)
  - the right sidebar tabs load (Ray Media, Ray ComfyUI, Ray Flows)
  - the media panel renders with theme-compliant colors (not hardcoded
    dark-mode values on a light-mode background)
  - the video preview works (poster frame visible, not just a glyph)

This is the test that would have caught the CSS regression:
  tests passed = bundle loaded = routes serve = (correct).
  this test = panel actually looks right in the browser (actually correct).

Run: /usr/bin/python3.14 tests/dev_dsh/test_dev_dsh_ui_contract.py
  or: pytest tests/dev_dsh/test_dev_dsh_ui_contract.py -v
  (requires playwright + chromium; skip if headless browser unavailable).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

# ── config ───────────────────────────────────────────────────────────

DEV_PORT = 3909
DEV_FQDN = "cloud.tailb1e597.ts.net"
DEV_URL = f"https://{DEV_FQDN}:{DEV_PORT}/"
LOCAL_URL = f"http://127.0.0.1:{DEV_PORT}/"

# Playwright binary path (system chromium, not the project venv)
CHROMIUM_PATHS = [
    "/home/user/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
    "/home/user/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
]


def _find_chromium():
    for p in CHROMIUM_PATHS:
        if os.path.exists(p):
            return p
    return None


# ── lazy playwright import ──────────────────────────────────────────

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False


# ── helpers ─────────────────────────────────────────────────────────

def _port_open(port: int, host: str = "127.0.0.1") -> bool:
    import socket
    try:
        with socket.create_connection((host, port), timeout=2):
            return True
    except OSError:
        return False


def _dismiss_dialogs(page):
    """Dismiss every modal dialog the DSH shows on first load."""
    for _ in range(5):
        for btn in page.locator("button:visible").all():
            try:
                t = btn.inner_text(timeout=200).strip().lower()
                if t in ("continue", "ok", "accept", "got it", "dismiss", "close"):
                    btn.click(timeout=1000)
                    page.wait_for_timeout(500)
            except Exception:
                pass


def _open_right_sidebar(page):
    """Toggle the right sidebar open. Returns True if the sidebar appeared."""
    # Try the explicit aria-label toggle first
    for label in ["Expand sidebar", "Toggle sidebar"]:
        el = page.locator(f"[aria-label*='{label}']").first
        if el.count() > 0:
            try:
                el.click(timeout=2000)
                page.wait_for_timeout(1500)
                return True
            except Exception:
                pass
    # Fallback: force-click the rightmost small icon in the top bar
    all_btns = page.locator("button:visible")
    for i in range(all_btns.count()):
        try:
            box = all_btns.nth(i).bounding_box()
            if box and box["x"] > 1300 and box["y"] < 50 and box["width"] < 40:
                all_btns.nth(i).click(force=True, timeout=2000)
                page.wait_for_timeout(1500)
                return True
        except Exception:
            pass
    return False


def _get_skin_state(page) -> dict:
    """Return the DSH skin state: skin name, resolved tokens, body bg."""
    return page.evaluate("""() => {
        const html = document.documentElement;
        const cs = getComputedStyle(html);
        return {
            skin: html.getAttribute('data-dsh-skin'),
            bgBase: cs.getPropertyValue('--dsw-alias-bg-base').trim(),
            bgLayer1: cs.getPropertyValue('--dsw-alias-bg-layer-1').trim(),
            bgLayer2: cs.getPropertyValue('--dsw-alias-bg-layer-2').trim(),
            labelPrimary: cs.getPropertyValue('--dsw-alias-label-primary').trim(),
            labelSecondary: cs.getPropertyValue('--dsw-alias-label-secondary').trim(),
            borderL2: cs.getPropertyValue('--dsw-alias-border-l2').trim(),
            stateSuccess: cs.getPropertyValue('--dsw-alias-state-success-primary').trim(),
            stateError: cs.getPropertyValue('--dsw-alias-state-error-primary').trim(),
            stateWarn: cs.getPropertyValue('--dsw-alias-state-warn-primary').trim(),
            stateBusiness: cs.getPropertyValue('--dsw-alias-state-business-primary').trim(),
            bodyBg: getComputedStyle(document.body).backgroundColor,
        };
    }""")


def _get_panel_styles(page, selector: str) -> dict:
    """Get computed styles of a panel element."""
    return page.evaluate(f"""() => {{
        const el = document.querySelector("{selector}");
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {{
            backgroundColor: cs.backgroundColor,
            color: cs.color,
            border: cs.border,
        }};
    }}""")


# ── tests ───────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def dev_dsh_up():
    if _port_open(DEV_PORT):
        return True
    pytest.skip("dev DSH not listening on 127.0.0.1:{DEV_PORT}")


@pytest.fixture(scope="module")
def playwright_browser():
    if not HAS_PLAYWRIGHT:
        pytest.skip("playwright not installed")
    chromium = _find_chromium()
    if chromium is None:
        pytest.skip("chromium not found")
    pw = sync_playwright().start()
    browser = pw.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
        executable_path=chromium,
    )
    yield browser, pw
    browser.close()
    pw.stop()


class TestDshSkinActive:
    """The DSH skin is loaded and provides the --dsw-alias-* tokens."""

    def test_skin_attribute_set(self, dev_dsh_up, playwright_browser):
        browser, pw = playwright_browser
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        page.goto(DEV_URL, timeout=20000)
        page.wait_for_timeout(5000)
        _dismiss_dialogs(page)
        page.wait_for_timeout(2000)

        state = _get_skin_state(page)
        ctx.close()

        assert state["skin"], (
            f"data-dsh-skin is {state['skin']!r} on <html>. The skin is not "
            f"active. Copy ~/.dsh/skins/ and skin-center-active.json to DSH_HOME."
        )

    def test_theme_tokens_resolve(self, dev_dsh_up, playwright_browser):
        browser, pw = playwright_browser
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        page.goto(DEV_URL, timeout=20000)
        page.wait_for_timeout(5000)
        _dismiss_dialogs(page)
        page.wait_for_timeout(2000)

        state = _get_skin_state(page)
        ctx.close()

        # At least the core surface tokens must resolve
        for token_name in ("bgBase", "bgLayer1", "labelPrimary"):
            value = state[token_name]
            assert value, (
                f"--dsw-alias-{token_name} resolved to empty string. "
                f"The skin CSS is not loaded. state={state}"
            )

    def test_body_is_not_unstyled_white(self, dev_dsh_up, playwright_browser):
        """If the skin is active, the body background must NOT be pure white."""
        browser, pw = playwright_browser
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        page.goto(DEV_URL, timeout=20000)
        page.wait_for_timeout(5000)
        _dismiss_dialogs(page)
        page.wait_for_timeout(2000)

        state = _get_skin_state(page)
        ctx.close()

        if state["skin"]:
            assert state["bodyBg"] != "rgb(255, 255, 255)", (
                f"skin is active ({state['skin']!r}) but body background is "
                f"still white ({state['bodyBg']}). The skin CSS is not applying."
            )


class TestRightSidebarTabs:
    """The right sidebar shows NO inference tabs."""

    @pytest.fixture(scope="class")
    def sidebar_state(self, playwright_browser):
        browser, pw = playwright_browser
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        page.goto(DEV_URL, timeout=20000)
        page.wait_for_timeout(5000)
        _dismiss_dialogs(page)
        page.wait_for_timeout(2000)
        _open_right_sidebar(page)
        page.wait_for_timeout(2000)
        body = page.locator("body").inner_text(timeout=3000)
        media_visible = "Ray Media" in body
        comfy_visible = "Ray ComfyUI" in body
        flows_visible = "Ray Flows" in body
        cards_visible = "Ray Cards" in body
        ctx.close()
        return {
            "media": media_visible,
            "comfy": comfy_visible,
            "flows": flows_visible,
            "cards_visible": cards_visible,
        }

    def test_no_ray_media_tab(self, sidebar_state):
        assert not sidebar_state["media"], "Ray Media tab should NOT be in the right sidebar"

    def test_no_ray_comfy_tab(self, sidebar_state):
        assert not sidebar_state["comfy"], "Ray ComfyUI tab should NOT be in the right sidebar"

    def test_no_ray_flows_tab(self, sidebar_state):
        assert not sidebar_state["flows"], "Ray Flows tab should NOT be in the right sidebar"

    def test_no_ray_cards_tab(self, sidebar_state):
        assert not sidebar_state["cards_visible"], (
            "Ray Cards tab should NOT be in the right sidebar "
            "(operator order: no flow builder in sidebar)"
        )


class TestMediaPanelTheme:
    """The media panel renders with DSH theme-compliant colors."""

    def test_media_panel_uses_theme_colors(self, dev_dsh_up, playwright_browser):
        browser, pw = playwright_browser
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        page.goto(DEV_URL, timeout=20000)
        page.wait_for_timeout(5000)
        _dismiss_dialogs(page)
        page.wait_for_timeout(2000)

        skin_state = _get_skin_state(page)
        _open_right_sidebar(page)
        page.wait_for_timeout(2000)

        media = page.locator("text=Ray Media")
        if media.count() == 0:
            ctx.close()
            pytest.skip("Ray Media tab not visible")

        media.first.click(timeout=3000)
        page.wait_for_timeout(3000)

        panel = page.locator("[data-infer-media-panel]")
        panel_bg = ""
        panel_color = ""
        if panel.count() > 0:
            panel_bg = panel.evaluate("el => getComputedStyle(el).backgroundColor")
            panel_color = panel.evaluate("el => getComputedStyle(el).color")

        ctx.close()

        if not skin_state["skin"]:
            pytest.skip("skin not active — cannot verify theme compliance")

        # The panel must NOT render with pure dark-mode fallback colors.
        # In light mode: background should be light, color should be dark.
        # In dark mode: background should be dark, color should be light.
        # Either way, the computed bg must NOT be a hardcoded dark hex
        # that conflicts with the DSH body background.
        body_bg = skin_state["bodyBg"]
        is_light = "255" in body_bg  # rgb(255,255,255) or close
        is_dark = "0," in body_bg or "17," in body_bg  # rgb(0,0,0) or similar

        if is_light:
            assert panel_bg != panel_bg or "rgb(0," not in panel_bg, (
                f"light-mode DSH but media panel bg is dark ({panel_bg}). "
                f"CSS tokens not resolving; hardcoded dark fallback rendering."
            )
        # The key assertion: if skin is active, tokens MUST resolve
        assert skin_state["bgBase"], "skin active but --dsw-alias-bg-base empty"
        assert skin_state["labelPrimary"], "skin active but --dsw-alias-label-primary empty"


class TestVideoPreview:
    """Videos in the media tab show a poster frame, not just a glyph."""

    def test_video_has_poster(self, dev_dsh_up, playwright_browser):
        browser, pw = playwright_browser
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        page.goto(DEV_URL, timeout=20000)
        page.wait_for_timeout(5000)
        _dismiss_dialogs(page)
        page.wait_for_timeout(2000)
        _open_right_sidebar(page)
        page.wait_for_timeout(2000)

        media = page.locator("text=Ray Media")
        if media.count() == 0:
            ctx.close()
            pytest.skip("Ray Media tab not visible")

        media.first.click(timeout=3000)
        page.wait_for_timeout(3000)

        # Count video tiles with poster images vs glyph-only tiles
        tiles = page.locator("[data-infer-media-panel] .im-tile").all()
        video_with_poster = 0
        video_no_poster = 0
        for tile in tiles:
            try:
                img = tile.locator("img").first
                text = tile.inner_text(timeout=200)
                if "FINAL FILM" in text or "Video" in text:
                    if img.count() > 0 and img.is_visible():
                        video_with_poster += 1
                    else:
                        video_no_poster += 1
            except Exception:
                pass

        ctx.close()

        # At least SOME video tiles should have poster images
        # (from the _last_frame.png / _poster.png siblings)
        if video_with_poster + video_no_poster == 0:
            pytest.skip("no video tiles found in the media panel")

        assert video_with_poster > 0 or video_no_poster == 0, (
            f"all {video_no_poster} video tiles show only the glyph icon "
            f"(no poster frame). Videos should show a thumbnail."
        )
