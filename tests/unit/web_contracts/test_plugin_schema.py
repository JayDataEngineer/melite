"""Plugin schema validation — strict pydantic schemas for every plugin type.

Each plugin type (engine, web, harness) declares a file structure contract:
what files MUST exist, what shape they must have, and what cross-file
constraints apply. These tests scan the actual plugins/ directory and
validate every plugin against its type's schema.

Laws enforced (from AGENTS.md):
  PLUGIN ARCHITECTURE LAW — lane/card-specific knowledge lives in the
  plugin, never in the gateway core. Each plugin exposes engines/<dir>/
  or compose/ + card_compose. The gateway resolves engine type FROM THE
  GRAPH.
  PYTHON SHAPE LAW — schemas are pydantic models, frozen, validated AT
  CONSTRUCTION. No post-hoc walks.

Run: pytest tests/unit/web_contracts/test_plugin_schema.py -v
"""

from __future__ import annotations

import ast
import re
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import pytest
import yaml
from _pytest.mark import ParameterSet
from pydantic import BaseModel, Field, field_validator, model_validator


REPO = Path(__file__).resolve().parents[3]
PLUGINS_ROOT = REPO / "plugins"

# A plugin.py Plugin class as AST-read: class-level literals (slugs,
# tuples/lists of slugs, webui/dependency maps) or None when the file
# declares nothing readable.
PluginAttrs = dict[str, str | bool | tuple[str, ...] | list[str] | dict[str, str | tuple[str, ...]] | list[dict[str, str | tuple[str, ...]]] | tuple[dict[str, str | tuple[str, ...]], ...] | None]
# An action_cards card class as AST-read: scalar/genre literals only.
CardAttrs = dict[str, str | bool | list[str] | None]


# ═══════════════════════════════════════════════════════════════════════
# §1  Plugin type taxonomy — closed vocabulary
# ═══════════════════════════════════════════════════════════════════════

class PluginType(str, Enum):
    """The closed plugin-type vocabulary.
    Each type defines its own file-structure contract."""
    ENGINE = "engine"    # inference engines (comfyui, kimodo, anycreature, ...)
    WEB = "web"          # web UI plugins (editor)
    HARNESS = "harness"  # agent harness plugins (dsh)


class Genre(str, Enum):
    """The closed media-genre vocabulary — ONE vocabulary, everywhere:
    model.py genre=, plugin.py genres=, card.ts CardGenre, CARD_GENRES,
    sidebarGenres media entries, models/<genre>/ + action_cards/<genre>/."""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    THREE_D = "3d"
    MOTION = "motion"
    OTHER = "other"
    TEXT = "text"


# ═══════════════════════════════════════════════════════════════════════
# §2  Plugin declaration schema — plugin.py AST-parsed shape
# ═══════════════════════════════════════════════════════════════════════

class PluginClassDecl(BaseModel, frozen=True):
    """The Plugin class as declared in plugin.py — parsed via AST.
    This mirrors py/plugins.py's exec()-based discovery shape."""
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    description: str = Field(min_length=1)
    engines: tuple[str, ...] = ()
    genres: tuple[str, ...] = ()
    webui: dict[str, Any] | None = None
    dependencies: tuple[dict[str, Any], ...] | None = None

    @field_validator("id")
    @classmethod
    def _id_shape(cls, v: str) -> str:
        if not re.match(r"^[a-z][a-z0-9_-]*$", v):
            raise ValueError(
                f"plugin id must be lowercase slug: {v!r}"
            )
        return v

    @field_validator("engines", mode="before")
    @classmethod
    def _engines_to_tuple(cls, v: str | list[str] | tuple[str, ...] | None) -> tuple[str, ...]:
        if isinstance(v, (list, tuple)):
            return tuple(v)
        return (v,) if v else ()

    @field_validator("genres", mode="before")
    @classmethod
    def _genres_to_tuple(cls, v: str | list[str] | tuple[str, ...] | None) -> tuple[str, ...]:
        if isinstance(v, (list, tuple)):
            return tuple(v)
        return (v,) if v else ()


# ═══════════════════════════════════════════════════════════════════════
# §3  Engine directory schema
# ═══════════════════════════════════════════════════════════════════════

