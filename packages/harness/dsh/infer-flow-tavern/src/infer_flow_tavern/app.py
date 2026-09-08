"""Flow Tavern — the FastHTML + MonsterUI sidebar UI for the
inference.cpp flow system.

Layout (the shadcn-style left sidebar + main pane, the same shape the
DaisyUI `drawer` primitive gives you for free):

  ┌──────────────┬──────────────────────────────────────────────┐
  │  SIDEBAR     │  MAIN PANE                                    │
  │              │                                               │
  │  Search      │  + New Run banner                             │
  │  ─ Lanes ─   │  ───────────────────────────────────────────  │
  │  h3-timeline │  selected flow → param form (HTMX-rendered)    │
  │  audio-tts   │  → validate button (compile feedback inline)  │
  │  sprite-sheet│  → start button (POST /v1/flows/start)         │
  │  ...         │  ───────────────────────────────────────────  │
  │  ─ Drafts ─  │  current run (if any): live status via SSE    │
  │  + New       │  stages table, stop button, artifact list     │
  │  ─ Runs ─    │                                               │
  │  ▶ running   │                                               │
  │  ✓ done      │                                               │
  └──────────────┴──────────────────────────────────────────────┘

Two HTMX-driven interactions cover the whole thing:

  - select lane / draft / run  → swap the main pane (no full reload)
  - submit form                 → validate first, then start; show
                                 the verbatim gateway reply inline

Why FastHTML + MonsterUI and not React (see the operator notes below):
  - ONE process, ONE venv, ONE uv sync. No Node, no Vite, no dual
    toolchain. The plugin is `uv run infer-flow-tavern` and that is
    the whole boot.
  - The user is the only client; the LAN-latency 60-fps slider
    concern is not in play (everything is form-driven, one user).
  - DaisyUI's chat classes are not needed; this is a flow operator
    surface, not a chat surface.
  - "If you need sliders at 60fps, reach for Alpine.js" — the
    operator-notes link covers it; we don't ship sliders yet.

INVARIANTS (the laws this module honors):

  PYTHON SHAPE LAW:  gateway_client.py is the ONLY place endpoint
                     paths live. This module imports helpers, not
                     strings.
  QUEUE LANE LAW:    no hardcoded gateway endpoint. The launcher
                     passes a configured base_url; the client
                     validates it.
  RESILIENCE LAW:    the UI never throws on a 4xx. The gateway's
                     verbatim error message rides into the alert
                     component (the sidecar's `error` field, the
                     validate-door's compile refusal).
  EXTENSION LAW:     no vendored ComfyUI nodes. The Tavern talks
                     HTTP to the gateway; the gateway owns the
                     engine surface.
"""

from __future__ import annotations

import collections.abc
import json
from functools import lru_cache

from fasthtml.common import (
    A, Button, Div, FastHTML, Form, H1, H2, H3, H4, Hidden, Input, Label, Main,
    NotStr, Option, P, Script, Select, Span, Style, Table, Tbody,
    Td, Th, Thead, Tr, fast_app,
)
from monsterui.all import Card, CardBody, CardHeader, Container, Theme
from starlette.requests import Request

from .gateway_client import (
    Draft, GatewayClient, GatewayError, Lane, Run,
)


# ── JSON aliases (typing-only; form + schema payloads are JSON-shaped) ─
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]


# ── client accessor ──────────────────────────────────────────────────
# One client per process. The launcher binds it after parsing argv /
# env, BEFORE `fast_app(...)` constructs the route table — so every
# route handler closes over the same client (no global state, just a
# captured arg). This keeps the test seam clean: tests can pass a
# `client` callable that returns a fake.

def _make_client_factory(base_url: str) -> collections.abc.Callable[[], GatewayClient]:
    """Return a zero-arg callable that produces a fresh client.

    Tests override the factory by reassigning the module-level
    `get_client` symbol; the routes call get_client() at request
    time so a test can swap a fake in between requests."""

    def get_client() -> GatewayClient:
        return GatewayClient(base_url)
    return get_client


# ── styling (FrankenUI / DaisyUI via MonsterUI; CDN-shipped) ────────
# NO node_modules, NO Vite. Headers below are CDN <link> tags the
# browser fetches once; the Python side just declares them.
THEME = Theme.slate  # shadcn "slate" preset (the one operators use)


