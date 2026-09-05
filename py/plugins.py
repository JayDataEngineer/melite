"""py/plugins.py — plugin mount + dispatch (PLUGIN ARCHITECTURE LAW port).

The core names no lane and no engine. Everything lane-specific — engine
execution, card composition — ships INSIDE the plugin that owns the
engine, next to its models/knob data, and is discovered from
plugin-owned declarations:

    Legacy shape (audio-cpp):
        plugins/<id>/engines/<dir>/engine.yaml    type: <engine type>
        plugins/<id>/engines/<dir>/engine.py      async execute(...)
        plugins/<id>/engines/<dir>/compose.py     card_compose(...)
    ffmpeg retired 2026-09-04 — concat rides comfyui's VHS /
    melite-audio-nodes; the CLI-wrapper engine plugin and its
    type are gone.

    Compose-first shape (comfyui — operator order 2026-09-02):
        plugins/<id>/plugin.yaml                  engines: [type]
        plugins/<id>/compose/                     card_compose + execute
        plugins/<id>/models/                      self-contained model families
        plugins/<id>/action_cards/                card defs + unique lane code

    The gateway resolves engine type FROM THE GRAPH — it names no lane
    and no engine. Compose-first plugins own execution via comfyui-mcp
    (there is no engine.py in any plugin that uses this shape).

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

from pydantic import (BaseModel, ConfigDict, Field, model_validator)

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

class EngineRef(BaseModel):
    """One mounted engine (PYTHON SHAPE LAW rung 2: frozen row, not a
    __slots__ duck class). engine_dir/engine_type/plugin_id are the
    mount facts; plugin_root derives (compose-first plugins mount the
    plugin dir itself, legacy shapes mount the engine dir two levels
    down)."""

    model_config = ConfigDict(frozen=True, extra="forbid",
                              arbitrary_types_allowed=True)

    plugin_id: str = Field(min_length=1)
    engine_dir: Path
    engine_type: str = Field(min_length=1)
    plugin_root: Path | None = None

    @model_validator(mode="before")
    @classmethod
    def _root_defaults(cls, data):
        """plugin_root derives two levels up from engine_dir when the
        mount didn't state it (compose-first mounts state it)."""
        if isinstance(data, dict) and not data.get("plugin_root"):
            ed = data.get("engine_dir")
            if ed is not None:
                parents = Path(ed).parents
                if len(parents) < 2:
                    raise ValueError(
                        "engine_dir %s is too shallow to derive "
                        "plugin_root (state plugin_root explicitly)"
                        % ed)
                data = dict(data)
                data["plugin_root"] = parents[1]
        return data

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
        # Compose packages (plugin-root libraries, e.g. compose/co_script)
        # import as plugin_engines.<plugin_id>.compose.<kind> — the parent
        # package carries the plugin root on its path. Generic for every
        # plugin (PLUGIN ARCHITECTURE LAW extension rule): no constructor
        # is ever named in the core.
        parent_mod = sys.modules["plugin_engines." + self.plugin_id]
        plugin_root = str(self.plugin_root)
        if plugin_root not in parent_mod.__path__:
            parent_mod.__path__.append(plugin_root)
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
            # Shape law rung 5 (loader owns import mechanics): a compose
            # PACKAGE resolves its importables through top-level names
            # (the module-identity contract each compose/ documents) —
            # so the PACKAGE dir joins sys.path here, in the loader,
            # never via a sys.path.insert ritual inside the package.
            pkg_dir = str(pkg_init.parent)
            if pkg_dir not in sys.path:
                sys.path.insert(0, pkg_dir)
            spec = importlib.util.spec_from_file_location(
                modname, pkg_init,
                submodule_search_locations=[str(pkg_init.parent)])
            pkg = importlib.util.module_from_spec(spec)
            sys.modules[modname] = pkg
            spec.loader.exec_module(pkg)
            return pkg
        return None


def _engine_type_of_dir(engine_dir):
    """Engine type from engine.py (ENGINE_TYPE), else engine.yaml, else dir name.

    (2026-09-02) engine.py is the SSOT; engine.yaml is the yaml fallback.
    Every fallthrough is LOUD (RESILIENCE LAW: document, then continue) —
    the silent-era `except: pass` let a broken engine.py silently mount
    under its dirname."""
    epy = engine_dir / "engine.py"
    if epy.is_file():
        try:
            ns = {}
            exec(epy.read_text(), ns)
            if ns.get("ENGINE_TYPE"):
                return ns["ENGINE_TYPE"]
            print("plugins: %s carries engine.py without ENGINE_TYPE "
                  "— falling through to engine.yaml" % epy,
                  file=sys.stderr)
        except Exception as e:
            print("plugins: %s refuses to exec (%s) — falling through "
                  "to engine.yaml" % (epy, e), file=sys.stderr)
    ey = engine_dir / "engine.yaml"
    if ey.is_file():
        for line in ey.read_text().splitlines():
            s = line.strip()
            if s.startswith("type:"):
                t = s.partition(":")[2].strip()
                if t:
                    return t
        print("plugins: %s parsed no type — falling through to the "
              "dirname" % ey, file=sys.stderr)
    print("plugins: %s carries NO engine declaration — mounting under "
          "the dirname (the no-declaration fallback; a declaration is "
          "the intended shape)" % engine_dir, file=sys.stderr)
    return engine_dir.name


