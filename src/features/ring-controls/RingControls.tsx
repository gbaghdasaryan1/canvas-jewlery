import { ENGRAVING_MAX, useDesigner } from "@/app/store";
import { useT } from "@/shared/i18n";
import {
  // hangAxisLabel,
  // hangPlaceLabel,
  isRing,
  nextHangPlace,
  type Shape,
} from "@/entities/ring/model/types";
import styles from "./RingControls.module.css";

// const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

interface RangeProps {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
}

function Range({ label, value, min, max, step, current, onChange }: RangeProps) {
  return (
    <div className="field">
      <label>
        {label} <b>{value}</b>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

interface RingControlsProps {
  /** Bounds for the "Sample area" slider — maps need a much tighter
      window than mountains (Overpass payloads blow up past a few km). */
  areaMin?: number;
  areaMax?: number;
  /** Max "Relief depth" (mm) — maps cap lower than mountains. */
  reliefMax?: number;
  /** Show the engraving input. Hidden for streets-only maps pieces, which are
      hollow and have no solid back to laser-engrave. */
  showEngraving?: boolean;
  /** Show the "Relief depth" slider. Hidden for streets-only maps pieces, whose
      relief is fixed by the caller. */
  showRelief?: boolean;
}

export function RingControls({
  areaMin = 0.3,
  areaMax = 50,
  reliefMax = 4.8,
  showEngraving = true,
  showRelief = true,
}: RingControlsProps) {
  const s = useDesigner();
  const t = useT();
  const d = t.designer;

  const SHAPES: { id: Shape; label: string }[] = [
    { id: "rectangle", label: d.shapes.rectangle },
    { id: "circle", label: d.shapes.circle },
  ];
  const JEWELRY: { id: "pendant" | "ring" | "bracelet"; label: string }[] = [
    { id: "pendant", label: d.jewelry.pendant },
    { id: "ring", label: d.jewelry.ring },
    { id: "bracelet", label: d.jewelry.bracelet },
  ];

  // Translate a hang label (compass words → dictionary; degrees/"&" kept).
  // const dir = d.dir as Record<string, string>;
  // const trHang = (label: string) =>
  //   label
  //     .split(" ")
  //     .map((w) => dir[w] ?? w)
  //     .join(" ");

  return (
    <div className={styles.ctl}>
      <div className="field">
        <label>{d.wornAs}</label>
        <div className={styles.seg} role="radiogroup" aria-label={d.wornAs}>
          {JEWELRY.map((j) => (
            <button
              key={j.id}
              type="button"
              role="radio"
              aria-checked={s.jewelryType === j.id}
              className={`${styles.segBtn} ${s.jewelryType === j.id ? "on" : ""}`}
              onClick={() => s.setJewelryType(j.id)}
            >
              {j.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>{d.form}</label>
        <div className={styles.seg} role="radiogroup" aria-label={d.form}>
          {SHAPES.map((sh) => (
            <button
              key={sh.id}
              type="button"
              role="radio"
              aria-checked={s.shape === sh.id}
              className={`${styles.segBtn} ${s.shape === sh.id ? "on" : ""}`}
              onClick={() => s.setShape(sh.id)}
            >
              {sh.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orientation — yaw the relief on its mount. For a ring it spins the
          plaque on the band; for a pendant/bracelet it turns the design under
          the fixed hang point. Offered for every type. */}
      <Range
        label={isRing(s.jewelryType) ? d.ringOrientation : d.orientation}
        value={`${Math.round(s.ringRotation)}°`}
        min={0}
        max={360}
        step={1}
        current={s.ringRotation}
        onChange={s.setRingRotation}
      />

      {!isRing(s.jewelryType) && (
        <div className="field">
          <label>{d.hangingPoint}</label>
          {/* One button loops the bail(s) around the plate: a pendant steps
              through 8 sides/corners; a bracelet rotates its parallel pair. */}
          <button
            type="button"
            className={styles.hangCycle}
            onClick={() => s.setHangPlace(nextHangPlace(s.hangPlace, s.jewelryType))}
          >
            <span className={styles.hangCycleIco} aria-hidden>
              ↻
            </span>

          </button>
        </div>
      )}

      <div className={styles.ctlGrid}>
        {showRelief && (
          <Range
            label={d.reliefDepth}
            value={`${s.relief.toFixed(1)} ${d.mm}`}
            min={0.4}
            max={reliefMax}
            step={0.2}
            current={s.relief}
            onChange={s.setRelief}
          />
        )}
        <Range
          label={d.sampleArea}
          value={`${s.areaKm} ${d.km}`}
          min={areaMin}
          max={areaMax}
          step={0.1}
          current={s.areaKm}
          onChange={s.setAreaKm}
        />
      </div>

      {showEngraving && (
        <div className="field">
          <label>
            {isRing(s.jewelryType) ? d.engravingInside : d.engravingBack}
            <b>
              {s.engraving.length}/{ENGRAVING_MAX}
            </b>
          </label>
          <input
            type="text"
            className={styles.engraveInput}
            maxLength={ENGRAVING_MAX}
            value={s.engraving}
            onChange={(e) => s.setEngraving(e.target.value)}
            placeholder={d.engravingPlaceholder}
          />
        </div>
      )}
    </div>
  );
}