# ── atom helpers (small, composable) ─────────────────────────────────

def _badge(text: str, *, kind: str = "secondary") -> Span:
    return Span(text, cls=f"badge badge-{kind} badge-sm")


def _status_badge(status: str | None) -> Span:
    """Map the gateway's run status to a DaisyUI color. The status
    vocabulary is the gateway's own — we don't invent names; a
    status we don't recognize rides as a neutral badge (the wall
    will surface an unknown status elsewhere if it matters)."""
    s = (status or "unknown").lower()
    return _badge(
        s,
        kind={
            "queued": "ghost",
            "running": "info",
            "starting": "info",
            "succeeded": "success",
            "completed": "success",
            "done": "success",
            "stopped": "warning",
            "error": "error",
            "failed": "error",
        }.get(s, "neutral"),
    )


def _err_alert(err: Exception) -> Div:
    """Render a gateway error verbatim — never a generic 'failed'.
    The sidecar's error field is the operator's source of truth; we
    pass it through (RESILIENCE LAW: failure docs the failure)."""
    msg = str(err).strip() or err.__class__.__name__
    # NEWLINES in 4xx bodies (validate-door compile refusals) are
    # meaningful; preserve them in a <pre> so the operator can read.
    return Div(
        Div("Gateway error", cls="font-semibold mb-1"),
        NotStr(f"<pre class='whitespace-pre-wrap text-xs'>{msg}</pre>"),
        role="alert",
        cls="alert alert-error my-2",
    )


# ── sidebar ──────────────────────────────────────────────────────────

def _sidebar_section(title: str, items: list[Lane | Draft | Run], *, render: collections.abc.Callable[[Lane | Draft | Run], Div], empty: str) -> Div:
    return Div(
        Div(title, cls="text-xs font-semibold uppercase tracking-wide text-base-content/60 px-2 pt-3 pb-1"),
        *([render(it) for it in items] if items else [
            P(empty, cls="px-2 text-xs text-base-content/40 italic")
        ]),
        cls="py-1",
    )


def _lane_link(lane: Lane, *, active: bool) -> A:
    """One row in the Lanes section. Active lane gets a background
    tint (DaisyUI `menu-active`) — the same primitive shadcn uses."""
    return A(
        Div(
            Span(lane.title or lane.name(), cls="truncate font-medium"),
            _badge((lane.genre or lane.kind or "lane").lower(), kind="ghost"),
            cls="flex items-center gap-2 w-full",
        ),
        href=f"/flow/{lane.name()}",
        hx_get=f"/flow/{lane.name()}",
        hx_target="#main-pane",
        hx_push_url="true",
        cls=f"flex items-center px-2 py-1 rounded hover:bg-base-200 "
            f"{'bg-base-200 font-semibold' if active else ''}",
    )


def _draft_link(draft: Draft, *, active: bool) -> A:
    return A(
        Div(
            Span("📝", cls="mr-1"),
            Span(draft.title or draft.name or draft.ref(), cls="truncate"),
            cls="flex items-center",
        ),
        href=f"/draft/{draft.ref()}",
        hx_get=f"/draft/{draft.ref()}",
        hx_target="#main-pane",
        hx_push_url="true",
        cls=f"block px-2 py-1 rounded text-sm hover:bg-base-200 "
            f"{'bg-base-200' if active else ''}",
    )


def _run_link(run: Run, *, active: bool) -> A:
    return A(
        Div(
            _status_badge(run.status),
            Span(run.lane_name() or run.ref()[:8], cls="truncate text-xs"),
            cls="flex items-center gap-2 w-full",
        ),
        href=f"/run/{run.ref()}",
        hx_get=f"/run/{run.ref()}",
        hx_target="#main-pane",
        hx_push_url="true",
        cls=f"block px-2 py-1 rounded hover:bg-base-200 "
            f"{'bg-base-200' if active else ''}",
    )


