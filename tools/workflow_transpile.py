"""workflow_transpile.py — extract ComfyScript python classes from
workflow files (the transpiler trick, as a tool).

ComfyScript's transpiler turns an API-format workflow into the python
class composition — but author files from the wild arrive as web-UI
format carrying THREE things the transpiler refuses:

  1. SUBGRAPH template instances (UUID-typed nodes) — the meat of
     modern workflows (plaguekind's sampler lane is one) hides inside
     `definitions.subgraphs`. This tool inlines every instance the way
     the UI's "export API" does:
       - internal links are OBJECTS {id, origin_id, origin_slot,
         target_id, target_slot, type}
       - sentinel origin_id == -10  = the subgraph's INPUT boundary
         (slot indexes def.inputs[i]; linkIds fan a value IN)
       - sentinel target_id == -20  = the OUTPUT boundary (slot
         indexes def.outputs[j]; linkIds fan a value OUT)
       - the instance's widgets_values override the exposed WIDGET
         inputs (def.inputs order, widget-typed entries only), pushed
         onto the internal consumer's widget slot
       - nested subgraphs inline bottom-up (the worklist loops)
  2. UI-only debris (Note, MarkdownNote, rgthree, PrimitiveNode) —
     dropped; links to dropped nodes are severed (and the AUTHORS'
     OWN dangling links — ComfyUI saves those — are severed loudly)
  3. classes the local instance never installed — the vocabulary can
     be MERGED from several --api endpoints (or --object-info files),
     because a study copy only needs the class INPUT SPECS to
     transpile, never a live install

Usage:
  uv run python tools/workflow_transpile.py REF.json [-o OUT.py]
      [--api URL ...] [--object-info FILE ...] [--census] [--api-out F]

  --census      print the class census (node counts per class) instead
                of/in addition to transpiling
  --api-out     also write the expanded API-format json

The output python is the extracted class composition — the honest
form for structural comparison against our composed workflows.
"""

import argparse
import json
import sys
import threading
import urllib.request
from collections import Counter
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

WidgetValues = List[Any]
NodeTable = Dict[int, Dict[str, Any]]
LinkTable = Dict[int, List[int]]
Overrides = Dict[Tuple[int, str], Any]

WIDGETISH: Set[str] = {"COMBO", "INT", "FLOAT", "STRING", "BOOLEAN"}
UI_ONLY: Tuple[str, ...] = ("Note", "MarkdownNote", "PrimitiveNode")
UI_SUBSTR: Tuple[str, ...] = ("rgthree",)


# ── vocabulary ───────────────────────────────────────────────────────────────

def load_object_info(apis: List[str],
                     files: List[str]) -> Dict[str, Any]:
    """Merge node input specs from live instances and/or json dumps."""
    oi: Dict[str, Any] = {}
    for f in files:
        rows: Dict[str, Any] = json.loads(Path(f).read_text())
        oi.update(rows)
    assert oi or not files
    for api in apis:
        try:
            live: Dict[str, Any] = json.loads(urllib.request.urlopen(
                api.rstrip("/") + "/object_info", timeout=60).read())
            oi.update(live)
        except Exception as e:                      # noqa: BLE001
            sys.stderr.write("warn: %s unreachable (%s)\n" % (api, e))
    if not oi:
        raise SystemExit("no vocabulary: pass --api and/or --object-info")
    return {str(k): v for k, v in oi.items()}


# ── subgraph inlining ────────────────────────────────────────────────────────

def _ilink(sg: Dict[str, Any], lid: int) -> Dict[str, Any]:
    links: List[Dict[str, Any]] = sg["links"]
    for l in links:
        if l["id"] == lid:
            return l
    raise KeyError("subgraph link %s not found" % lid)


def _slot_name(node: Dict[str, Any], slot: int) -> Optional[str]:
    ins = node.get("inputs") or []
    return ins[slot]["name"] if slot < len(ins) else None


