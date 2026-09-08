#!/usr/bin/env python3
"""test_gateway_studios_parity.py — FLIP-GAP studios doors parity wall.

Proves the pure-TS port (packages/gateway/src/doors/studios.ts over
the ROUTES mirror, minimal ctx.ts arms) serves the 4 studios doors
byte-identical to the py gateway:

  GET    /v1/studios/{tenant}/presets          (_h_presets_list)
  POST   /v1/studios/{tenant}/presets          (_h_presets_save, 201)
  DELETE /v1/studios/{tenant}/presets/{id}     (_h_presets_delete)
  GET    /v1/studios/{tenant}/base-body        (_h_base_body, bytes)

There is NO /v1/models/*/provisions collection leg (no route row,
no handler — the item arm is discovery's); nothing to port there.

Method (uploads-wall precedent — shared tmp, never copy-trees):
py serves IN-PROCESS (gateway.route on the REAL repo for the model
scan/mounts/config, with ONLY the ledger root + artifact out_root
redirected into the fixture) while the TS server answers over HTTP
on the SAME fixture (MELITE_REPO_ROOT=<tmp>/tsroot whose entries
symlink the product tree except data/, MELITE_STATE_ROOT=<tmp>/
state). One shared fixture tmp keeps disk-path refusal texts
byte-equal. A wall NEVER boots a default-root TS (both sides get
fixture roots).

  - full CRUD lifecycle (201 sequencing user-1/user-2, ledger file
    bytes incl. sort_keys/indent/trailing-newline, float
    normalization 1.00->1.0, no *.tmp leftovers, delete rewrite +
    second-delete 404, delete-on-fresh creates nothing);
  - validation refusals (the full pydantic-2.13 union/coherence/
    lax-coercion taxonomy, byte-pinned — truncation, tuple locs,
    branch tags, first-error footer);
  - traversal/hostile-tenant matrix (.. tenants, encoded dots/
    slashes, case/underscore tenants, ".." preset ids, quote
    escaping via %r);
  - auth parity (token OFF then ON with a TS reboot: 401 shapes,
    wrong token, query token refused, bearer 200s incl. bytes,
    /v1/health exempt);
  - estate freshness re-derivation per run (tenant winners +
    base_body folders + pydantic MAJOR.MINOR + filename literal —
    fails LOUD on drift; the dual legs already fail on any served
    snapshot drift).
  - the serve-side AnnyBakeParams belt (valid canonicals ride;
    a hand-corrupt ledger params_json 500s byte-identical;
    corrupt-JSON variants pin by SHAPE — CPython texts);
  - save promotion (mesh-only stays file; valid estimated params
    promote; corrupt/dims/dialect/missing-dialect/null/int/
    list-doc params refuse — host-JSON texts shape-pinned).

Status-split traps pinned: the same PresetLedgerError is a 500 on
list but a 400 on save/delete; save success is 201; the body "id"
is dropped (sentinel user-pending); 3d/img_to_mesh +
image/mask_studio fail the tenant regex AFTER the estate hit
(list 500, save/delete 400).

Reachable-scope note: the base-body "not provisioned" miss and
the "not a declared provision" guard are unreachable on the
pinned estate (every declared base body ships; the metaclass
refuses undeclared ones at import) — implemented in TS, unwalled
live. OSError/UTF-8/corrupt-JSON host texts pin by SHAPE
(status + stable prefix), never bytes.

Run: python3 tests/walls/suites/test_gateway_studios_parity.py
"""

import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from _anchor import REPO, reap_gateway  # noqa: F401  (reap unused; kept for symmetry)

sys.dont_write_bytecode = True
sys.path.insert(0, str(REPO / "python"))

PASS = FAIL = 0
TOKEN = "wall-studios-token-%d" % os.getpid()

TS_SERVER = REPO / "packages" / "gateway" / "src" / "server.ts"
TS_STUDIOS = REPO / "packages" / "gateway" / "src" / "doors" / "studios.ts"


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def http(port: int, path: str, method: str = "GET",
         body: bytes | None = None,
         headers: dict | None = None) -> tuple[int | None, bytes, dict]:
    """Raw bytes + lowercased headers (no JSON parse — byte-equality)."""
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), method=method,
        data=body, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return (r.status, r.read(),
                    {k.lower(): v for k, v in r.headers.items()})
    except urllib.error.HTTPError as e:
        return (e.code, e.read(),
                {k.lower(): v for k, v in e.headers.items()})
    except Exception as e:
        return (None, b"", {"transport": str(e)})


# ---------------------------------------------------------------------------
# py in-process serving (mirrors _adapt: auth gate, route(), the 500
# envelope, indent=2 serialization, tuple passthrough).
# ---------------------------------------------------------------------------

import gateway as gw  # noqa: E402
import melite_models as mm  # noqa: E402
import melite_models.presets as mmp  # noqa: E402
import artifact_refs as ar  # noqa: E402

GW = gw.Gateway()


def py_serve(decoded_target: str, method: str = "GET",
             body: bytes = b"",
             headers: dict | None = None) -> tuple[int, bytes, dict]:
    """Serve one request through the real py handlers in-process.
    decoded_target is the starlette-decoded target (path + ?query);
    the wall passes the encoded wire form to TS separately."""
    headers = {k.lower(): v for k, v in (headers or {}).items()}
    path = decoded_target.split("?")[0]
    if not gw._auth_ok(path, headers.get("authorization", ""), ""):
        import json as _j
        return (401, _j.dumps({
            "error": "unauthorized: missing or invalid bearer token "
                     "(Authorization: Bearer <token>; set %s to "
                     "enable)" % gw.AUTH_TOKEN_ENV}, indent=2).encode(),
                {"content-type": "application/json"})
    try:
        status, payload = asyncio.run(
            gw.route(GW, method, decoded_target, body, headers=headers))
    except Exception as exc:
        import traceback as _tb
        return (500, json.dumps(
            {"error": str(exc), "type": type(exc).__name__,
             "traceback": _tb.format_exc(),
             "route": "%s %s" % (method, decoded_target)},
            indent=2, default=str).encode(),
            {"content-type": "application/json"})
    if isinstance(payload, tuple) and len(payload) == 3:
        _, resp_headers, raw = payload
        ct = dict(resp_headers).pop("content-type",
                                    "application/octet-stream")
        return (status, bytes(raw), {"content-type": ct})
    return (status, json.dumps(payload, indent=2).encode(),
            {"content-type": "application/json"})