def _sidebar(*, active_lane: str | None, active_run: str | None, active_draft: str | None,
             lanes: list[Lane], drafts: list[Draft], runs: list[Run],
             gateway_url: str) -> Div:
    return Div(
        # Header — the brand + gateway link (operators want the URL
        # visible so they can sanity-check they're hitting the right
        # endpoint; the QUEUE LANE LAW refuses hardcodes, so showing
        # the resolved URL is the friendly version of "no surprises").
        Div(
            H3("🏛 Flow Tavern", cls="text-lg font-bold leading-tight"),
            P(gateway_url, cls="text-[10px] text-base-content/40 truncate font-mono"),
            cls="p-3 border-b border-base-300",
        ),
        # Search — client-side filter on the lane list. Alpine.js is
        # the operator-approved answer for "60fps client state" but
        # typing 5 chars into a <input> + a CSS attribute selector
        # is overkill for a vanilla search box; we use the native
        # HTML5 `list` attribute (zero JS, browser-native).
        Div(
            Input(
                type="search",
                placeholder="Filter lanes…",
                aria_label="Filter lanes",
                cls="input input-sm input-bordered w-full mt-2",
                oninput="document.querySelectorAll('[data-lane-row]').forEach(r=>{r.hidden=!r.dataset.lane.includes(this.value.toLowerCase())})",
            ),
            cls="p-2",
        ),
        _sidebar_section(
            "Lanes",
            lanes,
            render=lambda lane: Div(
                _lane_link(lane, active=lane.name() == active_lane),
                **{"data-lane-row": "", "data-lane": lane.name().lower()},
            ),
            empty="No lanes registered — check $MELITE_GATEWAY.",
        ),
        _sidebar_section(
            "Drafts",
            drafts[:8],
            render=lambda d: _draft_link(d, active=d.ref() == active_draft),
            empty="No saved drafts yet.",
        ),
        _sidebar_section(
            "Runs",
            runs[:12],
            render=lambda r: _run_link(r, active=r.ref() == active_run),
            empty="No runs yet — pick a lane to start one.",
        ),
        # Footer — explicit refresh button (the sidebar uses HTMX to
        # refresh, but a hard reload is the recovery path when an
        # SSE stream wedges).
        Div(
            Button(
                "↻ Refresh",
                cls="btn btn-ghost btn-sm w-full",
                onclick="location.reload()",
            ),
            cls="p-2 border-t border-base-300 mt-auto",
        ),
        cls="w-72 shrink-0 h-screen flex flex-col border-r border-base-300 bg-base-100",
        id="sidebar",
    )


# ── main pane fragments ──────────────────────────────────────────────

def _new_run_banner() -> Div:
    return Div(
        H2("New Run", cls="text-xl font-bold"),
        P("Pick a lane from the sidebar to start.", cls="text-sm text-base-content/60"),
        cls="p-6 border-b border-base-300",
        id="main-pane",
    )


def _form_field(field: JsonDict, value: JsonValue = None) -> Div:
    """Render one param_schema field as a DaisyUI input. The
    schema vocabulary is whatever the lane's params_schema returns;
    the renderer tolerates the JSON-Schema subset the gateway emits
    (type, enum, default, title, description)."""
    name = field.get("name") or field.get("key") or "?"
    ftype = (field.get("type") or "string").lower()
    title = field.get("title") or name
    desc = field.get("description")
    enum = field.get("enum")
    default = value if value is not None else field.get("default", "")
    common = {"name": name, "id": f"f-{name}", "cls": "input input-bordered w-full"}

    if enum:
        control: Select | Input | Div | NotStr = Select(
            *(Option(str(o), value=str(o), selected=(str(o) == str(default))) for o in enum),
            **{"name": name, "id": f"f-{name}", "cls": "select select-bordered w-full"},
        )
    elif ftype in ("integer", "number"):
        control = Input(type="number", value=str(default), step=("1" if ftype == "integer" else "any"), **common)
    elif ftype == "boolean":
        control = Div(
            Input(type="checkbox", name=name, id=f"f-{name}", value="true",
                  checked=bool(default), cls="toggle toggle-primary"),
            Label(" enabled", **{"for": f"f-{name}"}),
            cls="flex items-center gap-2",
        )
    elif ftype in ("text", "textarea", "longstring"):
        control = NotStr(
            f'<textarea name="{name}" id="f-{name}" rows="4" '
            f'class="textarea textarea-bordered w-full font-mono text-sm">'
            f'{default}</textarea>'
        )
    else:
        control = Input(type="text", value=str(default), **common)

    return Div(
        Label(title, **{"for": f"f-{name}"}, cls="label-text font-medium"),
        control,
        *([P(desc, cls="text-xs text-base-content/50 mt-1")] if desc else []),
        cls="form-control w-full mb-3",
    )


