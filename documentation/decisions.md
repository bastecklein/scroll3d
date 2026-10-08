# Decisions

Why things are the way they are. Append-only, newest last. Something true
*now* belongs in `README.md`, not here — this file records *why*.

## 2026-10-06 — The water quads' uvs are computed from `topTxX`/`topTxY`, not from `useTop`

**Decided:** the water branch of `doWorkCanvasChunk` pushes uvs as
`uvs.push(topTxX + uv[0] * txPerW, topTxY + uv[1] * txPerH)` — the same two
lines the non-water branch below it already runs.

**Why this needs recording, because the obvious fix is wrong.** The branch
previously pushed four positions and four normals per quad and no uvs at all,
and the code that would have computed them was sitting right there commented
out. Uncommenting it does not work, and the reason is a name collision that is
invisible at the call site:

- In the **legacy** chunk path (`useTop = defTop`, assigned from
  `getTextureIndex`), `useTop` and `waterTop` are **numeric atlas indices**. The
  commented-out formula `(tx + uv[0]) * utx / totalAtlasSize` is written for
  that, and it works there — see the live copy of it in the legacy water path.
- In **`doWorkCanvasChunk`**, `useTop` is a **texture *name*** —
  `obj.top || defTx.top` — and is passed to `loadTileImageAsync` as an atlas
  key. So `(tx + uv[0])` concatenates a string with a number and evaluates to
  `NaN`, and every water uv would be `NaN`.

The canvas path has its own correct representation of the same thing:
`topTxX`/`topTxY`, produced by `imgCoordToUV` a few lines above the branch. Those
are what the non-water path uses, and that is why the fix copies the non-water
path rather than the legacy one.

**Consequence to know about:** the two chunk paths do not share a texture
vocabulary. `useTop` means *index* in one and *name* in the other, so any
formula (or any copy of a formula) that moves between them silently produces
`NaN` rather than an error. Worth checking on sight in future porting.

**Not decided here, and left `OPEN`:** the refractive water plane. `setWater`
constructs it with a hardcoded `PlaneGeometry(64, 64)` — 32 tiles — and a level
of `1.8` which its `position.set(..., zPos * 2, ...)` doubles, so it sits above
the land. Whether the plane's extent and level are the only remaining blockers
is not established, and no values are proposed here because they need measuring
rather than guessing.

**Resolved (2026-10-06):** the blockers are established, and they are not
"extent and level". See the entry below. The plane is not repairable by
choosing different numbers.

## 2026-10-06 — The refractive plane is replaced, and water becomes a lit per-tile material

**Decided:** the `Refractor` plane goes, and water is drawn instead as a
**per-tile surface on its own mesh per chunk**, using a **lit, time-animated
material described by data**. `setWater`'s plane and `setSimpleWater`'s plane are
both retired once the replacement lands; `setSimpleWater` is the nearer of the
two to the destination, because it is a plain `ShaderMaterial` rather than a
`Refractor`, but it is unlit and that is precisely its defect.

**Why the plane cannot be fixed by changing its numbers.** Measured in a host app
through the real camera, by the agent that reported it (`my-city`,
`tools/water-review.mjs`, 23/23, and `tools/water-interaction-probe.mjs`):

- **It does not draw water at any height.** Pinned under the camera, near-black
  against a 1.10% no-plane baseline: **67.27%** at its own level (world y 3.6),
  **41.07%** at y 2.0, **39.82%** at y 1.7, **38.27%** at y 1.0, back to baseline
  at y 0. **The blue fraction never rises above the no-plane baseline at any of
  them.** It is black high and invisible low, so "its level is wrong" is not a
  fixable version of this defect.
- **It does not draw its configured colour either.** Constructed with a magenta
  colour, it produced **0.00% magenta** in both the orthographic and the
  perspective camera. The camera is therefore ruled out, which matters because
  the obvious first guess was that the plane dislikes an orthographic camera.
