import * as THREE from "three";
import { EPSILON, EXPLOSION_CONFIG } from "../config/constants";
import {
  getDeterministicDirection,
  getMaxAbsScaleComponent,
  getPerpendicularDirection,
  toLocalDirection,
} from "./explosionMath";
import { resolveProjectedOverlaps } from "./overlapResolution";

/**
 * Check if an object or any of its descendants has mesh geometry.
 * Used to identify branches with renderable content.
 *
 * @param {THREE.Object3D} object3D - The object to check
 * @returns {boolean} True if object has at least one mesh descendant
 */
const hasMeshDescendant = (object3D) => {
  let found = false;

  object3D.traverse((child) => {
    if (child.isMesh) {
      found = true;
    }
  });

  return found;
};

/**
 * Recursively collect all mesh objects in an object tree.
 *
 * @param {THREE.Object3D} root - Root object to traverse
 * @returns {Array<THREE.Mesh>} Array of mesh objects found
 */
const getMeshNodes = (root) => {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      meshes.push(obj);
    }
  });
  return meshes;
};

/**
 * Calculate bounding box and derived metrics for an object.
 * Returns center position and radius (optimal sphere to contain object).
 *
 * @param {THREE.Object3D} object3D - Object to measure
 * @returns {Object} Object with center (Vector3) and radius (number)
 */
const getObjectBoundsInfo = (object3D) => {
  const box = new THREE.Box3().setFromObject(object3D);

  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    return { center, radius };
  }

  return {
    center: object3D.getWorldPosition(new THREE.Vector3()),
    radius: 0,
  };
};

/**
 * Collect unique parent objects of all meshes in the tree.
 * Used to group explosion targets by their hierarchy level.
 *
 * @param {THREE.Object3D} root - Root object to traverse
 * @returns {Array<THREE.Object3D>} Unique parent objects
 */
const getUniqueMeshParents = (root) => {
  const parentsByUuid = new Map();

  root.traverse((obj) => {
    if (!obj.isMesh || !obj.parent) return;
    if (!parentsByUuid.has(obj.parent.uuid)) {
      parentsByUuid.set(obj.parent.uuid, obj.parent);
    }
  });

  return Array.from(parentsByUuid.values());
};

/**
 * Select explosion target nodes from the object hierarchy.
 * Uses adaptive strategy to find optimal decomposition level:
 * 1. Try top-level children with meshes
 * 2. If few children, try their children (one level deeper)
 * 3. If still few, try direct mesh parents
 * 4. Fallback to all mesh objects
 *
 * @param {THREE.Object3D} root - Root object of hierarchy
 * @returns {Array<THREE.Object3D>} Selected explosion nodes
 */
const pickExplosionNodes = (root) => {
  let candidates = root.children.filter(hasMeshDescendant);

  if (candidates.length <= 1 && candidates[0]) {
    const nestedCandidates = candidates[0].children.filter(hasMeshDescendant);
    if (nestedCandidates.length > 0) {
      candidates = nestedCandidates;
    }
  }

  if (candidates.length < 6) {
    const meshParents = getUniqueMeshParents(root).filter(hasMeshDescendant);
    if (meshParents.length > candidates.length) {
      candidates = meshParents;
    }
  }

  if (candidates.length < 3) {
    candidates = getMeshNodes(root);
  }

  return candidates;
};

/**
 * Build model-level bounds information used across explosion calculations.
 *
 * @param {THREE.Object3D} root - Model root object
 * @returns {{center: THREE.Vector3, radius: number, maxDistanceWorld: number}}
 */
const getModelBoundsInfo = (root) => {
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;

  return {
    center,
    radius,
    maxDistanceWorld: radius * EXPLOSION_CONFIG.maxDistanceFactor,
  };
};

/**
 * Build indexed node data for explosion calculations.
 *
 * @param {Array<THREE.Object3D>} explosionNodes - Candidate explosion nodes
 * @returns {Array<{object: THREE.Object3D, center: THREE.Vector3, radius: number}>}
 */