def dual(decoded: str, wire: str, name: str, method: str = "GET",
         body: bytes = b"", headers: dict | None = None,
         ts_port: int = 0) -> None:
    """One dual-served shape: status + body bytes + content-type."""
    ps, pb, ph = py_serve(decoded, method, body, headers)
    ts, tb, th = http(ts_port, wire, method, body, headers)
    if ps is None or ts is None:
        check(name, False, "transport py=%r ts=%r" % (pb[:80], tb[:80]))
        return
    ok = (ps == ts and pb == tb
          and ph.get("content-type") == th.get("content-type"))
    note = ""
    if not ok:
        note = ("status %r/%r py %dB ts %dB pct %r/%r"
                % (ts, ps, len(pb), len(tb),
                   ph.get("content-type"), th.get("content-type")))
        for i, (a, b) in enumerate(zip(pb, tb)):
            if a != b:
                note += " first-div @%d py=%r ts=%r" % (i, pb[i:i+60], tb[i:i+60])
                break
        else:
            if len(pb) != len(tb):
                note += " len-div"
    check(name, ok, note)


def dual_same(target: str, name: str, method: str = "GET",
              body: bytes = b"", headers: dict | None = None,
              ts_port: int = 0) -> None:
    """dual() for legs without escapes (decoded == wire)."""
    dual(target, target, name, method, body, headers, ts_port)


# ---------------------------------------------------------------------------
# Mutation record/replay: write legs CANNOT byte-dual back-to-back on
# one shared ledger (py would take user-N, TS user-N+1). The mutation
# sequence runs TWICE — once per side, each from a wiped ledger —
# with absolute id asserts, and every response + the final ledger
# bytes are compared across runs.
# ---------------------------------------------------------------------------

VIA = "both"
RECORD: list | None = None


def serve(target: str, method: str = "GET", body: bytes = b"",
          headers: dict | None = None, ts_port: int = 0,
          name: str = "") -> tuple[int | None, bytes]:
    if VIA in ("both", "python"):
        s, b, _ = py_serve(target, method, body, headers)
    else:
        s, b, _ = http(ts_port, target, method, body, headers)
    if RECORD is not None:
        RECORD.append((name, s, b))
    return s, b


def expect(target: str, name: str, method: str = "GET",
           body: bytes = b"", headers: dict | None = None,
           ts_port: int = 0, status: int = 0,
           want_id: str | None = None) -> bytes:
    """One mutation leg: absolute status (+id) asserts, recorded."""
    s, b = serve(target, method, body, headers, ts_port, name)
    ok = (s == status)
    if ok and want_id is not None:
        try:
            ok = json.loads(b)["preset"]["id"] == want_id
        except (KeyError, ValueError):
            ok = False
    check("%s [%s]" % (name, VIA), ok,
          "status %r want %r body=%r" % (s, status, b[:100]))
    return b


def shape(decoded: str, wire: str, name: str, method: str = "GET",
          body: bytes = b"", headers: dict | None = None,
          ts_port: int = 0, status: int = 0,
          prefixes: tuple = ()) -> None:
    """Shape parity for host-text legs (status + stable prefixes)."""
    ps, pb, _ = py_serve(decoded, method, body, headers)
    ts, tb, _ = http(ts_port, wire, method, body, headers)
    ok = (ps == ts == status
          and all(p in pb.decode("utf-8", "replace") for p in prefixes)
          and all(p in tb.decode("utf-8", "replace") for p in prefixes))
    check(name, ok,
          "status %r/%r want %r pb=%r tb=%r"
          % (ts, ps, status, pb[:120], tb[:120]))


def boot_ts(env: dict) -> tuple[int, "subprocess.Popen[str]"]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    assert env.get("MELITE_STATE_ROOT"), \
        "never boot a default-root TS (live production py holds that lock)"
    assert env.get("MELITE_REPO_ROOT"), \
        "studios TS must boot on the fixture repo root (never the live data/)"
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


# ---------------------------------------------------------------------------
# Fixture: ONE shared tmp (uploads-wall precedent — no copy-trees).
# ---------------------------------------------------------------------------

class Fx:
    base: Path
    tsroot: Path
    data: Path
    state: Path
    out: Path
    orig_ledger_path = None
    orig_out_root = None


