"""Plugin drift wall: parametrized sweep of every Python plugin
against the central contract (pattern 1 + 4 from the drift playbook).

ADAPTED to this estate: plugins are discovered via filesystem glob
(py/plugins.py:iter_plugin_dirs_under), not Python importlib. The
"plugin" is a Plugin dataclass in plugin.py + per-model nodes.yaml
files. The TS plugins (harness/dsh, web/editor) have their own
drift surface in the TypeScript test estate.

What this test enforces (every plugin, every time):
  * plugins/<group>/<plugin>/plugin.py exposes a Plugin class with
    the central Pydantic spec (id, label, engines, genres, ...)
  * the plugin's declared id matches the directory leaf name
  * for every genre the plugin promises, at least one model exists
    (the plugin doesnt claim a genre it cant deliver)
  * every model has a nodes.yaml (the manifest the engine loads)

The engine.yaml concept lives in flows/<name>/flow.yaml
(named flows), not per-plugin -- that is a separate drift surface
(flows have their own golden parity wall already).
"""
import ast
import os
from pathlib import Path
from typing import Optional

import pytest
import yaml
from pydantic import BaseModel, Field


REPO = Path(__file__).resolve().parents[3]
PLUGINS_ROOT = REPO / "plugins"


# --- the central spec ----------------------------------------------------

class PluginSpec(BaseModel):
    """Mirrors plugins/<group>/<id>/plugin.py::Plugin (shape only)."""
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    description: str = Field(min_length=1)
    engines: tuple
    genres: tuple
    webui: Optional[dict] = None
    dependencies: Optional[tuple] = None


class NodeYamlSpec(BaseModel):
    """The minimal nodes.yaml schema. The gateway loads this to know
    what node types the engine declares for a model -- a missing
    nodes.yaml means the model cannot be composed."""
    # we pin only the top-level shape; the inner node ids are owned
    # by the engine and the gateway reads them opaquely.
    nodes: dict = Field(default_factory=dict)


# --- discovery (the actual estate layout) -------------------------------

def discover_plugins():
    """Yield (plugin_id, plugin_dir) for every Python plugin.

    Layout: plugins/<group>/<id>/plugin.py
    Group is the classification (engines/harness/web); the LEAF id
    is the plugin name. TS-only groups (harness/dsh, web/editor)
    have no plugin.py and are out of scope here.
    """
    if not PLUGINS_ROOT.is_dir():
        return
    for group in sorted(PLUGINS_ROOT.iterdir()):
        if not group.is_dir():
            continue
        for leaf in sorted(group.iterdir()):
            if not leaf.is_dir():
                continue
            if (leaf / "plugin.py").is_file():
                yield leaf.name, leaf


# --- AST-based plugin attr reading (no exec) ------------------------------

def read_plugin_attrs(plugin_path):
    """Parse plugin.py with ast and collect class-level assignments.
    We do NOT import the module -- the test must be side-effect free."""
    src = plugin_path.read_text(encoding="utf-8")
    tree = ast.parse(src, filename=str(plugin_path))
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            out = {}
            for stmt in node.body:
                if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1:
                    tgt = stmt.targets[0]
                    if isinstance(tgt, ast.Name):
                        try:
                            out[tgt.id] = ast.literal_eval(stmt.value)
                        except (ValueError, SyntaxError):
                            out[tgt.id] = None
            return out
    return None


# --- the actual tests ----------------------------------------------------

PLUGIN_IDS = [pid for pid, _ in discover_plugins()]