- **It is 32 tiles in a 480-tile world**, which cannot represent the water even
  when it draws.
- **It costs two extra full-scene renders per frame.** `Refractor` re-renders the
  scene into render targets in its `onBeforeRender`, and the engine's own wrapper
  sets `renderer.autoClear = true` and disables XR around that call. This is the
  cost being removed, and it is why a forward-shaded transparent material is the
  replacement rather than a better `Refractor`.
- **Its trigger is a race.** `hasWater && instance.waterTexture &&
  !instance.waterPlane` is evaluated *inside* `doWorkCanvasChunk`, so it fires only
  for a chunk being **re-added** with the texture already set. A fresh scene
  therefore may or may not have a plane, and a host app cannot tell which it will
  get. One host measured both outcomes in the same build.
- **Its position is corrected on the first camera move, which is what makes the
  defect visible.** `setWater` writes `(centerPosition.x * 2, zPos * 2,
  centerPosition.y)` — the last term **not** doubled — while `setCameraPosition`
  ends with `normalizeWaterPosition`, which writes `centerPosition.y * 2`. So the
  plane is built half a world away and invisible, and the first click or scroll
  snaps it under the camera at world y 3.6 — **above** the land — where it paints
  black over the middle of the view and is re-centred on every further scroll.
  Recorded because the first write-up of this had the correction backwards, and
  the *user's* observation is what caught it: *"that large black plane shows up
  immediately once i interact with the scroll3d engine, like if i click or
  scroll, then it shows up and just stays there in the middle."* Reproduced: the
  frame is at baseline on entry and **67.48% near-black** after camera movement.

**Why per-tile rather than one plane, and why the two chunk paths matter.** A
plane cannot represent a world's water at the sizes involved, it has to be
re-anchored to the camera, and it cannot know where the shore is. A water tile
already knows: the engine tests its neighbours for `isWater` while building a
chunk. Per-tile also means a chunk's water culls with the chunk.
**The load-bearing detail is that the two chunk paths disagree.** The **legacy**
path already collects water into `waterPositions`/`waterNormals`/`waterUvs`/
`waterIndices` and builds a **separate mesh per chunk** with its own material
(`curAtlasWaterMaterial`). The **canvas** path does not — it pushes water quads
into the same arrays as land, and in canvas mode a chunk's surface is a **baked
texture rather than geometry**, which no material can animate. So the legacy path
already has the right *structure* and the canvas path does not, and that is the
first thing to change.

**Why a *lit* material, and why `setSimpleWater` reads as it does.** A host app
reported that `setSimpleWater` "looks so bad — it glows too bright, doesn't react
with lighting". That follows from the source: its fragment shader has **no
lighting term at all** — no sun, no ambient, and no uniform carrying the scene's
light level — so it renders the same at midnight as at noon. The pattern to
follow instead is the one the same author already shipped in **My Colony**
(`src/scroll2d-gen2.js`), which is a data-described liquid with simplex-noise
ripples, normals derived from the noise, a directional sun with a specular glint,
a Fresnel mix toward sky colour, shore foam on a soft edge, and everything scaled
by a scene light level. That file is the reference for the shader.

**What is explicitly not carried over from the reference.** Its view direction is
a hardcoded top-down constant and its animation runs in the surface's own 2D uv
space. This engine's camera rotates and tilts, so both must change: the ripple has
to be anchored in **world** space or it will swim when the camera turns, and the
view direction has to come from the camera. That is a real piece of work, not a
copy.

**Also decided: the replacement is specified by data, not by engine constants.**
A host app supplies a liquid definition — colour, wave speed and scale,
distortion, foam, flow direction, light response, opacity — and can define more
than one liquid. The engine owns the clock and the scene light level and pushes
them in; the app owns the look.

**Not decided here, and left `OPEN`:** whether to **remove** `setWater` and
`setSimpleWater` or keep them as wrappers, since this package is a versionless git
dependency and removing a public method breaks every consumer at its next install
rather than at a version boundary. **Also `OPEN`:** noise versus scrolling normal
maps, and the target look — see `documentation/implementation-plan.md`, whose
milestones and opens this decision hands the work to.

