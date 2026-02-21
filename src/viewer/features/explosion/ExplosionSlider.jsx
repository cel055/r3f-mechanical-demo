/**
 * UI component for controlling explosion animation effect.
 *
 * Provides:
 * - Slider to adjust explosion factor (0 to 100%)
 * - Reset button to return to 0 instantly
 * - Percentage display of current explosion level
 *
 * The slider value (0-1) is displayed as percentage (0-100%) for better UX.
 * Reset button is disabled when explosion is already at 0.
 *
 * @component
 * @returns {JSX.Element} Explosion control interface
 */
import styles from "./ExplosionSlider.module.css";
import { viewerStateStore } from "../viewerState/viewerState";

export default function ExplosionSlider() {
  const explosionFactor = viewerStateStore((s) => s.explosionFactor);
  const setExplosionFactor = viewerStateStore((s) => s.setExplosionFactor);
  const resetExplosion = viewerStateStore((s) => s.resetExplosion);

  return (
    <div
      className={styles.container}
      role="group"
      aria-label="Explosion controls"
    >
      <div className={styles.header}>
        <span className={styles.label}>Explosion</span>
        <span className={styles.value}>
          {Math.round(explosionFactor * 100)}%
        </span>
      </div>

      <div className={styles.row}>
        <input
          className={styles.slider}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={explosionFactor}
          onChange={(e) => setExplosionFactor(Number(e.target.value))}
          aria-label="Explosion factor"
        />
        <button
          className={styles.reset}
          type="button"
          onClick={resetExplosion}
          disabled={explosionFactor <= 0}
          aria-label="Reset explosion"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