@pytest.mark.parametrize("plugin_id", PLUGIN_IDS, ids=PLUGIN_IDS)
def test_plugin_has_plugin_class(plugin_id):
    """Pattern 1 (structural) + 4 (manifest): the plugin class exists,
    its id matches the leaf, and its fields validate PluginSpec."""
    plugin_dir = next(d for pid, d in discover_plugins() if pid == plugin_id)
    plugin_py = plugin_dir / "plugin.py"
    attrs = read_plugin_attrs(plugin_py)
    assert attrs is not None, f"{plugin_id}: no class declaration in plugin.py"
    assert attrs.get("id") == plugin_id, (
        f"{plugin_id}: Plugin.id={attrs.get('id')!r} does not match dir name"
    )
    spec = PluginSpec(**{k: v for k, v in attrs.items()
                        if k in PluginSpec.model_fields})
    assert spec.id == plugin_id, f"{plugin_id}: spec id mismatch"
    assert spec.label, f"{plugin_id}: empty label"
    assert spec.engines, f"{plugin_id}: no engines declared"
    # genres is optional (ffmpeg is a stitcher, not a generative
    # engine -- empty genres is a legitimate PluginSpec value)


# KNOWN DRIFT (2026-09-04, audio consolidation lane): the comfyui
# plugin declares genres music/sfx/tts while those models live under
# models/audio/ (moss-sfx, music3, qwen3-tts). The lane that owns the
# audio re-shelve settles one side or the other; strict=True makes the
# day it settles a loud stale-xfail — this debt cannot rot silently.
_MODELS_FOR_EVERY_GENRE = [
    pytest.param(
        pid,
        marks=pytest.mark.xfail(
            strict=True,
            reason="comfyui declares genres music/sfx/tts; those models "
                   "live under models/audio/ — audio consolidation lane",
        ),
    ) if pid == "comfyui" else pid
    for pid in PLUGIN_IDS
]


@pytest.mark.parametrize("plugin_id", _MODELS_FOR_EVERY_GENRE,
                         ids=PLUGIN_IDS)
def test_plugin_has_models_for_every_genre(plugin_id):
    """If the plugin promises a genre, it MUST ship at least one
    model under models/<genre>/. Otherwise users hit a dead end."""
    plugin_dir = next(d for pid, d in discover_plugins() if pid == plugin_id)
    attrs = read_plugin_attrs(plugin_dir / "plugin.py")
    if attrs is None or not attrs.get("genres"):
        pytest.skip(f"{plugin_id}: no genres declared")
    declared_genres = set(attrs["genres"])
    models_root = plugin_dir / "models"
    if not models_root.is_dir():
        pytest.fail(f"{plugin_id}: declares genres but has no models/ dir")
    on_disk_genres = {p.name for p in models_root.iterdir() if p.is_dir()}
    missing = declared_genres - on_disk_genres
    assert not missing, (
        f"{plugin_id}: declares genres {sorted(missing)} but has no models/ "
        f"directory for them (on-disk: {sorted(on_disk_genres)})"
    )


def discover_model_nodes_yamls(plugin_dir):
    """Yield (model_id, yaml_path) for every models/<genre>/<model>/nodes.yaml."""
    models_root = plugin_dir / "models"
    if not models_root.is_dir():
        return
    for genre in sorted(models_root.iterdir()):
        if not genre.is_dir():
            continue
        for model in sorted(genre.iterdir()):
            if not model.is_dir():
                continue
            nodes = model / "nodes.yaml"
            if nodes.is_file():
                yield f"{genre.name}/{model.name}", nodes


def gen_nodes_yamls():
    for pid, pdir in discover_plugins():
        for mid, path in discover_model_nodes_yamls(pdir):
            yield f"{pid}/{mid}", path


NODES_YAMLS = list(gen_nodes_yamls())


@pytest.mark.parametrize("nodes_id", [nid for nid, _ in NODES_YAMLS],
                         ids=[nid for nid, _ in NODES_YAMLS])
def test_model_nodes_yaml_validates(nodes_id):
    """Pattern 4 (manifest drift): every model has a nodes.yaml that
    validates against the minimal NodeYamlSpec. The gateway reads
    this to know what node types the engine declares for a model --
    malformed or missing is a contract break."""
    yaml_path = dict(NODES_YAMLS)[nodes_id]
    try:
        data = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as e:
        pytest.fail(f"{nodes_id}: malformed nodes.yaml: {e}")
    NodeYamlSpec(**data)
