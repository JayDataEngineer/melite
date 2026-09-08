"""Daisy Studio - FastHTML + pure daisyUI studio for inference.cpp flows.

Drawer layout, top tabs [Operate | Chat | Gallery], no MonsterUI, no Node.
Operate renders the lane bundle params_schema (the same JSON the DSH
TypeScript card deck renders) and hits the identical validate/start doors.
Chat wraps the deepseek_harness Python package in-process (chat.py).
Gallery grids runs with status badges + thumbnails.

INVARIANTS: gateway_client.py owns endpoint paths; no hardcoded gateway
endpoint; 4xx surfaces VERBATIM; no py/ or packages/engines imports here.
"""

from __future__ import annotations

import asyncio
import collections.abc
import json
import queue
import threading
from pathlib import Path

from fasthtml.common import (
    A, Button, Div, FastHTML, Form, H1, H3, H4, Hidden, Img, Input, Label,
    Li, Main, NotStr, Option, P, Link, Script, Select, Span, Style, Table, Tbody, Ul,
    Td, Textarea, Th, Thead, Tr, fast_app,
)
from starlette.requests import Request

from .chat import ChatAgent, ChatError, EchoAgent, HarnessAgent, iter_answer
from .gateway_client import Draft, GatewayClient, GatewayError, Lane, Run

JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]

TERMINAL = {"succeeded", "completed", "done", "error", "failed", "stopped"}

STATIC_DIR = Path(__file__).resolve().parent / "assets"
STATIC_FILES = ("tailwind.js", "daisyui.min.css", "htmx.min.js", "ws.js",
                "marked.min.js", "purify.min.js")


def _static(name: str) -> str:
    return "/assets/" + name


CHAT_BEHAVIOR_TMPL = (
"function chatAutoResize(){"
"var t=document.getElementById(@chat-prompt@);"
"if(t==null){return;}"
"t.style.height=@auto@;"
"t.style.height=Math.min(t.scrollHeight,200)+@px@;"
"t.style.maxHeight=@200px@;"
"t.style.overflowY=@auto@;"
"var b=document.getElementById(@chat-send@);"
"if(b==null){return;}"
"if(t.disabled){b.disabled=true;return;}"
"if(t.value.trim()==@@){b.disabled=true;return;}"
"b.disabled=false;"
"}"
"function chatCheckEnter(e){"
"if(e.key==@Enter@){"
"if(e.shiftKey){return;}"
"e.preventDefault();"
"var f=document.getElementById(@chat-form@);"
"if(f==null){return;}"
"if(f.requestSubmit==null){return;}"
"f.requestSubmit();}}"
"var chatRaw={};"
"function chatRenderMd(){"
"if(window.marked==null){return;}"
"if(window.DOMPurify==null){return;}"
"var els=document.querySelectorAll(@.md-body@);"
"els.forEach(function(el){"
"if(el.id==@@){return;}"
"if(chatRaw[el.id]==null){chatRaw[el.id]=el.innerText;}"
"var tail=@@;"
"var kids=el.childNodes;"
"var i=kids.length;"
"while(i){i--;var n=kids[i];if(n.nodeType==3){tail=n.nodeValue+tail;el.removeChild(n);}}"
"var spans=el.querySelectorAll(@span:not([data-done])@);"
"spans.forEach(function(s){"
"if(s.parentNode==el){}else{return;}"
"tail+=s.textContent;"
"s.setAttribute(@data-done@,@1@);"
"});"
"if(tail.trim()==@@){}else{chatRaw[el.id]+=tail;}"
"if(chatRaw[el.id]==el.dataset.done){return;}"
"el.dataset.done=chatRaw[el.id];"
"el.dataset.rendered=@1@;"
"el.innerHTML=DOMPurify.sanitize(marked.parse(chatRaw[el.id]));"
"});"
"}"
"function chatBoot(){"
"chatRenderMd();chatAutoResize();"
"var log=document.getElementById(@chat-log@);"
"if(log==null){return;}"
"if(window.MutationObserver==null){return;}"
"var mo=new MutationObserver(function(){chatRenderMd();});"
"mo.observe(log,{childList:true,subtree:true,characterData:true});"
"}"
"document.addEventListener(@DOMContentLoaded@,function(){chatBoot();});"
)