**Verification of the claims above:** they are another repository's measurements
(`my-city`, 2026-10-06), reproducible with `tools/water-review.mjs` (23/23) and
`tools/water-interaction-probe.mjs` there. Nothing in this repository was changed
by the investigation, and no code was written here for this decision — it records
what was decided, not what was built.

## 2026-10-06 — The water look is entirely parameters, and the old entry points stay as wrappers

**Decided:** three things, answering the opens above.

1. **Every appearance value is a parameter supplied by the host app**, not a
   constant in this engine. Colour, emissive, wave speed and scale, distortion,
   foam, flow direction, light response, point-light response, minimum light,
   opacity, viscosity — the full set the reference implementation already uses —
   and more than one liquid can be defined at once. The engine owns only the
   clock, the scene's light level, the sun, and the geometry.
2. **The old entry points are deprecated wrappers, not deletions.** `setWater` and
   `setSimpleWater` keep working until every consumer has moved, at which point
   they are removed. Nothing is deleted in the same change that adds the new API.
3. **Work proceeds as milestones 1 and 2** of `documentation/implementation-plan.md`
   — water as its own mesh per chunk in canvas mode, then the lit material — and
   then a host app is pointed at it so the result can be looked at.

**Why the look is parameterised rather than tuned in.** The user's requirement, in
their words: *"i like your recommended suggestion, but i think it should be tunable,
like all of the settings should be parameters that can be modified, so that the
system works in more projects than just my city."* That is the right shape for a
library regardless of the look chosen, because this package has several consumers
in the family and the previous design failed precisely by baking a look in — a
hardcoded `PlaneGeometry(64, 64)`, a hardcoded level of `1.8`, a hardcoded colour.
**It also settles the `OPEN` about the target look:** the answer is not one look,
so nothing needs to be guessed up front. My Colony's values are the *default*s, not
the design.

**Why the old entry points survive.** This package is a versionless git
dependency, so a removed public method does not break consumers at a version
boundary — it breaks them at their next `npm install`, silently, in apps that may
not be in front of us. Deprecating first costs one small wrapper each and makes
the eventual removal an event we choose rather than one we discover.

**Consequence for the material's uniform set.** Because the look is data, the
material must be created per liquid definition rather than shared globally, or it
must take the definition as uniforms. A single material per liquid id, reused by
every chunk and updated once per frame, is the intended shape — one draw call per
chunk, one uniform tick per frame, not one per chunk.

**Still `OPEN`, and unchanged by this entry:** noise versus scrolling normal maps
for the ripple (the biggest single cost in the material, and a measurement rather
than an argument); how the material reads the live scene light level and sun from
the engine's existing `ambientLight`/`directionalLight`/`setSky` state; and whether
anything is affordable on the named target device, a Pixel 6a, where nothing has
been measured.

## 2026-10-06 — The liquid system is implemented and verified; the code currently lives only in a host app's patched copy

**Decided, and worth recording because the code is not in this repository yet:** the rework described in
the two entries above is **built and measured**, but it was written **in a host app's own copy of this
package under `node_modules`** (My City), on that app's instruction, so that a look could be iterated on
quickly with the option to discard the whole thing. The change is preserved as a patch there
(`documentation/patches/scroll3d-liquid-water.patch`, 982 added lines) and **nothing in this repository's
`src/` has been modified.** Upstreaming it is a decision still to be made, and the patch applies plainly
to an LF working copy.

**What was built, so this repository's plan is not read as unstarted.** Milestones 1 and 2 of
`implementation-plan.md`, plus the data-driven API of milestone 3:

- A new module, `src/water.js`: the liquid material, its definition defaults, normalisation, and the
  per-frame uniform tick.
