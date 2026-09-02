#!/usr/bin/env python3
"""Editor data surfaces ported 1:1 from the C gateway (src/server.cpp).

Scope of this module (branch python-orchestrator): the READERS and
persistence doors the Tech Noir editor + media deck speak — run history,
drafts, pipeline-yaml CRUD, artifact serving, family param schemas, and
the tiny chrome registries. Pure functions over explicit roots; stdlib
only; no globals carrying configuration (the C server's cwd-relative
"./output", "./drafts", "../pipelines" become explicit arguments).

C sources mirrored (line numbers from src/server.cpp at port time):

  handle_pipelines_runs      ~6606   GET  /v1/pipelines/runs
  handle_pipelines_status    ~4356   GET  /v1/pipelines/status/:run_id
                                     (run_detail implements the
                                     restored-from-sidecar path; the live
                                     in-memory-registry path needs g_runs[]
                                     and is documented, not ported)
  handle_yaml_list           ~6270   GET  /v1/pipelines/yaml/list
  handle_yaml_detail         ~6326   GET  /v1/pipelines/yaml/detail
  handle_yaml_save           ~6476   POST /v1/pipelines/yaml/save
  handle_yaml_delete         ~6545   DELETE /v1/pipelines/yaml/delete
  handle_yaml_rename         ~6570   POST /v1/pipelines/yaml/rename
  handle_pipelines_workflow  ~4262   GET  /v1/pipelines/workflow/:run_id
                                     (the only ComfyUI-export door in C;
                                     served here as export_comfyui)
  handle_pipelines_drafts    ~4637   POST /v1/pipelines/drafts
  handle_draft_get           ~5445   GET  /v1/pipelines/drafts/:id
  handle_draft_list          ~5729   GET  /v1/pipelines/drafts
  handle_pipelines_resume    ~10300  POST /v1/pipelines/resume/:run_id
  handle_asset               ~6763   GET  /editor/assets/runs/<run>/<file>
  handle_family_param_schema[s] ~5853
  handle_health / handle_models / handle_lane_registry (chrome stubs)

On-disk stores (the C server runs with cwd = build/, so its "./output" is
build/output — pass that root for golden parity):

  runs     <server_root>/output/run-*/_pipeline.json   (+ media files)
  drafts   <server_root>/drafts/<id>.json              flat JSON docs;
           an optional read-only aux tree comes from the DRAFTS_AUX_DIR
           env in C (drafts_aux_dir(), ~4822) — pass aux_root explicitly
  yaml     <pipelines_root>/<name>/pipeline.yaml       (C: ../pipelines)

Divergences from the C, all deliberate and load-bearing for parity or
safety (see also the module self-test):

  * ensure_run_previews (~6189) forks ffmpeg and WRITES _poster.jpg into
    run dirs. This reader never generates previews; thumbnails reference
    an existing _poster.jpg or the first image file, exactly like C's
    run_thumbnail when no poster needs generating.
  * the read-time zombie sweep (~6684) mirrors the status override
    ("running" with no live registry entry reads as "failed") but does
    NOT rewrite sidecars unless sweep=True is passed (the write mirrors
    boot_patch_sidecar ~10559: every "running"/"queued" status occurrence
    -> "failed", plus a "sweep" note, atomic tmp+rename).
  * run_detail reproduces the RESTORE path only. The live-registry path
    (~4558) answers a different shape (queue_position, run-id-prefixed
    yaml_filename quirk) that cannot exist without g_runs[].
  * the restore path's error extraction mirrors a C off-by-one
    (qq + 8 lands ON the value's opening quote, ~4392-4398) — the C
    therefore always serves error:"" there, and so does this port.
  * yaml/validate, yaml/validate-simple and yaml/export-comfyui DO NOT
    EXIST in src/server.cpp. yaml_validate()/yaml_validate_simple()
    answer with the C's unmatched-route error shape; export_comfyui()
    is the C's workflow-export door under its editor-facing name.
  * drafts have no DELETE door in C; drafts_delete() answers the
    unmatched-route shape rather than inventing persistence semantics.
  * drafts_save composes the ray birth contract by JSON round-trip
    (key order + injected fields identical to ray_compose_draft_doc
    ~5354); byte-level fidelity of member spacing is not preserved —
    field names, statuses and error strings are.
  * no engine, lane or model name is known to this module (PLUGIN
    ARCHITECTURE LAW): the workflow-file prefix is a parameter, the
    family list is scanned from the plugins tree as data.
"""

from __future__ import annotations

import itertools
import json
import os
import re
import threading
import time

# ---------------------------------------------------------------------------
# C-string parity helpers
# ---------------------------------------------------------------------------

_ERR_JSON = "application/json"


def _err_body(msg: str) -> dict:
    return {"error": msg}


def json_quote(s: str) -> str:
    """C json_quote() (~1843): escape " \\ \\n \\r \\t; DROP other control
    chars; pass everything >= 0x20 through as-is."""
    out = ['"']
    for ch in s:
        if ch in ('"', "\\"):
            out.append("\\" + ch)
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif ord(ch) >= 0x20:
            out.append(ch)
    return "".join(out) + '"'


def _sidecar_str_impl(text: str, key: str, cap: int):
    """Core of C sidecar_str() (~6119), BYTE-wise like the C: first
    '"key":', skip spaces/tabs, expect a quoted string, decode \\n \\r \\t
    \\" \\\\ escapes, stop at cap-1 BYTES written (multibyte UTF-8 counts
    per byte and may be cut mid-character, exactly like the C char
    buffer). Returns (found_and_string: bool, value). The C returns -1
    (caller buffer untouched) when absent or non-string."""
    raw = text.encode("utf-8", "surrogateescape")
    pat = b'"%s":' % key.encode("ascii")
    i = raw.find(pat)
    if i < 0:
        return False, ""
    p = i + len(pat)
    n = len(raw)
    while p < n and raw[p] in (0x20, 0x09):
        p += 1
    if p >= n or raw[p:p + 1] != b'"':
        return False, ""
    p += 1
    out = bytearray()
    while p < n and raw[p:p + 1] != b'"' and len(out) + 1 < cap:
        if raw[p:p + 1] == b"\\" and p + 1 < n:
            p += 1
            esc = {0x6E: b"\n", 0x72: b"\r", 0x74: b"\t"}.get(raw[p])
            out += esc if esc is not None else raw[p:p + 1]
            p += 1
        else:
            out += raw[p:p + 1]
            p += 1
    return True, bytes(out).decode("utf-8", "surrogateescape")


def sidecar_str(text: str, key: str, cap: int) -> str:
    """C sidecar_str() as a plain string: "" when absent / not a string
    (the C leaves the caller's zero-initialized buffer, which every
    caller also seeds with "")."""
    return _sidecar_str_impl(text, key, cap)[1]


def _strtol(text: str) -> int:
    """strtol() semantics: optional whitespace/sign then digits; 0 when no
    conversion happens (the C default only applies when the KEY is absent,
    so callers here always pass text that follows an existing key)."""
    m = re.match(r"\s*([+-]?[0-9]+)", text)
    return int(m.group(1)) if m else 0


def sidecar_num(text: str, key: str, default: int) -> int:
    """C sidecar_num() (~6149)."""
    pat = '"%s":' % key
    i = text.find(pat)
    if i < 0:
        return default
    return _strtol(text[i + len(pat):])


def inf_json_string(text: str, key: str, cap: int) -> str:
    """inf_json_string() (include/inference/plugin_helpers.h ~31): needle is
    '"key"' WITHOUT a colon, then spaces/colons are skipped."""
    needle = '"%s"' % key
    i = text.find(needle)
    if i < 0:
        return ""
    p = i + len(needle)
    while p < len(text) and text[p] in " :":
        p += 1
    if p >= len(text) or text[p] != '"':
        return ""
    p += 1
    out = []
    while p < len(text) and text[p] != '"' and len(out) + 1 < cap:
        if text[p] == "\\" and p + 1 < len(text):
            p += 1
            out.append({"n": "\n", "t": "\t", "r": "\r"}.get(text[p], text[p]))
            p += 1
        else:
            out.append(text[p])
            p += 1
    return "".join(out)


def _cjson_compact(value) -> str:
    """cJSON_PrintUnformatted parity: compact separators, object key order
    preserved, integral floats printed as integers (cJSON prints d==int(d)
    with %d)."""
    def norm(v):
        if isinstance(v, float) and v.is_integer() and abs(v) < 1e15:
            return int(v)
        if isinstance(v, list):
            return [norm(x) for x in v]
        if isinstance(v, dict):
            return {k: norm(x) for k, x in v.items()}
        return v
    return json.dumps(norm(value), separators=(",", ":"), ensure_ascii=False)


# ---------------------------------------------------------------------------
# artifact typing (C artifact_type ~537 / content_type_of ~557)
# ---------------------------------------------------------------------------

_IMG = ("png", "jpg", "jpeg", "webp", "gif", "svg")
_AUD = ("wav", "flac", "mp3", "ogg", "m4a", "aac")
_VID = ("mp4", "webm", "mkv", "mov")


def _ext(name: str) -> str:
    dot = name.rfind(".")
    return name[dot + 1:] if dot >= 0 else ""


def artifact_type(name: str) -> str:
    e = _ext(name).lower()
    if e in _IMG:
        return "image"
    if e in _AUD:
        return "audio"
    if e in _VID:
        return "video"
    if e in ("glb", "gltf"):
        return "model"
    if e == "json":
        return "spec"
    if e in ("txt", "md", "yaml"):
        return "text"
    return "file"


def content_type_of(name: str) -> str:
    e = _ext(name).lower()
    return {
        "png": "image/png",
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "wav": "audio/wav",
        "flac": "audio/flac",
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "mp4": "video/mp4",
        "webm": "video/webm",
        "glb": "model/gltf-binary",
        "gltf": "model/gltf+json",
        "json": "application/json",
        "txt": "text/plain; charset=utf-8", "md": "text/plain; charset=utf-8",
        "yaml": "text/yaml",
    }.get(e, "application/octet-stream")


# media set for gallery ordering — run_dir_has_media (~6238): NOTE it is
# NOT identical to artifact_type's media set (no svg, no mkv, no m4a/aac).
_MEDIA_EXTS = ("png", "jpg", "jpeg", "webp", "gif",
               "mp4", "webm", "mov",
               "wav", "flac", "ogg", "mp3")

