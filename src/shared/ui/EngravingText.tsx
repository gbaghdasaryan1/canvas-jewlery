import { Text } from "@react-three/drei";

interface EngravingTextProps {
  /** The engraving string. Render nothing when blank. */
  text: string;
  /** Placement in the viewer's own coordinate space. For the curved (ring)
      variant this is the bottom-inside point of the band wall. */
  position: [number, number, number];
  /** Glyph height in the same units as `position`. */
  fontSize: number;
  /** Engraved-mark color — a dark tint reads as a laser burn on metal. */
  color?: string;
  /** Flat variant — orientation of the text plane. Ignored when `curveRadius`
      is set. */
  rotation?: [number, number, number];
  /** Flat variant — wrap width so long strings stay within the plate. Omit to
      lay the text out on a single line at its natural (max-content) width. */
  maxWidth?: number;
  /** Curved (ring) variant — wrap the text around a cylinder of this radius
      (the band's inner radius) so it follows the curved inner wall instead of
      stabbing through it as a flat plane. */
  curveRadius?: number;
}

/**
 * A text label laid onto a surface to preview a laser engraving — the back of a
 * pendant/bracelet (flat) or the inside of a ring band (curved). Purely visual:
 * the actual mark is a post-cast laser step, so this never enters the STL.
 * Shared by RingViewer and CityViewer so both previews render it the same.
 */
export function EngravingText({
  text, position, fontSize, color = "#20242a", rotation = [0, 0, 0], maxWidth, curveRadius,
}: EngravingTextProps) {
  const value = text.trim();
  if (!value) return null;

  // Ring: wrap the engraving around the band's inner cylinder. troika bends
  // each glyph around the text's local Y axis with the front face turning
  // toward the cylinder centre. The nested rotations map that onto the ring —
  // local Y → the finger axis, front face → the ring centre — and `position`
  // seats the mid-glyph at the bottom-inside of the wall.
  if (curveRadius != null) {
    return (
      <group position={position} rotation={[0, Math.PI, 0]}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Text
            // curveRadius is a valid troika-three-text prop (r3f sets it on the
            // mesh) but isn't in drei's Text typings — cast it through.
            {...({ curveRadius } as Record<string, unknown>)}
            fontSize={fontSize}
            color={color}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.02}
          >
            {value}
          </Text>
        </group>
      </group>
    );
  }

  return (
    <Text
      position={position}
      rotation={rotation}
      fontSize={fontSize}
      maxWidth={maxWidth}
      whiteSpace={maxWidth == null ? "nowrap" : "normal"}
      lineHeight={1.15}
      letterSpacing={0.02}
      color={color}
      anchorX="center"
      anchorY="middle"
      textAlign="center"
      overflowWrap="break-word"
    >
      {value}
    </Text>
  );
}
