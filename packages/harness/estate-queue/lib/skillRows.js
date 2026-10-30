// skillRows.ts — the skill index's row walkers (extracted from
// skillPlane.ts): tool properties, flow declarations, doc/spawn
// rows, engine/model/card/flow rows — module truth over paths.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DIR_ID_ALIASES, isDir, isFile, subdirs, readText, stem } from "./skillFs.js";
import { frontmatter, gateSkill } from "./skillFrontmatter.js";
import { LaneWireError } from "./skillPlane.js";
import { expandRegistryFlow, registrySkillBody, seedFlowsSeat } from "./flowsData.js";
import { composeFamilyStages, liveFamilySeat } from "./flowsFamilyCompose.js";
/** One registry headless-tool property, projected to the frozen
 *  FlowToolDecl shape (always ptype + description; enum / default /
 *  minimum / maximum ride only when the registry declares them —
 *  nulls never serve). */
export function projectToolProperties(properties) {
    const out = {};
    for (const [name, p] of Object.entries(properties)) {
        const cell = {
            ptype: p.ptype,
            description: p.description,
        };
        if (p.enum !== null)
            cell["enum"] = [...p.enum];
        if (p.hasDefault)
            cell["default"] = p.default;
        if (p.minimum !== null)
            cell["minimum"] = p.minimum;
        if (p.maximum !== null)
            cell["maximum"] = p.maximum;
        out[name] = cell;
    }
    return out;
}
/** Flow declarations in registry order (registryFlowNames sorted),
 *  with load failures marked (_flow_rows 389-393 skips FlowError
 *  silently — the registry is code, so a declaration bug throws LOUD
 *  out of expandRegistryFlow instead of marking a row). Skips the
 *  registry when flows/ is absent (_flow_rows 387-388: not-a-dir
 *  -> []). The headless tool rides the registry declaration
 *  verbatim (projected to the frozen row shape); hasSkillMd reads
 *  the flows/<id>/SKILL.md leaf live. skillRefs ride the registry
 *  declaration (empty today — the frozen refs pointed at the RETIRED flow.py rows and the retired enhance recipes).
 *  Those refs resolve nowhere and would only skip-loud. */
/** @param modelsSeat the context's models service when mounted — the
 *  disclosure composes from the SAME seat the runs doors thread (the
 *  lane-seat law: the served body and the composed graph must agree;
 *  the booted singleton otherwise) */
export function flowDecls(repo, modelsSeat, flowsSeat) {
    const flows = flowsSeat ?? seedFlowsSeat();
    if (!isDir(join(repo, "flows")))
        return [];
    const out = [];
    for (const name of flows.names()) {
        const flow = flows.get(name);
        /* v8 ignore next -- names and flows come from the same registry:
           the skip never fires (2026-09-12) */
        if (flow === undefined)
            continue;
        // Compose before projection (the doors' own order — stroke 4):
        // the family stages' derived outputs and edges render in the
        // served body only when the declarations compose first.
        //
        // A FLOW THAT CANNOT LOAD IS SKIPPED, NOT THROWN (the row's own
        // loadError field, finally written). flowDecls projects EVERY
        // registered flow, so one flow's compose refusal used to refuse
        // every skill read on the lane — including a card skill that
        // exists and has nothing to do with it, answered 502 in another
        // flow's words. The broken flow drops out of the index (the
        // discover door will not list what cannot load) and its refusal
        // rides on the row that carries it.
        let expanded;
        try {
            const family = liveFamilySeat(modelsSeat);
            expanded = composeFamilyStages(expandRegistryFlow(flow, flows), family.decls, family.state);
        }
        catch (e) {
            out.push({
                id: flow.id,
                loadError: e instanceof Error ? e.message : String(e),
                description: flow.description,
                stages: [],
                tool: null,
                skillRefs: [],
                hasSkillMd: false,
            });
            continue;
        }
        const stages = expanded.stages.map((s) => ({ id: s.id, engine: s.engine }));
        let tool = null;
        if (flow.tool !== null) {
            tool = {
                name: flow.tool.name,
                version: flow.tool.version,
                description: flow.tool.description,
                properties: projectToolProperties(flow.tool.properties),
                required: [...flow.tool.required],
            };
        }
        out.push({
            id: flow.id,
            loadError: null, // composed clean
            description: flow.description,
            stages,
            tool,
            skillRefs: [...flow.skillRefs],
            hasSkillMd: isFile(join(repo, "flows", flow.id, "SKILL.md")),
        });
    }
    return out;
}
/** One doc -> gated row (lane_disclosure._read_doc 130-152):
 *  OSError -> silent None; gate refusal -> LOUD None. */
