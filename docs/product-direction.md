# Product direction

ProofLens turns Lean code into visual descriptions of what the mathematics is showing,
helping people understand conjectures and theorems.

The reader's question is: **What does this statement mean, and can I see it?**
Success means someone can explain the mathematical claim after exploring its visual
description and connect that explanation back to the Lean statement.

## The primary experience

1. Bring a Lean declaration from a project and choose the statement to understand.
2. See its mathematical objects, assumptions, and relationships in an appropriate visual form.
3. Connect symbols to a plain-language description and the corresponding parts of the figure.
4. Explore examples and parameter changes where the supported mathematics permits them.
5. Return to the original expression and inspect proof status or provenance when needed.

The visual explanation leads. Proof inspection, assumption-usage analysis, extraction internals,
paper certificates, and specialized adapters support this experience or occupy secondary views.
They are not prerequisites for understanding an example.

## Conjectures are first-class statements

A conjecture can be worth understanding before a proof exists. A Lean declaration with a
`sorry`-dependent proof may still have a supported mathematical shape and a useful picture.
Show it as an **unproved statement**, explain what it asserts, and preserve its weaker status
through every description and scene. Never describe its conclusion as kernel-verified.

Examples illustrate a claim. They do not prove a quantified statement. A schematic curve must
not masquerade as the actual function, and satisfying one displayed inequality does not establish
every hypothesis or physical feasibility. Author-supplied meanings remain interpretations.
Unsupported mathematics gets an explicit explanation gap and the original statement.

## What exists and what remains

| Experience | Current implementation | Remaining scope |
| --- | --- | --- |
| Own Lean statement | Browser paste and file input, with explicit source-preview status; editor command and CLI extraction for configured projects | Browser compilation of arbitrary Lean projects |
| Extracted declarations | Validated JSON imports up to 250 declarations / 8 MB; imported metadata cannot establish verification | Independently authenticated extraction attestations |
| Arithmetic relationships | Editable real-valued controls, two-sided numerical plots, visible assumption checks, strict comparisons, equality and equivalence | Additional domains and functions |
| Inverse-square divergence | Actual expression curves, positive one-sided limit language, arbitrary-target examples with an explicit delta rule | General epsilon/delta and other divergence shapes |
| Scaling | Structural square-root scaling recognition, including a fourfold input giving a halved result | Further families of scaling laws |
| Conjectures | Source previews and incomplete extracted proofs remain explorable without acquiring verified claims | Reader trials across more subject areas |
| Reusable output | Download the current explanation as Markdown and its chart as SVG, including source status, values and assumptions | Shared persistent workspaces |

The source reader supports a deliberately limited mathematical subset. It does not execute
proof bodies, elaborate custom syntax, resolve arbitrary project definitions, or certify Lean
code. Unsupported declarations are named and reported; valid declarations remain accessible.
Numerical plots use ordinary arithmetic domains and floating-point precision. Invalid or
unevaluated assumptions create gaps, and no finite sampling establishes a universal claim.

A local Viridis Run 026 trial exercises 19 declarations from four original Lean modules.
This is a product fixture, not fresh research certification or evidence of outside-user adoption.

## How to choose work

Prioritize changes that help a reader identify the objects, explain the asserted relationship,
understand the assumptions, predict the effect of a changed input, and connect the picture to
the corresponding Lean expression.

Start with bounds, limits, and monotonicity. Complete a useful visual treatment of a supported
form before widening the classifier solely to improve a percentage. Keep certificate expansion
and adapter work on separate tracks unless they unblock this experience.

## Evidence of success

For each trial, record the user's own statement, the question they wanted answered, the visual
explanation produced, and what they could explain or predict afterward. Ask the reader to
identify the assumptions and distinguish the example from the general claim. Capture confusing
or unsupported cases as reproducible inputs.

The first adoption milestone is an outside user understanding their own statement with
ProofLens and reporting the specific help it provided. A voluntary second use is evidence
of continuing value. Rendering counts, structural coverage, clones, and visits measure other
things; they do not establish comprehension.

## Acceptance criteria for a new visual form

- A real Lean example and its exact extracted statement are available.
- The picture shows the asserted mathematical relationship with a readable explanation.
- Correspondence to expressions and assumptions is inspectable.
- Numeric controls state their domains and reject unsupported evaluations.
- An incomplete-proof fixture remains explorable without acquiring verified claims.
- Unsupported variants remain visible and disclose the explanation gap.
- Existing extraction, explanation, and rendering checks continue to pass.

See [the roadmap](roadmap.md) for priorities and [the epistemic model](epistemic-model.md)
for the provenance contract.
