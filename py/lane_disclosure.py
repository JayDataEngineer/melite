"""lane_disclosure.py — the lane disclosure engine (2026-09-03).

Serves the progressive-disclosure surface the DSH tools contract:
GET /v1/card-tools, GET /v1/cards/<lane>/bundle, GET /v1/skills,
GET /v1/skills/<id>.

THE LEVELS (operator: "does this handle both levels? the card uses h3,
which has its OWN agent folder and a prompt guide that needs to get to
the agent"):

  1. CARD    action_cards/<genre>/<card>/   — tool.json manifests,
             AGENT.md (compose laws), agents/skills/<stem>/SKILL.md
  2. MODEL   models/<genre>/<id>/           — GUIDE.md (the operating
             guide: deadline laws, verified shapes, budgets),
             agents/AGENT.md, agents/skills/<stem>/SKILL.md
  3. BASE    the family a model derives from — h3-timeline boards h3;
             the BASE model's craft (h3-prompt-writing) rides the
             bundle through the prefix chain (h3-timeline → h3)

ID scheme (skill_index/skill_read speak it):
  card:<card>                card AGENT.md
  card:<card>:<stem>         card-level SKILL.md
  model:<id>                 model AGENT.md
  model:<id>:<stem>          model-level SKILL.md
  guide:<id>                 model GUIDE.md
  flow:<name>                flows/<name>/flow.py — the PYTHON
                             declaration (concept → mesh → remesh →
                             … — a LANE class of its own); the skill
                             body is the module source itself

LEVEL 4 — FLOW TEMPLATES (flows/<name>/flow.py): multi-step
orchestrated lanes. Distinct artifact class from cards: a card
composes ONE run; a flow chains STAGES across engines, edges typed
at construction (docs/queue/flow-typed-edges.md). Served as "flows"
in the bundle + a flow:<name> skill row. The registry lists ONLY
declarations the run door can load — every row comes from
load_flow() itself, the same construction {flow:name} submit runs,
so peek and run cannot drift apart (the yaml door + its parser
retired 2026-09-04 — design record docs/queue/flows.md).

THE CALLABLE TABLE IS CARDS (+ FLOWS), NEVER MODELS (operator order,
2026-09-04: "the only way to actually do inference is through action
cards, yet I see the model level as available for inference"). A
model is a card PARAMETER plus craft docs: peek() lists no model
rows, kind="model" is refused by _norm_kind, and the MODEL level
above rides the bundles of the cards that board it (family + base
chain) and the skills surface (model:<id> / guide:<id> rows).

Every row carries a one-line description (frontmatter) so the index
stays cheap; bodies load only via skill_read (ledgered skill.read).

LANE WIRE GATE (2026-09-05, the run_wire/form_wire precedent): every
row this module serves is CONSTRUCTED as a frozen py/lane_wire.py row
— an invalid row cannot be built, so it cannot be served. Malformed
SOURCE rows (a bad tool.json manifest, an unbuildable doc row) skip
LOUDLY (stderr reason, listing continues — RESILIENCE LAW); a row the
disclosure engine ITSELF cannot build is a code bug and raises
LaneWireError, which the gateway doors answer as a structured 500
(never a silent fallback).
"""

from __future__ import annotations

import json
import re
import sys
from collections.abc import Callable
from pathlib import Path
from typing import TypedDict

import lane_wire

# The wire-envelope shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


class _ManifestEntry(TypedDict):
    genre: str
    rows: list[lane_wire.ToolManifestRow]


# A read document: the frozen skill row + the path it was read from.
type DocRow = tuple[lane_wire.SkillRow, str]


class _CardBucket(TypedDict):
    dir: Path
    rows: list[DocRow]

# a wire-contract refusal the disclosure engine could not construct
# around — the doors translate it to a structured 500
LaneWireError = lane_wire.LaneWireError

REPO = Path(__file__).resolve().parent.parent
ENGINES_ROOT = REPO / "plugins" / "engines"

# ---------------------------------------------------------------- parse


_FM_RE = re.compile(
    r"\A---\s*\n(.*?)\n---\s*\n?", re.S)
_KV_RE = re.compile(r"^(name|description):\s*(.+?)\s*$", re.M)


