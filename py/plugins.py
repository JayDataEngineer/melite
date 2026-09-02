"""py/plugins.py — plugin mount + dispatch (PLUGIN ARCHITECTURE LAW port).

The core names no lane and no engine. Everything lane-specific — engine
execution, card composition — ships INSIDE the plugin that owns the
engine, next to its models/knob data, and is discovered from
plugin-owned declarations:

    plugins/<id>/engines/<dir>/engine.yaml    type: <engine type> (dir name
                                               may differ from the type —
                                               engines/audio owns audio_cpp)
    plugins/<id>/engines/<dir>/engine.py      async execute(node, run_dir,
                                               inputs, stop_event) -> dict
                                               optional async stop(node, run_dir)
    plugins/<id>/engines/<dir>/compose.py     card_compose(body, model,
                                               run_id, yaml_text) — or a
                                               compose/ package exporting it

No engine maps in the core (the SO_ENGINE_OWNERS hardcode is dead: a
banned shape — lane names in the core). Duplicate type declarations
across plugins fail LOUD at scan, not silently last-writer-wins.

Model resolution is DETERMINISTIC (the C glob-order bug dies here):
every copy of plugins/*/models/*/<mid>/model.yaml is collected, copies
that DECLARE an engine win over silent copies, first declarer in sorted
plugin order owns the model. No declarer → LOUD refusal (QUEUE LANE
LAW: refuse to guess).
"""

from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PLUGINS_DIR = REPO / "plugins"
# Scan roots: engine plugins under plugins/engine/*, agent plugins under
# plugins/agent/*, web plugins under plugins/web/*.  Each plugin dir
# (depth-2 under a category) may own engines/ and/or models/.
_PLUGIN_SCAN_ROOTS = [REPO / "plugins" / cat for cat in ("engines", "web")]
IDENT_RE = re.compile(r"^[a-z_][a-z0-9_-]*$")

try:
    # same class as the gateway's (gateway imports us lazily, after its
    # own ValidationError is defined — the alias resolves)
    from gateway import ValidationError  # noqa: F401
except Exception:
    class ValidationError(Exception):
        """Loud 4xx before any run is registered (QUEUE LANE LAW)."""


# ---------------------------------------------------------------------------
# engine discovery
# ---------------------------------------------------------------------------

class EngineRef:
    __slots__ = ("plugin_id", "engine_dir", "engine_type")

    def __init__(self, plugin_id, engine_dir, engine_type):
        self.plugin_id = plugin_id
        self.engine_dir = engine_dir
        self.engine_type = engine_type

    def load(self, module_name):
        """Load engine.py/compose.py (standalone) or a compose/ package
        from the engine dir. Sibling modules (e.g. _config.py) resolve
        via the engine dir on sys.path; package-relative imports
        resolve via a registered plugin_engines.* parent chain."""
        import types
        for parent in ("plugin_engines",
                       "plugin_engines." + self.plugin_id):
            if parent not in sys.modules:
                m = types.ModuleType(parent)
                m.__path__ = []
                sys.modules[parent] = m
        mod_dir = str(self.engine_dir)
        if mod_dir not in sys.path:
            sys.path.insert(0, mod_dir)
        path = self.engine_dir / ("%s.py" % module_name)
        pkg_init = self.engine_dir / module_name / "__init__.py"
        modname = "plugin_engines.%s.%s" % (self.plugin_id, module_name)
        if path.is_file():
            spec = importlib.util.spec_from_file_location(modname, path)
            mod = importlib.util.module_from_spec(spec)
            sys.modules[modname] = mod
            spec.loader.exec_module(mod)
            return mod
        if pkg_init.is_file():
            spec = importlib.util.spec_from_file_location(
                modname, pkg_init,
                submodule_search_locations=[str(pkg_init.parent)])
            pkg = importlib.util.module_from_spec(spec)
            sys.modules[modname] = pkg
            spec.loader.exec_module(pkg)
            return pkg
        return None


def _engine_type_of_dir(engine_dir):
    """engine.yaml `type:` if present; else the dir name declares it."""
    ey = engine_dir / "engine.yaml"
    if ey.is_file():
        for line in ey.read_text().splitlines():
            s = line.strip()
            if s.startswith("type:"):
                t = s.partition(":")[2].strip()
                if t:
                    return t
    return engine_dir.name


_engines = None      # engine_type -> EngineRef


def _iter_plugin_dirs():
    """Yield every plugin directory under the scan roots (depth-2)."""
    for root in _PLUGIN_SCAN_ROOTS:
        if not root.is_dir():
            continue
        for cat_dir in sorted(root.iterdir()):
            if not cat_dir.is_dir():
                continue
            yield cat_dir