CHAT_BEHAVIOR = "".join(CHAT_BEHAVIOR_TMPL).replace(chr(64), chr(34))

MD_CSS = (
".md-body p{margin:0 0 .5em;} .md-body p:last-child{margin-bottom:0;} "
".md-body pre{background:rgba(127,127,127,.16);border-radius:.75rem;padding:.75rem;"
"overflow-x:auto;font-size:.8rem;margin:.5em 0;} "
".md-body code{font-family:ui-monospace,monospace;font-size:.85em;} "
".md-body pre code{background:transparent;padding:0;} "
".md-body table{border-collapse:collapse;margin:.5em 0;font-size:.85rem;} "
".md-body th,.md-body td{border:1px solid rgba(127,127,127,.35);padding:.25rem .5rem;} "
".md-body ul,.md-body ol{padding-left:1.25rem;margin:.25em 0;} "
".md-body a{text-decoration:underline;}"
)

APP_CSS = ("html, body { height: 100%; margin: 0; } body { overflow: hidden; } "
"#main-pane { overflow-y: auto; height: 100%; } pre { background: transparent; margin: 0; }")


def _theme_hdrs() -> tuple[Script | Link | Style, ...]:
    return (Script(src=_static("tailwind.js")),
            Script("tailwind.config = { darkMode: " + chr(34) + "selector" + chr(34) + " }"),
            Link(rel="stylesheet", href=_static("daisyui.min.css")),
            Script(src=_static("htmx.min.js")),
            Script(src=_static("ws.js")),
            Script(src=_static("marked.min.js")),
            Script(src=_static("purify.min.js")),
            Script(CHAT_BEHAVIOR),
            Style(MD_CSS + APP_CSS),
            Link(rel="icon", href="data:,"))

_CHAT: dict[str, list[tuple[str, str]]] = {}


def _make_client_factory(base_url: str) -> collections.abc.Callable[[], GatewayClient]:
    def get_client() -> GatewayClient:
        return GatewayClient(base_url)
    return get_client


def _badge(text: str, *, kind: str = "outline") -> Span:
    return Span(text, cls="badge badge-" + kind + " badge-sm")


def _status_badge(status: str | None) -> Span:
    s = (status or "unknown").lower()
    kind = {
        "queued": "ghost", "running": "info", "starting": "info",
        "succeeded": "success", "completed": "success", "done": "success",
        "stopped": "warning", "error": "error", "failed": "error",
    }.get(s, "neutral")
    return _badge(s, kind=kind)


def _err_alert(err: Exception) -> Div:
    msg = str(err).strip() or err.__class__.__name__
    return Div(
        Div("Gateway error", cls="font-semibold mb-1"),
        NotStr("<pre class='whitespace-pre-wrap text-xs'>" + msg + "</pre>"),
        role="alert", cls="alert alert-error my-2",
    )


def _tabs(active: str) -> Div:
    def tab(label: str, href: str, key: str) -> A:
        on = " tab-active" if active == key else ""
        return A(label, href=href, cls="tab" + on, role="tab")
    return Div(tab("Operate", "/", "operate"), tab("Chat", "/chat", "chat"),
               tab("Gallery", "/gallery", "gallery"), cls="tabs tabs-bordered mb-3", role="tablist")


def _sidebar_section(title: str, items: list[Lane | Draft | Run], *,
                       render: collections.abc.Callable[[Lane | Draft | Run], A],
                       empty: str) -> Div:
    if items:
        body = Ul(*[Li(render(it)) for it in items], cls="menu w-full")
    else:
        body = P(empty, cls="px-4 text-xs opacity-40 italic")
    return Div(Div(title, cls="menu-title"), body, cls="py-1")


def _lane_link(lane: Lane, *, active: bool) -> A:
    return A(
        Span(lane.title or lane.name(), cls="truncate font-medium flex-1"),
        _badge((lane.genre or lane.kind or "lane").lower()),
        href="/flow/" + lane.name(),
        cls="flex items-center gap-2" + (" active" if active else ""),
        **{"data-lane-row": "", "data-lane": lane.name().lower()},
    )


def _draft_link(draft: Draft, *, active: bool) -> A:
    return A(
        Span("draft", cls="opacity-50"), Span(draft.title or draft.name or draft.ref(), cls="truncate"),
        href="/draft/" + draft.ref(),
        cls="flex items-center gap-2 text-sm" + (" active" if active else ""),
    )