def _frontmatter(text: str) -> dict[str, str]:
    """name/description from yaml frontmatter; falls back to the first
    heading line so an undecorated doc still indexes honestly."""
    m = _FM_RE.match(text)
    out: dict[str, str] = {}
    if m:
        for k, v in _KV_RE.findall(m.group(1)):
            out[k] = v.strip().strip('"\'')
    if "name" not in out:
        h = re.search(r"(?m)^#\s+(.+)$", text)
        out["name"] = h.group(1).strip() if h else ""
    out.setdefault("description", "")
    return out


def _read_doc(path: Path, sid: str, scope: str,
              genre: str | None = None, card: str | None = None,
              model: str | None = None) -> tuple[lane_wire.SkillRow, str] | None:
    """One doc → (frozen SkillRow, path) — the LANE WIRE GATE at the
    disk rim. A doc whose row cannot be built (empty id/name/scope,
    card+model both set) is SKIPPED LOUDLY, never served (RESILIENCE
    LAW: document, then continue)."""
    try:
        text = path.read_text(encoding="utf-8", errors="surrogateescape")
    except OSError:
        return None
    fm = _frontmatter(text)
    try:
        row = lane_wire.SkillRow(
            id=sid,
            name=fm["name"] or path.stem,
            description=fm["description"][:200],
            scope=scope, genre=genre, card=card, model=model)
    except lane_wire.ValidationError as e:
        print("[lane_disclosure] skill row refused (%s): %s"
              % (path, lane_wire.refusal_reason(e)), file=sys.stderr)
        return None
    return row, str(path)


# ---------------------------------------------------------------- scan


def _engine_dirs() -> list[Path]:
    if not ENGINES_ROOT.is_dir():
        return []
    return [d for d in sorted(ENGINES_ROOT.iterdir()) if d.is_dir()
            and (d / "action_cards").is_dir()]


def _model_rows(engine: Path) -> list[DocRow]:
    """LEVEL 2 + GUIDE: models/<genre>/<id>/ agents + GUIDE.md.
    Rows are (SkillRow, path); unbuildable rows skip loudly."""
    rows: list[DocRow] = []
    models_root = engine / "models"
    if not models_root.is_dir():
        return rows
    for genre_dir in sorted(models_root.iterdir()):
        if not genre_dir.is_dir():
            continue
        for mdir in sorted(genre_dir.iterdir()):
            if not mdir.is_dir():
                continue
            mid = mdir.name
            guide = mdir / "GUIDE.md"
            if guide.is_file():
                r = _read_doc(guide, "guide:%s" % mid, "guide",
                              genre=genre_dir.name, model=mid)
                if r:
                    rows.append(r)
            agent = mdir / "agents" / "AGENT.md"
            if agent.is_file():
                r = _read_doc(agent, "model:%s" % mid, "model",
                              genre=genre_dir.name, model=mid)
                if r:
                    rows.append(r)
            skills = mdir / "agents" / "skills"
            if skills.is_dir():
                for sk in sorted(skills.iterdir()):
                    doc = sk / "SKILL.md" if sk.is_dir() else (
                        sk if sk.suffix == ".md" else None)
                    if doc and doc.is_file():
                        r = _read_doc(doc, "model:%s:%s" % (mid, sk.name),
                                      "model-skill",
                                      genre=genre_dir.name, model=mid)
                        if r:
                            rows.append(r)
    return rows


def _card_rows(engine: Path) -> tuple[list[DocRow], dict[str, _CardBucket]]:
    """LEVEL 1: action_cards/<genre>/<card>/ AGENT.md + skills.
    Returns (rows, by_card_dir) for bundle assembly — rows are
    (SkillRow, path)."""
    rows: list[DocRow] = []
    by_card: dict[str, _CardBucket] = {}
    cards_root = engine / "action_cards"
    if not cards_root.is_dir():
        return rows, by_card
    for genre_dir in sorted(cards_root.iterdir()):
        if not genre_dir.is_dir() or genre_dir.name.startswith("_"):
            continue
        for cdir in sorted(genre_dir.iterdir()):
            if not cdir.is_dir():
                continue
            cid = cdir.name
            bucket = by_card.setdefault(cid, {"dir": cdir, "rows": []})
            agent = cdir / "AGENT.md"
            if not agent.is_file():
                agent = cdir / "agents" / "AGENT.md"
            if agent.is_file():
                r = _read_doc(agent, "card:%s" % cid, "card",
                              genre=genre_dir.name, card=cid)
                if r:
                    rows.append(r)
                    bucket["rows"].append(r)
            skills = cdir / "agents" / "skills"
            if skills.is_dir():
                for sk in sorted(skills.iterdir()):
                    doc = sk / "SKILL.md" if sk.is_dir() else (
                        sk if sk.suffix == ".md" else None)
                    if doc and doc.is_file():
                        r = _read_doc(doc, "card:%s:%s" % (cid, sk.name),
                                      "card-skill",
                                      genre=genre_dir.name, card=cid)
                        if r:
                            rows.append(r)
                            bucket["rows"].append(r)
    return rows, by_card


