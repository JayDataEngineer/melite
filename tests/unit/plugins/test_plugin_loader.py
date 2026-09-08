"""PLUGIN LOADER UNIT WALL — the discovery SSOT's failure modes,
hermetic.

The drift/isolation suites pin the HEALTHY tree (declarations match
dirs, genres deliver models). What nothing pinned was the loader's
own DEGRADATION paths (py/plugins.py) — the 2026-09-05 duck-typing
sweep found every fallthrough SILENT:

  * exec(plugin.py) failures vanished into `except: pass` — a plugin
    whose declaration raised mounted NOTHING, invisibly;
  * a Plugin class with a typo'd `engine =` attribute (no `engines`
    tuple) silently mounted nothing;
  * a broken engine.py fell through to engine.yaml/dirname without a
    word;
  * an undeclared engines/<dir>/ silently mounted under its dirname
    (the banned fallback class);
  * a legacy/compose-first type collision silently ceded (while the
    legacy-vs-legacy duplicate check refused LOUD — inconsistent).

RESILIENCE LAW: skip-and-continue, but LOUDLY — every fallthrough
now documents itself on stderr, and this suite pins both the
behavior AND the loudness. Also pins EngineRef as a frozen row
(PYTHON SHAPE LAW rung 2: the __slots__ duck class is gone).

No GPU, no network. Fixture plugin trees under tmp_path."""

import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import plugins  # noqa: E402


COMPOSE_INIT = "# compose package marker\n"


def _plugin(root: Path, name: str, plugin_py: str | None=None, compose: bool=True,
            category: str="flat") -> tuple[Path, Path]:
    """Write one plugin dir under the scratch scan root; returns its
    path. category='flat' → <root>/<name>; 'cpp' → <root>/cpp/<name>
    (the depth-3 category-container shape)."""
    pdir = (root / category / name) if category == "cpp" \
        else (root / name)
    pdir.mkdir(parents=True, exist_ok=True)
    if plugin_py is not None:
        (pdir / "plugin.py").write_text(plugin_py, encoding="utf-8")
    if compose:
        (pdir / "compose").mkdir(exist_ok=True)
        (pdir / "compose" / "__init__.py").write_text(
            COMPOSE_INIT, encoding="utf-8")
    return root, pdir


GOOD_PLUGIN_PY = (
    "class Plugin:\n"
    "    id = 'demo'\n"
    "    engines = ('demo_engine',)\n"
)