_MAX_IMGS = 3          # payload diet: sidebar lists media + 3 frames (~594)


def _run_dir_has_media(run_dir: str) -> bool:
    try:
        names = os.listdir(run_dir)
    except OSError:
        return False
    for name in names:
        e = _ext(name).lower()
        if e in _MEDIA_EXTS:
            return True
    return False


def _file_size(path: str) -> int:
    try:
        return os.path.getsize(path)
    except OSError:
        return -1


def run_artifacts(out_dir: str, out_dir_literal: str) -> list:
    """C run_artifacts_json() (~587) as a list. out_dir_literal is the
    string the C embeds in "path" (it passes its "./output/<run>" string);
    rows: {name,path,bytes,url,type,size} + a trailing
    {truncated,listed,total} marker when any entry went unlisted."""
    try:
        names = os.listdir(out_dir)
    except OSError:
        names = []
    names.sort(key=lambda s: s.encode("utf-8", "surrogateescape"))
    arts = []
    listed = 0
    total = 0
    imgs = 0
    for name in names:
        total += 1
        if name.startswith("_"):
            continue                        # sidecars + generated poster
        t = artifact_type(name)
        if t == "image":
            imgs += 1
            if imgs > _MAX_IMGS:
                continue
        elif t not in ("video", "audio"):
            continue                        # not media: not listed
        listed += 1
        size = _file_size(os.path.join(out_dir, name))
        arts.append({
            "name": name,
            "path": "%s/%s" % (out_dir_literal, name),
            "bytes": size,
            "url": "/editor/assets/runs/%s/%s" % (os.path.basename(out_dir_literal.rstrip("/")), name),
            "type": t,
            "size": size,
        })
    if total > listed:
        arts.append({"truncated": True, "listed": listed, "total": total})
    return arts


def _run_thumbnail(run_dir: str, run_id: str) -> str:
    """C run_thumbnail() (~6160): cached poster wins, else first image by
    sorted name. (Poster GENERATION — ensure_run_previews — is not ported:
    it forks ffmpeg and writes into the run dir.)"""
    if os.path.exists(os.path.join(run_dir, "_poster.jpg")):
        return "/editor/assets/runs/%s/_poster.jpg" % run_id
    try:
        names = sorted(os.listdir(run_dir),
                       key=lambda s: s.encode("utf-8", "surrogateescape"))
    except OSError:
        return ""
    for name in names:
        if artifact_type(name) == "image":
            return "/editor/assets/runs/%s/%s" % (run_id, name)
    return ""


# ---------------------------------------------------------------------------
# GET /v1/pipelines/runs — handle_pipelines_runs (~6609)
# ---------------------------------------------------------------------------

def _patch_sidecar_sweep(path: str, why: str) -> bool:
    """boot_patch_sidecar() (~10559): every "running"/"queued" status
    occurrence -> "failed", sweep note appended before the final '}',
    atomic tmp+rename. Mirrored for sweep=True callers only."""
    try:
        with open(path, "r", encoding="utf-8", errors="surrogateescape") as f:
            buf = f.read()
    except OSError:
        return False
    if '"status":"running"' not in buf and '"status":"queued"' not in buf:
        return False
    note = "".join(" " if (c == '"' or ord(c) < 32) else c
                   for c in why)[:159]
    fixed = (buf.replace('"status":"running"', '"status":"failed"')
                .replace('"status":"queued"', '"status":"failed"'))
    last = fixed.rfind("}")
    if last >= 0:
        fixed = fixed[:last] + ',"sweep":"%s"}' % note + fixed[last + 1:]
    tmp = path + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8", errors="surrogateescape") as f:
            f.write(fixed)
        os.replace(tmp, path)
        return True
    except OSError:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        return False


def runs(server_root, drafts_root=None, aux_root=None, limit=200,
         live_run_ids=(), sweep=False) -> dict:
    """GET /v1/pipelines/runs. server_root is the C process cwd (the parent
    of its output/ tree). Rows: media-first, then newest-first; test-fixture
    models with a leading underscore never surface (user-surface law); a
    draft_id whose doc is gone degrades to a draftless row (click-contract
    law). live_run_ids stands in for the C's in-memory g_runs[] registry —
    a "running" sidecar with no live entry reads as (and, when sweep=True,
    is persisted as) "failed"."""
    output_root = os.path.join(server_root, "output")
    if drafts_root is None:
        drafts_root = os.path.join(server_root, "drafts")
    if limit is None:
        limit = 200
    limit = max(1, min(500, int(limit)))            # clamp 1..500 (~6612)

    ents = []
    try:
        names = os.listdir(output_root)
    except OSError:
        names = []
    for name in names:
        # the C's 8192 cap counts COLLECTED run entries (the n < 8192 in
        # the while condition), not scanned directory entries (~6623)
        if len(ents) >= 8192:
            break
        if not name.startswith("run-"):
            continue
        run_dir = os.path.join(output_root, name)
        created = 0
        try:
            with open(os.path.join(run_dir, "_pipeline.json"), "r",
                      encoding="utf-8", errors="surrogateescape") as f:
                buf = f.read(8191)                   # C reads 8192-1 bytes
            created = sidecar_num(buf, "created", 0)
        except OSError:
            pass
        ents.append({"dir": name, "created": created,
                     "media": _run_dir_has_media(run_dir)})
    # rundir_cmp (~6227): media desc, then created desc. C qsort is
    # unstable across exact ties; this stable sort adds no tie-break,
    # so callers comparing order-insensitively within tie groups match.
    ents.sort(key=lambda e: (not e["media"], -e["created"]))

    rows = []
    for ent in ents[:limit]:
        run_dir = os.path.join(output_root, ent["dir"])
        model = ""
        prompt = ""
        status = "unknown"
        draft = ""
        created = ent["created"]
        buf = None
        try:
            with open(os.path.join(run_dir, "_pipeline.json"), "r",
                      encoding="utf-8", errors="surrogateescape") as f:
                buf = f.read(8191)
        except OSError:
            status = "success"                       # legacy dir, no sidecar
        if buf is not None:
            model = sidecar_str(buf, "model", 64)
            if model.startswith("_"):
                continue                             # user-surface law (~6678)
            prompt = sidecar_str(buf, "prompt", 2048)
            found, raw_status = _sidecar_str_impl(buf, "status", 16)
            status = raw_status if found else "unknown"
            draft = sidecar_str(buf, "draft_id", 96)
            seed = sidecar_num(buf, "seed", -1)
            created = sidecar_num(buf, "created", created)
            # ZOMBIE SWEEP (~6688): "running" with no live registry entry.
            if status == "running" and ent["dir"] not in live_run_ids:
                status = "failed"
                if sweep:
                    _patch_sidecar_sweep(
                        os.path.join(run_dir, "_pipeline.json"),
                        "read-time sweep: stale running sidecar, "
                        "no live registry entry")
        else:
            seed = -1
        # click-contract law (~6724): never advertise a draft_id the
        # drafts GET would 404 on.
        if draft:
            if not os.path.exists(os.path.join(drafts_root, draft + ".json")):
                aux_ok = bool(aux_root) and os.path.exists(
                    os.path.join(aux_root, draft + ".json"))
                if not aux_ok:
                    draft = ""
        thumb = _run_thumbnail(run_dir, ent["dir"])
        arts = run_artifacts(run_dir, "./output/%s" % ent["dir"])
        rows.append({
            "run_id": ent["dir"],
            "name": model,
            "pipeline": model,
            "status": status,
            "created_at": created,
            "prompt": prompt,
            "seed": seed,
            "thumbnail": thumb,
            "artifacts": arts,
            "params": {"seed": seed},
            "draft_id": draft,
        })
    return {"count": len(ents), "runs": rows}


# ---------------------------------------------------------------------------
# GET /v1/pipelines/status/:run_id — handle_pipelines_status restore path
# ---------------------------------------------------------------------------

def _stages_span(text: str, cap: int = 24576) -> str:
    """The '"stages"' bracket-balanced span extraction the C uses in two
    places (~4428, ~4795): first '"stages"', first '[' after it, plain
    depth-counted (NOT string-aware) walk to its ']'; capped."""
    sp = text.find('"stages"')
    if sp < 0:
        return "[]"
    c = text.find("[", sp)
    if c < 0:
        return "[]"
    depth = 0
    e = c
    while e < len(text):
        if text[e] == "[":
            depth += 1
        elif text[e] == "]":
            depth -= 1
            if depth == 0:
                e += 1
                break
        e += 1
    return text[c:e][:cap - 1]


