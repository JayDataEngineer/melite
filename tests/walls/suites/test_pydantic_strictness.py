"""test_pydantic_strictness.py — the zero-tolerance pydantic wall.

Operator order (2026-09-04, the dead-rider sweep): pydantic's DEFAULT
is silent tolerance — `extra="ignore"` drops unknown fields, loose
coercion bends types. PYTHON SHAPE LAW already demands frozen rows
validated at construction; this wall sweeps EVERY pydantic model the
gateway can reach and pins the two contract points:

  1. extra == "forbid"  — a dead rider (unknown JSON key) is a
     construction refusal, never a silent drop
  2. frozen is True     — rows are data; mutation after construction
     is the drift surface rung 2 killed

Plus the poison fuzzer: every model, handed a `__dead_rider__` key on
an otherwise-minimal payload, must refuse with `extra_forbidden` —
proving the contract at RUNTIME, not just in config text.

Discovery mirrors the estate's own import surface (loader-owned
mechanics, shape law rung 5): repo python/ on sys.path, each engine's
plugin root on sys.path (the compose/ library contract), naive spec
import per file, LOUD on holes — a target file that fails to import
fails this suite, so the sweep can never silently shrink.
"""

import importlib.util
import sys
from pathlib import Path

import pytest
from pydantic import BaseModel, ValidationError

REPO = Path(__file__).resolve().parents[3]

# The estate's model-declaration surface: every file that can define
# a pydantic row the gateway constructs at runtime.
def _target_files() -> list[Path]:
    files: list[Path] = []
    files += (REPO / "infra" / "python").glob("*.py")
    files += (REPO / "python/melite_models").glob("*.py")
    files += (REPO / "python/melite_cards").glob("*.py")
    # THE ONE plugin-dir walk (python/plugins.py:iter_plugin_dirs_under —
    # no per-consumer copies): depth-2 plugins AND depth-3 category
    # containers (cpp/<plugin>). The 2026-09-05 audit found the old
    # per-engine globs silently missed ALL 40 files under cpp/ —
    # every cpp plugin's rows were unswept.
    sys.path.insert(0, str(REPO / "infra" / "python"))
    import plugins as _plugins
    for pdir in _plugins.iter_plugin_dirs_under(
            REPO / "packages" / "engines"):
        files += pdir.glob("models/*/*/model.py")
        files += pdir.glob("models/*/*/mods/*.py")
        files += pdir.glob("action_cards/*/*/python/*.py")
        # the compose packages (card/chain/artifact/preset rows — the
        # 2026-09-05 sweep found these extra=ignore, silently dropping
        # dead riders; the glob hole is why it survived)
        files += pdir.glob("compose/*.py")
        files += pdir.glob("compose/co_script/*.py")
        files += pdir.glob("compose/ui/*.py")
        p = pdir / "plugin.py"
        if p.is_file():
            files.append(p)
    return sorted({f for f in files if "__pycache__" not in str(f)})


def _discover_models() -> dict[str, type[BaseModel]]:
    """Every pydantic model DEFINED in a target file, imported through
    the loader's own path contract. MEMOIZED: co_script's renderer
    registry refuses duplicate registrations, so the sweep executes
    each file exactly once per process."""
    global _MODELS
    if _MODELS is not None:
        return _MODELS
    _MODELS = _discover_locked()
    return _MODELS


