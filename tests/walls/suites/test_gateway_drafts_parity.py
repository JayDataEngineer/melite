#!/usr/bin/env python3
"""test_gateway_drafts_parity.py — P4 draft CRUD doors TS parity wall.

Proves the TypeScript port (plugins/gateway/src/doors/drafts.ts via
ctx.ts dispatch) answers byte-identical to the py gateway
(py/gateway.py draft arms 3108-3149; strict bodies 4335-4340; R4.2
normalization 4353-4355; auth gate _adapt 2607-2619; file semantics
py/editor_runs.py 818-1204; birth gate py/run_wire.py 151-170):

  full create/get/patch/result/list lifecycle, patch-merge semantics
  (shallow params merge, replace-the-rest, atomic tmp+rename), the
  composer-drift 500s (pydantic-exact refusal TEXT — the money pins),
  empty-body/non-dict/bad-JSON refusals, traversal + hostile-name
  parity, DELETE-is-404 parity (drafts_delete is unwired dead code —
  editor_runs.py 1065-1071 — so DELETE falls to no-such-route on
  both), method mismatches, auth-gate parity, and N-parallel creates.

Dual-serve on fixture roots: ONE fixture drafts/ tree is built, then
COPIED to a py root and a ts root (never shared — PATCH rewrites
state on both sides). py boots via boot_scratch_gateway
(MELITE_STATE_ROOT=py_root); TS boots with MELITE_STATE_ROOT=ts_root
(the door's only env seam — default resolution is the py-identical
source-file-relative root). POST creates mint INDEPENDENT ids per
server, so create pins compare modulo (draft_id, createdAt) while
every other pin is byte-equal.

KNOWN divergences (asserted as shape, never bytes):
  - bad-JSON error TEXT embeds the host JSON parser's message
    (CPython JSONDecodeError vs V8 SyntaxError) — status 400 +
    code bad_json + "bad JSON: " prefix must agree.
  - corrupt-on-disk GET text embeds the host parser's message —
    status 500 + "draft corrupt on disk: " prefix must agree (the
    FIXED "not an object" variant IS byte-equal).
  - minted draft_ids / createdAt differ per server by construction —
    shape (regex, int, %1000, recency) + modulo-content must agree.
  - invalid-UTF-8 bodies: py raises UnicodeDecodeError (500-class);
    TS decodes lossy. Untested — nobody sends invalid UTF-8.
  - a directory named <id>.json: py's open-then-read raises into the
    traceback-500; TS rethrows into the server 500 catch. Both 500,
    texts differ. Untested.
  - lone-surrogate strings persist lossy on TS (replacement char)
    vs py's write-time raise (traceback-500). Untested.
  - integer-like object keys keep insertion order on py but ascend
    numerically on JS. Untested (fixtures use string keys).

Run: python3 tests/walls/suites/test_gateway_drafts_parity.py
"""

import json
import os
import re
import shutil
import subprocess
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

TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"

DRAFT_ID_RE = re.compile(r"^draft-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$")


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


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


def dual(py_port: int, ts_port: int, path: str, name: str,
         method: str = "GET", body: bytes = b"",
         ctype: str = "application/json") -> tuple[bytes, bytes]:
    """One dual-served shape: status + body bytes + content-type."""
    ps, pb, ph = http(py_port, path, method, body, None, ctype)
    ts, tb, th = http(ts_port, path, method, body, None, ctype)
    if ps is None or ts is None:
        check(name, False, "transport py=%r ts=%r" % (pb[:80], tb[:80]))
        return pb, tb
    ok = (ps == ts and pb == tb
          and ph.get("content-type", "").split(";")[0]
          == th.get("content-type", "").split(";")[0])
    note = ""
    if not ok:
        note = ("status %r/%r py %dB ts %dB pct %r/%r"
                % (ts, ps, len(pb), len(tb),
                   th.get("content-type"), ph.get("content-type")))
        for i, (a, b) in enumerate(zip(pb, tb)):
            if a != b:
                note += " first-div @%d py=%r ts=%r" % (i, pb[i - 20:i + 40],
                                                       tb[i - 20:i + 40])
                break
        else:
            if len(pb) != len(tb):
                note += " len-div"
    check(name, ok, note)
    return pb, tb


