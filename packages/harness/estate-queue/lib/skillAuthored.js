// skillAuthored.ts — THE AUTHORED SKILL PLANE (operator 2026-11-09:
// "we should also be able to get the agent to write skills. For
// example, it would be helpful that when we gave the lora to the
// model, that could also make the skill with examples, trigger
// words"). ONE ROOT, TWO ENDS: the agent's write door lands
// <stateRoot>/skills/<family>/<stem>/SKILL.md and the doc walk
// (skillRows.authoredRows) reads that same tree. The SOURCE plane
// (the tracked models tree) is never written at runtime.
//
// The trigger words are the OPERATOR's to state, never invented: an
// empty set renders as the explicit blank, so a doc that has not been
// told its triggers says so in its own body.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
/** Path-safe leaf law for the skill's name (it is the served id leaf
 *  and the doc's directory — one spelling, never escaped later). */
const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** THE ONE DERIVATION (writer and walker both spell this): the skill
 *  doc's directory under the estate's state root. */
export function authoredSkillDir(stateRoot, family, stem) {
    return join(stateRoot, "skills", family, stem);
}
/** The doc file inside the authored skill's directory. */
export function authoredSkillDoc(stateRoot, family, stem) {
    return join(authoredSkillDir(stateRoot, family, stem), "SKILL.md");
}
/** The refusal voice (the door's own words, one spelling per arm). */
function refuse(what) {
    throw new Error("skill write refusal: " + what);
}
/** A description rides the doc's frontmatter on ONE line (the
 *  frontmatter grammar is line-oriented); the author's newlines
 *  become spaces rather than being dropped. */
function oneLine(s) {
    return s.replace(/\s*\n\s*/g, " ").trim();
}
/** The doc's text. Deterministic — no timestamps, so a rewrite of the
 *  same draft is byte-identical. */
export function renderAuthoredSkill(d) {
    const lines = [];
    lines.push("---");
    lines.push("name: " + d.name);
    lines.push("description: " + oneLine(d.description));
    lines.push("---");
    lines.push("");
    if (d.lora !== "") {
        // ONE PREFIX: the row's filename is `<family>/<file>` and the
        // caller may state it with or without the family (the tray row's
        // label is the bare stem) — both spell ONE path. The live burn
        // (2026-11-04) wrote `krea-2/krea-2/<file>`: a doc naming a file
        // the engine does not have.
        const tail = d.lora.startsWith(d.model + "/")
            ? d.lora.slice(d.model.length + 1)
            : d.lora;
        lines.push("## Applies to");
        lines.push("");
        lines.push("- lora: `" + d.model + "/" + tail + "` (the loras mod's row, label `" +
            tail.split("/").pop().replace(/\.(safetensors|ckpt|pt|bin)$/i, "") + "`)");
        lines.push("");
    }
    lines.push("## Trigger words");
    lines.push("");
    if (d.trigger_words.length === 0) {
        lines.push("- None stated yet — the operator states them at hand-off and this doc is rewritten; " +
            "run trigger-less and say so.");
    }
    else {
        for (const w of d.trigger_words)
            lines.push("- " + w);
    }
    lines.push("");
    if (d.examples.length > 0) {
        lines.push("## Examples");
        lines.push("");
        for (const e of d.examples)
            lines.push("- " + e);
        lines.push("");
    }
    if (d.body.trim() !== "") {
        lines.push(d.body.trim());
        lines.push("");
    }
    return lines.join("\n");
}
/** Whether the repo carries the family (the walk that serves the doc
 *  reads the same tree: a skill under a family nobody serves is a
 *  lie, so the door refuses it instead of landing an orphan). */
function familySeat(repo, family) {
    const enginesRoot = join(repo, "packages", "engines");
    let engines;
    try {
        engines = readdirSync(enginesRoot);
    }
    catch {
        // no engines tree in this checkout: no family can be seated
        return null;
    }
    for (const eng of engines) {
        const modelsRoot = join(enginesRoot, eng, "models");
        let genres;
        try {
            genres = readdirSync(modelsRoot);
        }
        catch {
            // an engine with no models tree seats no family
            continue;
        }
        for (const genre of genres) {
            const mdir = join(modelsRoot, genre, family);
            try {
                // the family dir must exist (the same stat the walk takes)
                readdirSync(mdir);
            }
            catch {
                // not in this genre
                continue;
            }
            return genre;
        }
    }
    return null;
}
/**
 * Land one authored skill doc.
 *
 * @param repo the checkout root (the family seat is verified there)
 * @param stateRoot the estate's state root (the authored plane)
 * @param draft the skill as the door received it
 * @returns the served answer (the id the read door answers with)
 * @throws Error with the door's refusal voice when a field is missing,
 *   a leaf is not path-safe, the family is unseated, or an existing
 *   doc would be silently replaced
 */
export function writeAuthoredSkill(repo, stateRoot, draft) {
    if (draft.model === "")
        refuse("model: Field required — the model family the skill serves");
    if (!SLUG_RE.test(draft.model)) {
        refuse("model: " + JSON.stringify(draft.model) + " is not a path-safe family id");
    }
    if (familySeat(repo, draft.model) === null) {
        refuse("model: no family " + JSON.stringify(draft.model) +
            " under packages/engines/*/models/<genre>/ — a skill under a family nobody serves is a lie");
    }
    if (draft.name === "")
        refuse("name: Field required — the skill is known by this name (melite_skill_read takes it)");
    if (!SLUG_RE.test(draft.name)) {
        refuse("name: " + JSON.stringify(draft.name) + " is not a path-safe skill id (letters, digits, . _ -)");
    }
    if (oneLine(draft.description) === "") {
        refuse("description: Field required — the one-line summary every load prints");
    }
    if (draft.lora !== "" && draft.lora.includes("/.."))
        refuse("lora: a file name, not a path");
    const doc = authoredSkillDoc(stateRoot, draft.model, draft.name);
    let existing = null;
    try {
        existing = readFileSync(doc, "utf8");
    }
    catch {
        // the absent doc is the first write (never an error)
        existing = null;
    }
    if (existing !== null && !draft.replace) {
        refuse("model:" + draft.model + ":" + draft.name + " already exists at " + doc +
            " — pass replace: true to rewrite it (the previous trigger words would otherwise be lost)");
    }
    const text = renderAuthoredSkill(draft);
    mkdirSync(authoredSkillDir(stateRoot, draft.model, draft.name), { recursive: true });
    writeFileSync(doc, text, "utf8");
    return {
        id: "model:" + draft.model + ":" + draft.name,
        name: draft.name,
        description: oneLine(draft.description),
        path: doc,
        replaced: existing !== null,
    };
}
//# sourceMappingURL=skillAuthored.js.map