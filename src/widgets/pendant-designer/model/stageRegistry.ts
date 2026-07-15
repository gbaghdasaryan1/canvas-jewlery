import type Konva from "konva";

/** The mounted Konva stage, exposed for PNG export. Kept outside the zustand
 *  store because a Konva node is not serializable state. */
let stage: Konva.Stage | null = null;

export function registerStage(s: Konva.Stage | null): void {
  stage = s;
}

export function getStage(): Konva.Stage | null {
  return stage;
}
