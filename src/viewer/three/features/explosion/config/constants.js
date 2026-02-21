/**
 * Numeric epsilon for float comparison.
 * Used to detect zero-length vectors and near-parallel directions.
 * @constant {number}
 */
export const EPSILON = 1e-10;

/**
 * Explosion animation configuration parameters.
 * Controls direction calculation, crowding multipliers, and overlap resolution.
 *
 * @constant {Object}
 * @property {number} maxDistanceFactor - Explosion distance as multiple of model radius (1.25x)
 * @property {number} neighborRadiusFactor - Crowding detection radius as multiple of model radius (0.36x)
 * @property {number} minNeighborRadius - Minimum absolute crowding detection radius (0.02 units)
 * @property {number} siblingLateralFactor - Lateral spread magnitude for siblings (0.62)
 * @property {number} siblingCrowdingFactor - Crowding score increase from sibling offset (0.95)
 * @property {number} crowdingCap - Maximum crowding score before multiplication (3.5)
 * @property {number} crowdingStrength - Multiplier strength per crowding point (0.5)
 * @property {number} overlapIterations - Iterations for overlap resolution (3)
 * @property {number} overlapMinGapFactor - Minimum gap between overlaps as model radius fraction (0.04)
 * @property {number} overlapMinGapAbsolute - Absolute minimum gap value (0.45 units)
 * @property {number} overlapRadiusScale - Scale factor for bounding sphere gap calculation (0.72)
 * @property {number} overlapSeparationStrength - Impulse strength for separation per iteration (0.36)
 * @property {number} overlapSpreadBoost - Spread gain multiplier for overlap resolution (0.24)
 * @property {Array<number>} overlapCheckpoints - Waypoints to check overlap (35%, 65%, 100%)
 */
export const EXPLOSION_CONFIG = {
  maxDistanceFactor: 1.25,
  neighborRadiusFactor: 0.36,
  minNeighborRadius: 0.02,
  siblingLateralFactor: 0.62,
  siblingCrowdingFactor: 0.95,
  crowdingCap: 3.5,
  crowdingStrength: 0.5,
  overlapIterations: 3,
  overlapMinGapFactor: 0.04,
  overlapMinGapAbsolute: 0.45,
  overlapRadiusScale: 0.72,
  overlapSeparationStrength: 0.36,
  overlapSpreadBoost: 0.24,
  overlapCheckpoints: [0.35, 0.65, 1],
};
