"""test_editor_served_bundle.py — what the user ACTUALLY downloads.

The editor dist is rebuilt on demand and served by the card-deck
host at /editor/. Three sessions in a row, a fix landed in src but
the SERVED dist was stale (or vice versa): the capability-grid text
was deleted from src but the built chunk still shipped it; the
events client switched to the query-form URL but the deployed
chunk still had the path form. Nobody noticed because the tests
read src, not the served bytes.

This gate fetches the REAL HTML + every JS chunk the browser would
download and asserts the shipped-string contract:

  - the query-form events URL is IN (the WS fix is deployed);
  - the retired capability-grid copy is OUT;
  - the action-card picker copy is IN;
  - no chunk references the retired /ray-deck/ API;
  - no chunk references the retired infer-media routes.

Run: pytest tests/dev_dsh/test_editor_served_bundle.py -v
"""
from __future__ import annotations

import re
import urllib.request
import ssl

import pytest

REPO = None  # not needed; everything probes the live origin

DEV_PORT = 3909
DEV_TAILNET_FQDN = "cloud.tailb1e597.ts.net"
ORIGIN = f"https://{DEV_TAILNET_FQDN}:{DEV_PORT}"

_ctx = ssl.create_default_context()
_ctx.check_hostname = False
_ctx.verify_mode = ssl.CERT_NONE


def _get(url: str, timeout: float = 20.0) -> tuple[int, str]:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout, context=_ctx) as r:
            return r.status, r.read().decode("utf-8", errors="replace")
    except Exception as e:
        return 0, str(e)


@pytest.fixture(scope="module")
def dev_dsh_up():
    import socket
    try:
        s = socket.create_connection((DEV_TAILNET_FQDN, DEV_PORT), timeout=3)
        s.close()
    except OSError:
        pytest.skip(f"dev DSH not listening on :{DEV_PORT}")
    return True


@pytest.fixture(scope="module")
def editor_html(dev_dsh_up) -> str:
    status, html = _get(f"{ORIGIN}/editor/")
    assert status == 200, f"GET /editor/ returned {status}: {html[:200]!r}"
    return html


@pytest.fixture(scope="module")
def asset_paths(editor_html) -> list[str]:
    """Every JS chunk URL referenced by the served HTML."""
    paths = sorted(set(re.findall(r'assets/[A-Za-z0-9_.-]+\.js', editor_html)))
    assert paths, (
        "the served /editor/ HTML references no JS assets — the dist "
        "index is broken or the build never ran"
    )
    return paths


@pytest.fixture(scope="module")
def all_js(asset_paths) -> str:
    """The concatenation of every served JS chunk (the bytes a browser
    downloads on first paint)."""
    chunks: list[str] = []
    for p in asset_paths:
        status, body = _get(f"{ORIGIN}/editor/{p}")
        assert status == 200, f"GET /editor/{p} returned {status}"
        chunks.append(body)
    return chr(10).join(chunks)


class TestEditorServedBundle:
    """The served dist carries the shipped fixes and none of the
    retired surfaces. These assertions read the DEPLOYED bytes —
    a stale dist or a half-finished rebuild fails here, not in a
    browser session."""

    def test_query_form_events_url_is_deployed(self, all_js):
        """The events WS client must use the query form
        (?run_id=...) — the form the DSH exact-path tunnel law
        requires. The path form died with the 2026-09-04 live bug
        fix; a dist built from stale src still has it."""
        assert "run_id=" in all_js, (
            "the served editor JS does not contain the query-form "
            "events URL (run_id=...). The dist predates the WS fix "
            "or the client regressed to the path form — live run "
            "feedback inside the DSH embed will be silent."
        )

    def test_retired_capability_grid_copy_is_gone(self, all_js):
        """The capability-grid question was deleted with the
        one-surface picker order (2026-09-04: the action cards are
        the ONE surface). A served copy means the dist is stale."""
        assert "What do you want to make" not in all_js, (
            "the served editor JS still contains the retired "
            "capability-grid copy. The dist is stale relative to "
            "src — rebuild plugins/web/editor."
        )

    def test_action_card_picker_copy_is_deployed(self, all_js):
        """The one-surface picker headline must be IN the served
        bytes — proves the dist is NEWER than the picker rewrite."""
        assert "Your action cards" in all_js, (
            "the served editor JS lacks the action-card picker "
            "headline. The dist predates the one-surface rewrite — "
            "rebuild plugins/web/editor."
        )

    def test_no_retired_ray_deck_routes_in_served_js(self, all_js):
        """No served chunk may reference the retired /ray-deck/ API.
        A reference means either a stale chunk or a src file that
        still imports the dead door."""
        assert "/ray-deck/" not in all_js, (
            "the served editor JS references the retired /ray-deck/ "
            "API. Either the dist is stale or a src module still "
            "calls the dead door (it would 404 at runtime)."
        )

    def test_no_retired_infer_media_routes_in_served_js(self, all_js):
        """No served chunk may reference the retired infer-media
        routes (the package was deleted with the sidebar
        retirement)."""
        assert "infer-media" not in all_js, (
            "the served editor JS references infer-media routes. "
            "Either the dist is stale or a src module still calls "
            "the deleted media-plugin package."
        )

    def test_every_asset_chunk_is_fresh_over_http(self, asset_paths):
        """Every chunk referenced by the HTML is actually served
        (a 404 on a hashed chunk name = the dist was rebuilt AFTER
        the HTML was cached, or a file was deleted mid-deploy)."""
        for p in asset_paths:
            status, _ = _get(f"{ORIGIN}/editor/{p}")
            assert status == 200, (
                f"GET /editor/{p} returned {status} — the HTML "
                f"references a chunk the host does not serve."
            )
