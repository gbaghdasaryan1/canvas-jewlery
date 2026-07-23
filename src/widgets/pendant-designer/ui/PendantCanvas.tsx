import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
  Stage,
  Transformer,
  useStrictMode,
} from "react-konva";
import styled from "styled-components";
import { polygonBounds } from "@/shared/lib/geo2d";
import { objectOriginPx, outlinePathMm, pendantOutline } from "@/entities/pendant/lib/geometry";
import { usePendant } from "../model/store";
import { registerStage } from "../model/stageRegistry";

/** Canvas background — must match the hole punch fill so the chain hole reads
 *  as a real cutout. */
const BG = "#0f1114";
const OUTLINE_STROKE = "#dfe5ec";
const OUTLINE_FILL = "rgba(196, 202, 210, 0.12)";
const CONTOUR_STROKE = "#86b7d4";
const MIN_ZOOM = 1;
const MAX_ZOOM = 80;
const WHEEL_STEP = 1.08;

// keep Konva nodes in lockstep with store values (e.g. the hole snapping to
// its clamped, non-overlapping position while it is being dragged)
useStrictMode(true);

const CanvasHost = styled.div`
  position: absolute;
  inset: 0;
  background: ${BG};
  overflow: hidden;
`;

function useHtmlImage(url: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = url;
    return () => {
      el.onload = null;
    };
  }, [url]);
  return img;
}

function useContainerSize(): [React.RefObject<HTMLDivElement>, { w: number; h: number }] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** Editable 2D preview. The stage works in pendant millimetres; zoom is the
 *  stage scale, pan is the stage position — so 1 world unit is always 1 mm. */
