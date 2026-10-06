# Implementation plan

Current design intent. See `documentation/decisions.md` for *why*, and `README.md`
for what is true now.

## Goal

Water that **reads as water** in a chunked tile world: animated, lit, and cheap
enough to run in a scrollable 3D tilemap on a phone.

Concretely, when this is done:

- A water tile's surface ripples continuously, and the ripples move in a
  direction, not just on the spot.
- The water **darkens with the scene's light level** and picks up the sun and the
  sky, so it looks different at noon and at night and does not read as a glowing
  decal.
- Water meets land with a **shoreline** — a soft edge and some foam — rather than
  ending at a hard tile boundary.
- It is drawn as part of the **chunk** system, so it culls with its chunk and
  costs one draw call per chunk that contains water.
- The old refractive plane is gone, along with its two extra full-scene renders
  per frame.
- A host app describes water **by data** (`color`, `waveSpeed`, `foam`, …) and
  can add a second liquid (lava, slime) without engine changes.

You would know it works by looking at it in a host app with a coastline, at
night as well as by day, at two zoom levels, and by the frame-time measurement in
Milestone 3.

## Non-goals

- **No refraction and no reflection render targets.** Out of scope. The measured
  cost (see decisions) is two extra scene renders per frame, and it is the thing
  being removed.
- **No volumetric water, waves with height, or flow simulation.** The surface is
  flat with animated shading; a water tile does not move.
- **No changes to the simulation or the tile data.** The engine consumes an
  `isWater` flag on a tile; what water *means* is the host app's business.
- **No new dependency.** Anything needed is already in three.js.

## What is true today (so the plan is not read as a blank slate)

- `setWater(color, zPos)` builds a `Refractor` on a `PlaneGeometry(64, 64)` — 32
  tiles — anchored to the camera. Two problems, both measured: it is far too
  small for a large world, and it **does not draw water at all at any height**
  (a 480-tile world painted black over 67% of the frame at the engine's own
  level, and never lifting the blue fraction above the no-plane baseline).
  Whether it is constructed is also a race, because its trigger lives inside
  `doWorkCanvasChunk` and fires only when a chunk is re-added.
- `setSimpleWater(options)` is a plain `ShaderMaterial` mesh, also a single
  camera-relative plane. It does draw water, and it is **unlit**: its fragment
  shader has no lighting term at all, which is why it reads as too bright and
  unresponsive to the scene. It also keeps a `Refractor`-free but absolute
  position and cannot follow the camera by itself.
- **The two chunk paths disagree about water geometry, and this is the
  load-bearing fact for the whole plan.** The **legacy** path already collects
  water separately (`waterPositions`, `waterNormals`, `waterUvs`, `waterIndices`)
  and builds a **second mesh per chunk** with its own material
  (`curAtlasWaterMaterial`, a transparent `MeshStandardMaterial`). The **canvas**
  path does not: it pushes water quads into the *same* arrays as land, in the
  same draw, and in canvas mode a chunk's surface is a **baked texture**, not
  geometry. An animated material cannot animate a baked canvas. So canvas mode
  cannot have animated water until water tiles are emitted as their own mesh.

## Milestones

### 1 — Water becomes its own per-chunk mesh in canvas mode

**IMPLEMENTED 2026-10-06, in a host app's patched copy — see the last entry of `decisions.md`.** The code
is not in this repository yet; this section stands as the design it was built to.

**What "done" means:** in canvas mode, a chunk containing water produces two
meshes: the land/canvas mesh as today, and a water mesh holding one quad per
water tile, with correct uvs, drawn with its own material. A chunk with no water
produces no second mesh. The land canvas must stop drawing the water tile's
surface, or the water is drawn twice.

**How it is verified:** a chunk containing known water tiles reports two meshes
and the water mesh's vertex count matches `4 × waterTiles`; a chunk with no water
reports one. Then look at it: the coastline must be unchanged from today, because
this milestone changes structure, not appearance.

**Risk:** this touches the hot path (`doWorkCanvasChunk`). The existing uv bug in
that same branch is a reminder that it fails silently — the buffers stayed equal
in *count* while being wrong. Any change here needs a buffer-length assertion, not
just a picture.

**Two facts that make this milestone riskier than it looks, both found while
preparing it:**

1. **This package has no test suite.** `package.json` has a `build` script and no
   `test` script, and there is no test directory. So there is nothing to run
   before and after, and every claim about this milestone has to come from
   counting buffers in a live build. That is the strongest argument for making
   Milestone 1 a **structural** change with a countable assertion —
   `waterTiles × 4 === waterPositions.length / 3` — rather than a change that can
   only be judged from a screenshot.
2. **The water branch sits inside the per-face loop.** The branch is inside
   `for (const {dir, corners, uvRow, altcorners, slopes, smdepress} of
   TEXTURE_FACES)`, so a water tile pushes a quad at
   `(pos[0] + x, (pos[1] + y) - 1, pos[2] + z)` **once per face that is not
   skipped**, with that face's `dir` as the normal — overlapping, coplanar quads
   rather than one surface quad per water tile. *Read from the source; how many
   quads a water tile actually emits has not been counted.* If it is more than
   one, "one quad per water tile" in this milestone is a correction to existing
   behaviour and not a port of it, and the change should be measured against that
   count first.

