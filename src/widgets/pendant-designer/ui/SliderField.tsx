import { FieldColumn, Label, RangeInput, Value } from "./styles";

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Fires with record=false during the drag; a beginEdit snapshot is taken
   *  on pointer-down so the whole gesture is one undo step. */
  onChange: (value: number) => void;
  onBegin: () => void;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = "mm",
  onChange,
  onBegin,
}: SliderFieldProps) {
  return (
    <FieldColumn>
      <Label>
        {label}
        <Value>
          {Number(value.toFixed(2))} {unit}
        </Value>
      </Label>
      <RangeInput
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onBegin}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </FieldColumn>
  );
}
