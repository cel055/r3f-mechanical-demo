import { useGLTF } from "@react-three/drei";
import { viewerStateStore } from "../../../features/viewerState/viewerState";
import { useEffect, useRef, useCallback } from "react";
import { useExplosionEffect } from "../explosion/explosion";

import { buildHierarchy } from "./buildHierarchy";

/**
 * Finds the first visible (non-hidden) object in a raycast intersections array.
 *
 * When multiple objects overlap at the raycast point, returns the topmost visible object,
 * skipping any objects that are hidden via the visibility toggle feature.
 *
 * @param {Array} intersections - Array of raycast intersection results from R3F raycasting
 * @returns {Object|null} First visible object or null if all objects are hidden or array is empty
 */
const findFirstVisibleObject = (intersections) => {
  if (!intersections || intersections.length === 0) return null;

  for (const inter of intersections) {
    if (inter.object && !inter.object.userData.isHidden) {
      return inter.object;
    }
  }
  return null;
};

/**
 * Interactive 3D model component using react-three-fiber.
 *
 * Handles:
 * - Loading and rendering the glTF model
 * - Building a hierarchical representation of the scene for the UI
 * - Object picking (selection) via raycasting
 * - Hover state management with visual feedback
 * - Visibility toggling and isolation modes
 * - Explosion effect animation
 * - Synchronization between 3D scene and application state
 *
 * @component
 * @param {Function} onPick - Callback invoked when user clicks on a 3D object (receives object or null)
 * @param {Function} onHover - Callback invoked when user hovers over a 3D object (receives object or null)
 * @param {Object} props - Additional props passed to the THREE.Primitive component
 * @returns {JSX.Element|null} THREE.Primitive with the loaded scene or null while loading
 */
export function InteractiveModel({ onPick, onHover, ...props }) {
  const { scene } = useGLTF("/air_motor.glb");
  const setSelectedObject = viewerStateStore(
    (state) => state.setSelectedObject,
  );
  const setItems = viewerStateStore((state) => state.setItems);
  const setObjectMap = viewerStateStore((state) => state.setObjectMap);
  const hiddenObjects = viewerStateStore((state) => state.hiddenObjects);
  const explosionFactor = viewerStateStore((state) => state.explosionFactor);
  const lastHoveredRef = useRef(null);

  /**
   * Build hierarchy tree and create UUID->Object3D map once on initial scene load.
   * This map is used for efficient object lookups throughout the application.
   */
  useEffect(() => {
    if (!scene) return;

    const map = {};
    scene.traverse((obj) => {
      map[obj.uuid] = obj;
    });

    setObjectMap(map);
    setItems(buildHierarchy(scene));
  }, [scene, setItems, setObjectMap]);

  /**
   * Clears hover state and notifies parent component.
   * Used when mouse leaves the canvas or an object is hidden.
   */
  const clearHover = useCallback(() => {
    if (lastHoveredRef.current) {
      lastHoveredRef.current = null;
      if (onHover) onHover(null);
    }
  }, [onHover]);

  useExplosionEffect(scene, explosionFactor);

  /**
   * Synchronize scene object visibility with application state.
   * When objects are hidden via visibility toggle, their THREE.visible property is updated
   * and any hover/selection state for hidden objects is cleared.
   */
  useEffect(() => {
    if (!scene) return;

    const state = viewerStateStore.getState();
    const selectedId = state.selectedIds?.[0];
    const selectedObjRef = selectedId
      ? state.getObjectsByIds([selectedId])?.[0]
      : null;

    scene.traverse((obj) => {
      if (obj.isMesh || obj.isGroup) {
        const isHidden = hiddenObjects.has(obj.uuid);
        obj.visible = !isHidden;
        obj.userData.isHidden = isHidden;

        // Clear selection/hover if this object is being hidden
        if (isHidden) {
          if (selectedObjRef === obj) {
            setSelectedObject(null);
          }
          if (lastHoveredRef.current === obj) {
            lastHoveredRef.current = null;
            if (onHover) onHover(null);
          }
        }
      }
    });
  }, [scene, hiddenObjects, setSelectedObject, onHover]);

  /**
   * Handles click events on 3D objects.
   * Picks the topmost visible object and updates selection state.
   */
  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      const pickedObject = findFirstVisibleObject(e.intersections);

      if (!pickedObject) return;

      clearHover();
      setSelectedObject(pickedObject);
      if (onPick) onPick(pickedObject);
    },
    [setSelectedObject, onPick, clearHover],
  );

  /**
   * Handles pointer enter events on 3D objects.
   * Updates hover state only if the incoming object differs from the current hover target.
   */
  const handlePointerOver = useCallback(
    (e) => {
      e.stopPropagation();
      const hoveredObject = findFirstVisibleObject(e.intersections);

      if (!hoveredObject || lastHoveredRef.current === hoveredObject) return;

      lastHoveredRef.current = hoveredObject;
      if (onHover) onHover(hoveredObject);
    },
    [onHover],
  );

  /**
   * Handles pointer exit events.
   * If no visible object is under the cursor, clears hover state.
   * If a different object is under cursor, transitions hover to that object.
   */
  const handlePointerOut = useCallback(
    (e) => {
      e.stopPropagation();
      const hoveredObject = findFirstVisibleObject(e.intersections);

      if (!hoveredObject) {
        // No visible object under mouse, clear hover state
        clearHover();
      } else if (hoveredObject !== lastHoveredRef.current) {
        // Different visible object is now under cursor, transition hover
        lastHoveredRef.current = hoveredObject;
        if (onHover) onHover(hoveredObject);
      }
    },
    [onHover, clearHover],
  );

  /**
   * Handles when pointer clicks on empty space (not on any object).
   * Clears both selection and hover state.
   */
  const handlePointerMissed = useCallback(() => {
    setSelectedObject(null);
    clearHover();
    if (onPick) onPick(null);
  }, [setSelectedObject, onPick, clearHover]);

  if (!scene) return null;
  return (
    <primitive
      object={scene}
      {...props}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerMissed={handlePointerMissed}
    />
  );
}

useGLTF.preload("/air_motor.glb");
