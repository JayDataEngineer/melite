"""test_gateway_doors.py — the door gate wall (frontend ⊆ backend).

Born from the loras incident (2026-09-05): LoraPicker fetched
/v1/loras?model=… over 12 DECLARED krea-2 rows and the gateway's
route table had no such row — the picker rendered "No LoRAs
installed" while the python rows existed. No gate refused the gap
because nothing cross-checked the two sides.

The automation this wall pins:
  1. GENERATION — packages/web-kit/catalog/src/generated/gatewayDoors.ts is
     generated FROM the authored routes.ts
     (packages/web-kit/catalog/scripts/gen-gateway-doors.ts —
     TS-native since generators STEP 3; the py tool's dead
     web/catalog OUT_PATH died with it).
     A stale generated file fails --check here.
  2. THE COMPILE GATE — apiFetch/apiJson accept ONLY
     FetchUrl = GatewayDoorUrl | ExternalUrl. There is NO unserved
     escape: a call site naming a door the gateway does not serve is
     a compile error (operator order 2026-09-05: "NO MORE DEBT.
     KILL KILL. NO FALLBACK. NO LEGACY SHIMS"). This wall RUNS tsc
     on the editor app, so the type error is a wall failure even if
     nobody typechecks locally. The unservedDoors.ts debt ledger and
     its unservedDoor() escape lived for one hour and died in the
     same stroke that deleted the 25 dead surfaces.
  3. THE SERVED SET — the authored routes.ts table parses back to
     the literal-door set (+ regex stems) with the same
     string-aware reader the routes-mirror wall owns
     (tests/walls/suites/test_routes_mirror.py): 54 rows, the
     queue doors present, the WS stems present. A row edit that
     breaks the rigid shape fails the parse leg LOUDLY.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the lazy
py-oracle import that split literal/regex doors died with
the py serving oracle — the served set reads the authored TS
table now (same string-aware shape as the routes-mirror wall).

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: pytest tests/walls/suites/test_gateway_doors.py
"""

import json
import re
import subprocess

from _anchor import REPO

ROUTES_TS = REPO / "packages" / "gateway" / "src" / "routes.ts"

EXPECT_ROWS = 54


def _strip_comments(text: str) -> str:
    """Remove // and /* */ comments outside string literals."""
    out: list[str] = []
    i, n = 0, len(text)
    in_str = False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\":
                if i + 1 < n:
                    out.append(text[i + 1])
                    i += 1
            elif c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
        elif c == "/" and i + 1 < n and text[i + 1] == "/":
            while i < n and text[i] != "\n":
                i += 1
        elif c == "/" and i + 1 < n and text[i + 1] == "*":
            i += 2
            while i + 1 < n and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i += 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def _split_top_objects(array_body: str) -> list[str]:
    """Top-level {...} spans of an array literal (string-aware)."""
    objs: list[str] = []
    i, n = 0, len(array_body)
    while i < n:
        if array_body[i] != "{":
            i += 1
            continue
        depth = 0
        in_str = False
        j = i
        while j < n:
            c = array_body[j]
            if in_str:
                if c == "\\":
                    j += 1
                elif c == '"':
                    in_str = False
            elif c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    objs.append(array_body[i:j + 1])
                    break
            j += 1
        i = j + 1
    return objs


def _str_field(obj: str, name: str) -> str:
    m = re.search(r"%s\s*:\s*\"((?:[^\"\\]|\\.)*)\"" % re.escape(name), obj)
    if m is None:
        raise ValueError("row has no %r string field" % name)
    return json.loads('"%s"' % m.group(1))


def _served() -> tuple[set[str], set[str]]:
    """(literal doors, regex stems) from the authored TS table.

    A literal row serves ONLY itself (+query); a regex row serves
    its stem's tails. Same string-aware shape as the
    routes-mirror wall's reader — a hand-edit that breaks the
    rigid row shape fails here LOUDLY (fix = restore the shape,
    never weaken the reader).
    """
    text = ROUTES_TS.read_text(encoding="utf-8")
    anchor = text.index("export const ROUTES")
    body = _strip_comments(text[anchor:])
    lb, rb = body.index("["), body.rindex("]")
    literals, regex_stems = set(), set()
    rows = 0
    for obj in _split_top_objects(body[lb:rb]):
        rows += 1
        path = _str_field(obj, "path")
        if "regex: true" in obj:
            regex_stems.add(path.lstrip("^").split("(")[0].rstrip("/"))
        else:
            literals.add(path.rstrip("/"))
    assert rows == EXPECT_ROWS, \
        "routes.ts holds %d rows, want %d" % (rows, EXPECT_ROWS)
    return literals, regex_stems


def test_ts_served_set_pins_the_queue_doors() -> None:
    """The authored table serves the queue doors the frontend
    fetches (literals) plus the WS stems (regex tails)."""
    literals, stems = _served()
    for door in ("/v1/flows/start", "/v1/flows/validate",
                 "/v1/flows/runs", "/v1/health"):
        assert door in literals, "queue door missing: %s" % door
    assert "/v1/flows/events" in stems, \
        "WS events stem missing: %r" % (stems,)


def test_generated_doors_are_fresh() -> None:
    r = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         str(REPO / "packages" / "web-kit" / "catalog" / "scripts"
             / "gen-gateway-doors.ts"), "--check"],
        capture_output=True, text=True, cwd=str(REPO))
    assert r.returncode == 0, (
        "gatewayDoors.ts is stale vs routes.ts — run "
        "node --experimental-strip-types packages/web-kit/catalog/"
        "scripts/gen-gateway-doors.ts --write\n%s" % r.stdout)


def test_the_frontend_compiles_against_the_door_gate() -> None:
    """tsc IS the gate: every apiFetch/apiJson call site must satisfy
    FetchUrl. Unserved doors compile ONLY through unservedDoor(…)."""
    editor = REPO / "packages" / "web" / "editor"
    tsc = editor / "node_modules" / ".bin" / "tsc"
    if not tsc.exists():
        import pytest
        pytest.skip("editor toolchain not installed")
    r = subprocess.run(
        [str(tsc), "--noEmit", "-p", "tsconfig.app.json"],
        cwd=str(editor), capture_output=True, text=True)
    assert r.returncode == 0, (
        "the editor fails the door gate — a fetch call site names a "
        "door the gateway does not serve (build the door, register the "
        "debt in unservedDoors.ts, or delete the dead call "
        "site):\n%s" % r.stdout[-4000:])
