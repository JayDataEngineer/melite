"""test_catalog_contract.py — the catalog contract wall (python half).

The 2026-08-11 directive: "make declarative contracts in the Zustand
and pydantic so it's impossible to fail this". Only the Zustand half
existed — packages/web-kit/catalog/src/catalogContract.ts — and on 2026-09-05 it
caught at RUNTIME (operator-visible toast) what every backend gate had
shipped: four `form = ''` model rows with the key silently dropped.

This wall is the python half. The frontend validator's model-entry
gate is mirrored here and run against BOTH the live scan and the
golden — parity with a sick golden is self-consistency, not
correctness, and the golden must never again RECORD a violation.

The construction-side gates (offering ⊕ unoffered, ModelRow.form
required) live in melite_models grammar; this wall proves they fire
and pins the scan-side invariant (unoffered classes never serve).

Run: pytest tests/walls/suites/test_catalog_contract.py
"""

import json
import os
import re

from _anchor import REPO

import catalog
from melite_models import Cell, Model, ModelError, Quant, Variant

# The CASCADE GATE (2026-09-05, image-edit rework): every Model subclass
# declares family head → variants → quant cells. The honest probe shapes
# below carry the minimal single-config cascade (NATIVE cell — the probe
# is a weightless declaration, the same row a weightless lane declares).
_HONEST_CASCADE = {
    "variants": (Variant(id="base", cells=(Cell(quant=Quant.NATIVE),)),),
}

GOLDEN = os.path.join(REPO, "tests", "golden_http", "model-catalog.json")


def _is_nonempty_str(v: str | None) -> bool:
    return isinstance(v, str) and v.strip() != ""


def _model_violations(models: dict[str, dict[str, str]]) -> list[str]:
    """The model-entry gate, mirroring catalogContract.ts: every
    served model routes (family) and renders (form) and shows a
    label. A violation here is the 'missing required key(s)' class
    the webui toast reported."""
    out = []
    if not isinstance(models, dict) or not models:
        return ["models is not a non-empty record"]
    for mid, row in models.items():
        if not isinstance(row, dict):
            out.append("%s: not an object" % mid)
            continue
        missing = [k for k in ("family", "form", "label")
                   if not _is_nonempty_str(row.get(k))]
        if missing:
            out.append("%s: missing required key(s) %s"
                       % (mid, ", ".join(missing)))
    return out


def _family_violations(families: dict[str, dict[str, str | list[str]]]) -> list[str]:
    out = []
    if not isinstance(families, dict) or not families:
        return ["families is not a non-empty record"]
    for fid, fam in families.items():
        if not isinstance(fam, dict):
            out.append("%s: not an object" % fid)
            continue
        if not _is_nonempty_str(fam.get("label")):
            out.append("%s: no label" % fid)
        mods = fam.get("modifiers")
        if mods is not None and not isinstance(mods, list):
            out.append("%s: modifiers not an array" % fid)
    return out


def test_scan_upholds_the_contract() -> None:
    """The LIVE scan: every served model routes and renders."""
    served = json.loads(catalog.to_json(catalog.scan_catalog(str(REPO))))
    bad = _model_violations(served["models"]) + \
        _family_violations(served["families"])
    assert not bad, "served catalog violations:\n  " + "\n  ".join(bad)


def test_golden_upholds_the_contract() -> None:
    """The golden can never again RECORD a violation — parity with a
    sick golden passes; this is the gate the ltx-2-3 incident exposed
    as missing (the golden had absorbed the formless rows and the
    parity wall blessed them)."""
    golden = json.load(open(GOLDEN))
    bad = _model_violations(golden["models"]) + \
        _family_violations(golden["families"])
    assert not bad, "golden records violations:\n  " + "\n  ".join(bad)


def test_served_models_are_offered_and_formed() -> None:
    """Scan-side invariant: every catalog-served class is offered
    (unoffered classes serve no row), its form is non-empty, and its
    spelling rides the form_* vocabulary the editor resolves. The
    class walk is plugins.iter_plugin_dirs_under — the ONE walk
    (depth-2 AND depth-3 owners), same law as catalog._scan_models;
    scan_engine_models only sees depth-2 and is blind to cpp/."""
    from pathlib import Path
    from melite_models import load_model_py
    import plugins as _plugins
    eng_root = Path(REPO) / "packages" / "engines"
    classes = {}
    for owner in _plugins.iter_plugin_dirs_under(eng_root):
        models_dir = owner / "models"
        if not models_dir.is_dir():
            continue
        for genre_dir in models_dir.iterdir():
            if not genre_dir.is_dir():
                continue
            for mdir in genre_dir.iterdir():
                mpy = mdir / "model.py"
                if mpy.is_file():
                    cls = load_model_py(str(mpy), owner.name)
                    classes[cls.id] = cls
    unoffered_ids = {mid for mid, cls in classes.items()
                     if getattr(cls, "unoffered", False)}
    served_ids = set(catalog.scan_catalog(str(REPO))["models"])
    leaked = served_ids & unoffered_ids
    assert not leaked, "unoffered classes on the wire: %s" % sorted(leaked)
    missing = served_ids - set(classes)
    assert not missing, "served ids with no class: %s" % sorted(missing)
    for mid in served_ids:
        cls = classes[mid]
        assert _is_nonempty_str(cls.form), (
            "%s serves a row but its class form is empty" % mid)
        assert cls.form.startswith("form_") and \
            all(c.islower() or c.isdigit() or c == "_"
                for c in cls.form[5:]), (
                "%s.form = %r — the editor form vocabulary is "
                "form_[a-z0-9_]+" % (mid, cls.form))