def _discover_locked() -> dict[str, type[BaseModel]]:
    sys.path.insert(0, str(REPO / "infra" / "python"))
    # compose libraries resolve from the plugin root and the compose
    # package dir (co_script / _coscript) — the same contract
    # python/plugins.py load_engine honors for card py modules
    for eng in (REPO / "packages/engines").iterdir():
        if eng.is_dir():
            sys.path.insert(0, str(eng))
            comp = eng / "compose"
            if comp.is_dir():
                sys.path.insert(0, str(comp))

    # (2026-09-07) the co_script renderer-registry snapshot/clear/
    # restore dance died with the python render plane (b324c480):
    # co_script/ and the card renderer.py files no longer exist, so
    # there is no shared registry left to poison. The sweep itself is
    # unchanged — it imports the surviving surface (python/, models/,
    # compose/*.py, the cpp/node arms' python/, compose/ui/).

    found: dict[str, type[BaseModel]] = {}
    if True:
        for f in _target_files():
            rel = str(f.relative_to(REPO))
            modname = "strictwall_" + rel.replace(
                "/", "_").replace(".", "_").replace("-", "_")
            # package-member files (a dir with __init__.py, e.g. the h3
            # card's python/ tree) import under a synthetic parent package so
            # relative imports resolve — the same context the card loader
            # provides at runtime
            parent_pkg = None
            if (f.parent / "__init__.py").is_file():
                import hashlib
                tag = hashlib.sha1(str(f.parent).encode()).hexdigest()[:8]
                parent_pkg = "strictwall_pkg_" + tag
                if parent_pkg not in sys.modules:
                    import types
                    pkg = types.ModuleType(parent_pkg)
                    pkg.__path__ = [str(f.parent)]
                    sys.modules[parent_pkg] = pkg
            try:
                qname = ("%s.%s" % (parent_pkg, f.stem)
                         if parent_pkg else modname)
                spec = importlib.util.spec_from_file_location(qname, f)
                mod = importlib.util.module_from_spec(spec)
                sys.modules[qname] = mod
                spec.loader.exec_module(mod)
            except Exception as e:  # LOUD: no silent holes in the sweep
                raise AssertionError(
                    "strictness sweep cannot import %s: %s" % (f, e)) from e
            for name, obj in vars(mod).items():
                if (isinstance(obj, type) and issubclass(obj, BaseModel)
                        and obj is not BaseModel
                        and obj.__module__ == qname):
                    found["%s:%s" % (f.relative_to(REPO), name)] = obj
    _MODELS = found
    return found


_MODELS: dict[str, type[BaseModel]] | None = None


@pytest.fixture(scope="module")
def models() -> dict[str, type[BaseModel]]:
    return _discover_models()


def test_discovery_finds_the_estate(models: dict[str, type[BaseModel]]) -> None:
    """The sweep is not empty and covers the law's own named rows."""
    assert len(models) >= 20, (
        "discovery collapsed — the sweep must not silently shrink")
    names = {k.split(":")[-1] for k in models}
    for expected in ("LoraRow", "CellArtifact", "Flow", "Stage"):
        assert expected in names, (
            "%s not discovered — the sweep has a hole" % expected)


def test_every_model_forbids_extra_fields(models: dict[str, type[BaseModel]]) -> None:
    """NO DEAD RIDERS: an unknown key is a construction refusal."""
    bad = [k for k, cls in models.items()
           if cls.model_config.get("extra") != "forbid"]
    assert not bad, (
        "models that silently DROP unknown fields (set "
        'extra="forbid" — PYTHON SHAPE LAW, the dead-rider order '
        "2026-09-04): %s" % sorted(bad))


def test_every_model_is_frozen(models: dict[str, type[BaseModel]]) -> None:
    """Rows are data: mutation after construction is banned (rung 2)."""
    bad = [k for k, cls in models.items()
           if cls.model_config.get("frozen") is not True]
    assert not bad, (
        "mutable models (set frozen=True — PYTHON SHAPE LAW rung 2, "
        "'mutability dies with frozen=True'): %s" % sorted(bad))


@pytest.mark.parametrize("key", sorted(_discover_models()))
def test_dead_riders_are_rejected_at_runtime(key: str) -> None:
    """The poison fuzzer: every model, handed a __dead_rider__ key on
    a minimal payload, refuses with extra_forbidden — the contract
    proven at runtime, not just declared in config."""
    cls = _discover_models()[key]
    payload: dict[str, int | bool | str | None] = {}
    for fname, finfo in cls.model_fields.items():
        ann = finfo.annotation
        if not finfo.is_required():
            continue
        if ann is int or ann is float:
            payload[fname] = 0
        elif ann is bool:
            payload[fname] = True
        elif ann is str:
            payload[fname] = "valid"
        else:
            payload[fname] = None
    payload["__dead_rider__"] = "should crash"
    with pytest.raises(ValidationError) as exc:
        cls.model_validate(payload)
    types = {e["type"] for e in exc.value.errors()}
    # The contract: NO SILENT ACCEPTANCE — the rider never constructs.
    # extra_forbidden is the canonical refusal; a before-validator
    # firing first (value_error) refuses just as loudly — the static
    # config test above pins extra="forbid" independently.
    assert types, "%s swallowed a dead rider" % key