def expand_subgraphs(wf: Dict[str, Any]
                     ) -> Tuple[NodeTable, LinkTable, Overrides]:
    """Inline every subgraph instance into parent space.

    Returns (nodes, links, widget_overrides) where links are parent
    6-arrays [lid, src, src_slot, dst, dst_slot, type] and overrides
    carry (fresh_node_id, input_name) -> value for exposed widgets.
    """
    defs = {s["id"]: s
            for s in wf.get("definitions", {}).get("subgraphs", [])}
    nodes: NodeTable = {n["id"]: dict(n) for n in wf["nodes"]}
    links: LinkTable = {l[0]: list(l) for l in wf.get("links", [])}
    next_id = [max(nodes, default=0) + 1000]
    overrides: Overrides = {}

    def fresh() -> int:
        next_id[0] += 1
        return next_id[0]

    while True:
        insts = [i for i, n in nodes.items() if n["type"] in defs]
        if not insts:
            break
        for iid in insts:
            inst = nodes.pop(iid)
            sg = defs[inst["type"]]
            remap: Dict[int, int] = {}
            for inode in sg["nodes"]:
                fid = fresh()
                remap[inode["id"]] = fid
                cp = dict(inode)
                cp["id"] = fid
                nodes[fid] = cp
            # exposed widget overrides: instance wv in def.inputs order
            wq: WidgetValues = list(inst.get("widgets_values") or [])
            for sgin in sg["inputs"]:
                if sgin.get("type") not in WIDGETISH:
                    continue
                val = wq.pop(0) if wq else None
                if val is None:
                    continue
                for lid in sgin.get("linkIds", []):
                    il = _ilink(sg, lid)
                    tgt = remap.get(il["target_id"])
                    if tgt is None:
                        continue
                    name = _slot_name(nodes[tgt], il["target_slot"])
                    if name is not None:
                        overrides[(tgt, name)] = val
            # internal links (both endpoints real) import to parent
            for il in sg["links"]:
                o, t = il["origin_id"], il["target_id"]
                if o == -10 or t == -20:
                    continue                # boundary: wired below
                if o not in remap or t not in remap:
                    sys.stderr.write(
                        "sever dangling internal link %s (%s->%s) in %s\n"
                        % (il["id"], o, t, sg.get("name")))
                    continue
                links[fresh()] = [il["id"], remap[o], il["origin_slot"],
                                  remap[t], il["target_slot"], il["type"]]
            # re-wire parent links that touched the instance
            for lid in list(links):
                l = links[lid]
                if l[1] == iid:                    # instance was SOURCE
                    outs = sg["outputs"][l[2]].get("linkIds", [])
                    if not outs:
                        del links[lid]
                        continue
                    il = _ilink(sg, outs[0])
                    l[1], l[2] = remap[il["origin_id"]], il["origin_slot"]
                if l[3] == iid:                    # instance was TARGET
                    for il in [_ilink(sg, i) for i in
                               sg["inputs"][l[4]].get("linkIds", [])]:
                        nl = list(l)
                        nl[0] = fresh()
                        nl[3] = remap[il["target_id"]]
                        nl[4] = il["target_slot"]
                        links[nl[0]] = nl
                    del links[lid]
    return nodes, links, overrides


# ── API conversion ───────────────────────────────────────────────────────────

def _is_ui(cls: str) -> bool:
    return (cls in UI_ONLY
            or any(s in cls for s in UI_SUBSTR))


