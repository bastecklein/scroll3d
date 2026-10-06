/**
 * Liquid surfaces for scroll3d.
 *
 * A liquid is drawn as **its own material on its own mesh, per chunk**, rather than
 * as one camera-anchored plane. That is what lets it animate: a plane is a single
 * object that must be re-anchored as the player scrolls, and it cannot know where
 * the shore is, while a water tile already knows both its neighbours and its
 * position. It also means a chunk's water culls with the chunk, at one draw call.
 *
 * ## Why this module exists at all
 *
 * The engine's previous two water paths were both one plane: `setWater` builds a
 * `Refractor` (two extra full-scene renders per frame) and `setSimpleWater` builds a
 * `ShaderMaterial`. The second one draws water but **is not lit** -- its fragment
 * shader has no sun, no ambient and no scene-light term, so it renders the same at
 * midnight as at noon, which is exactly how it reads on screen: too bright, and
 * unresponsive to the time of day.
 *
 * This module is lit, and it is **entirely parameters**. Every appearance value
 * below can be supplied by the host app, and more than one liquid can be defined at
 * once, so the same engine can draw water, lava and slime without a code change.
 * The defaults are one set of values that look like water; they are defaults, not
 * the design.
 *
 * ## The two things that had to change from the reference implementation
 *
 * The shader is adapted from the liquid shader in My Colony
 * (`src/scroll2d-gen2.js`), which is the pattern this was asked to follow. Two
 * things could not be copied:
 *
 * 1. **Its view direction is a constant**, `vec3(0, 0, 1)`, because that renderer
 *    looks straight down. Here the camera rotates and tilts, so the view direction
 *    is computed from the camera's own position, and the ripples are anchored in
 *    **world** space -- in the reference's surface-uv space they would swim when the
 *    camera turned.
 * 2. **It renders to an opaque surface it owns.** Here water is a tile recessed into
 *    the terrain, so the surface below it is the water's own geometry rather than
 *    solid ground. That is why `opacity` defaults to `1` -- see the note on
 *    `transparent` in `createLiquidMaterial`.
 *
 * ## Not here, and deliberately
 *
 * No refraction or reflection render target: the two extra scene renders are the
 * thing being removed. No vertex displacement either -- the reference displaces its
 * plane, but here each water surface is one tile quad, so displacing its corners
 * would open seams between neighbouring water tiles instead of making a wave. The
 * surface stays flat and the wave is shaded.
 */

import {
    Color,
    DoubleSide,
    ShaderMaterial,
    UniformsLib,
    UniformsUtils,
    Vector2,
    Vector3
} from "three";

/** Attribute name carrying the per-tile shore mask (see `SHORE_EDGE_OFFSETS`). */
export const SHORE_ATTRIBUTE = "aEdgeShore";

/**
 * Which neighbouring tile each edge of a top-face quad faces.
 *
 * Read from `TEXTURE_FACES`' top entry, whose corners pair `pos.x` 0/1 with `uv.x`
 * 0/1 and `pos.z` 1/0 with `uv.y` 0/1. So `uv.x = 0` is the tile at `x - 1`,
 * `uv.x = 1` is `x + 1`, `uv.y = 0` is `z + 1` and `uv.y = 1` is `z - 1`. Getting
 * this backwards does not error, it just puts the foam on the wrong side of the
 * river, so it is written down rather than derived at each use.
 *
 * Order matches the `aEdgeShore` vector: (uv.x 0, uv.x 1, uv.y 0, uv.y 1).
 */
export const SHORE_EDGE_OFFSETS = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1]
];

/**
 * The default liquid definition: one set of values that reads as water.
 *
 * Every key here is a dial a host app may override. `color` and the three light
 * dials are the ones that matter most: `lightResponse` is how much the surface
 * follows the scene's light level, and `minLight` is the floor below which it never
 * falls, which is what keeps water visible as water at night rather than black.
 */
