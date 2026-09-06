"""Serializer + discovery — emits the wire fragment the editor renders.

The fragment contract (editor_forms._card_spec, recovered from the C):
  {"form": <card id>, "service": <model>,
   "fields": [emit(f, with_group=True) ...]      binary types excluded
   "schema_groups": [{"id", "label" (capitalized), "order" (first-seen
                      k), "zone" ("params" default), "fields":
                      [emit(f, with_group=False) ...]}]}

Discovery: plugins/engines/<engine>/cards/<card>/card.py — one
ActionCard subclass per module (multiple subclasses is a LOUD refusal;
one card per dir, the filesystem IS the card).
"""

from __future__ import annotations

import importlib.util
import os
import sys
from types import ModuleType

from .dsl import ActionCard, Field, ValidationError, _norm

# The wire-fragment shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


def _module_name(engine: str, card_dir: str) -> str:
    """Module identity from the CARD dir (genre + card), never the
    shared py/ leaf — the day three cards moved onto THE CARD
    PATTERN they all keyed as plugin_cards.<engine>.py and the
    second load silently returned the first card's class."""
    parts = os.path.normpath(card_dir).split(os.sep)
    while parts and parts[-1] == "py":
        parts.pop()
    tail = ".".join(parts[-2:]) if len(parts) >= 2 else parts[-1]
    return "plugin_cards.%s.%s" % (engine, tail)