def build_fixture() -> Fx:
    fx = Fx()
    fx.base = Path(tempfile.mkdtemp(prefix="wall-studios-"))
    fx.tsroot = fx.base / "tsroot"
    fx.tsroot.mkdir()
    for entry in os.listdir(REPO):
        if entry == "data":
            continue
        src = Path(REPO) / entry
        try:
            (fx.tsroot / entry).symlink_to(src, target_is_directory=src.is_dir())
        except FileExistsError:
            pass
    fx.data = fx.tsroot / "data"
    fx.data.mkdir()
    fx.state = fx.base / "state"
    fx.out = fx.state / "output"
    fx.out.mkdir(parents=True)

    # py anchors: the ledger root wrapper (patched on the
    # melite_models.presets SUBMODULE — the ledger functions'
    # globals live there, not on the package attribute) + the
    # artifact out_root kwdefault (import-equivalent —
    # keyword-only, like the live binding).
    fx.orig_ledger_path = mmp.tenant_ledger_path

    def _wrapped(data_root: str, tenant: str) -> str:
        if os.path.realpath(data_root) == os.path.realpath(str(REPO / "data")) \
                or data_root == str(REPO / "data"):
            data_root = str(fx.data)
        return fx.orig_ledger_path(data_root, tenant)

    mmp.tenant_ledger_path = _wrapped
    fx.orig_out_root = ar.resolve_artifact_file.__kwdefaults__
    ar.resolve_artifact_file.__kwdefaults__ = {"out_root": str(fx.out)}

    # fixture runs (promotion corpus + resolvable refs)
    def run(run_id: str, files: dict) -> Path:
        d = fx.out / run_id
        d.mkdir(parents=True, exist_ok=True)
        for name, content in files.items():
            mode = "wb" if isinstance(content, bytes) else "w"
            with open(d / name, mode) as f:
                f.write(content)
        return d

    run("run9", {"mesh.glb": b"GLB" * 8})
    run("run-mesh-only", {"mesh.glb": b"GLB" * 8})
    ph6 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    sc139 = [round(0.01 * i, 4) for i in range(139)]

    def est_doc(ph=ph6, sc=sc139, dialect="estimated", extra=""):
        d = {"dialect": dialect, "phenotype": ph, "scale": sc}
        return json.dumps(d)[:-1] + extra + "}"

    run("run-valid", {"mesh.glb": b"GLB" * 8,
                      "anny_preset.json": est_doc()})
    run("run-corrupt", {"mesh.glb": b"GLB" * 8,
                        "anny_preset.json": '{"dialect": "estim'})
    run("run-dims", {"mesh.glb": b"GLB" * 8,
                     "anny_preset.json": est_doc(sc=[0.2] * 5)})
    run("run-dialect", {"mesh.glb": b"GLB" * 8,
                        "anny_preset.json": est_doc(dialect="authored")})
    run("run-nodialect", {"mesh.glb": b"GLB" * 8,
                          "anny_preset.json": json.dumps(
                              {"phenotype": ph6, "scale": sc139})})
    run("run-null-ph", {"mesh.glb": b"GLB" * 8,
                        "anny_preset.json": json.dumps(
                            {"dialect": "estimated", "phenotype": None,
                             "scale": sc139})})
    run("run-int-ph", {"mesh.glb": b"GLB" * 8,
                       "anny_preset.json": json.dumps(
                           {"dialect": "estimated", "phenotype": 5,
                            "scale": sc139})})
    run("run-listdoc", {"mesh.glb": b"GLB" * 8,
                        "anny_preset.json": "[1, 2]"})
    run("run-short-ph", {"mesh.glb": b"GLB" * 8,
                         "anny_preset.json": json.dumps(
                             {"dialect": "estimated",
                              "phenotype": [0.1] * 6,
                              "scale": [0.2] * 5})})
    return fx


def teardown_fixture(fx: Fx) -> None:
    mmp.tenant_ledger_path = fx.orig_ledger_path
    ar.resolve_artifact_file.__kwdefaults__ = fx.orig_out_root
    shutil.rmtree(str(fx.base), ignore_errors=True)


def tenant_dir(fx: Fx, tenant: str) -> Path:
    d = fx.data / "tenants" / tenant
    d.mkdir(parents=True, exist_ok=True)
    return d


def write_ledger(fx: Fx, tenant: str, text: str) -> None:
    tenant_dir(fx, tenant)
    (fx.data / "tenants" / tenant / "presets.json").write_text(text)


def ledger_bytes(fx: Fx, tenant: str) -> bytes | None:
    p = fx.data / "tenants" / tenant / "presets.json"
    return p.read_bytes() if p.is_file() else None


# ---------------------------------------------------------------------------
# Freshness: re-derive every estate table per run, fail LOUD on drift.
# ---------------------------------------------------------------------------

def freshness() -> None:
    import pydantic
    mm_version = pydantic.VERSION.split(".")
    src = TS_STUDIOS.read_text(encoding="utf-8")
    check("pydantic major.minor pinned (footer law)",
          mm_version[0] == "2" and mm_version[1] == "13"
          and 'PYDANTIC_MM = "2.13"' in src,
          "installed %s" % pydantic.VERSION)
    from melite_models import scan_engine_models
    scan = scan_engine_models(str(REPO))
    live_tenants: dict = {}
    for _mpath, cls in scan.values():
        studio = getattr(cls, "studio", None)
        t = getattr(studio, "tenant", "") if studio is not None else ""
        if t and t not in live_tenants:
            live_tenants[t] = gw._studio_family(t)
    import re
    snap = {m[0]: m[1:] for m in re.findall(
        r'"([^"]+)": \{ id: "([^"]*)", engine: "([^"]*)", '
        r'baseBody: "([^"]*)", baseBodyFolder: "([^"]*)" \}', src)}
    ok = sorted(snap.keys()) == sorted(live_tenants.keys())
    note = ""
    if not ok:
        note = "snap=%r live=%r" % (sorted(snap.keys()),
                                    sorted(live_tenants.keys()))
    else:
        for t, cls in live_tenants.items():
            bb = getattr(cls, "base_body", "") or ""
            folder = ""
            if bb:
                for p in (getattr(cls, "provisions", None) or ()):
                    if p.name == bb:
                        folder = p.folder or ""
                        break
            want = (cls.id, getattr(cls, "engine", "") or "", bb, folder)
            got = (snap[t][0], snap[t][1], snap[t][2], snap[t][3])
            if want != got:
                ok = False
                note = "%s want=%r got=%r" % (t, want, got)
                break
    check("estate winners re-derived (tenant/engine/base/folder)", ok, note)
    rows = gw._preset_estate_rows("3d/anny") or ()
    check("estate rows live (8 anny archetypes)", len(rows) == 8,
          "got %d" % len(rows))
    from melite_models import PRESET_PARAMS_FILENAME
    check("params filename literal == constant",
          PRESET_PARAMS_FILENAME == "anny_preset.json"
          and "anny_preset.json" in src)