export const LIQUID_DEFAULTS = Object.freeze({
    // Colour. Kept deep and reasonably saturated, because a surface that starts pale has
    // nowhere to go once the sky reflection and the sun are mixed into it.
    deepColor: "#00344d",
    shallowColor: "#0e6f9b",
    foamColor: "#f2fbff",

    // What the surface reflects at a grazing angle. **Its own dial rather than the
    // engine's sky colours**, because those are near-white at the horizon and mixing
    // toward them drains the blue out of the water -- which is what the first version of
    // this material did, and why it read as grey rather than as water.
    reflectionColor: "#6fa8c8",
    reflectionStrength: 0.8,

    // Motion
    waveSpeed: 1.0,
    waveScale: 0.34,
    flowX: 0.36,
    flowY: 0.14,
    distortion: 0.12,

    // Shore
    foam: 0.6,
    foamWidth: 0.22,

    // Light response
    lightResponse: 0.85,
    minLight: 0.08,
    specular: 0.0,
    shininess: 96,
    fresnelPower: 2.0,

    // Surface
    opacity: 1.0,
    normalScale: 0.35,
    textureScale: 0.12,

    // Sparkle -- the small sharp moving points of light a real surface throws back at the
    // sun, as distinct from `specular`, which is the broad sheen it sits in.
    sparkle: 1.1,
    // **This is the dial that decides how the sparkle reads, and larger means smaller.** It is
    // the wavelength of the sparkle field in world units, and a tile is 2 of those, so 3.0 puts
    // two or three glints in a tile and they come out as small distinct points.
    //
    // **It was lowered to 1.4 to fix far-distance aliasing, and that was wrong -- reverted.**
    // The reasoning was that procedural noise has no mip levels, so at a distance where many
    // tiles fall into a few pixels the fine field aliases into a speckle band, and that larger
    // glints would not. Both halves of that are true and it still looked worse: halving this
    // value makes each highlight more than twice the size *on screen*, and the highlights stop
    // reading as points of light and start reading as large pale blobs. Coverage barely moved
    // (6.5% to 9.9%), so the metric that was being watched -- the fraction of the surface lit --
    // did not register the change at all, while the thing a person actually sees changed
    // completely. **Tune this by eye. A lit-fraction number cannot tell a glint from a blob.**
    //
    // The far-distance speckle is real and is still open; it wants a distance fade or a
    // narrower threshold band, not bigger glints, and it is recorded as an open item rather
    // than fixed by making the near field worse.
    sparkleScale: 3.0,
    // **Against the raw noise distribution, which is why it looks high and is not.**
    // Bilinear value noise averages four lattice values per sample, so it concentrates
    // around 0.5 with a standard deviation near 0.14 -- a threshold of 0.84, the first
    // value tried, was roughly 2.4 deviations out and fired on almost no pixels at all.
    // The useful range is 0.65-0.8, and the default sits where the result was measured
    // rather than derived: see the A/B in tools/water-liquid-probe.mjs, which captures the
    // same frame with this term on and off so the contribution is isolated from foam.
    // Now kept low: the ripple-facet glint gate does the selecting, and this only breaks it up.
    sparkleThreshold: 0.55,
    // **The distance fade, and the first cut at the far-distance speckle band.** The sparkle
    // field is analytic noise with no mip levels, so once the surface is foreshortened or
    // zoomed out far enough that its finest cell falls under a couple of pixels, the field
    // stops being a pattern and becomes a threshold on aliased noise. These two are that
    // cell size in pixels, low and high, and the term fades between them.
    //
    // **Calibrated against a measured footprint, not an assumed one, and the first attempt
    // at this was fitted to the wrong number and had to be corrected.** The water plane is
    // viewed at a 30-degree pitch, so one pixel of screen depth covers exactly twice the
    // world of one pixel of width -- `tools/water-footprint.mjs` unprojects real rays through
    // the camera's own matrices to get that, and it reports 0.0758 world units per pixel
    // across and **0.15152** along the view. At the approved view that puts the finest cell
    // (the 1.9x octave) at **1.16 px**, so the fade must sit *below* 1.16 or it dims the
    // approved water. An earlier pair of 1.1/2.6 was fitted to 2.68 px -- a number that
    // ignored the foreshortening -- and it removed the sparkle from the approved view
    // entirely, which the probe's own on/off A/B caught (from +5.9 points to -0.1).
    //
    // Fading beats shrinking: larger glints trade the near field away to help the far one,
    // which is the mistake the 1.4 scale made and which was reverted.
    sparkleResolveLo: 0.3,
    sparkleResolveHi: 1.0,

    // How far the engine's tile uvs are inset from the tile's true edges. The engine's
    // own quad uvs run `UV_TEXT_MIN`..`UV_TEXT_MAX`, which is **0.01..0.99**, so a
    // shoreline computed as though they ran 0..1 is displaced by that inset -- about a
    // fifth of the default `foamWidth`, enough to move the foam visibly inside the tile
    // and off the edge it belongs to. Overridable for a consumer that changes it.
    uvInset: 0.01,

    // Optional scrolling normal map. A URL is resolved by the engine, which owns the
    // texture loader and its cache; a `Texture` is used as given.
    texture: null
});

