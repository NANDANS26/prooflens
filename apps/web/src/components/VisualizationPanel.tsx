import { useMemo } from "react";
import { renderSvg } from "@prooflens/renderer-svg";
import type { VisualSpec } from "@prooflens/visual-ir";
import type { TheoremAnalysis } from "@prooflens/pipeline";
import { EpistemicChip } from "./EpistemicChip.js";
import { InlineMarkup } from "./InlineMarkup.js";
import { Tabs, type TabItem } from "./Tabs.js";
import { TrustBanner } from "./TrustBanner.js";
import { SemanticScene } from "./SemanticScene.js";
import { MathExploration } from "./MathExploration.js";

interface VisualizationPanelProps {
  analysis: TheoremAnalysis;
  activeIndex: number;
  onSelectIndex: (index: number) => void;
}

export function VisualizationPanel({
  analysis,
  activeIndex,
  onSelectIndex,
}: VisualizationPanelProps): JSX.Element {
  const visuals = analysis.visuals;
  const index = Math.min(activeIndex, Math.max(0, visuals.length - 1));
  const spec: VisualSpec | undefined = visuals[index];

  const tabs: TabItem[] = visuals.map((visual, i) => ({
    id: String(i),
    label: visual.type,
  }));

  const svg = useMemo(() => {
    if (!spec) return null;
    try {
      // The markup below is produced by @prooflens/renderer-svg, our own
      // deterministic renderer: no network input, no user-authored HTML, and
      // every string it embeds passes through its escapeXml(). That is why
      // injecting it with dangerouslySetInnerHTML is safe here — do not extend
      // this to any SVG that did not come out of renderSvg().
      return renderSvg(spec, { theme: "auto" });
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [spec]);

  return (
    <section className="panel panel--visual" aria-labelledby="visual-heading">
      <header className="panel__header">
        <h2 id="visual-heading" className="panel__title">
          What the mathematics shows
        </h2>
        {spec && analysis.exploration.status !== "ready" ? (
          <EpistemicChip status={spec.epistemic} prefix="selected figure" />
        ) : null}
      </header>

      <TrustBanner analysis={analysis} />

      {analysis.unsupported ? (
        <p className="panel__note">
          A visual explanation of this mathematical form is not available yet. The structure and
          Lean statement remain available below.
        </p>
      ) : null}

      {analysis.exploration.status === "ready" ? (
        <MathExploration
          key={analysis.math.name + analysis.math.statementDisplay}
          scene={analysis.exploration}
          name={analysis.math.name}
          statement={analysis.math.statementDisplay}
          sourceStatus={
            analysis.math.ceiling === "verified"
              ? "Bundled extraction records a Lean-checked declaration"
              : "Input has no independently checked proof attestation"
          }
        />
      ) : analysis.semanticScene.status === "ready" ? (
        <SemanticScene scene={analysis.semanticScene.scene} />
      ) : (
        <p className="panel__note">{analysis.exploration.reason}</p>
      )}

      {analysis.exploration.status === "ready" && analysis.semanticScene.status === "ready" ? (
        <details className="supporting-figures">
          <summary>Explore the author’s annotated scenario</summary>
          <SemanticScene scene={analysis.semanticScene.scene} />
        </details>
      ) : null}

      <details
        className="supporting-figures"
        open={analysis.exploration.status !== "ready" && analysis.semanticScene.status !== "ready"}
      >
        <summary>Statement structure and supporting figures</summary>
        {visuals.length === 0 || !spec ? (
          <p className="empty">
            A visual explanation is not available for this statement yet. You can still read its
            mathematical description and original Lean statement.
          </p>
        ) : (
          <>
            {visuals.length > 1 ? (
              <Tabs
                items={tabs}
                activeId={String(index)}
                onSelect={(id) => onSelectIndex(Number(id))}
                label="Figures for this statement"
                idPrefix="visual"
              />
            ) : null}

            <div
              className="figure-wrap"
              id={`visual-panel-${index}`}
              role={visuals.length > 1 ? "tabpanel" : undefined}
              aria-labelledby={visuals.length > 1 ? `visual-tab-${index}` : undefined}
              tabIndex={0}
            >
              <div className="figure-heading">
                <h3 className="figure-title">{spec.title}</h3>
                {spec.subtitle ? <p className="figure-subtitle">{spec.subtitle}</p> : null}
              </div>

              {svg && typeof svg === "object" ? (
                <p className="empty empty--error">This figure failed to render: {svg.error}</p>
              ) : (
                <div className="figure" dangerouslySetInnerHTML={{ __html: svg ?? "" }} />
              )}

              <div className="rationale">
                <h4 className="rationale__label">Why this figure</h4>
                <p className="rationale__text">
                  <InlineMarkup text={spec.rationale} />
                </p>
                {spec.provenance.rule ? (
                  <p className="rationale__rule">
                    Rule <code className="inline-code">{spec.provenance.rule.id}</code> ·{" "}
                    {spec.provenance.rule.description}
                  </p>
                ) : null}
                {spec.provenance.note ? (
                  <p className="rationale__rule">{spec.provenance.note}</p>
                ) : null}
              </div>
            </div>
          </>
        )}
      </details>
    </section>
  );
}
