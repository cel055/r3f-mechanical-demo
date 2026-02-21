import { Canvas } from "@react-three/fiber";
import { Scene } from "./viewer/three/features/scene/scene";
import * as THREE from "three";
import { HierarchyPanel } from "./viewer/features/hierarchy/hierarchy";
import { InspectorPanel } from "./viewer/features/inspector/inspector";
import { Loader } from "./components/Loader";
import { ModelCredits } from "./components/ModelCredits";
import { viewerStateStore } from "./viewer/features/viewerState/viewerState";
import { useSelectedPartMetadata } from "./viewer/features/partMetadata/partMetadata";
import styles from "./App.module.css";
import ExplosionSlider from "./viewer/features/explosion/ExplosionSlider";

/**
 * Main application component that orchestrates the 3D engine viewer.
 *
 * Provides a three-panel layout:
 * - Left: Hierarchy panel for scene object navigation and visibility control
 * - Center: 3D Canvas with interactive model viewer and explosion animation controls
 * - Right: Inspector panel displaying metadata for selected parts
 *
 * @component
 * @returns {JSX.Element} The main application interface with three-panel layout
 */
export function App() {
  // Initialize part metadata loading (manages isLoading state globally)
  useSelectedPartMetadata();

  // Retrieve global loading state from Zustand store
  const isLoading = viewerStateStore((state) => state.isLoading);

  return (
    <div className={styles.app}>
      {/* Loading overlay - displayed while 3D model and metadata are loading */}
      {isLoading && <Loader />}

      {/* Left sidebar: Scene hierarchy tree with visibility and isolation controls */}
      <HierarchyPanel />

      {/* Center content: 3D viewport with interactive model and explosion slider */}
      <div className={styles.viewport}>
        <Canvas
          className={styles.canvas}
          gl={{
            antialias: true,
            toneMapping: THREE.NoToneMapping,
          }}
          shadows
        >
          <color attach="background" args={["#888888"]} />
          <Scene />
        </Canvas>
        {/* Controls for explosion animation visualization */}
        <ExplosionSlider />
        {/* Attribution credits for 3D model (CC BY 4.0 license compliance) */}
        <ModelCredits />
      </div>

      {/* Right sidebar: Displays detailed metadata and specifications for selected part */}
      <InspectorPanel />
    </div>
  );
}
