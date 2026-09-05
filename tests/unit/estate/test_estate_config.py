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
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
CONFIG = REPO / "inference.config.json"
ENDPOINT = REPO / "plugins" / "engines" / "comfyui" / "data" / "comfyui_endpoint.json"
# py/ is on sys.path via the root conftest (tests/conftest.py) — no
# per-file insert (fixture audit 2026-09-04, F4).
import estate_config  # noqa: E402

# A root-config document the cfg_file fixture writes: a JSON object of
# str/int/list leaves and nested maps (models/engines stanzas), or a
# bare list for the not-an-object refusal case.
ConfigDoc = dict[str, str | int | list[str] | dict[str, str | int | dict[str, str | int]]] | list[str]
WriteConfig = Callable[[ConfigDoc], Path]


# ── root config shape ──────────────────────────────────────────────────

class TestRootConfigShape:
    """inference.config.json must be a valid JSON object with the
    required model roots and engine entries."""

    @pytest.fixture(autouse=True)
    def _load(self) -> None:
        assert CONFIG.is_file(), "inference.config.json missing"
        self.cfg = json.loads(CONFIG.read_text())
        self.models = self.cfg.get("models", {})
        self.engines = self.cfg.get("engines", {})
        self.cu = self.engines.get("comfyui", {})

    def test_models_is_dict(self) -> None:
        assert isinstance(self.models, dict)

    def test_read_root_declared(self) -> None:
        assert self.models.get("read_root")

    def test_download_root_declared(self) -> None:
        assert self.models.get("download_root")

    def test_read_root_absolute(self) -> None:
        assert os.path.isabs(self.models["read_root"])

    def test_download_root_absolute(self) -> None:
        assert os.path.isabs(self.models["download_root"])

    def test_engines_is_dict(self) -> None:
        assert isinstance(self.engines, dict)

    def test_comfyui_declared(self) -> None:
        assert "comfyui" in self.engines

    def test_kimodo_declared(self) -> None:
        assert "kimodo" in self.engines

    def test_comfyui_url(self) -> None:
        assert self.cu.get("url", "").startswith("http")

    def test_comfyui_base(self) -> None:
        assert self.cu.get("base")


# ── model_paths resolution ─────────────────────────────────────────────

class TestModelPaths:
    """model_paths resolves per-engine roots from the global roots
    + engines.<name>.base, with endpoint overrides winning when set."""

    def test_comfyui_read_root(self) -> None:
        p = estate_config.model_paths("comfyui")
        assert p["read_root"].startswith("/mnt/")
        assert p["read_root"].endswith("image-gen/comfyui")

    def test_comfyui_download_root(self) -> None:
        p = estate_config.model_paths("comfyui")
        assert p["download_root"].startswith("/mnt/")

    def test_kimodo_base_subdir(self) -> None:
        p = estate_config.model_paths("kimodo")
        assert p["read_root"].endswith("motion/kimodo")

    def test_no_entry_sits_under_global_root(self) -> None:
        p = estate_config.model_paths("ffmpeg")
        assert p["read_root"] == self.cfg()["models"]["read_root"]

    def test_endpoint_override_wins(self) -> None:
        p = estate_config.model_paths("comfyui",
                                       endpoint_overrides={"model_base_path": "/override"})
        assert p["read_root"] == "/override"

    def test_empty_override_inherits(self) -> None:
        base = estate_config.model_paths("comfyui")["read_root"]
        p = estate_config.model_paths("comfyui",
                                       endpoint_overrides={"model_base_path": ""})
        assert p["read_root"] == base

    def test_relative_override_raises(self) -> None:
        with pytest.raises(estate_config.RootConfigError):
            estate_config.model_paths("comfyui",
                                       endpoint_overrides={"model_base_path": "relative"})

    @staticmethod
    def cfg() -> dict[str, dict[str, str | int]]:
        return json.loads(CONFIG.read_text())


# ── engine_url resolution ──────────────────────────────────────────────

