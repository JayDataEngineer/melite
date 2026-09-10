#!/usr/bin/env node
// manager-stub.mjs — the fake VENDOR ComfyUI-Manager for the walls
// plane. Speaks the built-in manager's HTTP contract (the routes its
// own web UI rides, glob/manager_server.py in the vendored custom
// node) on an ephemeral port: system_stats, manager queue, custom
// node list/install, external models, snapshots, versions, reboot,
// free. Hermetic: canned answers, no disk writes beyond memory, dies
// with SIGTERM. Prints "READY <port>" on stdout when listening.
//
// This is TEST TOOLING (a contract stub), never estate logic: it
// owns no vocabulary, no envelope, no guard — the wall suites pin
// those against the door's sources.
import { createServer } from "node:http";

const QUEUE = { total_count: 0, done_count: 0, in_progress_count: 0, is_processing: false };
const INSTALLED = {
  "comfyui-kjnodes": { version: "1.5.6" },
  "ComfyUI-VideoHelperSuite": { version: "1.5.0" },
};
const NODE_LIST = {
  custom_nodes: [
    { title: "ComfyUI-KJNodes", cnr_id: "kjnodes", id: "kjnodes", version: "cnr", ver: "0.1.0" },
    { title: "ComfyUI-VideoHelperSuite", cnr_id: "videohelper_suite", id: "videohelper_suite", version: "cnr", ver: "0.2.0" },
  ],
};
const MODELS = {
  models: [
    { name: "SDXL base", type: "checkpoints", base: "SDXL", filename: "sdxl_base.safetensors", url: "https://stub/sdxl.safetensors", save_path: "checkpoints" },
    { name: "4x upscale", type: "upscale_models", base: "SDXL", filename: "4x.safetensors", url: "https://stub/4x.safetensors", save_path: "upscale_models" },
  ],
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const path = url.pathname;
  const send = (status, body, type = "application/json") => {
    res.writeHead(status, { "content-type": type });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };
  if (req.method === "GET" && path === "/system_stats") {
    return send(200, { system: { comfyui_version: "0.3.76-stub", os: "wall-stub" }, devices: [{ name: "stub-gpu", vram_total: 1, vram_free: 1 }] });
  }
  if (req.method === "GET" && path === "/manager/version") return send(200, { version: "3.xx-wall-stub" });
  if (req.method === "GET" && path === "/manager/queue/status") return send(200, QUEUE);
  if (req.method === "GET" && path === "/customnode/installed") return send(200, INSTALLED);
  if (req.method === "GET" && path === "/customnode/getlist") return send(200, NODE_LIST);
  if (req.method === "GET" && path === "/externalmodel/getlist") return send(200, MODELS);
  if (req.method === "GET" && path === "/snapshot/getlist") return send(200, { items: ["snapshot-20260910T0000"] });
  if (req.method === "GET" && path === "/comfyui_manager/comfyui_versions") {
    return send(200, { versions: ["0.3.76", "0.3.75"], current: "0.3.76" });
  }
  if (req.method === "POST") {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      let body = {};
      try { body = raw === "" ? {} : JSON.parse(raw); } catch { body = {}; }
      if (path === "/manager/queue/install") {
        QUEUE.total_count += 1;
        QUEUE.done_count += 1;
        return send(200, "");
      }
      if (path === "/manager/queue/start") return send(200, "");
      if (path === "/manager/queue/update_comfyui") { QUEUE.total_count += 1; QUEUE.done_count += 1; return send(200, ""); }
      if (path === "/customnode/install/git_url") {
        if (typeof body.url !== "string" || body.url === "") return send(400, "Invalid request body: expected JSON object with a 'url' field");
        return send(200, "");
      }
      if (path === "/snapshot/save") return send(200, "");
      if (path === "/snapshot/restore") {
        if (typeof body.target !== "string" || body.target === "") return send(400, "Invalid snapshot target");
        return send(200, "");
      }
      if (path === "/comfyui_manager/comfyui_switch_version") return send(200, "");
      if (path === "/manager/reboot") {
        res.writeHead(200);
        res.end();
        setTimeout(() => process.exit(0), 20);
        return;
      }
      if (path === "/free") return send(200, { result: "stub-freed" });
      return send(404, "no such route " + path);
    });
    return;
  }
  return send(404, "no such route " + path);
});

server.listen(0, "127.0.0.1", () => {
  const port = server.address().port;
  process.stdout.write("READY " + port + "\n");
});
