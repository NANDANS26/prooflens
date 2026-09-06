import type { FormalDeclaration, FormalExprNode } from "@prooflens/formal-ir";
import {
  lowerProposition,
  renderExpression,
  renderProposition,
  variablesIn,
  type MathExpression,
  type MathProposition,
  type TheoremIR,
} from "@prooflens/math-ir";
import { evaluateMathExpression } from "./semantic.js";

type Relation = Extract<MathProposition, { kind: "relation" }>;
export interface ExplorationControl {
  id: string;
  symbol: string;
  initial: number;
}
interface Base {
  rule: { id: string; description: string };
  statement: string;
  assumptions: MathProposition[];
  controls: ExplorationControl[];
  /** A reading of an expression, never a proof or a physical interpretation. */
  epistemic: "illustrative";
}
export type MathExploration =
  | { status: "blocked"; reason: string }
  | (Base & {
      status: "ready";
      kind: "relation";
      relation: Relation;
      equivalentTo?: Relation;
      scaling?: { factor: number; divisor: number; variable: string };
    })
  | (Base & {
      status: "ready";
      kind: "inverse-square";
      expression: MathExpression;
      input: { id: string; symbol: string };
      targetId: string;
      quantified: boolean;
    });
export type ReadyExploration = Exclude<MathExploration, { status: "blocked" }>;
export type NumericTruth = "yes" | "no" | "unknown";

function numeric(expr: MathExpression): boolean {
  if (expr.kind === "number") return Number.isFinite(expr.value);
  if (expr.kind === "variable") return true;
  if (expr.kind === "operator")
    return (
      ["add", "sub", "mul", "div", "pow", "neg", "inv", "abs"].includes(expr.op) &&
      expr.args.every(numeric)
    );
  return (
    expr.kind === "application" &&
    ["Real.sqrt", "Real.exp", "Real.log"].includes(expr.head) &&
    expr.args.length === 1 &&
    expr.args.every(numeric)
  );
}
function numericRelation(
  prop: MathProposition,
): prop is Relation & { relation: Exclude<Relation["relation"], "equivalent"> } {
  return (
    prop.kind === "relation" &&
    prop.relation !== "equivalent" &&
    numeric(prop.lhs) &&
    numeric(prop.rhs)
  );
}

/** Floating point agreement is deliberately distinct from formal equality. */
export function evaluateProposition(
  prop: MathProposition,
  values: Readonly<Record<string, number>>,
): NumericTruth {
  if (prop.kind === "conjunction") {
    const results = prop.conjuncts.map((p) => evaluateProposition(p, values));
    return results.includes("no") ? "no" : results.includes("unknown") ? "unknown" : "yes";
  }
  if (prop.kind === "implication") {
    const a = evaluateProposition(prop.antecedent, values),
      b = evaluateProposition(prop.consequent, values);
    return a === "no" || b === "yes" ? "yes" : a === "yes" && b === "no" ? "no" : "unknown";
  }
  if (!numericRelation(prop)) return "unknown";
  try {
    const a = evaluateMathExpression(prop.lhs, values),
      b = evaluateMathExpression(prop.rhs, values);
    const close = Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
    const result =
      prop.relation === "equal"
        ? close
        : prop.relation === "not-equal"
          ? !close
          : prop.relation === "less-than"
            ? a < b
            : prop.relation === "less-than-or-equal"
              ? a <= b
              : prop.relation === "greater-than"
                ? a > b
                : a >= b;
    return result ? "yes" : "no";
  } catch {
    return "unknown";
  }
}

