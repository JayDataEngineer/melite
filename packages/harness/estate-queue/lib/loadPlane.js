// loadPlane.ts — Melite load, RE-HOMED (REBUILD-17, 2026-09-10):
// the dead gateway's disclose.ts loader span (killed with the
// gateway app) ports here — load opens ONE card or flow (agents
// md + tool-call signature + tier-1 skill lines; bodies stay
// behind melite_skill_read). Division of enhance unchanged (operator law
// 2026-09-09): the agent holds the skill lines, reads bodies via
// melite_skill_read, writes the prompt itself.
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cardPackages, emitModifierKinds, emitParamsSchema, getModel, modelsService, theService } from "@melite/comfyui-cordis";
import { semanticModelEntries } from "@melite/comfyui-card-kit/semanticModelKnob";
import { laneContractsFor } from "@melite/contracts/laneRelations";
import { seedFlowsSeat } from "./flowsData.js";
import { toolBaseRows } from "./toolProjection.js";
import { modelRows, cardRows, engineDirs, wireSkill, findSkill } from "./skillPlane.js";
import { laneFilesStatus } from "./cardsLanes.js";
/** A card id → its package dir. The cardPackages rows are package
 *  NAMES ('@melite/<genre>-<card>'); the id is the row's tail past
 *  the genre prefix, which is NOT reparseable from the string alone
 *  (ids carry dashes) — so match rows ending in '-' + id, split the
 *  genre against the LIVE domain tier (readdir packages/), and keep
 *  the ones whose dir carries src/card.ts (the cardUnitDirs guard).
 *  Node resolution is the WRONG tool (pnpm links only dependents —
 *  require.resolve starves); the repo tree is the truth.
 *  Zero hits = unknown id; two = a data bug — both refuse LOUD at
 *  the door, never a silent pick. */
