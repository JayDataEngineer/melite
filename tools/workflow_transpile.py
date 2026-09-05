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
from types import TracebackType
from typing import Protocol, TypedDict

# Honest ComfyUI shapes (annotation-only rows and aliases; no
# runtime behavior). The web-UI documents arrive as wild json, so
# every document row is total=False: seats the code never touches
# stay undeclared, never lied about.
WidgetValue = str | int | float | bool | list[str | int | float | bool] | dict[str, str | int | float | bool | None] | None
WidgetValues = list[WidgetValue]


class SocketIn(TypedDict, total=False):
    """A web-UI input socket ({name, type, link})."""
    name: str
    type: str
    link: int | None


class SocketOut(TypedDict, total=False):
    """A web-UI output socket ({name, type, ...})."""
    name: str
    type: str


class WebNode(TypedDict, total=False):
    """A web-UI node: id/type plus socket arrays and widget values."""
    id: int
    type: str
    inputs: list[SocketIn]
    outputs: list[SocketOut]
    widgets_values: WidgetValues


NodeTable = dict[int, WebNode]
# A parent link is the 6-array [lid, src, src_slot, dst, dst_slot,
# type]. The lid/slot seats are ints on every real workflow; the row
# itself is a raw json array, never validated, so the seats stay
# int | str and the two indexing seats narrow by isinstance below.
LinkRow = list[int | str]
LinkTable = dict[int | str, LinkRow]
Overrides = dict[tuple[int, str], WidgetValue]


class SubgraphLink(TypedDict, total=False):
    """A subgraph internal link object ({id, origin_id, ...})."""
    id: int
    origin_id: int
    origin_slot: int
    target_id: int
    target_slot: int
    type: str


class SubgraphPort(TypedDict, total=False):
    """A subgraph input/output port ({name, type, linkIds})."""
    name: str
    type: str
    linkIds: list[int]


class SubgraphDef(TypedDict, total=False):
    """A subgraph definition (nodes + ports + internal links)."""
    id: str
    name: str
    nodes: list[WebNode]
    inputs: list[SubgraphPort]
    outputs: list[SubgraphPort]
    links: list[SubgraphLink]


SubgraphDefs = dict[str, list[SubgraphDef]]


class WorkflowDoc(TypedDict, total=False):
    """The web-UI workflow document."""
    nodes: list[WebNode]
    links: list[LinkRow]
    definitions: SubgraphDefs


# Merged object_info vocabulary: class name -> node spec.
ParamSpec = list[str | list[str] | dict[str, str | int | float | bool | None]]
ParamGroup = dict[str, ParamSpec]
InputSection = dict[str, ParamGroup]


class NodeSpec(TypedDict, total=False):
    """One class's object_info entry — the input spec is the only
    seat this tool reads."""
    input: InputSection


ObjectInfo = dict[str, NodeSpec]
# API-format workflow: node id -> {class_type, inputs}.
ApiNodeInputs = dict[str, list[str | int] | WidgetValue]


class ApiNode(TypedDict, total=False):
    """One API-format node ({class_type, inputs})."""
    class_type: str
    inputs: ApiNodeInputs


ApiWorkflow = dict[str, ApiNode]


class _Transpiler(Protocol):
    """The composed-workflow surface this tool uses from the
    untyped comfy_script package (no py.typed upstream): the
    Protocol declares the seats honestly, import_module performs
    the identical import."""
    def __init__(self, api_json: str, url: str) -> None: ...
    def to_script(self, runtime: bool = ...) -> str: ...

WIDGETISH: set[str] = {"COMBO", "INT", "FLOAT", "STRING", "BOOLEAN"}
UI_ONLY: tuple[str, ...] = ("Note", "MarkdownNote", "PrimitiveNode")
UI_SUBSTR: tuple[str, ...] = ("rgthree",)


# ── vocabulary ───────────────────────────────────────────────────────────────

def load_object_info(apis: list[str],
                     files: list[str]) -> ObjectInfo:
    """Merge node input specs from live instances and/or json dumps."""
    oi: ObjectInfo = {}
    for f in files:
        rows: ObjectInfo = json.loads(Path(f).read_text())
        oi.update(rows)
    assert oi or not files
    for api in apis:
        try:
            live: ObjectInfo = json.loads(urllib.request.urlopen(
                api.rstrip("/") + "/object_info", timeout=60).read())
            oi.update(live)
        except Exception as e:                      # noqa: BLE001
            sys.stderr.write("warn: %s unreachable (%s)\n" % (api, e))
    if not oi:
        raise SystemExit("no vocabulary: pass --api and/or --object-info")
    return {str(k): v for k, v in oi.items()}