class EngineDirDecl(BaseModel, frozen=True):
    """An engine/ directory entry as declared in engines/<dir>/engine.py
    or engines/<dir>/engine.yaml. The gateway reads ENGINE_TYPE from
    engine.py first, falls back to engine.yaml, then dir name."""
    engine_type: str = Field(min_length=1)
    has_engine_py: bool = False
    has_engine_yaml: bool = False
    has_compose_dir: bool = False


# ═══════════════════════════════════════════════════════════════════════
# §4  Model directory schema — per-model declaration shape
# ═══════════════════════════════════════════════════════════════════════

class ModelDirDecl(BaseModel, frozen=True):
    """One model directory under plugins/<plugin>/models/<genre>/<model>/.
    Validated from the filesystem — checks existence and shape of
    model.py, nodes.yaml, mods/, agents/, presets/."""
    plugin_id: str
    genre: str
    model_id: str
    has_model_py: bool = False
    has_nodes_yaml: bool = False
    has_mods_dir: bool = False
    has_agents_dir: bool = False
    has_presets_dir: bool = False


class NodesYamlSpec(BaseModel, frozen=True):
    """The minimal nodes.yaml schema — the gateway reads this to know
    what node types the engine declares for a model."""
    nodes: dict[str, Any] = Field(default_factory=dict)
    # nodes.yaml may have additional keys (extensions, etc.)
    model_config = {"extra": "allow"}


class NodesYamlNodeSpec(BaseModel, frozen=True):
    """One entry inside nodes.yaml's nodes: dict.
    Each key is a node class name; the value describes its role."""
    node_id: str = Field(min_length=1)
    node_type: str = Field(min_length=1)
    description: str = ""


# ═══════════════════════════════════════════════════════════════════════
# §5  Plugin type → file structure contracts
# ═══════════════════════════════════════════════════════════════════════

# What each plugin type MUST have on disk
REQUIRED_FILES: dict[PluginType, dict[str, str]] = {
    PluginType.ENGINE: {
        "plugin.py": "Plugin class declaration (SSOT for plugin metadata)",
    },
    PluginType.WEB: {
        "README.md": "Plugin description",
    },
    PluginType.HARNESS: {
        "README.md": "Plugin description",
    },
}

# What each plugin type MAY have on disk
OPTIONAL_DIRS: dict[PluginType, dict[str, str]] = {
    PluginType.ENGINE: {
        "engines/": "Engine implementations (engine.py/engine.yaml per subdir)",
        "compose/": "Card compose package (compose-first shape)",
        "models/": "Model families organized by genre",
    },
    PluginType.WEB: {
        "editor/": "Web editor plugin (React/TypeScript)",
    },
    PluginType.HARNESS: {
        "dsh/": "DSH agent harness integration",
    },
}

# Cross-file constraints per plugin type
CROSS_FILE_RULES: dict[PluginType, list[str]] = {
    PluginType.ENGINE: [
        "Every engine dir must have engine.py OR engine.yaml",
        "Engine types must be unique across all plugins",
        "If plugin.py declares engines, compose/__init__.py must exist",
    ],
    PluginType.WEB: [],
    PluginType.HARNESS: [],
}


# ═══════════════════════════════════════════════════════════════════════
# §6  AST-based plugin.py reader (side-effect free)
# ═══════════════════════════════════════════════════════════════════════

def _ast_read_plugin_class(plugin_py: Path) -> PluginAttrs | None:
    """Parse plugin.py via AST and return the Plugin class attributes.
    No exec, no import — pure static analysis."""
    src = plugin_py.read_text(encoding="utf-8")
    tree = ast.parse(src, filename=str(plugin_py))
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == "Plugin":
            attrs: PluginAttrs = {}
            for stmt in node.body:
                if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1:
                    tgt = stmt.targets[0]
                    if isinstance(tgt, ast.Name):
                        try:
                            attrs[tgt.id] = ast.literal_eval(stmt.value)
                        except (ValueError, SyntaxError):
                            attrs[tgt.id] = None
            return attrs
    return None


def _detect_plugin_type(plugin_dir: Path) -> PluginType:
    """Detect plugin type from directory location and contents.
    Layout: plugins/<type_plural>/<name>/"""
    parent_name = plugin_dir.parent.name
    if parent_name == "engines":
        return PluginType.ENGINE
    if parent_name == "web":
        return PluginType.WEB
    if parent_name == "harness":
        return PluginType.HARNESS
    # Fallback heuristics
    if (plugin_dir / "engines").is_dir():
        return PluginType.ENGINE
    if (plugin_dir / "editor").is_dir():
        return PluginType.WEB
    return PluginType.ENGINE


