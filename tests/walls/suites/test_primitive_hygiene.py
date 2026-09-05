"""PRIMITIVE-HYGIENE META-WALL — the extraction stroke's own regression pins.

Two gap classes this stroke paid for, pinned here so they cannot recur:

1. SHADOW PRIMITIVES (the 2026-09-05 extraction stroke): a pattern
   copied to a second card is an unextracted primitive — and once
   extracted, a lane that re-defines the kit name is a SHADOW
   (the find_template duplicate the stroke itself briefly added,
   caught by grep-before-count). This test AST-scans every comfyui
   lane compose/renderer/schema.py and refuses a def/class of any
   kit-owned name. New kit members extend _KIT_NAMES below with the
   extraction commit; the list is a pin, not a suggestion.

   Deliberately NOT pinned (documented, not forgotten):
   JsonValue/JsonDict/Num aliases — the compose arms still carry
   them lane-local (15 copies); moving them into the kit is a
   future migration that tightens this wall when it lands.
   compose/render_*/parse_card/*Card/*Params/*Doc-subclass names —
   the lane's contract surface, never kit names.

2. LEAKED TEST DOUBLES (the 2026-09-05 "boom" leak):
   test_gateway_strictness setattr'd a RAISING lambda onto
   lane_disclosure with no teardown — every later in-process caller
   inherited the failure (form_wire green isolated, red in suite).
   Bare setattr on an estate module is now a review event: EITHER
   use monkeypatch (auto-restored) OR carry a pinned allowlist
   entry naming the restore. The RUNTIME guard (tests/conftest.py
   _no_leaked_disclosure_doubles) catches an actual leak at the
   leaking test; this static pin catches the next unreviewed site.
"""

import ast
import os

import pytest

from _anchor import REPO  # tests/ + py/ inserts, owned by the shim

LANES = os.path.join(REPO, "plugins", "engines", "comfyui",
                     "action_cards")
LANE_FILES = ("compose.py", "renderer.py", "schema.py")

# Kit-owned names (the extraction stroke's inventory):
# compose/co_script/{skeleton,__init__,_coscript} + render_kit +
# melite_cards.validators. A lane def/class of any of these is a
# shadow — import the kit, delete the copy.
_KIT_NAMES = frozenset({
    # compose-arm skeleton + mount resolution
    "compose_skeleton", "find_template", "resolve_mount_input",
    # render kit
    "nodes", "finish", "strip_autofill", "strip_empty_autofill",
    "stack_loras", "load_text_pair", "decode_save",
    "CardDoc", "LoraPick",
    # validator vocabulary
    "positive", "positive_or_absent", "required_positive",
    "present", "seed_integral", "non_negative", "non_negative_int",
    "ranged", "int_ranged", "tile_bag_null",
    "empty_slot_null_for", "parse_card_body",
})


def _lane_py_files():
    out = []
    for genre in sorted(os.listdir(LANES)):
        gdir = os.path.join(LANES, genre)
        if not os.path.isdir(gdir):
            continue
        for card in sorted(os.listdir(gdir)):
            pydir = os.path.join(gdir, card, "py")
            if not os.path.isdir(pydir):
                continue
            for name in LANE_FILES:
                p = os.path.join(pydir, name)
                if os.path.isfile(p):
                    out.append(p)
    return out


def test_no_shadow_primitive_defs() -> None:
    """No lane re-defines a kit-owned name (def/class in
    compose/renderer/schema.py)."""
    offenders = []
    for path in _lane_py_files():
        with open(path, encoding="utf-8") as f:
            tree = ast.parse(f.read(), path)
        for node in ast.walk(tree):
            if isinstance(
                    node, (ast.FunctionDef, ast.AsyncFunctionDef,
                           ast.ClassDef)):
                if node.name in _KIT_NAMES:
                    offenders.append("%s:%d: %s shadows the kit" % (
                        os.path.relpath(path, REPO), node.lineno,
                        node.name))
    assert not offenders, (
        "lane files re-define kit-owned names (import the kit, "
        "delete the copy):\n" + "\n".join(offenders))


# ── leaked-double static pin ──────────────────────────────────────

def _py_top_levels():
    pydir = os.path.join(REPO, "py")
    return {f[:-3] for f in os.listdir(pydir) if f.endswith(".py")}


# (file, target-object, reason): bare-estate-setattr sites reviewed
# and carrying a PROVEN restore. A new site fails until it either
# converts to monkeypatch or lands here with its restore proof.
_SETATTR_ALLOWLIST = {
    # the LaneWireError doubles: setup lambdas plant them, the test
    # body restores the original in a finally (runtime guard
    # _no_leaked_disclosure_doubles proves no leak escapes).
    ("tests/unit/runtime/test_gateway_strictness.py", "ld",
     "raising doubles, finally-restored in-test"),
}


def _estate_aliases(tree):
    """Local names bound to estate modules (py/ top-levels,
    plugins.*) by import statements in this file."""
    tops = _py_top_levels()
    aliases = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                top = (a.asname or a.name).split(".")[0]
                root = a.name.split(".")[0]
                if root in tops or root == "plugins":
                    aliases.add(top)
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] in tops:
                for a in node.names:
                    aliases.add(a.asname or a.name)
    return aliases


def test_no_unreviewed_bare_setattr() -> None:
    """Bare setattr on an estate module needs a pinned allowlist
    entry (or, better, monkeypatch). Catches the next 'boom'. """
    offenders = []
    tests = os.path.join(REPO, "tests")
    for dirpath, _dirs, files in os.walk(tests):
        for name in sorted(files):
            if not name.endswith(".py"):
                continue
            path = os.path.join(dirpath, name)
            with open(path, encoding="utf-8",
                      errors="replace") as f:
                try:
                    tree = ast.parse(f.read(), path)
                except SyntaxError:
                    continue
            aliases = _estate_aliases(tree)
            if not aliases:
                continue
            rel = os.path.relpath(path, REPO)
            for node in ast.walk(tree):
                if not (isinstance(node, ast.Call)
                        and isinstance(node.func, ast.Name)
                        and node.func.id == "setattr"
                        and node.args
                        and isinstance(node.args[0], ast.Name)
                        and node.args[0].id in aliases):
                    continue
                key = (rel, node.args[0].id)
                if not any(k[0] == key[0] and k[1] == key[1]
                           for k in _SETATTR_ALLOWLIST):
                    offenders.append(
                        "%s:%d: bare setattr on estate module '%s' "
                        "— use monkeypatch, or pin an allowlist "
                        "entry with the restore proof"
                        % (rel, node.lineno, node.args[0].id))
    assert not offenders, "\n".join(offenders)