# ---------------------------------------------------------------------------
# Legs.
# ---------------------------------------------------------------------------

PH11 = [0.5] * 11
EST6 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]


def J(obj) -> bytes:
    return json.dumps(obj).encode()


def save_body(**kw) -> bytes:
    return J(kw)


def list_legs(ts: int) -> None:
    dual_same("/v1/studios/3d/anny/presets", "list anny (estate 8)",
              ts_port=ts)
    for tenant in ("3d/body", "3d/img_to_mesh", "image/canvas-ideogram",
                   "image/mask_studio", "motion/motion-studio",
                   "video/h3-timeline"):
        dual_same("/v1/studios/%s/presets" % tenant,
                  "list %s" % tenant, ts_port=ts)
    dual_same("/v1/studios/nope/nope/presets", "list unknown tenant",
              ts_port=ts)
    dual_same("/v1/studios/3D/ANNY/presets", "list uppercase tenant",
              ts_port=ts)
    dual_same("/v1/studios/3d/anny/presets/", "list trailing slash",
              ts_port=ts)
    dual_same("/v1/studios/3d/anny/presets?x=1", "list query strip",
              ts_port=ts)
    dual_same("/v1/studios/3d/anny/presets", "list PUT 404", "PUT",
              ts_port=ts)
    dual_same("/v1/studios/3d/anny/presets", "list DELETE-no-id 404",
              "DELETE", ts_port=ts)
    # hostile tenants (encoded wire -> decoded route; both refuse
    # BEFORE any ledger touch — byte-equal unknown-tenant 404s)
    dual("/v1/studios/../../presets", "/v1/studios/../../presets",
         "list dotdot tenant", ts_port=ts)
    dual("/v1/studios/../../presets", "/v1/studios/%2e%2e/%2e%2e/presets",
         "list encoded-dot tenant", ts_port=ts)
    dual("/v1/studios/3d/anny/presets", "/v1/studios/3d%2fanny/presets",
         "list encoded-slash decodes to route", ts_port=ts)
    dual_same("/v1/studios/3d/an'ny/presets", "list quote tenant",
              ts_port=ts)
    # estate-served floats + escapes pinned, not merely equal
    _, pb, _ = py_serve("/v1/studios/3d/anny/presets")
    _, tb, _ = http(ts, "/v1/studios/3d/anny/presets")
    doc = json.loads(pb)
    check("list estate count + tenant echo",
          doc["tenant"] == "3d/anny" and len(doc["presets"]) == 8
          and [p["id"] for p in doc["presets"]] ==
          ["neutral", "adult_female", "adult_male", "child",
           "child_female", "teen", "hero", "elderly"])
    check("list ensure_ascii escapes",
          "\\u2014" in pb.decode() and "\\u2014" in tb.decode()
          and "\u2014" not in pb.decode())
    check("list params_json authored-canonical",
          b'"params_json": "{\\"dialect\\":\\"authored\\"' in pb
          and b'"params_json": "{\\"dialect\\":\\"authored\\"' in tb)
    check("list code absent on 200",
          b'"code"' not in pb and b'"code"' not in tb)


def base_body_legs(ts: int) -> None:
    dual_same("/v1/studios/3d/anny/base-body", "base-body anny (bytes)",
              ts_port=ts)
    ps, pb, ph = py_serve("/v1/studios/3d/anny/base-body")
    ts_, tb, th = http(ts, "/v1/studios/3d/anny/base-body")
    # the mount resolves through the real repo (endpoint +
    # model_paths) — ask py itself, never hardcode the weights path
    cls = gw._family_by_id("anny")
    disk = None
    for p in (getattr(cls, "provisions", None) or ()):
        if p.name == getattr(cls, "base_body", ""):
            disk = gw._provision_mount(cls, p)[0]
    assert disk is not None
    real = Path(disk).read_bytes()
    check("base-body bytes == disk file",
          pb == tb == real and len(real) > 0,
          "py %dB ts %dB disk %dB" % (len(pb), len(tb), len(real)))
    check("base-body content-type",
          ph.get("content-type") == th.get("content-type") ==
          "model/gltf-binary")
    for tenant, fam in (("3d/body", "somax"),
                        ("motion/motion-studio", "kimodo"),
                        ("3d/img_to_mesh", "pixal3d"),
                        ("image/canvas-ideogram", "ideogram"),
                        ("image/mask_studio", "mask-studio"),
                        ("video/h3-timeline", "h3-timeline")):
        dual_same("/v1/studios/%s/base-body" % tenant,
                  "base-body %s (no base)" % fam, ts_port=ts)
    # NOTE: 3d/img_to_mesh + image/mask_studio never reach the
    # tenant-regex ledger path here — the winner lookup fires
    # first (pins the ordering).
    dual_same("/v1/studios/nope/nope/base-body",
              "base-body unknown tenant", ts_port=ts)
    dual("/v1/studios/../../base-body", "/v1/studios/%2e%2e/%2e%2e/base-body",
         "base-body encoded-dot tenant", ts_port=ts)
    dual_same("/v1/studios/3d/anny/base-body/", "base-body slash",
              ts_port=ts)
    dual_same("/v1/studios/3d/anny/base-body?x=1", "base-body query",
              ts_port=ts)
    dual_same("/v1/studios/3d/anny/base-body", "base-body POST 404",
              "POST", ts_port=ts)