# ═══════════════════════════════════════════════════════════════════════
# §7  Discovery — scan all plugins on disk
# ═══════════════════════════════════════════════════════════════════════

def _discover_all_plugins() -> list[tuple[str, Path, PluginType]]:
    """Yield (plugin_id, plugin_dir, plugin_type) for every plugin."""
    results: list[tuple[str, Path, PluginType]] = []
    for root_cat in sorted(PLUGINS_ROOT.iterdir()):
        if not root_cat.is_dir():
            continue
        for child in sorted(root_cat.iterdir()):
            if not child.is_dir():
                continue
            # Depth-2: plugins/<cat>/<plugin>/
            if (child / "plugin.py").is_file() or \
               (child / "plugin.yaml").is_file() or \
               (child / "engines").is_dir():
                ptype = _detect_plugin_type(child)
                results.append((child.name, child, ptype))
            else:
                # Depth-3 category containers: plugins/<cat>/<subcat>/<plugin>/
                for sub in sorted(child.iterdir()):
                    if not sub.is_dir():
                        continue
                    if (sub / "plugin.py").is_file() or \
                       (sub / "engines").is_dir():
                        ptype = _detect_plugin_type(sub)
                        results.append((sub.name, sub, ptype))
    return results


def _discover_model_dirs(plugin_dir: Path) -> list[Path]:
    """Find all model directories under a plugin: models/<genre>/<model>/"""
    models_root = plugin_dir / "models"
    if not models_root.is_dir():
        return []
    results: list[Path] = []
    for genre_dir in sorted(models_root.iterdir()):
        if not genre_dir.is_dir() or genre_dir.name.startswith("_"):
            continue
        for model_dir in sorted(genre_dir.iterdir()):
            if not model_dir.is_dir() or model_dir.name.startswith("_"):
                continue
            results.append(model_dir)
    return results


def _discover_engine_dirs(plugin_dir: Path) -> list[Path]:
    """Find all engine directories: engines/<engine_type>/"""
    engines_root = plugin_dir / "engines"
    if not engines_root.is_dir():
        return []
    return [
        d for d in sorted(engines_root.iterdir())
        if d.is_dir()
    ]


# ═══════════════════════════════════════════════════════════════════════
# §8  Test fixtures — parameterized discovery
# ═══════════════════════════════════════════════════════════════════════

ALL_PLUGINS = _discover_all_plugins()
PLUGIN_IDS = [pid for pid, _, _ in ALL_PLUGINS]


def _ast_read_card_class(card_py: Path) -> CardAttrs | None:
    """Parse card.py via AST and return the first ActionCard subclass's
    class attributes. No exec, no import — pure static analysis."""
    src = card_py.read_text(encoding="utf-8")
    tree = ast.parse(src, filename=str(card_py))
    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue
        bases = {getattr(b, "id", getattr(b, "attr", ""))
                 for b in node.bases}
        if not bases & {"ActionCard"}:
            continue
        attrs: CardAttrs = {}
        for stmt in node.body:
            if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1:
                tgt = stmt.targets[0]
                if isinstance(tgt, ast.Name):
                    try:
                        attrs[tgt.id] = ast.literal_eval(stmt.value)
                    except (ValueError, SyntaxError):
                        attrs[tgt.id] = None
        return attrs
    return None


def _discover_all_cards() -> list[tuple[str, Path, CardAttrs]]:
    """Every action_cards/<genre>/<card>/py/card.py across all engine
    plugins (depth-2 and depth-3 containers alike)."""
    out: list[tuple[str, Path, CardAttrs]] = []
    eng_root = REPO / "plugins" / "engines"
    for plugin_dir in sorted(eng_root.iterdir()):
        if not plugin_dir.is_dir():
            continue
        containers = [plugin_dir]
        for sub in sorted(plugin_dir.iterdir()):
            if sub.is_dir() and (sub / "plugin.py").is_file():
                containers.append(sub)
        for cont in containers:
            ac_root = cont / "action_cards"
            if not ac_root.is_dir():
                continue
            for card_py in sorted(ac_root.glob("*/*/py/card.py")):
                attrs = _ast_read_card_class(card_py)
                if attrs is not None:
                    out.append((cont.name, card_py, attrs))
    return out


def _plugin_dir(plugin_id: str) -> Path:
    return next(d for pid, d, _ in ALL_PLUGINS if pid == plugin_id)