const buildNodeData = (explosionNodes) => {
  return explosionNodes
    .filter((obj) => Boolean(obj.parent))
    .map((obj) => ({
      object: obj,
      ...getObjectBoundsInfo(obj),
    }));
};

/**
 * Build sibling spread offsets in range [-1, 1] for each node index.
 *
 * @param {Array<{object: THREE.Object3D}>} nodeData - Explosion node descriptors
 * @returns {Map<number, number>} Node index -> sibling offset
 */
const buildSiblingOffsetByIndex = (nodeData) => {
  const siblingIndicesByParent = new Map();
  nodeData.forEach((entry, index) => {
    const parentUuid = entry.object.parent.uuid;
    if (!siblingIndicesByParent.has(parentUuid)) {
      siblingIndicesByParent.set(parentUuid, []);
    }
    siblingIndicesByParent.get(parentUuid).push(index);
  });

  const siblingOffsetByIndex = new Map();
  siblingIndicesByParent.forEach((indices) => {
    const sorted = [...indices].sort((leftIndex, rightIndex) => {
      const left = nodeData[leftIndex].object;
      const right = nodeData[rightIndex].object;
      const leftKey = `${left.name || ""}:${left.uuid}`;
      const rightKey = `${right.name || ""}:${right.uuid}`;
      return leftKey.localeCompare(rightKey);
    });

    if (sorted.length <= 1) {
      siblingOffsetByIndex.set(sorted[0], 0);
      return;
    }

    const half = (sorted.length - 1) / 2;
    sorted.forEach((nodeIndex, orderIndex) => {
      siblingOffsetByIndex.set(
        nodeIndex,
        (orderIndex - half) / Math.max(half, 1),
      );
    });
  });

  return siblingOffsetByIndex;
};

/**
 * Build world-space explosion target descriptors including direction, crowding,
 * and spread properties used in overlap resolution.
 *
 * @param {Array<{object: THREE.Object3D, center: THREE.Vector3, radius: number}>} nodeData - Explosion node descriptors
 * @param {THREE.Vector3} center - Model center in world space
 * @param {number} neighborRadius - Radius used for crowding detection
 * @param {Map<number, number>} siblingOffsetByIndex - Node index -> sibling offset
 * @returns {Array<Object>} World-space target descriptors
 */
const buildWorldTargets = (
  nodeData,
  center,
  neighborRadius,
  siblingOffsetByIndex,
) => {
  const worldTargets = [];

  nodeData.forEach((entry, index) => {
    const obj = entry.object;
    const objectWorldPosition = entry.center;
    const directionWorld = objectWorldPosition.clone().sub(center);
    const baseDirectionWorld =
      directionWorld.lengthSq() <= EPSILON
        ? getDeterministicDirection(obj.uuid, EPSILON)
        : directionWorld.normalize();

    const repelDirection = new THREE.Vector3();
    let crowdingScore = 0;

    nodeData.forEach((otherEntry, otherIndex) => {
      if (otherIndex === index) return;

      const delta = objectWorldPosition.clone().sub(otherEntry.center);
      const distance = delta.length();

      if (distance > neighborRadius) return;

      const safeDistance = Math.max(distance, EPSILON);
      const normalizedDistance = safeDistance / neighborRadius;
      const weight = Math.pow(1 - normalizedDistance, 2);
      crowdingScore += weight;

      if (distance <= EPSILON) {
        repelDirection.addScaledVector(
          getDeterministicDirection(
            `${obj.uuid}:${otherEntry.object.uuid}`,
            EPSILON,
          ),
          weight,
        );
      } else {
        repelDirection.addScaledVector(
          delta.divideScalar(safeDistance),
          weight,
        );
      }
    });

    const finalDirectionWorld = baseDirectionWorld.clone();
    if (repelDirection.lengthSq() > EPSILON) {
      finalDirectionWorld
        .addScaledVector(repelDirection.normalize(), 1.2)
        .normalize();
    }

    const siblingOffset = siblingOffsetByIndex.get(index) || 0;
    if (Math.abs(siblingOffset) > EPSILON) {
      const perpendicular = getPerpendicularDirection(
        finalDirectionWorld,
        `${obj.parent.uuid}:${obj.uuid}`,
        EPSILON,
      );
      finalDirectionWorld
        .addScaledVector(
          perpendicular,
          siblingOffset * EXPLOSION_CONFIG.siblingLateralFactor,
        )
        .normalize();
      crowdingScore +=
        Math.abs(siblingOffset) * EXPLOSION_CONFIG.siblingCrowdingFactor;
    }

    const crowdingMultiplier =
      1 +
      Math.min(crowdingScore, EXPLOSION_CONFIG.crowdingCap) *
        EXPLOSION_CONFIG.crowdingStrength;

    worldTargets.push({
      object: obj,
      worldCenter: objectWorldPosition,
      directionWorld: finalDirectionWorld,
      crowdingMultiplier,
      spreadGain: 1,
      objectRadius: entry.radius,
    });
  });

  return worldTargets;
};

