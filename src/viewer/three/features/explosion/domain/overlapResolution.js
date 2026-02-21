import { EPSILON, EXPLOSION_CONFIG } from "../config/constants";
import { getDeterministicDirection } from "./explosionMath";

/**
 * Resolve overlapping explosion trajectories by adjusting directions and spread.
 * Iteratively applies impulses to push overlapping targets apart in simulated space.
 *
 * Algorithm:
 * 1. For each pair of targets, check if their projected explosion paths overlap
 * 2. If overlapping, apply separation impulses in opposite directions
 * 3. Boost spread factor to increase separation distance
 * 4. Repeat for multiple iterations for convergence
 *
 * @param {Array} entries - Target explosion entries with trajectory data
 * @param {number} maxDistanceWorld - Maximum explosion travel distance
 * @param {number} modelRadius - Overall model size
 */
export const resolveProjectedOverlaps = (
  entries,
  maxDistanceWorld,
  modelRadius,
) => {
  if (entries.length < 2) return;

  const iterations = EXPLOSION_CONFIG.overlapIterations;
  const minBaseGap = Math.max(
    modelRadius * EXPLOSION_CONFIG.overlapMinGapFactor,
    EXPLOSION_CONFIG.overlapMinGapAbsolute,
  );
  const checkpoints = EXPLOSION_CONFIG.overlapCheckpoints;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      const left = entries[leftIndex];

      for (
        let rightIndex = leftIndex + 1;
        rightIndex < entries.length;
        rightIndex += 1
      ) {
        const right = entries[rightIndex];

        const leftDistance =
          maxDistanceWorld * left.crowdingMultiplier * left.spreadGain;
        const rightDistance =
          maxDistanceWorld * right.crowdingMultiplier * right.spreadGain;

        let bestDelta = null;
        let minObservedDistance = Infinity;

        checkpoints.forEach((checkpoint) => {
          const leftProjectedCenter = left.worldCenter
            .clone()
            .addScaledVector(left.directionWorld, leftDistance * checkpoint);
          const rightProjectedCenter = right.worldCenter
            .clone()
            .addScaledVector(right.directionWorld, rightDistance * checkpoint);
          const deltaAtCheckpoint =
            leftProjectedCenter.sub(rightProjectedCenter);
          const distanceAtCheckpoint = deltaAtCheckpoint.length();

          if (distanceAtCheckpoint < minObservedDistance) {
            minObservedDistance = distanceAtCheckpoint;
            bestDelta = deltaAtCheckpoint;
          }
        });

        const distance = minObservedDistance;
        const minGap = Math.max(
          (left.objectRadius + right.objectRadius) *
            EXPLOSION_CONFIG.overlapRadiusScale,
          minBaseGap,
        );

        if (distance >= minGap) continue;

        const overlapRatio = (minGap - distance) / minGap;
        const separationDirection =
          distance <= EPSILON
            ? getDeterministicDirection(
                `${left.object.uuid}:${right.object.uuid}`,
                EPSILON,
              )
            : bestDelta.divideScalar(Math.max(distance, EPSILON));

        const separationStrength =
          EXPLOSION_CONFIG.overlapSeparationStrength * overlapRatio;
        left.directionWorld
          .addScaledVector(separationDirection, separationStrength)
          .normalize();
        right.directionWorld
          .addScaledVector(separationDirection, -separationStrength)
          .normalize();

        const spreadBoost =
          1 + overlapRatio * EXPLOSION_CONFIG.overlapSpreadBoost;
        left.spreadGain *= spreadBoost;
        right.spreadGain *= spreadBoost;
      }
    }
  }
};
