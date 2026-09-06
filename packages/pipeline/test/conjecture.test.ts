import { describe, expect, it } from "vitest";
import { findAnalysis, runPipeline } from "@prooflens/pipeline";
import { renderSvg } from "@prooflens/renderer-svg";
import { evaluateSemanticScene, initialSceneValues } from "@prooflens/visual-ir";
import { corpus } from "./helpers.js";

describe("visual understanding of an unproved statement", () => {
  it("keeps the bound explorable without promoting its story or explanation to verified", () => {
    const doc = corpus();
    const declaration = doc.declarations.find((item) =>
      item.name.endsWith(".information_rate_bound"),
    )!;
    // A test-only incomplete-proof variant; the checked-in extraction is untouched.
    declaration.usesSorry = true;
    declaration.axioms.push("sorryAx");
    const analysis = findAnalysis(runPipeline(doc), "information_rate_bound")!;

    expect(analysis.explanations.find((layer) => layer.id === "formal")?.title).toBe(
      "What was stated",
    );
    expect(analysis.explanations.every((layer) => layer.claim.status !== "verified")).toBe(true);
    expect(analysis.explanations.find((layer) => layer.id === "structural")?.claim.value).toContain(
      "The statement asserts",
    );
    expect(analysis.visuals.length).toBeGreaterThan(0);
    expect(analysis.visuals.every((visual) => renderSvg(visual).startsWith("<svg"))).toBe(true);
    expect(analysis.semanticScene.status).toBe("ready");
    if (analysis.semanticScene.status !== "ready") throw new Error(analysis.semanticScene.reason);
    const scene = analysis.semanticScene.scene;
    expect(scene.equationAnatomy?.story.length).toBeGreaterThan(0);
    expect(scene.equationAnatomy?.story.every((step) => step.epistemic !== "verified")).toBe(true);
    expect(scene.equationAnatomy?.story.at(-1)?.explanation).toContain("does not prove it");
    expect(scene.caveat).toContain("unverified statement");
    const evaluation = evaluateSemanticScene(scene, initialSceneValues(scene), 0);
    expect(evaluation.description).not.toContain("verified");
    expect(evaluation.statement).toContain("SATISFIES DISPLAYED BOUND");
  });
});
