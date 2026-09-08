#!/usr/bin/env python3
"""Declaration-schema parity wall (RED wall, part 1 of 2 — wall-first).

Compares, PER CARD (the 19 comfyui cards), the python declaration plane
(packages/engines/comfyui/cordis/data/card-decls.json — generated from
card.py: boarded/REQUIRES/schemaMeta) against the hand-mirrored TS card
surface (packages/engines/comfyui/cordis/src/cards/*.ts).

Run: python3 tests/walls/suites/test_decl_schema_parity.py

Expected: RED on the drifted cards (that IS the point). PASS legs only
where py==ts genuinely holds. A wall that passes everywhere on first
run is SUSPECT — the ledger guarantees at least image-gen-boarded and
img-to-mesh-keys fail.

Legs per card:
  (a) boarded families: py boarded[] vs TS boarded[].
  (b) requires: py requires[] (+requiresByFamily union) vs TS requires[];
      FAIL also when py has requiresByFamily but the TS card carries no
      requiresByFamily key (the union-flattening is LOSSY drift).
  (c) schema keys: py schemaMeta[] names vs TS zod/schemastery leaf keys.
      Branch-constant inlines (TS-only keys such as filename_prefix,
      media_type/crop/scale, dit_model/vae_model, h3 renderer knobs)
      COUNT as drift and are flagged [TS-ONLY inline?].
  (d) defaults: py schemaMeta defaults vs TS .default() literals for the
      SAME key names. Mechanical equality table ONLY — no
      ride-the-model policy judgment (a TS pin where py rides, or a
      bare required where py defaults, is just a table row).

PARSE RULES (TS side, stdlib-only static parse — no node, no ts compile):
  P1. Comment strip runs through a mini-lexer that respects
      single/double/backtick string literals (so `//` inside a string
      never starts a comment); block comments /* */ likewise.
  P2. boarded/requires come from the FIRST `boarded: [...]` /
      `requires: [...]` literal in the comment-stripped file (both live
      in the single registerCard call; DOTALL, non-greedy to the first
      `]`); entries are the single/double-quoted literals inside. A
      card with no `requires:` key reads as [] (stock-only lane).
      `requiresByFamily` presence is the regex `requiresByFamily\\s*:`.
  P3. Schema block: the FIRST `const schema = z.object({` block; if the
      file has none, `const paramSchema = z.object({` (h3-timeline: the
      renderer vocabulary is paramSchema, wrapped by function schema).
      Block end = the brace matching the opening `{` (depth count).
  P4. Leaf keys: inside the block, nested `z.object({...})` spans are
      blanked (length-preserving, via brace matching), string literals
      are blanked, then top-level `KEY:` identifiers are collected.
      Nested-row keys (crop.x, loras[].name, scale.method) never count.
  P5. Defaults: per key, the row text from the end of its `KEY:` match
      to the next key match (or block end) is scanned for the first
      `.default(`/ paren-matched literal. No `.default(` = ABSENT
      (bare `z.string()` = required). `nullable(...).default(null)`
      reads as null.
  P6. Default equality (mechanical): bools case-fold ('true' == true),
      numbers compare numerically (30 == 30.0), lists/dicts compare as
      canonical JSON, None/null == 'null', other strings compare exact.
      py ABSENT vs any TS literal = MISMATCH (TS pins); py value vs TS
      ABSENT = MISMATCH (TS requires). No policy verdict — table only.
  P7. Const-inlines (info): module-level `const NAME =` declarations
      with an ALL-CAPS head (RESOLUTIONS, CAPTION_TASKS, UNET_GOLD,
      AUTOFILL_STRIP, ...) are listed per card as the branch-constant
      inline evidence. They do not score; the TS-ONLY schema keys do.
  P8. Verbs (info, anny only): py verbs[] ids are listed against the
      TS file's verb surface (SubAction/registerSubAction/verb ids);
      TS has no verb surface, so this is a note, never a scored leg.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
CARDS = REPO / "packages" / "engines" / "comfyui" / "cordis" / "src" / "cards"
DECLS = REPO / "packages" / "engines" / "comfyui" / "cordis" / "data" / "card-decls.json"

PASS: list[str] = []
FAIL: list[str] = []
DETAIL: list[str] = []  # per-card diff rows (the report table)


# ---------------------------------------------------------------- lexing

def strip_comments(src: str) -> str:
    """Remove // and /* */ comments; string literals (incl. `//`) survive."""
    out: list[str] = []
    i, n = 0, len(src)
    quote: str | None = None
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if quote is not None:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(nxt)
                i += 2
                continue
            if c == quote:
                quote = None
            i += 1
            continue
        if c in ("'", '"', "`"):
            quote = c
            out.append(c)
            i += 1
            continue
        if c == "/" and nxt == "/":
            while i < n and src[i] != "\n":
                i += 1
            continue
        if c == "/" and nxt == "*":
            i += 2
            while i < n and not (src[i] == "*" and i + 1 < n and src[i + 1] == "/"):
                i += 1
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


