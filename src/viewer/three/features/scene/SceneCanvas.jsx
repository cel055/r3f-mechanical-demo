import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useRef, useState, useCallback, useMemo } from "react";
import { InteractiveModel } from "../model/model";
import { SelectionEffect } from "../selection/selection";
import { viewerStateStore } from "../../../features/viewerState/viewerState";
import { useCameraAnimation } from "../camera/camera";

/**
 * Three.js scene setup component for react-three-fiber.
 *
 * Configures the 3D environment including:
 * - Camera and orbit controls
 * - Lighting (ambient and hemisphere lights for realistic illumination)
 * - The interactive 3D model
 * - Selection outline effects
 * - Automatic camera animation when objects are selected
 *
 * @component
 * @returns {JSX.Element} Three.js scene elements and components
 */
export function Scene() {
  const selectedIds = viewerStateStore((state) => state.selectedIds);
  const getObjectsByIds = viewerStateStore((state) => state.getObjectsByIds);
  const setSelected = viewerStateStore((state) => state.setSelectedObject);
  const [hoveredObject, setHoveredObject] = useState(null);
  const controlsRef = useRef(null);

  /**
   * Memoized callback to prevent unnecessary references renewal on each render.
   * Used to communicate hover state from the 3D model to the SelectionEffect component.
   */
  const handleHover = useCallback((obj) => {
    setHoveredObject(obj);
  }, []);

  /**
   * Resolve selected object IDs to actual THREE.Object3D instances.
   * Returns null if no objects are selected to avoid rendering empty arrays.
   */
  const selectedObjects = useMemo(() => {
    if (!selectedIds || selectedIds.length === 0) return null;
    const resolved = getObjectsByIds(selectedIds);
    return resolved.length > 0 ? resolved : null;
  }, [selectedIds]);

  /**
   * Trigger smooth camera animation when selection changes.
   * Camera will focus on the selected object(s) while maintaining viewpoint distance.
   */
  useCameraAnimation(selectedObjects, controlsRef);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 200]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enableDamping={true}
        dampingFactor={0.05}
      />

      <ambientLight intensity={0.7} />
      <hemisphereLight
        skyColor={0xffffbb}
        groundColor={0x080820}
        intensity={1}
      />

      <SelectionEffect hovered={hoveredObject} selected={selectedObjects}>
        <InteractiveModel
          position={[0, 0, 0]}
          scale={1}
          onPick={setSelected}
          onHover={handleHover}
        />
      </SelectionEffect>
    </>
  );
}
