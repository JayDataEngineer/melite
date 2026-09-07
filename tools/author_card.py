#!/usr/bin/env python3
"""author_card — the card-authoring door (row 7, 2026-09-07).

An agent boarding a card by hand edits five files + a registry row
and finds out at GPU time. Two halves, one door:

  check <card_id>          a boarded card (dir + schema + card + row)
  check --dir <card-dir>   a scaffold dir (no registry row yet)
  scaffold --spec-file <json> --out <dir>
                           write the five-file anatomy from a spec

Exit 0: anatomically boardable / scaffolded. Exit 1: the EXACT
missing piece (or the spec refusal). The scaffold writes dirs the
check accepts — `scaffold` then `check --dir` is the authoring
loop. The REGISTRY ROW is printed, not written (boarding slice);
compose.py/renderer.py are honest stubs (the lane arm is slice 3).
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


_SPEC_TYPES = {"str": "str", "int": "int", "float": "float",
               "bool": "bool"}
_SPEC_DEFAULTS = {"str": '""', "int": "0", "float": "0.0",
                  "bool": "False"}


def _camel(card_id: str) -> str:
    return "".join(w.capitalize() for w in
                   _norm(card_id).split("_") if w)


def _validate_spec(spec: dict) -> list[str]:
    """The spec grammar — refusals name the rule, never a traceback."""
    errs: list[str] = []
    import re
    cid = spec.get("card_id", "")
    if not re.match(r"^[a-z_][a-z0-9_-]*$", cid or ""):
        errs.append("card_id %r must match ^[a-z_][a-z0-9_-]*$ "
                    "(the metaclass IDENT_RE)" % (cid,))
    for key in ("genre", "label", "description"):
        if not spec.get(key):
            errs.append("spec needs %r (the card declares it)" % key)
    seen: set[str] = set()
    for i, p in enumerate(spec.get("params", [])):
        name = p.get("name", "")
        if not re.match(r"^[a-z_][a-z0-9_]*$", name or ""):
            errs.append("params[%d].name %r must be a lowercase "
                        "identifier (the metaclass _FIELD_NAME_RE)"
                        % (i, name))
        if name in seen:
            errs.append("params[%d].name %r restated (rung 6)"
                        % (i, name))
        seen.add(name)
        if p.get("type") not in _SPEC_TYPES:
            errs.append("params[%d].type %r not in %s (closed "
                        "vocabulary — rung 3)"
                        % (i, p.get("type"),
                           sorted(_SPEC_TYPES)))
        if p.get("required") and "default" in p:
            errs.append("params[%d] %r: required + default is a "
                        "contradiction — pick one" % (i, name))
    models = spec.get("models", [])
    if not models:
        errs.append("models: a card boards at least one Model class "
                    "(the metaclass refuses models=() — name the "
                    "model file + class)")
    for i, m in enumerate(models):
        if not m.get("file") or not m.get("class"):
            errs.append("models[%d] needs {file, class} (repo-"
                        "relative model file + class name)" % i)
        elif not os.path.isfile(os.path.join(REPO, m["file"])):
            errs.append("models[%d].file %r not in the tree"
                        % (i, m["file"]))
    return errs


def _schema_py(spec: dict, cls: str) -> str:
    lines = [
        '"""%s — the card param document (scaffolded, row 7).'
        % spec["card_id"],
        "",
        "ONE frozen row (extra=\"forbid\"): a typo'd knob is a",
        "field-named refusal at the VALIDATION door, never a silently-",
        "defaulted GPU run. Semantic guards (validators) and the lane",
        "arm land in the boarding slices — this file is the grammar.",
        '"""',
        "",
        "from pydantic import BaseModel, ConfigDict",
        "from melite_cards import validators as _v",
        "from melite_cards.validators import JsonDict",
        "",
        "",
        "class %sParams(BaseModel):" % cls,
        '    """The wire param surface (card fields), typed + closed."""',
        '    model_config = ConfigDict(frozen=True, extra="forbid")',
        "",
    ]
    for p in spec.get("params", []):
        t = _SPEC_TYPES[p["type"]]
        if p.get("required"):
            lines.append("    %s: %s" % (p["name"], t))
        elif "default" in p:
            lines.append("    %s: %s = %r" % (p["name"], t,
                                              p["default"]))
        else:
            lines.append("    %s: %s = %s" % (p["name"], t,
                                              _SPEC_DEFAULTS[p["type"]]))
    if spec.get("requires_model"):
        lines.append('    # the flow-stage model row (card= stages name it).')
        lines.append('    model: str = ""')
    lines += [
        "",
        "",
        "def parse_card(body: JsonDict) -> %sParams:" % cls,
        '    """Wire body → frozen row (shared construction door)."""',
        "    return _v.parse_card_body(body, %sParams)" % cls,
        "",
    ]
    return "\n".join(lines)