def run_detail(server_root, run_id: str):
    """GET /v1/pipelines/status/:run_id, restore-from-sidecar path
    (~4365-4556). Returns (status, dict). The C consults its live
    g_runs[] registry first; a pure reader has no registry, so every id
    answers from disk exactly as a restarted C gateway would."""
    output_root = os.path.join(server_root, "output")
    run_dir = os.path.join(output_root, run_id)
    sc_path = os.path.join(run_dir, "_pipeline.json")
    try:
        with open(sc_path, "r", encoding="utf-8", errors="surrogateescape") as f:
            sb = f.read(65535)                       # C reads 65536-1
    except OSError:
        return 404, _err_body("unknown run_id")

    # raw sidecar state -> editor wire state (~4380-4391)
    st = "unknown"
    qq = sb.find('"status"')
    if qq >= 0:
        c = sb.find('"', qq + 8)
        if c >= 0:
            e = sb.find('"', c + 1)
            if e >= 0 and e - c - 1 < 24:
                st = sb[c + 1:e]
    if st == "success":
        st = "completed"
    elif st == "error":
        st = "failed"

    # error extraction mirrors the C off-by-one (~4392-4398): qq+8 lands
    # ON the value's opening quote, strchr returns that same quote, and
    # the C serves "" — reproduce byte-for-byte.
    ev = ""
    qq = sb.find('"error":"')
    if qq >= 0:
        c = qq + 8
        e = sb.find('"', c)
        if e >= 0 and e - c < 256:
            ev = sb[c:e]

    created = 0
    qq = sb.find('"created"')
    if qq >= 0:
        c = sb.find(":", qq)
        if c >= 0:
            created = _strtol(sb[c + 1:])
    dur = 0
    qq = sb.find('"durationSec"')
    if qq >= 0:
        c = sb.find(":", qq)
        if c >= 0:
            dur = _strtol(sb[c + 1:])

    arts = run_artifacts(run_dir, "./output/%s" % run_id)

    # stages: run-dir card.json (explicit card) wins over the sidecar
    # (~4411-4448); verbatim span from disk, never hand-composed.
    stages2 = "[]"
    src = None
    try:
        with open(os.path.join(run_dir, "card.json"), "r",
                  encoding="utf-8", errors="surrogateescape") as f:
            src = f.read(24575)
    except OSError:
        src = sb
    if src is not None:
        stages2 = _stages_span(src)

    yaml_filename = sidecar_str(sb, "model", 80)
    draft_id = sidecar_str(sb, "draft_id", 96)

    # placeholder-prompt fix (~4458-4541): inject the run's real prompt +
    # seed into each stage's params, per-stage when _request.json carried
    # per-window prompts. Mirrors the C buffer math INCLUDING the 24576
    # cap that (on big cards) suppresses the injection entirely.
    rprom = sidecar_str(sb, "prompt", 1024)
    rseed = 0
    qq = sb.find('"seed"')
    if qq >= 0:
        c = sb.find(":", qq)
        if c >= 0:
            rseed = _strtol(sb[c + 1:])
    reqbuf = ""
    try:
        with open(os.path.join(run_dir, "_request.json"), "r",
                  encoding="utf-8", errors="surrogateescape") as f:
            reqbuf = f.read(65535)
    except OSError:
        pass
    out_parts = []
    walk = 0
    while True:
        ob = stages2.find("{", walk)
        if ob < 0:
            break
        cb = ob + 1
        while cb < len(stages2) and stages2[cb] != "}":
            cb += 1
        if cb >= len(stages2):
            break
        sid = ""
        ip = stages2.find('"id":"', ob)
        if ip >= 0 and ip < cb:
            v = ip + 5
            L = 0
            while v + L < cb and stages2[v + L] != '"' and L < 63:
                L += 1
            sid = stages2[v:v + L]
        pkey = "prompt"
        w = sid.find("window")
        if w >= 0:
            n = _strtol(sid[w + 6:])
            if 1 < n < 20:
                pkey = "prompt%d" % n
        spro = ""
        have = False
        if reqbuf and ('"%s"' % pkey) in reqbuf:
            spro = sidecar_str(reqbuf, pkey, 1024)
            have = spro != ""
        if not have and rprom:
            spro = rprom
            have = True
        if have:
            pjson = ',"params":{"prompt":%s,"seed":%d}' % (json_quote(spro), rseed)
        else:
            pjson = ',"params":{"seed":%d}' % rseed
        if len(stages2) + len(pjson) + 1 < 24576:
            # the C inserts pjson AT cb — the first '}' after the object
            # open (~4535): params lands as the object's LAST member
            stages2 = stages2[:cb] + pjson + stages2[cb:]
            walk = cb + len(pjson) + 1
        else:
            break

    try:
        stages = json.loads(stages2)
    except ValueError:
        stages = stages2                          # C would serve it raw

    return 200, {
        "run_id": run_id,
        "status": st,
        "state": st,
        "error": ev,
        "created": created,
        "durationSec": dur,
        "restored_from_sidecar": True,
        "artifacts": arts,
        "stages": stages,
        "yaml_filename": yaml_filename,
        "draft_id": draft_id,
    }


# ---------------------------------------------------------------------------
# pipeline-yaml CRUD — ../pipelines/<stem>/pipeline.yaml
# ---------------------------------------------------------------------------

def yaml_list(pipelines_root) -> dict:
    """GET /v1/pipelines/yaml/list (~6270): every <dir>/pipeline.yaml that
    is readable AND carries the literal "api: true" gate, sorted by name."""
    names = []
    try:
        entries = sorted(os.listdir(pipelines_root))
    except OSError:
        entries = []
    for name in entries[:256]:                       # C table caps at 256
        if name.startswith("."):
            continue
        py = os.path.join(pipelines_root, name, "pipeline.yaml")
        if not os.access(py, os.R_OK):
            continue
        try:
            with open(py, "r", encoding="utf-8", errors="surrogateescape") as f:
                pbuf = f.read(4095)
        except OSError:
            continue
        if "api: true" not in pbuf:
            continue
        names.append(name[:79])
    names.sort(key=lambda s: s.encode("utf-8", "surrogateescape"))
    return {"pipelines": [
        {"filename": n + ".yaml", "name": n,
         "path": "../pipelines/%s/pipeline.yaml" % n}
        for n in names
    ]}


def _yaml_step_spans(buf: str):
    """The - id:/type:/params: line parser from handle_yaml_detail
    (~6365-6446), returned as (nodes, steps) list-pairs of raw strings."""
    nodes = []
    steps = []
    cur_id = ""
    cur_type = ""
    cur_params = "[]"

    def flush():
        nonlocal cur_id, cur_type, cur_params
        if not cur_id:
            return
        nodes.append({"id": cur_id})
        fam = cur_type if cur_type else "node"
        steps.append({"family": fam, "service": fam, "title": cur_id,
                      "params": json.loads(cur_params)})
        cur_id, cur_type, cur_params = "", "", "[]"

    p = 0
    n = len(buf)
    while p < n:
        eol = buf.find("\n", p)
        if eol < 0:
            eol = n
        indent = 0
        while p + indent < eol and buf[p + indent] == " ":
            indent += 1
        ll = eol - p
        if ll > indent + 6 and buf.startswith("- id: ", p + indent):
            flush()
            v = p + indent + 6
            L = 0
            while v + L < eol and buf[v + L] not in (" ", "\r"):
                L += 1
            cur_id = buf[v:v + L]
        elif cur_id and ll > indent + 6 and buf.startswith("type: ", p + indent):
            v = p + indent + 6
            L = 0
            while v + L < eol and buf[v + L] not in (" ", "\r"):
                L += 1
            cur_type = buf[v:v + L]
        elif cur_id and ll > indent + 8 and buf.startswith("params: ", p + indent):
            v = p + indent + 8
            if v < n and buf[v] == "{":
                # string-aware balanced-brace walk to the closing '}'
                depth = 0
                e = v
                instr = False
                while e < n:
                    ch = buf[e]
                    if instr:
                        if ch == "\\" and e + 1 < n:
                            e += 2
                            continue
                        if ch == '"':
                            instr = False
                    else:
                        if ch == '"':
                            instr = True
                        elif ch == "{":
                            depth += 1
                        elif ch == "}":
                            depth -= 1
                            if depth == 0:
                                e += 1
                                break
                    e += 1
                # shallow-walk top-level "key":value pairs (raw value span)
                ps = []
                c = v + 1
                first = True
                while c < e - 1:
                    if buf[c] != '"':
                        c += 1
                        continue
                    k = c + 1
                    ke = k
                    while ke < n and buf[ke] != '"':
                        if buf[ke] == "\\" and ke + 1 < n:
                            ke += 1
                        ke += 1
                    key = buf[k:ke]
                    c = ke + 1
                    while c < e and buf[c] in (" ", ":"):
                        c += 1
                    vs = c
                    d2 = 0
                    in2 = False
                    while c < e:
                        ch = buf[c]
                        if in2:
                            if ch == "\\" and c + 1 < n:
                                c += 2
                                continue
                            if ch == '"':
                                in2 = False
                            c += 1
                            continue
                        if ch == '"':
                            in2 = True
                            c += 1
                            continue
                        if ch in "{[":
                            d2 += 1
                        elif ch in "}]":
                            if d2 == 0:
                                break
                            d2 -= 1
                        elif ch == "," and d2 == 0:
                            break
                        c += 1
                    val = buf[vs:c]
                    if first:
                        first = False
                    ps.append({"name": key, "value": val})
                cur_params = ("[" + ",".join(
                    '{"name":%s,"value":%s}' % (json_quote(x["name"]), x["value"])
                    for x in ps) + "]") if ps else "[]"
        p = eol + 1
    flush()
    return nodes, steps


def yaml_detail(pipelines_root, name):
    """GET /v1/pipelines/yaml/detail?yaml=<name>[.yaml] (~6326)."""
    if name is None:
        return 400, _err_body("missing yaml param")
    dot = name.rfind(".yaml")
    if dot >= 0:
        name = name[:dot]
    path = os.path.join(pipelines_root, name, "pipeline.yaml")
    try:
        with open(path, "r", encoding="utf-8", errors="surrogateescape") as f:
            buf = f.read(65535)
    except OSError:
        return 404, _err_body("no such pipeline")
    desc = ""
    dp = buf.find("description:")
    if dp >= 0:
        v = dp + 12
        while v < len(buf) and buf[v] in (' ', '"'):
            v += 1
        L = 0
        while (v + L < len(buf) and buf[v + L] not in ("\n", '"')
               and L < 255):
            L += 1
        desc = buf[v:v + L]
    nodes, steps = _yaml_step_spans(buf)
    return 200, {"name": name, "description": desc,
                 "nodes": nodes, "steps": steps, "yaml": buf}


def _yaml_safe_stem(s: str):
    """yaml_safe_stem() (~6461): scan stops at '/' '.' '\\\\'; any other
    non-[A-Za-z0-9-_] char is fatal; returns the stem or None. "foo.yaml"
    and "foo/bar" both yield "foo" — the C only stops at separators, it
    does not reject them."""
    if not s:
        return None
    out = []
    for ch in s:
        if ch in ("/", ".", "\\"):
            break
        if not (ch.isascii() and (ch.isalnum() or ch in "-_")):
            return None
        out.append(ch)
        if len(out) >= 127:
            break
    stem = "".join(out)
    return stem if stem else None