_engines = None      # engine_type -> EngineRef


def _has_plugin_marker(d):
    """True if d looks like a plugin dir (has plugin.py, plugin.yaml,
    or an engines/ subdir)."""
    return (d / "plugin.py").is_file() or (d / "plugin.yaml").is_file() or (d / "engines").is_dir()


def iter_plugin_dirs_under(root):
    """The ONE plugin-dir walk (public: scan_engines here, catalog.py,
    and editor_forms.py all consume it — one law, no per-consumer
    copies). Depth-2 (the original contract): plugins/<cat>/<plugin>.
    Depth-3 (category subdirs, 2026-10-02): a dir with no plugin
    markers of its own is a CATEGORY CONTAINER (cpp/), not a plugin —
    recurse one level into its marker-carrying children."""
    if not root.is_dir():
        return
    for cat_dir in sorted(root.iterdir()):
        if not cat_dir.is_dir():
            continue
        if _has_plugin_marker(cat_dir):
            yield cat_dir
        else:
            for sub in sorted(cat_dir.iterdir()):
                if sub.is_dir() and _has_plugin_marker(sub):
                    yield sub


def _iter_plugin_dirs():
    """Yield every plugin directory under the scan roots
    (iter_plugin_dirs_under over each root)."""
    for root in _PLUGIN_SCAN_ROOTS:
        yield from iter_plugin_dirs_under(root)


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
            found[etype] = EngineRef(
                plugin_id=plugin_dir.name, engine_dir=engine_dir,
                engine_type=etype)
    # Compose-first plugins: plugin.py (or plugin.yaml) declares engines: [...];
    # compose/ package owns card_compose + optional execute (the
    # comfyui-mcp boundary). No engines/<dir>/ needed.
    # (2026-09-02) plugin.py is the SSOT; plugin.yaml is the yaml fallback.
    for plugin_dir in _iter_plugin_dirs():
        declared = []
        ppy = plugin_dir / "plugin.py"
        if ppy.is_file():
            try:
                ns = {}
                exec(ppy.read_text(), ns)
                pcls = ns.get("Plugin")
                if pcls is not None:
                    declared = list(getattr(pcls, "engines", ()))
                    if not declared:
                        print("plugins: %s declares a Plugin class "
                              "with NO engines tuple — the plugin "
                              "mounts nothing (a typo like `engine =` "
                              "lands here)" % ppy, file=sys.stderr)
                else:
                    print("plugins: %s carries plugin.py without a "
                          "Plugin class — mounting nothing" % ppy,
                          file=sys.stderr)
            except Exception as e:
                print("plugins: %s refuses to exec (%s) — the plugin "
                      "mounts nothing" % (ppy, e), file=sys.stderr)
        if not declared:
            pyaml = plugin_dir / "plugin.yaml"
            if pyaml.is_file():
                in_engines = False
                for line in pyaml.read_text().splitlines():
                    s = line.strip()
                    if s == "engines:":
                        in_engines = True
                        continue
                    if in_engines:
                        if s.startswith("- "):
                            declared.append(s[2:].strip())
                        elif not s.startswith(" ") and s:
                            break
                if not declared:
                    # the line parser only speaks block style — a
                    # flow-style `engines: [x]` yaml parses to nothing
                    # here; say so instead of silently unmounting
                    print("plugins: %s parsed no engines: entries "
                          "(block style `- name` only) — the plugin "
                          "mounts nothing" % pyaml, file=sys.stderr)
        compose_dir = plugin_dir / "compose"
        if not declared or not (compose_dir / "__init__.py").is_file():
            continue
        for etype in declared:
            if etype in found:
                # documented precedence: a legacy engines/<dir>/
                # declaration owns the type over the compose-first
                # declaration. Loud — a silent cede here would hide a
                # two-owner drift the loud duplicate check catches for
                # legacy-vs-legacy.
                print("plugins: engine type %r declared by BOTH %s "
                      "(legacy, owns it) and %s (compose-first, "
                      "cedes)" % (etype, found[etype].engine_dir,
                                  plugin_dir), file=sys.stderr)
                continue
            found[etype] = EngineRef(
                plugin_id=plugin_dir.name, engine_dir=plugin_dir,
                engine_type=etype, plugin_root=plugin_dir)
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
    """Deterministic model → (engine_type, model_path) or LOUD refusal.

    (2026-09-02) The python flip: model.py units resolve through the
    melite_models class (engine declared on the class; id == dirname by
    law). yaml stragglers (the never-served id-less units) keep the
    text scan. No declarer = LOUD refusal, unchanged.
    """
    if not IDENT_RE.match(mid or ""):
        raise ValidationError("model id %r is not a legal identifier" % mid)
    for plugin_dir in _iter_plugin_dirs():
        models_root = plugin_dir / "models"
        if not models_root.is_dir():
            continue
        for mpy in sorted(models_root.glob("*/%s/model.py" % mid)):
            import sys as _sys
            _py = str(REPO / "py")
            if _py not in _sys.path:
                _sys.path.insert(0, _py)
            try:
                from melite_models import load_model_py
            except ImportError:
                raise ValidationError(
                    "model %s flipped to model.py but melite_models is "
                    "missing at %s" % (mid, _py))
            engine = mpy.parent.parent.parent.name
            try:
                cls = load_model_py(str(mpy), engine)
            except Exception as e:
                raise ValidationError(
                    "model %s refused at load: %s" % (mid, e))
            if cls.engine:
                engines = scan_engines()
                if cls.engine not in engines:
                    raise ValidationError(
                        "model %s declares engine %r but no plugin owns "
                        "that engine (engines/*/engine.yaml type: %s)"
                        % (mid, cls.engine, cls.engine))
                return cls.engine, str(mpy)
    raise ValidationError("no model unit for model: %s" % mid)


