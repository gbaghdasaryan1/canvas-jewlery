import { polygonBounds } from "@/shared/lib/geo2d";
import { pendantHeight } from "@/entities/pendant/lib/geometry";
import { usePendant } from "../model/store";
import { SliderField } from "./SliderField";
import { GhostButton, Hint, Section, SectionTitle, ToggleRow } from "./styles";

/** Right sidebar: transform of the object inside the pendant + view toggles. */
export function PropertiesPanel() {
  const design = usePendant((s) => s.design);
  const silhouette = usePendant((s) => s.silhouette);
  const updateObject = usePendant((s) => s.updateObject);
  const beginEdit = usePendant((s) => s.beginEdit);
  const showContour = usePendant((s) => s.showContour);
  const showOriginal = usePendant((s) => s.showOriginal);
  const showOutline = usePendant((s) => s.showOutline);
  const toggleView = usePendant((s) => s.toggleView);

  const { object, config } = design;
  const W = config.width;
  const H = pendantHeight(config);

  if (!silhouette) {
    return (
      <Section>
        <SectionTitle>Object</SectionTitle>
        <Hint>Upload an image to place an object inside the pendant.</Hint>
      </Section>
    );
  }

  const b = polygonBounds(silhouette.mainContour);
  const objectWidthMm = b.width * object.scale;
  const maxScale = 80 / Math.max(1, Math.max(b.width, b.height));

  return (
    <>
      <Section>
        <SectionTitle>Object</SectionTitle>
        <SliderField
          label="Position X"
          value={object.x}
          min={-W}
          max={W}
          step={0.1}
          onBegin={beginEdit}
          onChange={(v) => updateObject({ x: v }, false)}
        />
        <SliderField
          label="Position Y"
          value={object.y}
          min={-H}
          max={H}
          step={0.1}
          onBegin={beginEdit}
          onChange={(v) => updateObject({ y: v }, false)}
        />
        <SliderField
          label="Size"
          value={objectWidthMm}
          min={2}
          max={Math.max(60, W * 1.5)}
          step={0.1}
          onBegin={beginEdit}
          onChange={(v) =>
            updateObject({ scale: Math.min(maxScale, v / Math.max(1, b.width)) }, false)
          }
        />
        <SliderField
          label="Rotation"
          value={object.rotation}
          min={-180}
          max={180}
          step={1}
          unit="°"
          onBegin={beginEdit}
          onChange={(v) => updateObject({ rotation: v }, false)}
        />
        <GhostButton onClick={() => updateObject({ x: 0, rotation: 0 })}>
          Center horizontally
        </GhostButton>
        <Hint>You can also drag, resize and rotate the object right on the canvas.</Hint>
      </Section>

      <Section>
        <SectionTitle>View</SectionTitle>
        <ToggleRow>
          Pendant outline
          <input type="checkbox" checked={showOutline} onChange={() => toggleView("showOutline")} />
        </ToggleRow>
        <ToggleRow>
          Object contour
          <input type="checkbox" checked={showContour} onChange={() => toggleView("showContour")} />
        </ToggleRow>
        <ToggleRow>
          Original image
          <input
            type="checkbox"
            checked={showOriginal}
            onChange={() => toggleView("showOriginal")}
          />
        </ToggleRow>
      </Section>
    </>
  );
}