export function readDoc(path, sid, scope, genre, card, model) {
    const text = readText(path);
    if (text === null)
        return null;
    const fm = frontmatter(text);
    // (split never yields [] — pop is always a string here)
    const leaf = path.split("/").pop();
    const gated = gateSkill(sid, fm.name !== "" ? fm.name : stem(leaf), 
    // SERVED WHOLE (operator 2026-11-12: "qwen 21 can accept very
    // long prompts and skills — that is intentional"): the authored
    // tier-1 line rides every load verbatim; the old .slice(0, 200)
    // cut intentional lines mid-word with no wall ever seeing it.
    fm.description, scope, genre, card, model, null, null);
    return { row: gated, path };
}
/** THE SPAWN PLANE (operator pin, stroke 87): leaves under
 *  `agents/spawn/` (dir/SKILL.md, same shape as agents/skills/)
 *  are SUBAGENT-ONLY — findSkill resolves their refs for the
 *  agent-stage spawn injection (skills[] inlined into the spawned
 *  brief at stage start), but buildSkillIndex NEVER lists them:
 *  the constructor agent (the main chat session) does not see
 *  skills that belong to the spawned doer. The scope suffix
 *  `-spawn` is the structural mark; the index filter is the law. */
export function spawnRows(cdir, prefix, scope, genre, card, model) {
    const out = [];
    let sks;
    try {
        sks = readdirSync(join(cdir, "agents", "spawn")).sort();
    }
    catch (e) {
        // M6: ENOENT is the normal no-spawn dir; any other read failure
        // names itself — the spawn surface must not vanish silently.
        if (e.code !== "ENOENT") {
            console.error(`skill rows: spawn dir unreadable (${join(cdir, "agents", "spawn")}): ${String(e)}`);
        }
        return out;
    }
    for (const sk of sks) {
        const skp = join(cdir, "agents", "spawn", sk);
        const doc = isDir(skp) ? join(skp, "SKILL.md") : skp;
        if (!isDir(skp) && !doc.endsWith(".md"))
            continue;
        const r = readDoc(doc, prefix + ":" + sk, scope, genre, card, model);
        if (r !== null)
            out.push(r);
    }
    return out;
}
/** Every plugin dir owning action cards (lane_disclosure._engine_dirs
 *  158-176 over plugins.iter_plugin_dirs_under: depth-2 + depth-3
 *  with package.json/plugin.yaml/engines/ marker, sorted —
 *  plugin.py retired 2026-09-08, package.json is the marker). */
export function engineDirs(enginesRoot) {
    const marker = (d) => isFile(join(d, "package.json")) ||
        isFile(join(d, "plugin.yaml")) ||
        isDir(join(d, "engines"));
    let tops;
    try {
        tops = readdirSync(enginesRoot).sort();
    }
    catch (e) {
        // M6: ENOENT is the normal no-engines tree; any other read
        // failure names itself — the whole skill walk must not degrade
        // to empty invisibly.
        if (e.code !== "ENOENT") {
            console.error(`skill rows: engines root unreadable (${enginesRoot}): ${String(e)}`);
        }
        return [];
    }
    const out = [];
    for (const name of tops) {
        const full = join(enginesRoot, name);
        if (!isDir(full))
            continue;
        if (marker(full)) {
            out.push(full);
            continue;
        }
        let subs;
        try {
            subs = readdirSync(full).sort();
        }
        catch {
            /* v8 ignore next -- full isDir-guarded above (TOCTOU-only):
               the skip never fires (2026-09-12) */
            continue;
        }
        for (const sub of subs) {
            const sfull = join(full, sub);
            if (isDir(sfull) && marker(sfull))
                out.push(sfull);
        }
    }
    return out;
}
/** THE FAMILY LANE (operator 2026-10-03): the id `model:<mid>` names
 *  the family's entrance row, and the compose refusal voice sends the
 *  agent there by that id alone ("Read the family lane:
 *  melite_skill_read model:<family>."). A family that ships only
 *  skills — no GUIDE.md, no agents/AGENT.md — had NO such row, so the
 *  instruction 404ed and the prompt rules it was announcing (anima's
 *  comma-tag rule, the TTS voice lane, the music/sfx lanes) never
 *  reached the agent that had just chosen that model.
 *
 *  This builds that row from the skills themselves: the tier-1 line
 *  each skill already serves (its frontmatter description), plus the
 *  exact read ids. It is synthesized only when the family has skills
 *  and no file row of its own — a family that ships agents/AGENT.md
 *  keeps its authored row verbatim, and the row is not a counted
 *  skill (buildSkillIndex skips scope `model-lane`), so no count
 *  moves. */
