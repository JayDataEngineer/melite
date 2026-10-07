#!/usr/bin/env node
// local-npm-registry.mjs — the FAKE NPM REGISTRY (operator 2026-10-18:
// "we made the fake npm registry, then the cold-start used it to
// install exactly like how normal DSH sessions work"). Committed and
// replicable: a zero-dependency Node HTTP server speaking the npm
// registry protocol subset that publish + install actually use —
//
//   PUT  /@scope%2Fname   npm publish (versions + _attachments)
//   GET  /@scope%2Fname   the packument (dist.tarball + integrity)
//   GET  .../-/<file.tgz> the tarball bytes
//   GET  /-/ping          liveness
//
// Every publish and every fetch logs loudly. State persists on disk
// under --root (tarballs + a packument index per package), so a
// restart serves what a previous run published — inspectable,
// re-runnable, and never a black box.
//
// The purpose: prove the artifact plane against THIS registry before
// the public GO — publish the gated release bytes into it, then let
// a cold consumer profile install @melite/* from it exactly the way
// production installs from npmjs (per-scope redirect in .npmrc —
// upstream @deepseek-ai packages keep coming from the real npm).
//
// Usage: node tools/local-npm-registry.mjs [--port 4873] [--root DIR]

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve as pathResolve } from "node:path";

const argv = process.argv.slice(2);
const port = Number(argv[argIndex(argv, "--port")] ?? 4873);
const root = pathResolve(argv[argIndex(argv, "--root")] ?? "/var/tmp/melite-npm-registry");

function argIndex(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? i + 1 : -1;
}

// packument index: root/<encoded-name>.json -> { name, versions: { v: manifest } }
// tarball:        root/<encoded-name>/<file>.tgz
const encoded = (name) => name.replace("/", "%2F");
const indexPath = (name) => join(root, encoded(name) + ".json");
const readIndex = (name) =>
  existsSync(indexPath(name))
    ? JSON.parse(readFileSync(indexPath(name), "utf8"))
    : { name, versions: {} };
const writeIndex = (doc) => writeFileSync(indexPath(doc.name), JSON.stringify(doc, null, 2) + "\n");

mkdirSync(root, { recursive: true });

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const send = (code, body, type = "application/json") => {
    if (Buffer.isBuffer(body)) {
      res.writeHead(code, { "content-type": type });
      res.end(body); // tarball bytes — never JSON-wrapped
      return;
    }
    res.writeHead(code, { "content-type": type });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };
  if (req.method === "GET" && url.pathname === "/-/ping") return send(200, { ok: true });

  // tarball fetch: /<encoded-name>/-/<file>.tgz — stored one level up
  // (root/<encoded-name>/<file>.tgz; the URL's /-/ is npm's layout,
  // not ours — normalize before touching disk)
  if (req.method === "GET" && url.pathname.endsWith(".tgz")) {
    const onDisk = url.pathname.replace(/\/-\/([^/]+\.tgz)$/, "/$1");
    const p = join(root, onDisk);
    if (!existsSync(p)) return send(404, { error: "not_found", reason: `file ${url.pathname.split("/").pop()} not in this registry` });
    console.log(`fetch  ${url.pathname.split("/").pop()} (${readFileSync(p).length} bytes)`);
    return send(200, readFileSync(p), "application/octet-stream");
  }

  const pkg = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (pkg === "") return send(404, { error: "not_found" });

  if (req.method === "GET") {
    if (!existsSync(indexPath(pkg))) return send(404, { error: "not_found", reason: `${pkg} is not in this registry` });
    console.log(`packument ${pkg}`);
    return send(200, readFileSync(indexPath(pkg), "utf8"));
  }

  if (req.method === "PUT") {
    const chunks = [];
    req.on("data", (d) => chunks.push(d));
    req.on("end", () => {
      try {
        const doc = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const name = String(doc.name ?? pkg);
        if (name !== pkg) return send(400, { error: "invalid", reason: `document name ${name} ≠ path ${pkg}` });
        const attachments = doc._attachments ?? {};
        const files = Object.keys(attachments);
        if (files.length === 0) return send(400, { error: "invalid", reason: "publish carries no _attachments" });
        const index = readIndex(name);
        for (const v of Object.keys(doc.versions ?? {})) {
          const manifest = doc.versions[v];
          if (index.versions[v] !== undefined) {
            return send(409, { error: "conflict", reason: `${name}@${v} already published (this registry never overwrites)` });
          }
          index.versions[v] = manifest;
        }
        // dist-tags ride the publish document (npm sends the channel
        // it was told to tag); pnpm's resolver reads
        // packument["dist-tags"].latest even for exact specs — a
        // packument without the block crashes resolveNpm, so a
        // tagless publish still records latest
        index["dist-tags"] = {
          ...(index["dist-tags"] ?? {}),
          ...(doc["dist-tags"] ?? {}),
          latest: doc["dist-tags"]?.["latest"] ?? index["dist-tags"]?.["latest"] ?? Object.keys(index.versions)[0],
        };
        const dir = join(root, encoded(name));
        mkdirSync(dir, { recursive: true });
        for (const attachment of files) {
          // npm names a scoped attachment "@scope/name-v.tgz" — the
          // stored FILE is its basename (one flat dir per package)
          const file = attachment.split("/").pop();
          const bytes = Buffer.from(attachments[attachment].data, "base64");
          writeFileSync(join(dir, file), bytes);
          // dist.integrity is OURS: computed from the actual bytes we
          // stored — never trusting the publisher's claim
          const sha512 = createHash("sha512").update(bytes).digest("base64");
          const shasum = createHash("sha1").update(bytes).digest("hex");
          for (const v of Object.keys(doc.versions ?? {})) {
            index.versions[v].dist = {
              ...(index.versions[v].dist ?? {}),
              tarball: `http://127.0.0.1:${port}/${encoded(name)}/-/${file}`,
              integrity: `sha512-${sha512}`,
              shasum,
            };
          }
          console.log(`publish ${name}@${Object.keys(doc.versions).join(",")} (${file}, ${bytes.length} bytes)`);
        }
        writeIndex(index);
        send(201, { ok: true });
      } catch (e) {
        console.log(`REFUSED PUT ${pkg}: ${String(e?.message ?? e)}`);
        send(400, { error: "invalid", reason: String(e?.message ?? e) });
      }
    });
    return;
  }
  send(405, { error: "method_not_allowed" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`fake npm registry listening on http://127.0.0.1:${port}`);
  console.log(`state root: ${root}`);
});
