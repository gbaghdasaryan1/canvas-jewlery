# Textures

## liquid-metal.jpg

The metal reflection (environment) map used by the 3D viewer and STL preview.

Save the liquid-metal / chrome image here as **`liquid-metal.jpg`**. It is
loaded at runtime by `SceneEnvironment` in
`src/widgets/ring-viewer/RingViewer.tsx` and applied as the scene's
equirectangular reflection map, so the cast piece mirrors it.

If the file is missing, the viewer silently falls back to a procedural
studio-gradient reflection — nothing breaks.

Recommended: a wide JPG (the source is ~5376×3584). Keep it under ~2 MB so it
loads fast; downscaling to ~2048px wide is plenty for reflections.
