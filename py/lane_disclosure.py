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
  flow:<name>                pipelines/<name>/pipeline.yaml (the multi-
                             step flow template body — concept → mesh →
                             remesh → … — a LANE class of its own)

LEVEL 4 — FLOW TEMPLATES (pipelines/<name>/pipeline.yaml, api:true):
multi-step orchestrated lanes. Distinct artifact class from cards: a
card composes ONE run; a flow chains STEPS across plugins. Served as
"pipelines" in the bundle + a flow:<name> skill row whose body is the
yaml itself (rename to "templates" pending; the wire key changes
with the rename order).

THE CALLABLE TABLE IS CARDS (+ FLOWS), NEVER MODELS (operator order,
2026-09-04: "the only way to actually do inference is through action
cards, yet I see the model level as available for inference"). A
model is a card PARAMETER plus craft docs: peek() lists no model
rows, kind="model" is refused by _norm_kind, and the MODEL level
above rides the bundles of the cards that board it (family + base
chain) and the skills surface (model:<id> / guide:<id> rows).

Every row carries a one-line description (frontmatter) so the index
stays cheap; bodies load only via skill_read (ledgered skill.read).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ENGINES_ROOT = REPO / "plugins" / "engines"

# ---------------------------------------------------------------- parse


_FM_RE = re.compile(
    r"\A---\s*\n(.*?)\n---\s*\n?", re.S)
_KV_RE = re.compile(r"^(name|description):\s*(.+?)\s*$", re.M)


def _frontmatter(text: str) -> dict:
    """name/description from yaml frontmatter; falls back to the first
    heading line so an undecorated doc still indexes honestly."""
    m = _FM_RE.match(text)
    out: dict = {}
    if m:
        for k, v in _KV_RE.findall(m.group(1)):
            out[k] = v.strip().strip('"\'')
    if "name" not in out:
        h = re.search(r"(?m)^#\s+(.+)$", text)
        out["name"] = h.group(1).strip() if h else ""
    out.setdefault("description", "")
    return out


def _read_doc(path: Path, sid: str, scope: str) -> dict | None:
    try:
        text = path.read_text(encoding="utf-8", errors="surrogateescape")
    except OSError:
        return None
    fm = _frontmatter(text)
    return {"id": sid, "name": fm["name"] or path.stem,
            "description": fm["description"][:200], "scope": scope,
            "_path": str(path)}


# ---------------------------------------------------------------- scan


def _engine_dirs():
    if not ENGINES_ROOT.is_dir():
        return []
    return [d for d in sorted(ENGINES_ROOT.iterdir()) if d.is_dir()
            and (d / "action_cards").is_dir()]


def _model_rows(engine: Path) -> list[dict]:
    """LEVEL 2 + GUIDE: models/<genre>/<id>/ agents + GUIDE.md."""
    rows: list[dict] = []
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
                r = _read_doc(guide, "guide:%s" % mid, "guide")
                if r:
                    r["genre"], r["model"] = genre_dir.name, mid
                    rows.append(r)
            agent = mdir / "agents" / "AGENT.md"
            if agent.is_file():
                r = _read_doc(agent, "model:%s" % mid, "model")
                if r:
                    r["genre"], r["model"] = genre_dir.name, mid
                    rows.append(r)
            skills = mdir / "agents" / "skills"
            if skills.is_dir():
                for sk in sorted(skills.iterdir()):
                    doc = sk / "SKILL.md" if sk.is_dir() else (
                        sk if sk.suffix == ".md" else None)
                    if doc and doc.is_file():
                        r = _read_doc(doc, "model:%s:%s" % (mid, sk.name),
                                      "model-skill")
                        if r:
                            r["genre"], r["model"] = genre_dir.name, mid
                            rows.append(r)
    return rows


def _card_rows(engine: Path) -> tuple[list[dict], dict]:
    """LEVEL 1: action_cards/<genre>/<card>/ AGENT.md + skills.
    Returns (rows, by_card_dir) for bundle assembly."""
    rows: list[dict] = []
    by_card: dict = {}
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
                r = _read_doc(agent, "card:%s" % cid, "card")
                if r:
                    r["genre"], r["card"] = genre_dir.name, cid
                    rows.append(r)
                    bucket["rows"].append(r)
            skills = cdir / "agents" / "skills"
            if skills.is_dir():
                for sk in sorted(skills.iterdir()):
                    doc = sk / "SKILL.md" if sk.is_dir() else (
                        sk if sk.suffix == ".md" else None)
                    if doc and doc.is_file():
                        r = _read_doc(doc, "card:%s:%s" % (cid, sk.name),
                                      "card-skill")
                        if r:
                            r["genre"], r["card"] = genre_dir.name, cid
                            rows.append(r)
                            bucket["rows"].append(r)
    return rows, by_card


def _manifests(engine: Path) -> dict:
    """card dir → {"genre", "rows"} — its tool.json manifests (loaded
    JSON) plus the genre dir the card lives under (peek filters)."""
    out: dict = {}
    cards_root = engine / "action_cards"
    if not cards_root.is_dir():
        return out
    for tj in cards_root.glob("*/*/tool.json"):
        try:
            data = json.loads(tj.read_text(encoding="utf-8",
                                           errors="surrogateescape"))
        except (OSError, json.JSONDecodeError):
            continue
        rows = data if isinstance(data, list) else [data]
        out[tj.parent.name] = {"genre": tj.parent.parent.name,
                               "rows": [m for m in rows
                                        if isinstance(m, dict)]}
    return out


def _model_ids(engine: Path) -> set:
    ids: set = set()
    models_root = engine / "models"
    if models_root.is_dir():
        for genre_dir in models_root.iterdir():
            if genre_dir.is_dir():
                for mdir in genre_dir.iterdir():
                    if mdir.is_dir():
                        ids.add(mdir.name)
    return ids


def _base_chain(family: str, all_ids: set) -> list[str]:
    """LEVEL 3: the base models a family derives from by leading token —
    h3-timeline → h3; h3-keyframe → h3. Exact id wins over prefixes."""
    out = []
    for cand in sorted(all_ids):
        if cand != family and family.startswith(cand + "-"):
            out.append(cand)
    return out


# ------------------------------------------------------------- kinds


_KINDS = {"action_card": "card", "card": "card",
          "template": "flow", "pipeline": "flow", "flow": "flow"}


def _norm_kind(kind) -> str | None:
    """Peek/load speak the agent's vocabulary: action_card / template
    (or pipeline) — normalized to the internal lane classes. Empty →
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


def _flow_rows() -> list[dict]:
    """LEVEL 4: flows/<name>/pipeline.yaml with the api:true gate —
    one row per flow template (the yaml_list reader's scan, plus the
    step summary so the index row says what the flow DOES)."""
    import yaml
    rows: list[dict] = []
    root = REPO / "flows"
    if not root.is_dir():
        return rows
    for pdir in sorted(root.iterdir()):
        py = pdir / "pipeline.yaml"
        if not py.is_file():
            continue
        try:
            text = py.read_text(encoding="utf-8", errors="surrogateescape")
        except OSError:
            continue
        head = text[:4095]
        if "api: true" not in head:
            continue
        try:
            doc = yaml.safe_load(text)
        except yaml.YAMLError:
            doc = {}
        doc = doc if isinstance(doc, dict) else {}
        # yaml_detail's shape law: flows carry steps: (multi-stage) or
        # nodes: (single-lane node list) — summarize either honestly.
        steps = doc.get("steps") or doc.get("nodes") or []
        step_rows = [{"id": s.get("id", ""), "type": s.get("type", ""),
                      "plugin": s.get("plugin", "")}
                     for s in steps if isinstance(s, dict)]
        rows.append({
            "id": "flow:%s" % pdir.name,
            "name": str(doc.get("name") or pdir.name),
            "description": str(doc.get("description") or "")[:200],
            "scope": "flow",
            "steps": step_rows,
            "step_count": len(step_rows),
            "_path": str(py),
        })
    return rows


def flow_lanes() -> list[dict]:
    """The flow template index (bundle list surface): one compact row
    per api:true pipeline template."""
    return [{"lane": r["name"], "flow": r["id"],
             "description": r["description"],
             "steps": r["step_count"]}
            for r in _flow_rows()]


def peek(kind=None, genre=None) -> dict:
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
    it wants. Rows are cheap by design — no bodies, no schemas."""
    try:
        k = _norm_kind(kind)
    except ValueError as e:
        return {"count": 0, "lanes": [], "error": str(e)}
    genre = (genre or "").strip().lower() or None
    rows: list[dict] = []
    for engine in _engine_dirs():
        manifests = _manifests(engine)
        card_rows, _ = _card_rows(engine)
        for cid, entry in manifests.items():
            g = str(entry.get("genre") or "").lower() or None
            if genre and g != genre:
                continue
            skills = sum(1 for r in card_rows if r.get("card") == cid)
            params = 0
            title = None
            for m in entry["rows"]:
                ps = m.get("params_schema") or {}
                props = ps.get("properties") if isinstance(ps, dict) else None
                if isinstance(props, dict):
                    params = max(params, len(props))
                if title is None and m.get("stage_title"):
                    title = str(m["stage_title"])
            rows.append({"kind": "action_card", "lane": cid, "genre": g,
                         "title": title or cid,
                         "description": next((str(m.get("description") or "")
                                              for m in entry["rows"]
                                              if m.get("description")), ""),
                         "params": params, "skills": skills})
    for r in _flow_rows():
        rows.append({"kind": "template", "lane": r["name"], "genre": None,
                     "title": r["name"],
                     "description": r["description"][:120],
                     "steps": r["step_count"]})
    if k == "card":
        rows = [r for r in rows if r["kind"] == "action_card"]
    elif k == "flow":
        rows = [r for r in rows if r["kind"] == "template"]
    return {"count": len(rows), "lanes": rows}


# ---------------------------------------------------------------- doors


def card_tools() -> list:
    """GET /v1/card-tools — every manifest on disk, flattened."""
    out: list = []
    for engine in _engine_dirs():
        for entry in _manifests(engine).values():
            out.extend(entry["rows"])
    return out


def skill_index() -> dict:
    """GET /v1/skills — one cheap row per document across ALL levels."""
    rows: list[dict] = []
    for engine in _engine_dirs():
        rows.extend(_model_rows(engine))
        card_rows, _ = _card_rows(engine)
        rows.extend(card_rows)
    rows.extend(_flow_rows())
    clean = [{k: v for k, v in r.items() if k != "_path"}
             for r in rows]
    return {"count": len(clean), "skills": clean}


def lane_bundle(lane: str, kind=None) -> tuple[int, dict]:
    """GET /v1/cards/<lane>/bundle?kind=… — ONE lane's full surface, the
    LOAD tier: the card manifests (tools) + the merged skill rows across
    card level, model level, base chain, and the guide + the lane's
    PRIMARY AGENT DOC INJECTED INLINE (agent.content) so the loader
    reads orientation with zero extra round-trips.

    kind gates the resolution class (peek/load vocabulary):
      action_card → card dirs only; template|pipeline → flow templates
      only; absent → any class. 'model' is not a lane class (operator
      order, 2026-09-04 — models are card parameters + craft docs, see
      _norm_kind): a bare model id still resolves to the CARD that
      boards it. 404 names what was searched."""
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
                if any(str(m.get("model", "")) == lane
                       for m in entry["rows"]):
                    card_dir = cid
                    break
        if k == "flow":
            continue                       # templates resolve below
        if card_dir is None:
            continue                       # cards are the only lane class
        tools = manifests[card_dir]["rows"]
        families = [str(m.get("model", "")) for m in tools
                    if m.get("model")] or [card_dir]
        _, by_card = _card_rows(engine)
        card_bucket_rows = list(by_card.get(card_dir, {}).get("rows", []))
        agent_row = None
        for r in card_bucket_rows:
            if r["id"] == "card:%s" % card_dir:
                agent_row = r
                break

        skills: list[dict] = list(card_bucket_rows)
        for fam in families:
            for r in model_rows:
                rid = r["id"]
                if rid == "model:%s" % fam or rid.startswith("model:%s:" % fam) \
                        or rid == "guide:%s" % fam:
                    skills.append(r)
            for base in _base_chain(fam, ids):
                for r in model_rows:
                    rid = r["id"]
                    if rid == "model:%s" % base \
                            or rid.startswith("model:%s:" % base) \
                            or rid == "guide:%s" % base:
                        skills.append(r)

        # dedupe by id, keep order (guide first for read_first)
        seen: set = set()
        uniq: list[dict] = []
        for r in skills:
            if r["id"] not in seen:
                seen.add(r["id"])
                uniq.append(r)
        guides = [r["id"] for r in uniq if r["id"].startswith("guide:")]
        read_first = guides + [r["id"] for r in uniq
                               if not r["id"].startswith("guide:")]

        clean = [{kk: v for kk, v in r.items() if kk != "_path"}
                 for r in uniq]
        agent = _agent_block(agent_row)
        return 200, {"lane": lane, "card": card_dir,
                     "kind": "action_card",
                     "agent": agent, "tools": tools,
                     "pipelines": [], "skills": clean,
                     "read_first": read_first[:6]}
    # LEVEL 4 — a flow lane (pipelines/<lane>/pipeline.yaml, api:true).
    # Distinct lane class: no card manifests; the template IS the
    # contract, carried under "pipelines" + a flow:<name> skill row.
    if k != "card":
        for r in _flow_rows():
            if r["name"] == lane or r["id"] == "flow:%s" % lane:
                row = {kk: v for kk, v in r.items() if kk != "_path"}
                agent = {"source": r["id"], "name": r["name"],
                         "content": _flow_orientation(r)}
                return 200, {"lane": lane, "card": None,
                             "kind": "template", "agent": agent,
                             "tools": [], "pipelines": [row],
                             "skills": [row], "read_first": [r["id"]]}
    return 404, {"error": "no such lane: %r (kind=%s)"
                 % (lane, k or "any")}


def _agent_block(agent_row) -> dict | None:
    """The lane's primary agent doc, INLINED — the load tier's promise:
    orientation arrives with the bundle, no second call needed."""
    if agent_row is None:
        return None
    try:
        body = Path(agent_row["_path"]).read_text(
            encoding="utf-8", errors="surrogateescape")
    except OSError:
        return {"source": agent_row["id"], "name": agent_row["name"],
                "content": ""}
    return {"source": agent_row["id"], "name": agent_row["name"],
            "content": body}


def _flow_orientation(r: dict) -> str:
    """Flows carry no AGENT.md — the orientation doc is COMPOSED from
    the template itself: name, description, the step ladder."""
    steps = r.get("steps") or []
    lines = ["# %s (flow template)" % r["name"], ""]
    if r.get("description"):
        lines += [str(r["description"]), ""]
    lines += ["## Steps", ""]
    for s in steps:
        lines.append("- **%s** (%s%s)" % (
            s.get("id", "?"), s.get("type", "?"),
            " · %s" % s["plugin"] if s.get("plugin") else ""))
    return "\n".join(lines)


def skill_read(sid: str, ledger=None) -> tuple[int, dict]:
    """GET /v1/skills/<id> — one document's full body, ledgered."""
    sid = (sid or "").strip()
    row = None
    for r in _flow_rows():
        if r["id"] == sid:
            row = r
            break
    if row is None:
        for engine in _engine_dirs():
            for r in _model_rows(engine) + _card_rows(engine)[0]:
                if r["id"] == sid:
                    row = r
                    break
            if row:
                break
    if row is None:
        return 404, {"error": "no such skill: %r" % sid}
    try:
        body = Path(row["_path"]).read_text(
            encoding="utf-8", errors="surrogateescape")
    except OSError as e:
        return 500, {"error": "unreadable: %s" % e}
    if ledger:
        ledger("skill.read", {"id": sid})
    return 200, {"id": sid, "name": row["name"],
                 "description": row["description"],
                 "scope": row["scope"], "content": body}