export function resolveCardPackageDir(repo, cardId) {
    let domains = [];
    try {
        domains = readdirSync(join(repo, "packages"), { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name);
    }
    catch {
        throw new Error(`disclose: no packages tier under '${repo}'`);
    }
    const hits = [];
    let named = 0;
    for (const row of cardPackages) {
        // (every cardPackages row carries the @melite/ prefix — the bare arm never fires;
        // studio cards' rows point at the CARD subpath ('.../card') — strip it: the
        // resolver wants the package name, and the dir guard below does the rest)
        const tail = (row.startsWith("@melite/") ? row.slice("@melite/".length) : /* v8 ignore next */ row).replace(/\/card$/, "");
        if (!tail.endsWith("-" + cardId))
            continue;
        named++;
        for (const dom of domains) {
            if (!tail.startsWith(dom + "-"))
                continue;
            const dir = join(repo, "packages", dom, tail.slice(dom.length + 1));
            /* v8 ignore next -- every registry tail resolves to a real card
               dir (the build consumes the same rows): the skip never fires
               (2026-09-12) */
            if (!existsSync(join(dir, "src", "card.ts")))
                continue;
            hits.push(dir);
        }
    }
    if (hits.length === 0) {
        if (named === 0)
            throw new Error(`disclose: unknown card '${cardId}'`);
        /* THE INSTALL-PLANE SEAM (live 2026-10-21: the dsh web profile's
           estate loads @melite/* from node_modules; resolveRepoRoot()'s
           4-up default named the PROFILE root, whose stray packages/
           tier starved every card's domain gate — and this arm answered
           "unknown card '<id>'" for ids the registry had just listed,
           sending the live agent hunting spellings instead of the seam).
           A row-matched id with no dir under this tree is a ROOT
           problem, never an id problem: the load door reads
           packages/<genre>/<card>/src/card.ts from the REPO tree, and
           an install tree ships no checkout sources — name the pin. */
        throw new Error(`disclose: card '${cardId}' is registered but no source dir serves under '${repo}' ` +
            `(the load door reads packages/<genre>/<card>/src/card.ts from the repo tree; ` +
            `an install tree ships no card sources — pin MELITE_REPO_ROOT to the estate checkout)`);
    }
    /* v8 ignore next -- no cardPackages tail repeats (single hit each):
       the ambiguity fence never fires (2026-09-12) */
    if (hits.length > 1)
        throw new Error(`disclose: card '${cardId}' is ambiguous (${hits.length} packages)`);
    return hits[0];
}
/** The card's agents md (src/agents/**, AGENT.md first, sorted,
 *  capped — the cap is the contract: lines route, bodies stay
 *  bounded). */
export function cardSkillDocs(pkgDir) {
    const MAX_FILES = 8;
    const MAX_BYTES = 32768;
    const agents = join(pkgDir, "src", "agents");
    let files = [];
    try {
        files = readdirSync(agents).filter((f) => f.endsWith(".md"));
    }
    catch (e) {
        // M6 (the fallback audit): ENOENT is the normal no-agents card —
        // most cards ship none. Any OTHER read failure is a real defect
        // and is NAMED (the bundle must not silently narrow the agent's
        // constraints); the bundle still serves (a disclose read never
        // refuses the door), but the degrade is visible in the log.
        if (e.code !== "ENOENT") {
            console.error(`disclose: card agents dir unreadable (${agents}): ${String(e)}`);
        }
        return [];
    }
    files.sort((a, b) => {
        const ra = a === "AGENT.md" ? 0 : 1;
        const rb = b === "AGENT.md" ? 0 : 1;
        // (byte-sorted readdir + V8's (current, earlier) insertion order
        // never evaluate the less-than tiebreak here: the sort RESULT is
        // pinned by the AGENT-first assertions below)
        return ra - rb || (a < b ? /* v8 ignore next */ -1 : 1);
    });
    const out = [];
    let budget = MAX_BYTES;
    for (const f of files.slice(0, MAX_FILES)) {
        if (budget <= 0)
            break;
        try {
            const text = readFileSync(join(agents, f), "utf8").slice(0, budget);
            budget -= text.length;
            out.push({ path: "src/agents/" + f, text });
        }
        catch (e) {
            // M6: an unreadable skill doc is named, never skipped silent —
            // the agent's constraints must not narrow invisibly.
            console.error(`disclose: card skill doc unreadable (${join(agents, f)}): ${String(e)}`);
        }
    }
    return out;
}
/** The card's tool-call signature — the /v1/tools row
 *  envelope (ROW_KEYS mirror toolsEmit — one projection, the
 *  emitter imported, the envelope shared by construction). */
export function toolRowFor(id, def, rows) {
    const base = rows.get(id);
    if (base === undefined)
        throw new Error(`disclose: no tool row for card '${id}'`);
    // The model knob serves the same style entries as the base row.
    // An unresolvable boarded id keeps the bare boarded enum.
    let semantic;
    try {
        const decls = [];
        for (const fam of def.boarded)
            decls.push(getModel(fam));
        const entries = semanticModelEntries(decls);
        if (entries.length > 0)
            semantic = entries;
    }
    catch {
        // A missing DECL keeps the bare fallback.
        // The compose door refuses it loud with its own voice.
        semantic = undefined;
    }
    const paramsSchema = emitParamsSchema((def.schemaCarrier ?? def.schema), def.boarded, semantic);
    // THE MODS PROJECTION (stroke 79): one emitter (emitModifierKinds
    // — the same SSOT the /v1/tools manifest row serves), so the load
    // bundle's signature and the manifest never drift. leaf_face never
    // rides (the agent composes VALUES, never faces).
    const modifiers = emitModifierKinds(def.mods);
    // THE LANE CONTRACT RIDES THE BUNDLE (the DECL audit's gap 1,
    // 2026-10-10): this signature is what melite_load renders, and it
    // served no `lanes` key at all — so the agent's primary face said
    // nothing about a lane's surface, its relation words, its bounds,
    // or its sampler domain, and the agent learned every law by
    // hitting the bench's refusal. /v1/card-tools served the same
    // projection; this is ONE construction (laneContractsFor, contracts
    // floor) so the two faces cannot drift.
    const lanes = laneContractsFor(def.boarded, (fam) => {
        try {
            return getModel(fam);
        }
        catch {
            // a boarded id that is not a declared family (a retired
            // address) contributes nothing — the stand-down, never a throw
            return undefined;
        }
    });
    return {
        ...(modifiers.length > 0 ? { modifiers } : {}),
        ...(Object.keys(lanes).length > 0 ? { lanes } : {}),
        name: base.name,
        version: base.version,
        kind: base.kind,
        card: base.card,
        model: base.model,
        stage_title: base.stageTitle,
        description: base.description,
        params_schema: {
            type: paramsSchema.type,
            properties: paramsSchema.properties,
            ...(paramsSchema.required !== undefined ? { required: paramsSchema.required } : {}),
        },
    };
}
/** The bundle digest (the DSH session-catalog half we CAN own:
 *  their catalog is digest-diffed "stable, never duplicated" — we
 *  don't own the loop so we can't clear the agent's context, but a
 *  stable content hash lets the agent dedupe its own reloads: quote
 *  the digests you hold, skip reload on a match). sha16 of the
 *  canonical bundle JSON (the asset pipeline's sha16 convention). */
export function bundleDigest(bundle) {
    return createHash("sha256").update(JSON.stringify(bundle)).digest("hex").slice(0, 16);
}
// ── end moved pures ──
/** Tier-1 skill LINES for one card id (the melite_skill_index truth —
 *  wireSkill rows over the planes buckets, card-skill scope only;
 *  the card's AGENT.md rides full under agents, never as a line).
 *  Merged across engines, id-deduped; unknown cards line nothing
 *  (the walk is the truth — never a refusal). */
export function skillLinesForCard(repo, cardId) {
    const out = [];
    const seen = new Set();
    let engines;
    try {
        engines = engineDirs(join(repo, "packages", "engines"));
    }
    catch {
        /* v8 ignore next -- engineDirs returns [] instead of throwing
           (missing roots read empty): the degrade never fires (2026-09-12) */
        return out;
    }
    for (const engine of engines) {
        let bucket;
        try {
            bucket = cardRows(engine, repo).buckets.get(cardId);
        }
        catch {
            /* v8 ignore next -- cardRows walks (never throws): the skip
               never fires (2026-09-12) */
            continue;
        }
        if (bucket === undefined)
            continue;
        for (const doc of bucket.rows) {
            if (doc.row.scope !== "card-skill")
                continue;
            /* v8 ignore next -- one engine owns each card's rows (no
               cross-engine dup ids in the walk): the dedupe never fires
               (2026-09-12) */
            if (seen.has(doc.row.id))
                continue;
            seen.add(doc.row.id);
            out.push(wireSkill(doc.row));
        }
    }
    return out;
}
/** Tier-1 skill LINES for boarded families (the discover+load
 *  contract, 2026-09-22: ONE melite_load hands the agent the card's
 *  skills AND every boarded family's model skills — the agent
 *  learns model:anima:prompt-enhance from loading image-gen, never
 *  from a second hunt). Entrance rows (scope "model", the family's
 *  AGENT.md) ride when the family authors one, then its skills
 *  (scope "model-skill"), in the boarded order — card skills first
 *  (the caller concatenates), then family by family. A boarded id
 *  with no rows contributes nothing (the walk is the truth — never
 *  a refusal; anima itself ships no AGENT.md, only the skill). */
export function skillLinesForFamilies(repo, fams) {
    const out = [];
    const seen = new Set();
    // (M6: engineDirs never throws — missing roots read empty — so the
    // old try/catch here was a dead arm; removed. If it ever DOES
    // throw, the error propagates loud: fail-closed is the law.)
    const engines = engineDirs(join(repo, "packages", "engines"));
    // walk once, bucket per family — the bundle emits boarded order
    const perFam = new Map();
    for (const engine of engines) {
        let rows;
        try {
            rows = modelRows(engine);
        }
        catch (e) {
            // M6: an engine whose model rows cannot be read vanishes from
            // the skill walk — that degrade is NAMED, never silent.
            console.error(`disclose: model rows unreadable (${engine}): ${String(e)}`);
            continue;
        }
        for (const doc of rows) {
            if (doc.row.model === null || !fams.includes(doc.row.model))
                continue;
            if (doc.row.scope !== "model" && doc.row.scope !== "model-skill")
                continue;
            if (seen.has(doc.row.id))
                continue;
            seen.add(doc.row.id);
            const cell = perFam.get(doc.row.model) ?? [];
            cell.push({ id: doc.row.id, line: wireSkill(doc.row), entrance: doc.row.scope === "model" });
            perFam.set(doc.row.model, cell);
        }
    }
    for (const fam of fams) {
        const cell = perFam.get(fam) ?? [];
        // entrance first, then skills in walk order
        cell.sort((a, b) => Number(b.entrance) - Number(a.entrance));
        for (const r of cell)
            out.push(r.line);
    }
    return out;
}
export function flowLeafDocs(repo, flowName) {
    const MAX_FILES = 8;
    const MAX_BYTES = 32768;
    const leaf = join(repo, "flows", flowName);
    const files = [];
    const walk = (dir, rel) => {
        /* v8 ignore next -- the per-loop breaks cap before any re-entry
           at cap: the guard never fires (2026-09-12) */
        if (files.length >= MAX_FILES)
            return;
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        const names = entries.map((e) => e.name);
        const isDir = new Map(entries.map((e) => [e.name, e.isDirectory()]));
        names.sort((a, b) => {
            const rank = (f) => f === "AGENT.md" || f === "AGENTS.md" || f === "SKILL.md" ? 0 : 1;
            // (same byte-order law as cardSkillDocs above: the less-than
            // tiebreak never evaluates; the order assertions pin the result)
            return rank(a) - rank(b) || (a < b ? /* v8 ignore next */ -1 : 1);
        });
        for (const f of names) {
            if (files.length >= MAX_FILES)
                break;
            if (isDir.get(f) === true) {
                walk(join(dir, f), rel + f + "/");
            }
            else if (f.endsWith(".md")) {
                files.push(rel + f);
            }
        }
    };
    walk(leaf, "");
    const out = [];
    let budget = MAX_BYTES;
    for (const f of files) {
        if (budget <= 0)
            break;
        try {
            const text = readFileSync(join(leaf, f), "utf8").slice(0, budget);
            budget -= text.length;
            out.push({ path: "flows/" + flowName + "/" + f, text });
        }
        catch {
            // unreadable — skip, never refuse the bundle
        }
    }
    return out;
}
/** Resolve one skill ref (a card:/model:/flow: sid) to its tier-1
 *  line through the planes registry (the melite_skill_index truth).
 *  Dangling refs line null — visible drift, never a refusal. */
/** @param modelsSeat the context's models service when mounted (the
 *  same seat-threading law the runs doors ride) */
export function skillLineForRef(repo, ref, modelsSeat, flowsSeat) {
    try {
        const found = findSkill(repo, ref, modelsSeat, flowsSeat);
        if (found !== null)
            return { ref, line: wireSkill(found.row) };
    }
    catch {
        // registry walk threw — line null below
    }
    return { ref, line: null };
}
/** Melite load for a CARD: agents md + tool-call signature +
 *  tier-1 skill lines (the card's own AND every boarded family's
 *  model skills — ONE load hands the agent the whole craft: loading
 *  image-gen serves model:anima:prompt-enhance beside the card
 *  lines, so the prompt guide is read before compose, never hunted
 *  after) + model hints (the boarded families' DECL identity —
 *  presence-marked, never a run-time surprise; LLM-powered enhance
 *  stays the user's ✦ door, never served here). Throws LOUD
 *  on unknown ids (the door maps to 404). */
export function loadCard(repo, cards, modelsSeat, cardId) {
    // ADMISSION BEFORE THE DEPENDENCY (the flow arm's own order at
    // loadFlow: the referent first, the seat that serves it second).
    // Reading the models seat first made an unknown card answer in the
    // engine's bootstrap voice ("models service not booted") instead of
    // the load door's own "disclose: unknown card 'x'".
    const defs = cards.defsSync();
    const def = defs.get(cardId);
    if (def === undefined)
        throw new Error(`disclose: unknown card '${cardId}'`);
    // The lane's seat when mounted (the lane-seat law — the same read
    // the flow arm threads), the booted singleton otherwise; an
    // unmounted seat degrades exactly like the flow arm.
    const models = modelsSeat ?? modelsService();
    const rows = toolBaseRows(defs);
    const pkgDir = resolveCardPackageDir(repo, cardId);
    const decls = new Map(models.allDecls().map((d) => [d.id, { id: d.id, label: d.label, description: d.description ?? "", ...(d.lane_inputs === undefined ? {} : { lane_inputs: d.lane_inputs }) }]));
    const hints = [];
    for (const fam of def.boarded) {
        const d = decls.get(fam);
        if (d === undefined)
            continue;
        let present = false;
        const lanePath = typeof d.lane_inputs?.["model_path"] === "string"
            ? String(d.lane_inputs?.["model_path"]).trim()
            : "";
        const filesPresent = typeof models.checkModelPresent === "function"
            ? laneFilesStatus(d, (folder, name) => models.checkModelPresent("models/" + folder, name, repo))
            : null;
        if ((lanePath !== "" && typeof models.checkModelPathPresent === "function" && models.checkModelPathPresent(lanePath, repo) !== null) || filesPresent === true) {
            present = true;
        }
        else {
            try {
                const rows = models.resolveCatalogArtifact(fam, "", "", repo);
                present = rows.length > 0 && rows.every((row) => models.checkModelPresent(row.relative_path, row.name, repo) !== null);
            }
            catch {
                present = false;
            }
        }
        // The served hint carries presence only.
        // Labels live in the semantic knob now.
        hints.push({ description: d.description, present });
    }
    // THE PACK HINTS (the no-silent-drop law's extension half,
    // stroke 18): the card's declared extension packs (flat requires +
    // every per-family slice), presence-marked by the EXTENSION-LAW
    // gate's own read via the engine service. The LLM sees a missing
    // pack at LOAD time — install via comfy_manage install_extension
    // before running, never a run-time surprise.
    const extDef = def;
    const packIds = [...(extDef.requires ?? [])];
    for (const slice of Object.values(extDef.requiresByFamily ?? {})) {
        for (const p of slice)
            if (!packIds.includes(p))
                packIds.push(p);
    }
    let pack_hints = [];
    try {
        const svc = theService();
        pack_hints = svc.packPresence(packIds).map((r) => ({ id: r.id, present: r.present }));
    }
    catch {
        // engine service unavailable at load time — the ids still serve
        // (present: null — unknown, never a silent drop)
        pack_hints = packIds.map((id) => ({ id, present: null }));
    }
    const bundle = {
        name: cardId,
        kind: "card",
        signature: toolRowFor(cardId, def, rows),
        agents: cardSkillDocs(pkgDir),
        skills: [
            ...skillLinesForCard(repo, cardId),
            // THE BOARDED CRAFT (discover+load contract, 2026-09-22):
            // the boarded families' model skills ride the same bundle —
            // no second hunt before compose.
            ...skillLinesForFamilies(repo, def.boarded),
        ],
        model_hints: hints,
        pack_hints,
    };
    bundle["digest"] = bundleDigest(bundle);
    return bundle;
}
/** Melite load for a FLOW: the leaf agents md + the registry
 *  signature (the tool overlay verbatim — ONE spelling, the same
 *  object validate/start enforce; null when the row declares
 *  none) + slim stages + the author's skill refs (verbatim) with
 *  their tier-1 lines. Throws LOUD on unknown flows. */
/** @param modelsSeat the context's models service when mounted — the
 *  flow's skill lines resolve through the seat the runs doors
 *  thread (the lane-seat law); the booted singleton otherwise */
export function loadFlow(repo, flowName, modelsSeat, flowsSeat) {
    const row = (flowsSeat ?? seedFlowsSeat()).get(flowName);
    if (row === undefined)
        throw new Error(`disclose: unknown flow '${flowName}'`);
    const stages = row.stages.map((s) => ({
        id: s.id,
        // A family stage discloses its verb (family.action) — the card
        // key stays "" and the family keys ride alongside (stroke 4's
        // compose-at-expansion: the graph derives from the action).
        ...(s.family !== "" ? { family: s.family, action: s.action } : {}),
        card: s.card,
        description: s.description,
        // fromFlow links resolve at COMPILE time (expandRegistryFlow) —
        // disclosure serves the link verbatim, never a silent copy.
        ...(s.fromFlow !== null ? { fromFlow: { flow: s.fromFlow.flow, stage: s.fromFlow.stage } } : {}),
    }));
    const seen = new Set();
    const skills = [];
    const pushLines = (cardId) => {
        for (const line of skillLinesForCard(repo, cardId)) {
            // wireSkill always emits id (skillPlane.ts) — the String reads it.
            const id = String(line.id);
            /* v8 ignore next -- every bucket row carries a non-empty id
               (probed: card:image-gen's 3 doc lines): the skip never fires
               (2026-09-12) */
            if (id === "")
                continue;
            /* v8 ignore next -- stage cards never repeat a skill line in
               the registry (single-engine walk, unique ids): the dedupe
               never fires (2026-09-12) */
            if (seen.has(id))
                continue;
            seen.add(id);
            skills.push(line);
        }
    };
    const pushFamilyLines = (fam) => {
        for (const line of skillLinesForFamilies(repo, [fam])) {
            const id = String(line.id);
            if (id === "" || seen.has(id))
                continue;
            seen.add(id);
            skills.push(line);
        }
    };
    // Card stages ride the card's skill lines; family stages ride
    // the FAMILY's (the boarded-craft law: no second hunt before
    // compose — a census flow's stages are all family-side).
    for (const s of row.stages) {
        if (s.family !== "")
            pushFamilyLines(s.family);
        else
            pushLines(s.card);
    }
    const refs = [];
    for (const ref of row.skillRefs) {
        const r = skillLineForRef(repo, ref, modelsSeat);
        refs.push(r);
        const line = r["line"];
        /* v8 ignore next -- every registry skillRef resolves (the walk
           is the truth): the null arm never fires (2026-09-12) */
        if (line === null)
            continue;
        // wireSkill always emits id (skillPlane.ts) — the String reads it.
        const id = String(line.id);
        /* v8 ignore next -- probed: all 5 image-upscale ref lines carry
           ids (2026-09-12) */
        if (id === "")
            continue;
        /* v8 ignore next -- probed: ref ids (card:C) are disjoint from
           stage-line ids (card:C:doc), so the merge never dedupes
           (2026-09-12) */
        if (seen.has(id))
            continue;
        seen.add(id);
        skills.push(line);
    }
    const bundle = {
        name: flowName,
        kind: "flow",
        signature: row.tool === null ? null : {
            name: row.tool.name,
            description: row.tool.description,
            properties: row.tool.properties,
            required: row.tool.required,
            overlays: row.tool.overlays,
        },
        agents: flowLeafDocs(repo, flowName),
        stages,
        refs: row.skillRefs.slice(),
        skills,
    };
    bundle["digest"] = bundleDigest(bundle);
    return bundle;
}
/** First-non-blank query value (the catalogs qFirst shape). */
//# sourceMappingURL=loadPlane.js.map