export function PendantCanvas() {
  const design = usePendant((s) => s.design);
  const silhouette = usePendant((s) => s.silhouette);
  const showContour = usePendant((s) => s.showContour);
  const showOriginal = usePendant((s) => s.showOriginal);
  const showOutline = usePendant((s) => s.showOutline);
  const selected = usePendant((s) => s.selected);
  const stageScale = usePendant((s) => s.stageScale);
  const stageX = usePendant((s) => s.stageX);
  const stageY = usePendant((s) => s.stageY);
  const fitNonce = usePendant((s) => s.fitNonce);
  const setView = usePendant((s) => s.setView);
  const setSelected = usePendant((s) => s.setSelected);
  const updateObject = usePendant((s) => s.updateObject);
  const updateHole = usePendant((s) => s.updateHole);
  const beginEdit = usePendant((s) => s.beginEdit);

  const [hostRef, size] = useContainerSize();
  const stageRef = useRef<Konva.Stage>(null);
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const image = useHtmlImage(
    silhouette ? (showOriginal ? silhouette.originalUrl : silhouette.cutoutUrl) : null,
  );

  const { config, object } = design;
  const outline = useMemo(() => pendantOutline(design, silhouette), [design, silhouette]);
  const outlinePath = useMemo(() => outlinePathMm(outline, config.hole), [outline, config.hole]);
  const origin = useMemo(
    () => (silhouette ? objectOriginPx(silhouette) : { x: 0, y: 0 }),
    [silhouette],
  );
  const contourPoints = useMemo(
    () => (silhouette ? silhouette.mainContour.flatMap((p) => [p.x, p.y]) : []),
    [silhouette],
  );

  // the Stage mounts only once the container has a size, so re-register on
  // size changes — an empty dep list would capture the initial null forever
  useEffect(() => {
    registerStage(stageRef.current);
    return () => registerStage(null);
  }, [size.w, size.h]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    tr.nodes(selected && groupRef.current ? [groupRef.current] : []);
    tr.getLayer()?.batchDraw();
  }, [selected, silhouette]);

  const fitToScreen = useCallback(
    (w: number, h: number) => {
      const s = usePendant.getState();
      const b = polygonBounds(pendantOutline(s.design, s.silhouette));
      if (b.width === 0 || b.height === 0) return;
      const margin = 48;
      const scale = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, Math.min((w - margin * 2) / b.width, (h - margin * 2) / b.height)),
      );
      setView(scale, w / 2 - b.cx * scale, h / 2 - b.cy * scale);
    },
    [setView],
  );

  useEffect(() => {
    if (size.w > 0 && size.h > 0) fitToScreen(size.w, size.h);
  }, [fitNonce, size.w, size.h, fitToScreen]);

  const onWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;
      const s = usePendant.getState();
      const factor = e.evt.deltaY > 0 ? 1 / WHEEL_STEP : WHEEL_STEP;
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.stageScale * factor));
      const wx = (pointer.x - s.stageX) / s.stageScale;
      const wy = (pointer.y - s.stageY) / s.stageScale;
      setView(next, pointer.x - wx * next, pointer.y - wy * next);
    },
    [setView],
  );

  const onStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const target = e.target;
      if (target === target.getStage() || target.name() === "pendant-body") {
        setSelected(false);
      }
    },
    [setSelected],
  );

  const onStageDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (e.target !== stageRef.current) return;
      const s = usePendant.getState();
      setView(s.stageScale, e.target.x(), e.target.y());
    },
    [setView],
  );

  const syncObjectFromNode = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    node.scaleY(node.scaleX()); // keepRatio safety
    updateObject(
      { x: node.x(), y: node.y(), scale: node.scaleX(), rotation: node.rotation() },
      false,
    );
  }, [updateObject]);

  return (
    <CanvasHost ref={hostRef}>
      {size.w > 0 && size.h > 0 && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stageX}
          y={stageY}
          draggable
          onWheel={onWheel}
          onMouseDown={onStageMouseDown}
          onDragEnd={onStageDragEnd}
        >
          <Layer>
            {showOutline && (
              <Path
                name="pendant-body"
                data={outlinePath}
                fill={OUTLINE_FILL}
                fillRule="evenodd"
                stroke={OUTLINE_STROKE}
                strokeWidth={1.4}
                strokeScaleEnabled={false}
              />
            )}

            {silhouette && image && (
              <Group
                ref={groupRef}
                x={object.x}
                y={object.y}
                scaleX={object.scale}
                scaleY={object.scale}
                rotation={object.rotation}
                draggable
                onMouseDown={() => setSelected(true)}
                onDragStart={beginEdit}
                onDragMove={syncObjectFromNode}
                onTransformStart={beginEdit}
                onTransform={syncObjectFromNode}
                onTransformEnd={syncObjectFromNode}
              >
                <KonvaImage
                  image={image}
                  width={silhouette.maskWidth}
                  height={silhouette.maskHeight}
                  offsetX={origin.x}
                  offsetY={origin.y}
                  opacity={showOriginal ? 0.92 : 1}
                />
                {showContour && (
                  <Line
                    points={contourPoints}
                    closed
                    offsetX={origin.x}
                    offsetY={origin.y}
                    stroke={CONTOUR_STROKE}
                    strokeWidth={1.4}
                    strokeScaleEnabled={false}
                    listening={false}
                  />
                )}
              </Group>
            )}

            {showOutline && (
              <Circle
                x={config.hole.x}
                y={config.hole.y}
                radius={config.hole.diameter / 2}
                fill={BG}
                stroke={OUTLINE_STROKE}
                strokeWidth={1}
                strokeScaleEnabled={false}
                dash={[3, 2]}
                dashEnabled
                draggable
                onDragStart={beginEdit}
                onDragMove={(e) => updateHole({ x: e.target.x(), y: e.target.y() }, false)}
                onDragEnd={(e) => updateHole({ x: e.target.x(), y: e.target.y() }, false)}
              />
            )}

            <Transformer
              ref={trRef}
              keepRatio
              rotateEnabled
              enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
              anchorSize={8}
              anchorStroke={OUTLINE_STROKE}
              anchorFill={BG}
              borderStroke={CONTOUR_STROKE}
              rotateAnchorOffset={24}
            />
          </Layer>
        </Stage>
      )}
    </CanvasHost>
  );
}