def scan_engines():
    """Mount every plugin engine dir. Duplicate types fail LOUD."""
    global _engines
    if _engines is not None:
        return _engines
    found = {}
    for plugin_dir in _iter_plugin_dirs():
        engines_root = plugin_dir / "engines"
        if not engines_root.is_dir():
            continue
        for engine_dir in sorted(engines_root.iterdir()):
            if not engine_dir.is_dir():
                continue
            # Only scan dirs that contain engine.yaml or engine.py —
            # skip compose/, tools/, __pycache__/ subdirs.
            if not ((engine_dir / "engine.yaml").is_file() or
                    (engine_dir / "engine.py").is_file()):
                continue
            etype = _engine_type_of_dir(engine_dir)
            if etype in found:
                raise ValidationError(
                    "engine type %r declared by BOTH %s and %s — one "
                    "owner per engine (PLUGIN ARCHITECTURE LAW)" % (
                        etype, found[etype].engine_dir, engine_dir))
            found[etype] = EngineRef(plugin_dir.name, engine_dir, etype)
    _engines = found
    return _engines


# ---------------------------------------------------------------------------
# model resolution
# ---------------------------------------------------------------------------

def _model_engine_type(model_yaml_path):
    """engine: <t> top-level, or the nested `engine:\\n  plugin: <t>`.

    Mirrors the C catalog's engine stanza parse (engine section with a
    plugin key) plus the top-level shorthand some models carry.
    """
    etype = ""
    in_engine = False
    for line in model_yaml_path.read_text().splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        indented = line[:1] in (" ", "\t")
        s = line.strip()
        if not indented:
            in_engine = s == "engine:"
            if s.startswith("engine:") and not s.endswith(":"):
                t = s.partition(":")[2].strip()
                if t:
                    return t
            continue
        if in_engine and s.startswith("plugin:") and not etype:
            etype = s.partition(":")[2].strip()
    return etype


def resolve_model(mid):
    """Deterministic model → (engine_type, model_yaml_path) or LOUD refusal."""
    if not IDENT_RE.match(mid or ""):
        raise ValidationError("model id %r is not a legal identifier" % mid)
    copies = []
    for plugin_dir in _iter_plugin_dirs():
        models_root = plugin_dir / "models"
        if not models_root.is_dir():
            continue
        for my in models_root.glob("*/%s/model.yaml" % mid):
            copies.append((plugin_dir.name, my))
    if not copies:
        raise ValidationError("no model.yaml for model: %s" % mid)
    declarers = []
    for plugin_id, my in copies:
        t = _model_engine_type(my)
        if t:
            declarers.append((plugin_id, my, t))
    if not declarers:
        raise ValidationError(
            "model %s resolves no engine type (no copy declares one under "
            "plugins/*/models/*/ — refusing to guess)" % mid)
    plugin_id, my, etype = declarers[0]
    engines = scan_engines()
    if etype not in engines:
        raise ValidationError(
            "model %s declares engine %r but no plugin owns that engine "
            "(expected plugins/*/engines/*/engine.yaml type: %s)" % (
                mid, etype, etype))
    return etype, my


# ---------------------------------------------------------------------------
# module loading (engine execution + card composition)
# ---------------------------------------------------------------------------

_engine_mods = {}
_compose_mods = {}


def load_engine(engine_type):
    """The owning plugin's engine.py — LOUD when absent (never a fallback)."""
    if engine_type in _engine_mods:
        return _engine_mods[engine_type]
    engines = scan_engines()
    ref = engines.get(engine_type)
    if ref is None:
        raise ValidationError(
            "no engine plugin for type %r (no plugins/*/engines/*/engine.yaml "
            "declares it)" % engine_type)
    mod = ref.load("engine")
    if mod is None or not hasattr(mod, "execute"):
        raise ValidationError(
            "engine %r (plugin %s) ships no engine.py execute() at %s" % (
                engine_type, ref.plugin_id, ref.engine_dir / "engine.py"))
    _engine_mods[engine_type] = mod
    return mod


def load_compose(engine_type):
    """The owning plugin's card_compose module — None when the engine
    takes no cards (dispatch never broadcasts)."""
    if engine_type in _compose_mods:
        return _compose_mods[engine_type]
    engines = scan_engines()
    ref = engines.get(engine_type)
    if ref is None:
        return None
    mod = ref.load("compose")
    if mod is not None and not hasattr(mod, "card_compose"):
        # a compose/ package exposes it via __init__
        if not hasattr(mod, "card_compose"):
            raise ValidationError(
                "engine %r (plugin %s) compose module has no card_compose()" % (
                    engine_type, ref.plugin_id))
    _compose_mods[engine_type] = mod
    return mod


def compose(body, model, run_id, yaml_text, engine_types):
    """Run the OWNING plugin's card_compose over the graph.

    Dispatch mirrors the C server: the hook is selected by the graph's
    engine type, never broadcast. A non-zero rc is a LOUD refusal
    (ValidationError) — never a silent drop. Returns (yaml_text, extra).
    """
    engines = scan_engines()
    extra = {}
    for etype in engine_types:
        ref = engines.get(etype)
        if ref is None:
            continue
        mod = load_compose(etype)
        if mod is None:
            continue
        rc, new_text, mod_extra, err = mod.card_compose(
            body, model, run_id, yaml_text)
        if rc != 0:
            raise ValidationError(
                "card_compose rc=%d (%s.%s): %s" % (
                    rc, ref.plugin_id, etype, err or "no detail"))
        if new_text and new_text != yaml_text:
            yaml_text = new_text
        if isinstance(mod_extra, dict):
            extra.update(mod_extra)
    return yaml_text, extra