class TestEngineUrl:
    """engine_url: endpoint override → root config → '' (no default)."""

    def test_root_value(self) -> None:
        u = estate_config.engine_url("comfyui")
        assert u.startswith("http")

    def test_matches_root_config(self) -> None:
        cu = json.loads(CONFIG.read_text()).get("engines", {}).get("comfyui", {})
        assert estate_config.engine_url("comfyui") == cu.get("url")

    def test_endpoint_override_wins(self) -> None:
        u = estate_config.engine_url("comfyui",
                                      endpoint_override="http://override:9999")
        assert u == "http://override:9999"

    def test_empty_override_inherits(self) -> None:
        root = estate_config.engine_url("comfyui")
        u = estate_config.engine_url("comfyui", endpoint_override="")
        assert u == root

    def test_engine_without_url(self) -> None:
        assert estate_config.engine_url("kimodo") == ""


# ── engine_field resolution ────────────────────────────────────────────

class TestEngineField:
    """engine_field: endpoint override → root config → ''."""

    def test_comfyui_input_dir(self) -> None:
        f = estate_config.engine_field("comfyui", "input_dir")
        assert f and os.path.isabs(f)

    def test_override_wins(self) -> None:
        f = estate_config.engine_field("comfyui", "input_dir",
                                        endpoint_override="/override/input")
        assert f == "/override/input"

    def test_kimodo_generator(self) -> None:
        f = estate_config.engine_field("kimodo", "generator")
        assert f.endswith("kmd-generate")

    def test_kimodo_exporter(self) -> None:
        f = estate_config.engine_field("kimodo", "exporter")
        assert f.endswith("export_glb.py")

    def test_missing_field_returns_empty(self) -> None:
        assert estate_config.engine_field("comfyui", "nonexistent_field") == ""


# ── engine_port resolution ─────────────────────────────────────────────

class TestEnginePort:
    """engine_port: explicit → port from root config → port from URL → 0."""

    def test_port_from_url(self) -> None:
        assert estate_config.engine_port("comfyui") == 18466

    def test_explicit_override_wins(self) -> None:
        assert estate_config.engine_port("comfyui",
                                          endpoint_override="9999") == 9999

    def test_empty_override_inherits(self) -> None:
        root = estate_config.engine_port("comfyui")
        assert estate_config.engine_port("comfyui",
                                          endpoint_override="") == root

    def test_engine_without_port(self) -> None:
        assert estate_config.engine_port("kimodo") == 0


# ── error paths ────────────────────────────────────────────────────────

class TestErrorPaths:
    """The parser refuses misconfigurations loudly."""

    def test_is_exception_subclass(self) -> None:
        assert issubclass(estate_config.RootConfigError, Exception)

    def test_relative_root_raises(self) -> None:
        with pytest.raises(estate_config.RootConfigError):
            estate_config._abs_root("relative/path", "test_key")

    def test_empty_root_raises(self) -> None:
        with pytest.raises(estate_config.RootConfigError):
            estate_config._abs_root("", "test_key")


# ── parse refusals (the pydantic flip, 2026-09-05) ─────────────────────
#
# The config IS a schema: every misconfiguration refuses AT PARSE with
# one field-named RootConfigError — never at some later door, never
# guessed around. These tests write candidate configs to a tmp file and
# point the parser at it (the real inference.config.json stays clean).

GOOD_CFG = {
    "models": {"read_root": "/mnt/models", "download_root": "/mnt/models"},
    "engines": {
        "comfyui": {"base": "image-gen/comfyui",
                    "url": "http://127.0.0.1:18466", "port": 18466},
        "kimodo": {"base": "motion/kimodo",
                   "generator": "/opt/kimodo/bin/kmd-generate"},
    },
}


@pytest.fixture()
def cfg_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> WriteConfig:
    """Point estate_config at a scratch config file; write_config()
    returns a helper the test drives."""
    f = tmp_path / "inference.config.json"
    monkeypatch.setattr(estate_config, "ROOT_CONFIG", f)
    def write(cfg: ConfigDoc) -> Path:
        f.write_text(json.dumps(cfg), encoding="utf-8")
        return f
    return write


