import { useDesigner } from "@/app/store";
import { type Shape } from "@/entities/ring/model/types";

const SHAPES: { id: Shape; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "heart", label: "Heart" },
  { id: "circle", label: "Circle" },
  { id: "skyline", label: "Skyline" },
];

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

export function RingControls() {
  const s = useDesigner();
  return (
    <>
      <div className="field">
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
        <Range label="Sample area" value={`${s.areaKm} km`} min={0.3} max={64} step={0.1} current={s.areaKm} onChange={s.setAreaKm} />
      </div>

      {/* <div className="field" style={{ marginTop: 22 }}>
        <label>Metal</label>
        <div className="metals">
          {(Object.keys(METALS) as Metal[]).map((m) => (
            <button
              key={m}
              className={`metal ${s.metal === m ? "active" : ""}`}
              onClick={() => s.setMetal(m)}
            >
              <span className="sw" style={{ background: METAL_SWATCH[m] }} />
              {METALS[m].label}
            </button>
          ))}
        </div>
      </div> */}
    </>
  );
}
