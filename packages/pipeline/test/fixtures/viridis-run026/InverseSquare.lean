import Mathlib

open Filter Topology Set

/-
Strict monotone decrease: 1/x² is strictly decreasing on (0, ∞)
-/
theorem inv_sq_strict_mono_decreasing :
    ∀ x y : ℝ, 0 < x → x < y → 1/y^2 < 1/x^2 := by
  exact fun x y hx hy => by gcongr;

/-
Positivity: 1/x² is positive for x > 0
-/
theorem inv_sq_pos :
    ∀ x : ℝ, 0 < x → (0 : ℝ) < 1/x^2 := by
  exact fun x hx => by positivity;

/-
Inverse square law: (1/x²) * x² = 1 for x ≠ 0
-/
theorem inv_sq_mul_sq :
    ∀ x : ℝ, x ≠ 0 → (1/x^2) * x^2 = 1 := by
  aesop

/-
Divergence at zero: 1/x² → ∞ as x → 0⁺
-/
theorem inv_sq_tendsto_atTop :
    Filter.Tendsto (fun x : ℝ => 1/x^2) (nhdsWithin 0 (Set.Ioi 0)) Filter.atTop := by
  norm_num [ sq ];
  exact Filter.Tendsto.atTop_mul_atTop₀ ( tendsto_inv_nhdsGT_zero ) ( tendsto_inv_nhdsGT_zero )

/-
Strict convexity on (0, ∞)
-/
theorem inv_sq_strict_convex :
    ∀ x y t : ℝ, 0 < x → 0 < y → x ≠ y → 0 < t → t < 1 →
    1/(t*x + (1-t)*y)^2 < t * (1/x^2) + (1-t) * (1/y^2) := by
  intros x y t hx hy hxy ht ht1;
  rw [ mul_div, mul_div, div_add_div, div_lt_div_iff₀ ] <;> try positivity;
  · nlinarith [ mul_pos ( mul_pos ht ( sub_pos_of_lt ht1 ) ) ( mul_self_pos.mpr ( sub_ne_zero.mpr hxy ) ), mul_pos hx ( mul_pos hy ( mul_pos ht ( sub_pos_of_lt ht1 ) ) ) ];
  · exact sq_pos_of_pos ( by nlinarith )