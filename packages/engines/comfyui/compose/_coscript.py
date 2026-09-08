"""_coscript.py - the shared co_script bridge for card composers.

Every card arm (generate / edit / music / timeline) renders its graph
through the GENERIC constructor (co_script/, the comfy constructor)
plus a CARD-LEVEL renderer module:
action_cards/<genre>/<card>/renderer.py, self-registering, owned by
the card whose behavior it is. MODELS DON'T RENDER — the model class
rides along as data (typed rows: lane_inputs weights, cell artifacts);
lane knowledge never enters the constructor and never duplicates
here - this module only loads and dispatches.

Module identity: top-level `_coscript` (compose/ on sys.path - ONE
namespace per process; the LOADER joins the package dir — shape law
rung 5, no ritual in the package).
"""

from __future__ import annotations

import importlib.util
import os
import sys
import types
from collections.abc import Iterator
from pathlib import Path

from melite_cards.dsl import ValidationError

_MOD_CACHE = {}

# Unify module identity: the bus loads this as
# plugin_engines.comfyui.compose._coscript; direct imports use
# top-level _coscript. ONE module, ONE _MOD_CACHE, ONE registry.
sys.modules.setdefault("plugin_engines.comfyui.compose._coscript", sys.modules[__name__])

# model scan roots (engines/, web/) - REPO-relative via plugin root.
PLUGIN_ROOT = Path(os.path.dirname(os.path.abspath(__file__))).parent
REPO = PLUGIN_ROOT.parents[2]
_MODEL_SCAN_GLOBS = ["packages/engines/*/models", "packages/web/*/models"]

# Wire-JSON shape: step docs and workflow fragments (decoded JSON).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]


# Route ids (variant CELLS, e.g. qwen-img-edit-2511-lightning4) name
# no directory — this maps them to the OWNING family id via the class
# tree's _routes map so the dirname globs below always receive a real
# model dir. (2026-09-05: the picker offers these routes and they
# died at every glob site; resolution at ONE choke point per process
# — python/plugins.py resolve_model does the same for the gateway door.)
_ROUTE_FAMILY_CACHE: dict[str, str] = {}


def family_id_for(model: str) -> str:
    """The FAMILY id a compose-time model arg addresses: the id itself
    when a dir matches, else the _routes owner, else the id verbatim
    (the caller's own refusal names it)."""
    if model in _ROUTE_FAMILY_CACHE:
        return _ROUTE_FAMILY_CACHE[model]
    fam = model
    has_dir = False
    for pat in _MODEL_SCAN_GLOBS:
        if next(iter(REPO.glob("%s/*/%s/model.py" % (pat, model))),
                None) is not None:
            has_dir = True
            break
    if not has_dir:
        try:
            _pyroot = str(REPO / "python")
            if _pyroot not in sys.path:
                sys.path.insert(0, _pyroot)
            from melite_models import scan_engine_models
            for _path, cls in scan_engine_models(str(REPO)).values():
                if model in (getattr(cls, "_routes", None) or {}):
                    fam = cls.id
                    break
        except Exception as e:
            # LOUD (2026-09-07 review M2): the old silent pass cached
            # the miss — a broken model tree looked like "no family"
            raise RuntimeError(
                "route-family scan failed for %r (%s: %s) — the model "
                "tree is broken; refusing instead of caching a silent "
                "miss" % (model, type(e).__name__, e))
    _ROUTE_FAMILY_CACHE[model] = fam
    return fam


def model_pys(model: str) -> Iterator[Path]:
    """Yield all model.py paths for a model id across the hierarchy
    (the python flip - class beats yaml)."""
    model = family_id_for(model)
    for pat in _MODEL_SCAN_GLOBS:
        for mpy in sorted(REPO.glob("%s/*/%s/model.py" % (pat, model))):
            yield mpy


