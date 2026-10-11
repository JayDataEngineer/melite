/** b64 - async decode to ArrayBuffer via the browser native data: URL decoder. */
import { apiFetch, externalUrl } from "@melite/catalog/api";
export async function decodeB64ToBuffer(b64) {
    const res = await apiFetch(externalUrl(`data:application/octet-stream;base64,${b64}`));
    return res.arrayBuffer();
}
//# sourceMappingURL=b64.js.map