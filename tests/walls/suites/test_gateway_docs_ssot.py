"""test_gateway_docs_ssot.py — P6 tail: DELETE-runs decision + docs-SSOT wall.

Two contracts, one file:

A. THE DELETE-RUNS DECISION:
   The authored routes.ts table carries exactly ONE DELETE row —
   DELETE /v1/studios/{tenant}/presets/{preset_id}. NO DELETE row
   touches /v1/flows/runs* (the Queue & runs block is POST/GET
   only: start, validate, queue, status, stop, resume, events x2,
   runs list, run detail).
   python/editor_runs.py (a keeper lib, not the oracle) carries NO
   runs_delete/run_delete symbol at all — not even the unwired
   dead-code twin the drafts precedent has (drafts_delete, whose
   docstring says it "answers the unmatched-route shape rather
   than inventing persistence the gateway does not have" — and
   which NO route row references, so DELETE /v1/flows/drafts/:id
   falls to the dispatcher fallthrough, as the drafts parity wall
   pins).
   The runs posture is therefore the fallthrough itself: the TS
   dispatcher (packages/gateway/src/core/context.ts) answers 404
   {"error": "no such route <METHOD> <path>", "code":
   "no_such_route"} (path normalized — trailing slashes stripped
   before the match AND the error text).
   The TS-faithful behavior is NO ARM: dispatchRuns (doors/runs.ts)
   serves only queue/status/runs-list/run-detail/WS-fallback, and
   there is deliberately NO runs_delete twin on either side —
   adding one would invent persistence semantics the gateway does
   not have (the exact thing drafts_delete's docstring refuses to
   do). The legs below pin the fallthrough bytes TS-vs-literal,
   so a future DELETE door (row + arm + regen, all three, same
   stroke) fails LOUD here instead of drifting silent.

B. THE DOCS SSOT (routes.ts as the TS-side authority):
   gen_api_docs --check (endpoints.md + openapi.yaml vs the table)
   and gen_gateway_doors --check (gatewayDoors.ts vs the table) must
   both be clean; the routes.ts-vs-table direction is owned by the
   INVERTED routes-mirror wall (routes.ts AUTHORED SSOT —
   tests/walls/suites/test_routes_mirror.py: row-count +
   retired-generator + authored-marker + tsc + ROUTE_COUNT). The
   regen-noop leg re-runs the surviving generators in write mode
   and proves `git status` is unchanged AND no GatewayDoorUrl
   consumer is modified (ZERO caller edits).

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the py
half of this wall (the oracle ROUTES static legs + the
dual-served py-vs-ts live parity) died with the py serving
oracle. The static legs read the authored TS table now
(string-aware, same rigid-row shape the routes-mirror wall owns);
the live legs boot the TS gateway ALONE (apps/gateway/src/main.ts
via the shared boot_scratch_gateway helper) and assert the
fallthrough bytes TS-vs-literal — the error envelope literal was
already the wall's own expectation, so no golden freeze was
needed (no py-bytes-only legs existed).

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: pytest tests/walls/suites/test_gateway_docs_ssot.py
"""

from __future__ import annotations

import json
import re
import subprocess
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

import editor_runs  # noqa: E402  (keeper lib, not the oracle)

ROUTES_TS = REPO / "packages" / "gateway" / "src" / "routes.ts"
DOORS_TS = REPO / "packages" / "web-kit" / "catalog" / "src" / "generated" / "gatewayDoors.ts"

EXPECT_ROWS = 54


def _routes_text() -> str:
    text = ROUTES_TS.read_text(encoding="utf-8")
    return text[text.index("export const ROUTES"):]


def _delete_rows() -> list[str]:
    """Top-level {...} row spans carrying method: "DELETE"."""
    body = _routes_text()
    lb, rb = body.index("["), body.rindex("]")
    array = body[lb:rb]
    objs: list[str] = []
    i, n = 0, len(array)
    while i < n:
        if array[i] != "{":
            i += 1
            continue
        depth = 0
        in_str = False
        j = i
        while j < n:
            c = array[j]
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
                    objs.append(array[i:j + 1])
                    break
            j += 1
        i = j + 1
    return [o for o in objs if 'method: "DELETE"' in o]


# ── A. the decision, static legs (no boot) ──────────────────────────