class TestParseRefusals:
    """load() refuses malformed configs AT PARSE (PYTHON SHAPE LAW:
    an invalid config cannot be CONSTRUCTED)."""

    def test_missing_file_refuses(self, cfg_file: WriteConfig, tmp_path: Path) -> None:
        # nothing written — the file does not exist
        with pytest.raises(estate_config.RootConfigError, match="missing"):
            estate_config.load()

    def test_bad_json_refuses(self, cfg_file: WriteConfig) -> None:
        cfg_file(GOOD_CFG)
        p = estate_config.ROOT_CONFIG
        p.write_text("{not json", encoding="utf-8")
        with pytest.raises(estate_config.RootConfigError, match="not valid JSON"):
            estate_config.load()

    def test_non_object_refuses(self, cfg_file: WriteConfig) -> None:
        cfg_file(["a", "list"])
        with pytest.raises(estate_config.RootConfigError, match="refuses at parse"):
            estate_config.load()

    def test_missing_models_stanza_refuses(self, cfg_file: WriteConfig) -> None:
        cfg_file({"engines": {}})
        with pytest.raises(estate_config.RootConfigError, match="models"):
            estate_config.load()

    def test_missing_roots_refuse(self, cfg_file: WriteConfig) -> None:
        cfg_file({"models": {}})
        with pytest.raises(estate_config.RootConfigError, match="read_root"):
            estate_config.load()

    def test_relative_root_refuses_at_parse(self, cfg_file: WriteConfig) -> None:
        cfg = {"models": {"read_root": "relative/path",
                          "download_root": "/mnt/models"}}
        cfg_file(cfg)
        with pytest.raises(estate_config.RootConfigError,
                           match="must be ABSOLUTE"):
            estate_config.load()

    def test_typo_top_level_key_refuses(self, cfg_file: WriteConfig) -> None:
        # the duck-typed era let "model:" ride silently — the closed
        # top level kills the typo class
        cfg = dict(GOOD_CFG, model={"read_root": "/x"})
        cfg_file(cfg)
        with pytest.raises(estate_config.RootConfigError, match="model"):
            estate_config.load()

    def test_engines_not_a_map_refuses(self, cfg_file: WriteConfig) -> None:
        cfg = dict(GOOD_CFG, engines=["comfyui"])
        cfg_file(cfg)
        with pytest.raises(estate_config.RootConfigError, match="engines"):
            estate_config.load()

    def test_engine_entry_not_an_object_refuses(self, cfg_file: WriteConfig) -> None:
        # the duck-typed era silently treated this as "no entry"
        cfg = dict(GOOD_CFG, engines={"comfyui": "http://x:1"})
        cfg_file(cfg)
        with pytest.raises(estate_config.RootConfigError, match="comfyui"):
            estate_config.load()

    def test_garbage_port_refuses_at_parse(self, cfg_file: WriteConfig) -> None:
        # the duck-typed era let port:"abc" silently fall through to
        # the URL parse — now it dies loud at the parse
        cfg = {"models": GOOD_CFG["models"],
               "engines": {"comfyui": {"port": "not-a-port"}}}
        cfg_file(cfg)
        with pytest.raises(estate_config.RootConfigError, match="port"):
            estate_config.load()

    def test_error_names_the_field(self, cfg_file: WriteConfig) -> None:
        cfg_file({"models": {"read_root": "rel", "download_root": "/m"}})
        with pytest.raises(estate_config.RootConfigError,
                           match="read_root"):
            estate_config.load()


