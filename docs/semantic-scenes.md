# Semantic scenes

Semantic scenes are ProofLens's first numeric answer to the question “what does this theorem
represent?” They sit beside VisualIR rather than replacing it: VisualIR continues to show proof
structure, while a semantic scene turns a supported theorem into a parameterised mathematical
model a reader can explore.

## The contract

`compileSemanticScene(theorem, classifications)` currently accepts a natural upper or lower bound
only when all of the following are true:

1. the deterministic classifier identifies which reading of the inequality is natural;
2. every operation in the bound belongs to the supported numeric subset;
3. every free parameter has an author-declared `meaning` and `domain`; and
4. every declared domain maps to a safe slider range.

If any gate fails, the compiler returns a stable block code and a human-readable reason. It never
guesses a physical meaning, silently substitutes a value, or draws an undefined expression.

The first numeric subset contains real literals and variables; addition, subtraction,
multiplication, division, powers, negation, reciprocal and absolute value; and `Real.log`,
`Real.exp` and `Real.sqrt`. Undefined evaluations are rejected.

## Epistemic boundary

Every scene keeps four claims separate:

| Part                                 | Standing                      | Why                                                    |
| ------------------------------------ | ----------------------------- | ------------------------------------------------------ |
| Inequality                           | inherited from the classifier | It traces to the kernel-accepted conclusion.           |
| Symbol meanings and domains          | `interpreted`                 | They come from `@prooflens.var` annotations.           |
| Numeric evaluation                   | deterministic                 | The supported MathIR expression is evaluated directly. |
| Defaults, ranges and target scenario | `illustrative`                | They are display choices, not theorem claims.          |

The whole scene is therefore `illustrative`, and the interface states the boundary directly:
For a verified input, Lean verifies the inequality under its assumptions, not the supplied physical
meanings or displayed parameter values. For an incomplete proof, the scene illustrates the
assertion and says explicitly that the picture does not prove it.

## First golden theorem

`ProofLens.Examples.information_rate_bound` is the first end-to-end fixture. Its verified statement

```text
N / t ≤ P · D / (kB · T · log(2))
```

becomes a live ceiling over author-named power, temperature, Boltzmann constant and efficiency
parameters. The author-selected `axis="x"` puts power on the horizontal axis. The scene derives
which parameters raise or lower the ceiling from the same conservative sensitivity analysis used
by the existing explanations.

The web interface leads with an **Equation Anatomy** view. Every term in the verified quotient is
persistently underlined with its author-declared meaning and units. Selecting a term synchronises
four views of the same idea:

1. its position in the equation;
2. its structural job (rate quantity, time normaliser, ceiling amplifier, ceiling limiter, or fixed
   cost);
3. the proof-story step in which that job matters; and
4. the direction it moves the numeric ceiling.

The four-step **relationship explanation** explains the rate, useful-supply numerator, thermodynamic-cost
denominator, and final comparison. Its labels preserve the epistemic boundary: physical
names are interpreted from author annotations, numerator/denominator effects are derived, and the
final inequality inherits the input statement status. An incomplete proof remains unproved.

The supporting graph then provides sliders, an exact target input, a readout of whether the
target satisfies the displayed bound, a shaded permitted region, a numeric curve, a current
operating point, and a synchronized plain-language description of the selected term.

## Next shapes

The compiler is deliberately narrow. The next additions should be separate, tested scene kinds:

- inverse-square and other divergence cliffs;
- threshold and phase-transition scenes;
- equality and conservation-flow scenes;
- two-parameter tradeoff surfaces; and
- unit checking and user-supplied physical parameter presets.

Each new kind needs a golden theorem, a named compiler rule, explicit failure cases, and browser
verification at desktop and phone widths.


## Mathematical experiments without physical annotations

The browser also offers `MathExploration` scenes. These operate on numerical real expressions
without requiring author-supplied meanings. Supported relations and equivalences show both
expressions, parameter controls, hypothesis checks and downloadable plots. Square-root scaling
and inverse-square divergence gain focused descriptions from their expression structure.
These scenes remain illustrative and do not reinterpret a variable as a physical quantity.

For inverse-square divergence, the supported source filter is `nhdsWithin 0 (Set.Ioi 0)` with
an `atTop` target, or the corresponding quantified target/delta form. For a positive coefficient
K, the displayed witness rule uses `delta = sqrt(K / max(1, M))` and samples a positive input
strictly below delta. A finite curve is evidence about displayed arithmetic only.

Input origins and compiler rules survive in the pipeline bundle. Unsupported syntax, functions,
types, quantified shapes and filters preserve their structural explanation and state the gap.