def _run_link(run: Run, *, active: bool) -> A:
    return A(
        _status_badge(run.status), Span(run.lane_name() or run.ref()[:8], cls="truncate text-xs"),
        href="/run/" + run.ref(),
        cls="flex items-center gap-2" + (" active" if active else ""),
    )


def _sidebar(*, active_lane: str | None, active_run: str | None, active_draft: str | None,
             lanes: list[Lane], drafts: list[Draft], runs: list[Run],
             gateway_url: str) -> Div:
    return Div(
        Div(H3("Daisy Studio", cls="text-lg font-bold leading-tight"),
            P(gateway_url, cls="text-[10px] opacity-40 truncate font-mono"), cls="p-3 border-b border-base-300"),
        Div(Input(type="search", placeholder="Filter lanes...", aria_label="Filter lanes",
                    cls="input input-sm input-bordered w-full mt-2",
                    oninput="document.querySelectorAll('[data-lane-row]').forEach(r=>{r.hidden=!r.dataset.lane.includes(this.value.toLowerCase())})"),
            cls="p-2"),
        _sidebar_section("Lanes", lanes,
            render=lambda lane: _lane_link(lane, active=lane.name() == active_lane),
            empty="No lanes - check $MELITE_GATEWAY."),
        _sidebar_section("Drafts", drafts, render=lambda d: _draft_link(d, active=d.ref() == active_draft),
            empty="No drafts yet."),
        _sidebar_section("Runs", runs, render=lambda r: _run_link(r, active=r.ref() == active_run),
            empty="No runs yet."),
        cls="w-72 shrink-0 border-r border-base-300 overflow-y-auto h-full bg-base-100",
    )


def _shell(*, tab: str, sidebar: Div, main_children: list[Div]) -> Div:
    return Div(Div(sidebar, Main(_tabs(tab), *main_children, id="main-pane", cls="flex-1 p-4 min-w-0"),
                   cls="flex h-screen"))


def _new_run_banner() -> Div:
    return Div(H3("New run", cls="card-title"),
        P("Pick a lane on the left. The form renders the lane bundle params_schema "
          "(the same JSON the TypeScript card deck in DSH renders) - Validate compiles "
          "with no GPU, Start queues the run.", cls="text-sm opacity-70"),
        cls="card bg-base-200 p-5")


def _form_field(field: JsonDict, value: JsonValue = None) -> Div:
    name = str(field.get("name", ""))
    title = str(field.get("title") or name)
    desc = str(field.get("description") or "")
    default = field.get("default", value)
    ftype = str(field.get("type") or field.get("format") or "string").lower()
    enum = field.get("enum")
    req = " *" if field.get("required") else ""
    label = Label(title + req, cls="label-text font-medium")
    hint = P(desc, cls="text-xs opacity-60 mt-1") if desc else None
    if isinstance(enum, list) and enum:
        opts = [Option(str(o), value=str(o), selected=(str(default) == str(o))) for o in enum]
        ctl = Select(*opts, name=name, cls="select select-bordered w-full")
    elif ftype in ("boolean", "bool"):
        ctl = Input(type="checkbox", name=name, value="true",
                    checked=(default is True or str(default).lower() == "true"), cls="checkbox")
    elif ftype in ("integer", "number") or name in ("seed", "steps", "frames", "fps"):
        ctl = Input(type="number", name=name, value="" if default is None else str(default),
                    cls="input input-bordered w-full")
    elif ftype in ("long-text", "textarea", "text-multiline") or name in ("prompt", "text", "calls"):
        ctl = Textarea("" if default is None else str(default), name=name, rows=4,
                       cls="textarea textarea-bordered w-full font-mono text-sm")
    else:
        ctl = Input(type="text", name=name, value="" if default is None else str(default),
                    cls="input input-bordered w-full")
    kids = [label, ctl] + ([hint] if hint else [])
    return Div(*kids, cls="form-control gap-1 mb-3")