# __WALL_PART3__

def save_refusal_legs(ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"

    def S(body, name, method="POST"):
        dual_same(P, name, method, body, ts_port=ts)

    # bad-JSON host texts (CPython vs V8) — shape parity only
    # (status + bad_json code); the byte-dual would pin engine text.
    ps, pb, _ = py_serve(P, "POST", b"{bad")
    _, tb, _ = http(ts, P, "POST", b"{bad")
    check("save bad JSON shape",
          ps == 400 and b'"code": "bad_json"' in pb
          and b'"code": "bad_json"' in tb
          and b"bad JSON:" in pb and b"bad JSON:" in tb)
    S(b"", "save empty body (missing label+origin)")
    S(J([]), "save array body (treated as {})")
    S(save_body(label="L"), "save missing origin")
    S(save_body(origin="file"), "save missing label")
    S(save_body(label="", origin="file"), "save empty label")
    S(save_body(label="L", origin="nope"), "save bad origin")
    S(save_body(label="L", origin="file", zzz=1), "save extra key")
    # (body-id + lax-coercion 201s live in the mutation sequence —
    # back-to-back duals cannot share one ledger)
    S(save_body(label="L", origin="base_params", params="nope"),
      "save params str (union)")
    S(save_body(label="L", origin="base_params", params=5),
      "save params int (union)")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": [0.5, 0.5]}),
      "save phenotype 2-elem (tuple locs)")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": [0.5] * 10}),
      "save authored-bad-dims (union text)")
    S(save_body(label="L", origin="estimated",
                params={"phenotype": EST6, "scale": [0.2] * 5},
                params_ref="/v1/assets/runs/run9/mesh.glb"),
      "save est-bad-scale (union text)")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": PH11, "local_changes": {"a": 0.5}}),
      "save lc-obj (tuple_type + union)")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": PH11,
                        "local_changes": [{"name": "a", "value": 9}]}),
      "save lc-bad-val (less_than_equal + union)")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": PH11,
                        "local_changes": [{"name": "", "value": 0.5}]}),
      "save lc-bad-name (too_short + union)")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": PH11, "local_changes": [
                    {"name": "a", "value": 0.5},
                    {"name": "a", "value": 0.1}]}),
      "save dup-morph")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": [2.0] + [0.5] * 10}),
      "save ph-range")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": PH11, "scale": [0.1] * 6}),
      "save authored-with-scale (extra + union)")
    # refs (params_ref checked BEFORE body_ref — first dangling wins)
    S(save_body(label="L", origin="file", body_ref="../x"),
      "save body traversal")
    S(save_body(label="L", origin="file",
                body_ref="/v1/assets/runs/norun/mesh.glb"),
      "save dangling run body")
    S(save_body(label="L", origin="file", body_ref="mesh.glb"),
      "save bare body refusal (long form)")
    S(save_body(label="L", origin="file",
                body_ref="/v1/assets/runs//etc/passwd"),
      "save escapes-output-root URL")
    S(save_body(label="L", origin="file",
                body_ref="/v1/assets/runs/run9"),
      "save malformed artifact URL")
    S(save_body(label="L", origin="estimated",
                params={"phenotype": EST6, "scale": [0.2] * 139},
                params_ref="/v1/assets/runs/norun/mesh.glb",
                body_ref="/v1/assets/runs/norun2/mesh.glb"),
      "save params_ref reported before body_ref")
    S(save_body(label="L", origin="file", parts={"hair": 42}),
      "save parts.hair int")
    S(save_body(label="L", origin="file",
                parts={"hair": "/v1/assets/runs/norun/hair.glb"}),
      "save parts.hair dangling")
    S(save_body(label="L", origin="file", parts={"outfit": "nope.glb"}),
      "save parts.outfit dangling")
    S(save_body(label="L", origin="file",
                knobs={"resolution": "x"}), "save knobs int_parsing")
    S(save_body(label="L", origin="file", knobs={"samples": 2.5}),
      "save knobs int_from_float")
    S(save_body(label="L", origin="file",
                knobs={"focal_length": "x"}),
      "save knobs float_parsing")
    S(save_body(label="L", origin="file",
                knobs={"transparent": "maybe"}),
      "save knobs bool_parsing")
    S(save_body(label="L", origin="file", knobs={"zzz": 1}),
      "save knobs extra")
    # (knobs-lax + int-phenotype 201s live in the mutation sequence)
    # coherence (union passes, branch/dialect checks fire)
    S(save_body(label="L", origin="estimated",
                params={"phenotype": PH11},
                params_ref="/v1/assets/runs/run9/mesh.glb"),
      "save estimated-with-authored-params")
    S(save_body(label="L", origin="base_params",
                params={"phenotype": PH11},
                params_ref="/v1/assets/runs/run9/mesh.glb"),
      "save base_params-with-params_ref")
    S(save_body(label="L", origin="file",
                params_ref="/v1/assets/runs/run9/mesh.glb"),
      "save file-with-params_ref")
    S(save_body(label="L", origin="estimated",
                params_ref="/v1/assets/runs/run9/mesh.glb"),
      "save estimated params-None")
    S(save_body(label="L", origin="estimated", params=None,
                params_ref="/v1/assets/runs/run9/mesh.glb"),
      "save estimated params-null-explicit")
    S(save_body(label="L", origin="base_params", params=None),
      "save base params-None")
    S(save_body(label="L", origin="file",
                params={"phenotype": PH11}), "save file-with-params")