def _manifests(engine: Path) -> dict[str, _ManifestEntry]:
    """card dir → {"genre", "rows"} — its tool.json manifests as frozen
    lane_wire.ToolManifestRow rows, plus the genre dir the card lives
    under (peek filters). The LANE WIRE GATE at the disk rim: a
    manifest that cannot be BUILT (no name/version/kind/card, a string
    version, params_schema that is not a schema shape) is skipped
    LOUDLY — the duck-typed isinstance-only admission era let those
    ride the agent surface silently (RESILIENCE LAW: document, then
    continue)."""
    out: dict[str, _ManifestEntry] = {}
    cards_root = engine / "action_cards"
    if not cards_root.is_dir():
        return out
    for tj in cards_root.glob("*/*/tool.json"):
        try:
            data = json.loads(tj.read_text(encoding="utf-8",
                                           errors="surrogateescape"))
        except (OSError, json.JSONDecodeError) as e:
            print("[lane_disclosure] tool.json unreadable (%s): %s"
                  % (tj, e), file=sys.stderr)
            continue
        rows = data if isinstance(data, list) else [data]
        kept: list[lane_wire.ToolManifestRow] = []
        for m in rows:
            try:
                kept.append(lane_wire.ToolManifestRow.model_validate(m))
            except lane_wire.ValidationError as e:
                print("[lane_disclosure] manifest refused (%s): %s"
                      % (tj, lane_wire.refusal_reason(e)), file=sys.stderr)
        if not kept:
            # every manifest refused → the card is NOT callable (no
            # admissible tool row): it leaves the disclosure surface
            # entirely — peek must not advertise a lane whose tools
            # all failed the gate.
            continue
        out[tj.parent.name] = {"genre": tj.parent.parent.name,
                               "rows": kept}
    return out


def _model_ids(engine: Path) -> set[str]:
    ids: set[str] = set()
    models_root = engine / "models"
    if models_root.is_dir():
        for genre_dir in models_root.iterdir():
            if genre_dir.is_dir():
                for mdir in genre_dir.iterdir():
                    if mdir.is_dir():
                        ids.add(mdir.name)
    return ids


def _base_chain(family: str, all_ids: set[str]) -> list[str]:
    """LEVEL 3: the base models a family derives from by leading token —
    h3-timeline → h3; h3-keyframe → h3. Exact id wins over prefixes."""
    out = []
    for cand in sorted(all_ids):
        if cand != family and family.startswith(cand + "-"):
            out.append(cand)
    return out


# ------------------------------------------------------------- kinds


_KINDS = {"action_card": "card", "card": "card",
          "template": "flow", "flow": "flow", "flow": "flow"}


def _norm_kind(kind: str | None) -> str | None:
    """Peek/load speak the agent's vocabulary: action_card / template
    (or flow) — normalized to the internal lane classes. Empty →
    None (unfiltered). Unknown → ValueError (named refusal).

    'model' is REFUSED here on purpose (operator order, 2026-09-04:
    "the only way to actually do inference is through action cards,
    yet I see the model level as available for inference"). Models
    are not callable lanes — a model is a card PARAMETER plus craft
    docs: parameter detail via model_catalog, craft via skill_read,
    and a model's docs ride the bundle of the card that boards it."""
    if kind is None or str(kind).strip() == "":
        return None
    k = _KINDS.get(str(kind).strip().lower())
    if k is None:
        raise ValueError(
            "unknown kind %r — the lane table is the CALLABLE surface "
            "(action_card | template); models are not lanes: parameter "
            "detail via model_catalog, craft docs via skill_read" % kind)
    return k


# ------------------------------------------------------------- flows