def yaml_save(pipelines_root, body):
    """POST /v1/pipelines/yaml/save (~6476). body: {filename, steps,
    overwrite?, name?} — steps entries use id/type/family/params exactly
    as the C reads them. Returns (status, dict); 201 on create, 200 on
    overwrite."""
    if isinstance(body, (str, bytes)):
        try:
            body = json.loads(body)
        except ValueError:
            return 400, _err_body("invalid JSON")
    if not isinstance(body, dict):
        return 400, _err_body("invalid JSON")
    jname = body.get("filename")
    jsteps = body.get("steps")
    joverwrite = body.get("overwrite")
    jdisplay = body.get("name")
    if not isinstance(jname, str) or not isinstance(jsteps, list) or not jsteps:
        return 400, _err_body(
            "filename (string) and steps (non-empty array) required")
    stem = _yaml_safe_stem(jname)
    if not stem:
        return 400, _err_body(
            "invalid filename — alphanumeric, dash, underscore only")
    disp = jdisplay if isinstance(jdisplay, str) and jdisplay else stem
    disp = disp[:255]                                  # C dispbuf[256]
    lines = ["api: true", "name: %s" % disp, "steps:"]
    for s in jsteps:
        if not isinstance(s, dict):
            s = {}
        sid = s.get("id")
        stype = s.get("type")
        fam = s.get("family")
        rid = sid if isinstance(sid, str) and sid else stem
        rtp = (stype if isinstance(stype, str) and stype
               else (fam if isinstance(fam, str) and fam else "unknown"))
        lines.append("  - id: %s" % rid)
        lines.append("    type: %s" % rtp)
        sp = s.get("params")
        if isinstance(sp, dict):
            lines.append("    params: %s" % _cjson_compact(sp))
    yaml = "\n".join(lines) + "\n"

    fpath = os.path.join(pipelines_root, stem, "pipeline.yaml")
    existed = os.access(fpath, os.R_OK)
    if existed and joverwrite is not True:
        return 409, _err_body("pipeline exists — set overwrite:true to replace")
    os.makedirs(os.path.dirname(fpath), exist_ok=True)  # mkdir one level
    try:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(yaml)
    except OSError:
        return 500, _err_body("cannot write pipeline file")
    return (200 if existed else 201), {
        "filename": stem + ".yaml",
        "name": disp,
        "path": "../pipelines/%s/pipeline.yaml" % stem,
    }


def yaml_delete(pipelines_root, filename):
    """DELETE /v1/pipelines/yaml/delete?filename=<name> (~6545)."""
    if filename is None:
        return 400, _err_body("missing filename param")
    dot = filename.rfind(".yaml")
    if dot >= 0:
        filename = filename[:dot]
    stem = _yaml_safe_stem(filename)
    if not stem:
        return 400, _err_body("invalid filename")
    fpath = os.path.join(pipelines_root, stem, "pipeline.yaml")
    if not os.access(fpath, os.R_OK):
        return 404, _err_body("no such pipeline")
    try:
        os.unlink(fpath)
    except OSError:
        pass
    try:
        os.rmdir(os.path.join(pipelines_root, stem))   # succeeds if empty
    except OSError:
        pass
    return 200, {"deleted": stem + ".yaml"}


def yaml_rename(pipelines_root, body):
    """POST /v1/pipelines/yaml/rename {filename, newName} (~6570)."""
    if isinstance(body, (str, bytes)):
        try:
            body = json.loads(body)
        except ValueError:
            return 400, _err_body("invalid JSON")
    if not isinstance(body, dict):
        return 400, _err_body("invalid JSON")
    jold = body.get("filename")
    jnew = body.get("newName")
    if not isinstance(jold, str) or not isinstance(jnew, str):
        return 400, _err_body("filename and newName required")
    oldstr = jold
    dot = oldstr.rfind(".yaml")
    if dot >= 0:
        oldstr = oldstr[:dot]
    oldstem = _yaml_safe_stem(oldstr)
    newstem = _yaml_safe_stem(jnew)
    if not oldstem or not newstem:
        return 400, _err_body("invalid stem")
    oldpath = os.path.join(pipelines_root, oldstem, "pipeline.yaml")
    newdir = os.path.join(pipelines_root, newstem)
    newpath = os.path.join(newdir, "pipeline.yaml")
    if not os.access(oldpath, os.R_OK):
        return 404, _err_body("no such pipeline")
    if os.access(newpath, os.R_OK):
        return 409, _err_body("target name already exists")
    os.makedirs(newdir, exist_ok=True)
    try:
        os.rename(oldpath, newpath)
    except OSError:
        return 500, _err_body("rename failed")
    # C calls rmdir(oldpath) — the FILE path, not the dir (~6599) — which
    # always fails; the old directory stays. Mirror the observable result.
    return 200, {"renamed": newstem + ".yaml"}


def yaml_validate(pipelines_root, body=None):
    """POST /v1/pipelines/yaml/validate — NO SUCH ROUTE in src/server.cpp
    (route table ~11294-11348). Answers with the C's unmatched-route
    error-handler shape (~11355)."""
    return 404, {"error": "not found",
                 "path": "/v1/pipelines/yaml/validate"}


def yaml_validate_simple(pipelines_root, body=None):
    """POST /v1/pipelines/yaml/validate-simple — NO SUCH ROUTE in C."""
    return 404, {"error": "not found",
                 "path": "/v1/pipelines/yaml/validate-simple"}


def export_comfyui(server_root, run_id, window=None, workflow_prefix="_comfyui_"):
    """GET /v1/pipelines/yaml/export-comfyui does not exist in C; this is
    the C's ComfyUI workflow export door, handle_pipelines_workflow
    (~4262): GET /v1/pipelines/workflow/:run_id[?window=<name>]. Index
    mode lists the run dir's exported workflow graphs; fetch mode returns
    one graph's bytes. workflow_prefix is the on-disk filename convention
    (<prefix><name>.json) — data, not an engine name."""
    for ch in run_id:
        if not (ch.isascii() and (ch.isalnum() or ch in "-_")):
            return 400, _err_body("invalid run id")
    run_dir = os.path.join(server_root, "output", run_id)
    if not os.access(run_dir, os.R_OK):
        return 404, _err_body("run not found")
    if not window:
        rows = []
        try:
            names = sorted(os.listdir(run_dir),
                           key=lambda s: s.encode("utf-8", "surrogateescape"))
        except OSError:
            return 404, _err_body("run dir unreadable")
        for name in names:
            if not name.startswith(workflow_prefix):
                continue
            if not name.endswith(".json"):
                continue
            nm = name[len(workflow_prefix):-len(".json")]
            if not nm or len(nm) >= 128:
                continue
            fp = os.path.join(run_dir, name)
            rows.append({"window": nm, "bytes": _file_size(fp),
                         "path": fp})
        return 200, {"run_id": run_id, "workflows": rows}
    fp = os.path.join(run_dir, "%s%s.json" % (workflow_prefix, window))
    try:
        with open(fp, "r", encoding="utf-8", errors="surrogateescape") as f:
            return 200, json.loads(f.read())
    except OSError:
        return 404, _err_body("workflow '%s' not found for run '%s'"
                              % (window, run_id))
    except ValueError:
        return 404, _err_body("workflow '%s' not found for run '%s'"
                              % (window, run_id))


# ---------------------------------------------------------------------------
# drafts — ./drafts/<id>.json (+ optional read-only aux tree)
# ---------------------------------------------------------------------------

def draft_id_ok(draft_id: str) -> bool:
    """draft_id_ok() (~4998): <=96 chars, [A-Za-z0-9_-] only."""
    if not draft_id or len(draft_id) > 96:
        return False
    return all(c.isascii() and (c.isalnum() or c in "-_") for c in draft_id)


def drafts_list(drafts_root, aux_root=None) -> dict:
    """GET /v1/pipelines/drafts (~5729): merged index over ./drafts and the
    optional aux tree, newest-first by mtime, model/name (with the
    intent/title/service fallbacks) from the first 8KB of each doc."""
    ents = []
    for root in (drafts_root, aux_root):
        if not root:
            continue
        try:
            names = os.listdir(root)
        except OSError:
            continue
        for name in names:
            L = len(name)
            if L < 6 or L > 110 or not name.endswith(".json"):
                continue
            did = name[:-5]
            if not draft_id_ok(did):
                continue
            ppath = os.path.join(root, name)
            try:
                mt = int(os.stat(ppath).st_mtime)
            except OSError:
                continue
            model = ""
            disp = ""
            try:
                with open(ppath, "r", encoding="utf-8",
                          errors="surrogateescape") as f:
                    buf = f.read(8191)
                model = sidecar_str(buf, "model", 80)
                disp = sidecar_str(buf, "name", 160)
                if not disp:
                    disp = sidecar_str(buf, "intent", 160)
                if not disp:
                    disp = sidecar_str(buf, "title", 160)
                if not model:
                    model = sidecar_str(buf, "service", 80)
            except OSError:
                pass
            ents.append((mt, {"draft_id": did, "model": model, "name": disp}))
    # C: std::sort by mtime DESC (unstable across exact-second ties).
    ents.sort(key=lambda e: -e[0])
    return {"count": len(ents),
            "drafts": [row for _, row in ents[:600]]}


def _unwrap_calls(obj, done=False):
    """ray_unwrap_calls (~5316): a JSON-encoded STRING under a "calls" key
    becomes the array it encodes (first occurrence only)."""
    if done or not isinstance(obj, dict):
        return obj, False
    for k, v in obj.items():
        if k == "calls" and isinstance(v, str):
            try:
                arr = json.loads(v)
            except ValueError:
                arr = None
            if isinstance(arr, list):
                obj[k] = arr
                return obj, True
        new, done = _unwrap_calls(v, done)
        if done:
            return obj, True
    return obj, False


_RUN_SEQ = itertools.count()          # C: process-wide atomic run/draft seq
_DRAFT_SEQ = itertools.count()


def _mint_draft_id() -> str:
    """C id mint (~4675): draft-<time hex>-<tid hex>-<seq hex>."""
    return "draft-%x-%x-%x" % (int(time.time()), threading.get_ident(),
                               next(_DRAFT_SEQ))


def _ray_compose_draft_doc(body: dict, draft_id: str) -> dict:
    """ray_compose_draft_doc (~5354) by JSON round-trip: root contract keys
    in ray's exact order, unknown members preserved AFTER them, per-stage
    birth fields (id "s_<i>", inputs [""], provenance "agent") injected
    only when absent."""
    intent = ""
    stages = []
    extras = {}
    if isinstance(body, dict):
        intent = body.get("intent") if isinstance(body.get("intent"), str) else ""
        s = body.get("stages")
        if isinstance(s, list):
            stages = s
        for k, v in body.items():
            if k in ("intent", "stages", "draft_id", "status",
                     "createdAt", "completedAt"):
                continue
            extras[k] = v
    out_stages = []
    for idx, st in enumerate(stages):
        st = dict(st) if isinstance(st, dict) else {}
        st, _ = _unwrap_calls(st)
        row = {}
        if "id" not in st:
            row["id"] = "s_%d" % idx
        row.update(st)
        if "inputs" not in st:
            row["inputs"] = [""]
        if "provenance" not in st:
            row["provenance"] = "agent"
        out_stages.append(row)
    doc = {
        "draft_id": draft_id,
        "intent": intent,
        "stages": out_stages,
        "status": "ready",
        "createdAt": int(time.time()) * 1000,
        "completedAt": None,
    }
    doc.update(extras)
    return doc