const NUMBER_KEYS = [
    "waveSpeed", "waveScale", "flowX", "flowY", "distortion",
    "foam", "foamWidth", "lightResponse", "minLight", "specular",
    "shininess", "fresnelPower", "reflectionStrength", "opacity",
    "normalScale", "textureScale", "uvInset",
    "sparkle", "sparkleScale", "sparkleThreshold",
    "sparkleResolveLo", "sparkleResolveHi"
];

/**
 * Clamp a host-supplied definition into something the shader can use.
 *
 * Every numeric dial is clamped and every unset dial falls back to
 * `LIQUID_DEFAULTS`, so a partial definition is valid. `opacity` is clamped to
 * 0..1 and `shininess` to a strictly positive value, because a shininess of 0 makes
 * `pow()`'s exponent zero and the specular term degenerate.
 *
 * Returns a new object; the input is not modified.
 */
export function normalizeLiquidType(id, incoming) {
    const incomingSource = incoming && typeof incoming === "object" ? incoming : {};
    const target = { id: id };

    for (const key of Object.keys(LIQUID_DEFAULTS)) {
        target[key] = incomingSource[key] === undefined ? LIQUID_DEFAULTS[key] : incomingSource[key];
    }

    for (const key of NUMBER_KEYS) {
        const value = Number(target[key]);

        if (!Number.isFinite(value)) {
            target[key] = LIQUID_DEFAULTS[key];
            continue;
        }

        if (key === "opacity") {
            target[key] = Math.min(1, Math.max(0, value));
        } else if (key === "shininess" || key === "sparkleScale") {
            target[key] = Math.max(1, value);
        } else if (key === "lightResponse" || key === "minLight" || key === "reflectionStrength"
            || key === "uvInset") {
            target[key] = Math.min(1, Math.max(0, value));
        } else if (key === "sparkle") {
            target[key] = Math.max(0, value);
        } else {
            target[key] = value;
        }
    }

    return target;
}

const LIQUID_VERTEX_SHADER = `
    uniform float uTime;
    uniform vec2 uFlow;
    uniform float uWaveScale;
    uniform float uWaveSpeed;
    uniform vec3 uCameraPosition;

    attribute vec4 ${SHORE_ATTRIBUTE};

    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec2 vTileUv;
    varying vec4 vShore;
    varying float vRipple;

    // Cheap value noise. Two complaints about the previous water were that it was
    // unlit and that it looked artificial; a smooth, cheap, world-anchored field is
    // what makes the surface read as moving without a texture to sample.
    float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }

    float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));

        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    #include <fog_pars_vertex>

    void main() {
        vTileUv = uv;
        vShore = ${SHORE_ATTRIBUTE};

        vec4 worldPosition = modelMatrix * vec4(position, 1.0);

        vWorldPos = worldPosition.xyz;

        // Anchor the ripple in world space. In surface-uv space it would slide as the
        // camera turned, because the uv would be turning with it.
        vec2 worldXZ = worldPosition.xz;
        vec2 flow = uFlow * uTime * uWaveSpeed;

        float n1 = vnoise(worldXZ * uWaveScale + flow);
        float n2 = vnoise(worldXZ * uWaveScale * 2.1 - flow * 0.6);

        vRipple = n1 * 0.65 + n2 * 0.35;

        vWorldNormal = normalize(mat3(modelMatrix) * normal);

        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;

        #include <fog_vertex>
    }
`;