def _flow_rows() -> list[DocRow]:
    """LEVEL 4: flows/<name>/flow.py — the live PYTHON declarations.

    The registry lists ONLY lanes the run door can load: each row
    comes from load_flow() itself — the same construction the
    {flow:name} submit door runs — so peek and run cannot drift
    apart. A declaration that refuses construction is NOT a registry
    row (walls sweep flows/ loadable-clean; a broken declaration is
    a build failure, not a hidden lane). The skill body (_path) is
    the module source: reading a flow template IS reading its
    contract — id, stages, typed inputs/outputs, params — verbatim.

    Rows are (SkillRow with typed steps, path); a row that cannot be
    BUILT is a code bug (LaneWireError), never a hidden lane."""
    import flow as flow_mod
    rows: list[DocRow] = []
    root = REPO / "flows"
    if not root.is_dir():
        return rows
    for name in flow_mod.scan_flow_ids():
        try:
            fl = flow_mod.load_flow(name)
        except flow_mod.FlowError:
            continue
        try:
            step_rows = [lane_wire.FlowStepRow(
                             id=st.id, type=st.engine, plugin=st.engine)
                         for st in fl.stages]
            row = lane_wire.SkillRow(
                id="flow:%s" % fl.id,
                name=fl.id,
                description=str(fl.description or "")[:200],
                scope="flow",
                steps=step_rows, step_count=len(step_rows))
        except lane_wire.ValidationError as e:
            raise LaneWireError(
                "flow %s: lane wire refusal: %s"
                % (name, lane_wire.refusal_reason(e))) from e
        rows.append((row, str(root / name / "flow.py")))
    return rows


def flow_lanes() -> list[dict[str, str | int | None]]:
    """The flow template index (bundle list surface): one compact row
    per live flow declaration."""
    return [{"lane": r.name, "flow": r.id,
             "description": r.description,
             "steps": r.step_count}
            for r, _p in _flow_rows()]


def peek(kind: str | None = None, genre: str | None = None) -> dict[str, JsonValue]:
    """GET /v1/lanes — the PEEK table: one preview row per CALLABLE
    lane. The callable surface is action cards (the ONLY inference
    interface — queue law) plus flow templates (multi-step lanes that
    run through the queue's template door). MODELS ARE NOT LANES
    (operator order, 2026-09-04): a model is a card parameter +
    craft docs, never an inference entry of its own — parameter
    detail lives in model_catalog, craft docs in the skills this
    module serves, and they ride the bundle of the card that boards
    the model. The agent peeks a class (and optionally a genre),
    reads titles/descriptions/shape counts, THEN loads the one lane
    it wants. Rows are cheap by design — no bodies, no schemas — and
    every row is a frozen lane_wire row (an unbuildable preview
    cannot be served)."""
    try:
        k = _norm_kind(kind)
    except ValueError as e:
        return lane_wire.LanesEnvelope(
            count=0, lanes=[], error=str(e)).wire()
    genre = (genre or "").strip().lower() or None
    try:
        rows: list[lane_wire.CardLaneRow | lane_wire.FlowLaneRow] = []
        for engine in _engine_dirs():
            manifests = _manifests(engine)
            card_rows, _ = _card_rows(engine)
            for cid, entry in manifests.items():
                g = str(entry.get("genre") or "").lower() or None
                if genre and g != genre:
                    continue
                skills = sum(1 for r, _p in card_rows if r.card == cid)
                params = 0
                title = None
                for m in entry["rows"]:
                    props = m.params_schema.properties
                    if isinstance(props, dict):
                        params = max(params, len(props))
                    if title is None and m.stage_title:
                        title = str(m.stage_title)
                rows.append(lane_wire.CardLaneRow(
                    lane=cid, genre=g,
                    title=title or cid,
                    description=next((str(m.description)
                                      for m in entry["rows"]
                                      if m.description), ""),
                    params=params, skills=skills))
        for r, _p in _flow_rows():
            rows.append(lane_wire.FlowLaneRow(
                lane=r.name, genre=None,
                title=r.name,
                description=r.description[:120],
                steps=r.step_count or 0))
        if k == "card":
            rows = [r for r in rows
                    if r.kind == lane_wire.PeekKind.ACTION_CARD.value]
        elif k == "flow":
            rows = [r for r in rows
                    if r.kind == lane_wire.PeekKind.TEMPLATE.value]
        return lane_wire.LanesEnvelope(count=len(rows), lanes=rows).wire()
    except lane_wire.ValidationError as e:
        raise LaneWireError(
            "lanes envelope refusal: %s"
            % lane_wire.refusal_reason(e)) from e