def _lane_detail(lane: Lane, *, schema_fields: list[JsonDict], required: list[str],
                 schema_model: str = "") -> Div:
    for f in schema_fields:
        if isinstance(f, dict) and f.get("name") in required:
            f["required"] = True
    return Div(
        Div(H3(lane.title or lane.name(), cls="card-title"),
            Div(_badge((lane.genre or lane.kind or "lane").lower()), _badge(lane.name(), kind="info"),
                cls="flex gap-2 mt-1"),
            P(lane.description or lane.one_liner or "", cls="text-sm opacity-70 mt-2"), cls="mb-4"),
        Form(
            Div(
                Div(*[_form_field(f) for f in schema_fields] if schema_fields else [
                        P("This lane exposes no params_schema fields - prompt-only.", cls="text-sm opacity-60 italic")],
                    cls="flex-1"),
                Div(Button("Validate", hx_post="/flow/" + lane.name() + "/validate", hx_target="#lane-result",
                           type="button", cls="btn btn-outline w-full mb-2"),
                    Button("Start run", hx_post="/flow/" + lane.name() + "/start", hx_target="#lane-result",
                           type="button", cls="btn btn-primary w-full"), cls="w-52 shrink-0"),
                cls="flex gap-4 items-start"),
            Hidden(name="lane", value=lane.name()),
            Hidden(name="model", value=schema_model or lane.name())), 
        Div(id="lane-result", cls="mt-4"),
        P("TypeScript cards (deck / card view / editors) live in DSH; this form renders the identical "
          "params_schema and hits the identical validate/start doors.", cls="text-xs opacity-50 mt-4"),
    )


def _draft_detail(draft: Draft) -> Div:
    return Div(H3(draft.title or draft.name or draft.ref(), cls="card-title"),
        Div(_badge(draft.lane_name() or "draft"), cls="mt-1"),
        NotStr("<pre class='whitespace-pre-wrap text-xs mt-3'>" + json.dumps(draft.params or {}, indent=2) + "</pre>"),
        P("Drafts are click-contracts: open the lane to edit + run.", cls="text-xs opacity-50 mt-3"),
        cls="card bg-base-200 p-5")


def _stages_table(run: Run) -> Table:
    rows = [Tr(Td(s.id, cls="font-mono text-xs"), Td(s.engine or "-", cls="text-xs"), Td(_status_badge(s.status)),
                Td(s.error or "-", cls="text-xs font-mono text-error")) for s in (run.stages or ())]
    empty = Tbody(Tr(Td("no stages yet", colspan="4", cls="text-xs opacity-60")))
    return Table(Thead(Tr(Th("stage"), Th("engine"), Th("status"), Th("error"))),
                 Tbody(*rows) if rows else empty, cls="table table-sm")


def _artifacts_html(run: Run, *, gateway_url: str) -> str:
    parts = []
    for a in (run.artifacts or ()) or []:
        if not isinstance(a, dict):
            continue
        fname = str(a.get("file") or a.get("name") or a.get("path") or "")
        if fname:
            url = gateway_url.rstrip("/") + "/v1/assets/runs/" + run.ref() + "/" + fname
            low = fname.lower()
            if low.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
                parts.append("<a href='" + url + "' target='_blank'><img src='" + url + "' class='max-w-xs rounded border' loading='lazy'/></a>")
            else:
                parts.append("<a class='link link-primary text-sm font-mono' href='" + url + "' target='_blank'>" + fname + "</a>")
    if parts:
        return "<div class='flex flex-wrap gap-3 mt-2'>" + "".join(parts) + "</div>"
    return "<pre class='whitespace-pre-wrap text-xs'>" + json.dumps(list(run.artifacts or []), indent=2) + "</pre>"


def _run_detail(run: Run, *, gateway_url: str) -> Div:
    live = (run.status or "").lower() not in TERMINAL
    poll = {"hx_get": "/run/" + run.ref() + "/status", "hx_trigger": "every 2s",
            "hx_target": "#run-status", "hx_swap": "outerHTML"} if live else {}
    status_block = Div(
        Div(H4("Status", cls="font-semibold"), _status_badge(run.status), cls="flex items-center gap-3"),
        *([P(run.error, cls="text-error text-sm mt-2 font-mono")] if run.error else []),
        H4("Stages", cls="font-semibold mt-4"), _stages_table(run),
        *([H4("Artifacts", cls="font-semibold mt-4")] if run.artifacts else []),
        *([NotStr(_artifacts_html(run, gateway_url=gateway_url))] if run.artifacts else []),
        id="run-status", cls="mt-2", **poll)
    actions = []
    if live:
        actions.append(Button("Stop", hx_post="/run/" + run.ref() + "/stop", hx_target="#run-status",
                              cls="btn btn-warning btn-sm mt-3"))
    else:
        actions.append(A("Open in gallery", href="/gallery", cls="link text-sm mt-3 inline-block"))
    return Div(Div(H3(run.lane_name() or run.ref(), cls="card-title"),
                   P(run.ref(), cls="font-mono text-xs opacity-50"), cls="mb-2"),
               status_block, Div(*actions))


