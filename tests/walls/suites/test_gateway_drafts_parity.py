#!/usr/bin/env python3
"""test_gateway_drafts_parity.py — P4 draft CRUD doors TS-ONLY wall.

Pins the TypeScript port (packages/gateway-doors/src/doors/drafts.ts via
ctx.ts dispatch):

  full create/get/patch/result/list lifecycle, patch-merge semantics
  (shallow params merge, replace-the-rest, atomic tmp+rename), the
  composer-drift 500s (pydantic-exact refusal TEXT — the money pins),
  empty-body/non-dict/bad-JSON refusals, traversal + hostile-name
  handling, DELETE-is-404 (drafts_delete is unwired dead code —
  python/editor_runs.py 1065-1071 — so DELETE falls to no-such-route),
  method mismatches, the auth gate, and N-parallel creates.

Single TS boot on ONE fixture root (built, then served directly —
never copied for a twin; minted ids differ per boot by construction,
so create pins compare shape + field-equality while every stable
pin is bytes against the frozen goldens in
golden_ts/test_gateway_drafts_parity/, causes.md there).

TS cites: packages/gateway-doors/src/doors/drafts.ts (the door),
python/editor_runs.py 818-1204 (file semantics),
python/run_wire.py 151-170 (birth gate).

ORACLE DEATH 2026-09-08: re-derived TS-ONLY from the dual-serve
py-vs-TS parity wall per the operator order "we do not need parity,
we need to migrate, not keep the old machinery". The retired py
serving oracle is deleted, so every py leg is REMOVED (never
weakened): dual()/dual_shape() died with it; TS-vs-literal legs
stand alone; py-bytes-vs-ts-bytes legs without literals freeze the
TS current bytes as goldens (stability: captured twice from fresh
boots, byte-identical — see causes.md). No leg compares TS against
TS (tautological) or against the deleted oracle.

KNOWN shape-only pins (asserted as status+code+prefix, never bytes):
  - bad-JSON error TEXT embeds the host JSON parser's message
    (V8 SyntaxError) — status 400 + code bad_json + "bad JSON: "
    prefix must hold.
  - corrupt-on-disk GET text embeds the host parser's message —
    status 500 + "draft corrupt on disk: " prefix must hold (the
    FIXED "not an object" variant IS byte-pinned via golden).
  - minted draft_ids / createdAt differ per boot by construction —
    shape (regex, int, %1000, recency) + field-equality pins.
  - DELETE / method-mismatch 404 envelopes echo the request path —
    status + code no_such_route + "no such route" prefix pins.
  - invalid-UTF-8 bodies: TS decodes lossy. Untested — nobody sends
    invalid UTF-8.
  - a directory named <id>.json: TS rethrows into the server 500
    catch. Untested.
  - lone-surrogate strings persist lossy on TS (replacement char).
    Untested.
  - integer-like object keys ascend numerically on JS. Untested
    (fixtures use string keys).

Run: python3 tests/walls/suites/test_gateway_drafts_parity.py

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
"""

import json
import os
import re
import shutil
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TOKEN = "drafts-parity-token-%d" % os.getpid()

GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_drafts_parity")

DRAFT_ID_RE = re.compile(r"^draft-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$")


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


def http(port: int, path: str, method: str = "GET",
         body: bytes = b"", headers: dict | None = None,
         ctype: str = "application/json") -> tuple[int | None, bytes, dict]:
    hdrs = {"Content-Type": ctype}
    hdrs.update(headers or {})
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=body if method in ("POST", "PUT", "PATCH", "DELETE") else None,
        headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return (r.status, r.read(),
                    {k.lower(): v for k, v in r.headers.items()})
    except urllib.error.HTTPError as e:
        return (e.code, e.read(),
                {k.lower(): v for k, v in e.headers.items()})
    except Exception as e:
        return (None, b"", {"transport": str(e)})


def get(port: int, path: str, name: str,
        method: str = "GET", body: bytes = b"",
        ctype: str = "application/json") -> tuple[int | None, bytes]:
    """One TS-served shape: transport-checked (status, body bytes)."""
    st, bd, _ = http(port, path, method, body, None, ctype)
    if st is None:
        check(name, False, "transport %r" % (bd[:80],))
    return st, bd


def check_golden(name: str, actual: bytes, golden_name: str) -> None:
    """Bytes must equal the frozen TS golden (see causes.md)."""
    try:
        want = golden(golden_name)
    except OSError as e:
        check(name, False, "golden unreadable: %s" % e)
        return
    ok = actual == want
    note = ""
    if not ok:
        note = "got %dB want %dB" % (len(actual), len(want))
        for i, (a, b) in enumerate(zip(actual, want)):
            if a != b:
                note += " first-div @%d got=%r want=%r" % (
                    i, actual[i - 20:i + 40], want[i - 20:i + 40])
                break
        else:
            if len(actual) != len(want):
                note += " len-div"
    check(name, ok, note)


def check_shape(name: str, body: bytes, want_status: int,
                err_prefix: str, want_code: str | None,
                status: int | None) -> None:
    """Shape pin for host-parser-text bodies (bad JSON, corrupt disk):
    status + code + error prefix. Pass want_code=None when the
    envelope must carry NO code (500s — normalize4xx is 4xx-only)."""
    try:
        doc = json.loads(body)
    except ValueError:
        doc = None
    ok = (status == want_status
          and isinstance(doc, dict)
          and str(doc.get("error", "")).startswith(err_prefix)
          and doc.get("code") == want_code)
    check(name, ok, "st %r body=%r" % (status, body[:90]))