def test_no_delete_runs_row_in_table() -> None:
    """No authored row serves DELETE on /v1/flows/runs* — the
    decision's positive half (the runs block is POST/GET only)."""
    hits = [o for o in _delete_rows() if "flows/runs" in o]
    assert not hits, "DELETE runs row exists: %r" % (hits,)


def test_only_delete_row_is_studios_presets() -> None:
    """The decision's complement: the table's SOLE DELETE row is the
    studios preset door."""
    rows = _delete_rows()
    assert len(rows) == 1, "DELETE row count drifted: %d" % len(rows)
    assert "/v1/studios/{tenant}/presets/{preset_id}" in rows[0], rows[0]


def test_no_runs_delete_dead_code() -> None:
    """editor_runs has no runs_delete twin — not even dead code (unlike
    drafts_delete, which exists AND is unwired: no row references
    it)."""
    assert not hasattr(editor_runs, "runs_delete")
    assert not hasattr(editor_runs, "run_delete")
    assert hasattr(editor_runs, "drafts_delete")  # the precedent cites
    text = _routes_text()
    assert "drafts_delete" not in text  # unwired — the 404 precedent
    assert "_h_presets_delete" in text  # the wired DELETE stays wired


def test_routes_mirror_carries_decision() -> None:
    """routes.ts (the TS SSOT) holds exactly one DELETE row and
    it is the studios presets arm — the mirror wall pins the rest of
    the table; this leg pins the decision's visibility on the TS
    side."""
    text = ROUTES_TS.read_text(encoding="utf-8")
    assert text.count('method: "DELETE"') == 1, \
        "routes.ts DELETE row count drifted"
    at = text.find('method: "DELETE"')
    window = text[max(0, at - 600):at + 400]
    assert "/v1/studios/{tenant}/presets/{preset_id}" in window, window[-200:]


def test_doors_carry_no_delete_runs() -> None:
    """gatewayDoors.ts serves the runs GET templates (the fetchable
    URLs); doors are method-agnostic URL types, so a DELETE against
    them is a dispatch-level 404 (pinned live below), never a type."""
    text = DOORS_TS.read_text(encoding="utf-8")
    assert "`/v1/flows/runs${DoorTail}`" in text
    assert "`/v1/flows/runs/${string}${DoorTail}`" in text


# ── A. the decision, live legs (TS-alone, TS-vs-literal) ────────────

def _http(port: int, path: str, method: str) -> tuple[int | None, bytes]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return (r.status, r.read())
    except urllib.error.HTTPError as e:
        return (e.code, e.read())
    except Exception as e:
        return (None, ("TRANSPORT " + str(e)).encode())


def _refusal(port: int, path: str, method: str, norm_path: str) -> bytes:
    """One fallthrough leg: 404 + the exact envelope literal
    (path normalized — the dispatcher strips trailing slashes
    before the match AND the error text)."""
    status, raw = _http(port, path, method)
    assert status == 404, "status %r for %s %s" % (status, method, path)
    want = {"error": "no such route %s %s" % (method, norm_path),
            "code": "no_such_route"}
    assert json.loads(raw) == want, raw[:200]
    return raw


def test_delete_runs_live_ts_only() -> None:
    """The wall legs, TS-vs-literal: DELETE detail (owned + missing
    id), DELETE collection, DELETE trailing-slash (normalization),
    DELETE deep tail, and the GET-only contrast (POST collection
    404s too). Probed live 2026-09-08 — every leg answers the
    fallthrough envelope byte-exact.
    Closes with the refusal-not-mutation pin (GET bytes unchanged:
    the listing stays empty, the missing detail stays unknown)."""
    port, proc = boot_scratch_gateway()
    try:
        before_list = _http(port, "/v1/flows/runs", "GET")
        before_detail = _http(port, "/v1/flows/runs/run-keep1", "GET")

        _refusal(port, "/v1/flows/runs/run-keep1", "DELETE",
                 "/v1/flows/runs/run-keep1")
        _refusal(port, "/v1/flows/runs/run-nope", "DELETE",
                 "/v1/flows/runs/run-nope")
        _refusal(port, "/v1/flows/runs", "DELETE", "/v1/flows/runs")
        _refusal(port, "/v1/flows/runs/run-keep1/", "DELETE",
                 "/v1/flows/runs/run-keep1")
        _refusal(port, "/v1/flows/runs/a/b", "DELETE",
                 "/v1/flows/runs/a/b")
        _refusal(port, "/v1/flows/runs", "POST", "/v1/flows/runs")
        _refusal(port, "/v1/flows/status/run-keep1", "DELETE",
                 "/v1/flows/status/run-keep1")

        after_list = _http(port, "/v1/flows/runs", "GET")
        after_detail = _http(port, "/v1/flows/runs/run-keep1", "GET")
        assert before_list == after_list, "DELETE mutated the listing"
        assert before_detail == after_detail, "DELETE mutated a run"
        assert json.loads(after_list[1]) == {"count": 0, "runs": []}
    finally:
        reap_gateway(proc)


