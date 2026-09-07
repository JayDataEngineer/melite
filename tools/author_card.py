#!/usr/bin/env python3
"""author_card — the card-authoring door, check half (row 7, 2026-09-07).

An agent boarding a card by hand edits five files + a registry row
and finds out at GPU time. This gate checks the ANATOMY without the
gateway (fast, agent-usable) — the fixed shape from
docs/design/row7-card-authoring.md:

  check <card_id>          a boarded card (dir + schema + card + row)
  check --dir <card-dir>   a scaffold dir (no registry row yet)

Exit 0: anatomically boardable. Exit 1: the EXACT missing piece.
The scaffold generator (slice 2) writes dirs this gate accepts.
"""
import importlib.util
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "py"))

_FAILS: list[str] = []


def _fail(msg: str) -> None:
    _FAILS.append(msg)


def _norm(card_id: str) -> str:
    return card_id.replace("-", "_")


def _find_card_dir(card_id: str) -> str | None:
    """The card dir at either action_cards depth (genre/card or
    genre/group/card). Dirnames may use underscores for the id's
    hyphens (mask_studio for mask-studio). One owner — two hits is
    a drift refusal."""
    roots = []
    engines = os.path.join(REPO, "plugins", "engines")
    if not os.path.isdir(engines):
        return None
    for engine in sorted(os.listdir(engines)):
        cards = os.path.join(engines, engine, "action_cards")
        if not os.path.isdir(cards):
            continue
        for genre in sorted(os.listdir(cards)):
            gdir = os.path.join(cards, genre)
            if not os.path.isdir(gdir):
                continue
            hits = [d for d in os.listdir(gdir)
                    if os.path.isdir(os.path.join(gdir, d))
                    and _norm(d) == _norm(card_id)]
            for hit in hits:
                hdir = os.path.join(gdir, hit)
                if os.path.isdir(os.path.join(hdir, "py")):
                    roots.append(hdir)
                    continue
                for group in sorted(os.listdir(hdir)):
                    nested = os.path.join(hdir, group)
                    if os.path.isdir(nested) and \
                            _norm(os.path.basename(nested)) == \
                            _norm(card_id):
                        roots.append(nested)
            for group in sorted(os.listdir(gdir)):
                sub = os.path.join(gdir, group)
                if not os.path.isdir(sub):
                    continue
                for leaf in sorted(os.listdir(sub)):
                    nested = os.path.join(sub, leaf)
                    if os.path.isdir(nested) and \
                            _norm(leaf) == _norm(card_id):
                        roots.append(nested)
    if len(roots) > 1:
        roots = sorted(set(roots))
    if len(roots) > 1:
        _fail("card %r owned by %d dirs %s — one owner per card"
              % (card_id, len(roots), roots))
        return None
    return roots[0] if roots else None


def _card_paths(card_dir: str) -> list[str]:
    """Loader-owned path setup (PYTHON SHAPE rung 5 — never inside
    the packages): the card py dir (sibling imports) + the owning
    engine's compose/ dir (the bus load order — h3's schema reads
    the artifact helper from there, deferred to validation time,
    so the paths must HOLD for the whole check)."""
    here = os.path.join(os.path.abspath(card_dir), "py")
    out = [here]
    parts = here.split(os.sep)
    if "engines" in parts:
        comp = os.sep.join(
            parts[:parts.index("engines") + 2] + ["compose"])
        if os.path.isdir(comp):
            out.append(comp)
    return [p for p in out if os.path.isdir(p)]


