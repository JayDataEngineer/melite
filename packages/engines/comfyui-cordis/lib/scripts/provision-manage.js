// provision-manage — manual CLI door over the owning DSH HTTP manage API.
// Split from scripts/provision.ts (pure move — no logic changes).
import { spawnSync } from "node:child_process";
import { die, fail } from "./provision-shared.js";
// ── manage: the manual door over the owning DSH's HTTP API ────────────
export function cmdManage(argv) {
    // usage: provision manage <action> [key=value ...] [positional…]
    // The manage SSOT lives lane-side (the /v1/manage door); this is
    // its manual CLI, speaking HTTP — never an in-process import.
    // The DSH host URL is deployment config (MELITE_DSH_URL or
    // --dsh); it is NEVER defaulted (the live PROD host is
    // never touched by accident).
    if (argv.length === 0 || argv[0] === "--help") {
        console.log("usage: provision manage <action> [key=value ...]");
        console.log("  provision manage status");
        console.log("  provision manage install-extension ComfyUI-KJNodes");
        console.log("  provision manage provision-model z-image");
        console.log("  provision manage logs tail=80");
        console.log("dsh host: MELITE_DSH_URL or --dsh <url> (required)");
        return 1;
    }
    const rest = [...argv];
    let gw = (process.env.MELITE_DSH_URL ?? "").trim();
    const gi = rest.indexOf("--dsh");
    if (gi >= 0) {
        gw = (rest[gi + 1] ?? "").trim();
        rest.splice(gi, 2);
    }
    if (!gw) {
        die("no DSH host URL — set MELITE_DSH_URL or pass " +
            "--dsh <url> (never defaulted; the live PROD host is " +
            "never touched by accident)");
    }
    const action = rest[0].replace(/_/g, "-").replace(/-/g, "_");
    const body = { action };
    const positional = {
        install_extension: "nodes", provision_model: "model",
        search_models: "query", switch_version: "version",
        // THE LORA DOORS (2026-09-26): `lora_install` takes the operator's
        // OWN file path (a copy, never a fetch — the no-loras-remote law).
        lora_install: "path",
        install_extension_url: "url",
    };
    const plural = new Set(["install_extension"]);
    let tail = rest.slice(1);
    if (action in positional && tail.length > 0 && !tail[0].includes("=")) {
        body[positional[action]] = plural.has(action) ? [tail[0]] : tail[0];
        tail = [];
    }
    for (const kv of tail) {
        if (!kv.includes("=")) {
            console.log("REFUSED: cannot parse " + JSON.stringify(kv) +
                " (want key=value)");
            return 2;
        }
        const eq = kv.indexOf("=");
        const k = kv.slice(0, eq);
        const v = kv.slice(eq + 1);
        try {
            body[k] = JSON.parse(v);
        }
        catch {
            body[k] = v;
        }
    }
    if (typeof body.nodes === "string")
        body.nodes = [body.nodes];
    if (body.wait === undefined)
        body.wait = true;
    const r = spawnSync(process.execPath, ["-e",
        "fetch(process.argv[1],{method:'POST',headers:{'content-type':" +
            "'application/json'},body:process.argv[2]})" +
            ".then(async r=>{const t=await r.text();console.log(r.status+'\n'+t)})" +
            ".catch(e=>{console.error(String(e).slice(0,200));process.exit(1)})",
        gw.replace(/\/$/, "") + "/v1/manage", JSON.stringify(body)], { encoding: "utf8", timeout: 320000 });
    if (r.status !== 0) {
        fail("manage POST failed: " + ((r.stderr ?? "").trim().slice(0, 200)));
    }
    const nl = (r.stdout ?? "").indexOf("\n");
    const code = parseInt((r.stdout ?? "").slice(0, nl), 10);
    let rep;
    try {
        rep = JSON.parse((r.stdout ?? "").slice(nl + 1) || "{}");
    }
    catch {
        fail("manage POST returned non-JSON: " +
            (r.stdout ?? "").slice(0, 200));
    }
    console.log("[" + code + "] " + rep.action + ": " + rep.detail);
    if (rep.data !== undefined && rep.data !== null) {
        console.log(JSON.stringify(rep.data, null, 2).slice(0, 4000));
    }
    return rep.ok ? 0 : 1;
}
//# sourceMappingURL=provision-manage.js.map
