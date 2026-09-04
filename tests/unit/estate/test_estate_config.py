"""THE ROOT CONFIG TEST SUITE (operator order 2026-09-04).
Tests the ONE parser (py/estate_config.py) and the endpoint sync
(provision paths) — the two layers that make inference.config.json
the SSOT for the whole estate.

pytest-native; lives in tests/unit/estate/ alongside the other unit tests.
Run: pytest tests/unit/estate/test_estate_config.py -v
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
CONFIG = REPO / "inference.config.json"
ENDPOINT = REPO / "plugins" / "engines" / "comfyui" / "data" / "comfyui_endpoint.json"
# py/ is on sys.path via the root conftest (tests/conftest.py) — no
# per-file insert (fixture audit 2026-09-04, F4).
import estate_config  # noqa: E402


# ── root config shape ──────────────────────────────────────────────────

class TestRootConfigShape:
    """inference.config.json must be a valid JSON object with the
    required model roots and engine entries."""

    @pytest.fixture(autouse=True)
    def _load(self):
        assert CONFIG.is_file(), "inference.config.json missing"
        self.cfg = json.loads(CONFIG.read_text())
        self.models = self.cfg.get("models", {})
        self.engines = self.cfg.get("engines", {})
        self.cu = self.engines.get("comfyui", {})

    def test_models_is_dict(self):
        assert isinstance(self.models, dict)

    def test_read_root_declared(self):
        assert self.models.get("read_root")

    def test_download_root_declared(self):
        assert self.models.get("download_root")

    def test_read_root_absolute(self):
        assert os.path.isabs(self.models["read_root"])

    def test_download_root_absolute(self):
        assert os.path.isabs(self.models["download_root"])

    def test_engines_is_dict(self):
        assert isinstance(self.engines, dict)

    def test_comfyui_declared(self):
        assert "comfyui" in self.engines

    def test_kimodo_declared(self):
        assert "kimodo" in self.engines

    def test_comfyui_url(self):
        assert self.cu.get("url", "").startswith("http")

    def test_comfyui_base(self):
        assert self.cu.get("base")


# ── model_paths resolution ─────────────────────────────────────────────

class TestModelPaths:
    """model_paths resolves per-engine roots from the global roots
    + engines.<name>.base, with endpoint overrides winning when set."""

    def test_comfyui_read_root(self):
        p = estate_config.model_paths("comfyui")
        assert p["read_root"].startswith("/mnt/")
        assert p["read_root"].endswith("image-gen/comfyui")

    def test_comfyui_download_root(self):
        p = estate_config.model_paths("comfyui")
        assert p["download_root"].startswith("/mnt/")

    def test_kimodo_base_subdir(self):
        p = estate_config.model_paths("kimodo")
        assert p["read_root"].endswith("motion/kimodo")

    def test_no_entry_sits_under_global_root(self):
        p = estate_config.model_paths("ffmpeg")
        assert p["read_root"] == self.cfg()["models"]["read_root"]

    def test_endpoint_override_wins(self):
        p = estate_config.model_paths("comfyui",
                                       endpoint_overrides={"model_base_path": "/override"})
        assert p["read_root"] == "/override"

    def test_empty_override_inherits(self):
        base = estate_config.model_paths("comfyui")["read_root"]
        p = estate_config.model_paths("comfyui",
                                       endpoint_overrides={"model_base_path": ""})
        assert p["read_root"] == base

    def test_relative_override_raises(self):
        with pytest.raises(estate_config.RootConfigError):
            estate_config.model_paths("comfyui",
                                       endpoint_overrides={"model_base_path": "relative"})

    @staticmethod
    def cfg():
        return json.loads(CONFIG.read_text())


# ── engine_url resolution ──────────────────────────────────────────────

class TestEngineUrl:
    """engine_url: endpoint override → root config → '' (no default)."""

    def test_root_value(self):
        u = estate_config.engine_url("comfyui")
        assert u.startswith("http")

    def test_matches_root_config(self):
        cu = json.loads(CONFIG.read_text()).get("engines", {}).get("comfyui", {})
        assert estate_config.engine_url("comfyui") == cu.get("url")

    def test_endpoint_override_wins(self):
        u = estate_config.engine_url("comfyui",
                                      endpoint_override="http://override:9999")
        assert u == "http://override:9999"

    def test_empty_override_inherits(self):
        root = estate_config.engine_url("comfyui")
        u = estate_config.engine_url("comfyui", endpoint_override="")
        assert u == root

    def test_engine_without_url(self):
        assert estate_config.engine_url("kimodo") == ""


# ── engine_field resolution ────────────────────────────────────────────

class TestEngineField:
    """engine_field: endpoint override → root config → ''."""

    def test_comfyui_input_dir(self):
        f = estate_config.engine_field("comfyui", "input_dir")
        assert f and os.path.isabs(f)

    def test_override_wins(self):
        f = estate_config.engine_field("comfyui", "input_dir",
                                        endpoint_override="/override/input")
        assert f == "/override/input"

    def test_kimodo_generator(self):
        f = estate_config.engine_field("kimodo", "generator")
        assert f.endswith("kmd-generate")

    def test_kimodo_exporter(self):
        f = estate_config.engine_field("kimodo", "exporter")
        assert f.endswith("export_glb.py")

    def test_missing_field_returns_empty(self):
        assert estate_config.engine_field("comfyui", "nonexistent_field") == ""


# ── engine_port resolution ─────────────────────────────────────────────

class TestEnginePort:
    """engine_port: explicit → port from root config → port from URL → 0."""

    def test_port_from_url(self):
        assert estate_config.engine_port("comfyui") == 18466

    def test_explicit_override_wins(self):
        assert estate_config.engine_port("comfyui",
                                          endpoint_override="9999") == 9999

    def test_empty_override_inherits(self):
        root = estate_config.engine_port("comfyui")
        assert estate_config.engine_port("comfyui",
                                          endpoint_override="") == root

    def test_engine_without_port(self):
        assert estate_config.engine_port("kimodo") == 0


# ── error paths ────────────────────────────────────────────────────────

class TestErrorPaths:
    """The parser refuses misconfigurations loudly."""

    def test_is_exception_subclass(self):
        assert issubclass(estate_config.RootConfigError, Exception)

    def test_relative_root_raises(self):
        with pytest.raises(estate_config.RootConfigError):
            estate_config._abs_root("relative/path", "test_key")

    def test_empty_root_raises(self):
        with pytest.raises(estate_config.RootConfigError):
            estate_config._abs_root("", "test_key")


# ── endpoint sync (provision paths) ────────────────────────────────────

@pytest.fixture(scope="class")
def ep():
    """provision paths syncs 7 derived fields from the root config into
    the comfyui endpoint file — and WRITES the repo-tree endpoint while
    doing so. Snapshot/restore keeps the working tree byte-identical
    after the class (fixture audit 2026-09-04, F2); the sync itself
    runs exactly once per class."""
    backup = ENDPOINT.read_bytes() if ENDPOINT.is_file() else None
    r = subprocess.run(
        [sys.executable, str(REPO / "tools" / "provision.py"), "paths"],
        capture_output=True, text=True, cwd=str(REPO))
    assert r.returncode == 0, "provision paths failed: %s" % r.stderr[:200]
    try:
        yield json.loads(ENDPOINT.read_text())
    finally:
        if backup is not None:
            ENDPOINT.write_bytes(backup)


class TestEndpointSync:
    """provision paths syncs 7 derived fields from the root config
    into the comfyui endpoint file."""

    def test_url_set(self, ep):
        assert ep.get("url", "").startswith("http")

    def test_url_matches_root(self, ep):
        root = estate_config.engine_url("comfyui")
        assert ep["url"] == root

    def test_model_base_path_set(self, ep):
        assert ep.get("model_base_path", "").startswith("/")

    def test_model_download_path_set(self, ep):
        assert ep.get("model_download_path", "").startswith("/")

    def test_input_dir_set(self, ep):
        assert ep.get("input_dir", "")

    def test_output_dir_set(self, ep):
        assert ep.get("output_dir", "")

    def test_boot_cmd_set(self, ep):
        assert ep.get("boot_cmd", "")

    def test_boot_cmd_port_matches_url(self, ep):
        assert "--port 18466" in ep.get("boot_cmd", "")
