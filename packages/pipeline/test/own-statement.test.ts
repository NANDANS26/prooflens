import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { importFormalIR, kernelWitness, previewLeanSource } from "@prooflens/formal-ir";
import { runPipeline } from "@prooflens/pipeline";
import {
  evaluateExploration,
  sampleExploration,
  type ReadyExploration,
} from "@prooflens/visual-ir";
import { corpus } from "./helpers.js";

const modules = ["ShadowPrice", "InverseSquare", "ShadowPriceLevelCurves", "SLSPTTowerOrdering"];
const sources = modules.map((module) =>
  readFileSync(new URL(`./fixtures/viridis-run026/${module}.lean`, import.meta.url), "utf8"),
);
const analyses = runPipeline(previewLeanSource(sources.join("\n\n")).document).analyses;
function scene(name: string): ReadyExploration {
  const found = analyses.find((a) => a.math.name === name)?.exploration;
  if (!found || found.status !== "ready") throw new Error(`Missing scene ${name}`);
  return found;
}
function values(
  s: ReadyExploration,
  bySymbol: Record<string, number> = {},
): Record<string, number> {
  return Object.fromEntries(s.controls.map((c) => [c.id, bySymbol[c.symbol] ?? c.initial]));
}

describe("a user's own Lean statement", () => {
  it("previews the exact 19 Viridis declarations without running or certifying their proofs", () => {
    expect(analyses).toHaveLength(19);
    for (const analysis of analyses) {
      expect(analysis.exploration.status, analysis.math.name).toBe("ready");
      expect(analysis.math.ceiling).toBe("derived");
      expect(analysis.explanations.every((e) => e.claim.status !== "verified")).toBe(true);
      expect(analysis.visuals.every((v) => v.epistemic !== "verified")).toBe(true);
      expect(analysis.math.conclusionDisplay).not.toContain("hyg");
    }
  });
  it("shows the fourfold-budget law with concrete values", () => {
    const s = scene("shadow_price_doubling_law");
    expect(s.kind === "relation" && s.scaling).toEqual({ factor: 4, divisor: 2, variable: "M" });
    const sample = evaluateExploration(s, values(s, { C: 36, M: 4 }));
    expect(sample.assumptionStatus).toBe("yes");
    expect(sample.left).toBe(1.5);
    expect(sample.right).toBe(1.5);
    const outside = evaluateExploration(s, values(s, { M: 0 }));
    expect(outside.assumptionStatus).toBe("no");
    expect(outside.error).toBeTruthy();
  });
  it("constructs examples above negative, small and large targets while preserving the positive-input window", () => {
    const s = scene("shadow_price_diverges");
    for (const M of [-5, 0, 0.1, 1, 100, 1e8])
      for (const fraction of [0.05, 0.5, 0.95]) {
        const result = evaluateExploration(s, values(s, { d: 2, A: 4, tau: 2, M }), fraction);
        expect(result.error).toBeUndefined();
        expect(result.delta).toBeGreaterThan(0);
        expect(result.inputValue!).toBeLessThan(result.delta!);
        expect(result.left!).toBeGreaterThan(M);
      }
  });
  it("explains and plots the actual one-sided inverse-square limit", () => {
    const s = scene("inv_sq_tendsto_atTop");
    expect(s.kind).toBe("inverse-square");
    if (s.kind !== "inverse-square") return;
    expect(
      analyses
        .find((a) => a.math.name === "inv_sq_tendsto_atTop")!
        .explanations.find((e) => e.id === "mathematical")!.claim.value,
    ).toContain("approaches 0 from above");
    const points = sampleExploration(s, values(s), s.input.id, 0.25, 2);
    expect(points[0]?.left).toBe(16);
    expect(points.at(-1)?.left).toBe(0.25);
  });
  it("retains equivalence when both conditions are false", () => {
    const s = scene("prefactor_ordering"),
      result = evaluateExploration(s, values(s, { C1: 4, C2: 1, sigma: 2 }));
    expect(result.assumptionStatus).toBe("yes");
    expect(result.result).toBe("no");
    expect(result.equivalentResult).toBe("no");
    expect(result.left).toBe(1);
    expect(result.right).toBe(0.25);
  });
  it("does not turn a natural-valued binder into a continuous real limit", () => {
    const doc = previewLeanSource(sources[1]!).document;
    const declaration = doc.declarations.find((d) => d.name === "inv_sq_tendsto_atTop")!;
    const raw = declaration.conclusion.tree;
    if (raw.kind !== "app" || raw.args[2]?.kind !== "lam") throw new Error("Missing limit lambda");
    raw.args[2].binderType = { kind: "const", name: "Nat", levels: [] };
    doc.declarations = [declaration];
    expect(runPipeline(doc).analyses[0]!.exploration.status).toBe("blocked");
  });
  it("shows strict convexity and breaks the curve where its assumptions fail", () => {
    const s = scene("inv_sq_strict_convex"),
      v = values(s, { x: 1, y: 2, t: 0.5 });
    const result = evaluateExploration(s, v);
    expect(result.left).toBeCloseTo(4 / 9);
    expect(result.right).toBeCloseTo(0.625);
    const axis = s.controls.find((c) => c.symbol === "t")!.id;
    const points = sampleExploration(s, v, axis, 0, 1);
    expect(points[0]).toBeNull();
    expect(points.at(-1)).toBeNull();
    expect(points[50]).not.toBeNull();
  });
  it("plots a false conjecture as false without claiming proof", () => {
    const a = runPipeline(
      previewLeanSource("theorem wrong (x : ℝ) : x ^ 2 < 0 := by sorry").document,
    ).analyses[0]!;
    expect(a.math.trust.usesSorry).toBe(true);
    expect(a.math.ceiling).toBe("derived");
    const s = a.exploration;
    if (s.status !== "ready") throw new Error(s.reason);
    expect(evaluateExploration(s, values(s)).result).toBe("no");
  });
  it("refuses a fabricated imported verification assertion", () => {
    const doc = importFormalIR(JSON.stringify(corpus()));
    for (const d of doc.declarations) expect(kernelWitness(doc, d)).toBeNull();
    expect(runPipeline(doc).analyses.every((a) => a.math.ceiling === "derived")).toBe(true);
  });
  it.each([
    "theorem unknown (x : ℝ) : mysterious x = x := by sorry",
    "theorem natural (x : Nat) : x = x := by rfl",
    'local notation "Real.sqrt" => Real.exp\ntheorem mismatch (x : ℝ) : Real.sqrt x = x := by sorry',
    "theorem missing (x : ℝ) : x = x",
  ])("rejects unsupported source rather than inventing its meaning: %s", (text) => {
    expect(() => previewLeanSource(text)).toThrow();
  });
  it("reports partial imports and leaves unsupported statements named", () => {
    const result = previewLeanSource(
      "theorem good (x : ℝ) : x = x := by rfl\ntheorem bad (x : ℝ) : mystery x = x := by sorry",
    );
    expect(result.document.declarations.map((d) => d.name)).toEqual(["good"]);
    expect(result.skipped[0]?.name).toBe("bad");
  });
  it.each([
    "theorem negative_limit : Filter.Tendsto (fun x : ℝ => -1 / x ^ 2) (nhdsWithin 0 (Set.Ioi 0)) Filter.atTop := by sorry",
    "theorem wrong_limit : Filter.Tendsto (fun x : ℝ => 1 / x ^ 3) (nhdsWithin 0 (Set.Ioi 0)) Filter.atTop := by sorry",
    "theorem wrong_side : Filter.Tendsto (fun x : ℝ => 1 / x ^ 2) (nhdsWithin 0 (Set.Iio 0)) Filter.atTop := by sorry",
    "theorem fake_divergence (M : ℝ) : ∃ δ > 0, ∀ x : ℝ, 0 < x → δ < x → M < 1 / x ^ 2 := by sorry",
  ])("does not turn a near-match into a valid divergence example: %s", (text) => {
    const s = runPipeline(previewLeanSource(text).document).analyses[0]!.exploration;
    if (s.status === "ready") expect(evaluateExploration(s, values(s)).error).toBeTruthy();
    else expect(s.reason).toBeTruthy();
  });
  it("rejects excessive nesting, empty imports and duplicate identities", () => {
    expect(() => importFormalIR("[".repeat(160) + "0" + "]".repeat(160))).toThrow(/nested/);
    const doc = structuredClone(corpus());
    const declaration = doc.declarations[0]!;
    doc.declarations = [];
    expect(() => importFormalIR(JSON.stringify(doc))).toThrow(/no declarations/);
    doc.declarations = [declaration, declaration];
    expect(() => importFormalIR(JSON.stringify(doc))).toThrow(/unique/);
  });
});
