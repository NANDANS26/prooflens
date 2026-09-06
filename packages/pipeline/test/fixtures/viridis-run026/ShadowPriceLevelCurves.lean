import Mathlib

open Real

/-! # Shadow Price Level Set Theorems

The shadow price function is p(σ) = C / σ² where C > 0 and σ > 0.
These theorems establish the quantitative budget-performance tradeoff.
-/

/-
Level curve characterization: C / σ² = M iff σ = √(C/M)
-/
theorem shadow_price_level_curve (C M sigma : ℝ)
    (hC : 0 < C) (hM : 0 < M) (hsigma : 0 < sigma) :
    C / sigma ^ 2 = M ↔ sigma = Real.sqrt (C / M) := by
  constructor <;> intro h <;> rw [ eq_comm, Real.sqrt_eq_iff_mul_self_eq ] at * <;> try positivity;
  · grind;
  · rw [ eq_div_iff ] at * <;> nlinarith [ mul_div_cancel₀ C hM.ne' ]

/-
Level set inequality: M ≤ C / σ² iff σ ≤ √(C/M)
-/
theorem shadow_price_level_set_ineq (C M sigma : ℝ)
    (hC : 0 < C) (hM : 0 < M) (hsigma : 0 < sigma) :
    M ≤ C / sigma ^ 2 ↔ sigma ≤ Real.sqrt (C / M) := by
  rw [ Real.le_sqrt ] <;> try positivity;
  rw [ le_div_iff₀, le_div_iff₀ ] <;> first | positivity | ring;

/-
Budget-performance tradeoff: higher shadow price requires smaller sigma
-/
theorem shadow_price_budget_tradeoff (C M1 M2 : ℝ)
    (hC : 0 < C) (hM1 : 0 < M1) (hM1M2 : M1 < M2) :
    Real.sqrt (C / M2) < Real.sqrt (C / M1) := by
  gcongr;
  exact div_nonneg hC.le ( by linarith )

/-
Quadratic scaling: √(C/M)² = C/M
-/
theorem shadow_price_quadratic_scaling (C M : ℝ)
    (hC : 0 < C) (hM : 0 < M) :
    Real.sqrt (C / M) ^ 2 = C / M := by
  exact Real.sq_sqrt <| by positivity;

/-
Budget-to-target doubling law: √(C/(4M)) = √(C/M) / 2
-/
theorem shadow_price_doubling_law (C M : ℝ)
    (_hC : 0 < C) (_hM : 0 < M) :
    Real.sqrt (C / (4 * M)) = Real.sqrt (C / M) / 2 := by
  rw [show C / (4 * M) = (C / M) / 4 by ring, Real.sqrt_div'] <;> norm_num