function initialControls(theorem: TheoremIR): ExplorationControl[] {
  const values: Record<string, number> = Object.fromEntries(
    theorem.variables.map((v) => [v.id, 1]),
  );
  // Seed useful examples from simple hypotheses. Every hypothesis is checked again at display time.
  for (let pass = 0; pass < 4; pass++)
    for (const h of theorem.hypotheses) {
      const p = h.proposition;
      if (!numericRelation(p) || evaluateProposition(p, values) === "yes") continue;
      try {
        if (p.lhs.kind === "variable") {
          const b = evaluateMathExpression(p.rhs, values),
            step = Math.max(0.5, Math.abs(b) / 2);
          values[p.lhs.id] = p.relation.startsWith("less")
            ? b - step
            : p.relation === "equal"
              ? b
              : b + step;
        } else if (p.rhs.kind === "variable") {
          const a = evaluateMathExpression(p.lhs, values),
            step = Math.max(0.5, Math.abs(a) / 2);
          values[p.rhs.id] = p.relation.startsWith("greater")
            ? a - step
            : p.relation === "equal"
              ? a
              : a + step;
        }
      } catch {
        /* A nonnumeric hypothesis remains visible as unevaluated. */
      }
    }
  return theorem.variables.map((v) => ({ id: v.id, symbol: v.symbol, initial: values[v.id]! }));
}

function variableNamed(
  expr: MathExpression,
  symbol: string,
): Extract<MathExpression, { kind: "variable" }> | undefined {
  if (expr.kind === "variable" && expr.symbol === symbol) return expr;
  const children =
    expr.kind === "operator" || expr.kind === "application"
      ? expr.args
      : expr.kind === "lambda"
        ? [expr.body]
        : [];
  for (const child of children) {
    const found = variableNamed(child, symbol);
    if (found) return found;
  }
  return undefined;
}
/** Recognize a multiplicative power of x, rejecting sums or unknown functions of x. */
function powerIn(expr: MathExpression, id: string): number | undefined {
  if (!variablesIn(expr).has(id)) return numeric(expr) ? 0 : undefined;
  if (expr.kind === "variable") return 1;
  if (expr.kind !== "operator") return undefined;
  const a = expr.args[0],
    b = expr.args[1];
  if (!a) return undefined;
  const pa = powerIn(a, id);
  if (pa === undefined) return undefined;
  if (expr.op === "neg") return pa;
  if (expr.op === "inv") return -pa;
  if (expr.op === "pow" && b?.kind === "number") return pa * b.value;
  if (b && ["mul", "div"].includes(expr.op)) {
    const pb = powerIn(b, id);
    if (pb !== undefined) return expr.op === "mul" ? pa + pb : pa - pb;
  }
  return undefined;
}
function less(prop: MathProposition): { left: MathExpression; right: MathExpression } | undefined {
  if (prop.kind !== "relation") return undefined;
  if (prop.relation === "less-than") return { left: prop.lhs, right: prop.rhs };
  if (prop.relation === "greater-than") return { left: prop.rhs, right: prop.lhs };
  return undefined;
}
const zero = (expr: MathExpression) => expr.kind === "number" && expr.value === 0;
function divergence(prop: MathProposition):
  | {
      expression: MathExpression;
      input: { id: string; symbol: string };
      targetId: string;
      quantified: boolean;
    }
  | undefined {
  if (
    prop.kind === "limit" &&
    prop.target.kind === "at-top" &&
    prop.source.side === "above" &&
    prop.source.point &&
    zero(prop.source.point) &&
    prop.subject.kind === "lambda"
  ) {
    const input = variableNamed(prop.subject.body, prop.subject.parameter);
    if (input && powerIn(prop.subject.body, input.id) === -2)
      return {
        expression: prop.subject.body,
        input,
        targetId: "exploration:target",
        quantified: false,
      };
  }
  if (
    prop.kind !== "existential" ||
    prop.body.kind !== "conjunction" ||
    prop.body.conjuncts.length !== 2
  )
    return undefined;
  const [positive, universal] = prop.body.conjuncts;
  const delta = positive && less(positive);
  if (
    !delta ||
    !zero(delta.left) ||
    delta.right.kind !== "variable" ||
    delta.right.symbol !== prop.binder ||
    universal?.kind !== "universal"
  )
    return undefined;
  const first = universal.body;
  if (first.kind !== "implication" || first.consequent.kind !== "implication") return undefined;
  const second = first.consequent,
    lower = less(first.antecedent),
    upper = less(second.antecedent),
    bound = less(second.consequent);
  if (
    !lower ||
    !upper ||
    !bound ||
    !zero(lower.left) ||
    lower.right.kind !== "variable" ||
    lower.right.symbol !== universal.binder ||
    upper.left.kind !== "variable" ||
    upper.left.id !== lower.right.id ||
    upper.right.kind !== "variable" ||
    upper.right.id !== delta.right.id ||
    bound.left.kind !== "variable"
  )
    return undefined;
  const ids = variablesIn(bound.right);
  if (
    ids.has(delta.right.id) ||
    ids.has(bound.left.id) ||
    powerIn(bound.right, lower.right.id) !== -2
  )
    return undefined;
  return { expression: bound.right, input: lower.right, targetId: bound.left.id, quantified: true };
}

