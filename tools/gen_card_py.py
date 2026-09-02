#!/usr/bin/env python3
"""gen_card_py — the card flip generator (2026-09-02).

One-shot converter: card.yaml `parameters:` block → card.py ActionCard
class. ZERO transcription risk by construction — the data source is the
WIRE PARSER'S OWN OUTPUT (editor_forms._parse_card_parameters), never a
re-reading of the yaml text. The emitted class must satisfy:

    field_spec(cls, model, vocab) == yaml-era _card_spec(model)

per served family — proven by the staging parity pass (--check) BEFORE
any file is written. Declaration order IS field order (the parser's
list order, verbatim).

Flip protocol per card (mirrors the model flip):
  1. --check  : staging parity for every served family (loud on drift)
  2. --write  : emit <card>/card.py + strip the parameters: block from
                card.yaml (identity: card:/families:/principles: stay
                until the identity rung)

Parked (parameters: blocks kept, no card.py): inpaint, audio-gen —
unserved cards whose families resolve to no model.
"""

import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "py"))
sys.path.insert(0, os.path.join(REPO, "plugins", "web", "cards_py"))

import editor_forms as ef                     # noqa: E402

TYPE_CLASS = {
    "select": "Select", "textarea": "Textarea", "text": "Text",
    "number": "Number", "slider": "Slider", "seed": "Seed",
    "boolean": "Boolean", "image": "Image", "audio": "Audio",
    "video": "Video", "file": "File", "loras": "Loras",
    "controlnet": "ControlNet",
}

IMPORTS = ("ActionCard", "Field", "Select", "Textarea", "Text", "Number",
           "Slider", "Seed", "Boolean", "Image", "Audio", "Video", "File",
           "Loras", "ControlNet", "VocabRef")

PARKED = ("inpaint", "audio-gen")   # unserved — parameters blocks stay


def _pystr(s):
    return repr(str(s))


def _numlit(v):
    """has_-flagged numeric: integral floats print int-like (C %g)."""
    if float(v).is_integer():
        return str(int(v))
    return repr(float(v))


def _defval_lit(defval):
    """defval string → python literal, matching _emit_field's emission:
    numeric strings emit as numbers ('42' → 42, '0.5' → 0.5), anything
    else stays the verbatim string."""
    if re.fullmatch(r"[+-]?\d+", defval):
        return str(int(defval))
    if re.fullmatch(r"[+-]?\d*\.\d+", defval):
        return repr(float(defval))
    return _pystr(defval)


def _options_lit(f):
    """options string → VocabRef(...) | python list literal.

    The wire forms: '$samplers'/'$schedulers' (vocab), '[...]' (inline
    JSON), '"a","b"' (block-style accumulated — the parser's artifact).
    All non-vocab forms emit the same JSON list on the wire; declaring a
    python list is the clean equivalent."""
    raw = f["options"]
    if not raw:
        return None
    if raw in ("$samplers", "$schedulers"):
        return "VocabRef(%r)" % raw
    import json
    if raw.startswith("["):
        items = json.loads(raw)
    else:
        items = json.loads("[%s]" % raw)
    return "[" + ", ".join(_pystr(i) for i in items) + "]"


def _families_lit(raw):
    """families string → list literal (tokens as-written, like
    _families_keep's tokenizer — normalization happens at match time)."""
    if not raw:
        return None
    toks = raw.replace("[", " ").replace("]", " ").replace(",", " ").split()
    if not toks:
        return None
    return "[" + ", ".join(_pystr(t) for t in toks) + "]"


def _kw(f):
    """The Field kwargs for one parsed field, in DSL order."""
    kw = []
    if f["label"]:
        kw.append("label=%s" % _pystr(f["label"]))
    if f["group"]:
        kw.append("group=%s" % _pystr(f["group"]))
    if f["zone"]:
        kw.append("zone=%s" % _pystr(f["zone"]))
    for n in ("order", "width", "columns", "min", "max", "step"):
        if f["has_" + n]:
            kw.append("%s=%s" % (n, _numlit(f[n])))
    if f["defval"]:
        kw.append("default=%s" % _defval_lit(f["defval"]))
    if f["required"]:
        kw.append("required=True")
    if f["placeholder"]:
        kw.append("placeholder=%s" % _pystr(f["placeholder"]))
    if f["tooltip"]:
        kw.append("tooltip=%s" % _pystr(f["tooltip"]))
    if f["visible_when"]:
        kw.append("visible_when=%s" % _pystr(f["visible_when"]))
    ol = _options_lit(f)
    if ol is not None:
        kw.append("options=%s" % ol)
    fl = _families_lit(f["families"])
    if fl is not None:
        kw.append("families=%s" % fl)
    return kw