### 2 — The lit liquid material

**IMPLEMENTED 2026-10-06, in the same patched copy**, as `src/water.js`. The two opens below were settled
in the direction of *supporting both*: the material takes an optional scrolling normal map and falls back
to noise, so the noisy-versus-textured question is a per-host choice rather than a decision this engine
has to make. The world-space anchoring and the camera-derived view direction were both done as required.
The lighting open was answered by reading `ambientLight`/`hemisphereLight`/`sunAngle`/`sunColor` on the
instance, with a standing ambient floor because `hemiBrightness` is `0` until `setSky` is called.

**What "done" means:** a water mesh draws with a material that is animated by
time and lit by the scene. The shader is adapted from the reference implementation
in My Colony (`src/scroll2d-gen2.js`), which does exactly this and is the pattern
the user pointed at: simplex-noise ripple → a normal derived from it → a
directional sun with a specular glint → a Fresnel mix toward sky colour → shore
foam on a soft edge → everything multiplied by a scene light level. Include
point-light support only if a host app asks for it; the reference has it and it is
the most expensive part.

**How it is verified:** in a host app, the same view is captured at day and at
night and the water must be visibly darker at night; the sun glint must move when
the sun's angle changes; and a shoreline capture must show foam. Plus the
Milestone 4 look check.

**Risks and the opens, deliberately unresolved:**
- **OPEN — noise versus texture normals.** The reference generates its ripple with
  simplex noise evaluated per fragment, two or three octaves. My City already
  ships a `water-height.png` and a `waterdudv.jpg`, so two scrolling normal-map
  samples would be much cheaper and would match the art the host app already has.
  Which is affordable at full-screen coverage on a phone is **a measurement, not
  an argument**.
- **OPEN — the coordinate space for the animation.** The reference works in a 2D
  tile space where the surface is a flat plane and the view direction is fixed
  top-down. This engine has a rotatable, tiltable camera, so `vUv`-style animation
  would swim when the camera rotates. The ripple must be anchored in **world**
  space, and the view direction must come from the camera, not a constant.
- **OPEN — lighting source.** The engine already owns an `ambientLight` and a
  `directionalLight` with shadow support and a `setSky` API, so the sun's colour
  and angle exist and should be read from there rather than duplicated. How the
  material gets the *current* sun is an API question for Milestone 3.

### 3 — The public API, and the plane removed

**PARTLY IMPLEMENTED 2026-10-06**, in the same patched copy: `setLiquidType`/`getLiquidType` exist, the
plane is no longer built by the chunk path, and `setWater`/`setSimpleWater` are kept as decided rather
than removed. **Still to do here:** the wrappers do not yet delegate to the liquid API, so a caller that
uses them gets the old behaviour rather than a translation of it — which is deliberate until someone
decides whether that translation is even wanted.

**What "done" means:** a host app describes its liquids by data and the engine
does the rest:

```
engine.setLiquidType("water", { color, waveSpeed, waveScale, distortion, foam,
                                flowX, flowY, lightResponse, minOpacity, ... });
```

The engine ticks the animation clock and pushes the scene's light level and sun
into the material itself, once per frame, for the whole scene rather than per
chunk. `setWater` and `setSimpleWater` are then either removed or reduced to
thin wrappers, decided in Milestone 3 by how the host apps actually call them.

**How it is verified:** two liquids defined at once (water and lava) draw
differently from the same engine; changing a definition's colour live changes the
water; and no caller in a host app breaks silently — every removed entry point
either fails loudly or is kept.

**Risk:** `setWater`/`setSimpleWater` are public and used by more than one app in
the family. **Decided 2026-10-06: they become deprecated wrappers, and nothing is
deleted in the same change that adds the new API** — this is a versionless git
dependency, so a removed method breaks consumers at their next install rather than
at a version boundary.

### 4 — Performance, measured

**What "done" means:** a recorded frame time for a full-screen view over water, at
two device classes, with the number of draw calls and the shader's cost known
rather than guessed. The target device named by the host app is a Pixel 6a;
nothing has been measured on one.

**How it is verified:** the engine's own frame timing on the host app's real city
at a fixed camera, with `--use-gl=swiftshader` explicitly **not** used as the
basis for a conclusion, since a software rasteriser has already produced a
misleading result once in this family.

## Open questions

- **~~Which look is the target?~~ Answered 2026-10-06: there is no single look to
  choose, because every appearance value is a parameter the host app supplies.**
  The defaults come from the reference implementation; they are defaults, not the
  design. See `decisions.md`, 2026-10-06.
- **~~Does the plane get deleted or kept?~~ Answered 2026-10-06: both entry points
  are kept as deprecated wrappers and removed later.**
- **Water level and freeboard.** Whether water sits flush with the land's top face
  or one unit below it is currently the host app's terrain layer's business. If
  the material gets its own notion of level, the two can disagree.