class TestParseAccepts:
    """The schema accepts the honest shapes (frozen, typed rows)."""

    def test_good_config_loads_typed(self, cfg_file: WriteConfig) -> None:
        cfg_file(GOOD_CFG)
        cfg = estate_config.load()
        assert isinstance(cfg, estate_config.RootConfig)
        assert cfg.models.read_root == "/mnt/models"
        assert cfg.engine("comfyui").url == "http://127.0.0.1:18466"

    def test_config_without_engines_loads(self, cfg_file: WriteConfig) -> None:
        cfg_file({"models": GOOD_CFG["models"]})
        assert estate_config.load().engines == {}

    def test_rows_are_frozen(self, cfg_file: WriteConfig) -> None:
        cfg_file(GOOD_CFG)
        cfg = estate_config.load()
        with pytest.raises(Exception):
            cfg.models.read_root = "/other"

    def test_engine_vocabulary_is_typed(self, cfg_file: WriteConfig) -> None:
        cfg_file(GOOD_CFG)
        cfg = estate_config.load()
        # kimodo's generator is a DECLARED field (closed key set —
        # a typo'd engine key refuses at parse, never a silent "")
        assert cfg.engine("kimodo").field("generator") == \
            "/opt/kimodo/bin/kmd-generate"
        assert cfg.engine("kimodo").field("nope") == ""

    def test_typo_engine_key_refuses(self, cfg_file: WriteConfig) -> None:
        # the duck-typed era returned "" for a typo'd key — the closed
        # engine vocabulary kills the typo class at parse
        cfg = {"models": GOOD_CFG["models"],
               "engines": {"comfyui": {"input_dirs": "/x"}}}
        cfg_file(cfg)
        with pytest.raises(estate_config.RootConfigError,
                           match="input_dirs"):
            estate_config.load()

    def test_unknown_engine_is_the_empty_row(self, cfg_file: WriteConfig) -> None:
        cfg_file(GOOD_CFG)
        e = estate_config.load().engine("never-configured")
        assert e.base == "" and e.url == "" and e.port is None

    def test_string_port_coerces_like_the_int_it_wrote(self, cfg_file: WriteConfig) -> None:
        # pydantic lax coercion == the old int(p) attempt: "18466" is
        # the port 18466, not a refusal
        cfg = {"models": GOOD_CFG["models"],
               "engines": {"comfyui": {"port": "18466"}}}
        cfg_file(cfg)
        assert estate_config.load().engine("comfyui").port == 18466

    def test_port_derives_from_url_when_unset(self, cfg_file: WriteConfig) -> None:
        cfg = {"models": GOOD_CFG["models"],
               "engines": {"comfyui": {"url": "http://127.0.0.1:18466"}}}
        cfg_file(cfg)
        assert estate_config.engine_port("comfyui") == 18466

    def test_engine_field_reads_declared_fields_too(self, cfg_file: WriteConfig) -> None:
        cfg_file(GOOD_CFG)
        assert estate_config.engine_field("comfyui", "base") == \
            "image-gen/comfyui"
        assert estate_config.engine_field("comfyui", "port") == "18466"

    def test_model_paths_from_scratch_config(self, cfg_file: WriteConfig) -> None:
        cfg_file(GOOD_CFG)
        p = estate_config.model_paths("comfyui")
        assert p["read_root"] == "/mnt/models/image-gen/comfyui"
        assert estate_config.model_paths("kimodo")["read_root"] == \
            "/mnt/models/motion/kimodo"


# ── endpoint sync (provision paths) ────────────────────────────────────

@pytest.fixture(scope="class")
def ep() -> Iterator[dict[str, str | dict[str, str]]]:
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

    def test_url_set(self, ep: dict[str, str | dict[str, str]]) -> None:
        assert ep.get("url", "").startswith("http")

    def test_url_matches_root(self, ep: dict[str, str | dict[str, str]]) -> None:
        root = estate_config.engine_url("comfyui")
        assert ep["url"] == root

    def test_model_base_path_set(self, ep: dict[str, str | dict[str, str]]) -> None:
        assert ep.get("model_base_path", "").startswith("/")

    def test_model_download_path_set(self, ep: dict[str, str | dict[str, str]]) -> None:
        assert ep.get("model_download_path", "").startswith("/")

    def test_input_dir_set(self, ep: dict[str, str | dict[str, str]]) -> None:
        assert ep.get("input_dir", "")

    def test_output_dir_set(self, ep: dict[str, str | dict[str, str]]) -> None:
        assert ep.get("output_dir", "")

    def test_boot_cmd_set(self, ep: dict[str, str | dict[str, str]]) -> None:
        assert ep.get("boot_cmd", "")

    def test_boot_cmd_port_matches_url(self, ep: dict[str, str | dict[str, str]]) -> None:
        assert "--port 18466" in ep.get("boot_cmd", "")