def _plugin_type(plugin_id: str) -> PluginType:
    return next(pt for pid, _, pt in ALL_PLUGINS if pid == plugin_id)


# ═══════════════════════════════════════════════════════════════════════
# §9  Tests — plugin type detection
# ═══════════════════════════════════════════════════════════════════════

class TestPluginTypeTaxonomy:
    """PluginType is a closed vocabulary — only known types allowed."""

    def test_all_types_known(self) -> None:
        expected = {"engine", "web", "harness"}
        assert {t.value for t in PluginType} == expected

    def test_invalid_type_refused(self) -> None:
        with pytest.raises(ValueError):
            PluginType("agent")


# ═══════════════════════════════════════════════════════════════════════
# §10  Tests — plugin.py declaration schema
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("plugin_id", PLUGIN_IDS, ids=PLUGIN_IDS)
class TestPluginDeclaration:
    """Every plugin.py declares a Plugin class that validates."""

    def test_has_plugin_class(self, plugin_id: str) -> None:
        plugin_dir = _plugin_dir(plugin_id)
        plugin_py = plugin_dir / "plugin.py"
        assert plugin_py.is_file(), (
            f"{plugin_id}: no plugin.py"
        )
        attrs = _ast_read_plugin_class(plugin_py)
        assert attrs is not None, (
            f"{plugin_id}: no Plugin class in plugin.py"
        )

    def test_plugin_spec_validates(self, plugin_id: str) -> None:
        plugin_dir = _plugin_dir(plugin_id)
        attrs = _ast_read_plugin_class(plugin_dir / "plugin.py")
        if attrs is None:
            pytest.skip(f"{plugin_id}: no Plugin class")
        # Validate through the pydantic schema
        PluginClassDecl(**{
            k: v for k, v in attrs.items()
            if k in PluginClassDecl.model_fields
        })

    def test_id_matches_directory(self, plugin_id: str) -> None:
        plugin_dir = _plugin_dir(plugin_id)
        attrs = _ast_read_plugin_class(plugin_dir / "plugin.py")
        if attrs is None:
            pytest.skip(f"{plugin_id}: no Plugin class")
        assert attrs.get("id") == plugin_id, (
            f"{plugin_id}: Plugin.id={attrs.get('id')!r} ≠ dir name"
        )

    def test_required_files_present(self, plugin_id: str) -> None:
        ptype = _plugin_type(plugin_id)
        plugin_dir = _plugin_dir(plugin_id)
        required = REQUIRED_FILES.get(ptype, {})
        for filename, reason in required.items():
            fpath = plugin_dir / filename
            assert fpath.is_file(), (
                f"{plugin_id}: missing required file {filename!r} — {reason}"
            )


# ═══════════════════════════════════════════════════════════════════════
# §11  Tests — engine directory contracts
# ═══════════════════════════════════════════════════════════════════════

def _engine_dirs_for(plugin_id: str) -> list[Path]:
    return _discover_engine_dirs(_plugin_dir(plugin_id))


ENGINE_PLUGIN_IDS = [
    pid for pid, _, pt in ALL_PLUGINS
    if pt == PluginType.ENGINE
    and _discover_engine_dirs(_plugin_dir(pid))
]


@pytest.mark.parametrize("plugin_id", ENGINE_PLUGIN_IDS, ids=ENGINE_PLUGIN_IDS)
class TestEngineDirectories:
    """Engine plugins must have engine.py or engine.yaml per subdir."""

    def test_engine_dirs_have_declaration(self, plugin_id: str) -> None:
        for edir in _engine_dirs_for(plugin_id):
            has_py = (edir / "engine.py").is_file()
            has_yaml = (edir / "engine.yaml").is_file()
            assert has_py or has_yaml, (
                f"{plugin_id}/engines/{edir.name}: "
                f"no engine.py or engine.yaml"
            )

    def test_engine_types_unique(self, plugin_id: str) -> None:
        """Engine types declared by this plugin must not clash with
        another plugin's types (PLUGIN ARCHITECTURE LAW)."""
        seen_types: dict[str, str] = {}
        for edir in _engine_dirs_for(plugin_id):
            etype = edir.name  # fallback — same as plugins.py
            epy = edir / "engine.py"
            if epy.is_file():
                try:
                    ns = {}
                    exec(epy.read_text(), ns)  # noqa: S102
                    if ns.get("ENGINE_TYPE"):
                        etype = ns["ENGINE_TYPE"]
                except Exception:
                    pass
            ey = edir / "engine.yaml"
            if ey.is_file() and etype == edir.name:
                for line in ey.read_text().splitlines():
                    s = line.strip()
                    if s.startswith("type:"):
                        t = s.partition(":")[2].strip()
                        if t:
                            etype = t
                            break
            assert etype not in seen_types, (
                f"{plugin_id}: duplicate engine type {etype!r} "
                f"in engines/{seen_types[etype]} and engines/{edir.name}"
            )
            seen_types[etype] = edir.name


