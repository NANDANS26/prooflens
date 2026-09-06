import { useRef, useState } from "react";
import { renderExpression, renderProposition } from "@prooflens/math-ir";
import {
  evaluateExploration,
  formatNumber,
  sampleExploration,
  type ExplorationPoint,
  type ReadyExploration,
} from "@prooflens/visual-ir";

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const truth = (result: string | undefined) =>
  result === "yes"
    ? "holds at these values"
    : result === "no"
      ? "does not hold at these values"
      : "cannot be evaluated here";

export function MathExploration({
  scene,
  name,
  statement,
  sourceStatus,
}: {
  scene: ReadyExploration;
  name: string;
  statement: string;
  sourceStatus: string;
}): JSX.Element {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(scene.controls.map((c) => [c.id, c.initial])),
  );
  const [axis, setAxis] = useState(
    scene.kind === "inverse-square" ? scene.input.id : (scene.controls[0]?.id ?? ""),
  );
  const [fraction, setFraction] = useState(0.5);
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const graphRef = useRef<SVGSVGElement>(null);
  const snapshot = evaluateExploration(scene, values, fraction);
  const center = values[axis] ?? 1;
  const min =
    range?.min ??
    (scene.kind === "inverse-square"
      ? Math.min((snapshot.delta ?? 1) / 2, (snapshot.inputValue ?? 0.5) * 0.8)
      : center > 0
        ? center / 4
        : center - 2);
  const max =
    range?.max ??
    (scene.kind === "inverse-square"
      ? (snapshot.delta ?? 1) * 2
      : center > 0
        ? center * 4
        : center + 2);
  const axisSymbol =
    scene.kind === "inverse-square"
      ? scene.input.symbol
      : (scene.controls.find((c) => c.id === axis)?.symbol ?? "input");
  const hasAxis = scene.kind === "inverse-square" || scene.controls.length > 0;
  const points = hasAxis ? sampleExploration(scene, values, axis, min, max) : [];
  const formula =
    scene.kind === "inverse-square"
      ? renderExpression(scene.expression)
      : renderProposition(scene.relation);
  const narrative =
    scene.kind === "inverse-square"
      ? `As ${scene.input.symbol} approaches zero from above, the inverse-square expression grows without bound when its coefficient is positive. For any target M, a sufficiently small positive input puts the expression above M.`
      : scene.scaling
        ? `Multiplying ${scene.scaling.variable} by ${scene.scaling.factor} divides the square-root result by ${scene.scaling.divisor}. Change the values to compare both sides of the equation.`
        : scene.equivalentTo
          ? `These are two ways to express the same condition: ${renderProposition(scene.equivalentTo)} if and only if ${formula}. They can both hold or both fail; equivalence means they agree.`
          : `Compare ${renderExpression(scene.relation.lhs)} with ${renderExpression(scene.relation.rhs)}. Change a value to see how the relationship depends on the stated assumptions.`;
  const filename = name.replace(/[^\p{L}\p{N}._-]/gu, "_");
  const saveExplanation = () => {
    const report = `# ${name}\n\n${narrative}\n\n## Original statement\n\n\`\`\`lean\n${statement}\n\`\`\`\n\n## Source status\n\n${sourceStatus}. ${scene.rule.id}: ${scene.rule.description} This is a numerical illustration, not a new proof or certification. Equality is compared at floating-point precision. Only ordinary real arithmetic domains are visualized.\n\n## Current example\n\n${scene.controls.map((c) => `- ${c.symbol} = ${values[c.id]}`).join("\n")}\n\n${snapshot.delta ? `δ = ${snapshot.delta}; sample input = ${snapshot.inputValue}.\n\n` : ""}Left value: ${snapshot.left ?? "unavailable"}; right value: ${snapshot.right ?? "unavailable"}. Relationship ${truth(snapshot.result)}.\n\n${scene.kind === "relation" && scene.equivalentTo ? `Other condition ${truth(snapshot.equivalentResult)}.\n\n` : ""}## Assumptions at these values\n\n${snapshot.assumptions.length ? snapshot.assumptions.map((a) => `- ${a.statement}: ${a.result}`).join("\n") : "No assumptions were listed."}\n\n${snapshot.error ?? ""}\n\n${hasAxis ? `Plot: ${axisSymbol} from ${min} to ${max}; gaps omit invalid or unevaluated assumptions and undefined arithmetic.` : "Fixed-value comparison; no parameter to vary."}\n`;
    download(`${filename}.md`, report, "text/markdown;charset=utf-8");
  };
  return (
    <section className="math-exploration" aria-label="Interactive mathematical exploration">
      <div className="exploration-heading">
        <h3>
          {scene.kind === "inverse-square"
            ? "Can any target be exceeded?"
            : scene.scaling
              ? "Scaling a square-root expression"
              : scene.equivalentTo
                ? "Two views of the same condition"
                : "Explore the relationship"}
        </h3>
        <span className="illustration-label">Numerical illustration</span>
      </div>
      <p className="exploration-narrative">{narrative}</p>
      <p className="exploration-formula">{formula}</p>
      <div className="exploration-controls">
        {scene.controls.map((c) => (
          <label key={c.id}>
            {c.symbol}
            <input
              type="number"
              aria-label={`Value of ${c.symbol}`}
              step="any"
              value={Number.isFinite(values[c.id]) ? values[c.id] : ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [c.id]: e.target.value === "" ? NaN : Number(e.target.value),
                }))
              }
            />
          </label>
        ))}
      </div>
      {scene.kind === "inverse-square" ? (
        <label className="fraction-control">
          Sample input as a fraction of δ: {formatNumber(fraction)}
          <input
            aria-label="Sample fraction of delta"
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={fraction}
            onChange={(e) => setFraction(Number(e.target.value))}
          />
        </label>
      ) : null}
      <div
        className={`exploration-result ${snapshot.assumptionStatus !== "yes" || snapshot.error ? "exploration-result--outside" : ""}`}
        aria-live="polite"
      >
        <strong>
          {snapshot.assumptionStatus === "no"
            ? "Outside the stated assumptions"
            : snapshot.assumptionStatus === "unknown"
              ? "Some assumptions could not be evaluated"
              : snapshot.assumptions.length === 0
                ? "No assumptions were listed"
                : "Stated assumptions hold at these values"}
        </strong>
        {snapshot.error ? (
          <p>{snapshot.error}</p>
        ) : (
          <>
            {scene.kind === "inverse-square" ? (
              <p>
                Choose δ = {formatNumber(snapshot.delta!)}. At {axisSymbol} ={" "}
                {formatNumber(snapshot.inputValue!)}, the expression is{" "}
                {formatNumber(snapshot.left!)} and the target is {formatNumber(snapshot.right!)}.
              </p>
            ) : (
              <p>
                Left side: <b>{formatNumber(snapshot.left!)}</b> · Right side:{" "}
                <b>{formatNumber(snapshot.right!)}</b>
              </p>
            )}
            <p>
              The displayed relationship {truth(snapshot.result)}.
              {scene.kind === "relation" && scene.equivalentTo
                ? ` The other condition ${truth(snapshot.equivalentResult)}; ${snapshot.result === snapshot.equivalentResult ? "the two conditions agree" : "the two conditions disagree"}.`
                : ""}
            </p>
          </>
        )}
        {snapshot.assumptionStatus !== "yes" ? (
          <p>This example cannot be used to assess the statement under its assumptions.</p>
        ) : null}
      </div>
      {scene.kind === "relation" && scene.controls.length > 1 ? (
        <label className="axis-picker">
          Vary along the horizontal axis{" "}
          <select
            aria-label="Horizontal axis"
            value={axis}
            onChange={(e) => {
              setAxis(e.target.value);
              setRange(null);
            }}
          >
            {scene.controls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {hasAxis ? (
        <>
          <div className="plot-range">
            <label>
              Plot from{" "}
              <input
                aria-label="Plot minimum"
                type="number"
                step="any"
                value={Number.isFinite(min) ? min : ""}
                onChange={(e) =>
                  setRange({ min: e.target.value === "" ? NaN : Number(e.target.value), max })
                }
              />
            </label>
            <label>
              to{" "}
              <input
                aria-label="Plot maximum"
                type="number"
                step="any"
                value={Number.isFinite(max) ? max : ""}
                onChange={(e) =>
                  setRange({ min, max: e.target.value === "" ? NaN : Number(e.target.value) })
                }
              />
            </label>
          </div>
          <CurvePlot
            points={points}
            axis={axisSymbol}
            formula={formula}
            graphRef={graphRef}
            marker={
              snapshot.assumptionStatus === "yes" && !snapshot.error
                ? {
                    x: scene.kind === "inverse-square" ? snapshot.inputValue! : center,
                    left: snapshot.left!,
                    right: snapshot.right!,
                  }
                : undefined
            }
            delta={snapshot.assumptionStatus === "yes" ? snapshot.delta : undefined}
            description={`${name}. ${sourceStatus}. Numerical illustration only. Other parameters: ${scene.controls.map((c) => `${c.symbol}=${values[c.id]}`).join(", ")}. Assumptions: ${scene.assumptions.map(renderProposition).join("; ")}.`}
          />
        </>
      ) : (
        <p className="input-help">
          This statement compares fixed values, so there is no parameter to vary.
        </p>
      )}
      <p className="input-help">
        Blue: {scene.kind === "inverse-square" ? "expression" : "left side"}. Amber dashed:{" "}
        {scene.kind === "inverse-square" ? "target M" : "right side"}. Circles mark the current
        example. Gaps omit points outside the assumptions, unevaluated assumptions, or undefined
        arithmetic. Sampling does not prove a statement; equality uses floating-point precision.
      </p>
      {scene.kind === "inverse-square" ? (
        <p className="input-help">
          The expression has the form K / {scene.input.symbol}². For K &gt; 0, the rule uses δ = √(K
          / max(1, M)). It shows one example below δ; the plot itself does not establish the
          universal claim.
        </p>
      ) : null}
      <details>
        <summary>Why this picture</summary>
        <p className="input-help">
          {scene.rule.description} Values are chosen for illustration. Physical meanings require
          author annotations.
        </p>
        <p className="input-help">
          <code>{scene.rule.id}</code> · {sourceStatus}.
        </p>
      </details>
      <details>
        <summary>Check the assumptions</summary>
        <ul className="assumption-results">
          {snapshot.assumptions.length ? (
            snapshot.assumptions.map((a, i) => (
              <li key={i}>
                <span>{a.statement}</span>
                <b>
                  {a.result === "yes" ? "holds" : a.result === "no" ? "outside" : "not evaluated"}
                </b>
              </li>
            ))
          ) : (
            <li>No assumptions were listed.</li>
          )}
        </ul>
      </details>
      <div className="input-toolbar">
        <button type="button" onClick={saveExplanation}>
          Save explanation
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={!points.some(Boolean)}
          onClick={() => {
            if (graphRef.current)
              download(
                `${filename}.svg`,
                graphRef.current.outerHTML,
                "image/svg+xml;charset=utf-8",
              );
          }}
        >
          Save chart
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            setValues(Object.fromEntries(scene.controls.map((c) => [c.id, c.initial])));
            setRange(null);
            setFraction(0.5);
          }}
        >
          Reset values
        </button>
      </div>
    </section>
  );
}

