import type { TheoremAnalysis } from "@prooflens/pipeline";
import { EpistemicChip } from "./EpistemicChip.js";
import { InlineMarkup } from "./InlineMarkup.js";

/**
 * The layered explanation, ordered from what Lean proved toward what a human
 * might make of it. Every layer carries its own chip: a reader can stop at any
 * point and know exactly how much of what they have read the kernel backs.
 */
export function InterpretationPanel({ analysis }: { analysis: TheoremAnalysis }): JSX.Element {
  const meaningLayers = analysis.explanations.filter((layer) =>
    ["mathematical", "structural", "domain", "parameters"].includes(layer.id),
  );
  const supportingLayers = analysis.explanations.filter((layer) => !meaningLayers.includes(layer));
  const renderLayers = (layers: TheoremAnalysis["explanations"]): JSX.Element => (
    <ol className="layers">
      {layers.map((layer) => (
        <li key={layer.id} className={`layer layer--${layer.claim.status}`}>
          <div className="layer__head">
            <h3 className="layer__title">{layer.title}</h3>
            <EpistemicChip status={layer.claim.status} />
          </div>
          <p className={`layer__text${layer.id === "formal" ? " layer__text--mono" : ""}`}>
            <InlineMarkup text={layer.claim.value} />
          </p>
          <details className="layer__rule">
            <summary>Source of this explanation</summary>
            {layer.claim.provenance.rule ? (
              <code className="inline-code">{layer.claim.provenance.rule.id}</code>
            ) : (
              <>Transcribed from the Lean extraction</>
            )}
            {layer.claim.provenance.sources[0]?.declaration ? (
              <span className="layer__source">
                {" "}
                · {layer.claim.provenance.sources[0].declaration}
              </span>
            ) : null}
          </details>
        </li>
      ))}
    </ol>
  );
  return (
    <section className="panel panel--interpretation" aria-labelledby="interpretation-heading">
      <header className="panel__header">
        <h2 id="interpretation-heading" className="panel__title">
          Understand the statement
        </h2>
        <span className="panel__count">{analysis.explanations.length} layers</span>
      </header>

      <p className="panel__note">
        Connect the picture to the mathematical claim, the symbols, and their relationships. Each
        label distinguishes a derived explanation from an author&rsquo;s interpretation.
      </p>

      {renderLayers(meaningLayers)}
      <details>
        <summary>Proof status and assumption usage</summary>
        {renderLayers(supportingLayers)}
      </details>
    </section>
  );
}