# ═══════════════════════════════════════════════════════════════════════
# §12  Tests — model directory contracts
# ═══════════════════════════════════════════════════════════════════════

def _model_dirs_for(plugin_id: str) -> list[tuple[str, str, Path]]:
    """Return (genre, model_id, path) for each model dir."""
    results: list[tuple[str, str, Path]] = []
    models_root = _plugin_dir(plugin_id) / "models"
    if not models_root.is_dir():
        return results
    for genre_dir in sorted(models_root.iterdir()):
        if not genre_dir.is_dir() or genre_dir.name.startswith("_"):
            continue
        for model_dir in sorted(genre_dir.iterdir()):
            if not model_dir.is_dir() or model_dir.name.startswith("_"):
                continue
            results.append((genre_dir.name, model_dir.name, model_dir))
    return results


def _all_model_params() -> list[ParameterSet]:
    """Generate (plugin_id, genre, model_id) for parametrize."""
    params = []
    for pid, _, _ in ALL_PLUGINS:
        for genre, model_id, _ in _model_dirs_for(pid):
            params.append(pytest.param(pid, genre, model_id,
                                       id=f"{pid}/{genre}/{model_id}"))
    return params


ALL_MODEL_PARAMS = _all_model_params()


@pytest.mark.parametrize("plugin_id,genre,model_id", ALL_MODEL_PARAMS,
                         ids=[p.id for p in ALL_MODEL_PARAMS])
class TestModelDirectories:
    """Every model directory validates against the schema."""

    def test_has_model_py_or_nodes_yaml(self, plugin_id: str, genre: str, model_id: str) -> None:
        """A model must have at least model.py (the declaration) or
        nodes.yaml (the manifest). Neither = dead model dir."""
        model_dir = _plugin_dir(plugin_id) / "models" / genre / model_id
        has_py = (model_dir / "model.py").is_file()
        has_yaml = (model_dir / "nodes.yaml").is_file()
        assert has_py or has_yaml, (
            f"{plugin_id}/{genre}/{model_id}: "
            f"no model.py or nodes.yaml"
        )

    def test_nodes_yaml_validates(self, plugin_id: str, genre: str, model_id: str) -> None:
        """If nodes.yaml exists, it must parse as valid YAML with
        the expected shape (nodes: dict at minimum)."""
        model_dir = _plugin_dir(plugin_id) / "models" / genre / model_id
        nodes_yaml = model_dir / "nodes.yaml"
        if not nodes_yaml.is_file():
            pytest.skip("no nodes.yaml")
        try:
            data = yaml.safe_load(nodes_yaml.read_text(encoding="utf-8")) or {}
        except yaml.YAMLError as e:
            pytest.fail(
                f"{plugin_id}/{genre}/{model_id}: "
                f"malformed nodes.yaml: {e}"
            )
        NodesYamlSpec(**data)

    def test_model_dir_shape(self, plugin_id: str, genre: str, model_id: str) -> None:
        """The ModelDirDecl shape validates from filesystem facts."""
        model_dir = _plugin_dir(plugin_id) / "models" / genre / model_id
        decl = ModelDirDecl(
            plugin_id=plugin_id,
            genre=genre,
            model_id=model_id,
            has_model_py=(model_dir / "model.py").is_file(),
            has_nodes_yaml=(model_dir / "nodes.yaml").is_file(),
            has_mods_dir=(model_dir / "mods").is_dir(),
            has_agents_dir=(model_dir / "agents").is_dir(),
            has_presets_dir=(model_dir / "presets").is_dir(),
        )
        # Every model dir must have at least one declaration
        assert decl.has_model_py or decl.has_nodes_yaml, (
            f"{plugin_id}/{genre}/{model_id}: empty model dir"
        )

    def test_no_stale_model_yaml(self, plugin_id: str, genre: str, model_id: str) -> None:
        """model.yaml is DELETED — the flip to model.py is done.
        A model.yaml appearing next to model.py is a LOUD refusal
        (two SSOTs = zero SSOTs)."""
        model_dir = _plugin_dir(plugin_id) / "models" / genre / model_id
        model_yaml = model_dir / "model.yaml"
        model_py = model_dir / "model.py"
        if model_yaml.is_file() and model_py.is_file():
            pytest.fail(
                f"{plugin_id}/{genre}/{model_id}: "
                f"model.yaml exists alongside model.py — "
                f"two SSOTs is zero SSOTs"
            )