def sync_mtimes(drafts: Path, base: int = 1700000000) -> None:
    """Deterministic mtimes on a drafts dir (sorted-name order) so
    list ORDER pins never flake on same-second ties."""
    for i, name in enumerate(sorted(os.listdir(drafts))):
        try:
            os.utime(drafts / name, (base + i, base + i))
        except OSError:
            pass


def build_fixture(drafts: Path) -> None:
    drafts.mkdir(parents=True, exist_ok=True)
    docs = {
        # unicode name + float extra + bigint extra + result row.
        "seed-alpha": {"draft_id": "seed-alpha", "model": "anny",
                       "name": "caf\u00e9 \u2713",
                       "score": 1.0, "big": 9007199254740993,
                       "stages": [{"id": "s_0", "inputs": [""],
                                    "provenance": "agent",
                                    "params": {"a": 1},
                                    "result": {"shot": "p0.png"},
                                    "runStatus": "done"},
                                   {"id": "s_1", "inputs": [""],
                                    "provenance": "agent"}]},
        # intent fallback for the list name, service for the model.
        "seed-beta": {"draft_id": "seed-beta", "intent": "WantX",
                      "service": "svc9", "stages": []},
        # title fallback for the list name.
        "seed-gamma": {"draft_id": "seed-gamma", "title": "T1",
                       "stages": [{"id": "s_0", "inputs": [""],
                                   "provenance": "agent"}]},
        # non-string index fields read "" (sidecar_str parity).
        "seed-num": {"draft_id": "seed-num", "model": 5, "name": ["x"],
                     "stages": []},
        "seed-empty": {"draft_id": "seed-empty", "model": "m",
                       "name": "E", "stages": []},
        "x": {"draft_id": "x", "model": "m", "name": "", "stages": []},
    }
    for did, doc in docs.items():
        (drafts / (did + ".json")).write_text(
            json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    # Non-canonical number literals (the door normalizes load->dump:
    # 1.00 wires as "1.0", 1e2 as "100.0" — the float-fidelity pins).
    (drafts / "seed-float.json").write_text(
        '{"draft_id":"seed-float","model":"m","name":"F",'
        '"n":1.00,"e":1e2,"deep":{"x":[2.50,-0.0]},'
        '"stages":[]}', encoding="utf-8")
    (drafts / "corrupt.json").write_text("{nope", encoding="utf-8")
    (drafts / "arr.json").write_text("[1,2]", encoding="utf-8")
    (drafts / "num.json").write_text("5", encoding="utf-8")
    (drafts / "str.json").write_text('"hi"', encoding="utf-8")
    # Excluded from the list (bad id / wrong suffix / too short).
    (drafts / "bad!id.json").write_text('{"draft_id":"bad!id"}',
                                        encoding="utf-8")
    (drafts / "noj.json.txt").write_text("zzz", encoding="utf-8")
    (drafts / ".json").write_text("{}", encoding="utf-8")
    sync_mtimes(drafts)


def doc_bytes(doc: object) -> bytes:
    return json.dumps(doc).encode()


def ts_create(port: int, doc: object,
              ctype: str = "application/json") -> tuple[int | None, dict]:
    st, body, _ = http(port, "/v1/flows/drafts", "POST", doc_bytes(doc),
                       None, ctype)
    try:
        parsed = json.loads(body)
        return st, parsed if isinstance(parsed, dict) else {}
    except ValueError:
        return st, {}


def main() -> int:
    base = None
    ts_proc = None
    try:
        base = Path(tempfile.mkdtemp(prefix="wall-drafts-"))
        build_fixture(base / "drafts")
        ts_root = base / "ts-root"
        shutil.copytree(str(base / "drafts"), str(ts_root / "drafts"))

        ts_env = dict(os.environ)
        ts_env["MELITE_STATE_ROOT"] = str(ts_root)
        ts_env.pop("DSH_GATEWAY_TOKEN", None)
        try:
            ts_port, ts_proc = boot_scratch_gateway(env=ts_env)
        except RuntimeError as e:
            print("FATAL: %s" % e)
            return 1
        print("ts :%d (root %s)" % (ts_port, base))

        # ── 1. GET one: goldens incl. unicode + float pins ──
        st, bd = get(ts_port, "/v1/flows/drafts/seed-alpha",
                     "GET seed-alpha transport")
        if st is not None:
            check("GET seed-alpha 200", st == 200, "st=%r" % st)
            check_golden("GET seed-alpha bytes (unicode/float/bigint)",
                         bd, "get-seed-alpha.json")
            check("wire ensure_ascii escapes",
                  b"caf\\u00e9 \\u2713" in bd
                  and "café".encode() not in bd)
            check("wire float 1.0 verbatim + bigint exact",
                  b'"score": 1.0' in bd
                  and b'"big": 9007199254740993' in bd)
        st, bd = get(ts_port, "/v1/flows/drafts/seed-alpha/",
                     "GET trailing slash transport")
        if st is not None:
            check("GET trailing slash normalizes (200 + same bytes)",
                  st == 200 and bd == golden("get-seed-alpha.json"),
                  "st=%r %dB" % (st, len(bd)))
        st, bd = get(ts_port, "/v1/flows/drafts/seed-alpha?x=1&y=2",
                     "GET query transport")
        if st is not None:
            check("GET query string ignored (200 + same bytes)",
                  st == 200 and bd == golden("get-seed-alpha.json"),
                  "st=%r %dB" % (st, len(bd)))
        st, bd = get(ts_port, "/v1/flows/drafts/seed-float",
                     "GET seed-float transport")
        if st is not None:
            check("GET seed-float 200", st == 200, "st=%r" % st)
            check_golden("GET non-canonical literals normalize "
                         "(1.00/1e2/2.50/-0.0)", bd, "get-seed-float.json")
            check("float normalization content",
                  b'"n": 1.0' in bd and b'"e": 100.0' in bd
                  and b'"x": [\n      2.5,\n      -0.0' in bd)
        st, bd = get(ts_port, "/v1/flows/drafts/seed-beta",
                     "GET seed-beta transport")
        if st is not None:
            check("GET seed-beta 200", st == 200, "st=%r" % st)
            check_golden("GET seed-beta bytes", bd, "get-seed-beta.json")
        st, bd = get(ts_port, "/v1/flows/drafts/nope",
                     "GET missing transport")
        if st is not None:
            try:
                doc = json.loads(bd)
            except ValueError:
                doc = None
            check("GET missing 404 shape",
                  st == 404
                  and doc == {"error": "draft not found",
                              "code": "invalid_request"},
                  "st=%r body=%r" % (st, bd[:90]))

        # ── 2. hostile ids: traversal + malformed → 400 ──
        for bad in ("../x", "a/b", "..%2f..%2fx", "%2e%2e/x", "a%2Fb",
                    "x" * 97, "a%20b", "caf%C3%A9", "a+b"):
            st, bd = get(ts_port, "/v1/flows/drafts/%s" % bad,
                         "GET hostile %r transport" % bad)
            if st is not None:
                try:
                    doc = json.loads(bd)
                except ValueError:
                    doc = None
                check("GET hostile %r 400" % bad,
                      st == 400
                      and doc == {"error": "bad id",
                                  "code": "invalid_request"},
                      "st=%r body=%r" % (st, bd[:90]))
        st, bd = get(ts_port, "/v1/flows/drafts/%2e%2e%2fseed-alpha",
                     "GET encoded traversal transport")
        if st is not None:
            try:
                doc = json.loads(bd)
            except ValueError:
                doc = None
            check("GET encoded traversal 400",
                  st == 400
                  and doc == {"error": "bad id",
                              "code": "invalid_request"},
                  "st=%r body=%r" % (st, bd[:90]))

        # ── 3. corrupt / non-object files ──
        st, bd = get(ts_port, "/v1/flows/drafts/corrupt",
                     "GET corrupt transport")
        if st is not None:
            check_shape("GET corrupt 500 (parser text differs — "
                        "prefix only)", bd, 500,
                        "draft corrupt on disk: ", None, st)
            # (500s carry no code — normalize4xx is 4xx-only.)
        for did in ("arr", "num", "str"):
            st, bd = get(ts_port, "/v1/flows/drafts/%s" % did,
                         "GET %s transport" % did)
            if st is not None:
                check("GET %s doc 500" % did, st == 500, "st=%r" % st)
                check_golden("GET %s doc 500 not-an-object" % did, bd,
                             "get-nonobject.json")

        # ── 4. LIST: golden bytes + envelope semantics ──
        st, bd = get(ts_port, "/v1/flows/drafts", "GET list transport")
        if st is not None:
            check("GET list 200", st == 200, "st=%r" % st)
            check_golden("GET list bytes", bd, "list.json")
        st2, bd2 = get(ts_port, "/v1/flows/drafts/",
                       "GET list trailing slash transport")
        if st2 is not None:
            check("GET list trailing slash (200 + same bytes)",
                  st2 == 200 and bd2 == golden("list.json"),
                  "st=%r %dB" % (st2, len(bd2)))
        st3, bd3 = get(ts_port, "/v1/flows/drafts?x=1",
                       "GET list query transport")
        if st3 is not None:
            check("GET list query ignored (200 + same bytes)",
                  st3 == 200 and bd3 == golden("list.json"),
                  "st=%r %dB" % (st3, len(bd3)))
        env = json.loads(bd)
        # sync_mtimes stamps sorted-name order, so newest-first is the
        # reverse: x, str, seed-num, seed-gamma, seed-float,
        # seed-empty, seed-beta, seed-alpha, num, corrupt, arr
        # (bad!id filtered by draft_id_ok; .json/noj.json.txt by name).
        want_rows = [
            {"draft_id": "x", "model": "m", "name": ""},
            {"draft_id": "str", "model": "", "name": ""},
            {"draft_id": "seed-num", "model": "", "name": ""},
            {"draft_id": "seed-gamma", "model": "", "name": "T1"},
            {"draft_id": "seed-float", "model": "m", "name": "F"},
            {"draft_id": "seed-empty", "model": "m", "name": "E"},
            {"draft_id": "seed-beta", "model": "svc9", "name": "WantX"},
            {"draft_id": "seed-alpha", "model": "anny",
             "name": "caf\u00e9 \u2713"},
            {"draft_id": "num", "model": "", "name": ""},
            {"draft_id": "corrupt", "model": "", "name": ""},
            {"draft_id": "arr", "model": "", "name": ""},
        ]
        check("list count is TOTAL matches (bad!id excluded, corrupt kept)",
              env.get("count") == 11
              and env.get("drafts") == want_rows,
              "count=%r rows=%r" % (env.get("count"), env.get("drafts")))

        # ── 5. CREATE lifecycle (minted id/createdAt shape) ──
        created_ids: list[str] = []
        body = {"intent": "hello w\u00f6rld \u2713",
                "stages": [{"card": "c", "params": {"temp": 1.5}}],
                "extra": {"n": [1, "x", 2.0]},
                "status": "HACK", "draft_id": "HACK", "createdAt": 1,
                "completedAt": 2}
        tst, tj = ts_create(ts_port, body)
        id_ok = (tst == 200
                 and bool(DRAFT_ID_RE.match(tj.get("draftId", ""))))
        stages_ok = tj.get("stages") == [
            {"id": "s_0", "card": "c", "params": {"temp": 1.5},
             "inputs": [""], "provenance": "agent"}]
        now_ms = int(time.time() * 1000)
        check("POST create 200 + minted-id shape + stages echo",
              id_ok and stages_ok, "ts=%r" % (tj,)[:200])
        # createdAt lives on disk (the response carries no createdAt).
        ts_doc = json.loads((ts_root / "drafts"
                             / (tj["draftId"] + ".json")).read_bytes())
        disk_ok = (
            ts_doc.get("draft_id") == tj["draftId"]
            and list(ts_doc)
            == ["draft_id", "intent", "stages", "status",
                "createdAt", "completedAt", "extra"]
            and ts_doc["status"] == "ready"
            and ts_doc["completedAt"] is None
            and isinstance(ts_doc["createdAt"], int)
            and ts_doc["createdAt"] % 1000 == 0
            and abs(now_ms - ts_doc["createdAt"]) < 120000
            and ts_doc["intent"] == "hello w\u00f6rld \u2713"
            and ts_doc["stages"] == [
                {"id": "s_0", "card": "c", "params": {"temp": 1.5},
                 "inputs": [""], "provenance": "agent"}]
            and ts_doc["extra"] == {"n": [1, "x", 2.0]})
        check("staged file pins order + composer-owned fields "
              "(status ready, completedAt null, createdAt shape, "
              "HACK fields refused)", disk_ok)
        raw_ts = (ts_root / "drafts" / (tj["draftId"] + ".json")).read_bytes()
        check("staged bytes compact + raw UTF-8 (ensure_ascii=False)",
              raw_ts.startswith(b'{"draft_id":"')
              and "w\u00f6rld \u2713".encode() in raw_ts
              and b"\n" not in raw_ts
              and b", " not in raw_ts)
        created_ids.append(tj["draftId"])
        # GET-back pins the served doc field-by-field.
        st, bd, _ = http(ts_port, "/v1/flows/drafts/" + tj["draftId"])
        try:
            back = json.loads(bd)
        except ValueError:
            back = None
        check("GET-back serves the staged doc",
              st == 200 and isinstance(back, dict)
              and back.get("draft_id") == tj["draftId"]
              and back.get("intent") == "hello w\u00f6rld \u2713"
              and back.get("stages") == ts_doc["stages"]
              and back.get("createdAt") == ts_doc["createdAt"],
              "st=%r" % (st,))
        sync_mtimes(ts_root / "drafts")

        # calls-unwrap pins (response stages pinned as literals).
        unwrap_cases = [
            ("calls string unwraps", [{"calls": "[1,2]", "id": "k"}],
             [{"calls": [1, 2], "id": "k",
               "inputs": [""], "provenance": "agent"}]),
            ("bad calls string kept", [{"calls": "nope"}],
             [{"id": "s_0", "calls": "nope",
               "inputs": [""], "provenance": "agent"}]),
            ("nested calls unwraps", [{"sub": {"calls": "[3]"}}],
             [{"id": "s_0", "sub": {"calls": [3]},
               "inputs": [""], "provenance": "agent"}]),
            ("calls inside a list untouched",
             [{"items": [{"calls": "[3]"}]}],
             [{"id": "s_0", "items": [{"calls": "[3]"}],
               "inputs": [""], "provenance": "agent"}]),
            ("non-dict stages become birth rows", [None, 5, "x"],
             [{"id": "s_0", "inputs": [""],
               "provenance": "agent"},
              {"id": "s_1", "inputs": [""],
               "provenance": "agent"},
              {"id": "s_2", "inputs": [""],
               "provenance": "agent"}]),
        ]
        for nm, stages, want_stages in unwrap_cases:
            cst, cj = ts_create(ts_port, {"stages": stages})
            check(nm, cst == 200 and cj.get("stages") == want_stages,
                  "st %r stages=%r" % (cst, cj.get("stages")))
        cst, cj = ts_create(ts_port, {"stages": [{"id": "",
                                                 "inputs": [],
                                                 "provenance": "p"}]})
        cst_body = json.dumps(cj).encode()
        check("present-but-empty id kept → 500 drift",
              cst == 500
              and "draft composer drift" in json.dumps(cj)
              and "https://errors.pydantic.dev/2.13/" in json.dumps(cj),
              "st %r" % (cst,))
        sync_mtimes(ts_root / "drafts")

        # ── 6. empty / non-dict / bad-JSON create refusals ──
        # (the truthiness gate: falsy bodies 400 with the empty-body
        # literal, every truthy body — even non-dict scalars/lists —
        # composes and 200s with empty stages.)
        empty_body = {"error": "empty body", "code": "invalid_request"}
        for doc, wst in (({}, 400), ([1, 2], 200), (5, 200), (0, 400),
                         ("0", 400), ("hi", 400), ("false", 400),
                         ("null", 400)):
            raw = doc_bytes(doc)
            st, bd, _ = http(ts_port, "/v1/flows/drafts", "POST", raw)
            ok = st == wst
            if ok and wst == 200:
                try:
                    ok = json.loads(bd).get("stages") == []
                except ValueError:
                    ok = False
            elif ok:
                try:
                    ok = json.loads(bd) == empty_body
                except ValueError:
                    ok = False
            check("POST %r status %d + body pin" % (doc, wst),
                  ok, "st=%r body=%r" % (st, bd[:80]))
        st, bd, _ = http(ts_port, "/v1/flows/drafts", "POST", b"")
        try:
            doc = json.loads(bd)
        except ValueError:
            doc = None
        check("POST empty body 400", st == 400 and doc == empty_body,
              "st=%r body=%r" % (st, bd[:80]))
        st, bd = get(ts_port, "/v1/flows/drafts", "POST bad JSON shape",
                     "POST", b"{nope")
        if st is not None:
            check_shape("POST bad JSON shape (code, not parser text)",
                        bd, 400, "bad JSON: ", "bad_json", st)
        # content-type is never consulted (ignored, not refused).
        cst, cj = ts_create(ts_port, {"intent": "ct"}, "text/plain")
        check("wrong content-type still 200 (ignored, not refused)",
              cst == 200 and cj.get("stages") == [],
              "st %r" % (cst,))
        sync_mtimes(ts_root / "drafts")

        # ── 7. composer-drift 500s: pydantic-EXACT goldens ──
        # (only PRESENT-but-invalid stage values reach the gate —
        # the composer HEALS absent keys/non-dict rows/non-list
        # stages with birth defaults first, so those 200; the
        # healed pins compare parsed stages, the drift pins are
        # byte-goldens down to the pydantic text.)
        healed = [
            ("empty stage triple heals",
             {"stages": [{}]},
             [{"id": "s_0", "inputs": [""],
               "provenance": "agent"}]),
            ("missing provenance heals",
             {"stages": [{"id": "ok", "inputs": ["a"]}]},
             [{"id": "ok", "inputs": ["a"],
               "provenance": "agent"}]),
            ("stages string composes empty",
             {"stages": "x"}, []),
            ("null stage heals",
             {"stages": [None]},
             [{"id": "s_0", "inputs": [""],
               "provenance": "agent"}]),
        ]
        for nm, doc, want_stages in healed:
            cst, cj = ts_create(ts_port, doc)
            check("POST healed: %s" % nm,
                  cst == 200 and cj.get("stages") == want_stages,
                  "st %r" % (cst,))
        drift_docs = [
            ("empty id", "drift-empty-id",
             {"stages": [{"id": ""}]}),
            ("null id", "drift-null-id",
             {"stages": [{"id": None}]}),
            ("int id", "drift-int-id",
             {"stages": [{"id": 5}]}),
            ("empty provenance", "drift-empty-provenance",
             {"stages": [{"id": "s_0", "inputs": [""],
                          "provenance": ""}]}),
            ("null provenance", "drift-null-provenance",
             {"stages": [{"id": "s_0", "inputs": [""],
                          "provenance": None}]}),
            ("inputs string", "drift-inputs-string",
             {"stages": [{"id": "s_0", "inputs": "x",
                          "provenance": "agent"}]}),
            ("inputs null", "drift-inputs-null",
             {"stages": [{"id": "s_0", "inputs": None,
                          "provenance": "agent"}]}),
            ("quoted input_value repr", "drift-quoted-input-value",
             {"stages": [{"id": "s_0", "inputs": "x'y",
                          "provenance": "agent"}]}),
            ("multi item errors", "drift-multi-item-errors",
             {"stages": [{"id": "s_0", "inputs": [1, 2],
                          "provenance": "agent"}]}),
            ("null item", "drift-null-item",
             {"stages": [{"id": "s_0", "inputs": [None],
                          "provenance": "agent"}]}),
            ("nested dict item", "drift-nested-dict-item",
             {"stages": [{"id": "s_0", "inputs": [{"a": 1}],
                          "provenance": "agent"}]}),
            ("triple failure incl bool/float", "drift-triple-failure",
             {"stages": [{"id": ["x"], "inputs": {"a": 1},
                          "provenance": 3}]}),
            ("first failing stage reports",
             "drift-first-failing-stage",
             {"stages": [{"id": "fine", "inputs": ["a"],
                          "provenance": "p"},
                         {"id": 1}]}),
        ]
        for nm, gold, doc in drift_docs:
            st, bd, _ = http(ts_port, "/v1/flows/drafts", "POST",
                             doc_bytes(doc))
            check("POST drift: %s 500" % nm, st == 500, "st=%r" % st)
            check_golden("POST drift: %s pydantic-exact bytes" % nm,
                         bd, gold + ".json")
            check("POST drift %s pins pydantic 2.13 URL" % nm,
                  b"https://errors.pydantic.dev/2.13/" in bd)
            try:
                derr = json.loads(bd)
            except ValueError:
                derr = None
            check("POST drift %s refuses without a code" % nm,
                  isinstance(derr, dict) and "code" not in derr,
                  "body=%r" % (bd[:80],))

        # ── 8. PATCH lifecycle on the seeded alpha ──
        patch = {"result": {"y": 2}, "runStatus": "done",
                 "params": {"b": 3}, "inputs": ["i"],
                 "inputOutputs": [["o"]]}
        st, bd, _ = http(ts_port,
                         "/v1/flows/drafts/seed-alpha/stages/s_0",
                         "PATCH", doc_bytes(patch))
        check("PATCH full merge 200", st == 200, "st=%r" % st)
        check_golden("PATCH full merge bytes", bd, "patch-full.json")
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("patch delivered:true + sorted patched keys",
              isinstance(pdoc, dict)
              and pdoc.get("patched")
              == ["inputOutputs", "inputs", "params", "result", "runStatus"])
        ts_f = (ts_root / "drafts" / "seed-alpha.json").read_bytes()
        check_golden("patched FILE bytes (merge + atomic rewrite)",
                     ts_f, "patched-seed-alpha.json")
        check("params merged shallow, result replaced",
              b'"params":{"a":1,"b":3}' in ts_f
              and b'"result":{"y":2}' in ts_f
              and b'"runStatus":"done"' in ts_f)
        # GET-result round-trip.
        st, bd = get(ts_port,
                     "/v1/flows/drafts/seed-alpha/stages/s_0/result",
                     "GET result transport")
        if st is not None:
            check("GET result found:true 200", st == 200, "st=%r" % st)
            check_golden("GET result found:true bytes", bd,
                         "result-found.json")
        # Params-only merge on s_1 (no prior params → fresh object).
        st, bd, _ = http(ts_port,
                         "/v1/flows/drafts/seed-alpha/stages/s_1",
                         "PATCH", doc_bytes({"params": {"fresh": True}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH params-only 200 + delivered",
              st == 200 and isinstance(pdoc, dict)
              and pdoc.get("delivered") is True
              and pdoc.get("patched") == ["params"],
              "st=%r body=%r" % (st, bd[:120]))
        ts_f = (ts_root / "drafts" / "seed-alpha.json").read_bytes()
        check("params-only merge lands (key appended)",
              b'"provenance":"agent","params":{"fresh":true}' in ts_f)
        # Empty patch: delivered with patched [].
        st, bd, _ = http(ts_port,
                         "/v1/flows/drafts/seed-alpha/stages/s_1",
                         "PATCH", b"{}")
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH empty object delivers with patched []",
              st == 200 and isinstance(pdoc, dict)
              and pdoc == {"draftId": "seed-alpha", "stageId": "s_1",
                           "delivered": True, "patched": []},
              "st=%r body=%r" % (st, bd[:120]))
        # result:null refuses (None is not a dict).
        st, bd, _ = http(ts_port,
                         "/v1/flows/drafts/seed-alpha/stages/s_1",
                         "PATCH", doc_bytes({"result": None}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH result null 400",
              st == 400
              and pdoc == {"error": "stage patch 'result' must be dict",
                           "code": "invalid_request"},
              "st=%r body=%r" % (st, bd[:120]))
        sync_mtimes(ts_root / "drafts")

        # ── 9. PATCH refusals ──
        refusal_cases = [
            ("unknown keys sorted in text",
             {"zzz": 1, "aaa": 2},
             {"error": "unknown stage patch key(s): aaa, zzz "
                       "(want result, runStatus, params, inputs, "
                       "inputOutputs)",
              "code": "invalid_request"}),
            ("result must be dict", {"result": [1]},
             {"error": "stage patch 'result' must be dict",
              "code": "invalid_request"}),
            ("runStatus must be str", {"runStatus": 5},
             {"error": "stage patch 'runStatus' must be str",
              "code": "invalid_request"}),
            ("params must be dict", {"params": [1]},
             {"error": "stage patch 'params' must be dict",
              "code": "invalid_request"}),
            ("inputs must be list", {"inputs": {}},
             {"error": "stage patch 'inputs' must be list",
              "code": "invalid_request"}),
            ("inputOutputs must be list", {"inputOutputs": "s"},
             {"error": "stage patch 'inputOutputs' must be list",
              "code": "invalid_request"}),
            ("non-object body (list)", [1],
             {"error": "patch body must be an object",
              "code": "invalid_request"}),
            ("non-object body (string)", "x",
             {"error": "patch body must be an object",
              "code": "invalid_request"}),
            ("non-object body (scalar)", 5,
             {"error": "patch body must be an object",
              "code": "invalid_request"}),
            ("non-object body (null)", None,
             {"error": "patch body must be an object",
              "code": "invalid_request"}),
        ]
        for nm, body, want in refusal_cases:
            st, bd, _ = http(ts_port,
                             "/v1/flows/drafts/seed-alpha/stages/s_0",
                             "PATCH", doc_bytes(body))
            try:
                pdoc = json.loads(bd)
            except ValueError:
                pdoc = None
            check("PATCH %s" % nm, st == 400 and pdoc == want,
                  "st=%r body=%r" % (st, bd[:120]))
        st, bd = get(ts_port, "/v1/flows/drafts/seed-alpha/stages/s_0",
                     "PATCH bad JSON shape", "PATCH", b"{nope")
        if st is not None:
            check_shape("PATCH bad JSON shape", bd, 400, "bad JSON: ",
                        "bad_json", st)
        st, bd, _ = http(ts_port, "/v1/flows/drafts/bad%20id/stages/s_0",
                         "PATCH", doc_bytes({"result": {}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH bad draft id 400",
              st == 400
              and pdoc == {"error": "bad id", "code": "invalid_request"},
              "st=%r body=%r" % (st, bd[:90]))
        st, bd, _ = http(ts_port, "/v1/flows/drafts/nope/stages/s_0",
                         "PATCH", doc_bytes({"result": {}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH missing draft reconciles 200",
              st == 200
              and pdoc == {"draftId": "nope", "stageId": "s_0",
                           "delivered": False,
                           "reason": "draft not found"},
              "st=%r body=%r" % (st, bd[:120]))
        st, bd, _ = http(ts_port,
                         "/v1/flows/drafts/seed-alpha/stages/nosuch",
                         "PATCH", doc_bytes({"result": {}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH missing stage reconciles 200",
              st == 200
              and pdoc == {"draftId": "seed-alpha", "stageId": "nosuch",
                           "delivered": False,
                           "reason": "stage not found"},
              "st=%r body=%r" % (st, bd[:120]))
        over = "a" * 129
        st, bd, _ = http(ts_port,
                         "/v1/flows/drafts/seed-alpha/stages/%s" % over,
                         "PATCH", doc_bytes({"result": {}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH overlong stage reconciles 200",
              st == 200
              and pdoc == {"draftId": "seed-alpha", "stageId": over,
                           "delivered": False,
                           "reason": "stage not found"},
              "st=%r" % (st,))
        st, bd, _ = http(ts_port,
                         "/v1/flows/drafts/seed-alpha/stages/..",
                         "PATCH", doc_bytes({"result": {}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH dotdot stage reconciles 200",
              st == 200
              and pdoc == {"draftId": "seed-alpha", "stageId": "..",
                           "delivered": False,
                           "reason": "stage not found"},
              "st=%r body=%r" % (st, bd[:120]))
        st, bd, _ = http(ts_port, "/v1/flows/drafts/corrupt/stages/s_0",
                         "PATCH", doc_bytes({"result": {}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH corrupt disk 500",
              st == 500 and pdoc == {"error": "draft corrupt on disk"},
              "st=%r body=%r" % (st, bd[:90]))
        st, bd, _ = http(ts_port,
                         "/v1/flows/drafts/seed-alpha/stages/a/b",
                         "PATCH", doc_bytes({"result": {}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH slashed stage falls to 404",
              st == 404
              and isinstance(pdoc, dict)
              and pdoc.get("code") == "no_such_route"
              and str(pdoc.get("error", "")).startswith("no such route"),
              "st=%r body=%r" % (st, bd[:120]))
        st, bd, _ = http(ts_port, "/v1/flows/drafts/../x/stages/s_0",
                         "PATCH", doc_bytes({"result": {}}))
        try:
            pdoc = json.loads(bd)
        except ValueError:
            pdoc = None
        check("PATCH traversal draft id 404",
              st == 404
              and isinstance(pdoc, dict)
              and pdoc.get("code") == "no_such_route"
              and str(pdoc.get("error", "")).startswith("no such route"),
              "st=%r body=%r" % (st, bd[:120]))
        check("no .tmp survivors after patches",
              not [f for f in os.listdir(ts_root / "drafts")
                   if f.endswith(".tmp")])

        # ── 10. RESULT reads ──
        st, bd = get(ts_port,
                     "/v1/flows/drafts/seed-alpha/stages/s_1/result",
                     "GET result missing transport")
        if st is not None:
            check("GET result missing-result 200", st == 200, "st=%r" % st)
            check_golden("GET result missing-result found:false", bd,
                         "result-missing.json")
        for path, nm in (
                ("/v1/flows/drafts/nope/stages/s_0/result",
                 "missing draft"),
                ("/v1/flows/drafts/seed-alpha/stages/nosuch/result",
                 "missing stage"),
                ("/v1/flows/drafts/corrupt/stages/s_0/result",
                 "corrupt (NOT the get 500)"),
                ("/v1/flows/drafts/arr/stages/s_0/result",
                 "array-doc")):
            st, bd = get(ts_port, path, "GET result %s transport" % nm)
            if st is not None:
                check("GET result %s found:false" % nm, st == 200,
                      "st=%r" % st)
                check_golden("GET result %s bytes" % nm, bd,
                             "result-missing.json")
        st, bd = get(ts_port, "/v1/flows/drafts/bad%20id/stages/s_0/result",
                     "GET result bad id transport")
        if st is not None:
            try:
                doc = json.loads(bd)
            except ValueError:
                doc = None
            check("GET result bad id 400",
                  st == 400
                  and doc == {"error": "bad id",
                              "code": "invalid_request"},
                  "st=%r body=%r" % (st, bd[:90]))
        # Non-dict persisted result reads found:false.
        (ts_root / "drafts" / "nd.json").write_text(
            json.dumps({"draft_id": "nd",
                        "stages": [{"id": "s_0", "result": [1]}]}))
        sync_mtimes(ts_root / "drafts")
        st, bd = get(ts_port, "/v1/flows/drafts/nd/stages/s_0/result",
                     "GET result non-dict transport")
        if st is not None:
            check("GET result non-dict 200", st == 200, "st=%r" % st)
            check_golden("GET result non-dict found:false", bd,
                         "result-missing.json")

        # ── 11. DELETE + method mismatches (404s) ──
        tid = created_ids[0]
        st, bd, _ = http(ts_port, "/v1/flows/drafts/%s" % tid, "DELETE")
        try:
            ddoc = json.loads(bd)
        except ValueError:
            ddoc = None
        check("DELETE unwired 404",
              st == 404
              and ddoc == {"error": "no such route DELETE "
                                    "/v1/flows/drafts/%s" % tid,
                           "code": "no_such_route"},
              "st=%r body=%r" % (st, bd[:120]))
        for m, p in (("PUT", "/v1/flows/drafts"),
                     ("PATCH", "/v1/flows/drafts"),
                     ("POST", "/v1/flows/drafts/seed-alpha"),
                     ("POST", "/v1/flows/drafts/seed-alpha/stages/s_0/result"),
                     ("DELETE", "/v1/flows/drafts")):
            st, bd, _ = http(ts_port, p, m,
                             doc_bytes({}) if m in ("POST", "PATCH", "PUT")
                             else b"")
            try:
                mdoc = json.loads(bd)
            except ValueError:
                mdoc = None
            check("%s %s 404" % (m, p),
                  st == 404
                  and isinstance(mdoc, dict)
                  and mdoc.get("code") == "no_such_route"
                  and str(mdoc.get("error", "")).startswith(
                      "no such route %s %s" % (m, p)),
                  "st=%r body=%r" % (st, bd[:120]))
        # GET on a stage path (no such GET route): the slashed id
        # fails id validation → 400 bad id, not the router 404.
        for spath in ("/v1/flows/drafts/seed-alpha/stages/s_0",
                      "/v1/flows/drafts/seed-alpha/stages/s_1"):
            st, bd = get(ts_port, spath, "GET stage path transport")
            if st is not None:
                try:
                    doc = json.loads(bd)
                except ValueError:
                    doc = None
                check("GET %s 400 bad id" % spath,
                      st == 400
                      and doc == {"error": "bad id",
                                  "code": "invalid_request"},
                      "st=%r body=%r" % (st, bd[:90]))

        # ── 12. list after mutations: count + row multiset ──
        sync_mtimes(ts_root / "drafts")
        st, bd, _ = http(ts_port, "/v1/flows/drafts")
        tj = json.loads(bd)
        strip = (lambda e: sorted((r["model"], r["name"])
                                  for r in e["drafts"]))
        # 11 seeded + 13 staged creates (§5 main + 5 unwraps + 3
        # truthy-body + 4 healed) + nd (§10) = 25 rows; minted rows
        # without intent read ("", ""), while the list name falls
        # back to intent (main create + ct).
        want_multiset = sorted(
            [("m", ""), ("", ""), ("", ""), ("", "T1"), ("m", "F"),
             ("m", "E"), ("svc9", "WantX"), ("anny", "café ✓"),
             ("", ""), ("", ""), ("", "")] + [("", "")] * 12
            + [("", "hello wörld ✓"), ("", "ct")])
        check("post-mutation list count + row multiset",
              st == 200 and tj["count"] == 25
              and strip(tj) == want_multiset,
              "st=%r count=%r rows=%r"
              % (st, tj.get("count"), strip(tj)))

        # ── 13. concurrent creates: N parallel 200s, distinct ids ──
        before = set(os.listdir(ts_root / "drafts"))
        pre_count = tj["count"]
        ids: list[str] = []
        lock = threading.Lock()

        def one(_: int) -> None:
            cst, cdoc = ts_create(ts_port, {"intent": "race"})
            with lock:
                ids.append(cdoc.get("draftId", "") if cst == 200 else "")

        ths = [threading.Thread(target=one, args=(i,)) for i in range(12)]
        [t.start() for t in ths]
        [t.join(timeout=60) for t in ths]
        after = set(os.listdir(ts_root / "drafts"))
        check("ts 12 parallel creates: 200s + distinct ids + 12 files",
              len(ids) == 12 and len(set(ids)) == 12
              and all(DRAFT_ID_RE.match(i) for i in ids)
              and len(after - before) == 12,
              "ids=%d files+%d" % (len(set(ids)), len(after - before)))
        # (create is safe here only via distinct minted ids — parity
        # was "accept", never atomicity; keeper note python/editor_runs.py
        # 988: a plain write, no tmp+rename/O_EXCL.)
        sync_mtimes(ts_root / "drafts")
        st, bd, _ = http(ts_port, "/v1/flows/drafts")
        check("post-race list count grows by 12",
              st == 200 and json.loads(bd)["count"] == pre_count + 12,
              "count=%r want=%r" % (json.loads(bd).get("count"),
                                    pre_count + 12))

        # ── 14. nothing staged outside drafts/ ──
        # (gateway.lock + output/_ledger.jsonl are the scratch boot's
        # own artifacts — owned by tests/_bootstrap.py, not the
        # doors — so they are allowlisted, never flagged.)
        escaped = []
        for dirpath, _ds, fs in os.walk(ts_root):
            for f in fs:
                rel = os.path.relpath(os.path.join(dirpath, f), ts_root)
                if rel.startswith("drafts" + os.sep):
                    continue
                if rel in ("gateway.lock",
                           "output" + os.sep + "_ledger.jsonl"):
                    continue
                escaped.append(rel)
        check("no file outside drafts/", escaped == [], repr(escaped[:3]))

        # ── 15. auth (reboot TS ONLY with the token) ──
        reap_gateway(ts_proc)
        ts_proc = None
        ts_env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_scratch_gateway(env=ts_env)
        want_401 = json.dumps({
            "error": "unauthorized: missing or invalid bearer token "
                     "(Authorization: Bearer <token>; set DSH_GATEWAY_TOKEN "
                     "to enable)"}, indent=2).encode()
        for path, method, body in (
                ("/v1/flows/drafts", "GET", b""),
                ("/v1/flows/drafts", "POST", doc_bytes({"intent": "x"})),
                ("/v1/flows/drafts/seed-alpha", "GET", b""),
                ("/v1/flows/drafts/seed-alpha/stages/s_0", "PATCH",
                 doc_bytes({"result": {}})),
                ("/v1/flows/drafts/seed-alpha/stages/s_0/result", "GET", b"")):
            for auth, nm in ((None, "no token"), ("wrong", "wrong token"),
                             (TOKEN + "-x", "bad token")):
                hdrs = {} if auth is None else {"Authorization": "Bearer "
                                                              + auth}
                st, bd, _ = http(ts_port, path, method, body, hdrs)
                check("%s %s %s → 401 shape" % (method, path, nm),
                      st == 401 and bd == want_401,
                      "st %r" % (st,))
        # Query tokens do NOT count on the HTTP path (header-only).
        st, bd, _ = http(ts_port, "/v1/flows/drafts?token=" + TOKEN)
        check("query token refused", st == 401 and bd == want_401)
        st, _, _ = http(ts_port, "/v1/health")
        check("health exempt without token", st == 200)
        ok200 = True
        for path in ("/v1/flows/drafts", "/v1/flows/drafts/seed-alpha"):
            st, _, _ = http(ts_port, path, "GET", b"",
                            {"Authorization": "Bearer " + TOKEN})
            ok200 = ok200 and st == 200
        check("bearer 200s", ok200)
    finally:
        if ts_proc is not None:
            try:
                reap_gateway(ts_proc)
            except Exception:
                try:
                    ts_proc.terminate()
                except Exception:
                    pass
        if base is not None:
            shutil.rmtree(base, ignore_errors=True)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