- The **canvas** chunk path now collects water into its own buffers and builds a **second mesh per chunk**
  with its own material, which is the structural change the legacy path already had and the canvas path
  did not. A water chunk's uvs are therefore no longer shared with the land's, so the uv
  desynchronisation recorded in the first entry of this file cannot recur.
- `setLiquidType(id, definition)` and `getLiquidType(id)`; a tile names its liquid with
  `{ isWater: true, liquid: "lava" }`, and `isWater` alone means `"water"`, which is always defined so an
  app that does nothing still gets water.
- The refractive plane is **no longer built by the chunk path**. `setWater` and `setSimpleWater` remain,
  as decided above, for a caller that invokes them directly.

**Four integration facts that cost real time and would cost it again, so they are written down here
rather than left in the patch.** Each is a property of *this* engine that a liquid material has to
respect:

1. **A raw `ShaderMaterial` gets no output colour conversion.** This engine renders to
   `SRGBColorSpace`, and every other surface is converted by three's own material chunks. A raw shader
   that omits `#include <colorspace_fragment>` has its linear output displayed as though it were already
   sRGB, which lifts a mid blue to a pale cyan. This was the single largest cause of the first version
   rendering grey rather than blue — fixing it moved the blue fraction of a frame from **1% to 46.6%**.
2. **`UV_TEXT_MIN`/`UV_TEXT_MAX` are `0.01`/`0.99`, not `0`/`1`.** Every tile quad's uvs are inset, so
   any shader reasoning about a tile's *edges* from `uv` is off by that inset. A shoreline computed
   naively is displaced by about a fifth of a sensible foam width.
3. **`hemiBrightness` is `0` until `setSky` is called, and a host app may never call it.** My City does
   not, so a material that takes its light level purely from `hemiBrightness` renders nearly black there.
   A material that wants to be legible in every host needs a standing ambient floor of its own.
4. **`removeObjectFromThree` disposes a mesh's material unconditionally.** A material *shared* between
   chunks — which is the whole point of one material per liquid — is destroyed by the first chunk
   removal unless the mesh sets `userData.preserveMaterial`. The symptom is delayed and confusing: every
   water chunk goes black, but only after the player scrolls far enough to evict one.

**Measured behaviour, on a real city in a real browser** (My City, 480×480 world, orthographic camera):
12 water chunks each with their own mesh and every buffer in step; `engine.waterPlane` null; a
click-and-drag on the map leaving **0.57%** of the frame near-black where the old plane left **67.48%**;
and liquid luminance falling **97.2 → 61.6 (−36.6%)** from noon to night, which is the property the old
`setSimpleWater` could not have — its fragment shader has no light term at all.

**Still `OPEN`, and none of it is settled by the above:** whether to upstream this patch or discard it;
whether the ripple should come from noise or from a scrolling normal map, which is the material's largest
cost and has not been compared; and whether anything here is affordable on the named target device, a
Pixel 6a, where **nothing has been measured** — the captures above came from a software rasteriser, which
has already produced one misleading conclusion in this family. Nothing has watched the water animate
either; only stills were judged.

## 2026-10-06 — A sparkle term is added, and the water surface is placed at `altcorners` rather than at `usecor`

Two corrections to the liquid system, both from a host app playing it. The code is still only in that
app's patched copy, as recorded above; **nothing here is in this repository's `src/` yet.**

**1. The surface height is `altcorners`, and this is the one place the legacy path was already right.**
`TEXTURE_FACES`' top entry carries `corners` at `pos.y` 1 and `altcorners` at `pos.y` **0.9**, and the
legacy water block hardcodes `altcorners` with a `uvRow != 2 → continue` guard. The canvas path already
used `altcorners` for a *land* tile's top face too (`usecor = altcorners` for `obj.isWater && y == floorZ`),
so the floor under a water tile was already ten percent lower than its neighbours. The liquid was the
thing disagreeing — it was pushed a whole unit further down, half a tile below the floor it covered.