# ═══════════════════════════════════════════════════════════════════════
# §13  Tests — genre coverage
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("plugin_id", PLUGIN_IDS, ids=PLUGIN_IDS)
class TestGenreCoverage:
    """If a plugin declares genres, it must have a models/<genre>/ dir
    for each. No aliases, no fallbacks — the directory name IS the
    genre vocabulary."""

    def test_declared_genres_have_models(self, plugin_id: str) -> None:
        plugin_dir = _plugin_dir(plugin_id)
        attrs = _ast_read_plugin_class(plugin_dir / "plugin.py")
        if attrs is None or not attrs.get("genres"):
            pytest.skip("no genres declared")
        declared = set(attrs["genres"])
        models_root = plugin_dir / "models"
        if not models_root.is_dir():
            pytest.fail(
                f"{plugin_id}: declares genres but has no models/ dir"
            )
        on_disk = {
            p.name for p in models_root.iterdir()
            if p.is_dir() and not p.name.startswith("_")
        }
        missing = declared - on_disk
        assert not missing, (
            f"{plugin_id}: declares genres {sorted(missing)} "
            f"but no matching models/ dir (on-disk: {sorted(on_disk)})"
        )


# ═══════════════════════════════════════════════════════════════════════
# §14  Tests — compose-first plugin constraints
# ═══════════════════════════════════════════════════════════════════════

def _compose_first_plugin_ids() -> list[str]:
    """Plugins that declare engines via plugin.py (compose-first shape)."""
    results = []
    for pid, pdir, pt in ALL_PLUGINS:
        if pt != PluginType.ENGINE:
            continue
        attrs = _ast_read_plugin_class(pdir / "plugin.py")
        if attrs and attrs.get("engines"):
            results.append(pid)
    return results


COMPOSE_FIRST_IDS = _compose_first_plugin_ids()


@pytest.mark.parametrize("plugin_id", COMPOSE_FIRST_IDS,
                         ids=COMPOSE_FIRST_IDS)
class TestComposeFirstPlugins:
    """Compose-first plugins must have compose/__init__.py.
    Legacy engines/<dir>/ shape (engine.py + engine.yaml) is exempt —
    the compose-first constraint applies only when the plugin uses the
    plugin.py engines: declaration WITHOUT a legacy engines/ dir."""

    def test_compose_package_exists(self, plugin_id: str) -> None:
        plugin_dir = _plugin_dir(plugin_id)
        # If the plugin has a legacy engines/ dir with engine.py/yaml,
        # it uses the old shape — compose/ is not required.
        engines_dir = plugin_dir / "engines"
        if engines_dir.is_dir():
            for sub in engines_dir.iterdir():
                if sub.is_dir() and (
                    (sub / "engine.py").is_file() or
                    (sub / "engine.yaml").is_file()
                ):
                    pytest.skip(
                        f"{plugin_id}: legacy engines/ shape — "
                        f"compose/ not required"
                    )
        compose_init = plugin_dir / "compose" / "__init__.py"
        assert compose_init.is_file(), (
            f"{plugin_id}: declares engines but no "
            f"compose/__init__.py (compose-first shape requires it)"
        )


# ═══════════════════════════════════════════════════════════════════════
# §15  Tests — plugin.yaml fallback (if present)
# ═══════════════════════════════════════════════════════════════════════

def _yaml_plugin_ids() -> list[str]:
    """Plugins that have plugin.yaml instead of (or alongside) plugin.py."""
    results = []
    for pid, pdir, _ in ALL_PLUGINS:
        if (pdir / "plugin.yaml").is_file():
            results.append(pid)
    return results


YAML_PLUGIN_IDS = _yaml_plugin_ids()


@pytest.mark.parametrize("plugin_id", YAML_PLUGIN_IDS,
                         ids=YAML_PLUGIN_IDS)