def _card_header(cy):
    """id/label/families from the card.yaml's own identity sections
    (editor_forms._card_identity_path + catalog's families-row scan)."""
    ident = ef._card_identity_path(cy)
    cid = ident.get("id") or os.path.basename(os.path.dirname(cy))
    label = ident.get("label") or ""
    # families rows: catalog's card-yaml parse (identity_path lacks them)
    import catalog
    ct = catalog._parse_card_yaml(open(cy, "r", encoding="utf-8",
                                       errors="surrogateescape").read())
    fams = list(ct.get("families") or [])
    return cid, label, fams


def gen_card_py(cy):
    """→ (source_text, cid, field_count)."""
    fields = ef._parse_card_parameters(cy)
    if not fields:
        return None, None, 0
    cid, label, fams = _card_header(cy)
    cname = "".join(p.capitalize() for p in re.split(r"[^a-zA-Z0-9]", cid)
                    if p) + "Card"
    L = []
    L.append("# %s — PYTHON surface (2026-09-02, the card flip)" % cid)
    L.append("#")
    L.append("# 1:1 port of card.yaml's parameters: block, generated by")
    L.append("# tools/gen_card_py.py from the WIRE PARSER'S output")
    L.append("# (editor_forms._parse_card_parameters) — zero transcription")
    L.append("# risk. Parity with the yaml-era serving is pinned by")
    L.append("# tests/test_python_cards.py against the golden form-specs.")
    L.append("#")
    L.append("# SSOT law: card.yaml keeps card:/families:/principles: (the")
    L.append("# identity rung folds those later); the FIELD SURFACE lives")
    L.append("# HERE and ONLY here — a parameters: block in card.yaml")
    L.append("# alongside this file is a LOUD refusal at load (two SSOTs")
    L.append("# is zero SSOTs).")
    L.append("")
    L.append("import os")
    L.append("import sys")
    L.append("")
    L.append("sys.path.insert(")
    L.append("    0, os.path.join(os.path.dirname(os.path.abspath(__file__)),")
    L.append('                    "..", "..", "..", "..", "web", "cards_py"))')
    L.append("")
    L.append("from melite_cards import (%s)" % ", ".join(IMPORTS))
    L.append("")
    L.append("")
    L.append("class %s(ActionCard):" % cname)
    L.append('    id = %s' % _pystr(cid))
    if label:
        L.append('    label = %s' % _pystr(label))
    if fams:
        L.append("    families = (%s%s)" % (
            ", ".join(_pystr(f) for f in fams),
            "," if len(fams) == 1 else ""))
    for f in fields:
        tcls = TYPE_CLASS.get(f["type"])
        kw = _kw(f)
        if tcls is None:
            # free-form wire type (e.g. h3-timeline's `int` seeds) — the
            # DSL's direct Field use with an explicit type= kwarg
            kw.insert(0, "type=%s" % _pystr(f["type"]))
            args = ("(%s)" % ", ".join(kw)) if kw else "()"
            L.append("    %-24s = Field%s" % (f["name"], args))
        else:
            args = ("(%s)" % ", ".join(kw)) if kw else "()"
            L.append("    %-24s = %s%s" % (f["name"], tcls, args))
    L.append("")
    return "\n".join(L), cid, len(fields)


def strip_parameters_block(cy):
    """Remove the `parameters:` section (to EOF or the next top-level
    key) from card.yaml. Returns the new text or None when absent."""
    lines = open(cy, "r", encoding="utf-8",
                 errors="surrogateescape").read().splitlines(True)
    out, in_params = [], False
    for ln in lines:
        if not in_params:
            if ln.rstrip("\n") == "parameters:":
                in_params = True
                continue
            out.append(ln)
        else:
            if ln.strip() == "":
                continue      # blank INSIDE the section — stays dropped
            if ln[0] not in " \t":
                in_params = False
                out.append(ln)
                continue
            # indented parameter lines are dropped
    # trim trailing blanks so the file ends clean
    while out and out[-1].strip() == "":
        out.pop()
    out.append("")
    return "".join(out) if out else None


def iter_cards():
    """(card_dir, card.yaml) for every engine card dir with a card.yaml."""
    for engine in sorted(os.listdir(os.path.join(REPO, "plugins",
                                                 "engines"))):
        croot = os.path.join(REPO, "plugins", "engines", engine, "cards")
        if not os.path.isdir(croot):
            continue
        for cid in sorted(os.listdir(croot)):
            cy = os.path.join(croot, cid, "card.yaml")
            if os.path.isfile(cy):
                yield cid, cy


