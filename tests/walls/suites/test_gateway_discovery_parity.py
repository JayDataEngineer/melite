#!/usr/bin/env python3
"""test_gateway_discovery_parity.py — FLIP-GAP TS discovery READ doors parity wall.

Proves the TypeScript port (plugins/gateway/src/doors/discovery.ts
over the ROUTES mirror, ctx.ts arms) serves the 10 discovery doors
byte-identical to the py gateway:

  GET /v1/model-catalog                  (_h_model_catalog)
  GET /v1/model-catalog/*                (_h_model_one)
  GET /v1/models/*/provisions/*          (_h_model_provision — bytes)
  GET /v1/forms                          (_h_forms)
  GET /v1/kinds                          (_h_kinds)
  GET /v1/form-spec                      (_h_form_spec — ?model=)
  GET /v1/loras                          (_h_loras — ?model=)
  *   /v1/flows/families/param-schemas   (_h_family_schemas)
  GET /v1/schema                         (_h_schema)
  GET /v1/flows/families/*/param-schema  (_h_family_schema_one)

Method: boot py via boot_scratch_gateway (MELITE_STATE_ROOT=py_root)
+ the TS server (MELITE_STATE_ROOT=ts_root, ephemeral port, QUEUE
LANE LAW), then dual-serve every shape over HTTP and assert
status + byte-equality on bodies (+ content-type parity):

  - the catalog + every model row (ids enumerated LIVE from py —
    the matrix grows with the estate, never a hardcoded list);
  - forms / kinds / schema / all-families envelopes (incl. every
    HTTP method on the "*" param-schemas arm);
  - the ?model= query-variant matrix (missing/empty/bare/repeated/
    blank-first/unknown/unsafe — parse_qs drops blank values, so
    ?model=&model=anny serves anny on py; the runner parses in py,
    never re-spelled in TS);
  - every family param-schema + unknown-family refusal shapes;
  - provisions refusals (unknown family / unknown provision /
    declared-none) + the on-disk happy-path bytes with
    content-type + content-length honesty. Full-bytes dual legs run
    only up to FULL_BYTES_MAX (256MB); mid-size provisions (up to
    PREFIX_MAX) get status + content-type + content-length +
    first-64KB prefix pins (both sides materialize the whole file
    before first byte, so a prefix read never holds GBs in the
    wall); giant provisions above PREFIX_MAX SKIP with a note
    (dual-materializing GBs per side OOM-kills the runner under
    wall-box pressure — flaky, never a pin). Declared-but-missing provisions are
    SKIPPED with a note (both sides would on-demand fetch through
    the rail — network in a wall is flaky, never a pin);
  - trailing-slash + query-strip normalization, method-mismatch
    404s, ensure_ascii + float-literal pins;
  - auth-gate parity with the token OFF and ON (reboot both: 401
    shapes, wrong token, query token refused on HTTP, /v1/health
    exempt, bearer 200s);
  - node -e unit legs for the TS-only deployment envelopes (503
    missing-catalog, 503 unparseable-catalog).
  - FRESHNESS WALL: regen tools/export_discovery_catalog.py from the
    live py tree and diff against plugins/gateway/data/
    discovery-catalog.json (pins the JSON vs the py scan — catches
    drift while py still lives; post-py the file is the frozen truth).

Roots: decl scans are REPO-anchored (catalog/forms/schema read the
product tree, never MELITE_STATE_ROOT), so no fixture tree is
needed for the JSON arms — the two fixture roots isolate the
single-writer locks only. The live production py holds the default
lock — a wall NEVER boots a default-root TS (both servers get
fixture roots; the TS boot without one would contend with live
state).

The TS side serves the frozen export natively (no runtime python —
the stdio bridge is retired). Production serves the same file; a
missing/unparseable file 503s loud (regenerate: python3
tools/export_discovery_catalog.py).

Run: python3 tests/walls/suites/test_gateway_discovery_parity.py
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True
sys.path.insert(0, str(REPO / "py"))

PASS = FAIL = 0
TOKEN = "wall-discovery-token-%d" % os.getpid()

TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"
TS_DISCOVERY = REPO / "plugins" / "gateway" / "src" / "doors" / "discovery.ts"
TS_CATALOG = (REPO / "plugins" / "gateway" / "data"
              / "discovery-catalog.json")
TS_EXPORT_TOOL = REPO / "tools" / "export_discovery_catalog.py"

JSON_HEADERS = ("content-type", "content-length")

FULL_BYTES_MAX = 256 * 1024 * 1024
PREFIX_MAX = 1024 * 1024 * 1024
PREFIX_LEN = 64 * 1024


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def http(port: int, path: str, method: str = "GET",
         headers: dict | None = None) -> tuple[int | None, bytes, dict]:
    """Raw bytes + lowercased headers (no JSON parse — byte-equality)."""
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), method=method,
        headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return (r.status, r.read(),
                    {k.lower(): v for k, v in r.headers.items()})
    except urllib.error.HTTPError as e:
        return (e.code, e.read(),
                {k.lower(): v for k, v in e.headers.items()})
    except Exception as e:
        return (None, b"", {"transport": str(e)})


def dual(py_port: int, ts_port: int, path: str, name: str,
         method: str = "GET", headers: dict | None = None) -> None:
    """One dual-served shape: status + body bytes + JSON headers."""
    ps, pb, ph = http(py_port, path, method, headers)
    ts, tb, th = http(ts_port, path, method, headers)
    if ps is None or ts is None:
        check(name, False, "transport py=%r ts=%r" % (pb[:80], tb[:80]))
        return
    ok = (ps == ts and pb == tb
          and all(ph.get(k) == th.get(k) for k in JSON_HEADERS
                  if k in ph or k in th))
    note = ""
    if not ok:
        note = ("status %r/%r py %dB ts %dB pct %r/%r len %r/%r"
                % (ts, ps, len(pb), len(tb),
                   ph.get("content-type"), th.get("content-type"),
                   ph.get("content-length"), th.get("content-length")))
        for i, (a, b) in enumerate(zip(pb, tb)):
            if a != b:
                note += " first-div @%d py=%r ts=%r" % (i, pb[i:i+40], tb[i:i+40])
                break
        else:
            if len(pb) != len(tb):
                note += " len-div"
    check(name, ok, note)


def head_prefix(port: int, path: str) -> tuple[int | None, bytes, dict]:
    """status + headers + first PREFIX_LEN bytes, then close early —
    pins giant-provision parity without draining GBs into the wall."""
    import http.client
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=900)
    try:
        conn.request("GET", path)
        r = conn.getresponse()
        head = r.read(PREFIX_LEN)
        return (r.status, head,
                {k.lower(): v for k, v in r.getheaders()})
    except Exception as e:
        return (None, b"", {"transport": str(e)})
    finally:
        conn.close()


def dual_prefix(py_port: int, ts_port: int, path: str, name: str) -> None:
    ps, pb, ph = head_prefix(py_port, path)
    ts, tb, th = head_prefix(ts_port, path)
    if ps is None or ts is None:
        check(name, False, "transport py=%r ts=%r" % (pb[:80], tb[:80]))
        return
    ok = (ps == ts == 200 and pb == tb and len(pb) == PREFIX_LEN
          and ph.get("content-type") == th.get("content-type")
          and ph.get("content-length") == th.get("content-length")
          and int(ph.get("content-length", "0")) > FULL_BYTES_MAX)
    note = ""
    if not ok:
        note = ("status %r/%r pre %dB/%dB pct %r/%r len %r/%r"
                % (ts, ps, len(pb), len(tb),
                   ph.get("content-type"), th.get("content-type"),
                   ph.get("content-length"), th.get("content-length")))
    check(name, ok, note)


def boot_ts(env: dict) -> tuple[int, "subprocess.Popen[str]"]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    assert env.get("MELITE_STATE_ROOT"), \
        "never boot a default-root TS (live production py holds that lock)"
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


def live_ids(py_port: int) -> tuple[list[str], list[str]]:
    """Model ids (catalog keys) + family ids (param-schemas keys), live."""
    _, cb, _ = http(py_port, "/v1/model-catalog")
    _, fb, _ = http(py_port, "/v1/flows/families/param-schemas")
    return sorted(json.loads(cb)["models"].keys()), \
        sorted(json.loads(fb).keys())


def provision_plan() -> tuple[list[tuple[str, str, int]],
                           list[tuple[str, str]]]:
    """(on-disk declared provisions + size, declared-but-missing) — the mount
    resolves through the real repo (endpoint file + model_paths), so
    the wall asks py itself; missing ones skip (rail fetch = network).
    Also returns a declared-none family id when one exists."""
    import gateway as _gw
    on_disk: list[tuple[str, str, int]] = []
    missing: list[tuple[str, str]] = []
    from melite_models import scan_engine_models
    fams = sorted({getattr(cls, "id", "")
                   for _, cls in scan_engine_models(str(REPO)).values()
                   if getattr(cls, "id", "")})
    for fid in fams:
        cls = _gw._family_by_id(fid)
        if cls is None:
            continue
        for prov in (getattr(cls, "provisions", None) or ()):
            resolved = _gw._provision_mount(cls, prov)
            if resolved is None:
                continue
            if os.path.isfile(resolved[0]):
                on_disk.append((fid, prov.name,
                                os.path.getsize(resolved[0])))
            else:
                missing.append((fid, prov.name))
    return on_disk, missing


def canon_diff(a, b, path: str = "$") -> str | None:
    """First divergence between regen and the checked-in export: dicts
    compare order-insensitive (key sets + recurse), lists ordered
    (wire order is the contract), scalars exact. None when equal."""
    if isinstance(a, dict) and isinstance(b, dict):
        for k in a.keys() | b.keys():
            if k not in a:
                return "%s.%s: missing in regen" % (path, k)
            if k not in b:
                return "%s.%s: missing in checked-in file" % (path, k)
            d = canon_diff(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        if len(a) != len(b):
            return "%s: length %d != checked-in %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = canon_diff(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    if isinstance(a, bool) or isinstance(b, bool):
        return None if a is b else "%s: %r != checked-in %r" % (path, a, b)
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return None if a == b else "%s: %r != checked-in %r" % (path, a, b)
    return None if a == b else "%s: %r != checked-in %r" % (path, a, b)


def main() -> int:
    base = None
    py_proc = ts_proc = None
    try:
        base = __import__("pathlib").Path(
            tempfile.mkdtemp(prefix="wall-discovery-"))
        py_root = base / "py-root"
        ts_root = base / "ts-root"
        py_root.mkdir(parents=True)
        ts_root.mkdir(parents=True)

        py_env = dict(os.environ)
        py_env["MELITE_STATE_ROOT"] = str(py_root)
        py_env.pop("DSH_GATEWAY_TOKEN", None)
        py_port, py_proc = boot_scratch_gateway(env=py_env)
        ts_env = dict(os.environ)
        ts_env["MELITE_STATE_ROOT"] = str(ts_root)
        ts_env.pop("DSH_GATEWAY_TOKEN", None)
        ts_port, ts_proc = boot_ts(ts_env)
        print("py :%d vs ts :%d" % (py_port, ts_port))

        model_ids, family_ids = live_ids(py_port)
        check("live catalog non-empty", len(model_ids) > 0,
              "got %d" % len(model_ids))
        check("live families non-empty", len(family_ids) > 0,
              "got %d" % len(family_ids))

        # ── catalog ──
        dual(py_port, ts_port, "/v1/model-catalog", "GET /v1/model-catalog")
        dual(py_port, ts_port, "/v1/model-catalog/", "catalog trailing slash")
        dual(py_port, ts_port, "/v1/model-catalog?x=1", "catalog query strip")
        for mid in model_ids:
            dual(py_port, ts_port, "/v1/model-catalog/" + mid,
                 "GET /v1/model-catalog/%s" % mid)
        for weird in ("nope-xyz", "..", "ANNY",
                      "%2e%2e%2fx", "a%2Fb"):
            dual(py_port, ts_port, "/v1/model-catalog/" + weird,
                 "GET /v1/model-catalog/%s" % weird)
        dual(py_port, ts_port, "/v1/model-catalog/anny/",
             "catalog row trailing slash")
        for m in ("POST", "PUT", "DELETE"):
            dual(py_port, ts_port, "/v1/model-catalog", "catalog " + m, m)

        # ── forms / kinds / schema ──
        for path in ("/v1/forms", "/v1/forms/", "/v1/forms?x=1",
                     "/v1/kinds", "/v1/kinds/", "/v1/kinds?x=1",
                     "/v1/schema", "/v1/schema/", "/v1/schema?x=1"):
            dual(py_port, ts_port, path, "GET %s" % path)
        for m in ("POST", "DELETE"):
            for path in ("/v1/forms", "/v1/kinds", "/v1/schema"):
                dual(py_port, ts_port, path,
                     "%s %s 404" % (m, path), m)

        # ── all-families param schemas ("*" arm: every method serves) ──
        for m in ("GET", "POST", "PUT", "DELETE", "PATCH"):
            dual(py_port, ts_port, "/v1/flows/families/param-schemas",
                 "%s param-schemas" % m, m)
        dual(py_port, ts_port, "/v1/flows/families/param-schemas/",
             "param-schemas trailing slash")
        dual(py_port, ts_port, "/v1/flows/families/param-schemas?x=1",
             "param-schemas query strip")

        # ── form-spec ?model= matrix ──
        spec_paths = [
            "/v1/form-spec",
            "/v1/form-spec?model=",
            "/v1/form-spec?model",
            "/v1/form-spec?MODEL=anny",
            "/v1/form-spec?model=nope-xyz",
            "/v1/form-spec?model=&model=anny",
            "/v1/form-spec?model=anny&model=zzz",
            "/v1/form-spec?model=zzz&model=anny",
            "/v1/form-spec?model=&model=",
            "/v1/form-spec?model=../x",
            "/v1/form-spec?model=%2e%2e%2Fx",
            "/v1/form-spec/",
            "/v1/form-spec?model=anny&x=1",
        ]
        for path in spec_paths:
            dual(py_port, ts_port, path, "GET %s" % path)
        for mid in model_ids:
            dual(py_port, ts_port, "/v1/form-spec?model=" + mid,
                 "form-spec?model=%s" % mid)
        for m in ("POST", "DELETE"):
            dual(py_port, ts_port, "/v1/form-spec?model=anny",
                 "form-spec %s 404" % m, m)

        # ── loras ?model= matrix ──
        loras_paths = [
            "/v1/loras",
            "/v1/loras?model=",
            "/v1/loras?model",
            "/v1/loras?model=nope-xyz",
            "/v1/loras?model=&model=anny",
            "/v1/loras?model=anny&model=zzz",
            "/v1/loras/",
        ]
        for path in loras_paths:
            dual(py_port, ts_port, path, "GET %s" % path)
        for mid in model_ids:
            dual(py_port, ts_port, "/v1/loras?model=" + mid,
                 "loras?model=%s" % mid)
        dual(py_port, ts_port, "/v1/loras?model=anny", "loras POST 404",
             "POST")

        # ── one-family param schema ──
        for fid in family_ids:
            dual(py_port, ts_port,
                 "/v1/flows/families/%s/param-schema" % fid,
                 "param-schema %s" % fid)
        for weird in ("nope-xyz", "..", "ANNY", "a%2Fb", ""):
            dual(py_port, ts_port,
                 "/v1/flows/families/%s/param-schema" % weird,
                 "param-schema %r" % weird)
        dual(py_port, ts_port,
             "/v1/flows/families/%s/param-schema?x=1" % family_ids[0],
             "param-schema query strip")
        dual(py_port, ts_port,
             "/v1/flows/families/%s/param-schema/" % family_ids[0],
             "param-schema trailing slash")
        dual(py_port, ts_port,
             "/v1/flows/families/%s/param-schema" % family_ids[0],
             "param-schema POST 404", "POST")

        # ── provisions ──
        dual(py_port, ts_port, "/v1/models/nope-fam-xyz/provisions/x",
             "provisions unknown family")
        dual(py_port, ts_port, "/v1/models/anny/provisions/nope-xyz",
             "provisions unknown provision")
        import gateway as _gw
        from melite_models import scan_engine_models
        fam_ids = sorted({getattr(cls, "id", "") for _, cls
                          in scan_engine_models(str(REPO)).values()
                          if getattr(cls, "id", "")})
        none_fam = next(
            (fid for fid in fam_ids
             if not (getattr(_gw._family_by_id(fid), "provisions", None)
                     or ())), "")
        if none_fam:
            dual(py_port, ts_port,
                 "/v1/models/%s/provisions/nope-xyz" % none_fam,
                 "provisions declared-none (%s)" % none_fam)
        on_disk, missing = provision_plan()
        for fid, pname in missing:
            print("  skip missing-on-disk %s/%s (rail fetch = network)"
                  % (fid, pname))
        small = [(f, p) for f, p, s in on_disk if s <= FULL_BYTES_MAX]
        mid = [(f, p, s) for f, p, s in on_disk
               if FULL_BYTES_MAX < s <= PREFIX_MAX]
        for fid, pname, size in sorted(
                ((f, p, s) for f, p, s in on_disk if s > PREFIX_MAX),
                key=lambda t: -t[2]):
            print("  skip giant-on-disk %s/%s (%dMB — per-side full "
                  "materialize would swap-OOM the wall)"
                  % (fid, pname, size // (1024 * 1024)))
        for fid, pname in small:
            path = "/v1/models/%s/provisions/%s" % (fid, pname)
            dual(py_port, ts_port, path, "GET %s (bytes)" % path)
            for port, tag in ((py_port, "py"), (ts_port, "ts")):
                st, body, h = http(port, path)
                check("%s provisions content-length %s" % (tag, pname),
                      st == 200 and int(h.get("content-length", "-1"))
                      == len(body))
            dual(py_port, ts_port, path + "?x=1",
                 "provisions query strip (%s)" % pname)
            dual(py_port, ts_port, path + "/", "provisions slash (%s)"
                 % pname)
        for fid, pname, size in mid:
            path = "/v1/models/%s/provisions/%s" % (fid, pname)
            dual_prefix(py_port, ts_port, path,
                        "GET %s (prefix %dMB)" % (path, size // 1048576))
        dual(py_port, ts_port,
             "/v1/models/anny/provisions/anny-base-body.glb",
             "provisions POST 404", "POST")

        # ── byte-exactness pins (escaped, not merely equal) ──
        _, pb, _ = http(py_port, "/v1/model-catalog")
        _, tb, _ = http(ts_port, "/v1/model-catalog")
        check("catalog ensure_ascii escapes",
              "\\u2014" in pb.decode() and "\\u2014" in tb.decode()
              and "\u2014" not in pb.decode()
              and "\u2014" not in tb.decode())
        check("catalog float literal verbatim",
              b'"framing": 1.2' in pb and b'"framing": 1.2' in tb)
        _, pb, _ = http(py_port, "/v1/form-spec?model=anny")
        _, tb, _ = http(ts_port, "/v1/form-spec?model=anny")
        check("form-spec ensure_ascii escapes",
              "\\u2014" in pb.decode() and "\\u2014" in tb.decode())

        # ── architecture pin: the native data SSOT — the doors read
        # the frozen discovery-catalog.json (no runtime python, no
        # second snapshot). The wall below proves the freeze matches
        # the live py scan (freshness), so the file is the truth.
        src = TS_DISCOVERY.read_text(encoding="utf-8")
        code = "\n".join(
            ln for ln in src.splitlines()
            if not ln.lstrip().startswith("//"))
        check("no runtime-py bridge",
              "spawnSync" not in code
              and "discoveryRunner" not in code
              and "managePyDirs" not in code
              and "resolveManagePython" not in code)
        check("native catalog SSOT",
              "discovery-catalog.json" in code)
        check("no snapshot second-SSOT",
              "card-decls.json" not in code
              and "model-facts.json" not in code
              and "vocab.ts" not in code)

        # ── FRESHNESS WALL: regen the export from the live py tree
        # and diff against the checked-in file (pins the JSON vs the
        # py scan — catches drift while py still lives; post-py the
        # file becomes the frozen truth). Regen runs from the repo
        # root with absolute paths only (a relative root collides
        # with the loader's module cache — two paths, one key).
        check("export tool present", TS_EXPORT_TOOL.is_file())
        check("catalog file present", TS_CATALOG.is_file())
        try:
            regen = subprocess.run(
                [sys.executable, str(TS_EXPORT_TOOL)],
                cwd=str(REPO), capture_output=True, text=True, timeout=600)
            regen_ok = regen.returncode == 0 and regen.stdout.strip() != ""
            if not regen_ok:
                check("freshness regen runs", False,
                      "rc=%d %s" % (regen.returncode,
                                    (regen.stderr or regen.stdout)[-300:]))
            else:
                try:
                    fresh = json.loads(regen.stdout)
                    frozen = json.loads(
                        TS_CATALOG.read_text(encoding="utf-8"))
                    d = canon_diff(fresh, frozen)
                    check("freshness regen == checked-in",
                          d is None, d or "")
                except ValueError as e:
                    check("freshness regen parses", False, str(e)[:200])
                live_models = set(model_ids)
                frozen_models = set(
                    frozen.get("catalog", {}).get("models", {}).keys())
                check("freshness covers live catalog ids",
                      live_models == frozen_models,
                      "live-only %r frozen-only %r"
                      % (sorted(live_models - frozen_models)[:5],
                         sorted(frozen_models - live_models)[:5]))
                live_fams = set(family_ids)
                frozen_fams = set(frozen.get("family_ids", []))
                check("freshness covers live family ids",
                      live_fams == frozen_fams,
                      "live-only %r frozen-only %r"
                      % (sorted(live_fams - frozen_fams)[:5],
                         sorted(frozen_fams - live_fams)[:5]))
                import flow as _flowmod
                _flowmod.FLOWS_ROOT = REPO / "flows"
                live_flows = set(_flowmod.scan_flow_ids())
                frozen_flows = {
                    r["id"] for r in frozen.get("flows", [])
                    if isinstance(r, dict) and isinstance(
                        r.get("id"), str)}
                check("freshness covers live flow ids",
                      live_flows == frozen_flows,
                      "live-only %r frozen-only %r"
                      % (sorted(live_flows - frozen_flows)[:5],
                         sorted(frozen_flows - live_flows)[:5]))
        except subprocess.TimeoutExpired:
            check("freshness regen runs", False, "timed out (600s)")

        # ── TS-only deployment envelopes (node -e units; py has no
        # counterpart — the catalog file is down, not the builder).
        node = shutil.which("node")
        bad_root = base / "bad-root"
        (bad_root / "plugins" / "gateway" / "data").mkdir(parents=True)
        (bad_root / "plugins" / "gateway" / "data"
         / "discovery-catalog.json").write_text(
            "{not json", encoding="utf-8")
        units = (
            ("503 missing-catalog",
             "import('%s').then(m=>{const r=m.dispatchDiscovery("
             "'_h_kinds','GET','/v1/kinds','/v1/kinds',"
             "'/nonexistent-probe-repo-xyz');"
             "console.log(JSON.stringify([r.status,r.body]));})"
             % TS_DISCOVERY.as_uri(),
             lambda got: got[0] == 503 and "discovery catalog unavailable"
             in got[1] and "export_discovery_catalog" in got[1]),
            ("503 unparseable-catalog",
             "import('%s').then(m=>{const r=m.dispatchDiscovery("
             "'_h_kinds','GET','/v1/kinds','/v1/kinds',%s);"
             "console.log(JSON.stringify([r.status,r.body]));})"
             % (TS_DISCOVERY.as_uri(), json.dumps(str(bad_root))),
             lambda got: got[0] == 503 and "discovery catalog unavailable"
             in got[1]),
        )
        for name, probe, pred in units:
            env = dict(os.environ)
            r = subprocess.run(
                [node, "--experimental-strip-types",
                 "--input-type=module", "-e", probe],
                cwd=str(REPO), capture_output=True, text=True, timeout=120,
                env=env)
            ok = False
            if r.returncode == 0:
                try:
                    ok = bool(pred(json.loads(
                        r.stdout.strip().splitlines()[-1])))
                except (ValueError, IndexError):
                    ok = False
            check("unit " + name, ok, (r.stderr or r.stdout)[-300:])

        # ── auth gate (reboot both with the token) ──
        reap_gateway(py_proc)
        py_proc = None
        ts_proc.terminate()
        try:
            ts_proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            ts_proc.kill()
        ts_proc = None
        py_env["DSH_GATEWAY_TOKEN"] = TOKEN
        py_port, py_proc = boot_scratch_gateway(env=py_env)
        ts_env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_ts(ts_env)
        print("auth py :%d vs ts :%d" % (py_port, ts_port))
        for path in ("/v1/model-catalog", "/v1/kinds",
                     "/v1/form-spec?model=anny"):
            dual(py_port, ts_port, path, "auth 401 %s" % path)
            ps, pb, _ = http(py_port, path)
            check("auth 401 shape %s" % path,
                  ps == 401 and b"unauthorized" in pb
                  and b"DSH_GATEWAY_TOKEN" in pb)
        dual(py_port, ts_port, "/v1/model-catalog?token=" + TOKEN,
             "auth query token refused")
        ps, _, _ = http(py_port, "/v1/model-catalog?token=" + TOKEN)
        check("auth query token refused shape", ps == 401)
        bearer = {"Authorization": "Bearer " + TOKEN}
        for path in ("/v1/model-catalog", "/v1/kinds",
                     "/v1/form-spec?model=anny",
                     "/v1/models/anny/provisions/anny-base-body.glb"):
            ps, pb, _ = http(py_port, path, headers=bearer)
            ts, tb, _ = http(ts_port, path, headers=bearer)
            check("auth bearer 200 %s" % path,
                  ps == ts == 200 and pb == tb,
                  "status %r/%r py %dB ts %dB" % (ts, ps, len(pb), len(tb)))
        dual(py_port, ts_port, "/v1/model-catalog", "auth wrong token",
             headers={"Authorization": "Bearer wrong"})
        ps, _, _ = http(py_port, "/v1/model-catalog",
                        headers={"Authorization": "Bearer wrong"})
        check("auth wrong token shape", ps == 401)
        ps, pb, _ = http(py_port, "/v1/health")
        ts, tb, _ = http(ts_port, "/v1/health")
        check("auth health exempt", ps == ts == 200 and pb == tb)
    finally:
        if py_proc is not None:
            reap_gateway(py_proc)
        if ts_proc is not None:
            ts_proc.terminate()
            try:
                ts_proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                ts_proc.kill()
        if base is not None:
            shutil.rmtree(str(base), ignore_errors=True)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