# ---------------------------------------------------------------------------
# module loading (engine execution + card composition)
# ---------------------------------------------------------------------------

_engine_mods = {}
_compose_mods = {}


def load_engine(engine_type):
    """The owning plugin's engine module. Checks engine.py for execute(),
    then the compose module (standalone compose.py or compose/ package).

    (2026-09-02) engine.py is the SSOT for ENGINE_TYPE + optional execute().
    Compose-first engines (CLI wrappers) expose execute in their compose
    module. Both are LOUD when absent — never silent fallback."""
    if engine_type in _engine_mods:
        return _engine_mods[engine_type]
    engines = scan_engines()
    ref = engines.get(engine_type)
    if ref is None:
        raise ValidationError(
            "no engine plugin for type %r (no plugins/*/engines/*/engine.py "
            "or engine.yaml declares it)" % engine_type)
    # try engine.py first
    mod = ref.load("engine")
    if mod is not None and hasattr(mod, "execute"):
        _engine_mods[engine_type] = mod
        return mod
    # compose-first: audio_cpp (CLI wrappers that compose graphs but
    # execute via CLI processes — compose.py owns card_compose,
    # execute() if present). ffmpeg_concat retired 2026-09-04; see
    # docs/audits/queue-audit.md round 8.
    cmod = ref.load("compose")
    if cmod is not None and (hasattr(cmod, "execute") or
                              hasattr(cmod, "card_compose")):
        _engine_mods[engine_type] = cmod if hasattr(cmod, "execute") else mod
        return _engine_mods.get(engine_type, mod)
    # CLI-only engines: engine.py declares ENGINE_TYPE, no python execute.
    # The gateway runs them via CLI dispatch, not python execute().
    if mod is not None and getattr(mod, "ENGINE_TYPE", None):
        _engine_mods[engine_type] = mod
        return mod
    raise ValidationError(
        "engine %r (plugin %s) has no execute()/card_compose() in "
        "engine.py or compose/" % (engine_type, ref.plugin_id))


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


def compose(body, model, run_id, graph, engine_types):
    """Run the OWNING plugin's card_compose over the graph.

    Dispatch mirrors the C server: the hook is selected by the graph's
    engine type, never broadcast. A non-zero rc is a LOUD refusal
    (ValidationError) — never a silent drop. Returns (graph, extra) —
    python hands python STRUCTURES (PYTHON SHAPE rung 5); an arm that
    emits no graph (validation door, passthrough) returns None/the
    caller's own object and the caller's graph stands.
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
        rc, new_graph, mod_extra, err = mod.card_compose(
            body, model, run_id, graph)
        if rc != 0:
            raise ValidationError(
                "card_compose rc=%d (%s.%s): %s" % (
                    rc, ref.plugin_id, etype, err or "no detail"))
        if new_graph is not None and new_graph is not graph:
            # the rim: arm output is a typed FlowGraph or refuses
            # LOUDLY by field name — a malformed graph can never ride
            import flow_graph
            graph = flow_graph.FlowGraph.model_validate(new_graph)
        if isinstance(mod_extra, dict):
            extra.update(mod_extra)
    return graph, extra