def _chat_bubble(role: str, text: str, *, msg_id: str | None = None) -> Div:
    user = role == "user"
    wrap: dict[str, str] = {"cls": "chat chat-end" if user else "chat chat-start"}
    if msg_id:
        wrap["id"] = "message-" + msg_id
    bubble: dict[str, str] = {"cls": "chat-bubble chat-bubble-primary whitespace-pre-wrap text-sm"
                              if user else
                              "chat-bubble chat-bubble-secondary whitespace-pre-wrap text-sm md-body"}
    if msg_id:
        bubble["id"] = "message-" + msg_id + "-content"
    return Div(Div(role, cls="chat-header text-xs opacity-60"),
               Div(text, **bubble), **wrap)


def _send_button(*, disabled: bool = False) -> Button:
    kw: dict[str, str] = {"cls": "btn btn-circle btn-primary h-11 min-h-0 w-11 shrink-0 p-0 text-xl",
                          "id": "chat-send", "style": "width:44px;height:44px;padding:0;",
                          "hx_swap_oob": "true", "title": "Send", "type": "submit"}
    if disabled:
        kw["disabled"] = "disabled"
    return Button(NotStr("&#8593;"), **kw)


def _chat_input(session: str, *, disabled: bool = False) -> Textarea:
    kw: dict[str, str] = {"cls": "textarea w-full bg-transparent border-0 focus:outline-none resize-none text-base",
                          "id": "chat-prompt", "hx_swap_oob": "true",
                          "oninput": "chatAutoResize()", "onkeydown": "chatCheckEnter(event)"}
    if disabled:
        kw["disabled"] = "disabled"
    return Textarea("", name="prompt", rows=2, placeholder="Ask the agent... ", **kw)


async def _astream(agent: ChatAgent, prompt: str, session: str) -> collections.abc.AsyncIterator[str]:
    q: queue.Queue = queue.Queue()

    def _work() -> None:
        try:
            for ch in iter_answer(agent, prompt, session):
                if ch:
                    q.put(("chunk", ch))
        except ChatError as e:
            q.put(("error", e))
        except Exception as e:
            q.put(("error", ChatError("chat turn failed: " + str(e))))
        finally:
            q.put(("end", None))

    threading.Thread(target=_work, daemon=True).start()
    loop = asyncio.get_running_loop()
    while True:
        kind, val = await loop.run_in_executor(None, q.get)
        if kind == "end":
            return
        if kind == "error":
            raise val
        yield val


def _agent_note(agent: ChatAgent) -> str:
    if isinstance(agent, EchoAgent):
        return "Agent: echo stand-in (STUDIO_CHAT=off or tests) - no LLM spend."
    if HarnessAgent.available():
        return "Agent: harness LLM (deepseek_harness SDK) - turns can queue flows."
    return "Agent unavailable: deepseek-harness-sdk missing in this env - chat refuses loudly per turn."


def _composer(session: str, *, disabled: bool = False) -> Div:
    return Div(Form(_chat_input(session, disabled=disabled),
                    Div(_send_button(disabled=disabled),
                        cls="flex shrink-0 items-center"),
                    Hidden(name="session", value=session),
                    cls="mx-auto w-full max-w-3xl flex items-end gap-2 rounded-3xl "
                        "border border-base-300 bg-base-200 p-3",
                    id="chat-form", ws_send=True, hx_ext="ws", ws_connect="/chat-ws"),
               id="chat-composer", cls="sticky bottom-0 px-2 pb-3 pt-1")