def match_brace(src: str, open_idx: int) -> int:
    """Index of the `}` matching the `{`/`[`/`(` at open_idx (strings aware)."""
    pairs = {"{": "}", "[": "]", "(": ")"}
    want = pairs[src[open_idx]]
    depth = 0
    i, n = open_idx, len(src)
    quote: str | None = None
    while i < n:
        c = src[i]
        if quote is not None:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
            i += 1
            continue
        if c in ("'", '"', "`"):
            quote = c
            i += 1
            continue
        if src[open_idx] == "{":
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return i
        elif src[open_idx] == "(":
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    return i
        else:
            if c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    raise ValueError(f"unbalanced {src[open_idx]!r} at {open_idx}")


def blank_spans(src: str, spans: list[tuple[int, int]]) -> str:
    buf = list(src)
    for a, b in spans:
        for i in range(a, min(b + 1, len(buf))):
            if buf[i] != "\n":
                buf[i] = " "
    return "".join(buf)


def blank_strings(src: str) -> str:
    buf = list(src)
    i, n = 0, len(src)
    while i < n:
        if buf[i] in ("'", '"', "`"):
            q = buf[i]
            buf[i] = " "
            i += 1
            while i < n and buf[i] != q:
                if buf[i] == "\\":
                    buf[i] = " "
                    i += 1
                if i < n and buf[i] != "\n":
                    buf[i] = " "
                i += 1
            if i < n:
                buf[i] = " "
                i += 1
        else:
            i += 1
    return "".join(buf)


# ---------------------------------------------------------------- TS reads

def quoted_literals(body: str) -> list[str]:
    return re.findall(r"""['"]([^'"]+)['"]""", body)


def read_list_key(stripped: str, key: str) -> list[str] | None:
    m = re.search(r"(?:^|[\s{,])" + re.escape(key) + r"\s*:\s*\[", stripped)
    if not m:
        return None
    open_idx = m.group(0).rindex("[") + m.start()
    close = match_brace(stripped, open_idx)
    return quoted_literals(stripped[open_idx:close])


def schema_block(stripped: str) -> tuple[str, str]:
    """Return (which, inner_text) of the zod leaf block per P3."""
    for name in ("const schema = z.object({", "const paramSchema = z.object({"):
        idx = stripped.find(name)
        if idx != -1:
            open_idx = stripped.find("{", idx)
            close = match_brace(stripped, open_idx)
            which = "schema" if name.startswith("const schema") else "paramSchema"
            return which, stripped[open_idx + 1:close]
    raise ValueError("no const schema/paramSchema z.object block found")


def ts_leaf_keys(block: str) -> tuple[list[str], dict[str, str | None]]:
    """Leaf keys + per-key raw .default() literal (None = ABSENT) per P4/P5."""
    # blank nested z.object spans (length-preserving) so inner keys never count
    spans: list[tuple[int, int]] = []
    for m in re.finditer(r"z\.object\(\{", block):
        open_idx = m.group(0).rindex("{") + m.start()
        spans.append((m.start(), match_brace(block, open_idx)))
    work = blank_spans(block, spans)
    keyed = blank_strings(work)
    keys: list[tuple[str, int, int]] = [
        (m.group(1), m.start(), m.end())
        for m in re.finditer(r"([A-Za-z_][A-Za-z0-9_]*)\s*:", keyed)
    ]
    defaults: dict[str, str | None] = {}
    order: list[str] = []
    for pos, (key, _s, e) in enumerate(keys):
        nxt = keys[pos + 1][1] if pos + 1 < len(keys) else len(work)
        row = work[e:nxt]
        dm = re.search(r"\.default\(", row)
        if not dm:
            defaults[key] = None
        else:
            open_idx = dm.group(0).rindex("(") + dm.start()
            close = match_brace(row, open_idx)
            defaults[key] = row[open_idx + 1:close].strip()
        if key not in order:
            order.append(key)
    return order, defaults


