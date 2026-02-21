import * as THREE from "three";

/**
 * Build a deterministic pseudo-random normalized direction from a seed string.
 *
 * @param {string} seedString - Seed used to generate a stable direction
 * @param {number} epsilon - Numeric threshold to avoid zero-length vectors
 * @returns {THREE.Vector3} Normalized direction vector
 */
export const getDeterministicDirection = (seedString, epsilon) => {
  let hash = 0;
  for (let index = 0; index < seedString.length; index += 1) {
    hash = (hash * 31 + seedString.charCodeAt(index)) | 0;
  }

  const x = ((hash & 0xff) / 255) * 2 - 1;
  const y = (((hash >> 8) & 0xff) / 255) * 2 - 1;
  const z = (((hash >> 16) & 0xff) / 255) * 2 - 1;
  const direction = new THREE.Vector3(x, y, z);

  if (direction.lengthSq() <= epsilon) {
    return new THREE.Vector3(1, 0, 0);
  }

  return direction.normalize();
};

/**
 * Build a normalized perpendicular direction relative to an input direction.
 * Uses Gram-Schmidt and deterministic fallback strategies for stability.
 *
 * @param {THREE.Vector3} direction - Reference direction
 * @param {string} seedString - Seed used for deterministic fallback orientation
 * @param {number} epsilon - Numeric threshold to avoid zero-length vectors
 * @returns {THREE.Vector3} Normalized perpendicular direction
 */
export const getPerpendicularDirection = (direction, seedString, epsilon) => {
  const seededDirection = getDeterministicDirection(seedString, epsilon);
  const projection = direction
    .clone()
    .multiplyScalar(seededDirection.dot(direction));
  const perpendicular = seededDirection.sub(projection);

  if (perpendicular.lengthSq() <= epsilon) {
    const fallbackAxis =
      Math.abs(direction.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    perpendicular.copy(direction.clone().cross(fallbackAxis));
  }

  if (perpendicular.lengthSq() <= epsilon) {
    return new THREE.Vector3(1, 0, 0);
  }

  return perpendicular.normalize();
};

/**
 * Convert a world direction into local space, relative to a world origin point.
 *
 * @param {THREE.Object3D} parent - Parent transform that defines local space
 * @param {THREE.Vector3} worldOrigin - World-space origin point
 * @param {THREE.Vector3} worldDirection - World-space normalized direction
 * @param {number} epsilon - Numeric threshold to avoid zero-length vectors
 * @returns {THREE.Vector3} Normalized local-space direction
 */
export const toLocalDirection = (
  parent,
  worldOrigin,
  worldDirection,
  epsilon,
) => {
  const worldStepPosition = worldOrigin.clone().add(worldDirection);
  const localOrigin = parent.worldToLocal(worldOrigin.clone());
  const localDirection = parent
    .worldToLocal(worldStepPosition)
    .sub(localOrigin);

  if (localDirection.lengthSq() <= epsilon) {
    localDirection.copy(worldDirection);
  }

  return localDirection.normalize();
};

/**
 * Return the largest absolute component of a scale vector with epsilon floor.
 *
 * @param {THREE.Vector3} scale - World scale vector
 * @param {number} epsilon - Numeric floor value
 * @returns {number} Largest absolute scale component
 */
export const getMaxAbsScaleComponent = (scale, epsilon) => {
  return Math.max(
    Math.abs(scale.x),
    Math.abs(scale.y),
    Math.abs(scale.z),
    epsilon,
  );
};