def _chat_pane(*, session: str, agent: ChatAgent) -> Div:
    msgs = _CHAT.get(session, [])
    if msgs:
        log = []
        for i, (r, t) in enumerate(msgs):
            log.append(_chat_bubble(r, t, msg_id=str(i)))
    else:
        log = [Div(P("Start a conversation - replies stream token by token, markdown-rendered.",
                      cls="text-sm opacity-60"), cls="py-10 text-center")]
    return Div(Div(Div(H3("Chat", cls="text-lg font-bold"),
                        P(_agent_note(agent), cls="text-xs opacity-50")),
                    Button("New chat", type="button", hx_post="/chat/new/" + session,
                           hx_target="#chat-pane", hx_swap="outerHTML",
                           cls="btn btn-ghost btn-sm whitespace-nowrap"),
                    cls="mx-auto flex w-full max-w-3xl items-start justify-between gap-2 px-2 pt-2"),
        Div(*log, id="chat-log", cls="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 overflow-y-auto px-2 py-4"),
        _composer(session, disabled=False),
        id="chat-pane", cls="flex h-full min-h-[60vh] flex-col")


def _gallery_grid(runs: list[Run], *, gateway_url: str) -> Div:
    cards = []
    for run in runs:
        thumb = getattr(run, "thumbnail", None)
        if isinstance(thumb, str) and thumb:
            src = thumb if thumb.startswith("http") else gateway_url.rstrip("/") + thumb
            visual = Img(src=src, cls="h-32 w-full object-cover bg-base-300", alt=run.ref())
        else:
            visual = Div("no preview", cls="h-32 grid place-items-center text-xs opacity-40 bg-base-300")
        body = Div(Div(Span(run.lane_name() or run.ref()[:8], cls="font-semibold text-sm truncate"),
                       _status_badge(run.status), cls="flex items-center gap-2"),
                   P(run.ref(), cls="font-mono text-[10px] opacity-50 truncate"), cls="p-2")
        cards.append(A(Div(visual, body, cls="card bg-base-100 border border-base-300 overflow-hidden"),
                       href="/run/" + run.ref()))
    if not cards:
        return Div(P("No runs yet - start one from Operate.", cls="text-sm opacity-60 italic"))
    return Div(*cards, cls="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3")


def _validate_result_card(result: JsonDict) -> Div:
    if not result:
        return Div("(empty reply - gateway returned no body)", cls="alert alert-warning", role="status")
    if result.get("ok", False) or (not result.get("error") and not result.get("refusal")):
        return Div("Compile clean - start the run to queue it.", cls="alert alert-success", role="status")
    return Div(Div("Compile refusal", cls="font-semibold mb-1"),
               NotStr("<pre class='whitespace-pre-wrap text-xs'>" + json.dumps(result, indent=2) + "</pre>"),
               cls="alert alert-warning", role="status")


def _start_result_card(result: JsonDict) -> Div:
    run_id = result.get("run_id") or result.get("id")
    if not run_id:
        return _err_alert(GatewayError(json.dumps(result, indent=2)))
    rid = str(run_id)
    return Div(P("Queued run ", cls="inline"),
               A(rid, href="/run/" + rid, cls="link link-primary font-mono text-sm"),
               P("Watch it in the sidebar Runs list (or click through).", cls="text-sm opacity-60"),
               cls="alert alert-info", role="status")


def _render_fatal(err: Exception, *, gw_url: str) -> Div:
    return Div(H1("Daisy Studio - gateway unreachable", cls="text-2xl font-bold"),
               P("Endpoint: " + gw_url, cls="font-mono text-sm"), _err_alert(err),
               P("Set $MELITE_GATEWAY (canonical default http://localhost:33081) and re-run.",
                 cls="text-sm opacity-60"), cls="p-8")


def _form_to_params(form: collections.abc.Mapping[str, str]) -> JsonDict:
    out: JsonDict = {}
    params: dict[str, str | bool | int | float] = {}
    items = form.multi_items() if hasattr(form, "multi_items") else form.items()
    for k, v in items:
        if k in ("lane", "session", "model"):
            continue
        if v == "":
            continue
        if v in ("true", "false"):
            params[k] = (v == "true")
            continue
        try:
            params[k] = float(v) if "." in v else int(v)
            continue
        except ValueError:
            pass
        params[k] = v
    out["params"] = params
    return out