def load_card_py(path: str, engine: str = "engine") -> type[ActionCard]:
    """Import one card.py and return its ActionCard subclass.

    LOUD refusals (no partial loads, ever):
      * no ActionCard subclass            — the module is not a card
      * multiple ActionCard subclasses    — one card per directory
    """
    card_dir = os.path.dirname(path)
    # the loader owns import mechanics (shape law rung 5): repo py root
    # injected once — no per-card sys.path rituals
    from melite_models import _repo_py_root
    pyroot = _repo_py_root(path)
    if pyroot and pyroot not in sys.path:
        sys.path.insert(0, pyroot)
    modname = _module_name(engine, card_dir)
    if modname in sys.modules:
        return _card_class_of(sys.modules[modname], path)
    spec = importlib.util.spec_from_file_location(modname, path)
    if spec is None or spec.loader is None:
        raise ValidationError("cannot load card module %s" % path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[modname] = mod
    try:
        spec.loader.exec_module(mod)
    except Exception:
        del sys.modules[modname]
        raise
    return _card_class_of(mod, path)


def _card_class_of(mod: ModuleType, path: str) -> type[ActionCard]:
    classes = [v for v in vars(mod).values()
               if isinstance(v, type) and issubclass(v, ActionCard)
               and v is not ActionCard]
    if not classes:
        raise ValidationError(
            "%s declares no ActionCard subclass — a card.py must define "
            "exactly one (got none)" % path)
    if len(classes) > 1:
        raise ValidationError(
            "%s declares %d ActionCard subclasses — exactly one card per "
            "directory (%s)" % (path, len(classes),
                                ", ".join(sorted(c.__name__ for c in classes))))
    return classes[0]


def scan_engine_cards(repo_root: str) -> dict[str, tuple[str, type[ActionCard]]]:
    """Every card.py under <plugin>/cards/** AND
    <plugin>/action_cards/** (both depths: <card>/ and <group>/<card>/ —
    the genre layer), in scan order: {card_id: (path, class)}.
    Duplicate ids LOUD. The plugin walk lives in plugins.py
    (iter_plugin_dirs_under — one law, every consumer: depth-2
    engines AND depth-3 category children like the cpp natives)."""
    from pathlib import Path
    import plugins as _plugins
    out = {}
    eng_root = os.path.join(repo_root, "plugins", "engines")
    if not os.path.isdir(eng_root):
        return out
    for pdir in _plugins.iter_plugin_dirs_under(Path(eng_root)):
        engine = pdir.name
        for cards_dir_name in ("cards", "action_cards"):
            cards_dir = os.path.join(str(pdir), cards_dir_name)
            if not os.path.isdir(cards_dir):
                continue
            for cid in _scandir(cards_dir):
                if cid.startswith("."):
                    continue
                cdir = os.path.join(cards_dir, cid)
                for sub in ("", ) + tuple(_scandir(cdir)):
                    if sub.startswith("."):
                        continue
                    d = os.path.join(cdir, sub) if sub else cdir
                    # THE CARD PATTERN (2026-09-03): python code lives
                    # in the card's py/ subfolder; root is compat.
                    p = next((c for c in (os.path.join(d, "py", "card.py"),
                                          os.path.join(d, "card.py"))
                              if os.path.isfile(c)), None)
                    if p is None:
                        continue
                    cls = load_card_py(p, engine)
                    if cls.id in out:
                        raise ValidationError(
                            "card id %r declared by BOTH %s and %s — one "
                            "owner per card id" % (cls.id, out[cls.id][0], p))
                    out[cls.id] = (p, cls)
    return out


# ── tool manifests — the SSOT promise, finally true ────────────────────
#
# tool.json rides the class (the melite_cards docstring's day-one plan):
# one manifest per card PER SERVED FAMILY, params_schema scoped exactly
# like the served form (family filter + required + enums + ranges).
# Hand-written tool.json beside a card.py is drift; tools/gen_tool_json.py
# regenerates the on-disk snapshots and the parity wall pins them.

_JSON_TYPES = {
    "text": "string", "textarea": "string", "select": "string",
    "number": "number", "slider": "number", "seed": "integer",
    # the card-declaration shorthand (type='int'/'float'/'bool'/
    # 'image_list' — what cards actually write) maps to the wire
    # vocabulary; unmapped falls to "string", which once typed numeric
    # fields as strings WITH minimum/maximum (drift fixed 2026-09-03)
    "int": "integer", "integer": "integer", "float": "number",
    "bool": "boolean", "boolean": "boolean",
    "image": "string", "audio": "string", "video": "string",
    "file": "string", "image_list": "array",
    "loras": "array", "controlnet": "array",
}


def _param_of(f: Field) -> dict[str, JsonValue]:
    from .dsl import VocabRef
    p = {"type": _JSON_TYPES.get(f.type, "string")}
    desc = f.tooltip or f.label
    if f.type == "select":
        if isinstance(f.options, (list, tuple)):
            p["enum"] = list(f.options)
        elif isinstance(f.options, VocabRef):
            desc = "%s — options resolve from the %s vocabulary at serve " \
                   "time" % (desc, f.options.name)
    if f.min is not None:
        p["minimum"] = f.min
    if f.max is not None:
        p["maximum"] = f.max
    if f.default is not None and f.default != "":
        p["default"] = f.default
    if f.type in ("image", "audio", "video", "file"):
        p["format"] = "path"
    if f.visible_when:
        p["x-visible-when"] = f.visible_when
    p["description"] = desc
    return p


def tool_manifests(cls: type[ActionCard]) -> list[dict[str, JsonValue]]:
    """Derive the agent tool manifests from the card class: ONE TOOL
    PER ACTION CARD (operator order 2026-09-03: "I don't want the
    'models' to render, I just want action cards to render" — shape
    law rung 8). The card is the interface; the families are DATA
    inside it.

    Multi-family cards expose `model` as the FIRST param (enum of the
    boarded families, defaulting to the card's DECLARED
    ability.default_family — a declared route like the capability
    tile's, never a guessed fallback; no declared default → required).
    params carry the UNION of the families' surfaces; each family-
    scoped field states its families in `x-families` so agents see the
    scoping, and required lists only what EVERY family requires — a
    family-specific violation is the server's LOUD refusal, never a
    silent drop.

    The card-compose request contract: POST /v1/flows/drafts with the
    card body (the card is composed FIRST — CARD BIRTH LAW, operator
    order 2026-09-06), then POST /v1/flows/start
    {model: <chosen family>, params: {...}, draft_id: <minted>} — the
    start door 4xxes any start without a doc-backed draft_id. The
    manifest's top-level `model` names the declared default route
    (single-family cards: the only family, no param)."""
    from .dsl import _norm
    fams = tuple(cls.families_of() or ())
    nfams = [_norm(f) for f in fams]
    multi = len(fams) > 1
    default_fam = None
    if isinstance(cls.ability, dict):
        default_fam = cls.ability.get("default_family")
    if default_fam is not None and default_fam not in fams:
        raise ValueError(
            "%s.ability.default_family %r is not a boarded family"
            % (cls.id, default_fam))

    def keeps_all(f: Field) -> bool:
        return all(f.families_keep(nf) for nf in nfams)

    def keeps_some(f: Field) -> bool:
        return any(f.families_keep(nf) for nf in nfams)

    props = {}
    required = []
    if multi:
        mp = {
            "type": "string",
            "enum": list(fams),
            "description":
                "The boarded family to run — the request's top-level "
                "`model`. Options: %s." % ", ".join(fams),
        }
        if default_fam:
            mp["default"] = default_fam
        else:
            required.append("model")   # no fallback — the caller picks
        props["model"] = mp
    for f in cls._fields_:
        if not keeps_some(f):
            continue
        p = _param_of(f)
        if not keeps_all(f):
            p["x-families"] = [fam for fam, nf in zip(fams, nfams)
                               if f.families_keep(nf)]
        props[f.name] = p
        if f.required and keeps_all(f):
            required.append(f.name)
    m = {
        "name": cls.id.replace("-", "_") + "_card",
        "version": 1,
        "kind": "card-compose",
        "card": cls.id,
        "model": default_fam if multi else (fams[0] if fams else None),
        "stage_title": cls.label,
        "description": cls.description,
        "params_schema": {
            "type": "object",
            "properties": props,
            "required": required,
        },
    }
    return [m]


def field_spec(cls: type[ActionCard], model: str,
               options_vocab: dict[str, list[str]],
               service: str | None = None) -> dict[str, JsonValue]:
    """The wire fragment for one card class + model. Mirrors
    editor_forms._card_spec exactly (key order included)."""
    nmodel = _norm(model)
    keep = [f for f in cls._fields_ if f.families_keep(nmodel)]

    out = {}
    if cls.id:
        out["form"] = cls.id
    out["service"] = service if service is not None else model

    # PRESENTATION NOTCHES — non-defaults only (the declaration law:
    # the base owns the defaults; a card that deviates says so, a card
    # that doesn't says NOTHING). Absent key = default chrome.
    if cls.size != "default":
        out["size"] = cls.size
    if cls.layout != "form":
        out["layout"] = cls.layout

    # Every declared field rides the wire — NO DROPS (2026-09-05). The
    # old BINARY_FIELD_TYPES filter omitted File/Image/Audio/Video rows
    # from this flat list (they "lived in schema_groups"), and any
    # consumer reading only the flat list rendered a card with no inputs
    # — the silent default-card class. Binary fields are first-class
    # here too; schema_groups carries the grouping on top.
    out["fields"] = [
        f.emit(True, options_vocab)
        for f in keep
    ]

    groups = []
    for f in keep:
        g = f.group or ""
        if g not in groups:
            groups.append(g)
    schema = []
    for k, g in enumerate(groups):
        members = [f for f in keep if (f.group or "") == g]
        zone = ""
        for f in members:
            if f.zone:
                zone = f.zone
                break
        if not zone:
            zone = "params"
        if g:
            label = (g[0].upper() + g[1:]) if "a" <= g[0] <= "z" else g
            grp = {"id": g, "label": label, "order": k, "zone": zone}
        else:
            grp = {"id": "", "label": "Parameters", "order": k, "zone": zone}
        grp["fields"] = [f.emit(False, options_vocab) for f in members]
        schema.append(grp)
    out["schema_groups"] = schema
    return out


def _scandir(path: str) -> list[str]:
    try:
        with os.scandir(path) as it:
            return sorted(e.name for e in it)
    except OSError:
        return []