def served_families(cy):
    """Family rows that resolve to a live model (the parity walk set)."""
    import catalog
    ct = catalog._parse_card_yaml(open(cy, "r", encoding="utf-8",
                                       errors="surrogateescape").read())
    fams = list(ct.get("families") or [])
    live = []
    for f in fams:
        probe = ef._norm(f)
        if os.path.isdir(_model_dir_of(probe)) or \
                os.path.isdir(_model_dir_of(f)):
            live.append(f)
    return live


def _model_dir_of(mid):
    for engine in sorted(os.listdir(os.path.join(REPO, "plugins",
                                                 "engines"))):
        mroot = os.path.join(REPO, "plugins", "engines", engine, "models")
        if not os.path.isdir(mroot):
            continue
        for genre in os.listdir(mroot):
            d = os.path.join(mroot, genre, mid)
            if os.path.isdir(d):
                return d
    return "/nonexistent"


def main():
    args = [a for a in sys.argv[1:]]
    write = "--write" in args
    check_only = "--check" in args
    only = None
    if "--only" in args:
        only = args[args.index("--only") + 1]

    import tempfile
    import shutil
    from melite_cards import load_card_py, field_spec

    drift = flipped = 0
    for cid, cy in iter_cards():
        if only and cid != only:
            continue
        if cid in PARKED:
            print("PARK  %s (unserved — parameters block stays)" % cid)
            continue
        if os.path.isfile(os.path.join(os.path.dirname(cy), "card.py")):
            print("SKIP  %s (already flipped)" % cid)
            continue
        fields = ef._parse_card_parameters(cy)
        if not fields:
            print("SKIP  %s (no parameters block)" % cid)
            continue

        # staging parity: class fragment == yaml-era fragment, per family
        fams = served_families(cy)
        src, got_cid, nfields = gen_card_py(cy)
        engine = cy.split(os.sep)[-4]
        engine_dir = os.path.dirname(os.path.dirname(os.path.dirname(cy)))
        vocab = {
            "samplers": ef._option_list(REPO, "samplers", engine_dir),
            "schedulers": ef._option_list(REPO, "schedulers", engine_dir),
        }
        bad = []
        with tempfile.TemporaryDirectory() as td:
            stage = os.path.join(td, cid)
            os.makedirs(stage)
            open(os.path.join(stage, "card.py"), "w").write(src)
            cls = load_card_py(os.path.join(stage, "card.py"), engine)
            for fam in fams:
                model = ef._norm(fam)
                want = ef._card_spec(REPO, model) if False else None
                # yaml-era fragment: parse from the ORIGINAL yaml text
                # (the live tree still has no card.py — _card_spec IS
                # the yaml path right now)
                want = ef._card_spec(REPO, model)
                if want is None:
                    continue
                got = field_spec(cls, model, vocab,
                                 service=want.get("service"))
                if got != want:
                    bad.append((model, _first_diff(got, want)))
        if bad:
            drift += 1
            print("DRIFT %s" % cid)
            for m, d in bad:
                print("      %s: %s" % (m, d))
            continue

        proof = " × ".join(ef._norm(f) for f in fams) if fams else "(no live family)"
        print("%s %-12s %2d fields, parity: %s" % (
            "WROTE" if write else "PROVEN", cid, nfields, proof))
        if write:
            cdir = os.path.dirname(cy)
            open(os.path.join(cdir, "card.py"), "w").write(src)
            new = strip_parameters_block(cy)
            if new is None:
                raise SystemExit("%s: parameters block vanished?" % cy)
            open(cy, "w", encoding="utf-8",
                 errors="surrogateescape").write(new)
            flipped += 1
    if drift:
        print("\n%d card(s) drifted — nothing written for them" % drift)
        return 1
    if write:
        print("\n%d card(s) flipped" % flipped)
    return 0


def _first_diff(a, b, path="$"):
    if type(a) is not type(b):
        return "%s: type %s != %s" % (path, type(a).__name__,
                                      type(b).__name__)
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                return "%s.%s missing in class" % (path, k)
            if k not in b:
                return "%s.%s missing in yaml" % (path, k)
            d = _first_diff(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return "%s: len %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = _first_diff(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    return None if a == b else "%s: %r != %r" % (path, a, b)


if __name__ == "__main__":
    sys.exit(main())
