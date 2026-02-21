import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { buildExplosionTargets } from "../domain/buildExplosionTargets";

/**
 * Custom React hook that manages explosion animation using R3F's useFrame.
 *
 * Computes explosion targets once from the scene, then animates them each frame
 * based on the current explosion factor (0 to 1).
 *
 * When component unmounts or scene changes, resets all objects to their initial positions.
 *
 * Explosion motion uses:
 * - Pre-computed directions and multipliers for each target
 * - Frame-synced updates via useFrame (not requestAnimationFrame)
 * - Clean separation of computation (useEffect) from animation (useFrame)
 *
 * @hook
 * @param {THREE.Scene} scene - The Three.js scene containing objects to animate
 * @param {number} explosionFactor - Progress value from 0 (none) to 1 (full explosion)
 *
 * @example
 * useExplosionEffect(scene, explosionFactor);
 */
export const useExplosionEffect = (scene, explosionFactor) => {
  /**
   * Refs to cache explosion targets and max distance.
   * Prevents recomputation on every frame and survives component re-renders.
   */
  const explosionTargetsRef = useRef([]);
  const maxDistanceRef = useRef(0);

  /**
   * Compute explosion targets when scene loads or changes.
   * This expensive calculation happens once, results are cached in refs.
   *
   * Cleanup: Reset all objects to initial positions when unmounting or scene changes.
   */
  useEffect(() => {
    if (!scene) return;

    const { targets, maxDistanceWorld } = buildExplosionTargets(scene);
    explosionTargetsRef.current = targets;
    maxDistanceRef.current = maxDistanceWorld;

    /**
     * Cleanup function: restore all objects to initial positions.
     * Ensures clean state when scene changes or component unmounts.
     */
    return () => {
      explosionTargetsRef.current.forEach((entry) => {
        entry.object.position.copy(entry.initialPosition);
      });
      explosionTargetsRef.current = [];
      maxDistanceRef.current = 0;
    };
  }, [scene]);

  /**
   * Frame-by-frame animation loop synced with R3F render cycle.
   * Updates all explosion target positions based on current explosion factor.
   * Only runs if explosion factor is non-zero and targets exist.
   */
  useFrame(() => {
    const worldDistance = maxDistanceRef.current * explosionFactor;

    explosionTargetsRef.current.forEach((entry) => {
      const localDistance = worldDistance * entry.localDistanceMultiplier;
      entry.object.position
        .copy(entry.initialPosition)
        .addScaledVector(entry.direction, localDistance);
    });
  });
};
