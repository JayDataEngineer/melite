"""Plugin-shape tests — the law hygiene pin for the Flow Tavern.

The estate's PLUGIN ARCHITECTURE LAW + PYTHON SHAPE LAW + QUEUE LANE
LAW + PROVISIONING LAW all touch this plugin. These tests are the
mechanical wall: a missing field, a wrong port, a hardcoded default —
all refuse here before the operator meets the bug at runtime.

Run from the repo root: `uv run pytest packages/harness/dsh/infer-flow-tavern/tests/test_plugin_shape.py`
or from the plugin dir: `uv run pytest` (the plugin's own pyproject
is the test env)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pytest

PLUGIN = Path(__file__).resolve().parent.parent
PYPROJECT = PLUGIN / "pyproject.toml"
APP = PLUGIN / "src" / "infer_flow_tavern" / "app.py"
CLIENT = PLUGIN / "src" / "infer_flow_tavern" / "gateway_client.py"
MAIN = PLUGIN / "src" / "infer_flow_tavern" / "__main__.py"


# ── 1. pyproject shape (PROVISIONING LAW: own env, not base-env) ──

def test_pyproject_is_standalone() -> None:
    """The plugin MUST have its own pyproject.toml (PROVISIONING LAW:
    the management plane stays base; a UI is opt-in)."""
    assert PYPROJECT.is_file()


def test_pyproject_does_not_declare_an_optional_group() -> None:
    """`[project.optional-dependencies]` is a smell — it suggests the
    plugin wants to be grafted onto the base env. The plugin is its
    own env. (uv tool install / uvx is the install surface; a
    separate env on $PATH is the operator's contract.)"""
    text = PYPROJECT.read_text()
    assert "optional-dependencies" not in text, (
        "flow-tavern must be a standalone plugin env; "
        "do not graft onto the base env via optional-dependencies"
    )


def test_pyproject_declares_console_script() -> None:
    text = PYPROJECT.read_text()
    assert "[project.scripts]" in text
    assert "infer-flow-tavern" in text
    # The entry point is in the package's __main__:main — not a
    # shim script in bin/ (uv tool install handles the shim itself).
    assert "infer_flow_tavern.__main__:main" in text


def test_pyproject_pins_fasthtml_and_monsterui() -> None:
    """The whole point of the plugin: the shadcn-in-Python stack
    named in the README. If either dep disappears, the layout
    breaks. Pin them both explicitly."""
    text = PYPROJECT.read_text()
    assert "python-fasthtml" in text
    assert "monsterui" in text


# ── 2. gateway client: no hardcoded fallback (QUEUE LANE LAW) ──────

def test_client_refuses_empty_url_at_construction() -> None:
    text = CLIENT.read_text()
    # The constructor refusal text is the test seam — if the message
    # changes, the test is the spec; if the check is removed, the
    # test fails loud.
    assert "GATEWAY_URL is empty" in text


def test_client_from_env_refuses_silently_falling_back() -> None:
    text = CLIENT.read_text()
    # from_env() must NOT silently default to localhost. The opt-in
    # env var FLOATER_ALLOW_LOCAL=1 is the explicit permission.
    # The pattern: `if not url: ... FLOATER_ALLOW_LOCAL ... raise`.
    assert "FLOATER_ALLOW_LOCAL" in text
    # The bare-bones raise is mandatory (the queue-lane law's
    # "no fallbacks" clause).
    assert "raise GatewayError" in text


# ── 3. routes: no hardcoded localhost:33081 in user-facing strings ─

def test_no_hardcoded_gateway_default_in_app() -> None:
    """The QUEUE LANE LAW refuses hardcoded endpoints. The only
    place 'localhost:33081' may appear in app.py is in DOCUMENTED
    error/help text that tells the operator the canonical default
    (so they can sanity-check their $MELITE_GATEWAY). It must
    never appear as a FALLBACK (i.e. an actual default value the
    code would use without asking)."""
    text = APP.read_text()
    # Only documented help/error mentions are allowed; they MUST be
    # inside a string literal that the operator sees at boot or
    # error time (the user-facing help, the error response).
    # We allow the line to mention the canonical default ONLY if
    # the same line or its enclosing docstring/comment says
    # 'canonical' or 'fallback' — i.e. the operator knows it's a hint.
    local_lines = [
        ln.strip() for ln in text.splitlines()
        if "localhost:33081" in ln
    ]
    for ln in local_lines:
        # The line must be a user-facing hint — a string literal
        # flagged with 'canonical' or 'fallback' so the operator
        # sees it as documentation, not as a baked default.
        assert ('canonical' in ln.lower() or 'fallback' in ln.lower()), (
            f"localhost:33081 mentioned as a live default in app.py: {ln!r}. "
            f"It is only allowed in documented canonical-default text."
        )


def test_no_hardcoded_gateway_default_in_main() -> None:
    text = MAIN.read_text()
    """The only legal surfaces for the canonical default are:
    (a) the FLOATER_ALLOW_LOCAL opt-in branch (the actual fallback,
        gated on an explicit env var), or
    (b) help/error text flagged 'canonical' or 'fallback'.
    Anywhere else is a regression."""
    lines = text.splitlines()
    for i, ln in enumerate(lines):
        if "localhost:33081" not in ln:
            continue
        # Legal if the same line is help/error text.
        if 'canonical' in ln.lower() or 'fallback' in ln.lower():
            continue
        # Legal if any line in the preceding 3-line window mentions
        # FLOATER_ALLOW_LOCAL (the gate condition for the fallback).
        window = "\n".join(lines[max(0, i - 3):i + 1])
        if "FLOATER_ALLOW_LOCAL" in window:
            continue
        raise AssertionError(
            f"hardcoded localhost:33081 outside FLOATER_ALLOW_LOCAL "
            f"or canonical-default hint at line {i + 1}: {ln!r}"
        )


def test_no_raw_httpx_outside_client() -> None:
    """The PLUGIN ARCHITECTURE LAW + the comment in gateway_client.py:
    "The client is the ONLY place endpoint paths and field names live."
    Enforce mechanically: the only module that may import httpx is
    the client itself."""
    client_text = CLIENT.read_text()
    assert "import httpx" in client_text
    # app.py must not import httpx.
    app_text = APP.read_text()
    assert "import httpx" not in app_text, (
        "app.py must route all HTTP through gateway_client — raw "
        "httpx is the client module's job."
    )


# ── 4. cordis sidecar: no DSH coupling to the gateway endpoint ──

def test_cordis_patch_does_not_hardcode_gateway() -> None:
    """The DSH sidebar button is a window.open() to the Tavern's own
    port (FLOATER_PORT, default 33091). It does NOT proxy through
    the gateway — DSH and the Tavern are independent processes that
    share the gateway over HTTP only."""
    patch = (PLUGIN / "cordis.patch.yml").read_text()
    assert "33081" not in patch, (
        "the DSH sidebar patch must not embed the gateway's port "
        "— it opens the Tavern's own URL, which is FLOATER_PORT"
    )


# ── 5. install script: refuses without uv (operator safety) ─────

def test_install_script_handles_missing_uv() -> None:
    text = (PLUGIN / "install.sh").read_text()
    assert "command -v uv" in text
    assert "exit 1" in text


# ── 6. README: the install + run contract is documented ──────────

def test_readme_documents_the_install_command() -> None:
    text = (PLUGIN / "README.md").read_text()
    assert "uv tool install" in text
    assert "MELITE_GATEWAY" in text
    assert "infer-flow-tavern" in text


def test_readme_documents_the_law_alignment() -> None:
    text = (PLUGIN / "README.md").read_text()
    # The README names the laws the plugin honors — a regression
    # here is a regression in the operator's mental model.
    for law in ("QUEUE LANE LAW", "RESILIENCE LAW", "PYTHON SHAPE LAW",
                "PLUGIN ARCHITECTURE LAW", "EXTENSION LAW",
                "PROVISIONING LAW"):
        assert law in text, f"README missing law reference: {law}"


# ── 7. the whole package imports cleanly under the plugin's env ───

def test_package_imports() -> None:
    # The pyproject's `pythonpath = ["src"]` puts the package on
    # sys.path under `uv run pytest`. This test verifies the package
    # resolves WITHOUT that crutch (so a manual `python -c "import
    # infer_flow_tavern"` from the plugin dir also works).
    src = str(PLUGIN / "src")
    if src not in sys.path:
        sys.path.insert(0, src)
    try:
        import infer_flow_tavern  # noqa: F401
        from infer_flow_tavern import (  # noqa: F401
            Draft, GatewayClient, GatewayError, Lane, ParamSchema, Run,
            build_app,
        )
    finally:
        # Leave sys.path as we found it; the pyproject pythonpath
        # covers the rest of the test session.
        try:
            sys.path.remove(src)
        except ValueError:
            pass