# ── B. docs-check green ─────────────────────────────────────────────

def test_gen_api_docs_check_clean() -> None:
    # RE-POINTED 2026-09-08 (generators STEP 4): the docs generator
    # is TS-native now (reads the authored routes.ts); the wall keeps
    # its leg and swaps only the reader.
    r = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         str(REPO / "packages" / "gateway" / "scripts" / "gen-api-docs.ts"),
         "--check"],
        capture_output=True, text=True, timeout=120, cwd=str(REPO))
    assert r.returncode == 0, \
        "stale generated docs — run the TS generator\n%s" % r.stdout


# tools/gen_routes_mirror.py was DELETED in generators STEP 2 (SSOT
# flip): routes.ts is authored. The mirror direction is pinned by the
# inverted tests/walls/suites/test_routes_mirror.py (row-count +
# retired-generator + authored-marker + tsc + ROUTE_COUNT) — no
# mirror --check remains in this file.


def test_route_count_pin() -> None:
    """54 rows, read from the authored TS table (string-aware, same
    rigid-row shape the routes-mirror wall owns): a silent row
    add/remove breaks the SSOT triad (the api_doc wall owns the
    full surface equality; this is the tripwire here)."""
    assert _routes_text().count("template:") >= EXPECT_ROWS, \
        "routes.ts row shape drifted"
    assert len(re.findall(r"template:\s*\"", _routes_text())) == EXPECT_ROWS


# ── B. regen-zero-caller-edits proof ────────────────────────────────

def test_gen_gateway_doors_check_clean() -> None:
    # RE-POINTED 2026-09-08 (generators STEP 3): the doors generator
    # is TS-native now (reads the authored routes.ts); the wall keeps
    # its leg and swaps only the reader.
    r = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         str(REPO / "packages" / "web-kit" / "catalog" / "scripts"
             / "gen-gateway-doors.ts"), "--check"],
        capture_output=True, text=True, timeout=120, cwd=str(REPO))
    assert r.returncode == 0, \
        "gatewayDoors.ts stale — run the TS generator --write\n%s" % r.stdout


def _git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, text=True,
                       timeout=60, cwd=str(REPO))
    assert r.returncode == 0, "git %r failed: %s" % (args, r.stderr[-500:])
    return r.stdout


def test_regen_noop_no_caller_diff() -> None:
    """Regenerate what's generated, then prove ZERO caller edits: the
    `git status` file set is identical before/after (the regen is a
    byte-noop), and no GatewayDoorUrl consumer outside generated/
    appears in the worktree diff."""
    before = _git("status", "--short")
    for script in ("packages/gateway/scripts/gen-api-docs.ts",
                   "packages/web-kit/catalog/scripts/gen-gateway-doors.ts"):
        cmd = ["node", "--experimental-strip-types", "--no-warnings",
               str(REPO / script)]
        r = subprocess.run(cmd, capture_output=True, text=True,
                           timeout=120, cwd=str(REPO))
        assert r.returncode == 0, "%s failed\n%s" % (script, r.stderr[-1000:])
    assert _git("status", "--short") == before, \
        "regen changed the tree — the check legs above should have caught it"
    consumers = _git("grep", "-l", "GatewayDoorUrl", "--",
                     "packages").split()
    generated = {c for c in consumers if "/generated/" in c}
    assert consumers, "no GatewayDoorUrl consumers found — grep scope rotted"
    assert generated, "generated gatewayDoors.ts not in grep hits"
    dirty = set(_git("diff", "--name-only").split())
    callers = [c for c in consumers if c not in generated]
    touched = [c for c in callers if c in dirty]
    assert not touched, "regen touched callers: %r" % touched
