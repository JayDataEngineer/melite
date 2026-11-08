// ---------------------------------------------------------------------------
// frontmatter (lane_disclosure 110-127)
// ---------------------------------------------------------------------------
const FM_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
const KV_RE = /^(name|description):\s*([\s\S]+?)\s*$/;
export function frontmatter(text) {
    let name = "";
    let description = "";
    const m = FM_RE.exec(text);
    if (m !== null) {
        for (const line of m[1].split("\n")) {
            const kv = KV_RE.exec(line);
            if (kv !== null) {
                // .strip('"\'') strips ALL leading/trailing quote chars.
                const val = kv[2].replace(/^["']+|["']+$/g, "");
                if (kv[1] === "name")
                    name = val;
                else
                    description = val;
            }
        }
    }
    if (name === "") {
        const h = /^#\s+(.+)$/m.exec(text);
        name = h !== null ? h[1].trim() : "";
    }
    return { name, description };
}
/** SkillRow constructor (lane_wire 190-226 shapes the row): the
 *  callers pre-gate — readDoc builds valid doc rows (exactly one of
 *  card/model, paired steps), flowRows pre-checks stages — so the
 *  refusal arms have no live caller and are not built here. */
export function gateSkill(id, name, description, scope, genre, card, model, steps, stepCount) {
    return {
        id,
        name,
        description,
        scope,
        genre,
        card,
        model,
        steps,
        stepCount,
    };
}
//# sourceMappingURL=skillFrontmatter.js.map