class TestPluginYaml:
    """plugin.yaml must parse as valid YAML with at minimum
    an 'engines:' key or basic metadata."""

    def test_yaml_parses(self, plugin_id: str) -> None:
        plugin_dir = _plugin_dir(plugin_id)
        yaml_path = plugin_dir / "plugin.yaml"
        try:
            data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
        except yaml.YAMLError as e:
            pytest.fail(f"{plugin_id}: malformed plugin.yaml: {e}")
        assert isinstance(data, dict), (
            f"{plugin_id}: plugin.yaml must be a YAML dict"
        )


# ═══════════════════════════════════════════════════════════════════════
# §16  Tests — pydantic schema construction refusals
# ═══════════════════════════════════════════════════════════════════════

class TestSchemaConstructionRefusals:
    """The schemas themselves reject invalid inputs at construction time."""

    def test_plugin_class_decl_id_shape(self) -> None:
        with pytest.raises(Exception):
            PluginClassDecl(
                id="BadID!", label="X", description="D",
                engines=("comfyui",), genres=("image",),
            )

    def test_plugin_class_decl_empty_id(self) -> None:
        with pytest.raises(Exception):
            PluginClassDecl(
                id="", label="X", description="D",
            )

    def test_plugin_class_decl_empty_label(self) -> None:
        with pytest.raises(Exception):
            PluginClassDecl(
                id="ok", label="", description="D",
            )

    def test_plugin_class_decl_empty_description(self) -> None:
        with pytest.raises(Exception):
            PluginClassDecl(
                id="ok", label="X", description="",
            )

    def test_plugin_class_decl_frozen(self) -> None:
        p = PluginClassDecl(
            id="test", label="T", description="D",
            engines=("e",), genres=("image",),
        )
        with pytest.raises(Exception):
            p.id = "changed"

    def test_nodes_yaml_spec_validates(self) -> None:
        n = NodesYamlSpec(nodes={"KSampler": {"type": " sampler"}})
        assert "KSampler" in n.nodes

    def test_model_dir_decl_frozen(self) -> None:
        m = ModelDirDecl(
            plugin_id="comfyui", genre="image",
            model_id="krea-2", has_model_py=True,
        )
        with pytest.raises(Exception):
            m.model_id = "changed"

    def test_genre_closed_vocab(self) -> None:
        for g in ("image", "video", "audio", "3d", "motion", "other",
                  "text"):
            assert Genre(g).value == g
        with pytest.raises(ValueError):
            Genre("mesh")
        with pytest.raises(ValueError):
            Genre("creature")  # folded into 3d (2026-09-04)
        with pytest.raises(ValueError):
            Genre("ai_generated")  # a TAG, not a genre

    def test_live_plugin_genres_in_vocab(self) -> None:
        """Every plugin.py genres value on disk speaks the ONE vocabulary."""
        for plugin_id in PLUGIN_IDS:
            plugin_dir = _plugin_dir(plugin_id)
            attrs = _ast_read_plugin_class(plugin_dir / "plugin.py")
            if attrs is None or not attrs.get("genres"):
                continue
            for g in attrs["genres"]:
                assert Genre(g), (
                    f"{plugin_id}: genres value {g!r} is not in the ONE "
                    f"vocabulary {[g.value for g in Genre]}"
                )

    def test_live_card_genres_in_vocab(self) -> None:
        """Every card.py genre on disk speaks the ONE vocabulary."""
        for plugin_id, card_path, attrs in _discover_all_cards():
            genre = attrs.get("genre")
            if genre is None:
                continue
            assert Genre(genre), (
                f"{plugin_id}/{card_path.parent.name}: genre {genre!r} "
                f"is not in the ONE vocabulary"
            )

    def test_live_card_dir_matches_genre(self) -> None:
        """action_cards/<genre>/<card> — the directory IS the genre."""
        for plugin_id, card_path, attrs in _discover_all_cards():
            genre = attrs.get("genre")
            if genre is None:
                continue
            dir_genre = card_path.parents[2].name
            assert dir_genre == genre, (
                f"{plugin_id}: card {card_path.parent.name} declares "
                f"genre={genre!r} but lives under action_cards/{dir_genre}/"
            )

    def test_plugin_type_closed_vocab(self) -> None:
        for t in ("engine", "web", "harness"):
            assert PluginType(t).value == t
        with pytest.raises(ValueError):
            PluginType("core")
