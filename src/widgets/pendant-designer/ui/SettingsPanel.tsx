import type { PendantShape } from "@/entities/pendant/model/types";
import { pendantHeight } from "@/entities/pendant/lib/geometry";
import { usePendant } from "../model/store";
import { SliderField } from "./SliderField";
import { GhostButton, Hint, Section, SectionTitle, SegButton, SegRow } from "./styles";

const SHAPES: Array<{ id: PendantShape; label: string }> = [
  { id: "circle", label: "Circle" },
  { id: "rectangle", label: "Rectangle" },
  { id: "freeform", label: "Freeform" },
];

export function SettingsPanel() {
  const config = usePendant((s) => s.design.config);
  const hasObject = usePendant((s) => s.silhouette !== null);
  const setShape = usePendant((s) => s.setShape);
  const updateConfig = usePendant((s) => s.updateConfig);
  const updateHole = usePendant((s) => s.updateHole);
  const beginEdit = usePendant((s) => s.beginEdit);
  const refit = usePendant((s) => s.refit);

  const H = pendantHeight(config);
  const freeform = config.shape === "freeform";

  return (
    <Section>
      <SectionTitle>Pendant settings</SectionTitle>

      <SegRow>
        {SHAPES.map((s) => (
          <SegButton key={s.id} $active={config.shape === s.id} onClick={() => setShape(s.id)}>
            {s.label}
          </SegButton>
        ))}
      </SegRow>

      <SliderField
        label={freeform ? "Object size" : config.shape === "circle" ? "Diameter" : "Width"}
        value={config.width}
        min={10}
        max={60}
        onBegin={beginEdit}
        onChange={(v) => updateConfig({ width: v }, false)}
      />
      {config.shape === "rectangle" && (
        <SliderField
          label="Height"
          value={config.height}
          min={10}
          max={70}
          onBegin={beginEdit}
          onChange={(v) => updateConfig({ height: v }, false)}
        />
      )}
      {freeform && <Hint>The outline follows the object's contour with the border below.</Hint>}

      <SliderField
        label="Border thickness"
        value={config.border}
        min={0.5}
        max={4}
        step={0.1}
        onBegin={beginEdit}
        onChange={(v) => updateConfig({ border: v }, false)}
      />
      <SliderField
        label="Material thickness"
        value={config.thickness}
        min={0.5}
        max={5}
        step={0.1}
        onBegin={beginEdit}
        onChange={(v) => updateConfig({ thickness: v }, false)}
      />
      <SliderField
        label="Relief height (3D)"
        value={config.relief}
        min={0}
        max={3}
        step={0.1}
        onBegin={beginEdit}
        onChange={(v) => updateConfig({ relief: v }, false)}
      />
      <SliderField
        label="Hole diameter"
        value={config.hole.diameter}
        min={1}
        max={5}
        step={0.1}
        onBegin={beginEdit}
        onChange={(v) => updateHole({ diameter: v }, false)}
      />
      <SliderField
        label="Hole offset X"
        value={config.hole.x}
        min={-config.width / 2}
        max={config.width / 2}
        step={0.1}
        onBegin={beginEdit}
        onChange={(v) => updateHole({ x: v }, false)}
      />
      <SliderField
        label="Hole offset Y"
        value={config.hole.y}
        min={-H / 2 - 10}
        max={H / 2}
        step={0.1}
        onBegin={beginEdit}
        onChange={(v) => updateHole({ y: v }, false)}
      />
      <Hint>The hole is kept clear of the object automatically.</Hint>

      <GhostButton onClick={refit} disabled={!hasObject}>
        Auto-fit object
      </GhostButton>
    </Section>
  );
}
