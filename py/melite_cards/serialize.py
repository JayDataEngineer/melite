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

import importlib.util
import os
import sys

from .dsl import ActionCard, BINARY_FIELD_TYPES, ValidationError, _norm


def _module_name(engine, card_dir):
    return "plugin_cards.%s.%s" % (engine, os.path.basename(card_dir))


def load_card_py(path, engine="engine"):
    """Import one card.py and return its ActionCard subclass.

    LOUD refusals (no partial loads, ever):
      * no ActionCard subclass            — the module is not a card
      * multiple ActionCard subclasses    — one card per directory
    """
    card_dir = os.path.dirname(path)
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


def _card_class_of(mod, path):
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


def scan_engine_cards(repo_root):
    """Every card.py under plugins/engines/<engine>/cards/**/ (depth 2:
    cards/<card>/ and the cards/<group>/<card>/ tenant layer), in scan
    order: {card_id: (path, class)}. Duplicate ids LOUD."""
    out = {}
    eng_root = os.path.join(repo_root, "plugins", "engines")
    if not os.path.isdir(eng_root):
        return out
    for engine in _scandir(eng_root):
        if engine.startswith("."):
            continue
        cards_dir = os.path.join(eng_root, engine, "cards")
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
                p = os.path.join(d, "card.py")
                if not os.path.isfile(p):
                    continue
                cls = load_card_py(p, engine)
                if cls.id in out:
                    raise ValidationError(
                        "card id %r declared by BOTH %s and %s — one owner "
                        "per card id" % (cls.id, out[cls.id][0], p))
                out[cls.id] = (p, cls)
    return out


def field_spec(cls, model, options_vocab, service=None):
    """The wire fragment for one card class + model. Mirrors
    editor_forms._card_spec exactly (key order included)."""
    nmodel = _norm(model)
    keep = [f for f in cls._fields_ if f.families_keep(nmodel)]

    out = {}
    if cls.id:
        out["form"] = cls.id
    out["service"] = service if service is not None else model

    out["fields"] = [
        f.emit(True, options_vocab)
        for f in keep if f.type not in BINARY_FIELD_TYPES
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


def _scandir(path):
    try:
        with os.scandir(path) as it:
            return sorted(e.name for e in it)
    except OSError:
        return []