function familyLane(mdir, mid, genre, skillRows) {
    if (skillRows.length === 0)
        return null;
    const lines = [
        "# " + mid + " — family lane (synthesized: this family ships skills, no agents/AGENT.md)",
        "",
        "Read the rows below with melite_skill_read BEFORE writing a prompt for "
            + mid + "; every family wants its own prompt shape.",
        "",
    ];
    for (const r of skillRows) {
        lines.push("- `" + r.row.id + "` — " + r.row.name + (r.row.description === "" ? "" : ": " + r.row.description));
    }
    return {
        row: gateSkill("model:" + mid, mid, mid + " family lane: " + String(skillRows.length) + " skill row(s) deepening the craft line when the ask is unusual (never required pre-reads)", "model-lane", genre, null, mid, null, null),
        path: join(mdir, "agents", "skills"),
        bodyText: lines.join("\n") + "\n",
    };
}
/** LEVEL 1+3 model docs (lane_disclosure._model_rows 259-312):
 *  GUIDE.md / agents/AGENT.md / agents/skills/* per model dir. */
export function modelRows(engine) {
    const rows = [];
    const modelsRoot = join(engine, "models");
    if (!isDir(modelsRoot))
        return rows;
    for (const genre of subdirs(modelsRoot)) {
        for (const mid of subdirs(join(modelsRoot, genre))) {
            const mdir = join(modelsRoot, genre, mid);
            const guide = readDoc(join(mdir, "GUIDE.md"), "guide:" + mid, "guide", genre, null, mid);
            if (guide !== null)
                rows.push(guide);
            const agent = readDoc(join(mdir, "agents", "AGENT.md"), "model:" + mid, "model", genre, null, mid);
            if (agent !== null)
                rows.push(agent);
            // THE SPAWN PLANE (subagent-only; the index filters, the
            // spawn reader resolves — never listed to the constructor).
            // Walked BEFORE the skills loop: a spawn-only model dir (no
            // agents/skills — the blender-door shape) must not be skipped
            // by that loop's readdir catch.
            for (const r of spawnRows(mdir, "model:" + mid, "model-spawn", genre, null, mid)) {
                rows.push(r);
            }
            let sks;
            try {
                sks = readdirSync(join(mdir, "agents", "skills")).sort();
            }
            catch {
                continue;
            }
            const own = [];
            for (const sk of sks) {
                const skp = join(mdir, "agents", "skills", sk);
                const doc = isDir(skp) ? join(skp, "SKILL.md") : skp;
                if (!isDir(skp) && !doc.endsWith(".md"))
                    continue;
                const r = readDoc(doc, "model:" + mid + ":" + sk, "model-skill", genre, null, mid);
                if (r !== null) {
                    own.push(r);
                    rows.push(r);
                }
            }
            // The family lane, when the family has no row of its own.
            if (guide === null && agent === null) {
                const lane = familyLane(mdir, mid, genre, own);
                if (lane !== null)
                    rows.push(lane);
            }
        }
    }
    return rows;
}
/** THE CARD PACKAGE DOMAINS (the card sweep, 2026-09-09): cards
 *  live in their own packages — packages/<domain>/<card>/
 *  (src/card.ts + src/ui/ + src/agents/ in one unit). The engine
 *  src/cards tree keeps only cards not yet swept. This walk yields
 *  both, engine tree FIRST (deterministic order: remainder cards,
 *  then domains sorted, cards sorted — one spelling with the
 *  registry walk below). */