def _lane_detail(lane: Lane, *, schema_fields: list[JsonDict],
                 required: list[str], gateway_url: str,
                 prefill: JsonDict | None = None) -> Div:
    """The flow-detail pane: title, description, param form, validate
    + start actions. Prefill carries draft values when the user
    clicked a draft in the sidebar."""
    prefill = prefill or {}
    return Div(
        # Header
        Div(
            Div(
                H2(lane.title or lane.name(), cls="text-2xl font-bold"),
                Div(
                    _badge(lane.name(), kind="primary"),
                    *([_badge(lane.kind or "lane", kind="ghost")] if lane.kind else []),
                    *([_badge(lane.genre, kind="ghost")] if lane.genre else []),
                    cls="flex gap-2 mt-1",
                ),
                *([P(lane.one_liner, cls="text-sm text-base-content/70 mt-2")]
                  if lane.one_liner else []),
            ),
            cls="flex-1",
        ),
        Div(
            Form(
                # ── PARAM FORM ────────────────────────────────────
                Div(
                    *[NotStr(_render_field_html(f, prefill.get(f.get("name")))) for f in schema_fields],
                    cls="grid grid-cols-1 md:grid-cols-2 gap-x-4",
                ),
                Hidden(name="lane", value=lane.name()),
                # ── ACTIONS ──────────────────────────────────────
                Div(
                    Button(
                        "Validate",
                        cls="btn btn-outline btn-sm",
                        hx_post=f"/flow/{lane.name()}/validate",
                        hx_target="#flow-feedback",
                        hx_swap="innerHTML",
                    ),
                    Button(
                        "▶ Start run",
                        cls="btn btn-primary btn-sm",
                        hx_post=f"/flow/{lane.name()}/start",
                        hx_target="#flow-feedback",
                        hx_swap="innerHTML",
                    ),
                    cls="flex gap-2 mt-4",
                ),
                # Where validate / start put their reply
                Div(id="flow-feedback", cls="mt-4"),
                hx_post=f"/flow/{lane.name()}/start",
                hx_target="#flow-feedback",
                cls="p-4 bg-base-200/50 rounded-box mt-4",
            ),
            cls="w-full md:w-1/2",
        ),
        Div(id="main-pane", cls="p-6 flex flex-col md:flex-row gap-6 w-full"),
    )


def _render_field_html(field: JsonDict, value: JsonValue) -> str:
    """Same as _form_field but returning an HTML string — used when
    we want to inject into a NotStr blob (so the outer form can
    keep a flat grid). Kept separate so the type stays clean."""
    from fasthtml.common import to_xml
    return to_xml(_form_field(field, value))


def _draft_detail(draft: Draft, *, lane: Lane | None) -> Div:
    """The draft-detail pane: re-uses the lane form with the draft's
    saved values pre-filled. The user edits and re-starts as a new run
    (the gateway owns persistence; we don't reimplement it)."""
    if lane is None:
        return Div(
            H2("Draft not loadable", cls="text-xl font-bold"),
            P(f"Draft {draft.ref()!r} references a lane that is not in the current lane list.", cls="text-sm"),
            P(f"params: {json.dumps(draft.params, indent=2)}", cls="font-mono text-xs whitespace-pre-wrap"),
            Div(id="main-pane", cls="p-6"),
        )
    return Div(
        Div(
            H2(f"Draft: {draft.title or draft.name or draft.ref()}", cls="text-xl font-bold"),
            P(f"References lane: {lane.title or lane.name()}", cls="text-sm text-base-content/60"),
            cls="p-6 border-b border-base-300",
        ),
        Div(
            _lane_detail(lane, schema_fields=[], required=[], gateway_url="",
                         prefill=draft.params).children[1],
            cls="p-6",
        ),
        id="main-pane",
    )