const LIQUID_FRAGMENT_SHADER = `
    uniform float uTime;
    uniform vec2 uFlow;
    uniform float uWaveScale;
    uniform float uWaveSpeed;
    uniform float uDistortion;
    uniform float uFoam;
    uniform float uFoamWidth;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFoamColor;
    uniform float uLightResponse;
    uniform float uMinLight;
    uniform float uSpecular;
    uniform float uShininess;
    uniform float uFresnelPower;
    uniform float uReflectionStrength;
    uniform float uOpacity;
    uniform vec3 uCameraPosition;
    uniform vec3 uSunDirection;
    uniform vec3 uSunColor;
    uniform float uSunIntensity;
    uniform vec3 uSkyColor;
    uniform float uAmbient;
    uniform sampler2D uNormalMap;
    uniform float uHasNormalMap;
    uniform vec2 uNormalMapBias;
    uniform float uNormalScale;
    uniform float uTextureScale;
    uniform float uUvInset;
    uniform vec3 uReflectionColor;
    uniform float uSparkle;
    uniform float uSparkleScale;
    uniform float uSparkleThreshold;
    uniform float uSparkleResolveLo;
    uniform float uSparkleResolveHi;

    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec2 vTileUv;
    varying vec4 vShore;
    varying float vRipple;

    float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }

    float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));

        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    #include <fog_pars_fragment>

    void main() {
        vec2 worldXZ = vWorldPos.xz;
        vec2 flow = uFlow * uTime * uWaveSpeed;

        // --- The surface normal, from a scrolling normal map or from noise ---
        //
        // Both paths are supported because the choice between them is a measurement
        // rather than an argument: two texture fetches are usually cheaper than a
        // couple of noise octaves, but only if the app already ships a suitable map.
        // A host that supplies a texture gets the map; one that does not gets noise
        // and spends no bandwidth.
        vec2 perturb;

        if (uHasNormalMap > 0.5) {
            vec2 uv1 = worldXZ * uTextureScale + flow * 0.5;
            vec2 uv2 = worldXZ * uTextureScale * 1.63 - flow * 0.38;

            vec3 s1 = texture2D(uNormalMap, uv1).rgb;
            vec3 s2 = texture2D(uNormalMap, uv2).rgb;

            // A DUDV map carries its distortion in red/green, centred on 0.5, which is
            // the same thing a tangent-space normal's xy carries centred on zero.
            perturb = (s1.rg - 0.5) + (s2.rg - 0.5) - uNormalMapBias;
        } else {
            float e = 0.06;
            float h = vnoise(worldXZ * uWaveScale + flow);
            float hx = vnoise(worldXZ * uWaveScale + flow + vec2(e, 0.0));
            float hy = vnoise(worldXZ * uWaveScale + flow + vec2(0.0, e));

            perturb = vec2(h - hx, h - hy) * 6.0;
        }

        // y is up; perturb is the slope along world x and z.
        vec2 slope = perturb * uNormalScale * 2.0;
        vec3 normal = normalize(vec3(slope.x, 1.0, slope.y));

        // three's built-ins, not uCameraPosition: the host passes the camera's local position, which is always the origin.
        vec3 viewDir = isOrthographic
            ? normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]))
            : normalize(cameraPosition - vWorldPos);

        // --- Lighting ---
        //
        // This is the whole point of the module. The previous simple water had no
        // light term at all; here the sun's direction, colour and intensity and the
        // scene's ambient level all arrive as uniforms, and uLightResponse decides how
        // much of its appearance the surface takes from them.
        //
        // **The terms are deliberately kept at or below 1.** The first version summed a
        // full sun and a full sky and multiplied the base colour by the result, reaching
        // roughly 2 and clipping every channel -- which, before the output conversion at
        // the bottom of this shader was added, read on screen as pale washed-out cyan
        // rather than as water. A liquid should be *tinted* by its light, not blown out
        // by it; an app that wants a hotter surface has specular and the base colours.
        float sunDiffuse = max(dot(normal, uSunDirection), 0.0);

        vec3 direct = uSunColor * uSunIntensity * sunDiffuse * 0.9;

        // The standing ambient is what keeps a liquid legible when an app never defines a
        // sun at all -- which is the normal case, not the exception: this engine's
        // hemiBrightness is 0 until setSky is called, and My City never calls it. With
        // nothing but the sun's own contribution, a scene at 45 degrees rendered its
        // water nearly black on the first attempt.
        vec3 ambient = uSkyColor * (0.3 + uAmbient * 0.7);

        // A floor, so night water is dark water rather than a black hole in the map.
        vec3 lighting = max(direct + ambient, vec3(uMinLight));

        // --- Shoreline ---
        //
        // vShore carries one value per edge, so foam lands on the edges that face
        // land and not on the ones that face open water.
        //
        // **The tile uv is renormalised first**, because the engine's quad uvs are inset:
        // they run UV_TEXT_MIN..UV_TEXT_MAX (0.01..0.99), not 0..1. Treating them as
        // 0..1 offsets every shoreline by that inset, which moves the foam off the edge it
        // belongs to by about a fifth of its width. Renormalising also keeps the foam
        // correct if the app changes that constant.
        float edgeSpan = max(0.0001, 1.0 - 2.0 * uUvInset);
        vec2 tileUv = clamp((vTileUv - uUvInset) / edgeSpan, 0.0, 1.0);

        float west = vShore.x * smoothstep(uFoamWidth, 0.0, tileUv.x);
        float east = vShore.y * smoothstep(uFoamWidth, 0.0, 1.0 - tileUv.x);
        float south = vShore.z * smoothstep(uFoamWidth, 0.0, tileUv.y);
        float north = vShore.w * smoothstep(uFoamWidth, 0.0, 1.0 - tileUv.y);

        float shore = max(max(west, east), max(south, north));

        // Foam is broken up by the same noise the ripples use, so it moves rather than
        // sitting on the edge as a hard band.
        float foamPattern = vnoise(worldXZ * uWaveScale * 2.6 + flow * 1.4);
        float foamAmount = clamp(shore * uFoam * (0.55 + foamPattern * 0.9), 0.0, 1.0);

        // --- Colour ---
        vec3 base = mix(uDeepColor, uShallowColor, clamp(shore * 0.85 + vRipple * 0.25, 0.0, 1.0));

        vec3 surface = base * mix(vec3(1.0), lighting, uLightResponse);

        // Fresnel: at a grazing angle water is a mirror, face-on it is water. What it
        // reflects is its own dial -- see reflectionColor for why it is not the
        // engine's sky colour. Scaling the reflection by lighting is what makes it go
        // dark after sunset instead of staying a fixed pastel.
        float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), uFresnelPower);

        surface = mix(surface, uReflectionColor * lighting, clamp(fresnel * uReflectionStrength, 0.0, 1.0));

        // A sun glint, which is what makes it read as a wet surface rather than a
        // painted one. Only where the sun is actually hitting it.
        float specular = pow(max(dot(normal, normalize(uSunDirection + viewDir)), 0.0), uShininess);
        surface += uSunColor * specular * uSpecular * uSunIntensity * sunDiffuse;

        // --- Sparkle ---
        //
        // The small, sharp, moving points of light a real surface throws back at the sun --
        // glitter rather than the broad sheen uSpecular provides.
        //
        // **Two value-noise fields, thresholded, and neither choice is arbitrary.**
        //
        // 1. **Noise rather than taps on the normal map, and that is a correction.** Reading
        //    a distortion map's channels gives values clustered near zero once centred, and
        //    the first version of this took their *product* and then raised it to a power --
        //    but the product of two small numbers raised to any real power is still small
        //    (0.1 to the eighth is one in a hundred million), so it drew nothing at all.
        //    Noise has a known range, which is what makes the next point possible.
        // 2. **Thresholded rather than powered.** smoothstep takes the top end of the field,
        //    so the *fraction* of the surface that lights up is set by where the threshold
        //    sits -- a number that can be reasoned about and measured -- instead of by an
        //    exponent whose effect depends entirely on the input distribution.
        //
        //    **That threshold is against the field's own distribution, and it is lower than
        //    it looks.** Bilinear value noise averages four lattice values per sample, so it
        //    clusters around 0.5 rather than filling 0..1: the first threshold tried was
        //    0.84, about two and a half deviations out, and the term contributed nothing at
        //    all -- which only showed up because the probe isolates the sparkle term and
        //    A/Bs it against itself. If the field is ever changed to a noise with a fuller
        //    range, this dial has to come back up.
        // **How big is one pixel, in the units this noise is measured in?** That is the
        // question the term never used to ask, and every way the sparkle looked wrong came
        // back to it. The field is analytic, so it has no mip levels to fall back on, and a
        // threshold applied to a field whose cells are under a pixel does not produce small
        // glints -- it produces whatever the aliasing happens to do, which is why the same
        // water could speckle into a band in one direction and go blank in another. Taking
        // the footprint from the derivatives rather than from a scalar matters on a tilted
        // plane: the depth direction is compressed far more than the width, so the field
        // goes under first along the view. Dimensions are pixels per finest cell, where the
        // finest cell is the 1.9x octave.
        vec2 sparkleFootprint = vec2(fwidth(worldXZ.x), fwidth(worldXZ.y));
        float footprintWorld = max(max(sparkleFootprint.x, sparkleFootprint.y), 1e-7);
        float fineCellPx = (1.0 / (uSparkleScale * 1.9)) / footprintWorld;
        float sparkleResolve = smoothstep(uSparkleResolveLo, uSparkleResolveHi, fineCellPx);

        float sparkleA = vnoise(worldXZ * uSparkleScale + flow * 3.1);
        float sparkleB = vnoise(worldXZ * uSparkleScale * 1.9 - flow * 2.3);

        // The max of the two rather than their mean, because averaging pulls the field
        // toward the middle and would lose the high tail the threshold is looking for.
        float sparkleField = max(sparkleA, sparkleB);

        float sparkle = smoothstep(uSparkleThreshold, min(1.0, uSparkleThreshold + 0.1), sparkleField);

        // Only ripple facets sloped toward the sun/eye half-vector glint, so the sparkle sits on the
        // waves instead of floating over them as its own layer.
        vec3 glintHalf = normalize(uSunDirection + viewDir);
        vec2 towardHalf = length(glintHalf.xz) > 1e-4 ? normalize(glintHalf.xz) : vec2(0.0, 1.0);
        float glint = smoothstep(0.19, 0.3, dot(slope, towardHalf));

        // The resolve factor is the distance fade: where the field is too fine for the
        // pixels covering it, the sparkle withdraws rather than speckling.
        float sparkleAmount = sparkle * uSparkle * glint * (0.5 + fresnel * 2.5) * sunDiffuse * sparkleResolve;

        // The multiplier is modest on purpose. At a threshold that lights a few percent of
        // the surface this term adds enough to read as a glint while staying off the top of
        // the range; pushed higher, every sparkle clips to flat white and the points stop
        // reading as points at all. Measured either side of it: at 2.4 the brightest pixel
        // in the water pins at 255 and lit pixels are ~19% of the surface, which reads as a
        // white wash rather than as shine.
        surface += uSunColor * sparkleAmount * uSunIntensity * 1.7;

        surface = mix(surface, uFoamColor * (lighting + 0.28), foamAmount);

        gl_FragColor = vec4(surface, uOpacity);

        // Order matters, and it matches three's own materials: convert to the output
        // colour space first, then fog.
        //
        // **Without the conversion the water renders far too bright and washed out.** A
        // raw ShaderMaterial gets nothing for free, and the engine renders to sRGB -- so
        // an unconverted linear value is displayed as though it were already sRGB, which
        // lifts a mid blue to a pale cyan. That was the single biggest reason the first
        // version of this material did not read as water.
        #include <colorspace_fragment>
        #include <fog_fragment>
    }
`;