def test_construction_refuses_the_lazy_shapes() -> None:
    """The compile-time gate itself: the four lazy spellings refuse at
    class creation; the two honest ones build. form='' is the retired
    unoffered hack — the exact string that sailed through every gate
    and burned the webui."""
    def build(**ns: str | bool | tuple[Variant, ...]) -> str | None:
        try:
            type("Probe", (Model,), ns)
            return None
        except ModelError as e:
            return str(e)

    m = build(id="x", form="")
    assert m and "hack is dead" in m, m
    m = build(id="x", form="form_generate", unoffered=True)
    assert m and "ambiguous" in m, m
    m = build(id="x")
    assert m and "neither form nor unoffered" in m, m
    m = build(id="x", unoffered="true")
    assert m and "must be a bool" in m, m
    assert build(id="x", form="form_generate", **_HONEST_CASCADE) is None
    assert build(id="x", unoffered=True, **_HONEST_CASCADE) is None


def test_served_row_schema_requires_form() -> None:
    """ModelRow refuses a formless row at construction — the wire
    schema is the second gate behind the class gate."""
    from melite_models import ModelRow
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        ModelRow.model_validate({"id": "x", "family": "x",
                                 "genre": "image", "label": "X"})
    row = ModelRow.model_validate({"id": "x", "family": "x",
                                   "genre": "image", "label": "X",
                                   "form": "form_generate"})
    assert row.form == "form_generate"
    with pytest.raises(ValidationError):
        ModelRow.model_validate({"id": "x", "family": "x",
                                 "genre": "image", "label": "X",
                                 "form": ""})


# ── the loras door + the door-truth law (2026-09-05, the second
# incident: LoraPicker fetched /v1/loras?model=… over 12 DECLARED
# krea-2 rows and the route table had no such row — nothing refused
# the gap because nothing cross-checked "frontend fetches a door" ⊆
# "backend serves a door") ─────────────────────────────────────────


def test_loras_door_serves_the_declared_packs() -> None:
    """The /v1/loras body builder serves EXACTLY the class-declared
    LorasMod rows: filenames verbatim in declaration order, meta keyed
    by file stem, for every offered model that declares a pack — and
    an honest empty list for models that declare none. krea-2's pack
    is golden-pinned (tests/golden_http/loras_krea-2.json)."""
    from melite_cards import LorasMod
    repo = str(REPO)
    scan = catalog.scan_catalog(repo)
    declared = {}
    for row in scan.get("_scan_models", ()):
        cls = row.get("_model_class") or _class_for(row["id"], repo)
        rows = [r for mod in getattr(cls, "mods", ())
                if isinstance(mod, type)
                and issubclass(mod, LorasMod)
                for r in mod.rows]
        if rows:
            declared[row["id"]] = rows
    assert "krea-2" in declared, "krea-2's LorasMod pack vanished"
    for mid, rows in declared.items():
        body = catalog.model_loras(repo, mid)
        assert body is not None, "%s declares a pack but the door 404s" % mid
        assert body["loras"] == [r.filename for r in rows], mid
        assert body["model"] == mid
        for r in rows:
            stem = re.sub(r"\.(safetensors|pt|bin)$", "",
                          r.filename.rsplit("/", 1)[-1])
            assert stem in body["meta"], "%s: meta missing %s" % (mid, stem)
            assert body["meta"][stem].get("label", "") == r.label
    # unknown / unoffered models refuse; loraless models serve honest empty
    assert catalog.model_loras(repo, "no-such-model") is None
    assert catalog.model_loras(repo, "ltx-2-3") is None    # unoffered
    loraless = [row["id"] for row in scan.get("_scan_models", ())
                if row["id"] not in declared]
    if loraless:
        body = catalog.model_loras(repo, loraless[0])
        assert body is not None and body["loras"] == [] and \
            body["note"] is None, loraless[0]
    # the golden pin
    with open(os.path.join(REPO, "tests", "golden_http",
                           "loras_krea-2.json"), encoding="utf-8") as f:
        want = json.load(f)
    got = catalog.model_loras(repo, "krea-2")
    assert got == want, "krea-2 loras pack drifted from the golden"


def _class_for(model_id: str, repo: str) -> type[Model]:
    """model id -> class via the door's own walk (catalog.model_loras
    resolves it the same way; the scan rows carry no class handle)."""
    from melite_models import load_model_py
    import plugins as _plugins
    from pathlib import Path
    eng_root = Path(repo) / "packages" / "engines"
    for owner in _plugins.iter_plugin_dirs_under(eng_root):
        models_dir = owner / "models"
        if not models_dir.is_dir():
            continue
        for genre_dir in models_dir.iterdir():
            if not genre_dir.is_dir():
                continue
            for mdir in genre_dir.iterdir():
                mpy = mdir / "model.py"
                if mpy.is_file():
                    cls = load_model_py(str(mpy), owner.name)
                    if cls.id == model_id:
                        return cls
    raise AssertionError("no class for %s" % model_id)
