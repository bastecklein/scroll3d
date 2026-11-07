# scroll3d changelog

## Unreleased - 2026-10-20

### Fixed

- Cache outline, line and tile-fill materials per engine instance. Rebuilding a
  placement preview no longer disposes cached GPU programs and recompiles them on
  the next frame. Geometry is still released on removal; cached materials are
  disposed when all objects are cleared. Line resolution updates stay instance-local.
- Regression checks: `node --test test/line-materials.test.mjs`.
- Standalone VPP meshes now center vertically using the model's measured
  bounding-box center. Bottom-anchored voxel models no longer render half a model
  height above their requested `z` when `isSymmetrical` is true. The center is
  captured during the bounds measurement that already happens at load, so there
  is no extra per-frame work. Regression checks:
  `node --test test/mesh-centering.test.mjs`.
- Hit-test registration ignores disposed objects and its delayed retry no longer
  resurrects a removed mesh. Removal also clears every occurrence of a mesh or
  object from the hit-test list, so a stale entry cannot swallow clicks.
- Standalone bm models measure their shadow-culling radius after the object's
  scale has reached the baked child transforms. Characters no longer lose their
  body, arm and leg shadows at scales other than 1. Regression check:
  `node --test test/mesh-bounds.test.mjs`.
- Canvas chunks dispose their two per-chunk `CanvasTexture`s when removed. A
  material's `dispose()` does not release its maps, so every unloaded canvas
  chunk previously leaked its diffuse and bump texture memory. Regression check:
  `node --test test/chunk-texture-lifecycle.test.mjs`.

## 1.1.0 - 2025-07-31

### Changed

- Massive updates from ROC work

## 1.0.2 - 2025-05-19

### Fixed

- Minor bug cleanup

## 1.0.1 - 2025-04-25

### Fixed

- Minor bug cleanup

## 1.0.0 - 2025-02-22

### Changed

- Refactored from managed script to module