def _run_detail(run: Run) -> Div:
    """The run-detail pane: status badge, stages table, stop button,
    artifacts list. The live status is HTMX-polled (every 2s while
    non-terminal) so the operator sees stages flip without a manual
    refresh. SSE is the higher-fidelity option; the polling path is
    a fallback for browsers that block EventSource on the LAN."""
    is_terminal = (run.status or "").lower() in (
        "succeeded", "completed", "done", "stopped", "error", "failed"
    )
    poll_ms = 0 if is_terminal else 2000
    return Div(
        Div(
            H2("Run", cls="text-xl font-bold"),
            P(run.ref(), cls="font-mono text-xs text-base-content/50"),
            cls="p-6 border-b border-base-300",
        ),
        # Live status (HTMX polls; for SSE swap in hx-ext="sse" + sse-connect)
        Div(
            Div(
                H4("Status", cls="font-semibold"),
                _status_badge(run.status),
                cls="flex items-center gap-3",
            ),
            *([P(run.error, cls="text-error text-sm mt-2 font-mono")]
              if run.error else []),
            # Stages table
            H4("Stages", cls="font-semibold mt-4"),
            _stages_table(run),
            # Artifacts
            *([H4("Artifacts", cls="font-semibold mt-4")] if run.artifacts else []),
            *([NotStr(_artifacts_html(run.artifacts))] if run.artifacts else []),
            # Actions
            Div(
                *([Button(
                    "■ Stop",
                    cls="btn btn-error btn-sm",
                    hx_post=f"/run/{run.ref()}/stop",
                    hx_target="#run-status",
                    hx_swap="outerHTML",
                )] if not is_terminal else []),
                Button(
                    "↻ Refresh",
                    cls="btn btn-ghost btn-sm",
                    hx_get=f"/run/{run.ref()}/status",
                    hx_target="#run-status",
                    hx_swap="outerHTML",
                ),
                cls="flex gap-2 mt-4",
            ),
            id="run-status",
            cls="p-6",
            hx_get=f"/run/{run.ref()}/status" if poll_ms else None,
            hx_trigger=f"every {poll_ms}ms" if poll_ms else None,
            hx_swap="outerHTML",
        ),
        id="main-pane",
    )


def _stages_table(run: Run) -> Div:
    if not run.stages:
        return P("(no stages yet)", cls="text-sm text-base-content/50")
    return Table(
        Thead(Tr(Th("Stage"), Th("Engine"), Th("Status"), Th("Started"), Th("Ended"))),
        Tbody(*[
            Tr(
                Td(s.id),
                Td(s.engine or "—"),
                Td(_status_badge(s.status)),
                Td(s.started or "—"),
                Td(s.ended or "—"),
            ) for s in run.stages
        ]),
        cls="table table-sm w-full",
    )


def _artifacts_html(artifacts: list[JsonDict]) -> str:
    rows = "".join(
        f"<tr><td class='font-mono text-xs'>{a.get('name') or a.get('id') or '?'}</td>"
        f"<td>{a.get('kind') or '—'}</td>"
        f"<td class='text-xs text-base-content/60'>{(a.get('path') or '')[:60]}</td></tr>"
        for a in artifacts
    )
    return (
        f"<table class='table table-sm w-full'>"
        f"<thead><tr><th>Name</th><th>Kind</th><th>Path</th></tr></thead>"
        f"<tbody>{rows}</tbody></table>"
    )


# ── factory (called by __main__ with a configured client factory) ──