/**
 * Check that the shaders are still whole, and complain if they are not.
 *
 * **What this cannot do matters, because the bug it sits next to was written twice while
 * building this.** A backtick inside a GLSL comment ends the template literal, and the tail
 * of the comment re-parses as a *tagged* template -- so a comment reading
 * "multiplying `.g` by `.b`" becomes the expression " by " tagged with `.g`, which is
 * valid JavaScript that calls `"".g` as a function. **That throws while the `const` above is
 * being evaluated, before this function is ever reached**, so no check placed here can report
 * it; what it actually produced was `(" by " is not a function)` at bundle load, with no
 * shader error to find because the shader never ran.
 *
 * What this does catch is the case a stray pair of backticks leaves behind when it does *not*
 * throw: the string is **truncated** at that point, so the end of the shader is silently
 * gone. A backtick count would miss exactly that, since an even number balances. Naming the
 * landmarks that have to survive to the end of the string is what detects a cut-short shader.
 */
function assertShaderIntact(name, source, landmarks) {
    const missing = landmarks.filter(function(mark) {
        return source.indexOf(mark) === -1;
    });

    if (missing.length > 0) {
        throw new Error(`${name} is truncated, missing ${missing.join(", ")} -- a backtick inside a GLSL comment ends the template literal`);
    }
}