@pytest.fixture()
def scan(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A scratch scan root shaped like packages/engines/ (plugins are
    direct marker-carrying children; category containers like cpp/
    recurse one level); resets the memoized table per test."""
    root = tmp_path / "engines"
    root.mkdir()
    monkeypatch.setattr(plugins, "_PLUGIN_SCAN_ROOTS", [root])
    monkeypatch.setattr(plugins, "_engines", None)
    return root


# ── the healthy mounts ─────────────────────────────────────────────

def test_compose_first_mounts_declared_engines(scan: Path) -> None:
    _plugin(scan, "demo", GOOD_PLUGIN_PY)
    table = plugins.scan_engines()
    assert "demo_engine" in table
    ref = table["demo_engine"]
    assert ref.plugin_id == "demo"
    assert ref.plugin_root.name == "demo"     # mounts the plugin dir


def test_legacy_engine_dir_mounts(scan: Path) -> None:
    root, pdir = _plugin(scan, "legacy", compose=False,
                         plugin_py="class Plugin:\n    id='l'\n")
    edir = pdir / "engines" / "native"
    edir.mkdir(parents=True)
    (edir / "engine.py").write_text(
        "ENGINE_TYPE = 'legacy_native'\n", encoding="utf-8")
    table = plugins.scan_engines()
    assert table["legacy_native"].engine_dir == edir
    # plugin_root DERIVES two levels up (never restated beside it)
    assert table["legacy_native"].plugin_root == pdir


def test_category_containers_recurse(scan: Path) -> None:
    _plugin(scan, "mine", GOOD_PLUGIN_PY, category="cpp")
    assert "demo_engine" in plugins.scan_engines()


# ── the loud degradation paths ─────────────────────────────────────

def test_exec_failure_is_loud_and_mounts_nothing(scan: Path, capsys: pytest.CaptureFixture[str]) -> None:
    _plugin(scan, "broken", "class Plugin(:\n  oops\n")
    table = plugins.scan_engines()
    assert "broken" not in table.values()
    assert all(r.plugin_id != "broken" for r in table.values())
    assert "refuses to exec" in capsys.readouterr().err


def test_plugin_without_engines_is_loud(scan: Path, capsys: pytest.CaptureFixture[str]) -> None:
    # the typo class: `engine =` instead of `engines =`
    _plugin(scan, "typo", "class Plugin:\n    id = 'typo'\n"
                          "    engine = ('x',)\n")
    table = plugins.scan_engines()
    assert not table
    err = capsys.readouterr().err
    assert "NO engines tuple" in err


def test_plugin_py_without_plugin_class_is_loud(scan: Path, capsys: pytest.CaptureFixture[str]) -> None:
    _plugin(scan, "noclass", "PLUGIN = 1\n")
    assert not plugins.scan_engines()
    assert "without a Plugin class" in capsys.readouterr().err


def test_broken_engine_py_falls_through_loud_to_yaml(scan: Path, capsys: pytest.CaptureFixture[str]) -> None:
    root, pdir = _plugin(scan, "legacy", compose=False)
    edir = pdir / "engines" / "native"
    edir.mkdir(parents=True)
    (edir / "engine.py").write_text("this is not python\n",
                                    encoding="utf-8")
    (edir / "engine.yaml").write_text("type: yaml_native\n",
                                      encoding="utf-8")
    table = plugins.scan_engines()
    assert "yaml_native" in table            # the documented fallback
    err = capsys.readouterr().err
    assert "refuses to exec" in err          # ...but never silently


def test_undeclared_dir_mounts_under_dirname_loud(scan: Path, capsys: pytest.CaptureFixture[str]) -> None:
    root, pdir = _plugin(scan, "legacy", compose=False)
    edir = pdir / "engines" / "stray"
    edir.mkdir(parents=True)
    (edir / "engine.py").write_text("# no ENGINE_TYPE\n",
                                    encoding="utf-8")
    table = plugins.scan_engines()
    assert table["stray"].engine_type == "stray"
    assert "NO engine declaration" in capsys.readouterr().err


def test_flow_style_plugin_yaml_is_loud_not_silent(scan: Path, capsys: pytest.CaptureFixture[str]) -> None:
    # the line parser speaks block style only — flow style must say
    # so, not silently unmount the plugin
    root, pdir = _plugin(scan, "yamlplug", plugin_py=None)
    (pdir / "plugin.yaml").write_text("engines: [demo_engine]\n",
                                      encoding="utf-8")
    assert not plugins.scan_engines()
    assert "parsed no engines" in capsys.readouterr().err


def test_block_style_plugin_yaml_still_mounts(scan: Path) -> None:
    root, pdir = _plugin(scan, "yamlplug", plugin_py=None)
    (pdir / "plugin.yaml").write_text(
        "engines:\n  - yaml_engine\n", encoding="utf-8")
    assert "yaml_engine" in plugins.scan_engines()


# ── ownership collisions ───────────────────────────────────────────

def test_duplicate_legacy_types_refuse_loud(scan: Path) -> None:
    for name in ("one", "two"):
        root, pdir = _plugin(scan, name, compose=False)
        edir = pdir / "engines" / "e"
        edir.mkdir(parents=True)
        (edir / "engine.py").write_text(
            "ENGINE_TYPE = 'clash'\n", encoding="utf-8")
    with pytest.raises(plugins.ValidationError, match="clash"):
        plugins.scan_engines()


def test_legacy_owns_over_compose_first_loud(scan: Path, capsys: pytest.CaptureFixture[str]) -> None:
    root, pdir = _plugin(scan, "legacy", compose=False)
    edir = pdir / "engines" / "e"
    edir.mkdir(parents=True)
    (edir / "engine.py").write_text(
        "ENGINE_TYPE = 'shared'\n", encoding="utf-8")
    _plugin(scan, "modern", "class Plugin:\n"
                            "    engines = ('shared',)\n")
    table = plugins.scan_engines()
    assert table["shared"].plugin_id == "legacy"
    assert "cedes" in capsys.readouterr().err


# ── EngineRef is a frozen row ──────────────────────────────────────

def test_engine_ref_is_frozen(scan: Path) -> None:
    _plugin(scan, "demo", GOOD_PLUGIN_PY)
    ref = plugins.scan_engines()["demo_engine"]
    with pytest.raises(ValidationError):
        ref.engine_type = "mutated"


def test_engine_ref_refuses_empty_and_riders() -> None:
    with pytest.raises(ValidationError):
        plugins.EngineRef(plugin_id="", engine_dir=Path("/x"),
                          engine_type="t")
    with pytest.raises(ValidationError):
        plugins.EngineRef(plugin_id="p", engine_dir=Path("/x"),
                          engine_type="t", __dead_rider__=1)


def test_scan_is_memoized(scan: Path) -> None:
    _plugin(scan, "demo", GOOD_PLUGIN_PY)
    first = plugins.scan_engines()
    assert plugins.scan_engines() is first   # one walk, then cached