def build_app(get_client: collections.abc.Callable[[], GatewayClient]) -> FastHTML:
    """Build the FastHTML app. `get_client` is a zero-arg callable
    that returns a GatewayClient — tests swap this for a fake.
    Everything routes through it; no module-level state."""

    # HTMX from CDN (1.9.x has the sse extension we don't use yet,
    # but pinning 1.9 keeps the contract stable). The browser fetches
    # this once; we ship zero JS in the box.
    HTMX = Script(src="https://cdn.jsdelivr.net/npm/htmx.org@1.9.12/dist/htmx.min.js")

    hdrs = (
        Theme.slate.headers(daisy=True),  # Tailwind + DaisyUI + MonsterUI
        HTMX,
        Style("""
            html, body { height: 100%; margin: 0; }
            body { overflow: hidden; }
            #main-pane { overflow-y: auto; height: 100%; }
            pre { background: transparent; margin: 0; }
        """),
    )

    app, rt = fast_app(hdrs=hdrs, live=True)

    @rt("/")
    def index() -> Div:
        try:
            client = get_client()
            gw_url = client._base  # noqa: SLF001 — display only
            lanes = client.lanes()
            drafts = client.drafts()
            runs = client.runs()
        except GatewayError as e:
            return _render_fatal(e, gw_url=getattr(get_client(), "_base", "?"))

        return Container(
            _sidebar(active_lane=None, active_draft=None, active_run=None,
                     lanes=lanes, drafts=drafts, runs=runs, gateway_url=gw_url),
            Main(_new_run_banner(), id="main-pane", cls="flex-1"),
            cls="flex h-screen",
        )

    @rt("/flow/{lane_id}")
    def flow_detail(lane_id: str) -> Div:
        try:
            client = get_client()
            lanes = client.lanes()
            lane = next((l for l in lanes if l.name() == lane_id), None)
            if lane is None:
                raise GatewayError(f"lane {lane_id!r} not in /v1/lanes")
            schema = client.param_schema(lane_id)
            drafts = client.drafts()
            runs = client.runs()
            gw_url = client._base  # noqa: SLF001
        except GatewayError as e:
            return _err_alert(e)

        return Div(
            _sidebar(active_lane=lane_id, active_draft=None, active_run=None,
                     lanes=lanes, drafts=drafts, runs=runs, gateway_url=gw_url),
            Main(
                _lane_detail(
                    lane,
                    schema_fields=list(schema.fields),
                    required=list(schema.required),
                    gateway_url=gw_url,
                ),
                id="main-pane",
                cls="flex-1",
            ),
            hx_push_url=f"/flow/{lane_id}",
            cls="flex h-screen",
        )

    @rt("/flow/{lane_id}/validate")
    async def flow_validate(lane_id: str, req: Request) -> Div:
        try:
            client = get_client()
            params = _form_to_params(await req.form())
            # The validate door takes the same body the start door
            # takes (the AI feedback loop — QUEUE LANE LAW: no slot,
            # no GPU, no sidecar). Pass it through as a {flow_inline}
            # when one was provided; otherwise wrap as {flow: lane_id}.
            body: JsonDict
            if "flow_inline" in params:
                body = params
            else:
                body = {"flow": lane_id, "params": params.get("params", params)}
            result = client.validate(body)
        except GatewayError as e:
            return _err_alert(e)
        return _validate_result_card(result)

    @rt("/flow/{lane_id}/start")
    async def flow_start(lane_id: str, req: Request) -> Div:
        try:
            client = get_client()
            params = _form_to_params(await req.form())
            body: JsonDict
            if "flow_inline" in params:
                body = params
            else:
                body = {"flow": lane_id, "params": params.get("params", params)}
            result = client.start(body)
        except GatewayError as e:
            return _err_alert(e)
        return _start_result_card(result, client=client)

    @rt("/draft/{draft_id}")
    def draft_detail(draft_id: str) -> Div:
        try:
            client = get_client()
            draft = client.draft(draft_id)
            lanes = client.lanes()
            lane = next((l for l in lanes if l.name() == draft.lane), None) if draft.lane_name() else None
            drafts = client.drafts()
            runs = client.runs()
            gw_url = client._base  # noqa: SLF001
        except GatewayError as e:
            return _err_alert(e)
        return Div(
            _sidebar(active_lane=None, active_draft=draft_id, active_run=None,
                     lanes=lanes, drafts=drafts, runs=runs, gateway_url=gw_url),
            Main(_draft_detail(draft, lane=lane), id="main-pane", cls="flex-1"),
            hx_push_url=f"/draft/{draft_id}",
            cls="flex h-screen",
        )

    @rt("/run/{run_id}")
    def run_detail(run_id: str) -> Div:
        try:
            client = get_client()
            run = client.run(run_id)
            lanes = client.lanes()
            drafts = client.drafts()
            runs = client.runs()
            gw_url = client._base  # noqa: SLF001
        except GatewayError as e:
            return _err_alert(e)
        return Div(
            _sidebar(active_lane=None, active_draft=None, active_run=run_id,
                     lanes=lanes, drafts=drafts, runs=runs, gateway_url=gw_url),
            Main(_run_detail(run), id="main-pane", cls="flex-1"),
            hx_push_url=f"/run/{run_id}",
            cls="flex h-screen",
        )

    @rt("/run/{run_id}/status")
    def run_status(run_id: str) -> Div:
        """Polled by the run-detail pane. Returns the run-status block
        (the same one inside _run_detail) so HTMX can swap it in place."""
        try:
            client = get_client()
            run = client.run(run_id)
        except GatewayError as e:
            return _err_alert(e)
        return Div(
            Div(
                H4("Status", cls="font-semibold"),
                _status_badge(run.status),
                cls="flex items-center gap-3",
            ),
            *([P(run.error, cls="text-error text-sm mt-2 font-mono")]
              if run.error else []),
            H4("Stages", cls="font-semibold mt-4"),
            _stages_table(run),
            *([H4("Artifacts", cls="font-semibold mt-4")] if run.artifacts else []),
            *([NotStr(_artifacts_html(run.artifacts))] if run.artifacts else []),
            id="run-status",
            cls="p-6",
        )

    @rt("/run/{run_id}/stop")
    def run_stop(run_id: str) -> Div:
        try:
            client = get_client()
            result = client.stop(run_id)
        except GatewayError as e:
            return _err_alert(e)
        return Div(
            _status_badge("stopped"),
            P(f"Stop requested: {result.get('status', '?')}", cls="text-sm"),
            id="run-status",
            cls="p-6",
        )

    return app