function CurvePlot({
  points,
  axis,
  formula,
  description,
  graphRef,
  marker,
  delta,
}: {
  points: Array<ExplorationPoint | null>;
  axis: string;
  formula: string;
  description: string;
  graphRef: React.RefObject<SVGSVGElement>;
  marker?: ExplorationPoint;
  delta?: number;
}): JSX.Element {
  const valid = points.filter((p): p is ExplorationPoint => p !== null);
  if (valid.length < 2)
    return (
      <p className="plot-empty" role="status">
        No curve can be drawn in this interval. Adjust the values or plot range so that the
        assumptions and arithmetic are defined.
      </p>
    );
  const xMin = Math.min(...valid.map((p) => p.x)),
    xMax = Math.max(...valid.map((p) => p.x));
  const yLow = Math.min(...valid.flatMap((p) => [p.left, p.right])),
    yHigh = Math.max(...valid.flatMap((p) => [p.left, p.right]));
  const pad = Math.max((yHigh - yLow) * 0.1, Math.abs(yHigh) * 0.05, 0.1),
    yMin = yLow - pad,
    yMax = yHigh + pad;
  if (![xMin, xMax, yMin, yMax, yMax - yMin].every(Number.isFinite))
    return <p className="plot-empty">Values exceed the chart’s numerical range.</p>;
  const x = (v: number) => 76 + ((v - xMin) / (xMax - xMin)) * 500;
  const y = (v: number) => 260 - ((v - yMin) / (yMax - yMin)) * 220;
  const path = (side: "left" | "right") => {
    let fresh = true;
    return points
      .map((p) => {
        if (!p) {
          fresh = true;
          return "";
        }
        const segment = `${fresh ? "M" : "L"}${x(p.x).toFixed(2)},${y(p[side]).toFixed(2)}`;
        fresh = false;
        return segment;
      })
      .join(" ");
  };
  return (
    <svg
      ref={graphRef}
      className="exploration-chart"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 620 320"
      role="img"
      aria-label={`Numerical plot: ${formula}`}
    >
      <title>{formula}</title>
      <desc>
        {description} Horizontal axis: {axis}; blue is the left expression; amber dashed is the
        right expression or target. Gaps exclude invalid or unevaluated assumptions. Floating-point
        samples are not a proof.
      </desc>
      <rect width="620" height="320" fill="#101925" rx="10" />
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1="76" x2="576" y1={40 + t * 220} y2={40 + t * 220} stroke="#334155" />
          <text x="66" y={44 + t * 220} textAnchor="end" fill="#cbd5e1" fontSize="11">
            {formatNumber(yMax - t * (yMax - yMin))}
          </text>
          <text x={76 + t * 500} y="282" textAnchor="middle" fill="#cbd5e1" fontSize="11">
            {formatNumber(xMin + t * (xMax - xMin))}
          </text>
        </g>
      ))}
      <path d={path("left")} stroke="#60a5fa" strokeWidth="3" fill="none" />
      <path d={path("right")} stroke="#fbbf24" strokeWidth="2" strokeDasharray="7 5" fill="none" />
      {delta !== undefined && delta >= xMin && delta <= xMax ? (
        <g>
          <line
            x1={x(delta)}
            x2={x(delta)}
            y1="40"
            y2="260"
            stroke="#94a3b8"
            strokeDasharray="3 4"
          />
          <text x={x(delta)} y="25" textAnchor="middle" fill="#e2e8f0" fontSize="12">
            δ = {formatNumber(delta)}
          </text>
        </g>
      ) : null}
      {marker && marker.x >= xMin && marker.x <= xMax ? (
        <g>
          {(["left", "right"] as const).map((side) =>
            Number.isFinite(marker[side]) && marker[side] >= yMin && marker[side] <= yMax ? (
              <circle
                key={side}
                cx={x(marker.x)}
                cy={y(marker[side])}
                r="5"
                fill={side === "left" ? "#60a5fa" : "#fbbf24"}
                stroke="#f8fafc"
                strokeWidth="1.5"
              >
                <title>{`Current example: ${axis} = ${formatNumber(marker.x)}, ${side} = ${formatNumber(marker[side])}`}</title>
              </circle>
            ) : null,
          )}
        </g>
      ) : null}
      <text x="320" y="307" textAnchor="middle" fill="#e2e8f0" fontSize="13">
        {axis} · numerical illustration
      </text>
    </svg>
  );
}
