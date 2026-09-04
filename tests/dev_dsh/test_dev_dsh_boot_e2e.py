#!/usr/bin/env python3.14
"""test_dev_dsh_boot_e2e.py — browser-side boot gate for the dev DSH.

WHY A SEPARATE FILE

The host-side boot (Node process) completes cleanly even when a plugin
inject dep is unsatisfiable — the failure surfaces in the BROWSER-side
boot (the web-app asserts every entry is active after the Loader
settles; pending entries throw an Error the browser UI renders as a
'Failed to load plugins' card). The host log only shows `dsh web: URL`
and nothing about the failure. So we need a real headless browser to
catch it.

The estate's pytest venv (3.13) does NOT carry playwright (it's a
heavy dep that's only relevant for the editor package). This file
runs on the system python3.14 which has it; it is NOT collected by
the main pytest run. Invoke it directly:

  /usr/bin/python3.14 tests/dev_dsh/test_dev_dsh_boot_e2e.py

The "did not activate" failure modes we catch:

  * "Failed to load plugins" (browser-side card title)
  * "pending (waiting for service[s]: ...)" (per-plugin line)
  * "<n> entries did not activate" (the thrown Error message text)

If ANY of those surface, the dev DSH is broken — a plugin is wired
into the bundle but its service dep is never registered.
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

# Playwright is python3.14-only on this host (not in the project venv).
# Importing happens at module top; if it fails the user gets a clear
# "playwright not installed" error instead of an obscure AttributeError.
try:
    from playwright.sync_api import sync_playwright
except ImportError as e:
    print(f"playwright not importable on this python ({sys.executable}): {e}",
          file=sys.stderr)
    print("This test must be run with /usr/bin/python3.14, not the project venv.",
          file=sys.stderr)
    sys.exit(2)

# ---------------------------------------------------------------------------
# Config — match the launcher + dev profile.
# ---------------------------------------------------------------------------

DEV_PORT = 3909
DEV_URL = f"https://cloud.tailb1e597.ts.net:{DEV_PORT}/"
# Fall back to local direct if the tailnet FQDN isn't available.
LOCAL_URL = f"http://127.0.0.1:{DEV_PORT}/"

# Chromium 1234 is what's available; python's playwright wants 1223
# (downloaded by `playwright install`). Reuse the existing binary
# instead of forcing a 200MB download.
CHROMIUM_PATHS = [
    "/home/user/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
    "/home/user/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
]


def find_chromium() -> str | None:
    for p in CHROMIUM_PATHS:
        if os.path.exists(p):
            return p
    return None


# Strings the browser boot UI uses to render plugin failure. ANY of
# these in the rendered body means a plugin inject dep is unsatisfied.
# Source: deepseek-harness/packages/bundle/web-app/src/boot-ui.ts (the
# `setState("failed")` + `page.fail()` paths), and the loader's
# `assertEntriesActive` in the web-app bundle.
BOOT_FAILURE_PATTERNS = (
    "Failed to load plugins",
    "did not activate",
    "pending (waiting for service",
    "pending (waiting for services",
)


def page_is_healthy(page) -> tuple[bool, str]:
    """Return (ok, detail). ok=False if any boot failure pattern shows.

    We also confirm a positive signal (the page actually rendered the
    DSH shell, not a blank error page) — otherwise a TLS handshake
    failure could masquerade as 'no failures found'.
    """
    body = page.locator("body").inner_text(timeout=5000)
    matched = [p for p in BOOT_FAILURE_PATTERNS if p in body]
    if matched:
        return False, f"boot failure pattern(s) in page body: {matched}"
    # Positive signal: the DSH shell renders the New Session screen
    # (the post-sidebar-retirement baseline: no Cards/Files/Media
    # sidebar entries — those surfaces were retired on operator order
    # 2026-09-04). A page where we got neither the failure patterns
    # NOR the shell is a transport error (TLS, server down, blank).
    has_shell = ("New Session" in body
                 and ("Settings" in body or "Workspaces" in body))
    if not has_shell:
        return False, (
            "page rendered without failure patterns but ALSO without "
            "the DSH shell (New Session / Workspaces / Settings) — "
            "likely a transport error. "
            f"Body: {body[:200]!r}"
        )
    return True, body[:200]


def main() -> int:
    chrome = find_chromium()
    if chrome is None:
        print("no chromium binary found in", CHROMIUM_PATHS, file=sys.stderr)
        return 2

    launch_opts = dict(
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
        executable_path=chrome,
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_opts)
        ctx = browser.new_context(ignore_https_errors=True)
        page = ctx.new_page()

        page_errors: list[str] = []
        console_errors: list[str] = []
        request_urls: list[str] = []
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on("console", lambda m: console_errors.append(m.text)
                if m.type == "error" else None)
        page.on("request", lambda r: request_urls.append(r.url))

        # Try the tailnet FQDN first (the canonical dev URL); fall back
        # to local direct if it fails.
        url = DEV_URL
        try:
            page.goto(url, timeout=12000)
        except Exception as e:
            print(f"[boot-e2e] tailnet goto failed ({e}); falling back to local")
            url = LOCAL_URL
            page.goto(url, timeout=12000)

        # The boot UI updates incrementally as each plugin transitions
        # PENDING → LOADING → ACTIVE. Give it 5s to settle (most boots
        # complete in <2s on a warm cache).
        page.wait_for_timeout(5000)

        ok, detail = page_is_healthy(page)
        browser.close()

        # ── CLIENT-BUNDLE LOADER SET (2026-09-04 sidebar retirement) ─────
        # The module loader fetches each dsh.client bundle at
        # /plugins/<npm-name>/client.js?rev=<hash>. The set of OUR
        # packages in that list is the browser-side expression of the
        # no-inference-in-the-sidebar policy:
        #   - @melite-plugin/dsh-card-view MUST load (the chat cards —
        #     the main window conversation surface);
        #   - @melite-plugin/dsh-card-deck MUST NOT (its client half was
        #     retired; the package is host-only now);
        #   - @infer-media/dsh-media MUST NOT (the package is deleted);
        #   - @infer-media/dsh-gallery MAY load (its apply is a no-op
        #     claim — mounts nothing).
        fetched = {u.split("/plugins/")[-1].split("/client.js")[0]
                   for u in request_urls if "/plugins/" in u and "/client.js" in u}
        must_load = {"@melite-plugin/dsh-card-view"}
        must_not_load = {"@melite-plugin/dsh-card-deck", "@infer-media/dsh-media"}
        missing_load = must_load - fetched
        illegal_load = must_not_load & fetched
        if missing_load or illegal_load:
            print(f"[boot-e2e] FAIL — client-bundle loader set drifted at {url}",
                  file=sys.stderr)
            if missing_load:
                print(f"[boot-e2e] approved bundles the loader did NOT fetch: "
                      f"{sorted(missing_load)} (the chat cards will not render)",
                      file=sys.stderr)
            if illegal_load:
                print(f"[boot-e2e] retired/deleted bundles the loader DID fetch: "
                      f"{sorted(illegal_load)} — the sidebar retirement regressed",
                      file=sys.stderr)
            print(f"[boot-e2e] full fetched set: {sorted(fetched)}", file=sys.stderr)
            return 1

        if ok:
            print(f"[boot-e2e] OK — dev DSH booted cleanly at {url}")
            print(f"[boot-e2e] body preview: {detail}")
            print(f"[boot-e2e] client bundles loaded: {len(fetched)} "
                  f"(incl. card-view; deck/media correctly absent)")
            return 0

        print(f"[boot-e2e] FAIL — dev DSH boot is broken at {url}", file=sys.stderr)
        print(f"[boot-e2e] detail: {detail}", file=sys.stderr)
        if page_errors:
            print("[boot-e2e] page errors:", file=sys.stderr)
            for e in page_errors[:5]:
                print(f"  - {e[:300]}", file=sys.stderr)
        if console_errors:
            print("[boot-e2e] console errors:", file=sys.stderr)
            for e in console_errors[:5]:
                print(f"  - {e[:300]}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
