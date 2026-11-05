// object-info-stub-child.mjs — the census responder PROCESS for
// object-info-stub.ts. It runs OUTSIDE the vitest worker because the
// specs it serves spawn the compose door with spawnSync: a
// spawnSync call freezes the calling event loop, so a server living
// in that same loop can never answer while the child needs it (the
// connect succeeds, the response never comes, every spawn burns its
// full timeout — the 2026-11-16 deadlock). A separate process owns
// the socket; the spawn runs; the law gets judged.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const census = readFileSync(process.argv[2], "utf8");
const srv = createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(census);
});
srv.listen(0, "127.0.0.1", () => {
  const addr = srv.address();
  const port = typeof addr === "object" && addr !== null ? addr.port : 0;
  // one line on stdout = the handshake the parent awaits
  process.stdout.write(`http://127.0.0.1:${port}\n`);
});