**Reading `usecor` instead of naming `altcorners` is the mistake worth recording.** It looks like the right
source — it is the same variable the land is drawn from, so it cannot disagree — but it is *overwritten*
just above by the `isDepressed` and `slope` checks, so a tile carrying either resolves to a corner set
whose `pos.y` runs 1..2. A first attempt that read it measured the surface at 2.0 instead of 1.8. The
lesson is narrow and useful: when a variable is the result of several rules, a consumer that wants one
specific case should name that case rather than inherit the resolved value.

**2. A water tile is one quad, and the branch had to say so explicitly.** The per-face skip logic in
`doWorkCanvasChunk` decides whether water and land *meet*; it does not filter by face, so the water
geometry was emitted once for every face of every layer down to the floor. A `uvRow === 2 && y === floorZ`
guard, which is exactly the legacy path's rule, took a real scene from **8334 water quads to 1389** — six
to one, so five of every six were coincident duplicates in the same place. **It was invisible**: coincident
coplanar quads z-fight with each other and average out to the same surface, so the only evidence was the
count.

**3. The sparkle, and the four ways it was got wrong first.** A glint — small bright points where the
surface throws the sun back — is now three dials (`sparkle`, `sparkleScale`, `sparkleThreshold`) at
0.35 / 1.4 / 0.80, gated on the glint direction and on the sun's own contribution so it vanishes after
dark. The failures:

- **A product of two small fields raised to a power is still small.** Multiplying two centred distortion
  channels and raising to the 12th drew nothing (0.1 to the eighth is one in a hundred million). A
  threshold on value noise replaced it, which also makes the lit fraction a number rather than an
  emergent property.
- **Value noise clusters around 0.5.** Bilinear interpolation averages four lattice values per sample, so
  it has a standard deviation near 0.14 and a threshold of 0.84 fires on almost nothing. Usable range is
  roughly 0.65–0.80. **This is a trap for any consumer of `vnoise`-style functions in a shader.**
- **A gate has to be checked against the angles the camera actually produces.** The glint direction for a
  top face is the halfway vector between the sun and the eye — about 0.59 at a 45-degree sun — so a
  `smoothstep(0.55, 0.95, …)` "selective" gate sat at the bottom of its ramp and the term never appeared.
- **Gating on the view direction alone produces a stripe, not a glitter path.** The view direction varies
  smoothly across a frame, so an exclusive gate is a hard-edged horizontal band. Real glitter is
  *weighted* toward the sun rather than exclusive to it; a floor of 0.2 on the gate fixed the band and was
  also the larger half of the effect.

**And one measurement that gave the wrong answer, which is the part worth carrying forward.** The sparkle
was initially judged by comparing noon and night and seeing *more* bright pixels at night — which is
nonsense for a sun glint, and was the metric counting pale **foam** rather than glints. The fix is a
control that turns the term off and re-captures the same frame at the same lighting, which showed it was
contributing nothing at all (brightest pixel 191.9 on, 192.0 off). With the term isolated it reads
**255 against 192 brightest, and 7.3% of the water band lit against 0.6%**. **Isolate the term you are
claiming, or you are measuring whatever else is bright.**

**Also worth knowing for anyone testing this engine headlessly:** a probe run killed part-way leaves its
dev server alive — killing the launcher does not kill what it spawned — and the next run then connects to
it and measures the *previous* build. The symptom is a change that appears to have no effect. The probe in
the host app now refuses to start when its port is already answering.

## 2026-10-06 — Superseded: the sparkle scale is put back after a host app caught the regression

**Corrects the entry above**, which recorded the sparkle at `sparkle` 0.35 / `sparkleScale` 1.4 /
`sparkleThreshold` 0.80 with a floor of 0.2 on the glint gate. **All four are reverted**, to
**0.45 / 3.0 / 0.78 with no floor on the gate.** The entry above is left as written, because the reasoning
in it is what produced the mistake.

