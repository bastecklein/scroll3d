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
