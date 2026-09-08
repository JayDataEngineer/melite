/** The body param bag — the Character Maker contract. The bag every
 * downstream card reads as its identity source. */
export type IdentityModel = "soma" | "mhr" | "anny"

export interface Character {
  identityModel: IdentityModel
  /** Phenotype/PCA coefficients for the model. null = use model defaults. */
  coeffs: number[] | null
  /** Sparse {label: value} dict of Anny local_changes (189 detail morphs). */
  localChanges: Record<string, number> | null
  /**
   * Sparse {target_id: weight} dict of community MakeHuman .target blends
   * (e.g. {"anime_stylized_enhanced": 0.5}). null = none active. Anny only.
   */
  customTargets: Record<string, number> | null
}