function scaling(
  relation: Relation,
): { factor: number; divisor: number; variable: string } | undefined {
  if (relation.relation !== "equal") return undefined;
  const left = relation.lhs,
    right = relation.rhs;
  if (
    left.kind !== "application" ||
    left.head !== "Real.sqrt" ||
    right.kind !== "operator" ||
    right.op !== "div"
  )
    return undefined;
  const [base, divisor] = right.args,
    inner = left.args[0];
  if (
    base?.kind !== "application" ||
    base.head !== "Real.sqrt" ||
    divisor?.kind !== "number" ||
    divisor.value <= 0 ||
    inner?.kind !== "operator" ||
    inner.op !== "div"
  )
    return undefined;
  const plain = base.args[0],
    product = inner.args[1];
  if (
    plain?.kind !== "operator" ||
    plain.op !== "div" ||
    product?.kind !== "operator" ||
    product.op !== "mul"
  )
    return undefined;
  const factor = product.args.find((a) => a.kind === "number"),
    variable = product.args.find((a) => a.kind === "variable");
  if (
    factor?.kind !== "number" ||
    variable?.kind !== "variable" ||
    factor.value !== divisor.value ** 2 ||
    plain.args[1]?.kind !== "variable" ||
    plain.args[1].id !== variable.id ||
    renderExpression(plain.args[0]!) !== renderExpression(inner.args[0]!)
  )
    return undefined;
  return { factor: factor.value, divisor: divisor.value, variable: variable.symbol };
}

/** Scenes are selected from expression structure, never theorem names or invented physical units. */
function realQuantifiedInputs(node: FormalExprNode): boolean {
  if (node.kind === "lam" || node.kind === "forall") {
    if (
      node.kind === "lam" &&
      (node.binderType.kind !== "const" || node.binderType.name !== "Real")
    )
      return false;
    if (node.binderType.kind === "const" && node.binderType.name !== "Real") return false;
    return realQuantifiedInputs(node.body);
  }
  return node.kind !== "app" || node.args.every(realQuantifiedInputs);
}

export function compileMathExploration(
  theorem: TheoremIR,
  formal: FormalDeclaration,
): MathExploration {
  const blocked = (reason: string): MathExploration => ({ status: "blocked", reason });
  if (theorem.variables.some((v) => !["ℝ", "Real"].includes(v.typeDisplay)))
    return blocked(
      "Continuous numerical exploration currently requires explicit real-valued variables.",
    );
  const base: Base = {
    rule: {
      id: "EXPLORATION_REAL_RELATION_001",
      description:
        "Evaluate the two numeric expressions in the stated real relation, checking hypotheses at each sampled point.",
    },
    epistemic: "illustrative",
    statement: theorem.conclusionDisplay,
    assumptions: theorem.hypotheses.map((h) => h.proposition),
    controls: initialControls(theorem),
  };
  const prop = theorem.conclusion.value;
  if (numericRelation(prop))
    return { ...base, status: "ready", kind: "relation", relation: prop, scaling: scaling(prop) };
  const raw = formal.conclusion.tree;
  if (
    prop.kind === "relation" &&
    prop.relation === "equivalent" &&
    raw.kind === "app" &&
    raw.fn.kind === "const" &&
    raw.fn.name === "Iff"
  ) {
    const a = raw.args.at(-2),
      b = raw.args.at(-1);
    if (a && b) {
      const left = lowerProposition(a, "conclusion.left"),
        right = lowerProposition(b, "conclusion.right");
      if (numericRelation(left) && numericRelation(right))
        return { ...base, status: "ready", kind: "relation", relation: right, equivalentTo: left };
    }
  }
  const divergent = realQuantifiedInputs(formal.conclusion.tree) ? divergence(prop) : undefined;
  if (divergent) {
    if (!base.controls.some((c) => c.id === divergent.targetId))
      base.controls.push({ id: divergent.targetId, symbol: "M (target)", initial: 4 });
    return {
      ...base,
      rule: {
        id: "EXPLORATION_INVERSE_SQUARE_001",
        description:
          "Recognize a positive-sided inverse-square limit or a quantified target-and-delta statement; display numeric examples using delta = sqrt(K / max(1, M)) for K > 0.",
      },
      status: "ready",
      kind: "inverse-square",
      ...divergent,
    };
  }
  return blocked(
    "No numerical exploration is available for this expression shape. Its structural explanation remains below.",
  );
}

