#!/usr/bin/env python3
"""PIPELINE YAML CRUD SUITE (2026-09-01) — the template catalog contract.

Backs the DSH Media panel's Templates tab: list / detail / save / rename /
delete on the gateway's /v1/pipelines/yaml/* routes. Completes the catalog
that previously had read-only coverage (list/detail) with the write side.

Checks:

  P1  gateway boots, /v1/health 200
  P2  yaml/list 200 + fixture pipeline present
  P3  yaml/detail 200 + steps parse (family/title/params)
  P4  yaml/save 201 + name round-trips EXACTLY (the use-after-free
      mojibake regression — disp pointed into the freed cJSON tree)
  P5  yaml/list includes the saved pipeline
  P6  yaml/detail of the saved pipeline: steps + params survive
  P7  yaml/rename 200 + old name gone, new name present
  P8  yaml/delete 200 + list back to fixture count
  P9  save with path-traversal filename rejected 400
  P10 save with empty steps rejected 400
  P11 delete of nonexistent pipeline 404
  P12 save overwrite: 409 without flag, 200 with overwrite:true

Scratch server + scratch pipelines dir (cwd=<tmp>/build so ../pipelines
is the fixture dir). The REAL repo pipelines/ is never touched.
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

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
BUILD = os.path.join(REPO, "build")

n_pass = [0]
failures = []


def check(name, ok, detail=""):
    if ok:
        n_pass[0] += 1
        print(f"  PASS  {name}")
    else:
        failures.append(name)
        print(f"  FAIL  {name} {detail}")


def req(base, method, path, body=None, timeout=8):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(base + path, data=data, method=method)
    if data:
        r.add_header("content-type", "application/json")
    try:
        resp = urllib.request.urlopen(r, timeout=timeout)
        return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except OSError as e:
        return -1, str(e).encode()


def jbody(raw):
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {}


def main():
    if not os.path.isfile(os.path.join(BUILD, "inference_cli")):
        print("no build/inference_cli; run cmake --build build first")
        return 1

    # ── scratch world: <tmp>/build (cwd) + <tmp>/pipelines (fixture) ──
    tmp = tempfile.mkdtemp(prefix="pipecrud_")
    scratch_build = os.path.join(tmp, "build")
    scratch_pipes = os.path.join(tmp, "pipelines")
    os.makedirs(scratch_build)
    os.makedirs(os.path.join(scratch_pipes, "fixture-flow"))
    with open(os.path.join(scratch_pipes, "fixture-flow", "pipeline.yaml"), "w") as f:
        f.write(
            "api: true\n"
            "name: fixture-flow\n"
            "steps:\n"
            "  - id: gen\n"
            "    type: image-gen\n"
            '    params: {"prompt": "fixture"}\n'
        )

    port = 18711
    base = f"http://127.0.0.1:{port}"
    log = tempfile.NamedTemporaryFile(delete=False, suffix=".log")

    uscfg = os.path.join(tmp, "endpoint.json")
    with open(uscfg, "w") as f:
        json.dump({"url": "http://127.0.0.1:9"}, f)  # dead ComfyUI: no live contact

    env = dict(os.environ)
    env["COMFYUI_ENDPOINT_CONFIG"] = uscfg
    env["INFERENCE_TEST_SANDBOX"] = "1"

    proc = subprocess.Popen(
        [os.path.join(BUILD, "inference_cli"), "serve", "--port", str(port),
         "--catalog-dir", REPO, "--plugin-dir", BUILD],
        cwd=scratch_build, stdout=log, stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL, start_new_session=True, env=env)

    try:
        # ── P1: boot ──────────────────────────────────────────────────
        deadline = time.time() + 20
        code = -1
        while time.time() < deadline:
            code, _ = req(base, "GET", "/v1/health", timeout=2)
            if code == 200:
                break
            time.sleep(0.4)
        check("P1 gateway boots, /v1/health 200", code == 200, f"code={code}")
        if code != 200:
            return 1

        # ── P2: list has the fixture ─────────────────────────────────
        code, raw = req(base, "GET", "/v1/pipelines/yaml/list")
        listed = [p.get("name") for p in jbody(raw).get("pipelines", [])]
        check("P2 yaml/list 200 + fixture present",
              code == 200 and "fixture-flow" in listed,
              f"code={code} listed={listed}")

        # ── P3: detail parses steps ───────────────────────────────────
        code, raw = req(base, "GET", "/v1/pipelines/yaml/detail?yaml=fixture-flow.yaml")
        d = jbody(raw)
        steps = d.get("steps", [])
        ok = code == 200 and len(steps) == 1 and steps[0].get("family") == "image-gen"
        check("P3 yaml/detail steps parse", ok, f"code={code} steps={steps}")

        # ── P4: save + exact name round-trip (mojibake regression) ────
        code, raw = req(base, "POST", "/v1/pipelines/yaml/save", {
            "filename": "p4-flow",
            "name": "P4 Test Pipeline",
            "steps": [{"id": "gen", "type": "image-gen",
                       "params": {"prompt": "a cat"}}],
        })
        d = jbody(raw)
        check("P4 yaml/save 201 + name round-trips exactly",
              code == 201 and d.get("name") == "P4 Test Pipeline",
              f"code={code} name={d.get('name')!r}")

        # ── P5: list includes the saved pipeline ──────────────────────
        code, raw = req(base, "GET", "/v1/pipelines/yaml/list")
        listed = [p.get("name") for p in jbody(raw).get("pipelines", [])]
        check("P5 saved pipeline listed",
              code == 200 and "p4-flow" in listed,
              f"code={code} listed={listed}")

        # ── P6: detail of the saved pipeline ──────────────────────────
        code, raw = req(base, "GET", "/v1/pipelines/yaml/detail?yaml=p4-flow.yaml")
        d = jbody(raw)
        steps = d.get("steps", [])
        params = steps[0].get("params", []) if steps else []
        pm = {p.get("name"): p.get("value") for p in params if isinstance(p, dict)}
        check("P6 saved detail: steps + params survive",
              code == 200 and len(steps) == 1 and pm.get("prompt") == "a cat",
              f"code={code} params={pm}")

        # ── P7: rename ────────────────────────────────────────────────
        code, raw = req(base, "POST", "/v1/pipelines/yaml/rename",
                        {"filename": "p4-flow", "newName": "p4-moved"})
        code2, raw2 = req(base, "GET", "/v1/pipelines/yaml/list")
        listed = [p.get("name") for p in jbody(raw2).get("pipelines", [])]
        check("P7 yaml/rename moves it",
              code == 200 and "p4-moved" in listed and "p4-flow" not in listed,
              f"code={code} listed={listed}")

        # ── P8: delete + list back to fixture count ───────────────────
        code, _ = req(base, "DELETE", "/v1/pipelines/yaml/delete?filename=p4-moved.yaml")
        code2, raw2 = req(base, "GET", "/v1/pipelines/yaml/list")
        listed = [p.get("name") for p in jbody(raw2).get("pipelines", [])]
        check("P8 yaml/delete 200 + cleanup",
              code == 200 and listed == ["fixture-flow"],
              f"code={code} listed={listed}")

        # ── P9: traversal filename rejected ───────────────────────────
        code, _ = req(base, "POST", "/v1/pipelines/yaml/save", {
            "filename": "../evil", "steps": [{"id": "x", "type": "y"}]})
        check("P9 traversal filename rejected 400", code == 400, f"code={code}")

        # ── P10: empty steps rejected ─────────────────────────────────
        code, _ = req(base, "POST", "/v1/pipelines/yaml/save", {
            "filename": "empty-flow", "steps": []})
        check("P10 empty steps rejected 400", code == 400, f"code={code}")

        # ── P11: delete nonexistent 404 ───────────────────────────────
        code, _ = req(base, "DELETE", "/v1/pipelines/yaml/delete?filename=nope.yaml")
        check("P11 delete nonexistent 404", code == 404, f"code={code}")

        # ── P12: overwrite guard ──────────────────────────────────────
        req(base, "POST", "/v1/pipelines/yaml/save",
            {"filename": "ow-flow", "steps": [{"id": "a", "type": "b"}]})
        code, _ = req(base, "POST", "/v1/pipelines/yaml/save",
                      {"filename": "ow-flow", "steps": [{"id": "a", "type": "b"}]})
        code2, _ = req(base, "POST", "/v1/pipelines/yaml/save",
                       {"filename": "ow-flow", "overwrite": True,
                        "steps": [{"id": "a", "type": "b"}]})
        check("P12 overwrite: 409 without flag, 200 with",
              code == 409 and code2 == 200,
              f"no-flag={code} with-flag={code2}")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        shutil.rmtree(tmp, ignore_errors=True)
        os.unlink(log.name)

    total = n_pass[0] + len(failures)
    print(f"\n{total} checks, {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