# ── small render helpers for HTMX fragments ─────────────────────────

def _validate_result_card(result: JsonDict) -> Div:
    # The validate door returns the SAME envelope the start door does
    # (the sidecar contract). We render the WHOLE envelope so the
    # operator sees every refusal detail (missing field, expected
    # type, suggested fix) — never just the top-level `error` string.
    # The `ok` flag is the canonical "did it compile" answer; if
    # absent, treat any `error` field as a refusal.
    if not result:
        return Div(
            "(empty reply — gateway returned no body)",
            cls="alert alert-warning",
            role="status",
        )
    if result.get("ok", False) or (not result.get("error") and not result.get("refusal")):
        return Div(
            "✅ Compile clean — start the run to queue it.",
            cls="alert alert-success",
            role="status",
        )
    return Div(
        Div("Compile refusal", cls="font-semibold mb-1"),
        NotStr(f"<pre class='whitespace-pre-wrap text-xs'>{json.dumps(result, indent=2)}</pre>"),
        cls="alert alert-warning",
        role="status",
    )


def _start_result_card(result: JsonDict, *, client: GatewayClient) -> Div:
    run_id = result.get("run_id") or result.get("id")
    if not run_id:
        # 4xx / refused before registration — result IS the error envelope
        return _err_alert(GatewayError(json.dumps(result, indent=2)))
    return Div(
        P(f"Queued run ", cls="inline"),
        A(run_id, href=f"/run/{run_id}",
          hx_get=f"/run/{run_id}",
          hx_target="#main-pane",
          hx_push_url="true",
          cls="link link-primary font-mono text-sm"),
        P("Watch it in the sidebar's Runs list (or click through).", cls="text-sm text-base-content/60"),
        cls="alert alert-info",
        role="status",
    )


def _render_fatal(err: Exception, *, gw_url: str) -> Div:
    """Top-of-page fatal — gateway unreachable at boot."""
    return Container(
        Div(
            H1("Flow Tavern — gateway unreachable", cls="text-2xl font-bold"),
            P(f"Endpoint: ", gw_url, cls="font-mono text-sm"),
            _err_alert(err),
            P("Set $MELITE_GATEWAY (canonical default http://localhost:33081) "
              "and re-run.", cls="text-sm text-base-content/60"),
            cls="p-8",
        ),
    )


# ── form → params ───────────────────────────────────────────────────

def _form_to_params(form: collections.abc.Mapping[str, str]) -> JsonDict:
    """Convert a starlette form multidict into the {flow_inline:
    {...}} or {params: {...}} shape the gateway accepts. The 'lane'
    hidden field is the lane name (not a body field). Booleans from
    the toggle get coerced; checkboxes absent → False."""
    out: JsonDict = {}
    params: dict[str, str | bool | int | float] = {}
    for k, v in form.multi_items() if hasattr(form, "multi_items") else form.items():
        if k == "lane":
            continue
        if v == "":
            # The gateway treats empty strings as 'not set' for most
            # fields; keep the behavior but skip the key (cleaner wire).
            continue
        if v in ("true", "false"):
            params[k] = (v == "true")
            continue
        # try numeric coercion
        try:
            if "." in v:
                params[k] = float(v)
            else:
                params[k] = int(v)
            continue
        except ValueError:
            pass
        params[k] = v
    out["params"] = params
    return out