export function cardUnitDirs(engine, repo) {
    const out = [];
    const push = (genre, cname, cdir) => {
        if (cname === "node_modules" || cname.startsWith("."))
            return;
        if (cname.includes("_") && DIR_ID_ALIASES[cname] === undefined) {
            throw new LaneWireError("[tool_projection] card dir " + JSON.stringify(cdir) +
                " has no registry mapping (underscore dirs bridge via " +
                "DIR_ID_ALIASES in toolProjection.ts — add the row or " +
                "rename the dir)");
        }
        out.push({ genre, cname: DIR_ID_ALIASES[cname] ?? cname, cdir });
    };
    // the engine remainder tree: <engine>/src/cards/<genre>/<card>
    const cardsRoot = join(engine, "src", "cards");
    if (isDir(cardsRoot)) {
        for (const genre of subdirs(cardsRoot)) {
            if (genre.startsWith("_"))
                continue;
            for (const c of subdirs(join(cardsRoot, genre))) {
                push(genre, c, join(cardsRoot, genre, c));
            }
        }
    }
    // the card package domains (de-doubled 2026-09-09: the genre dirs
    // are BARE words — <repo>/packages/<genre>/<card>/; the mapping
    // table died with the prefix, the dir IS the genre). models stays
    // out of this walk by content: model packages carry index.ts, no
    // card.ts — the isFile guard below is the discriminator.
    // UNION-ONCE (2026-09-10 — the picker-tripling fix): this walk is
    // engine-INDEPENDENT (repo-wide packages tree — no engine remainder
    // card trees exist anymore), but every caller merges per-engine
    // (buildCardTools, peek, cardRows). Emitting here for every engine
    // served each card once per engine dir (3× — the picker repeats).
    // Emit under the registry's owner engine ONLY (the manifests()
    // dir-less-cards precedent below) — never once per engine. The
    // owner is comfyui-cordis (factsPath in cardsRegistry.ts hardcodes it;
    // packages/engines/comfyui/src/ holds only action_cards tenants, it is
    // never itself an engine entry).
    // (split never yields [] — pop is always a string here; dir names
    // are unique so the equal arm never fires)
    if (engine.split("/").pop() !== "comfyui-cordis")
        return out.sort((a, b) => (a.cname < b.cname ? -1 : a.cname > b.cname ? 1 : /* v8 ignore next */ 0));
    for (const genre of ["3d", "audio", "image", "motion", "video"]) {
        const droot = join(repo, "packages", genre);
        if (!isDir(droot))
            continue;
        for (const c of subdirs(droot)) {
            // the card unit of a package lives at src/ (card.ts + ui + agents)
            if (!isFile(join(droot, c, "src", "card.ts")))
                continue;
            push(genre, c, join(droot, c, "src"));
        }
    }
    return out.sort((a, b) => (a.cname < b.cname ? -1 : a.cname > b.cname ? 1 : /* v8 ignore next */ 0));
}
/** LEVEL 2 card docs (lane_disclosure._card_rows 178-257): AGENT.md
 *  + agents/skills/* per card dir, bucketed by DIR NAME ("_" genres
 *  skipped). ONE root — the card-folder migration is complete
 *  (card-folder-shape design record, 2026-09-08): every card lives
 *  as src/cards/<genre>/<card>/ (one card one folder — card.ts +
 *  ui/ + agents/ in one unit); action_cards keeps only the
 *  no-host-card tenants (3d/body) and the genre ui packages. */