export interface ExplorationSnapshot {
  assumptions: Array<{ statement: string; result: NumericTruth }>;
  assumptionStatus: NumericTruth;
  values: Record<string, number>;
  left?: number;
  right?: number;
  result?: NumericTruth;
  equivalentResult?: NumericTruth;
  delta?: number;
  inputValue?: number;
  error?: string;
}
export function evaluateExploration(
  scene: ReadyExploration,
  values: Record<string, number>,
  fraction = 0.5,
): ExplorationSnapshot {
  const assumptions = scene.assumptions.map((p) => ({
    statement: renderProposition(p),
    result: evaluateProposition(p, values),
  }));
  const assumptionStatus = assumptions.some((a) => a.result === "no")
    ? "no"
    : assumptions.some((a) => a.result === "unknown")
      ? "unknown"
      : "yes";
  const snapshot: ExplorationSnapshot = { assumptions, assumptionStatus, values: { ...values } };
  try {
    if (scene.kind === "relation") {
      return {
        ...snapshot,
        left: evaluateMathExpression(scene.relation.lhs, values),
        right: evaluateMathExpression(scene.relation.rhs, values),
        result: evaluateProposition(scene.relation, values),
        ...(scene.equivalentTo
          ? { equivalentResult: evaluateProposition(scene.equivalentTo, values) }
          : {}),
      };
    }
    const coefficient = evaluateMathExpression(scene.expression, {
        ...values,
        [scene.input.id]: 1,
      }),
      target = values[scene.targetId]!;
    if (!(coefficient > 0) || !Number.isFinite(target))
      throw new Error(
        "Choose values with a positive inverse-square coefficient and a finite target.",
      );
    if (!(fraction > 0 && fraction < 1))
      throw new Error("The sample fraction must lie strictly between zero and one.");
    const delta = Math.sqrt(coefficient / Math.max(1, target)),
      inputValue = delta * fraction;
    if (!(inputValue > 0) || !Number.isFinite(delta))
      throw new Error("These values exceed the numerical range of this illustration.");
    const left = evaluateMathExpression(scene.expression, {
      ...values,
      [scene.input.id]: inputValue,
    });
    return {
      ...snapshot,
      delta,
      inputValue,
      left,
      right: target,
      result: left > target ? "yes" : "no",
    };
  } catch (error) {
    return { ...snapshot, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface ExplorationPoint {
  x: number;
  left: number;
  right: number;
}
/** Nulls split the plot at invalid/unevaluated assumptions or arithmetic domains. */
export function sampleExploration(
  scene: ReadyExploration,
  values: Record<string, number>,
  axisId: string,
  min: number,
  max: number,
): Array<ExplorationPoint | null> {
  if (![min, max].every(Number.isFinite) || max <= min) return [];
  return Array.from({ length: 101 }, (_, i) => {
    const x = min + ((max - min) * i) / 100,
      at = { ...values, [axisId]: x };
    if (scene.kind === "inverse-square" && !(x > 0)) return null;
    if (!scene.assumptions.every((p) => evaluateProposition(p, at) === "yes")) return null;
    try {
      const left = evaluateMathExpression(
        scene.kind === "relation" ? scene.relation.lhs : scene.expression,
        at,
      );
      const right =
        scene.kind === "relation"
          ? evaluateMathExpression(scene.relation.rhs, at)
          : values[scene.targetId]!;
      return Number.isFinite(right) ? { x, left, right } : null;
    } catch {
      return null;
    }
  });
}