/**
 * Convert world-space target descriptors into local-space animation targets.
 *
 * @param {Array<Object>} worldTargets - World-space target descriptors
 * @returns {Array<Object>} Local-space targets consumed by animation loop
 */
const buildLocalTargets = (worldTargets) => {
  const targets = [];

  worldTargets.forEach((entry) => {
    const obj = entry.object;
    const initialPosition = obj.position.clone();
    const objectWorldPosition = entry.worldCenter;
    const directionLocal = toLocalDirection(
      obj.parent,
      objectWorldPosition,
      entry.directionWorld,
      EPSILON,
    );

    const parentScale = obj.parent.getWorldScale(new THREE.Vector3());
    const parentScaleMax = getMaxAbsScaleComponent(parentScale, EPSILON);
    const localDistanceMultiplier = 1 / parentScaleMax;
    const finalDistanceMultiplier = entry.crowdingMultiplier * entry.spreadGain;

    targets.push({
      object: obj,
      initialPosition,
      direction: directionLocal,
      localDistanceMultiplier:
        localDistanceMultiplier * finalDistanceMultiplier,
    });
  });

  return targets;
};

/**
 * Build explosion animation target data for all objects in a model.
 *
 * Calculates:
 * 1. Explosion direction for each target (away from center, accounting for crowding)
 * 2. Crowding multiplier (proximity to neighbors amplifies explosion distance)
 * 3. Spread gain (adjusted for overlap resolution)
 * 4. Local coordinates for parent-relative positioning
 *
 * @param {THREE.Object3D} root - Model root object
 * @returns {Object} Object with targets array and maxDistanceWorld
 * @returns {Array} targets - Explosion information for each animatable object
 * @returns {number} maxDistanceWorld - Maximum explosion travel distance in world coordinates
 */
export const buildExplosionTargets = (root) => {
  root.updateWorldMatrix(true, true);
  const { center, radius, maxDistanceWorld } = getModelBoundsInfo(root);
  const explosionNodes = pickExplosionNodes(root);

  if (explosionNodes.length === 0) {
    getMeshNodes(root).forEach((obj) => explosionNodes.push(obj));
  }

  const nodeData = buildNodeData(explosionNodes);
  const siblingOffsetByIndex = buildSiblingOffsetByIndex(nodeData);
  const neighborRadius = Math.max(
    radius * EXPLOSION_CONFIG.neighborRadiusFactor,
    EXPLOSION_CONFIG.minNeighborRadius,
  );
  const worldTargets = buildWorldTargets(
    nodeData,
    center,
    neighborRadius,
    siblingOffsetByIndex,
  );

  /**
   * Adjust directions and spread to resolve trajectory overlaps.
   * Ensures explosion animation doesn't have visual collisions.
   */
  resolveProjectedOverlaps(worldTargets, maxDistanceWorld, radius);

  const targets = buildLocalTargets(worldTargets);

  return { targets, maxDistanceWorld };
};