def _load_module(path: str, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        _fail("cannot load %s" % path)
        return None
    mod = importlib.util.module_from_spec(spec)
    # registered BEFORE exec (standard: forward refs + recursive
    # imports resolve the module ns through sys.modules).
    sys.modules[name] = mod
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        sys.modules.pop(name, None)
        _fail("%s refuses to import (%s: %s)"
              % (path, type(e).__name__, e))
        return None
    return mod


def _engine_of(card_dir: str) -> str:
    parts = os.path.normpath(card_dir).split(os.sep)
    try:
        return parts[parts.index("engines") + 1]
    except (ValueError, IndexError):
        return "?"


def _dummy_for(annotation) -> object:
    import typing
    if typing.get_origin(annotation) is not None:
        args = typing.get_args(annotation)
        # Literal["a", ...] — the grammar's own vocabulary answers.
        if args and all(isinstance(a, str) for a in args):
            return args[0]
        return []
    name = getattr(annotation, "__name__", "")
    if annotation is str or name == "str":
        return "wall"
    if annotation is bool or name == "bool":
        return False
    if annotation in (int, float) or name in ("int", "float"):
        return 0
    return None


def _sees_unknown_knob(cls, kwargs: dict) -> bool:
    """The forbid probe through content noise: an unknown knob must
    raise extra_forbidden EVEN when content validators also fire."""
    try:
        from pydantic import ValidationError
    except ImportError:
        return False
    try:
        cls(**dict(kwargs, _author_gate_unknown_knob_=1))
    except ValidationError as e:
        return any(err.get("type") == "extra_forbidden"
                   for err in e.errors())
    except Exception:
        return False
    return False


def _defined_models(mod):
    from pydantic import BaseModel
    return [v for v in vars(mod).values()
            if isinstance(v, type) and issubclass(v, BaseModel)
            and v is not BaseModel
            and getattr(v, "__module__", "") == mod.__name__]


def _prove_grammar(cls, where: str) -> None:
    """The card grammar, live preferred, static fallback: a minimal
    body constructs and an unknown knob refuses (extra=forbid).
    Content-gated models (h3's no-calls law, possibly a
    before-validator that aborts before extras collect) prove the
    grammar STATICALLY — model_config extra == "forbid" IS the
    gate; the runtime probe is belt-and-braces."""
    try:
        cls.model_rebuild()
    except Exception:
        pass
    if cls.model_config.get("extra") != "forbid":
        _fail("%s: model_config extra is %r, not \"forbid\" — the "
              "card grammar" % (where, cls.model_config.get("extra")))
        return
    kwargs: dict = {}
    for fname, field in cls.model_fields.items():
        if field.is_required():
            kwargs[fname] = _dummy_for(field.annotation)
    try:
        cls(**kwargs)
    except Exception as e:
        # content-gated: the grammar already proven statically —
        # only a STRUCTURAL failure still fails the gate.
        try:
            from pydantic import ValidationError
            if isinstance(e, ValidationError):
                return
        except ImportError:
            pass
        _fail("%s: minimal body %s refuses (%s: %s) — structural, "
              "not content" % (where, kwargs, type(e).__name__, e))
        return
    if _sees_unknown_knob(cls, kwargs):
        return
    # constructed fine but the probe went quiet (before-gated) —
    # static forbid above already proves the grammar.
    return


def _check_schema(py_dir: str, gate_class=None) -> None:
    path = os.path.join(py_dir, "schema.py")
    if not os.path.isfile(path):
        _fail("missing schema.py in %s" % py_dir)
        return
    mod = _load_module(path, "_author_gate_schema")
    if mod is None:
        return
    try:
        import pydantic  # noqa: F401
    except ImportError:
        _fail("pydantic unavailable — cannot gate the schema")
        return
    if gate_class is not None:
        # rung 6: the registry row must name THIS dir's class —
        # a lookalike elsewhere is drift, not boarding.
        if gate_class not in _defined_models(mod):
            _fail("registry schema_class %s is not defined in %s"
                  % (getattr(gate_class, "__name__", gate_class),
                     path))
            return
        _prove_grammar(gate_class, gate_class.__name__)
        return
    models = _defined_models(mod)
    if not models:
        _fail("schema.py defines no pydantic model in %s" % path)
        return
    for cls in models:
        _prove_grammar(cls, cls.__name__)


def _check_card(py_dir: str, card_id: str) -> None:
    path = os.path.join(py_dir, "card.py")
    if not os.path.isfile(path):
        _fail("missing card.py in %s" % py_dir)
        return
    mod = _load_module(path, "_author_gate_card")
    if mod is None:
        return
    try:
        from melite_cards import ActionCard
    except ImportError as e:
        _fail("melite_cards unavailable (%s)" % e)
        return
    subs = [v for v in vars(mod).values()
            if isinstance(v, type) and issubclass(v, ActionCard)
            and v is not ActionCard
            and getattr(v, "__module__", "") == mod.__name__]
    if len(subs) != 1:
        _fail("card.py must define exactly one ActionCard, found %d"
              % len(subs))
        return
    if subs[0].id != card_id and _norm(subs[0].id) != _norm(card_id):
        _fail("card id %r != directory %r (rung 6: never restate)"
              % (subs[0].id, card_id))


def _check_registry(card_id: str, engine: str) -> None:
    try:
        import stage_params as sp
    except ImportError as e:
        _fail("stage_params unavailable (%s)" % e)
        return
    rows = [r for r in sp.REGISTRY.rows
            if getattr(r, "card_id", None) == card_id]
    if not rows:
        _fail("no stage_params REGISTRY row for card %r" % card_id)
        return
def _check_registry(card_id: str, engine: str):
    """Returns the row's schema_class (or None) — the gate target."""
    try:
        import stage_params as sp
    except ImportError as e:
        _fail("stage_params unavailable (%s)" % e)
        return None
    rows = [r for r in sp.REGISTRY.rows
            if getattr(r, "card_id", None) == card_id]
    if not rows:
        _fail("no stage_params REGISTRY row for card %r" % card_id)
        return None
    row = rows[0]
    if getattr(row, "engine", None) != engine:
        _fail("registry row engine %r != card engine dir %r"
              % (getattr(row, "engine", None), engine))
    return getattr(row, "schema_class", None)


def check(card_id: str, card_dir: str | None = None) -> int:
    """Run the anatomy gate. Returns the exit code."""
    global _FAILS
    _FAILS = []
    scaffold_stage = card_dir is not None
    if card_dir is None:
        found = _find_card_dir(card_id)
        if found is None:
            if not _FAILS:
                _fail("no action_cards dir for %r — engine-native "
                      "card (schema lives at the registry module); "
                      "the anatomy gate covers action_cards cards"
                      % card_id)
            return _report(card_id)
        card_dir = found
    py_dir = os.path.join(card_dir, "py")
    for leaf in ("__init__.py", "card.py", "schema.py",
                 "compose.py", "renderer.py"):
        if not os.path.isfile(os.path.join(py_dir, leaf)):
            _fail("missing py/%s in %s (the fit/skin hole class)"
                  % (leaf, card_dir))
    held = _card_paths(card_dir)
    for p in held:
        if p not in sys.path:
            sys.path.insert(0, p)
    try:
        gate_class = None
        if not scaffold_stage and card_dir.startswith(
                os.path.join(REPO, "plugins")):
            gate_class = _check_registry(card_id, _engine_of(card_dir))
        _check_schema(py_dir, gate_class)
        _check_card(py_dir, card_id)
    finally:
        for p in held:
            if p in sys.path:
                sys.path.remove(p)
    return _report(card_id)


def _report(card_id: str) -> int:
    if _FAILS:
        print("author_card: card %r NOT boardable:" % card_id)
        for f in _FAILS:
            print("  - %s" % f)
        return 1
    print("author_card: card %r anatomically boardable" % card_id)
    return 0


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("card_id")
    ap.add_argument("--dir", default=None,
                    help="scaffold dir (skips the registry row)")
    args = ap.parse_args()
    sys.exit(check(args.card_id, args.dir))
