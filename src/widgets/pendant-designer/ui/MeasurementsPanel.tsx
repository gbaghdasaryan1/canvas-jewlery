import { useMemo } from "react";
import { computeMeasurements, pendantOutline } from "@/entities/pendant/lib/geometry";
import { usePendant } from "../model/store";
import { MeasureGrid, Section, SectionTitle } from "./styles";

const mm = (v: number) => `${v.toFixed(1)} mm`;

/** Live dimensions — recomputed from the same outline the canvas and the
 *  exports use, so all three always agree. */
export function MeasurementsPanel() {
  const design = usePendant((s) => s.design);
  const silhouette = usePendant((s) => s.silhouette);
  const importedStl = usePendant((s) => s.importedStl);

  const m = useMemo(
    () => computeMeasurements(design, pendantOutline(design, silhouette)),
    [design, silhouette],
  );

  if (importedStl) {
    return (
      <Section>
        <SectionTitle>Imported STL</SectionTitle>
        <MeasureGrid>
          <dt>Width</dt>
          <dd>{mm(importedStl.size.x)}</dd>
          <dt>Height</dt>
          <dd>{mm(importedStl.size.y)}</dd>
          <dt>Depth</dt>
          <dd>{mm(importedStl.size.z)}</dd>
          <dt>Triangles</dt>
          <dd>{Math.round(importedStl.triangles).toLocaleString()}</dd>
        </MeasureGrid>
      </Section>
    );
  }

  return (
    <Section>
      <SectionTitle>Measurements</SectionTitle>
      <MeasureGrid>
        <dt>Pendant width</dt>
        <dd>{mm(m.width)}</dd>
        <dt>Pendant height</dt>
        <dd>{mm(m.height)}</dd>
        <dt>Border thickness</dt>
        <dd>{mm(m.border)}</dd>
        <dt>Material thickness</dt>
        <dd>{mm(m.thickness)}</dd>
        <dt>Hole diameter</dt>
        <dd>{mm(m.holeDiameter)}</dd>
        <dt>Material area</dt>
        <dd>{m.area.toFixed(1)} mm²</dd>
      </MeasureGrid>
    </Section>
  );
}
