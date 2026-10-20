/** benchResult.ts — THE BENCH STAGE RESULT CONTRACT (the operator's
 * law, 2026-09-20: "this can all be validated by contract"). The
 * run observer patches this row onto the bench stage; every
 * consumer (the preview harvest, the drill, the studio adapters)
 * reads through this shape. The contract carries its own runtime
 * validator — `benchResultDefects` — and the WRITER asserts it
 * before patching, the READER normalizes through it, and the WALLS
 * pin it against real served bytes. A fixture can lie; a contract
 * pinned to the live shape cannot.
 *
 * THE ONE-FILE-ONE-KEY LAW: every url appears under EXACTLY ONE
 * artifacts key. A file under two keys renders twice — the doubled
 * rowset disease (the legacy 'video' stamp wrote the stage url —
 * which IS gallery[0] — under a second key, so every image-gen
 * result rendered the same picture as hero AND rest-thumb). The
 * primary `url` field may NAME a file that also lives in the map
 * (it is the primary POINTER, not a second key) — but the map's
 * VALUES are unique, always. */
/** Validate a result row against the contract. Returns the defect
 * list — EMPTY means the row is lawful. Each defect names the law
 * and the offending keys, in the door's own voice. */
export function benchResultDefects(row) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
        return ['result: not an object'];
    }
    const r = row;
    const defects = [];
    if (typeof r.run_id !== 'string' || r.run_id === '') {
        defects.push('run_id: missing or empty (every result names its run)');
    }
    if (r.url !== undefined && (typeof r.url !== 'string' || r.url === '')) {
        defects.push('url: present but not a non-empty string');
    }
    if (r.artifacts !== undefined) {
        if (typeof r.artifacts !== 'object' || r.artifacts === null || Array.isArray(r.artifacts)) {
            defects.push('artifacts: not an object (the name→url map)');
        }
        else {
            const seen = new Map();
            for (const [k, v] of Object.entries(r.artifacts)) {
                if (typeof v !== 'string' || v === '') {
                    defects.push(`artifacts.${k}: not a non-empty string url`);
                    continue;
                }
                const keys = seen.get(v) ?? [];
                keys.push(k);
                seen.set(v, keys);
            }
            for (const [url, keys] of seen) {
                if (keys.length > 1) {
                    defects.push('one-file-one-key: ' + url + ' rides ' + keys.length + ' keys (' + keys.join(', ') +
                        ') — a file under two keys renders twice');
                }
            }
        }
    }
    if (r.reports !== undefined) {
        if (typeof r.reports !== 'object' || r.reports === null || Array.isArray(r.reports)) {
            defects.push('reports: not an object (the name→verdict map)');
        }
        else {
            for (const [k, v] of Object.entries(r.reports)) {
                if (typeof v !== 'object' || v === null || Array.isArray(v)) {
                    defects.push(`reports.${k}: not an object (kind 'report' entry)`);
                    continue;
                }
                const rep = v;
                if (rep['kind'] !== 'report') {
                    defects.push(`reports.${k}: kind is not 'report' (the only entry kind)`);
                }
                if (rep['status'] !== 'pass' && rep['status'] !== 'fail' && rep['status'] !== 'warn') {
                    defects.push(`reports.${k}: status is not pass|fail|warn`);
                }
                if (rep['title'] !== undefined && (typeof rep['title'] !== 'string' || rep['title'] === '')) {
                    defects.push(`reports.${k}.title: present but not a non-empty string`);
                }
                if (rep['chips'] !== undefined) {
                    if (!Array.isArray(rep['chips'])) {
                        defects.push(`reports.${k}.chips: not an array`);
                    }
                    else {
                        rep['chips'].forEach((c, i) => {
                            if (typeof c !== 'string' || c === '') {
                                defects.push(`reports.${k}.chips[${String(i)}]: not a non-empty string`);
                            }
                        });
                    }
                }
                if (rep['rows'] !== undefined) {
                    if (typeof rep['rows'] !== 'object' || rep['rows'] === null || Array.isArray(rep['rows'])) {
                        defects.push(`reports.${k}.rows: not an object (the key-value body)`);
                    }
                    else {
                        for (const [rk, rv] of Object.entries(rep['rows'])) {
                            if (typeof rv !== 'string' && typeof rv !== 'number' && typeof rv !== 'boolean') {
                                defects.push(`reports.${k}.rows.${rk}: not a string|number|boolean`);
                            }
                        }
                    }
                }
            }
        }
    }
    if (r.assetUrls !== undefined) {
        if (!Array.isArray(r.assetUrls)) {
            defects.push('assetUrls: not an array');
        }
        else {
            r.assetUrls.forEach((u, i) => {
                if (typeof u !== 'string' || u === '') {
                    defects.push(`assetUrls[${String(i)}]: not a non-empty string url`);
                }
            });
        }
    }
    if (r.error !== undefined && typeof r.error !== 'string') {
        defects.push('error: present but not a string');
    }
    return defects;
}
/** THE DOWNLOAD FILENAME (the boundary audit's C5, promoted to the
 *  contract by A-M10): a source URL names a file by its PATHNAME's
 *  last segment, percent-decoded — never the query, never the
 *  fragment, never "". `split("/").pop()` kept both, so the manager
 *  downloaded under a clean name while the row inspected one with
 *  "f.safetensors?download=1" glued on, and the post-download check
 *  reported model-not-landed for a model that WAS on disk. A URL
 *  ending in "/" names no file: the result is "" and the caller's
 *  destination check refuses it by name. One derivation, contract-
 *  owned, so the wall can DRIVE it (a source-substring pin passed on
 *  dead code).
 *
 *  THE INPUT IS ABSOLUTE, ALWAYS: the sole caller hands it a cell
 *  artifact's `source_url`, which the DECL contract pins to
 *  `/^https?:\/\//` (models/families/contract.ts, CellArtifact), so
 *  `new URL()` never throws here and a relative spelling cannot
 *  reach this function (the re-audit, 2026-10-16). */
export function artifactFileName(sourceUrl) {
    const pathname = new URL(sourceUrl).pathname;
    // A PATHNAME ENDING IN "/" NAMES A DIRECTORY, NOT A FILE: the
    // documented law (the caller's destination check refuses an empty
    // name by name) was FALSE against the implementation — the empty
    // segments were filtered, so ".../models/x/" yielded "x", the
    // directory's own name, and the downloader was handed a filename
    // that is not a file. Honoured here, once.
    if (pathname.endsWith("/"))
        return "";
    // The trailing-slash return above is what makes the last segment
    // exist: an absolute pathname always starts with "/", so the
    // filtered split holds at least one segment here.
    const last = pathname.split("/").filter((s) => s !== "").pop();
    try {
        return decodeURIComponent(last);
    }
    catch {
        // decodeURIComponent throws URIError on a truncated or otherwise
        // undecodable %-escape: the raw segment IS the file's name, and a
        // mangled guess would download under a name the destination check
        // could never match.
        return last;
    }
}
//# sourceMappingURL=benchResult.js.map