def build_app(get_client: collections.abc.Callable[[], GatewayClient],
                get_agent: collections.abc.Callable[[], ChatAgent] | None = None, *,
                live: bool = False) -> FastHTML:
    agent_factory = get_agent or (lambda: EchoAgent(prefix="chat-off"))
    hdrs = _theme_hdrs()
    app, rt = fast_app(hdrs=hdrs, live=live, default_hdrs=False, pico=False, surreal=False,
                        htmlkw={"class": "dark", "data-theme": "dark"})
    app.routes[:] = [r for r in app.routes if getattr(r, "path", "") != "/{fname:path}.{ext:static}"]
    app.static_route_exts(prefix="/assets/", static_path=str(STATIC_DIR))

    def _load_all() -> tuple[GatewayClient, str, list[Lane], list[Draft], list[Run]]:
        client = get_client()
        gw_url = client._base
        return client, gw_url, client.lanes(), client.drafts(), client.runs()

    @rt("/")
    def index() -> Div:
        try:
            client, gw_url, lanes, drafts, runs = _load_all()
        except GatewayError as e:
            return _render_fatal(e, gw_url=getattr(get_client(), "_base", "?"))
        side = _sidebar(active_lane=None, active_draft=None, active_run=None, lanes=lanes,
                        drafts=drafts, runs=runs, gateway_url=gw_url)
        return _shell(tab="operate", sidebar=side, main_children=[_new_run_banner()])

    @rt("/healthz")
    def healthz() -> dict[str, bool]:
        return {"ok": True}

    @rt("/flow/{lane_id}")
    def flow_detail(lane_id: str) -> Div:
        try:
            client, gw_url, lanes, drafts, runs = _load_all()
            lane = next((l for l in lanes if l.name() == lane_id), None)
            if lane is None:
                raise GatewayError("lane " + repr(lane_id) + " not in /v1/lanes")
            schema = client.param_schema(lane_id)
        except GatewayError as e:
            return _err_alert(e)
        side = _sidebar(active_lane=lane_id, active_draft=None, active_run=None, lanes=lanes,
                        drafts=drafts, runs=runs, gateway_url=gw_url)
        return _shell(tab="operate", sidebar=side, main_children=[
            _lane_detail(lane, schema_fields=list(schema.fields), required=list(schema.required),
                            schema_model=schema.model or lane_id)])

    @rt("/flow/{lane_id}/validate")
    async def flow_validate(lane_id: str, req: Request) -> Div:
        try:
            client = get_client()
            form = await req.form()
            params = _form_to_params(form)
            model = (form.get("model") if hasattr(form, "get") else "") or lane_id
            flat = dict(params.get("params", params))
            body = {"model": str(model)}
            body.update(flat)
            result = client.validate(body)
        except GatewayError as e:
            return _err_alert(e)
        return _validate_result_card(result)

    @rt("/flow/{lane_id}/start")
    async def flow_start(lane_id: str, req: Request) -> Div:
        try:
            client = get_client()
            form = await req.form()
            params = _form_to_params(form)
            model = (form.get("model") if hasattr(form, "get") else "") or lane_id
            flat = dict(params.get("params", params))
            body = {"model": str(model)}
            body.update(flat)
            result = client.start(body)
        except GatewayError as e:
            return _err_alert(e)
        return _start_result_card(result)

    @rt("/draft/{draft_id}")
    def draft_detail(draft_id: str) -> Div:
        try:
            client, gw_url, lanes, drafts, runs = _load_all()
            draft = client.draft(draft_id)
        except GatewayError as e:
            return _err_alert(e)
        side = _sidebar(active_lane=None, active_draft=draft_id, active_run=None, lanes=lanes,
                        drafts=drafts, runs=runs, gateway_url=gw_url)
        return _shell(tab="operate", sidebar=side, main_children=[_draft_detail(draft)])

    @rt("/run/{run_id}")
    def run_detail(run_id: str) -> Div:
        try:
            client, gw_url, lanes, drafts, runs = _load_all()
            run = client.run(run_id)
        except GatewayError as e:
            return _err_alert(e)
        side = _sidebar(active_lane=None, active_draft=None, active_run=run_id, lanes=lanes,
                        drafts=drafts, runs=runs, gateway_url=gw_url)
        return _shell(tab="operate", sidebar=side, main_children=[_run_detail(run, gateway_url=gw_url)])

    @rt("/run/{run_id}/status")
    def run_status(run_id: str) -> Div:
        try:
            client = get_client()
            run = client.run(run_id)
        except GatewayError as e:
            return _err_alert(e)
        return Div(Div(H4("Status", cls="font-semibold"), _status_badge(run.status), cls="flex items-center gap-3"),
                   *([P(run.error, cls="text-error text-sm mt-2 font-mono")] if run.error else []),
                   H4("Stages", cls="font-semibold mt-4"), _stages_table(run),
                   *([H4("Artifacts", cls="font-semibold mt-4")] if run.artifacts else []),
                   *([NotStr(_artifacts_html(run, gateway_url=client._base))] if run.artifacts else []),
                   id="run-status", cls="p-6")

    @rt("/run/{run_id}/stop")
    def run_stop(run_id: str) -> Div:
        try:
            client = get_client()
            result = client.stop(run_id)
        except GatewayError as e:
            return _err_alert(e)
        return Div(_status_badge("stopped"),
                   P("Stop requested: " + str(result.get("status", "?")), cls="text-sm"),
                   id="run-status", cls="p-6")

    @rt("/chat", methods=["GET"])
    def chat_view(session: str = "local") -> Div:
        try:
            client, gw_url, lanes, drafts, runs = _load_all()
        except GatewayError as e:
            return _render_fatal(e, gw_url=getattr(get_client(), "_base", "?"))
        side = _sidebar(active_lane=None, active_draft=None, active_run=None, lanes=lanes,
                        drafts=drafts, runs=runs, gateway_url=gw_url)
        return _shell(tab="chat", sidebar=side, main_children=[_chat_pane(session=session, agent=agent_factory())])

    @rt("/chat", methods=["POST"])
    async def chat_post(req: Request) -> Div:
        form = await req.form()
        prompt = str(form.get("prompt", "") or "")
        session = str(form.get("session", "local") or "local")
        agent = agent_factory()
        _CHAT.setdefault(session, []).append(("user", prompt))
        try:
            answer = agent.reply(prompt, session)
        except ChatError as e:
            answer = "chat error: " + str(e)
        _CHAT[session].append(("assistant", answer))
        return _chat_pane(session=session, agent=agent)

    @rt("/chat/new/{session}", methods=["POST"])
    async def chat_new(session: str) -> Div:
        _CHAT[session] = []
        return _chat_pane(session=session, agent=agent_factory())

    @app.ws("/chat-ws")
    async def chat_ws(prompt: str,
                      send: collections.abc.Callable[[Div | Span | Textarea | Button],
                                                     collections.abc.Awaitable[None]],
                      session: str = "local") -> None:
        agent = agent_factory()
        hist = _CHAT.setdefault(session, [])
        hist.append(("user", prompt))
        await send(Div(_chat_bubble("user", prompt, msg_id=str(len(hist) - 1)), hx_swap_oob="beforeend:#chat-log", cls="contents"))
        await send(_chat_input(session, disabled=True))
        await send(_send_button(disabled=True))
        hist.append(("assistant", ""))
        mid = str(len(hist) - 1)
        aid = "message-" + mid + "-content"
        await send(Div(_chat_bubble("assistant", "", msg_id=mid),
                       hx_swap_oob="beforeend:#chat-log", cls="contents"))
        try:
            async for chunk in _astream(agent, prompt, session):
                hist[-1] = ("assistant", hist[-1][1] + chunk)
                await send(Span(chunk, hx_swap_oob="beforeend:#" + aid))
        except ChatError as e:
            err = "chat error: " + str(e)
            hist[-1] = ("assistant", err)
            await send(Span(err, hx_swap_oob="beforeend:#" + aid))
        await send(_chat_input(session, disabled=False))
        await send(_send_button(disabled=False))

    @rt("/gallery")
    def gallery() -> Div:
        try:
            client, gw_url, lanes, drafts, runs = _load_all()
        except GatewayError as e:
            return _render_fatal(e, gw_url=getattr(get_client(), "_base", "?"))
        side = _sidebar(active_lane=None, active_draft=None, active_run=None, lanes=lanes,
                        drafts=drafts, runs=runs, gateway_url=gw_url)
        return _shell(tab="gallery", sidebar=side, main_children=[_gallery_grid(runs, gateway_url=gw_url)])

    return app