def resolve_mount_input(params: JsonDict, key: str, repo: str | Path, *,
                        required: bool = False, missing_clause: str = "",
                        unresolved_clause: str = "") -> str:
    """Artifact-ref existence on the mounts — the phase-1 law (the
    anny/mask_studio `_resolve_input` copies converged here
    2026-09-05). Blank rides "" (optional slot); a STATED ref must
    be a file, else LOUD. The lane states its refusal language via
    the clauses (no generic text — the operator reads the lane)."""
    val = str(params.get(key, "") or "").strip()
    if not val:
        if required:
            raise ValueError(
                "required param %r missing — %s" % (key, missing_clause))
        return ""
    p = Path(val)
    if not p.is_absolute():
        p = Path(repo) / val
    if not p.is_file():
        raise ValueError(
            "%s %r is not a file on the mounts — %s"
            % (key, val, unresolved_clause))
    return str(p)


def load_card_renderer(card_dir: str | Path) -> types.ModuleType | None:
    """Load (and cache) a CARD package's self-registering renderer
    module. THE CARD PATTERN (operator order, 2026-09-03): python
    code lives in the card's python/ subfolder —
    action_cards/<genre>/<card>/python/renderer.py — uniform since the
    2026-09-04 structure audit (golden base: h3-timeline, whose
    chain seam passes the python/ package root itself; both the card
    dir and its python/ root are accepted here). A ROOT-level
    renderer.py is a LOUD refusal, never a compat fallback (the
    fallback was the wrong-structure camouflage). Returns None when
    the card ships no renderer.

    2026-09-06 gap-fix (batch pollution, live-probed by the walls
    batch): the cache key was the caller's card_dir STRING — the
    same card reached as <card>/ and <card>/py (both spellings are
    accepted) cached under TWO keys, imported renderer.py TWICE
    under two aliases, and the second @register raised 'duplicate
    trellis_t1' — solo suites passed, batch order decided who fired
    first. The key is now the python/ dir that OWNS renderer.py: one
    card, one import, per process, whatever the caller spelled."""
    key = os.path.abspath(str(card_dir))
    if os.path.basename(key) == "py":
        # the caller passed the package root (the h3 chain seam)
        py_key = key
        root_renderer = os.path.join(key, os.pardir, "renderer.py")
        cand = os.path.join(key, "renderer.py")
    else:
        py_key = os.path.join(key, "python")
        root_renderer = os.path.join(key, "renderer.py")
        cand = os.path.join(key, "python", "renderer.py")
    if os.path.isfile(root_renderer):
        raise ValidationError(
            "%s ships a ROOT renderer.py — python lives in the "
            "card's python/ subfolder (THE CARD PATTERN, golden base: "
            "action_cards/video/h3-timeline)" % card_dir)
    path = cand if os.path.isfile(cand) else None
    if path is None:
        return None
    # cross-spelling cache: the python/ dir is the one true key (an
    # older entry cached under the card-dir spelling still resolves)
    cached = _MOD_CACHE.get(py_key)
    if cached is not None:
        return cached
    for _k, _mod in _MOD_CACHE.items():
        if os.path.abspath(_k) == py_key:
            return _mod
    spec = importlib.util.spec_from_file_location(
        "card_renderer@" + py_key, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    _MOD_CACHE[py_key] = mod
    return _MOD_CACHE[py_key]


def load_model_cls(model: str) -> type[Model]:
    """The Model class for a model id — DATA for card renderers (the
    loader owns import mechanics)."""
    for mpy in model_pys(model):
        from melite_models import load_model_py
        eng = mpy.parts[mpy.parts.index("engines") + 1] \
            if "engines" in mpy.parts else "engine"
        return load_model_py(str(mpy), eng)
    raise RuntimeError("co_script: no model.py for %r" % model)


def find_template(model: str, name: str) -> Path | None:
    """First file matching <name> in a model dir across the hierarchy."""
    model = family_id_for(model)
    for pat in _MODEL_SCAN_GLOBS:
        for d in sorted(REPO.glob("%s/*/%s" % (pat, model))):
            f = Path(d) / name
            if f.is_file():
                return f
    return None