def to_api(nodes: NodeTable, links: LinkTable, overrides: Overrides,
           oi: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Expanded web nodes -> API format {id: {class_type, inputs}}."""
    typed: Dict[str, Tuple[str, Dict[str, Tuple[Any, ...]]]] = {}
    for nid, n in sorted(nodes.items()):
        cls = n["type"]
        if cls not in oi or _is_ui(cls):
            sys.stderr.write("drop: %s #%s\n" % (cls, nid))
            continue
        inp = oi[cls]["input"]
        named: Dict[str, Tuple[Any, ...]] = {}
        for i in n.get("inputs") or []:
            if i.get("link") is not None:
                named[i["name"]] = ("link", i["link"])
        wv: WidgetValues = list(n.get("widgets_values") or [])
        for group in (inp.get("required") or {},
                      inp.get("optional") or {}):
            for k in group:
                if k in named:
                    continue
                spec = group[k][0]
                v = wv.pop(0) if wv else None
                if isinstance(spec, list) and isinstance(v, list) and v \
                        and isinstance(v[0], (str, int, float, bool)):
                    v = v[0]                # seed-control [v, opts] pairs
                named[k] = ("widget", v)
        typed[str(nid)] = (cls, named)

    lids = {lid: (str(l[1]), l[2]) for lid, l in links.items()}
    api: Dict[str, Dict[str, Any]] = {}
    for nid_str, (cls, named) in typed.items():
        row: Dict[str, Any] = {"class_type": cls, "inputs": {}}
        for k, v in named.items():
            if v[0] == "link":
                src = lids.get(v[1])
                if src is None or src[0] not in typed:
                    continue                # severed end
                row["inputs"][k] = [src[0], src[1]]
            else:
                row["inputs"][k] = overrides.get(
                    (int(nid_str), k), v[1])
        api[nid_str] = row
    return api


# ── transpile (public API only: a scratch endpoint serves the vocab) ────────

class _VocabServer:
    """One-endpoint object_info server — WorkflowToScriptTranspiler
    fetches its vocabulary over HTTP by construction, so merged specs
    ride a loopback server instead of monkeypatching the library."""

    def __init__(self, oi: Dict[str, Any], port: int = 18999) -> None:
        self.oi = oi
        self.port = port
        self._srv: Optional[HTTPServer] = None

    def __enter__(self) -> str:
        oi = self.oi

        class H(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                body = json.dumps(
                    oi if self.path.startswith("/object_info")
                    else {}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *a: Any) -> None:
                pass

        self._srv = HTTPServer(("127.0.0.1", self.port), H)
        threading.Thread(target=self._srv.serve_forever,
                         daemon=True).start()
        return "http://127.0.0.1:%d/" % self.port

    def __exit__(self, *exc: Any) -> None:
        if self._srv is not None:
            self._srv.shutdown()


def transpile(api_wf: Dict[str, Dict[str, Any]],
              oi: Dict[str, Any]) -> str:
    """API workflow -> ComfyScript python (the extracted classes)."""
    from comfy_script.transpile import (  # type: ignore[import-untyped]
        WorkflowToScriptTranspiler)
    with _VocabServer(oi) as url:
        t = WorkflowToScriptTranspiler(json.dumps(api_wf), url)
        out: str = t.to_script(runtime=False)
        return out


# ── census ───────────────────────────────────────────────────────────────────

def census(api_wf: Dict[str, Dict[str, Any]]
           ) -> Counter[str]:
    return Counter(v["class_type"] for v in api_wf.values())


# ── door ─────────────────────────────────────────────────────────────────────

def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        description="Extract ComfyScript python classes from a "
                    "workflow file (subgraphs inlined, UI debris "
                    "dropped).")
    ap.add_argument("workflow", help="workflow json (web-UI or API "
                                     "format)")
    ap.add_argument("-o", "--out", help="write python here (default "
                                        "stdout)")
    ap.add_argument("--api", action="append", default=[],
                    help="object_info source URL (repeatable; merged)")
    ap.add_argument("--object-info", action="append", default=[],
                    help="object_info json file (repeatable; merged)")
    ap.add_argument("--census", action="store_true",
                    help="print the class census")
    ap.add_argument("--api-out", help="also write the expanded "
                                      "API-format json here")
    ap.add_argument("--no-transpile", action="store_true",
                    help="stop at expansion + census (no vocabulary "
                         "needed)")
    args = ap.parse_args(argv)

    wf = json.loads(Path(args.workflow).read_text())
    if "nodes" in wf and "links" in wf:            # web-UI format
        nodes, links, overrides = expand_subgraphs(wf)
        oi: Dict[str, Any] = ({} if args.no_transpile or not
                              (args.api or args.object_info)
                              else load_object_info(args.api,
                                                    args.object_info))
        api_wf = to_api(nodes, links, overrides, oi)
    else:
        api_wf = wf                                # already API format

    if args.api_out:
        Path(args.api_out).write_text(json.dumps(api_wf, indent=1))
        sys.stderr.write("api json: %s (%d nodes)\n"
                         % (args.api_out, len(api_wf)))

    if args.census:
        c = census(api_wf)
        print("== %s: %d nodes, %d classes"
              % (args.workflow, sum(c.values()), len(c)))
        for k, n in c.most_common():
            print("   %3d %s" % (n, k))

    if args.no_transpile:
        return 0
    if not (args.api or args.object_info):
        sys.stderr.write("no vocabulary: pass --api/--object-info or "
                         "--no-transpile\n")
        return 2
    script = transpile(api_wf, load_object_info(args.api,
                                                args.object_info))
    if args.out:
        Path(args.out).write_text(script)
        sys.stderr.write("python: %s (%d lines)\n"
                         % (args.out, script.count("\n")))
    else:
        print(script)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