def drafts_save(drafts_root, body, draft_id=None):
    """POST /v1/pipelines/drafts (~4637): compose the ray birth contract
    and persist <drafts_root>/<id>.json. Returns (status, dict) with the
    {draftId, stages} response shape. The C's x-agent-session one-card
    lane law (409) is an HTTP-header concern and is not modeled here."""
    if isinstance(body, (str, bytes)):
        if not body:
            return 400, _err_body("empty body")
        try:
            body = json.loads(body)
        except ValueError:
            body = {}
    if not body:
        return 400, _err_body("empty body")
    if draft_id is None:
        draft_id = _mint_draft_id()
    doc = _ray_compose_draft_doc(body, draft_id)
    os.makedirs(drafts_root, exist_ok=True)
    path = os.path.join(drafts_root, draft_id + ".json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, separators=(",", ":"), ensure_ascii=False)
    except OSError:
        return 500, _err_body("cannot persist draft")
    return 200, {"draftId": draft_id, "stages": doc["stages"]}


def _heal_duration_sec(text: str):
    """Serve-time timeline-sync heal (~5502-5559): recompute durationSec
    from the card's own frame plan (max end_frame / fps) and patch every
    disagreeing occurrence."""
    fend = 0
    for m in re.finditer(r'"end_frame"', text):
        c = text.find(":", m.end())
        if c >= 0:
            v = _strtol(text[c + 1:])
            if v > fend:
                fend = v
    fpsv = 0
    fq = text.find('"fps"')
    if fq >= 0:
        c = text.find(":", fq + 5)
        if c >= 0:
            fpsv = _strtol(text[c + 1:])
    if fend <= 0 or fpsv <= 0:
        return text, 0
    film = (fend + fpsv - 1) // fpsv
    n_patch = 0
    for m in re.finditer(r'"durationSec"', text):
        c = text.find(":", m.end())
        if c < 0:
            break
        if _strtol(text[c + 1:]) != film:
            n_patch += 1
    if n_patch == 0:
        return text, 0
    def repl(m):
        c = text.find(":", m.end())
        stored = _strtol(text[c + 1:])
        return '"durationSec":%d' % (film if stored != film else stored)
    fixed = re.sub(r'"durationSec":\s*[-+0-9]*', repl, text)
    return fixed, n_patch


def drafts_get(drafts_root, draft_id, aux_root=None, heal=False):
    """GET /v1/pipelines/drafts/:id (~5445). Returns (status, text) with
    the doc's VERBATIM bytes. The C click door heals corrupt docs
    (quarantine + stub) and stale durationSec values IN PLACE; a pure
    reader serves bytes as-is unless heal=True (durationSec patch only —
    the quarantine rewrite is never silent)."""
    if not draft_id_ok(draft_id):
        return 400, _err_body("bad id")
    path = None
    for root in (drafts_root, aux_root):
        if not root:
            continue
        cand = os.path.join(root, draft_id + ".json")
        if os.path.exists(cand):
            path = cand
            break
    if path is None:
        return 404, _err_body("draft not found")
    with open(path, "r", encoding="utf-8", errors="surrogateescape") as f:
        body = f.read()
    if heal:
        fixed, _ = _heal_duration_sec(body)
        if fixed != body:
            try:
                with open(path, "w", encoding="utf-8",
                          errors="surrogateescape") as f:
                    f.write(fixed)
            except OSError:
                pass
            body = fixed
    return 200, body


def drafts_delete(drafts_root, draft_id):
    """DELETE /v1/pipelines/drafts/:id — NO SUCH ROUTE in src/server.cpp
    (the C table registers Get/Post/Patch only, ~11311-11317). Answers
    with the unmatched-route error-handler shape (~11355) instead of
    inventing persistence the gateway does not have."""
    return 404, {"error": "not found",
                 "path": "/v1/pipelines/drafts/%s" % draft_id}


# ---------------------------------------------------------------------------
# POST /v1/pipelines/resume/:run_id — handle_pipelines_resume (~10300)
# ---------------------------------------------------------------------------

def _parse_yaml_stage_ids(yaml_text: str):
    """run_parse_stages (~434): the "- id: <x>" lines of a pipeline yaml."""
    ids = []
    for line in yaml_text.split("\n"):
        stripped = line.lstrip(" ")
        if stripped.startswith("- id: ") and len(stripped) > 6:
            v = stripped[6:]
            L = 0
            while L < len(v) and v[L] not in (" ", "\r"):
                L += 1
            if 0 < L < 64:
                ids.append(v[:L])
    return ids


def resume(server_root, run_id, body=None, pipelines_root=None,
           register=True):
    """POST /v1/pipelines/resume/:run_id. SEMANTICS (from C ~10300-10542):
    a resume does NOT restart the old run — it REQUEUES a brand-new run:
    read the stopped run's sidecar, copy model/prompt/seed/yaml, honor the
    optional body fields (lyrics, negative_prompt become run inputs;
    start_from re-enters at stage N with prior artifacts), mint a NEW
    collision-free run id, mkdir its output dir, write its sidecar
    (state "queued"), take a FIFO GPU ticket, and spawn the run thread.
    This port performs everything up to the sidecar write — the GPU
    ticket + thread are the queue system's, not a data reader's (INFERENCE
    LAW: no run is started here). Returns (202, {"run_id","status":"queued"})
    on success, else the C's error shapes."""
    output_root = os.path.join(server_root, "output")
    sc_path = os.path.join(output_root, run_id, "_pipeline.json")
    try:
        with open(sc_path, "r", encoding="utf-8", errors="surrogateescape") as f:
            spec = f.read()
    except OSError:
        return 404, _err_body("run sidecar not found")
    model = inf_json_string(spec, "model", 64)
    prompt = inf_json_string(spec, "prompt", 2048)
    seed = sidecar_num(spec, "seed", -1)
    yaml_buf = inf_json_string(spec, "yaml", 4096)
    if not model:
        return 400, _err_body("cannot resume: no model in sidecar")
    if pipelines_root is None:
        pipelines_root = os.path.join(server_root, "..", "pipelines")
    if not yaml_buf:
        # resolve the model's harvested pipeline, mirroring the C's
        # pipeline_yaml_for_model probes (<root>/<model>/pipeline.yaml)
        cand = os.path.join(pipelines_root, model, "pipeline.yaml")
        try:
            with open(cand, "r", encoding="utf-8",
                      errors="surrogateescape") as f:
                yaml_buf = f.read(65535)
        except OSError:
            return 400, _err_body("cannot resume: no pipeline for model")
    new_id = "run-%x-%x-%x" % (int(time.time()), threading.get_ident(),
                               next(_RUN_SEQ))
    if register:
        new_dir = os.path.join(output_root, new_id)
        os.makedirs(new_dir, exist_ok=True)
        stage_ids = _parse_yaml_stage_ids(yaml_buf)
        stages = [{"id": sid, "name": sid, "index": i, "status": "pending",
                   "artifacts": []} for i, sid in enumerate(stage_ids)]
        now = int(time.time())
        sidecar = {
            "run_id": new_id,
            "model": model,
            "prompt": prompt,
            "seed": seed,
            "created": now,
            "ended": now,
            "durationSec": 0,
            "status": "queued",
            "error": None,
            "stages": stages,
            "yaml": yaml_buf,
            "draft_id": "",
        }
        tmp = os.path.join(new_dir, "_pipeline.json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(sidecar, f, separators=(",", ":"), ensure_ascii=False)
        os.replace(tmp, os.path.join(new_dir, "_pipeline.json"))
    return 202, {"run_id": new_id, "status": "queued"}


# ---------------------------------------------------------------------------
# GET /editor/assets/runs/<run_id>/<file> — handle_asset (~6763)
# ---------------------------------------------------------------------------

def serve_asset(server_root, rel_path: str):
    """The artifact media tree. Root: <server_root>/output ONLY. Traversal
    guard mirrors C exactly: an empty rel or ANY ".." substring (not just
    path components) -> 400 {"error":"bad path"}; missing -> 404. Returns
    (status, bytes, content_type). A directory target reads as an empty
    200 body with an octet-stream type (the C's fopen-then-fread-fails
    behavior), not an error."""
    if not rel_path or ".." in rel_path:
        return 400, b'{"error":"bad path"}', _ERR_JSON
    path = os.path.join(server_root, "output", rel_path)
    try:
        with open(path, "rb") as f:
            data = f.read()
    except IsADirectoryError:
        return 200, b"", "application/octet-stream"
    except OSError:
        return 404, b'{"error":"artifact not found"}', _ERR_JSON
    return 200, data, content_type_of(rel_path)


# ---------------------------------------------------------------------------
# family param schemas — handle_family_param_schema[s] (~5853)
# ---------------------------------------------------------------------------

def family_param_schemas(family_ids) -> dict:
    """GET /v1/pipelines/families/param-schemas: the pydantic-style derived
    envelope (empty properties — ray parity) for every catalog family."""
    out = {}
    for fid in family_ids:
        if not fid:
            continue
        out[fid] = {
            "title": "%s_Params" % fid,
            "type": "object",
            "additionalProperties": False,
            "properties": {},
            "required": [],
        }
    return out


def family_param_schema(family_ids, family_id: str):
    """GET /v1/pipelines/families/:family_id/param-schema."""
    if family_id in family_ids:
        return 200, {
            "title": "%s_Params" % family_id,
            "type": "object",
            "additionalProperties": False,
            "properties": {},
            "required": [],
        }
    return 404, {"error": "Unknown family_id '%s'" % family_id,
                 "family_id": family_id}


def catalog_family_ids(plugins_root):
    """Data-driven family list: walk <plugins_root>/<owner>/models/<genre>/
    <model-id>/model.yaml and read the declared id (catalog_scan,
    src/catalog.c ~532). No engine or lane name is known here — the tree
    is the vocabulary."""
    ids = []
    try:
        owners = sorted(os.listdir(plugins_root))
    except OSError:
        return ids
    for owner in owners:
        models_dir = os.path.join(plugins_root, owner, "models")
        if not os.path.isdir(models_dir):
            continue
        for genre in sorted(os.listdir(models_dir)):
            genre_dir = os.path.join(models_dir, genre)
            if not os.path.isdir(genre_dir):
                continue
            for unit in sorted(os.listdir(genre_dir)):
                my = os.path.join(genre_dir, unit, "model.yaml")
                if not os.path.isfile(my):
                    continue
                try:
                    with open(my, "r", encoding="utf-8",
                              errors="surrogateescape") as f:
                        for line in f:
                            m = re.match(r"\s*-?\s*id:\s*(\S+)", line)
                            if m:
                                ids.append(m.group(1))
                                break
                except OSError:
                    continue
    return ids


# ---------------------------------------------------------------------------
# health + chrome registries — handle_health / handle_models /
# handle_lane_registry (~167, ~174, ~7076)
# ---------------------------------------------------------------------------

def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}


def models() -> dict:
    """GET /v1/models (custom format + OpenAI-compatible empty list)."""
    return {"object": "list", "data": []}


def provision(body_json, plugins_root):
    """POST /v1/models/provision -- queue a model download via comfy-cli.

    Accepts {"model": "<id>"} where id matches a model.yaml directory
    stem under plugins/*/models/<genre>/<id>/. Reads the provisions
    block and shells out to comfy model download (PIN LAW: the
    comfy binary routes through the deployment wrapper into the
    instance). Returns {"queued": true, "model": id, "detail": str}.
    """
    import os, subprocess
    try:
        import yaml as _yaml
    except ImportError:
        _yaml = None

    mid = (body_json.get("model") or "").strip()
    if not mid:
        return 400, {"error": "model is required", "queued": False, "model": ""}

    # scan plugins/*/models/<genre>/<id>/model.yaml
    models_root = os.path.join(plugins_root, "models")
    found_yaml = None
    if os.path.isdir(models_root):
        for genre in os.listdir(models_root):
            candidate = os.path.join(models_root, genre, mid, "model.yaml")
            if os.path.isfile(candidate):
                found_yaml = candidate
                break
            genre_dir = os.path.join(models_root, genre)
            if os.path.isdir(genre_dir):
                for entry in os.listdir(genre_dir):
                    if entry == mid and os.path.isfile(
                            os.path.join(genre_dir, entry, "model.yaml")):
                        found_yaml = os.path.join(genre_dir, entry, "model.yaml")
                        break

    if not found_yaml:
        return 404, {"error": "model %r not found in catalog" % mid,
                      "queued": False, "model": mid}

    cfg = _yaml.safe_load(open(found_yaml).read()) if _yaml else {}
    fam = cfg.get("family") if isinstance(cfg.get("family"), dict) else {}
    provisions = fam.get("provisions") or cfg.get("provisions") or []
    if not provisions:
        return 422, {"error": "model %r has no provisions block" % mid,
                      "queued": False, "model": mid}

    queued, errors = [], []
    for p in provisions:
        name = (p.get("name") or "").strip()
        url = (p.get("url") or "").strip()
        folder = (p.get("folder") or "").strip("/")
        if not name or not url:
            continue
        dest = "models/%s" % folder if folder else "models"
        try:
            r = subprocess.run(
                ["comfy", "model", "download", "--url", url,
                 "--relative-path", dest, "--filename", name],
                capture_output=True, text=True, timeout=7200)
            if r.returncode == 0:
                queued.append(name)
            else:
                errors.append({"file": name,
                               "error": (r.stderr or r.stdout)[:200]})
        except Exception as e:
            errors.append({"file": name, "error": str(e)[:200]})

    detail_parts = []
    if queued:
        detail_parts.append("downloaded: %s" % ", ".join(queued))
    if errors:
        detail_parts.append("errors: %d" % len(errors))
    return (200 if queued else 500), {
        "queued": bool(queued),
        "model": mid,
        "detail": "; ".join(detail_parts) or "no provisions matched",
        "errors": errors or None,
    }



# handle_lane_registry stubs: empty arrays are VALID registries (the
# editor treats them as "nothing registered", never as an error).
CHROME_STUBS = {
    "/v1/shell": {"entries": []},
    "/v1/right-panes": {"panes": []},
    "/v1/ui-slots": {"uiSlots": []},
    "/v1/themes": {"themes": []},
    "/v1/tags": {"tags": []},
    "/v1/services": {"services": []},
    "/v1/tools": {"tools": []},
    "/v1/plugins": {"plugins": []},
}


def chrome(path: str):
    """Data-driven reader for the chrome lanes: (status, dict). Unknown
    lanes answer the C error-handler shape."""
    if path in CHROME_STUBS:
        return 200, CHROME_STUBS[path]
    if path == "/v1/models":
        return 200, models()
    if path == "/v1/health":
        return 200, health()
    return 404, {"error": "not found", "path": path}


def themes():
    return CHROME_STUBS["/v1/themes"]


def tags():
    return CHROME_STUBS["/v1/tags"]


def services():
    return CHROME_STUBS["/v1/services"]


def right_panes():
    return CHROME_STUBS["/v1/right-panes"]


def ui_slots():
    return CHROME_STUBS["/v1/ui-slots"]


def tools():
    return CHROME_STUBS["/v1/tools"]


def shell():
    return CHROME_STUBS["/v1/shell"]


def plugins_registry():
    return CHROME_STUBS["/v1/plugins"]


# ===========================================================================
# SELF-TEST — python3 py/editor_runs.py
#   * deep-compares every GET route against tests/golden_http/* captures
#     (structural JSON equality; the C's unstable-sort tie groups are
#     compared as order-insensitive multisets, with a printed note);
#   * exercises the write doors against throwaway fixture trees (nothing
#     under the repo's output/ or pipelines/ is touched);
#   * optionally live-diffs yaml_detail / run_detail against the C server
#     at 127.0.0.1:33081 (GET probes only) when it is up.
#   Prints the FIRST divergence per mismatch; exits nonzero on drift.
# ===========================================================================

def _first_divergence(a, b, path="$"):
    """Path of the first structural difference between two JSON values."""
    if type(a) is not type(b) and not (
            isinstance(a, (int, float)) and isinstance(b, (int, float))):
        return "%s: type %s != %s" % (path, type(a).__name__, type(b).__name__)
    if isinstance(a, dict):
        if not isinstance(b, dict):
            return path
        for k in a:
            if k not in b:
                return "%s.%s: missing in golden" % (path, k)
        for k in b:
            if k not in a:
                return "%s.%s: extra in ours" % (path, k)
        for k in a:
            d = _first_divergence(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if not isinstance(b, list):
            return path
        if len(a) != len(b):
            return "%s: list length %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = _first_divergence(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    if a != b:
        return "%s: %r != %r" % (path, a, b)
    return None


def _cmp_runs_golden(server_root, drafts_root, gold, mine):
    """Ordered compare with the C's qsort-tie tolerance: rows may only
    shuffle inside exact (media, created) tie groups."""
    if mine == gold:
        return True, None
    if mine.get("count") != gold.get("count"):
        return False, "count: %r != %r" % (mine.get("count"), gold.get("count"))
    rows_m, rows_g = mine["runs"], gold["runs"]
    if len(rows_m) != len(rows_g):
        return False, "runs length: %d != %d" % (len(rows_m), len(rows_g))
    key = lambda r: json.dumps(r, sort_keys=True)
    if sorted(rows_m, key=key) != sorted(rows_g, key=key):
        gm = {r["run_id"]: r for r in rows_g}
        for i, rm in enumerate(rows_m):
            if rm != gm.get(rm["run_id"]):
                return False, "runs[%d] (%s): %s" % (
                    i, rm.get("run_id"),
                    _first_divergence(rm, gm.get(rm["run_id"]),
                                      "$.runs[%d]" % i))
        return False, "runs multiset mismatch"
    # same multiset, different order: legal only inside tie groups
    output_root = os.path.join(server_root, "output")
    keys = {}
    for name in os.listdir(output_root):
        if not name.startswith("run-"):
            continue
        buf = ""
        try:
            with open(os.path.join(output_root, name, "_pipeline.json"),
                      "r", encoding="utf-8", errors="surrogateescape") as f:
                buf = f.read(8191)
        except OSError:
            pass
        created = sidecar_num(buf, "created", 0)
        media = _run_dir_has_media(os.path.join(output_root, name))
        keys[name] = (media, created)
    idx_g = {r["run_id"]: i for i, r in enumerate(rows_g)}
    for i, rm in enumerate(rows_m):
        rg = rows_g[idx_g[rm["run_id"]]]
        if rm != rg and keys[rm["run_id"]] != keys[rg["run_id"]]:
            return False, ("runs[%d]: order change across tie groups "
                           "(%s <-> %s)" % (i, rm["run_id"], rg["run_id"]))
    return True, "order-only shuffle inside %d tie group(s) (C qsort " \
        "instability — multiset-identical)" % sum(
            1 for i, rm in enumerate(rows_m)
            if rm != rows_g[idx_g[rm["run_id"]]])


def _cmp_drafts_golden(drafts_root, gold, mine):
    """Ordered compare with mtime-tie tolerance."""
    if mine == gold:
        return True, None
    if mine.get("count") != gold.get("count"):
        return False, "count: %r != %r" % (mine.get("count"), gold.get("count"))
    dm, dg = mine["drafts"], gold["drafts"]
    if len(dm) != len(dg):
        return False, "drafts length: %d != %d" % (len(dm), len(dg))
    key = lambda r: json.dumps(r, sort_keys=True)
    if sorted(dm, key=key) != sorted(dg, key=key):
        gm = {r["draft_id"]: r for r in dg}
        for i, rm in enumerate(dm):
            if rm != gm.get(rm["draft_id"]):
                return False, "drafts[%d] (%s): %s" % (
                    i, rm.get("draft_id"),
                    _first_divergence(rm, gm.get(rm["draft_id"]),
                                      "$.drafts[%d]" % i))
        return False, "drafts multiset mismatch"
    mtime = {}
    for name in os.listdir(drafts_root):
        if name.endswith(".json"):
            try:
                mtime[name[:-5]] = int(os.stat(
                    os.path.join(drafts_root, name)).st_mtime)
            except OSError:
                pass
    idx_g = {r["draft_id"]: i for i, r in enumerate(dg)}
    for i, rm in enumerate(dm):
        rg = dg[idx_g[rm["draft_id"]]]
        if rm != rg and mtime.get(rm["draft_id"]) != mtime.get(rg["draft_id"]):
            return False, ("drafts[%d]: order change across mtime ties "
                           "(%s <-> %s)" % (i, rm["draft_id"], rg["draft_id"]))
    return True, "order-only shuffle inside mtime tie second(s)"


def _selftest():
    import shutil
    import tempfile
    import urllib.request

    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(here)
    golden = os.path.join(repo, "tests", "golden_http")
    # the C gateway runs with cwd = build/: its ./output is build/output,
    # ./drafts is build/drafts, ../pipelines is the repo pipelines tree.
    server_root = os.path.join(repo, "build")
    pipelines_root = os.path.join(repo, "pipelines")
    drafts_root = os.path.join(server_root, "drafts")

    failures = []
    passes = []

    def check(name, ok, detail=None):
        (passes if ok else failures).append(name)
        tag = "ok  " if ok else "DRIFT"
        print("[%s] %s%s" % (tag, name, "" if ok else
                             (" — first divergence: %s" % detail if detail
                              else "")))

    def load_golden(fname):
        with open(os.path.join(golden, fname), "r", encoding="utf-8") as f:
            return json.load(f)

    # ---- GET goldens -----------------------------------------------------
    ok, why = _cmp_runs_golden(server_root, drafts_root,
                               load_golden("pipelines_runs.json"),
                               runs(server_root))
    check("GET /v1/pipelines/runs", ok, why)
    if ok and why:
        print("      note: %s" % why)

    ok, why = _cmp_drafts_golden(drafts_root,
                                 load_golden("pipelines_drafts.json"),
                                 drafts_list(drafts_root))
    check("GET /v1/pipelines/drafts", ok, why)
    if ok and why:
        print("      note: %s" % why)

    got = yaml_list(pipelines_root)
    check("GET /v1/pipelines/yaml/list", got == load_golden("pipelines_yaml_list.json"),
          _first_divergence(got, load_golden("pipelines_yaml_list.json")))

    check("GET /v1/health", health() == load_golden("health.json"))
    for lane, fn in (("/v1/themes", themes), ("/v1/tags", tags),
                     ("/v1/services", services),
                     ("/v1/right-panes", right_panes),
                     ("/v1/ui-slots", ui_slots), ("/v1/tools", tools),
                     ("/v1/shell", shell), ("/v1/plugins", plugins_registry),
                     ("/v1/models", models)):
        want = load_golden(lane.replace("/v1/", "") + ".json")
        got = fn()
        check("GET %s" % lane, got == want,
              _first_divergence(got, want))

    # ---- yaml_detail: shape self-checks ----------------------------------
    st, det = yaml_detail(pipelines_root, "prop-flow.yaml")
    want_keys = ["name", "description", "nodes", "steps", "yaml"]
    ok = (st == 200 and list(det.keys()) == want_keys
          and det["name"] == "prop-flow"
          and [n["id"] for n in det["nodes"]]
          == ["concept", "mesh", "remesh", "views"]
          and all(s["family"] == s["service"] for s in det["steps"]))
    check("yaml_detail shape (prop-flow)", ok,
          "status=%r keys=%r" % (st, list(det.keys()) if isinstance(det, dict) else det))
    st, det = yaml_detail(pipelines_root, None)
    check("yaml_detail missing param -> 400", st == 400 and det == {"error": "missing yaml param"})
    st, det = yaml_detail(pipelines_root, "no-such-pipeline")
    check("yaml_detail unknown -> 404", st == 404 and det == {"error": "no such pipeline"})

    # params parsing: the calls-doc style params line parses to name/value
    # pairs (checked against a fixture below, where we control the yaml).

    # ---- write doors against throwaway fixtures --------------------------
    tmp = tempfile.mkdtemp(prefix="editor_runs_selftest_")
    try:
        proot = os.path.join(tmp, "pipelines")
        # -- yaml_save
        st, resp = yaml_save(proot, {"filename": "demo-flow",
                                     "steps": [
                                         {"id": "a", "type": "t1",
                                          "params": {"seed": 42, "ratio": 1.0}},
                                         {"type": "t2"}]})
        ok = (st == 201 and resp == {
            "filename": "demo-flow.yaml", "name": "demo-flow",
            "path": "../pipelines/demo-flow/pipeline.yaml"})
        check("POST yaml/save (create) -> 201", ok, "status=%r resp=%r" % (st, resp))
        text = open(os.path.join(proot, "demo-flow", "pipeline.yaml")).read()
        want = ("api: true\nname: demo-flow\nsteps:\n"
                "  - id: a\n    type: t1\n    params: {\"seed\":42,\"ratio\":1}\n"
                "  - id: demo-flow\n    type: t2\n")
        check("yaml/save file bytes (id default, float->int cJSON parity)",
              text == want, repr(text))
        st, resp = yaml_save(proot, {"filename": "demo-flow", "steps": [{"id": "a"}]})
        check("yaml/save exists w/o overwrite -> 409",
              st == 409 and resp == {"error": "pipeline exists — set overwrite:true to replace"},
              "status=%r resp=%r" % (st, resp))
        st, resp = yaml_save(proot, {"filename": "demo-flow", "overwrite": True,
                                     "name": "Demo!",
                                     "steps": [{"id": "a", "params": {"p": "x"}}]})
        ok = st == 200 and resp["name"] == "Demo!"
        check("yaml/save overwrite -> 200", ok, "status=%r resp=%r" % (st, resp))
        st, resp = yaml_save(proot, "{not json")
        check("yaml/save invalid JSON -> 400",
              st == 400 and resp == {"error": "invalid JSON"})
        st, resp = yaml_save(proot, {"steps": [{"id": "a"}]})
        check("yaml/save missing filename/steps -> 400",
              st == 400 and resp == {"error": "filename (string) and steps (non-empty array) required"})
        st, resp = yaml_save(proot, {"filename": "bad name!", "steps": [{"id": "a"}]})
        check("yaml/save bad stem -> 400",
              st == 400 and resp == {"error": "invalid filename — alphanumeric, dash, underscore only"})
        # detail reads a saved file back: params pairs with raw value spans
        st, det = yaml_detail(proot, "demo-flow")
        ok = (st == 200 and det["steps"][0]["params"]
              == [{"name": "p", "value": "x"}]
              and det["description"] == "")
        check("yaml_detail round-trips saved params", ok,
              "steps=%r" % (det.get("steps") if isinstance(det, dict) else det))
        # -- yaml_rename
        st, resp = yaml_rename(proot, {"filename": "demo-flow.yaml", "newName": "renamed-flow"})
        check("POST yaml/rename -> 200",
              st == 200 and resp == {"renamed": "renamed-flow.yaml"},
              "status=%r resp=%r" % (st, resp))
        st, resp = yaml_rename(proot, {"filename": "missing-flow", "newName": "x-flow"})
        check("yaml/rename missing -> 404",
              st == 404 and resp == {"error": "no such pipeline"})
        yaml_save(proot, {"filename": "other-flow", "steps": [{"id": "b"}]})
        st, resp = yaml_rename(proot, {"filename": "renamed-flow", "newName": "other-flow"})
        check("yaml/rename target exists -> 409",
              st == 409 and resp == {"error": "target name already exists"})
        # -- yaml_delete
        st, resp = yaml_delete(proot, "other-flow.yaml")
        check("DELETE yaml/delete -> 200",
              st == 200 and resp == {"deleted": "other-flow.yaml"})
        st, resp = yaml_delete(proot, "other-flow")
        check("yaml/delete missing -> 404",
              st == 404 and resp == {"error": "no such pipeline"})
        st, resp = yaml_delete(proot, "../etc/passwd")
        check("yaml/delete traversal stem -> 400",
              st == 400 and resp == {"error": "invalid filename"})
        # -- nonexistent C routes answer the unmatched-route shape
        st, resp = yaml_validate(proot, {})
        check("POST yaml/validate (no C route) -> 404 error-handler shape",
              st == 404 and resp == {"error": "not found",
                                     "path": "/v1/pipelines/yaml/validate"})
        st, resp = yaml_validate_simple(proot, {})
        check("POST yaml/validate-simple (no C route) -> 404",
              st == 404 and resp["path"] == "/v1/pipelines/yaml/validate-simple")

        # -- drafts fixtures
        droot = os.path.join(tmp, "drafts")
        st, resp = drafts_save(droot, {"intent": "a test card", "stages": [
            {"title": "S1", "service": "svc", "params": {"x": 1}},
            {"calls": "[{\"text\":\"b\"}]"},
        ]})
        did = resp.get("draftId") if isinstance(resp, dict) else None
        ok = (st == 200 and did and resp["stages"][0]["id"] == "s_0"
              and resp["stages"][0]["inputs"] == [""]
              and resp["stages"][0]["provenance"] == "agent"
              and resp["stages"][1]["calls"] == [{"text": "b"}])
        check("POST /v1/pipelines/drafts -> {draftId, stages} + birth contract",
              ok, "status=%r resp=%r" % (st, resp))
        doc = json.loads(open(os.path.join(droot, did + ".json")).read())
        ok = (list(doc.keys())[:6] == ["draft_id", "intent", "stages",
                                       "status", "createdAt", "completedAt"]
              and doc["status"] == "ready" and doc["completedAt"] is None)
        check("draft doc carries ray birth contract key order", ok,
              "keys=%r" % list(doc.keys()))
        st, body = drafts_get(droot, did)
        ok = st == 200 and json.loads(body)["draft_id"] == did
        check("GET /v1/pipelines/drafts/:id -> verbatim doc", ok,
              "status=%r" % st)
        st, body = drafts_get(droot, "bad/id!!")
        check("drafts/:id bad id -> 400",
              st == 400 and body == {"error": "bad id"})
        st, body = drafts_get(droot, "draft-none")
        check("drafts/:id missing -> 404",
              st == 404 and body == {"error": "draft not found"})
        st, body = drafts_get(droot, did, aux_root=None)
        lst = drafts_list(droot)
        ok = (lst["count"] == 1
              and lst["drafts"][0] == {"draft_id": did, "model": "svc",
                                       "name": "a test card"})
        check("GET /v1/pipelines/drafts (list fallbacks: intent, service)",
              ok, "list=%r" % lst)
        # name falls back through intent when absent
        drafts_save(droot, {"title": "by title", "stages": []}, draft_id="draft-t1")
        lst = drafts_list(droot)
        row = [d for d in lst["drafts"] if d["draft_id"] == "draft-t1"][0]
        check("draft list name fallback title", row["name"] == "by title",
              "row=%r" % row)
        st, resp = drafts_delete(droot, did)
        check("DELETE drafts/:id (no C route) -> 404 error-handler shape",
              st == 404 and resp == {"error": "not found",
                                     "path": "/v1/pipelines/drafts/%s" % did})

        # -- run fixture: status restore + resume + assets + workflow export
        oroot = os.path.join(tmp, "server")
        os.makedirs(os.path.join(oroot, "output", "run-fixture-1"), exist_ok=True)
        sidecar = {
            "run_id": "run-fixture-1", "model": "demo-model",
            "prompt": "a prompt \"with quotes\"", "seed": 7,
            "created": 1700000000, "ended": 1700000009, "durationSec": 9,
            "status": "error",
            "error": "boom \"quoted\"",
            "stages": [{"id": "gen", "name": "gen", "index": 0,
                        "status": "failed", "error": "boom",
                        "artifacts": ["out.png"]}],
            "yaml": "steps:\n  - id: gen\n    type: demo\n",
            "draft_id": "draft-t1",
        }
        with open(os.path.join(oroot, "output", "run-fixture-1", "_pipeline.json"), "w") as f:
            json.dump(sidecar, f)
        with open(os.path.join(oroot, "output", "run-fixture-1", "_request.json"), "w") as f:
            json.dump({"prompt": "per-run prompt"}, f)
        with open(os.path.join(oroot, "output", "run-fixture-1", "out.png"), "wb") as f:
            f.write(b"\x89PNG-fixture")
        with open(os.path.join(oroot, "output", "run-fixture-1", "_comfyui_win1.json"), "w") as f:
            json.dump({"nodes": []}, f)

        st, det = run_detail(oroot, "run-fixture-1")
        # C restore path maps error->failed and (per the C off-by-one)
        # always serves error:""
        ok = (st == 200 and det["status"] == "failed"
              and det["state"] == "failed" and det["error"] == ""
              and det["restored_from_sidecar"] is True
              and det["created"] == 1700000000 and det["durationSec"] == 9
              and det["yaml_filename"] == "demo-model"
              and det["draft_id"] == "draft-t1"
              and det["artifacts"][0]["name"] == "out.png")
        check("GET status/:id restore shape (error->failed, error:'' parity)",
              ok, "status=%r det=%r" % (st, det))
        # placeholder-prompt injection: stage gains params.prompt from
        # _request.json and params.seed from the sidecar
        stg = det["stages"][0]
        ok = stg.get("params") == {"prompt": "per-run prompt", "seed": 7}
        check("status restore injects real prompt+seed into stage params",
              ok, "stage=%r" % stg)
        st, det = run_detail(oroot, "run-nosuch")
        check("status/:id unknown -> 404",
              st == 404 and det == {"error": "unknown run_id"})

        # runs() over the fixture (no sidecar-less dirs, no underscore)
        listing = runs(oroot, drafts_root=droot)
        row = listing["runs"][0]
        ok = (listing["count"] == 1 and row["status"] == "error"
              and row["name"] == "demo-model" and row["seed"] == 7
              and row["draft_id"] == "draft-t1"
              and row["thumbnail"].endswith("/out.png")
              and row["artifacts"][0]["type"] == "image")
        check("runs() reads the fixture row", ok, "row=%r" % row)

        # serve_asset: root is <server_root>/output only, ".." anywhere -> 400
        st, data, ctype = serve_asset(oroot, "run-fixture-1/out.png")
        ok = st == 200 and data == b"\x89PNG-fixture" and ctype == "image/png"
        check("GET /editor/assets/runs/<run>/<file>", ok,
              "status=%r ctype=%r" % (st, ctype))
        st, data, ctype = serve_asset(oroot, "run-fixture-1/../../drafts/x")
        check("asset traversal '..' -> 400",
              st == 400 and data == b'{"error":"bad path"}')
        st, data, ctype = serve_asset(oroot, "run-fixture-1/nope.png")
        check("asset missing -> 404",
              st == 404 and data == b'{"error":"artifact not found"}')

        # export_comfyui (the C workflow door)
        st, idx = export_comfyui(oroot, "run-fixture-1")
        ok = (st == 200 and idx["run_id"] == "run-fixture-1"
              and idx["workflows"][0]["window"] == "win1"
              and idx["workflows"][0]["bytes"] > 0)
        check("workflow export index mode", ok, "idx=%r" % idx)
        st, doc = export_comfyui(oroot, "run-fixture-1", window="win1")
        check("workflow export fetch mode", st == 200 and doc == {"nodes": []})
        st, doc = export_comfyui(oroot, "run-fixture-1", window="nope")
        check("workflow fetch missing -> 404 exact string",
              st == 404 and doc == {"error": "workflow 'nope' not found for run 'run-fixture-1'"})
        st, doc = export_comfyui(oroot, "../evil")
        check("workflow invalid run id -> 400",
              st == 400 and doc == {"error": "invalid run id"})

        # resume: requeue semantics — new run id, new dir, queued sidecar
        os.makedirs(os.path.join(proot, "demo-model"), exist_ok=True)
        with open(os.path.join(proot, "demo-model", "pipeline.yaml"), "w") as f:
            f.write("steps:\n  - id: gen\n    type: demo\n")
        st, resp = resume(oroot, "run-fixture-1", {},
                          pipelines_root=proot)
        new_id = resp.get("run_id") if isinstance(resp, dict) else None
        ok = (st == 202 and resp == {"run_id": new_id, "status": "queued"}
              and new_id != "run-fixture-1"
              and os.path.isdir(os.path.join(oroot, "output", new_id)))
        check("POST resume/:id -> 202 requeue (NEW run id, queued sidecar)",
              ok, "status=%r resp=%r" % (st, resp))
        sc = json.loads(open(os.path.join(oroot, "output", new_id,
                                          "_pipeline.json")).read())
        ok = (sc["model"] == "demo-model" and sc["prompt"] == "a prompt \"with quotes\""
              and sc["seed"] == 7 and sc["status"] == "queued"
              and sc["stages"][0]["id"] == "gen" and sc["error"] is None)
        check("resume sidecar copies spec (model/prompt/seed/yaml stages)",
              ok, "sidecar=%r" % sc)
        st, resp = resume(oroot, "run-nosuch", {}, pipelines_root=proot)
        check("resume missing sidecar -> 404",
              st == 404 and resp == {"error": "run sidecar not found"})
        # model with no pipeline on disk -> the C's loud 400
        os.makedirs(os.path.join(oroot, "output", "run-fixture-2"), exist_ok=True)
        with open(os.path.join(oroot, "output", "run-fixture-2", "_pipeline.json"), "w") as f:
            json.dump({"run_id": "run-fixture-2", "model": "ghost-model"}, f)
        st, resp = resume(oroot, "run-fixture-2", {}, pipelines_root=proot)
        check("resume no pipeline -> 400",
              st == 400 and resp == {"error": "cannot resume: no pipeline for model"})
        # no model in sidecar -> 400
        os.makedirs(os.path.join(oroot, "output", "run-fixture-3"), exist_ok=True)
        with open(os.path.join(oroot, "output", "run-fixture-3", "_pipeline.json"), "w") as f:
            json.dump({"run_id": "run-fixture-3", "prompt": "p"}, f)
        st, resp = resume(oroot, "run-fixture-3", {}, pipelines_root=proot)
        check("resume no model -> 400",
              st == 400 and resp == {"error": "cannot resume: no model in sidecar"})

        # family param schemas
        fams = ["alpha", "beta"]
        got = family_param_schemas(fams)
        ok = got["alpha"] == {"title": "alpha_Params", "type": "object",
                              "additionalProperties": False,
                              "properties": {}, "required": []}
        check("GET families/param-schemas envelope", ok, "got=%r" % got)
        st, one = family_param_schema(fams, "alpha")
        check("GET families/:id/param-schema", st == 200 and one == got["alpha"])
        st, one = family_param_schema(fams, "zzz")
        check("families/:id unknown -> 404 exact shape",
              st == 404 and one == {"error": "Unknown family_id 'zzz'",
                                    "family_id": "zzz"})
        # catalog scan is data-driven over the real plugins tree
        ids = catalog_family_ids(os.path.join(repo, "plugins"))
        check("catalog_family_ids scans the plugins tree (non-empty, no "
              "engine names in code)", len(ids) > 0, "ids=%r" % ids[:5])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # ---- optional live C probes (READ-ONLY, GET) --------------------------
    live = 0
    try:
        base = "http://127.0.0.1:33081"
        with urllib.request.urlopen(base + "/v1/health", timeout=3) as r:
            if json.loads(r.read()) != health():
                failures.append("live /v1/health")
            else:
                live += 1
        for name in ("prop-flow", "humanoid-flow", "audio-native-tts"):
            with urllib.request.urlopen(
                    base + "/v1/pipelines/yaml/detail?yaml=" + name,
                    timeout=5) as r:
                want = json.loads(r.read())
            st, got = yaml_detail(pipelines_root, name)
            if got != want:
                check("live yaml_detail %s" % name, False,
                      _first_divergence(got, want, "$"))
            else:
                live += 1
        # a couple of run restores, skipping registry-owned ids
        checked = 0
        for rid in ("run-6a97cc08-7fa6797fa6c0-26",
                    "run-6a976e6a-76ef17fff6c0-0",
                    "run-6a97c34a-7fa67b7fe6c0-24"):
            with urllib.request.urlopen(
                    base + "/v1/pipelines/status/" + rid, timeout=5) as r:
                want = json.loads(r.read())
            if not want.get("restored_from_sidecar"):
                continue                     # live-registry shape: out of scope
            st, got = run_detail(server_root, rid)
            if got != want:
                check("live status %s" % rid, False,
                      _first_divergence(got, want, "$"))
            else:
                checked += 1
        live += checked
        print("[info] live C probes passed: %d" % live)
    except OSError as e:
        print("[info] live C server not reachable (%s) — live probes skipped"
              % e.__class__.__name__)

    print("\n%d passed, %d drifted" % (len(passes), len(failures)))
    if failures:
        for f in failures:
            print("  DRIFT: %s" % f)
        raise SystemExit(1)
    raise SystemExit(0)


if __name__ == "__main__":
    _selftest()
