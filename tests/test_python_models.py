#!/usr/bin/env python3
"""test_python_models.py — the models-as-python parity wall.

Pins the krea-2 flip (the ladder's first rung):
  1. the class-emitted catalog row == the yaml-era golden row
  2. the cascade walk (merged_defaults/resolve) matches the yaml
     semantics (turbo 8 / raw 52; raw route krea-2-raw)
  3. CROSS-VALIDATION — the killer feature: every model default must
     live inside the owning card's field domains (names, enums, bounds)
  4. refusals are LOUD: two-SSOTs, dirname law, bad artifact
  5. catalog._scan_model_dir serves the class row end-to-end

Standalone harness (pytest INTERNALERRORs on these — own mainloop).
"""

import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(REPO, "py"))
sys.path.insert(0, os.path.join(REPO, "plugins", "web", "models_py"))
sys.path.insert(0, os.path.join(REPO, "plugins", "web", "cards_py"))

sys.path.insert(0, REPO)

import catalog  # noqa: E402
from melite_models import (  # noqa: E402
    Model, Variant, Cell, ModelError, load_model_py, model_row,
    scan_engine_models, validate_against_cards,
)
from melite_cards import load_card_py  # noqa: E402

KREA_DIR = os.path.join(REPO, "plugins", "engines", "comfyui",
                        "models", "image", "krea-2")

_failures = []


def check(name, cond, detail=""):
    print("%s %s%s" % ("  ok " if cond else "FAIL", name,
                       (" — %s" % detail) if (detail and not cond) else ""))
    if not cond:
        _failures.append(name)


# ── 1. row parity vs the yaml-era golden ────────────────────────────
golden = json.load(open(os.path.join(
    HERE, "golden_http", "model-catalog.json")))["models"]["krea-2"]
cls = load_model_py(os.path.join(KREA_DIR, "model.py"), "comfyui")
row = model_row(cls, KREA_DIR)
check("golden row parity", row == golden,
      json.dumps({k: [row.get(k), golden.get(k)]
                  for k in set(row) | set(golden)
                  if row.get(k) != golden.get(k)})[:200])

# no yaml left next to the class (the flip is complete)
check("model.yaml deleted",
      not os.path.isfile(os.path.join(KREA_DIR, "model.yaml")))
check("variants/ deleted", not os.path.isdir(os.path.join(KREA_DIR, "variants")))

# ── 2. the cascade walk ─────────────────────────────────────────────
md = cls.merged_defaults
check("turbo steps 8", md("turbo")["steps"] == 8)
check("raw steps 52", md("raw")["steps"] == 52)
check("raw cfg 3.5", md("raw")["cfg"] == 3.5)
check("family default cell is turbo",
      md(None)["steps"] == md("turbo")["steps"])
route, engine, cell = cls.resolve("raw", "int8")
check("raw route", route == "krea-2-raw", route)
check("engine comfyui", engine == "comfyui", engine)
check("cell artifact validates", cell().artifact().size_bytes > 0)

# ── 3. cross-validation: model defaults ⊆ card field domains ────────
card = load_card_py(os.path.join(REPO, "plugins", "engines", "comfyui",
                                 "action_cards", "image-gen", "card.py"))
checked = validate_against_cards({"krea-2": cls}, {"image-gen": card})
check("cross-validation ran", checked == [("krea-2", "image-gen")],
      str(checked))


class _Bad(Model):
    id = "bad-bounds"
    defaults = dict(steps=8)
    card = "image-gen"


class _Good(Model):
    id = "good-model"
    defaults = dict(steps=8)
    card = "image-gen"


_bad_refused = False
try:
    _Bad.defaults = dict(steps=9999)
    validate_against_cards({"bad-bounds": _Bad}, {"image-gen": card})
except ModelError:
    _bad_refused = True
check("out-of-bounds default refuses", _bad_refused)

_unknown_refused = False
try:
    _Good.defaults = dict(not_a_field=1)
    validate_against_cards({"good-model": _Good}, {"image-gen": card})
except ModelError:
    _unknown_refused = True
check("unknown-field default refuses", _unknown_refused)

# ── 4. loud refusals ────────────────────────────────────────────────

with tempfile.TemporaryDirectory() as td:
    duo = os.path.join(td, "image-gen")     # dirname law: any id works?
    os.makedirs(duo)
    # two SSOTs: model.py + model.yaml in one dir
    with open(os.path.join(duo, "model.py"), "w") as f:
        f.write("from melite_models import Model\n"
                "class X(Model):\n    id = 'image-gen'\n")
    with open(os.path.join(duo, "model.yaml"), "w") as f:
        f.write("family:\n  id: image-gen\n")
    refused = False
    try:
        catalog._scan_model_dir(duo)
    except catalog.ValidationError:
        refused = True
    check("two-SSOTs refusal", refused)

    # dirname law: dir name != id refuses at load
    mis = os.path.join(td, "wrong-name")
    os.makedirs(mis)
    with open(os.path.join(mis, "model.py"), "w") as f:
        f.write("from melite_models import Model\n"
                "class X(Model):\n    id = 'other-id'\n")
    refused = False
    try:
        load_model_py(os.path.join(mis, "model.py"), "comfyui")
    except ModelError:
        refused = True
    check("dirname==id law refusal", refused)

    # bad artifact: sha not hex
    bad = os.path.join(td, "bad-sha")
    os.makedirs(bad)
    with open(os.path.join(bad, "model.py"), "w") as f:
        f.write("from melite_models import Model, Variant, Cell\n"
                "class C(Cell):\n"
                "    quant = 'int8'\n"
                "    source_url = 'https://x/y.safetensors'\n"
                "    size_bytes = 10\n"
                "    sha256 = 'nothex'\n"
                "class V(Variant):\n"
                "    Int8 = C\n"
                "class X(Model):\n"
                "    id = 'bad-sha'\n"
                "    V = V\n")
    refused = False
    try:
        load_model_py(os.path.join(bad, "model.py"), "comfyui")
    except ModelError as e:
        refused = "invalid artifact" in str(e)
    check("bad sha256 boot refusal", refused)

    # duplicate model ids across trees refuse
    check("scan dedups", "krea-2" in scan_engine_models(REPO))

# ── 5. end-to-end: catalog serves the class row ─────────────────────
pairs = catalog._scan_model_dir(KREA_DIR)
check("catalog serves one row", len(pairs) == 1)
srow, smeta = pairs[0]
check("catalog row == golden", srow == golden)
check("catalog meta shape",
      set(smeta) == {"studio_tenant", "studio_owns_params"})

print()
if _failures:
    print("FAIL %d check(s): %s" % (len(_failures), ", ".join(_failures)))
    sys.exit(1)
print("ALL MODEL PARITY CHECKS GREEN")