def dual_shape(py_port: int, ts_port: int, path: str, name: str,
               method: str = "GET", body: bytes = b"",
               want_status: int = 0,
               err_prefix: str = "", want_code: str | None = "") -> None:
    """Shape compare for host-parser-text divergences (bad JSON,
    corrupt disk): status + code + error prefix must agree. Pass
    want_code=None when the envelope must carry NO code (500s —
    normalize4xx is 4xx-only on both)."""
    ps, pb, _ = http(py_port, path, method, body)
    ts, tb, _ = http(ts_port, path, method, body)
    try:
        pj, tj = json.loads(pb), json.loads(tb)
    except ValueError:
        pj = tj = None
    ok = (ps == ts == want_status
          and isinstance(pj, dict) and isinstance(tj, dict)
          and str(pj.get("error", "")).startswith(err_prefix)
          and str(tj.get("error", "")).startswith(err_prefix)
          and pj.get("code") == tj.get("code") == want_code)
    check(name, ok, "st %r/%r py=%r ts=%r"
          % (ts, ps, pb[:90], tb[:90]))


def boot_ts(env: dict) -> tuple[int, "subprocess.Popen[str]"]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", str(TS_SERVER)],
        cwd=str(REPO), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True, env=env)
    assert proc.stdout is not None
    deadline = time.time() + 25
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line.startswith("READY "):
            return int(line.split()[1]), proc
        if proc.poll() is not None:
            raise RuntimeError("ts server exited rc=%d" % proc.returncode)
    proc.terminate()
    raise RuntimeError("ts server did not print READY")


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
    # Non-canonical number literals (py normalizes load->dump: 1.00
    # wires as "1.0", 1e2 as "100.0" — the float-fidelity pins).
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


def py_ts_create(port: int, doc: object,
                 ctype: str = "application/json") -> tuple[int | None, dict]:
    st, body, _ = http(port, "/v1/flows/drafts", "POST", doc_bytes(doc),
                       None, ctype)
    try:
        return st, json.loads(body)
    except ValueError:
        return st, {}


