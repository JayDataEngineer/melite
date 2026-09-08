"""Plugin-shape wall - law hygiene for the daisy studio.

Mechanical pin for PLUGIN ARCH + PYTHON SHAPE + QUEUE LANE + PROVISIONING.
"""

from __future__ import annotations

from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
PYPROJECT = PLUGIN / "pyproject.toml"
APP = PLUGIN / "src" / "infer_daisy_studio" / "app.py"
CLIENT = PLUGIN / "src" / "infer_daisy_studio" / "gateway_client.py"
MAIN = PLUGIN / "src" / "infer_daisy_studio" / "__main__.py"
CHAT = PLUGIN / "src" / "infer_daisy_studio" / "chat.py"


def test_pyproject_is_standalone() -> None:
    assert PYPROJECT.is_file()


def test_pyproject_has_no_optional_group() -> None:
    assert "optional-dependencies" not in PYPROJECT.read_text()


def test_pyproject_declares_console_script() -> None:
    text = PYPROJECT.read_text()
    assert "[project.scripts]" in text
    assert "infer-daisy-studio" in text
    assert "infer_daisy_studio.__main__:main" in text


def test_pyproject_pins_fasthtml_with_monsterui() -> None:
    text = PYPROJECT.read_text()
    assert "python-fasthtml" in text
    assert "monsterui" in text.lower()


def test_client_refuses_empty_url_at_construction() -> None:
    assert "GATEWAY_URL is empty" in CLIENT.read_text()


def test_client_allows_opt_in_local_only() -> None:
    text = CLIENT.read_text()
    assert "FLOATER_ALLOW_LOCAL" in text
    assert "raise GatewayError" in text


def test_no_hardcoded_gateway_default_in_app() -> None:
    for ln in [l.strip() for l in APP.read_text().splitlines() if "localhost:33081" in l]:
        assert "canonical" in ln.lower() or "fallback" in ln.lower(), ln


def test_no_hardcoded_gateway_default_in_main() -> None:
    lines = MAIN.read_text().splitlines()
    for i, ln in enumerate(lines):
        if "localhost:33081" not in ln:
            continue
        if "canonical" in ln.lower() or "fallback" in ln.lower():
            continue
        window = chr(10).join(lines[max(0, i - 3):i + 1])
        assert "ALLOW_LOCAL" in window, "hardcoded default at line " + str(i + 1)


def test_no_raw_httpx_outside_client() -> None:
    for mod in (APP, MAIN, CHAT):
        assert "import httpx" not in mod.read_text(), mod.name


def test_harness_sdk_imported_only_in_chat() -> None:
    assert "from deepseek_harness" in CHAT.read_text()
    for mod in (APP, MAIN, CLIENT):
        assert "from deepseek_harness" not in mod.read_text(), mod.name
        assert "import deepseek_harness" not in mod.read_text(), mod.name


def test_daisy_only_vendored_stack() -> None:
    text = APP.read_text()
    assert "monsterui" not in text
    assert "headers_theme" not in text
    assert "default_hdrs=False" in text
    assert "daisyui.min.css" in text


def test_no_hx_include_without_form() -> None:
    assert "hx_include" not in APP.read_text()


def test_live_reload_is_opt_in_only() -> None:
    assert "live=True" not in APP.read_text()
    assert "live=live" in APP.read_text()
    assert "live=args.reload" in MAIN.read_text()


def test_no_bundled_htmx_downgrade() -> None:
    assert "htmx.org@1.9.12" not in APP.read_text()
    assert "HTMX_JS" not in APP.read_text()

