#!/usr/bin/env bun
/**
 * map — minimal CLI over @melite/map-client (MAP v0).
 *
 *   bun packages/map-client/src/cli.ts card [--profile game-artist]
 *   bun packages/map-client/src/cli.ts schema form_generate --model anima
 *   bun packages/map-client/src/cli.ts run --tool form_generate --model anima \
 *       --params '{"prompt":"a rust sword icon","width":512,"height":512}' --out /tmp/out
 *   bun packages/map-client/src/cli.ts status <task_id>
 */
import { MeliteMediaAgent } from "./client.ts";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const base = process.env.MAP_URL ?? "http://localhost:33081";
const client = new MeliteMediaAgent(base, { apiKey: process.env.MELITE_API_KEY });
const cmd = process.argv[2];

switch (cmd) {
  case "card":
  case "tools": {
    const card = await client.card();
    const profile = arg("--profile");
    const tools = profile ? card.tools.filter((t) => t.profiles.includes(profile)) : card.tools;
    console.log(JSON.stringify({ protocol: card.protocol, agent: card.agent.id, tools }, null, 2));
    break;
  }
  case "schema": {
    const tool = process.argv[3];
    console.log(JSON.stringify(await client.toolSchema(tool, arg("--model")), null, 2));
    break;
  }
  case "run": {
    const input = {
      tool: arg("--tool"),
      model: arg("--model"),
      params: JSON.parse(arg("--params") ?? "{}"),
      wait_seconds: Number(arg("--wait-seconds") ?? "0"),
    };
    const submitted = await client.submit(input);
    const final = submitted.terminal ? submitted : await client.wait(submitted.task_id);
    console.log(JSON.stringify(final, null, 2));
    const out = arg("--out");
    if (out && final.status === "done") {
      for (const p of await client.saveArtifacts(final, out)) console.log("saved:", p);
    }
    break;
  }
  case "status": {
    console.log(JSON.stringify(await client.status(process.argv[3]), null, 2));
    break;
  }
  default:
    console.error("usage: map card|schema|run|status  (see file header)");
    process.exit(2);
}