# ── subgraph inlining ────────────────────────────────────────────────────────

def _ilink(sg: SubgraphDef, lid: int) -> SubgraphLink:
    links: list[SubgraphLink] = sg["links"]
    for l in links:
        if l["id"] == lid:
            return l
    raise KeyError("subgraph link %s not found" % lid)


def _slot_name(node: WebNode, slot: int) -> str | None:
    ins = node.get("inputs") or []
    return ins[slot]["name"] if slot < len(ins) else None


def expand_subgraphs(wf: WorkflowDoc
                     ) -> tuple[NodeTable, LinkTable, Overrides]:
    """Inline every subgraph instance into parent space.

    Returns (nodes, links, widget_overrides) where links are parent
    6-arrays [lid, src, src_slot, dst, dst_slot, type] and overrides
    carry (fresh_node_id, input_name) -> value for exposed widgets.
    """
    defs = {s["id"]: s
            for s in wf.get("definitions", {}).get("subgraphs", [])}
    nodes: NodeTable = {n["id"]: n.copy() for n in wf["nodes"]}
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
            remap: dict[int, int] = {}
            for inode in sg["nodes"]:
                fid = fresh()
                remap[inode["id"]] = fid
                cp = inode.copy()
                cp["id"] = fid
                nodes[fid] = cp
            # exposed widget overrides: instance wv in def.inputs
            # order. The boundary links fanning a widget value IN are
            # NOT graph edges — the consumers' socket refs to them
            # are cleared below and the value rides `overrides`.
            wq: WidgetValues = list(inst.get("widgets_values") or [])
            widget_lids: set[int] = set()
            for sgin in sg["inputs"]:
                if sgin.get("type") not in WIDGETISH:
                    continue
                val = wq.pop(0) if wq else None
                for wlid in sgin.get("linkIds", []):
                    widget_lids.add(wlid)
                    if val is None:
                        continue
                    il = _ilink(sg, wlid)
                    tgt = remap.get(il["target_id"])
                    if tgt is None:
                        continue
                    name = _slot_name(nodes[tgt], il["target_slot"])
                    if name is not None:
                        overrides[(tgt, name)] = val
            # internal links (both endpoints real) import to parent;
            # lid_remap carries internal lid -> parent lid so the
            # imported nodes' socket refs stay resolvable
            lid_remap: dict[int, int] = {}
            for il in sg["links"]:
                o, t = il["origin_id"], il["target_id"]
                if o == -10 or t == -20:
                    continue                # boundary: wired below
                if o not in remap or t not in remap:
                    sys.stderr.write(
                        "sever dangling internal link %s (%s->%s) in %s\n"
                        % (il["id"], o, t, sg.get("name")))
                    continue
                plid = fresh()
                links[plid] = [il["id"], remap[o], il["origin_slot"],
                               remap[t], il["target_slot"], il["type"]]
                lid_remap[il["id"]] = plid
            # re-wire parent links that touched the instance. The
            # boundary sockets map by NAME, not position: sg.inputs
            # lists WIDGET entries too, while the instance's socket
            # array carries only the link-typed inputs — positions
            # diverge the moment a widget input precedes a linked one
            sg_in_by_name = {g["name"]: g for g in sg["inputs"]}
            sg_out_by_name = {g["name"]: g for g in sg["outputs"]}
            inst_in = {i["name"]: n for n, i in
                       enumerate(inst.get("inputs") or [])}
            inst_out = {o["name"]: n for n, o in
                        enumerate(inst.get("outputs") or [])}
            for lid in list(links):
                l = links[lid]
                if l[1] == iid:                    # instance was SOURCE
                    oslot = l[2]
                    if not isinstance(oslot, int):
                        raise TypeError(
                            "link row %r has non-int source slot" % (l,))
                    oname = (inst.get("outputs") or [])[oslot]["name"]
                    outs = sg_out_by_name.get(oname, {}).get("linkIds", [])
                    if not outs:
                        del links[lid]
                        continue
                    il = _ilink(sg, outs[0])
                    l[1], l[2] = remap[il["origin_id"]], il["origin_slot"]
                if l[3] == iid:                    # instance was TARGET
                    islot = l[4]
                    if not isinstance(islot, int):
                        raise TypeError(
                            "link row %r has non-int target slot" % (l,))
                    iname = (inst.get("inputs") or [])[islot]["name"]
                    for il in [_ilink(sg, i) for i in
                               sg_in_by_name.get(iname, {})
                               .get("linkIds", [])]:
                        nl = list(l)
                        new_lid = fresh()
                        nl[0] = new_lid
                        nl[3] = remap[il["target_id"]]
                        nl[4] = il["target_slot"]
                        links[nl[0]] = nl
                        lid_remap[il["id"]] = new_lid
                    del links[lid]
            # socket refs on the imported nodes: internal lids ->
            # parent lids; widget-boundary refs clear to None (the
            # override channel owns the value)
            for fid in remap.values():
                for inp in nodes[fid].get("inputs") or []:
                    ol = inp.get("link")
                    if ol is None:
                        continue
                    if ol in widget_lids:
                        inp["link"] = None
                    elif ol in lid_remap:
                        inp["link"] = lid_remap[ol]
    return nodes, links, overrides