**`sparkleScale` 3.0 → 1.4 was the damage and is the transferable part.** It was lowered to reduce
far-distance speckle aliasing: procedural noise has no mip levels, so at a distance where many tiles fall
into a few pixels the field aliases into a band, and larger glints genuinely do not alias as badly. **All
of that is true, and the result looked worse**, because this value is the *reciprocal* of the glint size —
halving it makes every highlight **2.14× wider and 4.6× the area** — so the glints stopped reading as
points of light and became pale blobs. **The wavelength is `1/sparkleScale`; larger value means smaller
glint, which is the opposite of what the name suggests to anyone tuning it in a hurry.**

**The metric could not see it, which is why it shipped.** Lit coverage moved **6.5% → 9.9%** and the spot
*count* went down, both of which the tuning loop read as fine. **Coverage measures how much of the surface
is lit and says nothing about how large each lit spot is**; there was no size metric at all until it was
measured afterwards. At 3.0 the glints measure a **median 2.2 px across** in a 360×200 crop; at 1.4 they
are about **4.7 px**, 4.6× the area. **If a look is rejected for a reason the metrics do not name, derive a
metric for that reason before changing the value.** Three of the four shader findings in the entry above
came from measuring; this one was *caused* by measuring the wrong quantity.

**Also reverted:** the glint gate's floor of 0.2, back to plain `smoothstep(0.0, 0.6, …)`. It was added to
soften a hard-edged band where the gate crosses its ramp, and it did that, but it also **roughly doubled
the lit coverage** (6.5% → 11%) and so was a larger contributor to the same complaint. **It is the right
knob if the band edge is ever the actual objection, at about twice the coverage.**

**Still open and unchanged by this:** far-distance sparkle aliasing is real. Procedural noise has no mip
levels, so it needs a **distance fade written as a function of distance** — there is no texture mip chain
to lean on because the field is analytic — or a narrower threshold band. Larger near-field glints are not
the answer to it, as this change demonstrated.

## 2026-10-08 — Opt-in instancing for static bm objects

**Decided:** `addObject({ type: "bm", instanced: true, notHittable: true, ... })` draws the model through
shared `InstancedMesh` batches keyed by bmloader cache key, part index and a spatial cell of
`chunkSize * 2` tiles. The object keeps its own detached `Object3D` + cloned model purely to compose
each part's matrix, so positioning and rotation are identical to the standalone path. Objects whose
model has animations, contains lights/sprites/lines/points or ShaderMaterials, is hittable, or loads in
toy mode fall back to the standalone path. Removal is swap-with-last; batches grow by doubling and are
dropped when empty. Also removed a dead `Box3().setFromObject` in `normalizeObjectPosition` whose
result was immediately overwritten — it traversed the whole model on every move.

**Why:** a bm model is a Group of 2–9 meshes, so scenery placed per tile (My City's trees) produced
thousands of draw calls and tens of thousands of scene nodes. Measured in My City: 5,037 → 127 draw
calls and 15.9 → 1.1 ms per frame for ~2,800 trees. Opt-in rather than default because other host apps
rely on hit-testing, per-object materials or animation on bm objects.

**Cells:** a single batch per model would never be frustum-culled; per-chunk batches multiply draw
calls. Two chunks per cell is a middle value, not a measured optimum.

## 2026-10-08 — The per-frame object loop visits only objects that need updates

**Decided:** keep `activeUpdateObjects` as a Set containing only loaded animated bm models and
flickering point lights. Add/remove and async model-load paths maintain membership; clearing an
instance marks its objects disposed before releasing them, so a late model callback cannot revive
an object after teardown.

**Why:** the old render loop visited every object to discover that almost all had no animation or
flicker. Static scenery now opts into instancing, but vehicles and other host objects can still
produce many ordinary `bm` objects. The set makes frame work scale with animated/flickering objects
rather than total placed models, while preserving the existing distance and animation LOD checks.
The set was exercised in the browser with a static tree, an animated coal plant and a flickering
point light: only the latter two entered it, and removing them left it empty.
