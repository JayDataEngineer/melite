// (a) GAME ASSET PROFILE — generate one item icon via the MAP lane.
// Run: bun packages/map-client/examples/game-asset-icon.ts
import { MeliteMediaAgent } from "../src/client.ts";

const agent = new MeliteMediaAgent(process.env.MAP_URL ?? "http://localhost:33081");

const card = await agent.card();
const gen = card.tools.find((t) => t.id === "form_generate");
if (!gen) throw new Error("game-artist profile expects form_generate on the card");

// Pick an explicit image model from the tool's membership (deterministic
// first-sorted default is fine too; explicit keeps runs reproducible).
const model = process.env.MAP_MODEL ?? gen.default_model;

const task = await agent.run({
  tool: gen.id,
  model,
  params: {
    prompt:
      "game item icon, ornate brass key, isometric view, hand-painted style, clean dark background, crisp edges, centered",
    width: 512,
    height: 512,
  },
}, { timeoutMs: 10 * 60_000 });

console.log(JSON.stringify({ status: task.status, artifacts: task.artifacts, error: task.error }, null, 2));
if (task.status === "done") {
  const out = process.env.MAP_OUT ?? "art/output";
  for (const p of await agent.saveArtifacts(task, out)) console.log("saved:", p);
}