assertShaderIntact("LIQUID_VERTEX_SHADER", LIQUID_VERTEX_SHADER, [
    "void main", "gl_Position", SHORE_ATTRIBUTE, "fog_pars_vertex"
]);

assertShaderIntact("LIQUID_FRAGMENT_SHADER", LIQUID_FRAGMENT_SHADER, [
    "void main", "gl_FragColor", "colorspace_fragment", "fog_fragment", "uSparkleThreshold"
]);

/**
 * Build the material for one liquid definition.
 *
 * **The geometry is created once per liquid and shared by every chunk's water mesh**,
 * so a scene with fifty water chunks has one material and one uniform update per
 * frame, not fifty. The per-frame tick is a separate call -- `updateLiquidUniforms`.
 *
 * **`transparent` follows `opacity`.** With `opacity` at its default of 1 the
 * material is opaque and writes depth, which is what a tile recessed into the terrain
 * needs: there is no solid floor drawn under this engine's water, so a transparent
 * surface would show the scene's background through the recess. A host that draws its
 * own floor below the water can lower `opacity` and get a blending surface
 * deliberately -- the two settings are not equivalent and the default is the safe one.
 */
export function createLiquidMaterial(definition, texture) {
    const useTexture = Boolean(texture);
    const transparent = definition.opacity < 1;

    const uniforms = UniformsUtils.merge([
        UniformsLib.fog,
        {
            uTime: { value: 0 },
            uFlow: { value: new Vector2(definition.flowX, definition.flowY) },
            uWaveScale: { value: definition.waveScale },
            uWaveSpeed: { value: definition.waveSpeed },
            uDistortion: { value: definition.distortion },
            uFoam: { value: definition.foam },
            uFoamWidth: { value: definition.foamWidth },
            uDeepColor: { value: new Color(definition.deepColor) },
            uShallowColor: { value: new Color(definition.shallowColor) },
            uFoamColor: { value: new Color(definition.foamColor) },
            uReflectionColor: { value: new Color(definition.reflectionColor) },
            uUvInset: { value: definition.uvInset },
            uSparkle: { value: definition.sparkle },
            uSparkleScale: { value: definition.sparkleScale },
            uSparkleThreshold: { value: definition.sparkleThreshold },
            uSparkleResolveLo: { value: definition.sparkleResolveLo },
            uSparkleResolveHi: { value: definition.sparkleResolveHi },
            uLightResponse: { value: definition.lightResponse },
            uMinLight: { value: definition.minLight },
            uSpecular: { value: definition.specular },
            uShininess: { value: definition.shininess },
            uFresnelPower: { value: definition.fresnelPower },
            uReflectionStrength: { value: definition.reflectionStrength },
            uOpacity: { value: definition.opacity },
            uCameraPosition: { value: new Vector3() },
            uSunDirection: { value: new Vector3(0.4, 0.8, 0.3).normalize() },
            uSunColor: { value: new Color(1, 1, 1) },
            uSunIntensity: { value: 1 },
            uSkyColor: { value: new Color("#cfe8f5") },
            uAmbient: { value: 1 },
            uNormalMap: { value: texture || null },
            uHasNormalMap: { value: useTexture ? 1 : 0 },
            uNormalMapBias: { value: new Vector2() },
            uNormalScale: { value: definition.normalScale },
            uTextureScale: { value: definition.textureScale }
        }
    ]);

    const material = new ShaderMaterial({
        uniforms: uniforms,
        vertexShader: LIQUID_VERTEX_SHADER,
        fragmentShader: LIQUID_FRAGMENT_SHADER,
        // DoubleSide because the camera can tilt and, in a VR session, go below the
        // waterline; the recessed walls of a water tile have to render from either
        // side or a low camera sees through the terrain.
        side: DoubleSide,
        transparent: transparent,
        depthWrite: !transparent,
        fog: true
    });

    material.userData.liquidId = definition.id;

    return material;
}