def _card_py(spec: dict, cls: str, py_dir: str) -> str:
    loads = []
    names = []
    for m in spec.get("models", []):
        var = m["class"]
        rel = os.path.relpath(os.path.join(REPO, m["file"]), py_dir)
        loads.append("%s = load_model_py(os.path.join(_HERE, %r), %r)"
                     % (var, rel, spec.get("engine", "comfyui")))
        names.append(var)
    return "\n".join([
        '# %s (scaffolded, row 7).' % spec["card_id"],
        "#",
        "# TODO(boarding): the sidebar trio",
        "# (sidebar_order/sidebar/default_service), form fields,",
        "# ability tile. The completeness wall refuses the card until",
        "# the trio lands — this file is the skeleton.",
        "",
        "import os",
        "",
        "from melite_cards import ActionCard",
        "from melite_models import load_model_py",
        "",
        "_HERE = os.path.dirname(os.path.abspath(__file__))",
        "",
    ] + loads + [
        "",
        "",
        "class %sCard(ActionCard):" % cls,
        "    id = '%s'" % spec["card_id"],
        "    label = '%s'" % spec["label"],
        "    description = '%s'" % spec["description"],
        "    genre = '%s'" % spec["genre"],
        "    models = (%s,)" % ", ".join(names),
        "",
    ])


def _stub_py(spec: dict, kind: str) -> str:
    if kind == "compose":
        body = ("def compose_%s(doc) -> dict:\n"
                '    """The card arm (slice 3) — phase 1 validates, '
                'phase 2 renders."""\n'
                "    raise NotImplementedError(\n"
                "        \"%s: lane arm not authored (row-7 slice 3)\")\n"
                % (_norm(spec["card_id"]), spec["card_id"]))
        head = "the %s card arm (scaffolded, row 7 — STUB)."
    else:
        body = ("def render_%s(doc) -> dict:\n"
                '    """The graph emitter (slice 3 — models never '
                'render, rung 8)."""\n'
                "    raise NotImplementedError(\n"
                "        \"%s: graph emitter not authored "
                "(row-7 slice 3)\")\n"
                % (_norm(spec["card_id"]), spec["card_id"]))
        head = "the %s graph emitter (scaffolded, row 7 — STUB)."
    return "\n".join([
        '"""%s' % (head % spec["card_id"]),
        "",
        "Import-safe by construction (stdlib only) — the anatomy",
        "gate never imports these; the lane slice replaces them.",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "",
        body,
    ])


def scaffold(spec: dict, out: str) -> int:
    """Write the five-file anatomy from a validated spec. Pure
    function of the spec (no timestamps) — scaffold twice,
    byte-identical."""
    errs = _validate_spec(spec)
    if errs:
        print("author_card: spec refused:")
        for e in errs:
            print("  - %s" % e)
        return 1
    if os.path.exists(out) and os.listdir(out):
        print("author_card: out dir %r not empty — refusing to "
              "clobber (delete it or pick another)" % out)
        return 1
    cls = _camel(spec["card_id"])
    py_dir = os.path.join(out, "py")
    os.makedirs(py_dir, exist_ok=True)
    files = {
        "__init__.py": ("# %s — the card package — python lives HERE "
                        "(THE CARD PATTERN, golden base).\n"
                        % spec["card_id"]),
        "card.py": _card_py(spec, cls, os.path.abspath(py_dir)),
        "schema.py": _schema_py(spec, cls),
        "compose.py": _stub_py(spec, "compose"),
        "renderer.py": _stub_py(spec, "renderer"),
    }
    for leaf, text in files.items():
        with open(os.path.join(py_dir, leaf), "w") as f:
            f.write(text)
    print("author_card: scaffolded %r -> %s"
          % (spec["card_id"], out))
    print("  registry row (boarding slice applies it, never hand-"
          "shaped):")
    print('    card_id="%s", engine="%s",  # schema: %sParams, '
          "requires_model=%s"
          % (spec["card_id"], spec.get("engine", "<engine>"), cls,
             bool(spec.get("requires_model"))))
    return 0


if __name__ == "__main__":
    import argparse
    import json
    if len(sys.argv) > 1 and sys.argv[1] == "scaffold":
        ap = argparse.ArgumentParser(description=__doc__)
        ap.add_argument("--spec-file", required=True,
                        help="the card spec (JSON)")
        ap.add_argument("--out", required=True,
                        help="the card dir to write")
        args = ap.parse_args(sys.argv[2:])
        with open(args.spec_file) as f:
            _spec = json.load(f)
        sys.exit(scaffold(_spec, args.out))
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("card_id")
    ap.add_argument("--dir", default=None,
                    help="scaffold dir (skips the registry row)")
    args = ap.parse_args()
    sys.exit(check(args.card_id, args.dir))