def main() -> int:
    base = None
    py_proc = ts_proc = None
    try:
        base = Path(tempfile.mkdtemp(prefix="wall-drafts-"))
        build_fixture(base / "drafts")
        py_root = base / "py-root"
        ts_root = base / "ts-root"
        shutil.copytree(str(base / "drafts"), str(py_root / "drafts"))
        shutil.copytree(str(base / "drafts"), str(ts_root / "drafts"))

        py_env = dict(os.environ)
        py_env["MELITE_STATE_ROOT"] = str(py_root)
        py_env.pop("DSH_GATEWAY_TOKEN", None)
        try:
            py_port, py_proc = boot_scratch_gateway(env=py_env)
        except RuntimeError as e:
            print("FATAL: %s" % e)
            return 1
        ts_env = dict(os.environ)
        ts_env["MELITE_STATE_ROOT"] = str(ts_root)
        ts_env.pop("DSH_GATEWAY_TOKEN", None)
        try:
            ts_port, ts_proc = boot_ts(ts_env)
        except RuntimeError as e:
            print("FATAL: %s" % e)
            return 1
        print("py :%d vs ts :%d (root %s)" % (py_port, ts_port, base))

        # ── 1. GET one: byte-equal incl. unicode + float pins ──
        pb, tb = dual(py_port, ts_port, "/v1/flows/drafts/seed-alpha",
                      "GET seed-alpha (unicode/float/bigint pins)")
        dual(py_port, ts_port, "/v1/flows/drafts/seed-alpha/",
             "GET trailing slash normalizes")
        dual(py_port, ts_port, "/v1/flows/drafts/seed-alpha?x=1&y=2",
             "GET query string ignored")
        check("wire ensure_ascii escapes",
              b"caf\\u00e9 \\u2713" in pb and b"caf\\u00e9 \\u2713" in tb
              and "café".encode() not in pb and "café".encode() not in tb)
        check("wire float 1.0 verbatim + bigint exact",
              b'"score": 1.0' in pb and b'"score": 1.0' in tb
              and b'"big": 9007199254740993' in pb
              and b'"big": 9007199254740993' in tb)
        pb, _ = dual(py_port, ts_port, "/v1/flows/drafts/seed-float",
                     "GET non-canonical literals normalize (1.00/1e2/2.50/-0.0)")
        check("float normalization content",
              b'"n": 1.0' in pb and b'"e": 100.0' in pb
              and b'"x": [\n      2.5,\n      -0.0' in pb)
        dual(py_port, ts_port, "/v1/flows/drafts/seed-beta",
             "GET seed-beta")
        dual(py_port, ts_port, "/v1/flows/drafts/nope",
             "GET missing 404 shape")

        # ── 2. hostile ids: traversal + malformed → 400 both ──
        for bad in ("../x", "a/b", "..%2f..%2fx", "%2e%2e/x", "a%2Fb",
                    "x" * 97, "a%20b", "caf%C3%A9", "a+b"):
            dual(py_port, ts_port, "/v1/flows/drafts/%s" % bad,
                 "GET hostile %r 400" % bad)
        dual(py_port, ts_port, "/v1/flows/drafts/%2e%2e%2fseed-alpha",
             "GET encoded traversal 400")

        # ── 3. corrupt / non-object files ──
        dual_shape(py_port, ts_port, "/v1/flows/drafts/corrupt",
                   "GET corrupt 500 (parser text differs — prefix only)",
                   want_status=500, err_prefix="draft corrupt on disk: ",
                   want_code=None)
        # (500s carry no code — normalize4xx is 4xx-only on both.)
        dual(py_port, ts_port, "/v1/flows/drafts/arr",
             "GET array doc 500 not-an-object")
        dual(py_port, ts_port, "/v1/flows/drafts/num",
             "GET scalar doc 500 not-an-object")
        dual(py_port, ts_port, "/v1/flows/drafts/str",
             "GET string doc 500 not-an-object")

        # ── 4. LIST: byte-equal + envelope semantics ──
        pb, tb = dual(py_port, ts_port, "/v1/flows/drafts", "GET list")
        dual(py_port, ts_port, "/v1/flows/drafts/", "GET list trailing slash")
        dual(py_port, ts_port, "/v1/flows/drafts?x=1", "GET list query ignored")
        env = json.loads(pb)
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

        # ── 5. CREATE lifecycle (modulo id/createdAt) ──
        created: list[tuple[str, str]] = []  # (py_id, ts_id)
        body = {"intent": "hello w\u00f6rld \u2713",
                "stages": [{"card": "c", "params": {"temp": 1.5}}],
                "extra": {"n": [1, "x", 2.0]},
                "status": "HACK", "draft_id": "HACK", "createdAt": 1,
                "completedAt": 2}
        pst, pj = py_ts_create(py_port, body)
        tst, tj = py_ts_create(ts_port, body)
        id_ok = (pst == tst == 200
                 and bool(DRAFT_ID_RE.match(pj.get("draftId", "")))
                 and bool(DRAFT_ID_RE.match(tj.get("draftId", "")))
                 and pj.get("draftId") != tj.get("draftId"))
        stages_ok = pj.get("stages") == tj.get("stages") == [
            {"id": "s_0", "card": "c", "params": {"temp": 1.5},
             "inputs": [""], "provenance": "agent"}]
        now_ms = int(time.time() * 1000)
        check("POST create 200 + minted-id shape + stages echo",
              id_ok and stages_ok, "py=%r ts=%r" % (pj, tj)[:200])
        # createdAt lives on disk (the response carries no createdAt).
        py_doc = json.loads((py_root / "drafts"
                             / (pj["draftId"] + ".json")).read_bytes())
        ts_doc = json.loads((ts_root / "drafts"
                             / (tj["draftId"] + ".json")).read_bytes())
        disk_ok = (
            py_doc.get("draft_id") == pj["draftId"]
            and ts_doc.get("draft_id") == tj["draftId"]
            and list(py_doc) == list(ts_doc)
            == ["draft_id", "intent", "stages", "status",
                "createdAt", "completedAt", "extra"]
            and py_doc["status"] == ts_doc["status"] == "ready"
            and py_doc["completedAt"] is ts_doc["completedAt"] is None
            and all(isinstance(d["createdAt"], int)
                    and d["createdAt"] % 1000 == 0
                    and abs(now_ms - d["createdAt"]) < 120000
                    for d in (py_doc, ts_doc))
            and {k: v for k, v in py_doc.items()
                 if k not in ("draft_id", "createdAt")}
            == {k: v for k, v in ts_doc.items()
                if k not in ("draft_id", "createdAt")})
        check("staged files match modulo id/createdAt (+order, +composer-owned)",
              disk_ok)
        raw_py = (py_root / "drafts" / (pj["draftId"] + ".json")).read_bytes()
        raw_ts = (ts_root / "drafts" / (tj["draftId"] + ".json")).read_bytes()
        check("staged bytes compact + raw UTF-8 (ensure_ascii=False)",
              raw_py.startswith(b'{"draft_id":"')
              and "w\u00f6rld \u2713".encode() in raw_py
              and "w\u00f6rld \u2713".encode() in raw_ts
              and b"\n" not in raw_py and b"\n" not in raw_ts
              and b", " not in raw_py)
        # Modulo-normalized raw compare (ids + timestamps blanked).
        norm = (lambda b, did, cat: b.replace(did.encode(), b"ID")
                .replace(str(cat).encode(), b"TS"))
        check("staged raw bytes equal modulo id/createdAt",
              norm(raw_py, pj["draftId"], py_doc["createdAt"])
              == norm(raw_ts, tj["draftId"], ts_doc["createdAt"]))
        created.append((pj["draftId"], tj["draftId"]))
        # GET-back modulo compare.
        _, pb, _ = http(py_port, "/v1/flows/drafts/" + pj["draftId"])
        _, tb, _ = http(ts_port, "/v1/flows/drafts/" + tj["draftId"])
        check("GET-back equal modulo id/createdAt",
              norm(pb, pj["draftId"], py_doc["createdAt"])
              == norm(tb, tj["draftId"], ts_doc["createdAt"]))
        sync_mtimes(py_root / "drafts")
        sync_mtimes(ts_root / "drafts")

        # calls-unwrap pins (response stages compare, parsed).
        for nm, stages in (
                ("calls string unwraps", [{"calls": "[1,2]", "id": "k"}]),
                ("bad calls string kept", [{"calls": "nope"}]),
                ("nested calls unwraps", [{"sub": {"calls": "[3]"}}]),
                ("calls inside a list untouched",
                 [{"items": [{"calls": "[3]"}]}]),
                ("non-dict stages become birth rows", [None, 5, "x"]),
                ("present-but-empty id kept (drift, see §7)",
                 [{"id": "", "inputs": [], "provenance": "p"}])):
            pst, pj = py_ts_create(py_port, {"stages": stages})
            tst, tj = py_ts_create(ts_port, {"stages": stages})
            if nm.startswith("present-but-empty"):
                check(nm + " → 500 drift both",
                      pst == tst == 500 and pj == tj,
                      "st %r/%r" % (tst, pst))
            else:
                check(nm, pst == tst == 200
                      and pj.get("stages") == tj.get("stages"),
                      "st %r/%r py=%r ts=%r"
                      % (tst, pst, pj.get("stages"), tj.get("stages")))
        sync_mtimes(py_root / "drafts")
        sync_mtimes(ts_root / "drafts")

        # ── 6. empty / non-dict / bad-JSON create refusals ──
        # (py truthiness gate: falsy bodies 400, every truthy body —
        # even non-dict scalars/lists — composes and 200s. Refusals
        # are byte-equal; creates carry independent ids, so those
        # compare by status + parsed stages only.)
        for doc, wst in (({}, 400), ([1, 2], 200), (5, 200), (0, 400),
                         ("0", 400), ("hi", 400), ("false", 400),
                         ("null", 400)):
            raw = doc_bytes(doc)
            if wst == 400:
                dual(py_port, ts_port, "/v1/flows/drafts",
                     "POST %r → 400" % (doc,), "POST", raw)
            ps, pb, _ = http(py_port, "/v1/flows/drafts", "POST", raw)
            ts, tb, _ = http(ts_port, "/v1/flows/drafts", "POST", raw)
            ok = ps == ts == wst
            if ok and wst == 200:
                try:
                    ok = (json.loads(pb).get("stages")
                          == json.loads(tb).get("stages") == [])
                except ValueError:
                    ok = False
            check("POST %r status %d both" % (doc, wst),
                  ok, "py=%r ts=%r" % (ps, ts))
        ps, _, _ = http(py_port, "/v1/flows/drafts", "POST", b"")
        ts, _, _ = http(ts_port, "/v1/flows/drafts", "POST", b"")
        check("POST empty body 400 both", ps == ts == 400)
        dual_shape(py_port, ts_port, "/v1/flows/drafts",
                   "POST bad JSON shape (code, not parser text)",
                   "POST", b"{nope", 400, "bad JSON: ", "bad_json")
        # content-type is never consulted (py ignores it too).
        pst, pj = py_ts_create(py_port, {"intent": "ct"})
        tst, tj = py_ts_create(ts_port, {"intent": "ct"}, "text/plain")
        check("wrong content-type still 200 (ignored, not refused)",
              pst == tst == 200 and tj.get("stages") == [],
              "st %r/%r" % (tst, pst))
        sync_mtimes(py_root / "drafts")
        sync_mtimes(ts_root / "drafts")

        # ── 7. composer-drift 500s: pydantic-EXACT bytes ──
        # (only PRESENT-but-invalid stage values reach the gate —
        # the composer HEALS absent keys/non-dict rows/non-list
        # stages with birth defaults first, so those 200 on both;
        # the healed pins compare parsed stages, the drift pins are
        # byte-equal down to the pydantic text.)
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
            pst, pj = py_ts_create(py_port, doc)
            tst, tj = py_ts_create(ts_port, doc)
            check("POST healed: %s" % nm,
                  pst == tst == 200
                  and pj.get("stages") == tj.get("stages") == want_stages,
                  "st %r/%r" % (tst, pst))
        drift_docs = [
            ("empty id", {"stages": [{"id": ""}]}),
            ("null id", {"stages": [{"id": None}]}),
            ("int id", {"stages": [{"id": 5}]}),
            ("empty provenance", {"stages": [{"id": "s_0",
                                              "inputs": [""],
                                              "provenance": ""}]}),
            ("null provenance", {"stages": [{"id": "s_0",
                                             "inputs": [""],
                                             "provenance": None}]}),
            ("inputs string", {"stages": [{"id": "s_0", "inputs": "x",
                                           "provenance": "agent"}]}),
            ("inputs null", {"stages": [{"id": "s_0", "inputs": None,
                                         "provenance": "agent"}]}),
            ("quoted input_value repr",
             {"stages": [{"id": "s_0", "inputs": "x'y",
                          "provenance": "agent"}]}),
            ("multi item errors",
             {"stages": [{"id": "s_0", "inputs": [1, 2],
                          "provenance": "agent"}]}),
            ("null item", {"stages": [{"id": "s_0", "inputs": [None],
                                       "provenance": "agent"}]}),
            ("nested dict item",
             {"stages": [{"id": "s_0", "inputs": [{"a": 1}],
                          "provenance": "agent"}]}),
            ("triple failure incl bool/float",
             {"stages": [{"id": ["x"], "inputs": {"a": 1},
                          "provenance": 3}]}),
            ("first failing stage reports",
             {"stages": [{"id": "fine", "inputs": ["a"],
                          "provenance": "p"},
                         {"id": 1}]}),
        ]
        for nm, doc in drift_docs:
            pb, tb = dual(py_port, ts_port, "/v1/flows/drafts",
                          "POST drift: %s" % nm, "POST", doc_bytes(doc))
            if b"2.13" not in pb or b"2.13" not in tb:
                check("POST drift %s pins pydantic 2.13 URL" % nm, False)
        check("drift bodies refuse as 500 without a code",
              json.loads(pb).get("code", "KEEP") == "KEEP")

        # ── 8. PATCH lifecycle on the seeded alpha ──
        patch = {"result": {"y": 2}, "runStatus": "done",
                 "params": {"b": 3}, "inputs": ["i"],
                 "inputOutputs": [["o"]]}
        pb, tb = dual(py_port, ts_port,
                      "/v1/flows/drafts/seed-alpha/stages/s_0",
                      "PATCH full merge", "PATCH", doc_bytes(patch))
        check("patch delivered:true + sorted patched keys",
              json.loads(pb).get("patched")
              == ["inputOutputs", "inputs", "params", "result", "runStatus"])
        py_f = (py_root / "drafts" / "seed-alpha.json").read_bytes()
        ts_f = (ts_root / "drafts" / "seed-alpha.json").read_bytes()
        check("patched FILES byte-equal (merge + atomic rewrite)",
              py_f == ts_f, "py %dB ts %dB" % (len(py_f), len(ts_f)))
        check("params merged shallow, result replaced",
              b'"params":{"a":1,"b":3}' in py_f
              and b'"result":{"y":2}' in py_f
              and b'"runStatus":"done"' in py_f)
        # GET-result round-trip.
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/s_0/result",
             "GET result found:true")
        # Params-only merge on s_1 (no prior params → fresh object).
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/s_1",
             "PATCH params-only", "PATCH",
             doc_bytes({"params": {"fresh": True}}))
        py_f = (py_root / "drafts" / "seed-alpha.json").read_bytes()
        check("params-only merge lands (key appended, files equal)",
              b'"provenance":"agent","params":{"fresh":true}' in py_f
              and (ts_root / "drafts" / "seed-alpha.json").read_bytes()
              == py_f)
        # Empty patch: delivered with patched [].
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/s_1",
             "PATCH empty object", "PATCH", b"{}")
        # result:null refuses (None is not a dict).
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/s_1",
             "PATCH result null 400", "PATCH",
             doc_bytes({"result": None}))
        sync_mtimes(py_root / "drafts")
        sync_mtimes(ts_root / "drafts")

        # ── 9. PATCH refusals (byte-equal) ──
        for nm, body in (
                ("unknown keys sorted in text",
                 {"zzz": 1, "aaa": 2}),
                ("result must be dict", {"result": [1]}),
                ("runStatus must be str", {"runStatus": 5}),
                ("params must be dict", {"params": [1]}),
                ("inputs must be list", {"inputs": {}}),
                ("inputOutputs must be list", {"inputOutputs": "s"}),
                ("non-object body (list)", [1]),
                ("non-object body (string)", "x"),
                ("non-object body (scalar)", 5),
                ("non-object body (null)", None),
        ):
            dual(py_port, ts_port,
                 "/v1/flows/drafts/seed-alpha/stages/s_0",
                 "PATCH %s" % nm, "PATCH", doc_bytes(body))
        dual_shape(py_port, ts_port,
                   "/v1/flows/drafts/seed-alpha/stages/s_0",
                   "PATCH bad JSON shape", "PATCH", b"{nope",
                   400, "bad JSON: ", "bad_json")
        dual(py_port, ts_port, "/v1/flows/drafts/bad%20id/stages/s_0",
             "PATCH bad draft id 400", "PATCH", doc_bytes({"result": {}}))
        dual(py_port, ts_port, "/v1/flows/drafts/nope/stages/s_0",
             "PATCH missing draft reconciles 200", "PATCH",
             doc_bytes({"result": {}}))
        dual(py_port, ts_port, "/v1/flows/drafts/seed-alpha/stages/nosuch",
             "PATCH missing stage reconciles 200", "PATCH",
             doc_bytes({"result": {}}))
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/%s" % ("a" * 129),
             "PATCH overlong stage reconciles 200", "PATCH",
             doc_bytes({"result": {}}))
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/..",
             "PATCH dotdot stage reconciles 200", "PATCH",
             doc_bytes({"result": {}}))
        dual(py_port, ts_port,
             "/v1/flows/drafts/corrupt/stages/s_0",
             "PATCH corrupt disk 500", "PATCH",
             doc_bytes({"result": {}}))
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/a/b",
             "PATCH slashed stage falls to 404", "PATCH",
             doc_bytes({"result": {}}))
        dual(py_port, ts_port,
             "/v1/flows/drafts/../x/stages/s_0",
             "PATCH traversal draft id 404-or-400 parity", "PATCH",
             doc_bytes({"result": {}}))
        check("no .tmp survivors after patches",
              not [f for f in os.listdir(py_root / "drafts")
                   if f.endswith(".tmp")]
              and not [f for f in os.listdir(ts_root / "drafts")
                       if f.endswith(".tmp")])

        # ── 10. RESULT reads (byte-equal) ──
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/s_1/result",
             "GET result missing-result found:false")
        dual(py_port, ts_port, "/v1/flows/drafts/nope/stages/s_0/result",
             "GET result missing draft found:false")
        dual(py_port, ts_port,
             "/v1/flows/drafts/seed-alpha/stages/nosuch/result",
             "GET result missing stage found:false")
        dual(py_port, ts_port, "/v1/flows/drafts/corrupt/stages/s_0/result",
             "GET result corrupt found:false (NOT the get 500)")
        dual(py_port, ts_port, "/v1/flows/drafts/arr/stages/s_0/result",
             "GET result array-doc found:false")
        dual(py_port, ts_port, "/v1/flows/drafts/bad%20id/stages/s_0/result",
             "GET result bad id 400")
        # Non-dict persisted result reads found:false.
        for root in (py_root, ts_root):
            (root / "drafts" / "nd.json").write_text(
                json.dumps({"draft_id": "nd",
                            "stages": [{"id": "s_0", "result": [1]}]}))
        sync_mtimes(py_root / "drafts")
        sync_mtimes(ts_root / "drafts")
        dual(py_port, ts_port, "/v1/flows/drafts/nd/stages/s_0/result",
             "GET result non-dict found:false")

        # ── 11. DELETE + method mismatches (404 parity) ──
        pid = created[0][0]
        tid = created[0][1]
        dual(py_port, ts_port, "/v1/flows/drafts/%s" % pid,
             "DELETE unwired 404 (py twin id %s)" % tid[:18],
             "DELETE")
        # (same path, other id — byte shapes must still agree modulo
        # the echoed id, so compare parsed envelopes structurally.)
        ps, pb, _ = http(py_port, "/v1/flows/drafts/%s" % pid, "DELETE")
        ts, tb, _ = http(ts_port, "/v1/flows/drafts/%s" % tid, "DELETE")
        pj, tj = json.loads(pb), json.loads(tb)
        check("DELETE envelopes match modulo id",
              ps == ts == 404
              and pj.get("code") == tj.get("code") == "no_such_route"
              and pj.get("error", "").replace(pid, "ID")
              == tj.get("error", "").replace(tid, "ID"))
        for m, p in (("PUT", "/v1/flows/drafts"),
                     ("PATCH", "/v1/flows/drafts"),
                     ("POST", "/v1/flows/drafts/seed-alpha"),
                     ("POST", "/v1/flows/drafts/seed-alpha/stages/s_0/result"),
                     ("DELETE", "/v1/flows/drafts"),
                     ("GET", "/v1/flows/drafts/seed-alpha/stages/s_0")):
            dual(py_port, ts_port, p, "%s %s 404" % (m, p), m,
                 doc_bytes({}) if m in ("POST", "PATCH", "PUT") else b"")

        # ── 12. list after mutations: counts + row multisets ──
        sync_mtimes(py_root / "drafts")
        sync_mtimes(ts_root / "drafts")
        _, pb, _ = http(py_port, "/v1/flows/drafts")
        _, tb, _ = http(ts_port, "/v1/flows/drafts")
        pj, tj = json.loads(pb), json.loads(tb)
        strip = (lambda e: sorted((r["model"], r["name"])
                                 for r in e["drafts"]))
        check("post-mutation lists agree (count + row multiset)",
              pj["count"] == tj["count"] and strip(pj) == strip(tj),
              "counts %r/%r" % (tj.get("count"), pj.get("count")))

        # ── 13. concurrent creates: N parallel 200s, distinct ids ──
        for port, root, tag in ((py_port, py_root, "py"),
                               (ts_port, ts_root, "ts")):
            before = set(os.listdir(root / "drafts"))
            ids: list[str] = []
            lock = threading.Lock()

            def one(_: int) -> None:
                st, doc = py_ts_create(port, {"intent": "race"})
                with lock:
                    ids.append(doc.get("draftId", ""))

            ths = [threading.Thread(target=one, args=(i,)) for i in range(12)]
            [t.start() for t in ths]
            [t.join(timeout=60) for t in ths]
            after = set(os.listdir(root / "drafts"))
            check("%s 12 parallel creates: 200s + distinct ids + 12 files"
                  % tag,
                  len(ids) == 12 and len(set(ids)) == 12
                  and all(DRAFT_ID_RE.match(i) for i in ids)
                  and len(after - before) == 12,
                  "ids=%d files+%d" % (len(set(ids)), len(after - before)))
        # py create is a PLAIN write (editor_runs.py 988, no
        # tmp+rename/O_EXCL): safe here only via distinct minted ids —
        # parity is "both accept", never atomicity py lacks.
        sync_mtimes(py_root / "drafts")
        sync_mtimes(ts_root / "drafts")
        _, pb, _ = http(py_port, "/v1/flows/drafts")
        _, tb, _ = http(ts_port, "/v1/flows/drafts")
        check("post-race list counts agree",
              json.loads(pb)["count"] == json.loads(tb)["count"])

        # ── 14. nothing staged outside drafts/ ──
        # (gateway.lock + output/_ledger.jsonl are the scratch py
        # boot's own artifacts — owned by tests/_bootstrap.py, not
        # the doors — so they are allowlisted, never flagged.)
        escaped = []
        for root in (py_root, ts_root):
            for dirpath, _ds, fs in os.walk(root):
                for f in fs:
                    rel = os.path.relpath(os.path.join(dirpath, f), root)
                    if rel.startswith("drafts" + os.sep):
                        continue
                    if rel in ("gateway.lock",
                               "output" + os.sep + "_ledger.jsonl"):
                        continue
                    escaped.append(rel)
        check("no file outside drafts/", escaped == [], repr(escaped[:3]))

        # ── 15. auth parity (reboot BOTH with the token) ──
        reap_gateway(py_proc)
        ts_proc.terminate()
        try:
            ts_proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            ts_proc.kill()
        py_env["DSH_GATEWAY_TOKEN"] = TOKEN
        py_port, py_proc = boot_scratch_gateway(env=py_env)
        ts_env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_ts(ts_env)
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
                ps, pb, _ = http(py_port, path, method, body, hdrs)
                ts, tb, _ = http(ts_port, path, method, body, hdrs)
                check("%s %s %s → 401 shape" % (method, path, nm),
                      ps == ts == 401 and pb == tb == want_401,
                      "st %r/%r" % (ts, ps))
        # Query tokens do NOT count on the HTTP path (_adapt passes ""
        # as query_token — header-only, both).
        ps, pb, _ = http(py_port, "/v1/flows/drafts?token=" + TOKEN)
        ts, tb, _ = http(ts_port, "/v1/flows/drafts?token=" + TOKEN)
        check("query token refused both",
              ps == ts == 401 and pb == tb == want_401)
        ps, _, _ = http(py_port, "/v1/health")
        ts, _, _ = http(ts_port, "/v1/health")
        check("health exempt without token", ps == ts == 200)
        ok200 = True
        for path in ("/v1/flows/drafts", "/v1/flows/drafts/seed-alpha"):
            ps, _, _ = http(py_port, path, "GET", b"",
                            {"Authorization": "Bearer " + TOKEN})
            ts, _, _ = http(ts_port, path, "GET", b"",
                            {"Authorization": "Bearer " + TOKEN})
            ok200 = ok200 and ps == ts == 200
        check("bearer 200s both", ok200)
    finally:
        for proc in (py_proc, ts_proc):
            if proc is not None:
                try:
                    reap_gateway(proc)
                except Exception:
                    try:
                        proc.terminate()
                    except Exception:
                        pass
        if base is not None:
            shutil.rmtree(base, ignore_errors=True)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
