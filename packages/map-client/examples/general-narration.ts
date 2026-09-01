// (b) GENERAL MEDIA PROFILE — TTS narration through the same door.
// Run: bun packages/map-client/examples/general-narration.ts
import { MeliteMediaAgent } from "../src/client.ts";

const agent = new MeliteMediaAgent(process.env.MAP_URL ?? "http://localhost:33081");
const card = await agent.card();
const tts = card.tools.find((t) => t.id === "form_tts");
if (!tts) throw new Error("media-general profile expects form_tts on the card");

const schema = await agent.toolSchema(tts.id); // per-model param truth lives here
console.error("[map] tts fields:", (schema.fields as Array<{name:string}>).map((f) => f.name).join(", "));

const task = await agent.run({
  tool: tts.id,
  params: {
    text: "Welcome to the workshop. The media agent is online.",
  },
}, { timeoutMs: 10 * 60_000 });

console.log(JSON.stringify({ status: task.status, artifacts: task.artifacts, error: task.error }, null, 2));