# ---------------------------------------------------------------- doors


def card_tools() -> list[dict[str, JsonValue]]:
    """GET /v1/card-tools — every manifest on disk, flattened. Each
    row already passed the ToolManifestRow gate in _manifests (a
    manifest that cannot be built is skipped loudly there, never
    served here)."""
    out: list[dict[str, JsonValue]] = []
    for engine in _engine_dirs():
        for entry in _manifests(engine).values():
            out.extend(m.wire() for m in entry["rows"])
    return out


def skill_index() -> dict[str, JsonValue]:
    """GET /v1/skills — one cheap row per document across ALL levels.
    Doc rows skip loudly at the _read_doc rim; the envelope itself is
    a frozen lane_wire row."""
    rows: list[lane_wire.SkillRow] = []
    for engine in _engine_dirs():
        rows.extend(r for r, _p in _model_rows(engine))
        card_rows, _ = _card_rows(engine)
        rows.extend(r for r, _p in card_rows)
    rows.extend(r for r, _p in _flow_rows())
    try:
        return lane_wire.SkillsEnvelope(
            count=len(rows), skills=rows).wire()
    except lane_wire.ValidationError as e:
        raise LaneWireError(
            "skills envelope refusal: %s"
            % lane_wire.refusal_reason(e)) from e


def lane_bundle(lane: str, kind: str | None = None) -> tuple[int, dict[str, JsonValue]]:
    """GET /v1/cards/<lane>/bundle?kind=… — ONE lane's full surface, the
    LOAD tier: the card manifests (tools) + the merged skill rows across
    card level, model level, base chain, and the guide + the lane's
    PRIMARY AGENT DOC INJECTED INLINE (agent.content) so the loader
    reads orientation with zero extra round-trips.

    kind gates the resolution class (peek/load vocabulary):
      action_card → card dirs only; template|flow → flow templates
      only; absent → any class. 'model' is not a lane class (operator
      order, 2026-09-04 — models are card parameters + craft docs, see
      _norm_kind): a bare model id still resolves to the CARD that
      boards it. 404 names what was searched.

    The served body is a frozen lane_wire.BundleRow — the class
    cross-invariant (card bundles carry manifests and no flow rows;
    template bundles carry the flow row and no card) refuses AT
    CONSTRUCTION, so a mixed-class bundle cannot be served."""
    try:
        k = _norm_kind(kind)
    except ValueError as e:
        return 400, {"error": str(e)}
    lane = (lane or "").strip()
    if not lane:
        return 400, {"error": "lane is required"}
    for engine in _engine_dirs():
        manifests = _manifests(engine)
        model_rows = _model_rows(engine)
        ids = _model_ids(engine)

        # resolve: card dir name, or a card boarding this model (a
        # model id is NOT a lane of its own — it lands on the card,
        # the only run surface)
        card_dir = lane if lane in manifests else None
        if card_dir is None:
            for cid, entry in manifests.items():
                if any(m.model == lane for m in entry["rows"]):
                    card_dir = cid
                    break
        if k == "flow":
            continue                       # templates resolve below
        if card_dir is None:
            continue                       # cards are the only lane class
        tools = manifests[card_dir]["rows"]
        families = [m.model for m in tools if m.model] or [card_dir]
        _, by_card = _card_rows(engine)
        card_bucket_rows = list(by_card.get(card_dir, {}).get("rows", []))
        agent_row = None
        for r in card_bucket_rows:
            if r[0].id == "card:%s" % card_dir:
                agent_row = r
                break

        skills: list[lane_wire.SkillRow] = [r for r, _p in card_bucket_rows]
        for fam in families:
            for r, _p in model_rows:
                rid = r.id
                if rid == "model:%s" % fam or rid.startswith("model:%s:" % fam) \
                        or rid == "guide:%s" % fam:
                    skills.append(r)
            for base in _base_chain(fam, ids):
                for r, _p in model_rows:
                    rid = r.id
                    if rid == "model:%s" % base \
                            or rid.startswith("model:%s:" % base) \
                            or rid == "guide:%s" % base:
                        skills.append(r)

        # dedupe by id, keep order (guide first for read_first)
        seen: set = set()
        uniq: list[lane_wire.SkillRow] = []
        for r in skills:
            if r.id not in seen:
                seen.add(r.id)
                uniq.append(r)
        guides = [r.id for r in uniq if r.id.startswith("guide:")]
        read_first = guides + [r.id for r in uniq
                               if not r.id.startswith("guide:")]

        agent = _agent_block(agent_row)
        try:
            bundle = lane_wire.BundleRow(
                lane=lane, card=card_dir,
                kind=lane_wire.PeekKind.ACTION_CARD,
                agent=agent, tools=list(tools),
                flows=[], skills=uniq,
                read_first=read_first[:6])
        except lane_wire.ValidationError as e:
            raise LaneWireError(
                "bundle refusal (%s): %s"
                % (lane, lane_wire.refusal_reason(e))) from e
        return 200, bundle.wire()
    # LEVEL 4 — a flow lane (flows/<lane>/flow.py, api:true).
    # Distinct lane class: no card manifests; the template IS the
    # contract, carried under "flows" + a flow:<name> skill row.
    if k != "card":
        for r, _p in _flow_rows():
            if r.name == lane or r.id == "flow:%s" % lane:
                try:
                    agent = lane_wire.AgentBlock(
                        source=r.id, name=r.name,
                        content=_flow_orientation(r))
                    bundle = lane_wire.BundleRow(
                        lane=lane, card=None,
                        kind=lane_wire.PeekKind.TEMPLATE,
                        agent=agent, tools=[], flows=[r], skills=[r],
                        read_first=[r.id])
                except lane_wire.ValidationError as e:
                    raise LaneWireError(
                        "bundle refusal (%s): %s"
                        % (lane, lane_wire.refusal_reason(e))) from e
                return 200, bundle.wire()
    return 404, {"error": "no such lane: %r (kind=%s)"
                 % (lane, k or "any")}


