import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Easing function for smooth, realistic camera animation.
 *
 * Implements ease-in-out quadratic easing for natural motion feel:
 * - Starts slow, accelerates toward middle, then decelerates toward end
 * - This creates smoother, more pleasant animation than linear interpolation
 *
 * @param {number} progress - Animation progress from 0 to 1
 * @returns {number} Eased progress value (0 to 1)
 */
function calculateEasing(progress) {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

/**
 * Calculate target position from object(s) for camera focus.
 *
 * Handles both single objects and arrays:
 * - Single object: returns world position
 * - Multiple objects: computes bounding box and returns center point
 * - Empty array: returns zero vector (origin)
 *
 * @param {THREE.Object3D | THREE.Object3D[]} obj - Object or array of objects to focus on
 * @returns {THREE.Vector3} World position to focus camera on
 */
function getTargetPosition(obj) {
  const target = new THREE.Vector3();

  if (Array.isArray(obj)) {
    // If it's an array, calculate bounds and use center
    if (obj.length === 0) return target;

    const box = new THREE.Box3();
    obj.forEach((mesh) => {
      box.expandByObject(mesh);
    });
    box.getCenter(target);
  } else if (obj) {
    // If it's a single object, get its world position
    obj.getWorldPosition(target);
  }

  return target;
}

/**
 * Custom React hook for smooth camera focus animation on selected objects.
 *
 * Animates the camera to focus on a selected object or group of objects while:
 * - Maintaining the current view distance (zoom level)
 * - Using eased motion for natural, smooth animation
 * - Syncing with the R3F render loop via useFrame
 * - Preserving orbit controls usability
 *
 * @hook
 * @param {THREE.Object3D | THREE.Object3D[] | null} selected - The object(s) to focus on (null = no animation)
 * @param {React.RefObject} controlsRef - Reference to OrbitControls instance
 * @param {number} [duration=500] - Animation duration in milliseconds
 *
 * @example
 * const controlsRef = useRef(null);
 * const selectedObjects = useMemo(() => [mesh], [mesh]);
 * useCameraAnimation(selectedObjects, controlsRef, 600);
 */
export const useCameraAnimation = (selected, controlsRef, duration = 500) => {
  const camera = useThree((state) => state.camera);

  /**
   * Ref to persist animation state across renders without causing re-renders.
   * Stores start/end positions, duration, and animation progress.
   */
  const animationRef = useRef({
    isAnimating: false,
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    startCameraPos: new THREE.Vector3(),
    endCameraPos: new THREE.Vector3(),
    startTime: 0,
    duration: duration,
  });

  /**
   * Initialize animation state when selection changes.
   * Computes target focus point and new camera position to maintain distance.
   */
  useEffect(() => {
    if (!selected || !controlsRef.current) return;

    const target = getTargetPosition(selected);

    /**
     * Calculate current distance from camera to orbit control target.
     * This distance will be preserved during animation for consistent zoom level.
     */
    const currentDistance = camera.position.distanceTo(
      controlsRef.current.target,
    );

    /**
     * Calculate camera direction vector (from control target to camera).
     * This direction will be reused at the new target to maintain viewing angle.
     */
    const direction = new THREE.Vector3()
      .subVectors(camera.position, controlsRef.current.target)
      .normalize();

    /**
     * Calculate new camera position: place it at same distance from new target,
     * looking in the same direction as before.
     */
    const newCameraPos = new THREE.Vector3()
      .copy(target)
      .add(direction.multiplyScalar(currentDistance));

    animationRef.current = {
      isAnimating: true,
      startTarget: controlsRef.current.target.clone(),
      endTarget: target,
      startCameraPos: camera.position.clone(),
      endCameraPos: newCameraPos,
      startTime: performance.now(),
      duration: duration,
    };
  }, [selected, camera, duration]);

  /**
   * Frame-by-frame animation loop using R3F's useFrame hook.
   * Interpolates camera position and orbit control target using eased progress.
   * Automatically stops animation when duration is reached.
   */
  useFrame(() => {
    if (!animationRef.current.isAnimating || !controlsRef.current) return;

    /**
     * Calculate animation progress (clamped between 0 and 1).
     * Using performance.now() for frame-independent timing.
     */
    const elapsed = performance.now() - animationRef.current.startTime;
    const progress = Math.min(elapsed / animationRef.current.duration, 1);
    /**
     * Apply easing function to progress for smooth, accelerating motion.
     * Results in more natural camera movement than linear interpolation.
     */
    const easeProgress = calculateEasing(progress);

    /**
     * Interpolate both orbit control target and camera position using eased progress.
     * Both must move together to create smooth focus transition.
     */
    controlsRef.current.target.lerpVectors(
      animationRef.current.startTarget,
      animationRef.current.endTarget,
      easeProgress,
    );

    camera.position.lerpVectors(
      animationRef.current.startCameraPos,
      animationRef.current.endCameraPos,
      easeProgress,
    );

    controlsRef.current.update();

    if (progress >= 1) {
      animationRef.current.isAnimating = false;
    }
  });
};