def lifecycle_legs(fx: Fx, ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"
    # ok-file (201, params None; the save door returns the bare
    # model_dump — NO params_json key)
    b = expect(P, "save ok-file", "POST",
               save_body(label="Meshy", origin="file"),
               ts_port=ts, status=201, want_id="user-1")
    doc = json.loads(b)
    check("save ok-file shape [%s]" % VIA,
          doc["tenant"] == "3d/anny" and doc["preset"]["params"] is None
          and "params_json" not in doc["preset"])
    # body id is dropped (sentinel, never stored)
    expect(P, "save body-id dropped", "POST",
           save_body(id="zzz", label="Nope", origin="file"),
           ts_port=ts, status=201, want_id="user-2")
    # float normalization through the ledger (1.00/True -> 1.0)
    b = expect(P, "save float normalization", "POST", save_body(
        label="Norm", origin="base_params",
        params={"phenotype": [1.00] * 11,
                "local_changes": [{"name": "a", "value": True}]}),
        ts_port=ts, status=201, want_id="user-3")
    check("save normalization bytes [%s]" % VIA,
          b"1.0" in b and b"1.00" not in b)
    # ledger file bytes (sort_keys/indent-2/trailing-newline)
    raw = ledger_bytes(fx, "3d/anny")
    assert raw is not None
    check("ledger trailing newline + sorted keys [%s]" % VIA,
          raw.endswith(b"\n") and raw.find(b'"body_ref"')
          < raw.find(b'"description"') < raw.find(b'"id"'))
    check("ledger no tmp leftovers [%s]" % VIA,
          list((fx.data / "tenants" / "3d" / "anny").glob("presets-*.tmp"))
          == [])
    # delete lifecycle
    b = expect("/v1/studios/3d/anny/presets/user-2", "delete user-2",
               "DELETE", ts_port=ts, status=200)
    check("delete shape [%s]" % VIA,
          json.loads(b) == {"tenant": "3d/anny", "deleted": "user-2"})
    expect("/v1/studios/3d/anny/presets/user-2",
           "delete user-2 again 404", "DELETE", ts_port=ts, status=404)
    expect("/v1/studios/3d/anny/presets/neutral",
           "delete estate id 400", "DELETE", ts_port=ts, status=400)
    expect("/v1/studios/3d/anny/presets/user-99",
           "delete missing 404", "DELETE", ts_port=ts, status=404)
    expect("/v1/studios/3d/anny/presets/..",
           "delete dotdot preset 404", "DELETE", ts_port=ts, status=404)
    s, b = serve("/v1/studios/3d/anny/presets/user-1/..", "DELETE",
                 ts_port=ts, name="delete encoded-slash preset")
    if VIA == "both":
        t, tb, _ = http(ts, "/v1/studios/3d/anny/presets/user-1%2f..",
                        "DELETE")
        check("delete encoded-slash preset (no route)",
              s == t == 404 and b == tb)
    else:
        check("delete encoded-slash preset (no route) [%s]" % VIA, s == 404)
    expect("/v1/studios/3d/body/presets/user-1",
           "delete fresh tenant 404 (no file)", "DELETE",
           ts_port=ts, status=404)
    check("delete fresh tenant creates no file [%s]" % VIA,
          not (fx.data / "tenants" / "3d" / "body"
               / "presets.json").exists())
    # list now serves user-1 + user-3 only
    s, b = serve(P, ts_port=ts, name="list after delete")
    check("list after delete [%s]" % VIA,
          s == 200 and [p["id"] for p in json.loads(b)["presets"]]
          == ["neutral", "adult_female", "adult_male", "child",
              "child_female", "teen", "hero", "elderly",
              "user-1", "user-3"])


def promotion_legs(fx: Fx, ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"

    def post(tag: str, uid: str, **kw) -> None:
        body = {"label": "P", "origin": "file"}
        body.update(kw)
        b = expect(P, "promote " + tag, "POST", J(body),
                   ts_port=ts, status=201, want_id=uid)
        if kw.get("origin", "file") == "file" and \
                "params_ref" not in kw:
            check("promote %s stays file [%s]" % (tag, VIA),
                  json.loads(b)["preset"]["origin"] == "file")

    post("mesh-only stays file", "user-4",
         body_ref="/v1/assets/runs/run-mesh-only/mesh.glb")
    post("runs-relative body resolves (stays file)", "user-5",
         body_ref="run9/mesh.glb")
    post("absolute body resolves (stays file)", "user-6",
         body_ref=str(fx.out / "run9" / "mesh.glb"))
    b = expect(P, "promote valid", "POST", J(
        {"label": "P", "origin": "file",
         "body_ref": "/v1/assets/runs/run-valid/mesh.glb"}),
        ts_port=ts, status=201, want_id="user-7")
    doc = json.loads(b)
    pr = doc["preset"]
    check("promote valid shape [%s]" % VIA,
          pr["origin"] == "estimated"
          and pr["params_ref"] ==
          "/v1/assets/runs/run-valid/anny_preset.json"
          and "params_json" not in pr)
    # the promotion lands in the ledger — the LIST serve path
    # attaches the estimated-canonical params_json
    s, b = serve(P, ts_port=ts, name="promote valid list")
    rows = {p["id"]: p for p in json.loads(b)["presets"]}
    check("promote valid list + params_json [%s]" % VIA,
          s == 200 and rows["user-7"]["origin"] == "estimated"
          and rows["user-7"]["params_ref"]
          == "/v1/assets/runs/run-valid/anny_preset.json"
          and rows["user-7"]["params_json"].startswith(
              '{"dialect":"estimated"'))
    # promotion refusals (400s — dual-safe, no state change)
    if VIA == "both":
        def post400(tag: str, **kw) -> None:
            body = {"label": "P", "origin": "file"}
            body.update(kw)
            dual_same(P, "promote " + tag, "POST", J(body),
                      ts_port=ts)

        post400("dims refusal",
                body_ref="/v1/assets/runs/run-dims/mesh.glb")
        post400("dialect refusal",
                body_ref="/v1/assets/runs/run-dialect/mesh.glb")
        post400("missing-dialect refusal",
                body_ref="/v1/assets/runs/run-nodialect/mesh.glb")
        post400("null-phenotype refusal",
                body_ref="/v1/assets/runs/run-null-ph/mesh.glb")
        post400("int-phenotype refusal",
                body_ref="/v1/assets/runs/run-int-ph/mesh.glb")
        post400("short-scale refusal",
                body_ref="/v1/assets/runs/run-short-ph/mesh.glb")
        # host-JSON texts (CPython vs V8) — shape parity only
        shape(P, P, "promote corrupt params (shape)", "POST",
              J({"label": "P", "origin": "file",
                 "body_ref": "/v1/assets/runs/run-corrupt/mesh.glb"}),
              ts_port=ts, status=400,
              prefixes=("preset ledger: run delivered anny_preset.json but "
                        "it does not parse as estimated params (",))
        shape(P, P, "promote list-doc params (shape)", "POST",
              J({"label": "P", "origin": "file",
                 "body_ref": "/v1/assets/runs/run-listdoc/mesh.glb"}),
              ts_port=ts, status=400,
              prefixes=("preset ledger: run delivered anny_preset.json but "
                        "it does not parse as estimated params (",))


def coercion_201_legs(ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"
    expect(P, "save knobs lax coercions", "POST", save_body(
        label="L", origin="file",
        knobs={"resolution": 2048.0, "focal_length": 50,
               "samples": True, "transparent": "yes"}),
        ts_port=ts, status=201, want_id="user-8")
    expect(P, "save int-phenotype", "POST", save_body(
        label="L", origin="base_params",
        params={"phenotype": [1] * 11}),
        ts_port=ts, status=201, want_id="user-9")
    # direct estimated save (params + resolvable params_ref)
    b = expect(P, "save estimated direct", "POST", save_body(
        label="E", origin="estimated",
        params={"phenotype": EST6, "scale": [0.2] * 139},
        params_ref="run9/mesh.glb"),
        ts_port=ts, status=201, want_id="user-10")
    doc = json.loads(b)
    check("save estimated direct shape [%s]" % VIA,
          doc["preset"]["origin"] == "estimated"
          and doc["preset"]["params_ref"] == "run9/mesh.glb"
          and "params_json" not in doc["preset"])


def ledger_read_legs(fx: Fx, ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"
    row = {"id": "user-1", "label": "Seed", "description": "",
           "origin": "file", "params": None, "params_ref": None,
           "body_ref": None, "parts": {"hair": None, "outfit": None},
           "knobs": {"resolution": None, "framing": None,
                     "focal_length": None, "samples": None,
                     "transparent": None}}
    write_ledger(fx, "3d/anny", json.dumps({"presets": [row]}))
    dual_same(P, "list seeded user row", ts_port=ts)
    bad = dict(row)
    bad["id"] = "user-2"
    bad["label"] = ""
    write_ledger(fx, "3d/anny", json.dumps({"presets": [row, bad]}))
    dual_same(P, "list invalid row 500 (ValidationError text)",
              ts_port=ts)
    write_ledger(fx, "3d/anny", json.dumps({"presets": ["hello"]}))
    dual_same(P, "list non-dict row 500 (model_type)", ts_port=ts)
    write_ledger(fx, "3d/anny", json.dumps({"nope": []}))
    dual_same(P, "list no-presets-list 500", ts_port=ts)
    write_ledger(fx, "3d/anny", json.dumps({"presets": "[1, 2]"}))
    dual_same(P, "list non-list presets 500", ts_port=ts)
    write_ledger(fx, "3d/anny", "[1, 2]")
    dual_same(P, "list non-dict doc 500", ts_port=ts)
    write_ledger(fx, "3d/anny", "{bad")
    shape(P, P, "list corrupt ledger (shape)", ts_port=ts, status=500,
          prefixes=("preset ledger: preset ledger ", "unreadable"))
    # estate-shadow belt (hand-edited ledger must not replace an
    # archetype) + serve-side bake belt
    shadow = dict(row)
    shadow["id"] = "neutral"
    write_ledger(fx, "3d/anny", json.dumps({"presets": [shadow]}))
    dual_same(P, "list shadow belt 500", ts_port=ts)
    dual_same("/v1/studios/3d/anny/presets/neutral",
              "delete with corrupt ledger hits estate first 400",
              "DELETE", ts_port=ts)
    belt = dict(row)
    belt["id"] = "user-9"
    belt["origin"] = "base_params"
    belt["params"] = {"phenotype": [0.5] * 11, "local_changes": []}
    belt["params_json"] = "[1, 2]"
    write_ledger(fx, "3d/anny", json.dumps({"presets": [belt]}))
    dual_same(P, "list bake-belt 500 (params_json not an object)",
              ts_port=ts)
    belt["params_json"] = "{bad"
    write_ledger(fx, "3d/anny", json.dumps({"presets": [belt]}))
    # a stored params_json is an EXTRA key — the row-invalid
    # refusal fires first (both sides agree); the serve belt is
    # defensive-only (canonical_json output always validates).
    dual_same(P, "list stored-params_json 500 (extra_forbidden)",
              ts_port=ts)
    # append against a shadowed ledger refuses (no silent replace)
    dual_same(P, "save vs shadowed ledger 400", "POST",
              save_body(label="X", origin="file"), ts_port=ts)
    (fx.data / "tenants" / "3d" / "anny" / "presets.json").unlink()


def bad_tenant_legs(ts: int) -> None:
    # 3d/img_to_mesh + image/mask_studio pass the estate hit but
    # fail the tenant regex — the SAME ledger error is a 500 on
    # list, a 400 on save/delete (status-split trap).
    for tenant in ("3d/img_to_mesh", "image/mask_studio"):
        base = "/v1/studios/%s/presets" % tenant
        dual_same(base, "list bad-tenant-regex 500 (%s)" % tenant,
                  ts_port=ts)
        dual_same(base, "save bad-tenant-regex 400 (%s)" % tenant,
                  "POST", save_body(label="X", origin="file"),
                  ts_port=ts)
        dual_same(base + "/user-1",
                  "delete bad-tenant-regex 400 (%s)" % tenant,
                  "DELETE", ts_port=ts)


# __WALL_PART4__

def auth_legs(ts: int) -> None:
    bearer = {"Authorization": "Bearer " + TOKEN}
    wrong = {"Authorization": "Bearer wrong"}
    P = "/v1/studios/3d/anny/presets"
    B = "/v1/studios/3d/anny/base-body"
    for path in (P, B):
        dual_same(path, "auth 401 %s" % path, ts_port=ts)
        ps, pb, _ = py_serve(path)
        check("auth 401 shape %s" % path,
              ps == 401 and b"unauthorized" in pb
              and b"DSH_GATEWAY_TOKEN" in pb)
    dual_same(P, "auth 401 POST save", "POST",
              save_body(label="X", origin="file"), ts_port=ts)
    dual_same(P + "?token=" + TOKEN, "auth query token refused",
              ts_port=ts)
    ps, _, _ = py_serve(P + "?token=" + TOKEN)
    check("auth query token refused shape", ps == 401)
    dual_same(P, "auth wrong token", headers=wrong, ts_port=ts)
    ps, _, _ = py_serve(P, headers=wrong)
    check("auth wrong token shape", ps == 401)
    ps, pb, _ = py_serve(P, headers=bearer)
    ts_s, tb, _ = http(ts, P, headers=bearer)
    check("auth bearer 200 list", ps == ts_s == 200 and pb == tb)
    ps, pb, _ = py_serve(B, headers=bearer)
    ts_s, tb, _ = http(ts, B, headers=bearer)
    check("auth bearer 200 base-body", ps == ts_s == 200 and pb == tb)
    dual_same("/v1/health", "auth health exempt", ts_port=ts)


def wipe_ledger(fx: Fx) -> None:
    p = fx.data / "tenants" / "3d" / "anny" / "presets.json"
    if p.is_file():
        p.unlink()
    for tmp in (fx.data / "tenants" / "3d" / "anny").glob("presets-*.tmp"):
        tmp.unlink()


def mutation_sequence(fx: Fx, ts: int) -> bytes | None:
    lifecycle_legs(fx, ts)
    promotion_legs(fx, ts)
    coercion_201_legs(ts)
    return ledger_bytes(fx, "3d/anny")


def main() -> int:
    global VIA, RECORD
    fx = build_fixture()
    ts_proc = None
    try:
        freshness()
        ts_env = dict(os.environ)
        ts_env["MELITE_STATE_ROOT"] = str(fx.state)
        ts_env["MELITE_REPO_ROOT"] = str(fx.tsroot)
        ts_env.pop("DSH_GATEWAY_TOKEN", None)
        os.environ.pop("DSH_GATEWAY_TOKEN", None)
        ts_port, ts_proc = boot_ts(ts_env)
        print("py in-process vs ts :%d" % ts_port)

        # phase 1: stateless duals (no ledger mutation on either
        # side — safe back-to-back on the shared fixture)
        list_legs(ts_port)
        base_body_legs(ts_port)
        save_refusal_legs(ts_port)
        ledger_read_legs(fx, ts_port)
        bad_tenant_legs(ts_port)

        # phases 2+3: the mutation sequence runs TWICE — once per
        # side, each from a wiped ledger — with absolute id
        # asserts; every response + the final ledger bytes are
        # compared across runs.
        VIA = "py"
        RECORD = []
        wipe_ledger(fx)
        py_ledger = mutation_sequence(fx, ts_port)
        py_record = RECORD
        VIA = "ts"
        RECORD = []
        wipe_ledger(fx)
        ts_ledger = mutation_sequence(fx, ts_port)
        ts_record = RECORD
        VIA = "both"
        RECORD = None
        check("mutation responses identical across runs",
              py_record == ts_record,
              "py %d legs ts %d legs" % (len(py_record), len(ts_record)))
        if py_record != ts_record:
            for (n1, s1, b1), (n2, s2, b2) in zip(py_record, ts_record):
                if (n1, s1, b1) != (n2, s2, b2):
                    print("    div @%s py=(%r,%dB) ts=(%r,%dB)"
                          % (n1, s1, len(b1), s2, len(b2)))
                    break
        check("final ledger bytes identical across runs",
              py_ledger == ts_ledger and py_ledger is not None)
        wipe_ledger(fx)

        # auth gate (token ON: py reads env per call; TS reboots)
        os.environ["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_proc.terminate()
        try:
            ts_proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            ts_proc.kill()
        ts_proc = None
        ts_env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_ts(ts_env)
        print("auth ts :%d" % ts_port)
        auth_legs(ts_port)
        os.environ["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_proc.terminate()
        try:
            ts_proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            ts_proc.kill()
        ts_proc = None
        ts_env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_ts(ts_env)
        print("auth ts :%d" % ts_port)
        auth_legs(ts_port)
    finally:
        os.environ.pop("DSH_GATEWAY_TOKEN", None)
        if ts_proc is not None:
            ts_proc.terminate()
            try:
                ts_proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                ts_proc.kill()
        teardown_fixture(fx)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())