def _agent_block(agent_row: tuple[lane_wire.SkillRow, str] | None) -> lane_wire.AgentBlock | None:
    """The lane's primary agent doc, INLINED — the load tier's promise:
    orientation arrives with the bundle, no second call needed."""
    if agent_row is None:
        return None
    row, path = agent_row
    try:
        body = Path(path).read_text(
            encoding="utf-8", errors="surrogateescape")
    except OSError:
        return lane_wire.AgentBlock(source=row.id, name=row.name,
                                    content="")
    return lane_wire.AgentBlock(source=row.id, name=row.name,
                                content=body)


def _flow_orientation(r: lane_wire.SkillRow) -> str:
    """Flows carry no AGENT.md — the orientation doc is COMPOSED from
    the template itself: name, description, the step ladder."""
    steps = r.steps or []
    lines = ["# %s (flow template)" % r.name, ""]
    if r.description:
        lines += [str(r.description), ""]
    lines += ["## Steps", ""]
    for s in steps:
        lines.append("- **%s** (%s%s)" % (
            s.id, s.type,
            " · %s" % s.plugin if s.plugin else ""))
    return "\n".join(lines)


def skill_read(sid: str, ledger: Callable[[str, dict[str, str]], None] | None = None) -> tuple[int, dict[str, JsonValue]]:
    """GET /v1/skills/<id> — one document's full body, ledgered. The
    served row is a frozen lane_wire.SkillDocRow (an unbuildable body
    row cannot be served)."""
    sid = (sid or "").strip()
    found = None
    for r, p in _flow_rows():
        if r.id == sid:
            found = (r, p)
            break
    if found is None:
        for engine in _engine_dirs():
            for r, p in _model_rows(engine) + _card_rows(engine)[0]:
                if r.id == sid:
                    found = (r, p)
                    break
            if found:
                break
    if found is None:
        return 404, {"error": "no such skill: %r" % sid}
    row, path = found
    try:
        body = Path(path).read_text(
            encoding="utf-8", errors="surrogateescape")
    except OSError as e:
        return 500, {"error": "unreadable: %s" % e}
    try:
        doc = lane_wire.SkillDocRow(
            id=sid, name=row.name, description=row.description,
            scope=row.scope, content=body)
    except lane_wire.ValidationError as e:
        raise LaneWireError(
            "skill doc refusal (%s): %s"
            % (sid, lane_wire.refusal_reason(e))) from e
    if ledger:
        ledger("skill.read", {"id": sid})
    return 200, doc.model_dump()