# ── API conversion ───────────────────────────────────────────────────────────

def _is_ui(cls: str) -> bool:
    return (cls in UI_ONLY
            or any(s in cls for s in UI_SUBSTR))


def to_api(nodes: NodeTable, links: LinkTable, overrides: Overrides,
           oi: ObjectInfo) -> ApiWorkflow:
    """Expanded web nodes -> API format {id: {class_type, inputs}}."""
    typed: dict[str, tuple[str, dict[str, tuple[str, WidgetValue]]]] = {}
    for nid, n in sorted(nodes.items()):
        cls = n["type"]
        if cls not in oi or _is_ui(cls):
            sys.stderr.write("drop: %s #%s\n" % (cls, nid))
            continue
        inp = oi[cls]["input"]
        named: dict[str, tuple[str, WidgetValue]] = {}
        for i in n.get("inputs") or []:
            lnk = i.get("link")
            if lnk is not None:
                named[i["name"]] = ("link", lnk)
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
    api: ApiWorkflow = {}
    for nid_str, (cls, named) in typed.items():
        row: ApiNode = {"class_type": cls, "inputs": {}}
        for k, (kind, payload) in named.items():
            if kind == "link":
                src = lids.get(payload) if isinstance(payload, int) else None
                if src is None or src[0] not in typed:
                    continue                # severed end
                row["inputs"][k] = [src[0], src[1]]
            else:
                row["inputs"][k] = overrides.get(
                    (int(nid_str), k), payload)
        api[nid_str] = row
    return api


# ── transpile (public API only: a scratch endpoint serves the vocab) ────────

class _VocabServer:
    """One-endpoint object_info server — WorkflowToScriptTranspiler
    fetches its vocabulary over HTTP by construction, so merged specs
    ride a loopback server instead of monkeypatching the library."""

    def __init__(self, oi: ObjectInfo, port: int = 18999) -> None:
        self.oi = oi
        self.port = port
        self._srv: HTTPServer | None = None

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

            def log_message(self, *a: str | int | float) -> None:
                pass

        self._srv = HTTPServer(("127.0.0.1", self.port), H)
        threading.Thread(target=self._srv.serve_forever,
                         daemon=True).start()
        return "http://127.0.0.1:%d/" % self.port

    def __exit__(self, *exc: type[BaseException] | BaseException | TracebackType | None) -> None:
        if self._srv is not None:
            self._srv.shutdown()


def transpile(api_wf: ApiWorkflow,
              oi: ObjectInfo) -> str:
    """API workflow -> ComfyScript python (the extracted classes)."""
    import importlib
    with _VocabServer(oi) as url:
        tsp = importlib.import_module("comfy_script.transpile")
        t: _Transpiler = tsp.WorkflowToScriptTranspiler(
            json.dumps(api_wf), url)
        out: str = t.to_script(runtime=False)
        return out


# ── census ───────────────────────────────────────────────────────────────────

def census(api_wf: ApiWorkflow
           ) -> Counter[str]:
    return Counter(v["class_type"] for v in api_wf.values())


# ── door ─────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
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
        # the vocabulary is needed for CONVERSION (widget placement),
        # not just transpiling — an empty spec set would drop every
        # node silently, which is the failure this tool exists to
        # prevent. --no-transpile only skips the python emission.
        if not (args.api or args.object_info):
            sys.stderr.write("web-UI format needs a vocabulary: "
                             "pass --api/--object-info\n")
            return 2
        oi: ObjectInfo = load_object_info(args.api,
                                              args.object_info)
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