/**
 * The values a liquid material needs from the scene, gathered once per frame.
 *
 * A plain object rather than the engine instance, so that the material's update is
 * testable without an engine and so that nothing here can reach back into the scene
 * and change it.
 *
 * @typedef {object} LiquidLighting
 * @property {number} time        Seconds, monotonic.
 * @property {number} sunAngle    The engine's own sun angle: 90 is noon.
 * @property {string} sunColor    The engine's `sunColor`.
 * @property {number} sunIntensity Normalised sun strength, 0..1.
 * @property {string} skyColor    Sky colour to reflect, at the horizon.
 * @property {number} ambient     Normalised ambient level, 0..1.
 * @property {{x:number,y:number,z:number}} cameraPosition
 */

const SUN_ANGLE_NOON = 90;

/**
 * Tick every uniform that depends on the scene rather than the definition.
 *
 * **The sun's direction is derived from the engine's `sunAngle`**, which is the same
 * number the directional light is positioned from, so the glint on the water and the
 * shadows on the land agree by construction instead of by two numbers being kept in
 * step. 90 degrees is straight overhead.
 *
 * **The day factor is computed rather than read.** The engine has no single "light
 * level" scalar -- it has a hemisphere light whose intensity is recomputed every frame
 * from `hemiBrightness` and the sun angle, and a directional light that is switched
 * off at night. So the level here is derived from the sun angle with the same shape
 * the engine uses, and scaled by the caller's own ambient where one exists.
 */