def const_inlines(raw: str) -> list[str]:
    return re.findall(r"(?m)^const\s+([A-Z][A-Z0-9_]*)\b", raw)


def ts_verbs_present(stripped: str) -> list[str]:
    hits: list[str] = []
    for pat in (r"registerSubAction", r"SubAction", r"\bverb[s]?\s*:"):
        if re.search(pat, stripped):
            hits.append(pat)
    return hits


# ---------------------------------------------------------------- defaults

def parse_ts_literal(raw: str):
    s = raw.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"', "`"):
        return s[1:-1]
    low = s.lower()
    if low == "true":
        return True
    if low == "false":
        return False
    if low in ("null", "undefined"):
        return None
    if s in ("[]", "{}"):
        return json.loads(s)
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        pass
    return s  # e.g. oneOf(X).default(...) residue — compare raw


def canon(v) -> str:
    if isinstance(v, bool):
        return "true" if v else "false"
    if v is None:
        return "null"
    if isinstance(v, float):
        return "%g" % v
    if isinstance(v, int):
        return str(v)
    if isinstance(v, (list, dict)):
        return json.dumps(v, sort_keys=True)
    s = str(v)
    if s.lower() in ("true", "false"):  # py 'true' select-string == TS true
        return s.lower()
    return "str:" + s


# ---------------------------------------------------------------- wall

def main() -> int:
    try:
        decls = json.loads(DECLS.read_text())
    except (OSError, ValueError) as e:
        print(f"FAIL card-decls.json unreadable: {e}")
        return 1
    ts_files = sorted(CARDS.glob("*.ts"))
    if len(ts_files) != 19:
        FAIL.append(f"wall:card-count: expected 19 TS cards, found {len(ts_files)}")
    matrix: list[tuple[str, str, str, str, str]] = []

    for path in ts_files:
        raw = path.read_text()
        try:
            stripped = strip_comments(raw)
        except ValueError as e:
            FAIL.append(f"{path.stem}:parse: comment strip failed: {e}")
            matrix.append((path.stem, "FAIL", "FAIL", "FAIL", "FAIL"))
            continue
        # card id: registerCard id, else the filename stem
        m = re.search(r"registerCard\(\{\s*id\s*:\s*['\"]([^'\"]+)['\"]", stripped)
        cid = m.group(1) if m else path.stem
        if cid not in decls:
            FAIL.append(f"{cid}:parse: no py decl row in card-decls.json")
            matrix.append((cid, "FAIL", "FAIL", "FAIL", "FAIL"))
            continue
        py = decls[cid]
        legs = {"a": "ok", "b": "ok", "c": "ok", "d": "ok"}

        # ---- (a) boarded
        try:
            ts_boarded = read_list_key(stripped, "boarded") or []
        except ValueError as e:
            FAIL.append(f"{cid}:boarded: TS parse failed: {e}")
            legs["a"] = "FAIL"
            ts_boarded = []
        py_boarded = list(py.get("boarded", []))
        if legs["a"] != "FAIL" and set(ts_boarded) != set(py_boarded):
            legs["a"] = "FAIL"
            FAIL.append(f"{cid}:boarded")
            DETAIL.append(
                f"  {cid:14s} (a) boarded FAIL py={sorted(py_boarded)} "
                f"ts={sorted(ts_boarded)} "
                f"missing-from-ts={sorted(set(py_boarded) - set(ts_boarded))} "
                f"extra-in-ts={sorted(set(ts_boarded) - set(py_boarded))}")
        else:
            PASS.append(f"{cid}:boarded")

        # ---- (b) requires (+by_family)
        try:
            ts_requires = read_list_key(stripped, "requires")
            ts_req = ts_requires if ts_requires is not None else []
        except ValueError as e:
            FAIL.append(f"{cid}:requires: TS parse failed: {e}")
            legs["b"] = "FAIL"
            ts_req = []
        py_req = list(py.get("requires", []))
        byfam: dict = py.get("requiresByFamily", {}) or {}
        py_union = sorted(set(py_req) | {p for v in byfam.values() for p in v})
        has_byfam_key = re.search(r"requiresByFamily\s*:", stripped) is not None
        flat_drift = set(ts_req) != set(py_union)
        struct_drift = bool(byfam) and not has_byfam_key
        if legs["b"] != "FAIL" and (flat_drift or struct_drift):
            legs["b"] = "FAIL"
            FAIL.append(f"{cid}:requires")
            DETAIL.append(
                f"  {cid:14s} (b) requires FAIL py.requires={sorted(py_req)} "
                f"py.by_family={json.dumps(byfam, sort_keys=True)} "
                f"py.union={py_union} ts={sorted(ts_req)} "
                f"ts.requiresByFamily={'present' if has_byfam_key else 'ABSENT (flattened)'}")
        else:
            PASS.append(f"{cid}:requires")

        # ---- (c) schema keys
        try:
            which, block = schema_block(stripped)
            ts_keys, ts_defaults = ts_leaf_keys(block)
        except ValueError as e:
            FAIL.append(f"{cid}:keys: TS parse failed: {e}")
            legs["c"] = "FAIL"
            which, ts_keys, ts_defaults = "?", [], {}
        py_names = [f["name"] for f in py.get("schemaMeta", [])]
        inlines = const_inlines(raw)
        if legs["c"] != "FAIL" and set(ts_keys) != set(py_names):
            legs["c"] = "FAIL"
            FAIL.append(f"{cid}:keys")
            DETAIL.append(
                f"  {cid:14s} (c) keys FAIL ({which}) py[{len(py_names)}]={sorted(py_names)}")
            DETAIL.append(
                f"  {cid:14s}     ts[{len(ts_keys)}]={sorted(ts_keys)}")
            DETAIL.append(
                f"  {cid:14s}     py-only={sorted(set(py_names) - set(ts_keys))} "
                f"ts-only[inline?]={sorted(set(ts_keys) - set(py_names))}")
            DETAIL.append(
                f"  {cid:14s}     const-inlines[{len(inlines)}]={inlines}")
        else:
            PASS.append(f"{cid}:keys")
            if legs["c"] == "ok":
                DETAIL.append(
                    f"  {cid:14s} (c) keys ok ({which}) {len(ts_keys)} keys match; "
                    f"const-inlines[{len(inlines)}]={inlines}")

        # ---- (d) defaults (same key names only; table only, P6)
        mism: list[str] = []
        for f in py.get("schemaMeta", []):
            name = f["name"]
            if name not in ts_defaults:
                continue  # key drift already scored in (c)
            py_has = "default" in f
            py_val = f.get("default")
            ts_raw = ts_defaults[name]
            if not py_has and ts_raw is None:
                continue
            if not py_has and ts_raw is not None:
                mism.append(f"{name}: py=ABSENT(ride) ts={ts_raw}")
                continue
            if py_has and ts_raw is None:
                mism.append(f"{name}: py={py_val!r} ts=ABSENT(required)")
                continue
            assert ts_raw is not None
            if canon(py_val) != canon(parse_ts_literal(ts_raw)):
                mism.append(f"{name}: py={py_val!r} ts={ts_raw}")
        if mism:
            legs["d"] = "FAIL"
            FAIL.append(f"{cid}:defaults")
            DETAIL.append(f"  {cid:14s} (d) defaults FAIL [{len(mism)}]")
            for row in mism:
                DETAIL.append(f"  {cid:14s}     {row}")
        else:
            PASS.append(f"{cid}:defaults")

        # ---- verbs note (info only, anny)
        verbs = py.get("verbs", []) or []
        if verbs and not ts_verbs_present(stripped):
            DETAIL.append(
                f"  {cid:14s} (info) verbs: py has {len(verbs)} "
                f"{sorted(v['id'] for v in verbs)}; TS carries no verb surface (unscored)")

        matrix.append((cid, legs["a"], legs["b"], legs["c"], legs["d"]))

    print("per-card parity (py card-decls.json vs TS cards/*.ts static parse):")
    print(f"  {'card':14s} {'(a)board':8s} {'(b)req':8s} {'(c)keys':8s} {'(d)deft':8s}")
    for cid, a, b, c, d in matrix:
        print(f"  {cid:14s} {a:8s} {b:8s} {c:8s} {d:8s}")
    print("diffs (FAIL legs only; (d) is a table, no policy verdict):")
    for row in DETAIL:
        print(row)
    for p in PASS:
        print(f"  ok   {p}")
    for f in FAIL:
        if ":" in f and f.split(":")[1] in ("boarded", "requires", "keys", "defaults"):
            print(f"  FAIL {f}")
        elif f.startswith("wall:"):
            print(f"  FAIL {f}")
    print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
    if FAIL:
        print("WALL RED — py decls and TS cards drift (see table above)")
    else:
        print("WALL GREEN")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