export function cardRows(engine, repo) {
    const rows = [];
    const buckets = new Map();
    {
        for (const { genre, cname, cdir } of cardUnitDirs(engine, repo)) {
            {
                const got = [];
                // Oracle fallback order (lane_disclosure card walk): the
                // top-level AGENT.md wins, agents/AGENT.md orients when the
                // card ships no top-level doc (every estate card today).
                let agent = readDoc(join(cdir, "AGENT.md"), "card:" + cname, "card", genre, cname, null);
                if (agent === null) {
                    agent = readDoc(join(cdir, "agents", "AGENT.md"), "card:" + cname, "card", genre, cname, null);
                }
                if (agent !== null)
                    got.push(agent);
                let sks;
                try {
                    sks = readdirSync(join(cdir, "agents", "skills")).sort();
                }
                catch {
                    sks = [];
                }
                for (const sk of sks) {
                    const skp = join(cdir, "agents", "skills", sk);
                    const doc = isDir(skp) ? join(skp, "SKILL.md") : skp;
                    if (!isDir(skp) && !doc.endsWith(".md"))
                        continue;
                    const r = readDoc(doc, "card:" + cname + ":" + sk, "card-skill", genre, cname, null);
                    if (r !== null)
                        got.push(r);
                }
                // THE SPAWN PLANE (subagent-only; the index filters, the
                // spawn reader resolves — never listed to the constructor).
                for (const r of spawnRows(cdir, "card:" + cname, "card-spawn", genre, cname, null)) {
                    got.push(r);
                }
                for (const g of got)
                    rows.push(g);
                buckets.set(cname, { dir: cdir, rows: got });
            }
        }
    }
    return { rows, buckets };
}
/** The registry skill body for one flow id (null when the flow
 *  has its own SKILL.md or is unknown to the TS registry — the
 *  caller falls back to the file path). A registry flow whose
 *  declaration fails to expand is an authoring bug: LOUD, never a
 *  silent empty body. The family stages compose first (the doors'
 *  own order) so the body names the action's derived outputs. */
/** @param modelsSeat the context's models service when mounted (the
 *  same seat-threading law as flowDecls) */
export function registryBody(flowId, modelsSeat, flowsSeat) {
    const flows = flowsSeat ?? seedFlowsSeat();
    const decl = flows.get(flowId);
    /* v8 ignore next -- callers pass live declaration ids (flowDecls):
       the miss never fires (2026-09-12) */
    if (decl === undefined)
        return null;
    const family = liveFamilySeat(modelsSeat);
    return registrySkillBody(composeFamilyStages(expandRegistryFlow(decl, flows), family.decls, family.state), flows);
}
/** LEVEL 4 flow rows (lane_disclosure._flow_rows 364-411): one gated
 *  SkillRow per loadable declaration (load_error -> silent skip);
 *  body = SKILL.md when present (mega-skill mode) else the TS
 *  registry render (flowsData.ts — the flow.py authoring plane died
 *  2026-09-08; the deleted source is neither servable nor wanted,
 *  so the declaration renders instead). */
/** @param modelsSeat the context's models service when mounted (the
 *  same seat-threading law as flowDecls) */
export function flowRows(repo, modelsSeat, flowsSeat) {
    const out = [];
    for (const decl of flowDecls(repo, modelsSeat, flowsSeat)) {
        // A flow that refused to compose is not a row the index lists
        // (flowDecls carries its refusal on loadError).
        if (decl.loadError !== null)
            continue;
        const steps = [];
        for (const s of decl.stages) {
            // FlowStepRow gate (id/type/plugin min_length=1) — refusal is
            // a code bug (LaneWireError, "flow %s: lane wire refusal").
            // (the static registry carries no empty ids/engines — the fence
            // never fires, but it stays: an authoring bug must throw LOUD)
            /* v8 ignore next */
            if (s.id.length < 1 || s.engine.length < 1) {
                throw new LaneWireError("flow " + decl.id + ": lane wire refusal: id: String " +
                    "should have at least 1 character");
            }
            steps.push({ id: s.id, type: s.engine, plugin: s.engine });
        }
        const gated = gateSkill("flow:" + decl.id, decl.id, decl.description.slice(0, 200), "flow", null, null, null, steps, steps.length);
        out.push({
            row: gated,
            bodyPath: decl.hasSkillMd
                ? join(repo, "flows", decl.id, "SKILL.md")
                : null,
            bodyText: decl.hasSkillMd ? null : registryBody(decl.id, modelsSeat),
        });
    }
    return out;
}
/** GET /v1/skills body (lane_disclosure.melite_skill_index 633-649). The
 *  SPAWN PLANE filter: `-spawn` scoped rows NEVER ride the index —
 *  they are the spawned subagent's private leaves (findSkill
 *  resolves them for stage-start injection; the constructor's
 *  index/listing never sees them — the operator's pin). */
//# sourceMappingURL=skillRows.js.map