export function updateLiquidUniforms(material, lighting) {
    const uniforms = material.uniforms;

    uniforms.uTime.value = lighting.time;

    const angle = Number.isFinite(lighting.sunAngle) ? lighting.sunAngle : SUN_ANGLE_NOON;

    // Gradients in the engine's own convention: sunAngle runs 0..360, with 90 at noon
    // and the sun below the horizon at 0 and 180. Degrees are converted here, once,
    // rather than in the shader by every fragment.
    const radians = (angle / 360) * Math.PI * 2;

    // The sun travels across the sky plane; its height above the horizon is a sine of
    // the angle, which is the shape the engine's own shadow logic already assumes.
    const height = Math.sin((angle / 180) * Math.PI);

    const direction = uniforms.uSunDirection.value;

    direction.set(Math.cos(radians), Math.max(height, 0.0001), Math.sin(radians)).normalize();

    if (uniforms.uSunColor.value.isColor) {
        uniforms.uSunColor.value.set(lighting.sunColor || "#ffffff");
    } else {
        uniforms.uSunColor.value = new Color(lighting.sunColor || "#ffffff");
    }

    uniforms.uSunIntensity.value = Math.min(1, Math.max(0, lighting.sunIntensity));

    if (lighting.skyColor) {
        if (uniforms.uSkyColor.value.isColor) {
            uniforms.uSkyColor.value.set(lighting.skyColor);
        } else {
            uniforms.uSkyColor.value = new Color(lighting.skyColor);
        }
    }

    uniforms.uAmbient.value = Math.min(1, Math.max(0, lighting.ambient));

    const camera = uniforms.uCameraPosition.value;
    const position = lighting.cameraPosition;

    if (position) {
        camera.set(position.x, position.y, position.z);
    }

    material.uniformsNeedUpdate = true;
}

/**
 * How bright the scene's sun is right now, as a 0..1 factor.
 *
 * Kept here, and exported, because it is the one piece of lighting arithmetic that is
 * worth testing on its own -- the shader cannot be unit-tested and this determines
 * whether water goes dark at night.
 */
export function sunIntensityFor(sunAngle, peak) {
    if (!Number.isFinite(sunAngle)) {
        return Number.isFinite(peak) ? peak : 1;
    }

    if (sunAngle <= 0 || sunAngle >= 180) {
        return 0;
    }

    const height = Math.sin((sunAngle / 180) * Math.PI);

    return Math.min(1, Math.max(0, height * (Number.isFinite(peak) ? peak : 1)));
}

/**
 * The mean offset of a distortion map's red/green from 0.5, as the shader decodes them,
 * doubled because the shader sums two taps. A map that is not centred tilts every ripple
 * one way, which makes the glints depend on which way the camera faces.
 */
export function measureNormalMapBias(image, srgb) {
    if (!image || !image.width || !image.height || typeof document === "undefined") {
        return null;
    }

    const canvas = document.createElement("canvas");

    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext("2d", { willReadFrequently: true });

    context.drawImage(image, 0, 0);

    const data = context.getImageData(0, 0, image.width, image.height).data;
    const decode = function(byte) {
        const v = byte / 255;

        if (!srgb) {
            return v;
        }

        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };

    let red = 0;
    let green = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4 * 7) {
        red += decode(data[i]);
        green += decode(data[i + 1]);
        count++;
    }

    return new Vector2((red / count - 0.5) * 2, (green / count - 0.5) * 2);
}
