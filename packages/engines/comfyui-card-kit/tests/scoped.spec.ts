// scoped.spec.ts — THE FILM SCOPE pinned (2026-09-17, the mergegraph
// port): scoped() namespaces node ids under a `window${k}_` prefix so
// N windows of one film ride ONE prompt with REAL seam edges; counters
// stay global per class (ids never collide across scopes), nesting
// composes prefixes, and the scope closes on throw.
import { describe, expect, it } from "vitest";
import { GraphBuilder } from "../src/graph.ts";

describe("GraphBuilder.scoped (the film namespace)", () => {
  it("prefixes ids inside the scope and restores after", () => {
    const g = new GraphBuilder();
    const a = g.node("UNETLoader");
    expect(a.id).toBe("UNETLoader.0");
    g.scoped("window1_", (w) => {
      const b = w.node("UNETLoader");
      expect(b.id).toBe("window1_UNETLoader.1");
      const c = w.node("SaveVideo");
      expect(c.id).toBe("window1_SaveVideo.0");
    });
    const d = g.node("UNETLoader");
    expect(d.id).toBe("UNETLoader.2");

    const graph = g.toJSON();
    expect(Object.keys(graph)).toEqual([
      "UNETLoader.0",
      "window1_UNETLoader.1",
      "window1_SaveVideo.0",
      "UNETLoader.2",
    ]);
  });

  it("composes nested scopes and closes on throw", () => {
    const g = new GraphBuilder();
    g.scoped("film_", (w) => {
      w.scoped("window2_", (w2) => {
        expect(w2.node("VAEDecode").id).toBe("film_window2_VAEDecode.0");
      });
      expect(w.node("VAEDecode").id).toBe("film_VAEDecode.1");
    });
    expect(() =>
      g.scoped("boom_", (w) => {
        w.node("SaveVideo");
        throw new Error("mid-scope failure");
      }),
    ).toThrow("mid-scope failure");
    // the prefix closed — the next node is unscoped
    expect(g.node("SaveVideo").id).toBe("SaveVideo.1");
  });

  it("wires ACROSS scopes through real handles (the seam edge)", () => {
    const g = new GraphBuilder();
    const sampler = g.scoped("window1_", (w) => w.node("SamplerCustomAdvanced").out(0));
    g.scoped("window2_", (w) => {
      w.node("MiniMaxH3MotionContext", { context_latent: sampler });
    });
    const graph = g.toJSON();
    expect(graph["window2_MiniMaxH3MotionContext.0"].inputs.context_latent).toEqual([
      "window1_SamplerCustomAdvanced.0",
      0,
    ]);
  });
});
