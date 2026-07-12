import { useDesigner } from "@/app/store";
import { HANG_PLACES, JEWELRY_TYPES, hangPlaceLabel, type Shape } from "@/entities/ring/model/types";

const SHAPES: { id: Shape; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "heart", label: "Heart" },
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
  /** Bounds for the "Sample area" slider — skylines need a much tighter
      window than terrain (Overpass payloads blow up past a few km). */
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
              {capitalize(t)}
            </button>
          ))}
        </div>
      </div>

      {s.jewelryType === "pendant" && (
        <>
          <div className="field" style={{ marginTop: 18 }}>
            <label>Hanging point</label>
            <div className="metals">
              {/* One button loops the bail clockwise around every side and corner. */}
              <button
                className="metal active"
                onClick={() =>
                  s.setHangPlace(
                    HANG_PLACES[(HANG_PLACES.indexOf(s.hangPlace) + 1) % HANG_PLACES.length],
                  )
                }
              >
                ↻ {capitalize(hangPlaceLabel(s.hangPlace))}
              </button>
            </div>
            <div className="ctl-grid" style={{ marginTop: 12 }}>
              <Range
                label="Loop size"
                value={`${s.hangSize.toFixed(2)}×`}
                min={0.5}
                max={2}
                step={0.05}
                current={s.hangSize}
                onChange={s.setHangSize}
              />
              <Range
                label="Loop rotation"
                value={`${s.hangRotation}°`}
                min={-45}
                max={45}
                step={1}
                current={s.hangRotation}
                onChange={s.setHangRotation}
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Chain loop</label>
            <div className="metals">
              <button
                className={`metal ${!s.hangHorizontal ? "active" : ""}`}
                onClick={() => s.setHangHorizontal(false)}
              >
                Pendant
              </button>
              <button
                className={`metal ${s.hangHorizontal ? "active" : ""}`}
                onClick={() => s.setHangHorizontal(true)}
              >
                Chain
              </button>
            </div>
          </div>
        </>
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
        <Range
          label="Plate size"
          value={`${s.width} mm`}
          min={15}
          max={30}
          step={1}
          current={s.width}
          onChange={s.setWidth}
        />
        <Range label="Relief depth" value={`${s.relief.toFixed(1)} mm`} min={0.4} max={8} step={0.2} current={s.relief} onChange={s.setRelief} />
        <Range label="Base thickness" value={`${s.thickness.toFixed(1)} mm`} min={0.5} max={4} step={0.1} current={s.thickness} onChange={s.setThickness} />
        <Range label="Smoothing" value={s.smooth === 0 ? "Sharp" : `${s.smooth}×`} min={0} max={6} step={0.2} current={s.smooth} onChange={s.setSmooth} />
        <Range label="Sample area" value={`${s.areaKm} km`} min={areaMin} max={areaMax} step={0.1} current={s.areaKm} onChange={s.setAreaKm} />
      </div>


    </>
  );
}
