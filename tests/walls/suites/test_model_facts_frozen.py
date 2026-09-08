"""test_model_facts_frozen.py — the hand-owned facts freeze wall.

PURGE S-facts (2026-09-08): tools/export_model_facts.py is deleted —
model-facts.json is HAND-OWNED frozen data (meta block inside names
the deleted generator + this wall). Models change rarely; a new
model is a hand edit, verified here + behaviorally by the compose
goldens (test_cordis_compose.py executes against this file).

What this wall pins (shape + cross-pins, never the oracle):
- the file parses with EXACTLY {meta, extension_node_types, models}
  (a stray key is a merge slip; a missing key breaks loadFacts).
- the meta header (HAND-OWNED rule: the generator names the deleted
  exporter, the status says frozen, the wall names this file).
- every models row: required keys, id == key, owning card in the TS
  registry (the deleted exporter's owning-card assertion, inverted
  to the surviving direction), knob/output/variant row shapes.
- registry -> facts coverage: every boarded family of every
  registered card has a facts row (the exporter's "a boarded family
  without a facts row is unbornable", now pinned against the file).
- extension_node_types: every pack maps a non-empty node list.

Run: python3 tests/walls/suites/test_model_facts_frozen.py
Script-world shape (check() accumulates, PASS n / FAIL m, nonzero
on failure). No gateway, no GPU — file reads + the registry
dumper only.
"""

import json
import os
import re
import sys

PASS = FAIL = 0


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                            (" — " + str(note)[:160] if note and not ok else "")))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


REPO = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))

FACTS = os.path.join(REPO, "packages", "engines", "comfyui",
                     "cordis", "data", "model-facts.json")

# PURGE S-decls pattern: the registry is the single declaration —
# read it through the serving-owned dumper. {id: row}.
import subprocess as _sp  # noqa: E402

_dump = _sp.run(
    ["node", "--experimental-strip-types", "--no-warnings",
     os.path.join(REPO, "packages", "engines", "comfyui", "cordis",
                   "src", "dump-registry.ts")],
    cwd=REPO, capture_output=True, text=True, timeout=180)
assert _dump.returncode == 0, \
    "registry dumper rc=%d %s" % (_dump.returncode,
                                  (_dump.stderr or "")[-300:])
CARDS = json.loads(_dump.stdout.strip().splitlines()[-1])["cards"]

# NodeClass.idx.input with optional dotted sub-widget path (h3's
# ImageSharpenKJ.0.method.* — the sharpen node's method is a nested
# widget group; the exporter wrote the full coordinate). The class
# segment allows ONE pipe (WD14Tagger|pysssss — the real ComfyUI
# custom-node class name; the pysssss pack namespaces with a pipe).
_INJECT_RE = re.compile(
    r"^[A-Za-z0-9_]+(\|[A-Za-z0-9_]+)?\.\d+\.[a-zA-Z_][a-zA-Z0-9_]*"
    r"(\.[a-zA-Z_][a-zA-Z0-9_]*)*$")
_ROW_KEYS = {"id", "card", "card_knobs", "defaults", "lane_inputs",
             "outputs", "variant_groups", "variants"}


def main() -> int:
    with open(FACTS, encoding="utf-8") as f:
        facts = json.load(f)
    # ── F1: exact top-level shape ──
    check("top-level keys exactly {meta, extension_node_types, models}",
          set(facts) == {"meta", "extension_node_types", "models"},
          "keys=%r" % sorted(facts))
    meta = facts.get("meta", {})
    # ── F2: the HAND-OWNED header ──
    check("meta names the deleted exporter",
          "export_model_facts" in meta.get("generator", "")
          and "DELETED" in meta.get("generator", ""),
          "generator=%r" % meta.get("generator"))
    check("meta status says hand-owned frozen",
          "HAND-OWNED" in meta.get("status", ""),
          "status=%r" % meta.get("status"))
    check("meta wall names this file",
          meta.get("wall", "").startswith(
              "tests/walls/suites/test_model_facts_frozen.py"),
          "wall=%r" % meta.get("wall"))
    # ── F3: the exporter stays deleted ──
    check("export_model_facts.py stays deleted",
          not os.path.isfile(os.path.join(REPO, "tools",
                                           "export_model_facts.py")))
    models = facts.get("models", {})
    check("models non-empty", isinstance(models, dict) and len(models) > 0,
          "type=%s len=%d" % (type(models).__name__, len(models or {})))
    # ── F4: row shape + owning card in the registry ──
    bad_shape, bad_card, bad_knob, bad_out = [], [], [], []
    empty_inject: list = []
    for mid, row in sorted(models.items()):
        if not isinstance(row, dict) or not _ROW_KEYS <= set(row):
            bad_shape.append(mid)
            continue
        if row.get("id") != mid:
            bad_shape.append("%s (id=%r)" % (mid, row.get("id")))
        if row.get("card") not in CARDS:
            bad_card.append("%s (card=%r)" % (mid, row.get("card")))
        for k in row.get("card_knobs", []):
            if (not isinstance(k, dict) or set(k) != {"card", "inject", "kind"}
                    or not k.get("card") or k.get("kind") not in ("n", "s", "b")
                    or not isinstance(k.get("inject"), str)
                    or (k["inject"] != ""
                        and not _INJECT_RE.match(k["inject"]))):
                bad_knob.append("%s: %r" % (mid, k))
            elif k["inject"] == "":
                empty_inject.append("%s/%s" % (mid, k["card"]))
        for o in row.get("outputs", []):
            if (not isinstance(o, dict) or set(o) != {"patterns", "label", "many"}
                    or not o.get("patterns")
                    or not isinstance(o.get("many"), bool)):
                bad_out.append("%s: %r" % (mid, o))
        if not isinstance(row.get("defaults"), dict):
            bad_shape.append("%s (defaults not a dict)" % mid)
    check("every models row carries the required keys with id == key",
          not bad_shape, "%r" % bad_shape)
    check("every models row's card is a registered card",
          not bad_card, "%r" % bad_card)
    check("every card_knobs row is {card, inject, kind} with a "
          "NodeClass.idx.input inject — or '' (no splice: the knob "
          "rides the def's hardcoded graph, not the facts row; "
          "compose passes card_knobs: [] — a future stroke may drop "
          "the column, this census says where)",
          not bad_knob, "%r" % bad_knob)
    check("empty-inject knob census stable (23 in 7 models)",
          len(empty_inject) == 23, "%r" % sorted(empty_inject))
    check("every outputs row is {patterns non-empty, label, many bool}",
          not bad_out, "%r" % bad_out)
    # ── F5: extension map shape ──
    ent = facts.get("extension_node_types", {})
    bad_packs = [p for p, nodes in sorted(ent.items())
                 if not isinstance(nodes, list) or not nodes
                 or not all(isinstance(n, str) and n for n in nodes)]
    check("extension_node_types non-empty pack -> non-empty node list",
          isinstance(ent, dict) and len(ent) > 0 and not bad_packs,
          "packs=%d bad=%r" % (len(ent or {}), bad_packs))
    # ── F6: registry -> facts coverage (unbornable, inverted) ──
    uncovered = sorted({fam for cid, row in CARDS.items()
                        for fam in row.get("boarded", [])
                        if fam not in models})
    check("every boarded family has a facts row",
          not uncovered, "%r" % uncovered)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
