import { useDesigner } from "@/app/store";
import { JEWELRY_LABELS, JEWELRY_TYPES, hangAxisLabel, hangPlaceLabel, isRing, nextHangPlace, type Shape } from "@/entities/ring/model/types";

const SHAPES: { id: Shape; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
];

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

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
}

export function RingControls({ areaMin = 0.3, areaMax = 614 }: RingControlsProps) {
  const s = useDesigner();
  return (
    <>
      <div className="field">
        <label>Jewelry type</label>
        <div className="metals">
          {JEWELRY_TYPES.map((t) => (
            <button
              key={t}
              className={`metal ${s.jewelryType === t ? "active" : ""}`}
              onClick={() => s.setJewelryType(t)}
            >
              {JEWELRY_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {isRing(s.jewelryType) && (
        <div className="field" style={{ marginTop: 18 }}>
          <Range
            label="Ring orientation"
            value={`${Math.round(s.ringRotation)}°`}
            min={0}
            max={360}
            step={1}
            current={s.ringRotation}
            onChange={s.setRingRotation}
          />
        </div>
      )}

      {!isRing(s.jewelryType) && (
        <div className="field" style={{ marginTop: 18 }}>
          <label>Hanging point</label>
          <div className="metals">
            {/* One button loops the bail(s) around the plate: a pendant steps
                through every side and corner; a bracelet rotates its parallel
                pair through the 4 distinct axes. */}
            <button
              className="metal active"
              onClick={() => s.setHangPlace(nextHangPlace(s.hangPlace, s.jewelryType))}
            >
              ↻ {capitalize(
                s.jewelryType === "bracelet" ? hangAxisLabel(s.hangPlace) : hangPlaceLabel(s.hangPlace),
              )}
            </button>
          </div>
        </div>
      )}

      <div className="field" style={{ marginTop: 18 }}>
        <label>Shape</label>
        <div className="metals">
          {SHAPES.map((sh) => (
            <button
              key={sh.id}
              className={`metal ${s.shape === sh.id ? "active" : ""}`}
              onClick={() => s.setShape(sh.id)}
            >
              {sh.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ctl-grid" style={{ marginTop: 22 }}>
        <Range label="Relief depth" value={`${s.relief.toFixed(1)} mm`} min={0.4} max={8} step={0.2} current={s.relief} onChange={s.setRelief} />
        <Range label="Sample area" value={`${s.areaKm} km`} min={areaMin} max={areaMax} step={0.1} current={s.areaKm} onChange={s.setAreaKm} />
      </div>


    </>
  );
}
