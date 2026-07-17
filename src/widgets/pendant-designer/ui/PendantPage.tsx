import { usePendant } from "../model/store";
import { PendantCanvas } from "./PendantCanvas";
import { Pendant3DViewer } from "./Pendant3DViewer";
import { Toolbar } from "./Toolbar";
import { UploadArea } from "./UploadArea";
import { SettingsPanel } from "./SettingsPanel";
import { MeasurementsPanel } from "./MeasurementsPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import {
  Body,
  Brand,
  CanvasArea,
  CanvasOverlay,
  EmptyState,
  NavLink,
  OverlayCard,
  PageShell,
  ProgressFill,
  ProgressTrack,
  Side,
  Spinner,
  Tagline,
  TopBar,
  TopSpacer,
} from "./styles";

/** /pendant — design a cast pendant from an uploaded image: AI background
 *  removal → contour silhouette → editable 2D pendant with live measurements
 *  and SVG/PNG/DXF/JSON export. */
export function PendantPage() {
  const status = usePendant((s) => s.status);
  const progress = usePendant((s) => s.progress);
  const hasObject = usePendant((s) => s.silhouette !== null);
  const viewMode = usePendant((s) => s.viewMode);
  const hasStl = usePendant((s) => s.importedStl !== null);

  return (
    <PageShell>
      <TopBar>
        <Brand to="/">CAIRN</Brand>
        <Tagline>Design your pendant</Tagline>
        <TopSpacer />
        <Toolbar />
        <NavLink to="/mountains">Mountains →</NavLink>
        <NavLink to="/maps">maps →</NavLink>
      </TopBar>

      <Body>
        <Side $side="left">
          <UploadArea />
          <SettingsPanel />
          <MeasurementsPanel />
        </Side>

        <CanvasArea>
          {viewMode === "3d" ? <Pendant3DViewer /> : <PendantCanvas />}
          {!hasObject && !hasStl && status !== "processing" && viewMode === "2d" && (
            <EmptyState>
              <h2>Start with an image</h2>
              <p>Upload a photo — we'll cut out the object and cast it into a pendant.</p>
            </EmptyState>
          )}
          {status === "processing" && (
            <CanvasOverlay>
              <OverlayCard>
                <Spinner />
                <div>{progress?.message ?? "Processing image…"}</div>
                <ProgressTrack>
                  <ProgressFill
                    $pct={progress?.progress ?? 0}
                    $indeterminate={!progress || progress.progress === 0}
                  />
                </ProgressTrack>
              </OverlayCard>
            </CanvasOverlay>
          )}
        </CanvasArea>

        <Side $side="right">
          <PropertiesPanel />
        </Side>
      </Body>
    </PageShell>
  );
}
