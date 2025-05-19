/**
 * @typedef {object} Scroll3dPostProcessor
 * @property {BokehPass} bokeh
 * @property {EffectComposer} composer
 * @property {RenderPass} render
 * @property {FilmPass} film
 */

import { guid, removeFromArray, hexToRGB, rgbToHex, hash, randomIntFromInterval, distBetweenPoints } from "common-helpers";
import { handleInput } from "input-helper";
import GPH from "gamepadhelper";

import {
    AdditiveBlending,
    AmbientLight,
    BackSide,
    Box3,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    CanvasTexture,
    ClampToEdgeWrapping,
    Clock,
    Color,
    ColorManagement,
    CircleGeometry,
    DataTexture,
    DoubleSide,
    DirectionalLight,
    Euler,
    Float32BufferAttribute,
    FogExp2,
    GridHelper,
    Group,
    HemisphereLight,
    InstancedMesh,
    LinearFilter,
    Line,
    LineBasicMaterial,
    LineDashedMaterial,
    LineSegments,
    MathUtils,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshStandardMaterial,
    NearestFilter,
    NormalBlending,
    Object3D,
    PerspectiveCamera,
    PlaneGeometry,
    Points,
    PointLight,
    Quaternion,
    Raycaster,
    RepeatWrapping,
    RingGeometry,
    Scene,
    ShaderMaterial,
    Shape,
    Sprite,
    SpriteMaterial,
    SRGBColorSpace,
    SphereGeometry,
    Texture,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer
} from "three";

import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { Refractor } from "three/examples/jsm/objects/Refractor.js";
import { WaterRefractionShader } from "three/addons/shaders/WaterRefractionShader.js";
import { AnaglyphEffect } from "three/addons/effects/AnaglyphEffect.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";

import { VPPLoader } from "vpploader";
import { renderPPP } from "ppp-tools";

export const DEF_PHI = 75;
export const DEF_THETA = 50;
export const DEF_RADIUS = 50;

export const CAMERA_MODES = {
    LOCKED: 0,
    PAN: 1,
    ROTATE: 2
};

const USE_COLORSPACE = SRGBColorSpace;

const DEF_CAMZ_OFFSET = 1.3;
const TARGET_FPS = 60;
const TARGET_DELTA = 1000 / TARGET_FPS;
const SUN_INTENSITY = 4.25;
const π = Math.PI;
const ONE_POINT_FIVE_π = π * 1.5;
const THREESISXY_PI =  π / 360;
const ONE_EIGHTY_π = π / 180;
const ONE_EIGHTY_π_REV = 180 / π;
const tempMatrix = new Matrix4();
const TEXTURE_LOADER = new TextureLoader();
const DEF_FOG_DENSITY = 0.0075;
const DEF_WATER_OPACITY = 0.75;
const MAX_MOUSE_MOVE = 5;
const MIN_ZOOM = 2;
const MAX_ZOOM = 300;
const MIN_PHI = 0;
const MAX_PHI = 180;

const DEF_APERTURE_RATIO = 1.25;
const UV_TEXT_MIN = 0.02;
const UV_TEXT_MAX = 0.98;
const EDGE_SCROLLING_BUFFER = 10;
const EDGE_SCROLLING_SPEED = 8;
const DEF_SIZE_OUT_MULTIPLIER = 3;

const DEF_INSTANCE_COUNT = 250000;
const WORLD_HEIGHT = 128;
const SNOW_RANGE = 60;
const PIXEL_STEP  = 10;
const LINE_HEIGHT = 40;
const PAGE_HEIGHT = 800;
const TEXTURE_SIZE = 16;
const SMALL_DEPRESS_AMT = 0.98;
const TEXTURE_SIZE_MULTIPLIER = 1.0;
const TEXTURE_FACES = [
    { // left
        uvRow: 0,
        dir: [ -1,  0,  0, ],
        corners: [
            { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        altcorners: [
            { pos: [ 0, 0.9, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 0, 0.9, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        smdepress: [
            { pos: [ 0, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 0, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        slopes: {
            N: [
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], }
            ],
            E: [
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            W: [
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            S: [
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ]
        }
    },
    { // right
        uvRow: 0,
        dir: [  1,  0,  0, ],
        corners: [
            { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        altcorners: [
            { pos: [ 1, 0.9, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 0.9, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        smdepress: [
            { pos: [ 1, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
        ],
        slopes: {
            N: [
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            E: [
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            W: [
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ],
            S: [
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] }
            ]
        }
    },
    { // bottom
        uvRow: 1,
        dir: [  0, -1,  0, ],
        corners: [
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] }
        ],
        altcorners: [
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] }
        ],
        smdepress: [
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] }
        ],
        slopes: {
            N: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            E: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            W: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            S: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NE: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NW: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SW: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SE: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NWI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NEI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SEI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SWI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ]
        }
    },
    { // top
        uvRow: 2,
        dir: [  0,  1,  0, ],
        corners: [
            { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
        ],
        altcorners: [
            { pos: [ 0, 0.9, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 1, 0.9, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, 0.9, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 1, 0.9, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
        ],
        smdepress: [
            { pos: [ 0, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
            { pos: [ 1, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 1, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
        ],
        slopes: {
            N: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            E: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NW: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            W: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            S: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NE: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SW: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SE: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NWI: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            NEI: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SEI: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ],
            SWI: [
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] }
            ]
        }
    },
    { // back
        uvRow: 0,
        dir: [  0,  0, -1, ],
        corners: [
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
            { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        altcorners: [
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 0 ], uv: [ 1, UV_TEXT_MIN ] },
            { pos: [ 1, 0.9, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, 0.9, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        smdepress: [
            { pos: [ 1, 0, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
            { pos: [ 0, 0, 0 ], uv: [ 1, UV_TEXT_MIN ] },
            { pos: [ 1, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
            { pos: [ 0, SMALL_DEPRESS_AMT, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        slopes: {
            N: [
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            E: [
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 1, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            W: [
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] }, // might remove/alter this
                { pos: [ 0, 2, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            S: [
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ] },
                { pos: [ 1, 1, 0 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ] },
                { pos: [ 0, 1, 0 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ]
        }
    },
    { // front
        uvRow: 0,
        dir: [  0,  0,  1, ],
        corners: [
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
            { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        altcorners: [
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
            { pos: [ 0, 0.9, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, 0.9, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        smdepress: [
            { pos: [ 0, 0, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
            { pos: [ 1, 0, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
            { pos: [ 0, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
            { pos: [ 1, SMALL_DEPRESS_AMT, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
        ],
        slopes: {
            N: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            E: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ],
            W: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] } // might remove/alter this
            ],
            S: [
                { pos: [ 0, 1, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MIN ], },
                { pos: [ 1, 1, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MIN ], },
                { pos: [ 0, 2, 1 ], uv: [ UV_TEXT_MIN, UV_TEXT_MAX ], },
                { pos: [ 1, 2, 1 ], uv: [ UV_TEXT_MAX, UV_TEXT_MAX ] }
            ]
        }
    },
];

const PARTICLE_VERTEX_SHADER = `
    uniform float pointMultiplier;
    attribute float size;
    attribute float angle;
    attribute vec4 colour;
    varying vec4 vColour;
    varying vec2 vAngle;
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = size * pointMultiplier / gl_Position.w;
      vAngle = vec2(cos(angle), sin(angle));
      vColour = colour;
    }`;

const PARTICLE_FRAGMENT_SHADER = `
    uniform sampler2D diffuseTexture;
    varying vec4 vColour;
    varying vec2 vAngle;
    void main() {
      vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
      gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
    }`;

const AXIS_DEADZONE = 0.25;

let commonMaterials = {};
let scrollInstances = {};
let commonSpriteGeos = {};
let commonRadialTextures = {};
let commonSpriteTextures = {};
let commonParticleTextures = {};
let commonCircleGeos = {};
let commonPPPTextures = {};
let commonCubeGeos = {};
let vppLightsRef = {};
let vppEmittersRef = {};
let commonMatTx = {};

let globalParticleRecycling = [];

let curAtlasIndex = 0;
let textureAtlas = {};
let curAtlasTexture = null;
let curAtlasMaterial = null;
let globalSunGeo = null;
let globalPlaneGeo = null;
let globalClock = null;

let chkHoverVec = null;
let chkHoverVexAlt = null;

let controllerModelFactory = null;

let blockVPPMeshIds = {};
let splineRetentions = {};

let sphereHandGeo = null;

let useTextureSize = TEXTURE_SIZE;

let useSimplifiedAtlas = false;

let currentGPPollInstance = null;

let gphInit = false;

let vppLoader = new VPPLoader();

window.addEventListener("resize", onResize);
document.addEventListener("visibilitychange", onResize);

export function getInstance(holder, options) {
    if(!gphInit) {
        GPH.register({
            adl: window.adl,
            down: onPadDown,
            up: onPadUp,
            velocity: onPadVelocity
        });

        GPH.setManualPolling(true);

        gphInit = true;
    }

    if(!options) {
        options = {};
    }

    const engine = new Scroll3dEngine(holder, options);
    scrollInstances[engine.id] = engine;
    return engine;
}

export function getAllInstances() {
    return scrollInstances;
}

export function setUseSimplifiedAtlas(use) {
    useSimplifiedAtlas = use;
}

export function getOffset(el) {
    el = el.getBoundingClientRect();

    return {
        left: el.left + window.scrollX,
        top: el.top + window.scrollY,
        width: el.width,
        height: el.height
    };
}

export function forceResize() {
    onResize();
}

export function setTextureSize(size) {
    useTextureSize = size;

    curAtlasIndex = 0;
    textureAtlas = {};
    curAtlasTexture = null;

    resetAtlasTexture();
}

function onResize() {
    for(let instanceId in scrollInstances) {
        setInstanceSize(scrollInstances[instanceId]);
    }
}

/**
 * Class representing a Scroll3d Engine instance.
 */
export class Scroll3dEngine {

    constructor(holder, options) {
        this.id = guid();
        this.holder = holder;

        this.canvas = options.canvas || null;
        this.touchOverlay = null;

        this.orientationHolder = null;
        this.orientationCamera = null;
        this.orientationCube = null;
        this.orientationScene = null;
        this.orientationRenderer = null;

        this.cameraVector = new Vector3();

        this.currentVRVector = new Vector3();
        this.currentVRCamRads = 0;

        this.touchPadMode = options.touchPadMode || false;
        this.virtPad = null;
        this.touchPadButtons = null;
        this.virtPadLeft = true;
        this.virtPadRight = true;

        this.sceneScale = 1;

        this.minZoom = MIN_ZOOM;
        this.maxZoom = MAX_ZOOM;

        this.minPhi = MIN_PHI;
        this.maxPhi = MAX_PHI;

        this.lastRAF = null;
        this.curDelta = 1;
        this.curFPS = TARGET_FPS;
        this.lastFPS = [TARGET_FPS];

        this.sunSphere = null;

        this.useVRControllerGrips = options.useVRControllerGrips || true;

        this.dynamicLighting = true;

        this.sizeOutMultiplier = DEF_SIZE_OUT_MULTIPLIER;

        this.focusMod = 0;
        this.apertureRatio = DEF_APERTURE_RATIO;
        this.radius = DEF_RADIUS;
        this.phi = DEF_PHI; // "up and down" sphere position of camera
        this.theta = DEF_THETA; 
        this.poleOffset = 0;
        this.xr = options.xr || false;
        this.cameraScale = 1;

        this.centerPosition = {
            x: 0,
            y: 0,
            z: 0
        };

        this.centerObject = null;
        this.cameraTarget = null;
        this.lerpSpeed = 0.075;

        this.sunYoffset = 60;
        this.sunAngle = 45;
        this.hemiBrightness = 0;
        this.sunColor = "#ffffff";
        this.showSun = false;
        this.skyBottomColor = "#E1F5FE";
        this.skyTopColor = "#FFFDE7";
        this.fogDensity = DEF_FOG_DENSITY;
        this.lightsActive = true;
        this.noSky = false;

        this.edgeScrolling = false;
        this.edgeScrollDir = null;

        this.defaultWaterOpacity = DEF_WATER_OPACITY;

        this.vrCamHolder = null;

        this.starTexture = options.starTexture || null;

        this.vrController1 = null;
        this.vrController0 = null;

        this.pointersDown = 0;
        this.allPointers = {};
        this.primaryPointer = null;
        this.lastPinchDistance = 0;
        this.removeRetryObjects = [];

        this.shouldRender = false;
        this.cameraMode = CAMERA_MODES.PAN;
        this.rotationLock = false;

        this.smokeParticleAsset = null;

        this.explosionParticleGroup = null;

        this.contextLost = false;
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.raycaster = null;
        this.mouse = null;
        this.grid = null;
        this.plane = null;
        this.ambientLight = null;
        this.directionalLight = null;
        this.skydome = null;
        this.stardome = null;
        this.hemisphereLight = null;
        this.waterGeometry = null;
        this.waterPlane = null;

        this.lastNight = true;

        this.custCastOrigin = new Vector3();
        this.custCastDirection = new Vector3(0, -1, 0);
        this.upCastDirection = new Vector3(0, 1, 0);

        this.vppInstances = {};

        this.vrSession = null;
        this.classicADown = false;

        this.curAutoCircleObjects = [];

        this.particleSystems = {};
        this.chunks = {};
        this.objects = {};
        this.hitTestObjects = [];

        this.lastHoverReport = {
            x: 0,
            y: 0,
            z: 0
        };

        this.hoverFunction = null;
        this.clickFunction = null;
        this.rightClickFunction = null;
        this.cameraMovedFunction = null;
        this.renderLoopFunction = null;
        this.pointerListener = null;
        this.wheelFunction = null;
        this.onZoomed = null;

        this.followCameraZOffset = DEF_CAMZ_OFFSET; //24
        this.followCameraDistance = 5;

        this.vppSize = 10;
        this.vppRatio = 0.2;
        this.chunkSize = 50;

        this.firstSetup = true;

        this.isSnowing = false;

        this.padDown = null;
        this.padUp = null;
        this.padVelocity = null;
        this.uiGamepadElement = null;

        this.axisStates = {};
        this.lastPadId = null;

        this.gamepadButtonStates = {
            left: null,
            right: null,
            classic: null
        };

        this.antialias = options.antialias || false;
        this.shadows = options.shadows || false;

        this.squaredUp = false;

        this.forceWidth = null;
        this.forceHeight = null;

        this.lastWidth = 0;
        this.lastHeight = 0;

        this.renderScale = options.renderScale || 1.0;
        this.effectiveScale = 1;

        this.useDOFEffect = options.useDOFEffect || false;

        /**
         * @type {Scroll3dPostProcessor}
         */
        this.postprocessor = null;

        /**
         * @type {AnaglyphEffect}
         */
        this.effectAnaglyph = null;
        this.useAnaglyph = options.anaglyphMode || false;

        this.filmMode = false;
        this.filmModeBW = false;

        this.currentHudCanvas = null;
        this.currentHudCanvasTexture = null;
        this.currentHudCanvasMesh = null;

        this.waterTextureUrl = options.waterTexture || null;

        if(options.position) {
            if(options.position.x) {
                this.centerPosition.x = parseInt(options.position.x);
            }

            if(options.position.y) {
                this.centerPosition.y = parseInt(options.position.y);
            }

            if(options.position.z) {
                this.centerPosition.z = parseInt(options.position.z);
            }

            if(options.position.radius != undefined) {
                this.radius = parseInt(options.position.radius);
            }

            if(options.position.phi != undefined) {
                this.phi = parseInt(options.position.phi);
            }

            if(options.position.theta != undefined) {
                this.theta = parseInt(options.position.theta);
            }
        }

        this.holderBackground = options.holderBackground || null;

        initInstance(this);
    }

    resize() {
        setInstanceSize(this);
    }

    setTouchPadMode(mode, leftStick = true, rightStick = true, buttons = null) {
        this.touchPadMode = mode;

        this.virtPadLeft = leftStick;
        this.virtPadRight = rightStick;
        this.touchPadButtons = buttons || [];

        if(this.virtPad) {
            this.virtPad.leftStick = leftStick;
            this.virtPad.rightStick = rightStick;
            this.virtPad.buttons = buttons || [];
        }
    }

    addObject(options) {
        const instance = this;

        options.scene = this.scene;
        options.instance = instance;

        const obj = new WorldObject(options);
        instance.objects[obj.id] = obj;

        if(obj.object) {

            obj.object.frustumCulled = true;

            instance.scene.add(obj.object);

            if(!obj.notHittable) {
                addObjToHittest(instance, obj, 0);
            }
        } 

        instance.shouldRender = true;

        return obj.id;
    }

    updateObject(id, options) {
        const instance = this;
        const object = instance.objects[id];

        if(!object) {
            return;
        }

        let didMove = false;

        if(options.x != undefined) {
            object.x = options.x;
            didMove = true;
        }

        if(options.notHittable != undefined && object.mesh) {

            removeObjFromHittest(instance,object);

            object.notHittable = options.notHittable;

            if(!object.notHittable) {
                addObjToHittest(instance, object, 0);
            }
            
        }

        if(options.x != undefined) {
            object.x = options.x;
            didMove = true;
        }

        if(options.y != undefined) {
            object.y = options.y;
            didMove = true;
        }

        if(options.z != undefined) {
            object.z = options.z;
            didMove = true;
        }

        if(options.rot != undefined) {
            object.rot = options.rot;
            didMove = true;
        }

        if(object.type == "bar") {
            let change = false;

            if(options.progress != null && options.progress != undefined) {
                let progress = options.progress;

                if(progress > 0 && progress < 1) {
                    progress = progress * 100;
                }

                if(progress > 100) {
                    progress = 100;
                }

                if(progress < 0) {
                    progress = 0;
                }

                if(progress != object.progress) {
                    object.progress = progress;
                    change = true;
                }
            }
            if(options.color && options.color != object.color) {
                change = true;
                object.color = options.color;
            }

            if(options.scale && options.scale != object.scale) {
                change = true;
                object.scale = options.scale;
            }

            if(change) {
                updateProgressBarObject(object);
            }
            
        }

        if(options.color != undefined) {
            if(options.color != object.color) {
                object.color = options.color;

                if(object.type == "cube") {
                    object.mesh.material = getMaterial(object.color,object.opacity,options.texture,object.basicMat,object.emissive,object.metal,null);
                }
                
            }
        }

        if(options.positions) {
            if(object.type == "instancecube") {
                didMove = true;
                object.instancePositions = options.positions;
            }
        }

        if(options.texture != undefined) {
            if(options.texture != object.texture) {
                object.texture = options.texture;

                if(object.type == "cube") {
                    object.mesh.material = getMaterial(object.color,object.opacity,options.texture,object.basicMat,object.emissive,object.metal,null);
                } else {
                    // this will need changed eventually
                    // so it does not change the opacity of everything
                    object.mesh.material.opacity = object.opacity;
                }
                
            }
        }

        if(options.opacity != undefined) {
            if(options.opacity != object.opacity) {
                object.opacity = options.opacity;

                if(object.type == "cube") {
                    object.mesh.material = getMaterial(object.color,object.opacity,options.texture,object.basicMat,object.emissive,object.metal,null);
                } else {
                    // this will need changed eventually
                    // so it does not change the opacity of everything
                    object.mesh.material.opacity = object.opacity;

                }
                
            }
        }

        if(options.src != undefined && options.src != null) {
            if(object.type == "sprite") {
                getSpriteMaterial(options.src, object.opacity, object.color,function(spriteMaterial) {
                    object.mesh.material = spriteMaterial;
                });
            }
        }

        if(didMove) {

            if(object.hasCircle) {
                const cirOb = instance.objects[object.hasCircle];

                if(cirOb) {
                    let size = object.width;

                    if(object.height > size) {
                        size = object.height;
                    }
        
                    let offset = 0;
        
                    if(size > 1) {
                        offset = (size - 1) / 2;
                    }
        
                    size = size * 0.75;

                    instance.updateObject(object.hasCircle,{
                        x: object.x + offset,
                        y: object.y + offset,
                        z: object.z - 0.48
                    });
                } else {
                    object.hasCircle = null;
                }
            }

            if(object.instanceParentId) {
                const hold = instance.vppInstances[object.instanceParentId];

                if(hold) {
                    hold.changed = true;
                }
            }

            normalizeObjectPosition(object);
        }

        instance.shouldRender = true;
    }

    removeObject(id, tries = 0) {
        const instance = this;
        const object = instance.objects[id];

        if(!object) {
            instance.removeRetryObjects.push({
                id: id,
                tries: tries + 1
            });

            if(tries > 20) {
                delete instance.objects[id];
                return true;
            }

            return false;
        }

        if(object.mesh) {
            removeFromArray(instance.hitTestObjects, object.mesh);
        }
        
        object.isDisposed = true;

        let andDispose = false;

        if(object.circleFor) {
            const forOb = instance.objects[object.circleFor];

            if(forOb) {
                forOb.hasCircle = null;
            }
        }

        if(object.type) {
            if(object.type == "line") {
                andDispose = true;
            }

            if(object.type == "text") {
                andDispose = true;
            }

            if(object.type == "sprite") {
                andDispose = true;
            }

            if(object.type == "fakelight") {
                andDispose = true;
            }

            if(object.type == "pointlight") {
                andDispose = true;
            }
        }

        if(object.object) {
            removeObjectFromThree(instance, object.object, andDispose);
        }

        if(object.mesh) {
            removeObjectFromThree(instance, object.mesh, andDispose);
        }

        if(object.instanceParentId) {
            const hold = instance.vppInstances[object.instanceParentId];

            if(hold) {
                removeFromArray(hold.items, object.id);
                hold.changed = true;
            }
        }
        
        delete instance.objects[id];

        instance.shouldRender = true;

        return true;
    }

    addChunk(data) {
        const instance = this;

        const defTexture = data.defTexture;

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        let defMidBleed = null;
        let hasWater = false;

        let waterColor = "#03A9F4";

        if(data.defTexture.topBleeds) {
            defMidBleed = defTexture.top;
        }

        const defTop = getTextureIndex({
            texture: defTexture.top,
            noise: defTexture.noise,
            noiseSize: this.vppSize,
            topBlendColor: null
        }, data, this);

        const defMid = getTextureIndex({
            texture: defTexture.middle,
            noise: defTexture.noise,
            noiseSize: this.vppSize,
            topBlendColor: defMidBleed
        }, data, this);

        const defBot = getTextureIndex({
            texture: defTexture.middle,
            noise: defTexture.noise,
            noiseSize: this.vppSize,
            topBlendColor: null
        }, data, this);

        if(defTop == -1 || defMid == -1 || defBot == -1) {

            setTimeout(function() {
                instance.addChunk(data);
            }, 200);

            return;
        }

        const totalAtlasSize = curAtlasIndex * useTextureSize;

        for(let x = 0; x < data.data.length; x++) {
            for(let z = 0; z < data.data.length; z++) {
                const obj = data.data[x][z];

                if(!obj) {
                    continue;
                }

                const result = addChunkObPart(instance, obj, data, x, z, defTop, defBot, defMid, defTexture, defMidBleed, positions, normals, uvs, indices, totalAtlasSize, waterColor, hasWater);

                if(!result) {
                    return;
                }

                if(result.hasWater) {
                    hasWater = true;
                }

                waterColor = result.waterColor;
            }
        }


        let endingAssetSize = curAtlasIndex * useTextureSize;

        let rOrder = "0";

        if(data.rOrder) {
            rOrder = data.rOrder;
        }

        if(endingAssetSize != totalAtlasSize) {
            instance.addChunk(data);
            return;
        } else {
            const cellgeo = new BufferGeometry();

            const positionNumComponents = 3;
            const normalNumComponents = 3;
            const uvNumComponents = 2;
            
            cellgeo.setAttribute(
                "position",
                new BufferAttribute(new Float32Array(positions), positionNumComponents));

            cellgeo.setAttribute(
                "normal",
                new BufferAttribute(new Float32Array(normals), normalNumComponents));

            cellgeo.setAttribute(
                "uv",
                new BufferAttribute(new Float32Array(uvs), uvNumComponents));

            cellgeo.setIndex(indices);

            cellgeo.scale(2, 2, 2);

            cellgeo.normalsNeedUpdate = true;
            cellgeo.computeVertexNormals();

            const mesh = new Mesh(cellgeo, curAtlasMaterial);

            const meshX = (data.x * instance.chunkSize) * 2;
            const meshY = (data.y * instance.chunkSize) * 2;

            mesh.position.set(meshX, 0, meshY);

            mesh.receiveShadow = true;

            const chunkId = data.x + ":" + data.y + ":" + rOrder;

            instance.removeChunk(data.x, data.y, rOrder, 500);

            instance.chunks[chunkId] = mesh;

            instance.scene.add(mesh);
            instance.hitTestObjects.push(mesh);

            clearAllParticleSystems(instance);
        }

        if(hasWater && instance.waterTexture && !instance.waterPlane) {

            if(!instance.waterGeometry) {
                instance.waterGeometry = new PlaneGeometry(256, 256);
            }

            instance.waterPlane = new Refractor(instance.waterGeometry, {
                color: waterColor,
                textureWidth: 1024, 
                textureHeight: 1024,
                shader: WaterRefractionShader,
                depthTest: true,
                depthWrite: false
            });

            instance.waterPlane.material.uniforms.tDudv.value = instance.waterTexture;

            instance.waterPlane.position.set(instance.centerPosition.x * 2, 1.8, instance.centerPosition.y);
            instance.waterPlane.rotation.x = - π * 0.5;

            instance.scene.add(instance.waterPlane);
            instance.hitTestObjects.push(instance.waterPlane);
        }
    }

    removeChunk(x, y, rOrder, withDelay = 0) {
        const instance = this;

        if(rOrder == null || rOrder == undefined) {
            rOrder = "0";
        }

        const chunkId = x + ":" + y + ":" + rOrder;

        if(!instance.chunks[chunkId]) {
            return;
        }

        const chunkDat = instance.chunks[chunkId];

        if(chunkDat) {
            removeFromArray(instance.hitTestObjects, chunkDat);
        }

        if(withDelay && !isNaN(withDelay) && withDelay > 0) {
            setTimeout(function() {
                removeObjectFromThree(instance, chunkDat, true);
            }, withDelay);
        } else {
            removeObjectFromThree(instance, chunkDat, true);
        }

        delete instance.chunks[chunkId];

        setCameraPosition(instance);
    }

    addOutlineTileGroupObject(options) {
        if(!options.tileOffset) {
            options.tileOffset = 0;
        }

        const linesToDraw = getGroupRegionLines(options.tilesArray);
        const points = [];

        for(let i = 0; i < linesToDraw.length; i++) {
            const ltd = linesToDraw[i];

            let useZ = options.z;

            if(ltd.z) {
                useZ = ltd.z;
            }

            points.push(new Vector3(ltd.x1 * 2, useZ * 2, ltd.y1 * 2));
            points.push(new Vector3(ltd.x2 * 2, useZ * 2, ltd.y2 * 2));

        }

        return this.addObject({
            type: "line",
            color: options.color,
            width: options.width,
            points: points,
            dashed: options.dashed,
            notHittable: true,
            rawTiles: options.tilesArray,
            rawZ: options.z,
            fillRef: options.fill
        });
    }

    addOutlineChunkObject(options) {
        const instance = this;

        if(!options.tileOffset) {
            options.tileOffset = 0;
        }

        let linesToDraw = getGroupRegionLines(options.tilesArray);
        let ltd;
        let points = [];

        for(let i = 0; i < linesToDraw.length; i++) {
            ltd = linesToDraw[i];

            let useZ = options.z;

            if(ltd.z) {
                useZ = ltd.z;
            }

            points.push(new Vector3((ltd.x1 * instance.chunkSize) * 2,useZ * 2,(ltd.y1 * instance.chunkSize) * 2));
            points.push(new Vector3((ltd.x2 * instance.chunkSize) * 2,useZ * 2,(ltd.y2 * instance.chunkSize) * 2));
        }

        return this.addObject({
            type: "line",
            color: options.color,
            width: options.width,
            points: points,
            dashed: options.dashed,
            notHittable: true
        });
    }

    clearAllObjects() {
        const instance = this;

        if(instance.waterPlane) {
            removeObjectFromThree(instance, instance.waterPlane, true);
        }

        if(instance.skydome) {
            removeObjectFromThree(instance, instance.skydome, true);
        }

        if(instance.stardome) {
            removeObjectFromThree(instance, instance.stardome, true);
        }

        if(instance.grid) {
            removeObjectFromThree(instance, instance.grid, true);
        }

        instance.waterTexture = null;
        instance.waterPlane = null;
        instance.skydome = null;
        instance.stardome = null;
        instance.grid = null;

        for(let objname in instance.objects) {
            const obj = instance.objects[objname];
            removeObjectFromThree(instance,obj.object,true);
        }

        for(let chunkid in instance.chunks) {
            let chunkParts = chunkid.split(":");

            instance.removeChunk(chunkParts[0],chunkParts[1],chunkParts[2]);
        }

        instance.objects = {};
        instance.chunks = {};
        instance.hitTestObjects = [];
        instance.particleSystems = {};

        if(instance.vppInstances) {
            for(let insName in instance.vppInstances) {
                const instOb = instance.vppInstances[insName];

                if(!instOb) {
                    continue;
                }

                removeObjectFromThree(instance, instOb.mesh, true);

                instOb.items = [];
                instOb.mesh = null;
                instOb.rawMesh = null;
            }
        }

        instance.vppInstances = {};

        clearOrientationViewer(instance);
    }

    outlineObjects(objectIds, visColor, hidColor, useSize) {
        const instance = this;
        instance.circleUnderObjects(objectIds,visColor,useSize);
    }

    circleUnderObjects(objectIds, visColor = "#2196F3", useSize = null) {
        const instance = this;

        clearAutoCircleObjects(instance);

        for(let i = 0; i < objectIds.length; i++) {
            const object = instance.objects[objectIds[i]];

            if(!object) {
                continue;
            }

            let size = object.width;

            if(object.height > size) {
                size = object.height;
            }

            let offset = 0;

            if(size > 1) {
                offset = (size - 1) / 2;
            }

            size = size * 0.75;

            if(useSize) {
                size = useSize;
            }

            const id = instance.addObject({
                type: "circle",
                x: object.x + offset,
                y: object.y + offset,
                z: object.z - 0.48,
                color: visColor,
                radius: size,
                circleFor: object.id
            });

            instance.curAutoCircleObjects.push(id);

            object.hasCircle = id;

        }
    }

    rebuildEnvironmentMap() {
        const instance = this;
        console.log(instance);
        console.log("rebuildEnvironmentMap needs implemented or removed");
    }

    convertPositionToCoordinate(x, y) {
        const instance = this;
        return actualLocationToVirtual(instance, x, y);
    }

    setFilmModeEnabled(enabled, blackAndWhite) {
        const instance = this;

        if(!instance) {
            return;
        }

        if(!blackAndWhite) {
            blackAndWhite = false;
        }

        instance.filmMode = enabled;
        instance.filmModeBW = blackAndWhite;

        initPostProcessor(instance);
    }

    getGroundPosForOb(id, ux = null, uy = null, vsOb = null) {
        const instance = this;
        const object = instance.objects[id];

        if(!object) {
            return null;
        }

        if(ux == null) {
            ux = object.x;
        }

        if(uy == null) {
            uy = object.y;
        }

        let chkOb = null;

        if(vsOb) {
            chkOb = instance.objects[vsOb];

            if(chkOb && chkOb.instanceParentId) {
                chkOb = instance.objects[chkOb.instanceParentId];
            }
        }

        let checkAgainst = instance.hitTestObjects;

        if(chkOb) {
            checkAgainst = [chkOb.object];
        }

        const obTop = (object.z * 2) + object.rawTallness;
        const dispTop = obTop / 2;

        let cx = ux * 2;
        let cy = uy * 2;

        if(object.type == "mesh") {
            cx = (ux * 2 + (object.width));
            cy = (uy * 2 + (object.height));

            if(!object.isSymmetrical) {
                cx = (ux + 0.5) * 2;
                cy = (uy + 0.5) * 2;
            }
        }

        // first check from up in sky
        instance.custCastOrigin.set(cx, 9999, cy);
        instance.raycaster.set(instance.custCastOrigin, instance.custCastDirection);

        try {
            const hits = instance.raycaster.intersectObjects(checkAgainst, true);
            const checkFromSky = checkHits(hits, id);

            if(checkFromSky && checkFromSky.abs && checkFromSky.abs.z > dispTop) {
                // if hit is above the head, check from the head down
                instance.custCastOrigin.set(cx, obTop, cy);
                instance.raycaster.set(instance.custCastOrigin, instance.custCastDirection);

                const hits2 = instance.raycaster.intersectObjects(checkAgainst, true);
                const checkFromHead = checkHits(hits2, id);

                // if we have a hit above ground level, report that
                if(checkFromHead && checkFromHead.abs && checkFromHead.abs.z > object.z) {
                    return checkFromHead;
                }

                // otherwise look to the sky.  if we hit something, there is probably an overhang
                instance.raycaster.set(instance.custCastOrigin, instance.upCastDirection);

                const hits3 = instance.raycaster.intersectObjects(checkAgainst, true);
                const checkToSky = checkHits(hits3, id);

                if(checkToSky && checkToSky.abs) {

                    // final check from hit to ground.  if it is above the player, then blocked.  else return checkFromHead
                    instance.custCastOrigin.set(cx, checkToSky.abs.z * 2, cy);
                    instance.raycaster.set(instance.custCastOrigin, instance.custCastDirection);

                    const hits4 = instance.raycaster.intersectObjects(checkAgainst, true);
                    const checkBackToGround = checkHits(hits4, id);

                    if(checkBackToGround && checkBackToGround.abs && checkBackToGround.abs.z < dispTop) {
                        return checkFromHead;
                    }
                }
            }

            return checkFromSky;
        } catch(ex) {
            console.log(ex);
        }

        return null;
    }

    setOnZoomFunction(func) {
        this.onZoomed = func;
    }

    setCameraTarget(target, lerpSpeed = 0.075) {
        const instance = this;

        instance.lerpSpeed = lerpSpeed;

        if(instance.cameraTarget) {
            const tgtOb = instance.objects[instance.cameraTarget];

            if(tgtOb) {
                tgtOb.camGoal.remove(instance.camera);
            }
        }

        instance.cameraTarget = target;

        if(target) {
            const obj = instance.objects[target];

            if(obj) {
                let use = obj.mesh;

                if(!use) {
                    use = obj.object;
                }

                if(!use) {
                    return;
                }

                resetObjectCameraPosition(instance,obj);

                use.updateMatrixWorld();
        
                use.localToWorld(obj.cameraTarget);
            } else {
                instance.cameraTarget = null;
            }
        }

        setCameraPosition(instance);
    }

    setSizeOutMultiplier(mult) {
        this.sizeOutMultiplier = mult;
    }

    setCamerePoleOffset(offset) {
        this.poleOffset = offset;
        setCameraPosition(this);
    }

    setPlane(options) {
        if(this.plane) {
            removeObjectFromThree(this,this.plane);
        }

        this.plane = null;

        if(!globalPlaneGeo) {
            globalPlaneGeo = new PlaneGeometry(10000, 10000);
            globalPlaneGeo.rotateX( - π / 2 );
        }

        if(!options) {

            this.plane = new Mesh( globalPlaneGeo, new MeshBasicMaterial( { visible: false } ) );
            this.scene.add(this.plane);
            this.hitTestObjects.push(this.plane);

            return;
        }

        let color = null;
        let opacity = 1;
        let texture = null;

        if(options.color) {
            color = options.color;
        }

        if(options.opacity) {
            opacity = options.opacity;
        }

        if(options.texture) {
            texture = options.texture;
        }

        let mat = getMaterial(color,opacity,texture);

        this.plane = new Mesh(globalPlaneGeo, mat);
        this.scene.add(this.plane);

        this.hitTestObjects.push(this.plane);
    }

    setGrid(options) {
        const instance = this;

        if(instance.grid) {
            removeObjectFromThree(instance, instance.grid, true);
        }

        instance.grid = null;

        if(!options) {
            return;
        }

        let width = 40;
        let segments = 20;

        if(options.width) {
            width = options.width * 2;
        }

        if(options.segments) {
            segments = options.segments;
        } else {
            segments = Math.round(width / 2);
        }

        instance.grid = new GridHelper(width, segments);
        instance.scene.add(instance.grid);
        instance.hitTestObjects.push(instance.grid);
    }

    setAbsoluteSize(w, h) {
        const instance = this;

        instance.forceWidth = w;
        instance.forceHeight = h;

        setInstanceSize(instance);
    }

    centerOnPosition(options) {
        if(options.x != undefined) {
            this.centerPosition.x = options.x;
        }

        if(options.y != undefined) {
            this.centerPosition.y = options.y;
        }

        if(options.z != undefined) {
            this.centerPosition.z = options.z;
        }

        if(options.phi != undefined) {
            this.phi = options.phi;
        }

        if(options.radius != undefined) {
            this.radius = options.radius;
        }

        if(options.theta != undefined) {
            this.theta = options.theta;
        }

        if(options.scale != undefined) {
            this.cameraScale = options.scale;
        }

        setCameraPosition(this);
    }

    setCameraMode(val) {
        this.cameraMode = val;
    }

    getCanvas() {
        return this.renderer.domElement;
    }

    setMinZoom(mz) {
        this.minZoom = mz;
    }

    setMaxZoom(mz) {
        this.maxZoom = mz;
    }

    setMinPhi(mp) {
        this.minPhi = mp;
    }

    setMaxPhi(mp) {
        this.maxPhi = mp;
    }

    setFocusMod(mod) {
        this.focusMod = mod;
        updateFOVCamera(this);
        this.camera.updateMatrix();
        this.shouldRender = true;
    }

    setApertureRatio(ratio) {
        this.apertureRatio = ratio;
        updateFOVCamera(this);
        this.camera.updateMatrix();
        this.shouldRender = true;
    }

    playExplosion(options) {
        let imageFile = null;
        let x = 0;
        let y = 0;
        let z = 0;

        let alpha = 1.0;
        let particles = 10;
        let velocity = 6;
        let size = 2.0;

        let colorFirst = "#ff0000";
        let colorSecond = "#00ff00";

        let maxLife = 10.0;
        let blending = "additive";

        if(options) {
            if(options.blending != undefined) {
                blending = options.blending;
            }

            if(options.image != undefined) {
                imageFile = options.image;
            }

            if(options.particleLife != undefined) {
                maxLife = options.particleLife;
            }
            
            if(options.x != undefined) {
                x = options.x;
            }

            if(options.y != undefined) {
                y = options.y;
            }

            if(options.z != undefined) {
                z = options.z;
            }

            if(options.size != undefined) {
                size = options.size;
            }

            if(options.zVelocity != undefined) {
                velocity = options.zVelocity;
            }

            if(options.alpha != undefined) {
                alpha = options.alpha;
            }

            if(options.startColor != undefined) {
                colorFirst = options.startColor;
            }

            if(options.endColor != undefined) {
                colorSecond = options.endColor;
            }

            if(options.particles != undefined) {
                particles = options.particles;
            }
        }

        const cSpline = getLinearColorSpline(colorFirst, colorSecond);
        const aSpline = getLinearAlphaSline(alpha);

        const instance = this;

        const systemName = imageFile + ":" + blending;

        if(!instance.particleSystems[systemName]) {
            addParticleSystem(instance, imageFile, blending);
        }

        const pSystem = instance.particleSystems[systemName];


        for(let i = 0; i < particles; i++) {
            const ux = (x * 2) + ((Math.random() * 2 - 1) * 1.0);
            const uy = (z * 2) + ((Math.random() * 2 - 1) * 1.0);
            const uz = (y * 2) + ((Math.random() * 2 - 1) * 1.0);

            const life = (Math.random() * 0.75 + 0.25) * maxLife;

            pSystem.particles.push(getNewParticle({
                position: new Vector3(ux,uy,uz),
                size: (Math.random() * 0.5 + 0.5) * size,
                colour: new Color(colorFirst),
                colorSpline: cSpline,
                alpha: alpha,
                alpheSpline: aSpline,
                life: life,
                maxLife: life,
                rotation: Math.random() * 2.0 * π,
                velocity: new Vector3(0, velocity, 0)
            }));
        }
    }

    setSky(options) {
        clearLighting(this);

        if(!options) {
            setInstanceLight(this, "#ffffff");
            return;
        }

        this.skyTopColor = "#FFFDE7";
        this.skyBottomColor = "#E1F5FE";
        this.sunColor = "#ffffff";
        this.hemiBrightness = 0.6;

        this.showSun = false;

        if(options.top) {
            this.skyTopColor = options.top;
        }

        if(options.bottom) {
            this.skyBottomColor = options.bottom;
        }

        if(options.noSky != undefined) {
            this.noSky = options.noSky;
        }

        if(options.sun) {
            if(options.sun.color) {
                this.sunColor = options.sun.color;
            }

            if(options.sun.brightness) {
                this.hemiBrightness = options.sun.brightness;
            }

            if(options.sun.show) {
                this.showSun = true;
            }

            if(options.sun.angle) {
                this.sunAngle = options.sun.angle;
            }

            if(options.sun.yOffset) {
                this.sunYoffset = options.sun.yOffset;
            }
        }

        addSkyObjects(this);
        setCameraPosition(this);
    }

    setDefaultWaterOpacity(op) {
        this.defaultWaterOpacity = op;
    }

    setSunAngle(deg) {
        if((!this.skydome && !this.noSky) || !this.stardome) {
            addSkyObjects(this);
        }

        if(this.sunAngle == deg) {
            return;
        }

        this.sunAngle = deg;

        normalizeSunPosition(this);
    }

    updateSun(options) {
        let readdNeeded = false;

        if(options.show != undefined) {
            this.showSun = options.show;

            if(!this.showSun) {
                if(this.sunSphere) {
                    removeObjectFromThree(this,this.sunSphere,true);
                }
            }
        }

        if(options.color) {
            if(options.color != this.sunColor) {
                readdNeeded = true;
                this.sunColor = options.color;
            }
            
        }

        if(options.brightness) {
            this.hemiBrightness = options.brightness;
        }
        
        if(options.angle) {
            this.sunAngle = options.angle;
        }

        if(readdNeeded) {
            addSkyObjects(this);
        } else {
            normalizeSunPosition(this);
        }
    }

    setInstanceLight(color) {
        const instance = this;

        clearLighting(instance);

        const darkerColor = LightenDarkenColor(color, -120);

        instance.ambientLight = new AmbientLight(darkerColor, SUN_INTENSITY);
        instance.scene.add(instance.ambientLight);

        instance.directionalLight = new DirectionalLight(color, SUN_INTENSITY);
        instance.directionalLight.position.set(1, 0.75, 0.5).normalize();
        instance.directionalLight.castShadow = true;
        instance.scene.add(instance.directionalLight);
    }

    setEdgeScrolling(val) {
        this.edgeScrolling = val;
    }

    setSnowing(snowing) {
        let instance = this;

        if(!instance) {
            return;
        }

        if(!snowing) {
            snowing = false;
        }

        let blending = "normal";

        let imageFile = getSnowParticleTexture();

        let systemName = imageFile + ":" + blending;

        if(snowing) {
            if(!instance.particleSystems[systemName]) {
                addParticleSystem(instance,imageFile,blending);
    
                let pSystem = instance.particleSystems[systemName];
                pSystem.isSpecial = "snow";
            }
        }

        instance.isSnowing = snowing;
    }

    setWaterTexture(url) {
        let instance = this;

        instance.waterTextureUrl = url;

        if(url) {
            instance.waterTexture = TEXTURE_LOADER.load(instance.waterTextureUrl);
            instance.waterTexture.wrapS = instance.waterTexture.wrapT = RepeatWrapping; 

            instance.waterTexture.colorSpace = USE_COLORSPACE;
        } else {

            if(instance.waterPlane) {
                removeObjectFromThree(instance,instance.waterPlane,true);
            }

            instance.waterTexture = null;
            instance.waterPlane = null;
        }
    }

    setHUDCanvas(canvas) {
        const instance = this;

        if(instance.currentHudCanvas) {

            instance.camera.remove(instance.currentHudCanvasMesh);

            instance.currentHudCanvas = null;
            instance.currentHudCanvasTexture = null;
            instance.currentHudCanvasMesh = null;
        }

        if(canvas) {
            instance.currentHudCanvas = canvas;
            instance.currentHudCanvasTexture = new CanvasTexture(canvas);
            instance.currentHudCanvasTexture.colorSpace = USE_COLORSPACE;

            const hudMaterial = new MeshBasicMaterial({
                map: instance.currentHudCanvasTexture,
                transparent: true,
                depthTest: false,
                side: DoubleSide
            });

            const geo = new PlaneGeometry(1,1);

            instance.currentHudCanvasMesh = new Mesh(geo,hudMaterial);

            instance.currentHudCanvasMesh.position.y = 0;
            instance.currentHudCanvasMesh.position.x = 0;

            setHudCanvasPosition(instance);
            
            instance.currentHudCanvasMesh.layers.set(1);
            instance.camera.add(instance.currentHudCanvasMesh);
            
            instance.currentHudCanvasTexture.needsUpdate = true;
        }
    }

    updateHUDCanvas() {
        const instance = this;

        if(instance.currentHudCanvasTexture) {
            instance.currentHudCanvasTexture.needsUpdate = true;

            setHudCanvasPosition(instance);
        }
    }

    squareUpCanvas(square) {
        const instance = this;

        instance.squaredUp = square;
        setInstanceSize(instance);
    }

    setUseDynamicLighting(enabled) {
        const instance = this;

        instance.dynamicLighting = enabled;

        for(let objid in instance.objects) {
            const obj = instance.objects[objid];
            initVPPLightsAndEmitters(obj);
        }
    }

    setRotationLock(lock) {
        this.rotationLock = lock;
    }

    setRenderScale(scale) {
        const instance = this;
        instance.renderScale = scale;
        setInstanceSize(instance);
    }

    setClickFunction(func) {
        this.clickFunction = func;
    }

    setHoverFunction(func) {
        this.hoverFunction = func;
    }

    setRightClickFunction(func) {
        this.rightClickFunction = func;
    }

    setVPPTileSize(size) {
        this.vppSize = size;
        this.vppRatio = 2 / size;
    }

    setChunkSize(size) {
        this.chunkSize = size;
    }

    setCameraMovedFunction(func) {
        this.cameraMovedFunction = func;
    }

    setRenderLoopFunction(func) {
        this.renderLoopFunction = func;
    }

    setPointerListener(listener) {
        this.pointerListener = listener;
    }

    setWheelFunction(func) {
        this.wheelFunction = func;
    }

    setShadowsEnabled(enabled) {
        const instance = this;

        instance.shadows = enabled;
        instance.renderer.shadowMap.enabled = enabled;

        instance.renderer.shadowMap.needsUpdate = true;
    }

    setAntialiasingEnabled(enabled) {
        const instance = this;

        instance.antialias = enabled;

        if(instance.renderer) {
            instance.renderer.antialias = enabled;
        }

        rebuildInstanceRenderer(instance);
    }

    setDOFEnabled(enabled) {
        const instance = this;

        instance.useDOFEffect = enabled;

        initPostProcessor(instance);
    }

    setGamepadListeners(down, up, velocity, blockADL = false) {
        const instance = this;

        instance.padDown = down;
        instance.padUp = up;
        instance.padVelocity = velocity;

        if(blockADL) {
            GPH.setADLInstance(null);
        }
    }

    setUIGamepadElement(element, withFocus) {
        const instance = this;

        instance.uiGamepadElement = element;

        if(withFocus) {
            GPH.setGamepadTitleItem(withFocus);
        } else {
            GPH.clearGamepadTitleItem();
        }
    }

    enterVRMode(callback) {
        const instance = this;

        if(instance.xr) {
            navigator.xr.requestSession("immersive-vr",{
                optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"]
            }).then(async function(session) {

                instance.vrSession = session;

                if(GPH) {
                    GPH.setVRSession(session);
                }

                session.addEventListener("end", function() {

                    instance.vrSession = null;

                    if(GPH) {
                        GPH.setVRSession(null);
                    }

                    zeroOutCameraPosition(instance);

                    instance.shouldRender = true;
                    updateFOVCamera(instance);
                    instance.camera.updateMatrix();

                    setCameraPosition(instance);
                    instance.updateHUDCanvas();

                    if(callback) {
                        callback();
                    }

                    setTimeout(onResize, 150);

                    instance.camera.updateMatrix();
                });

                zeroOutCameraPosition(instance);

                await instance.renderer.xr.setSession(session); 

                instance.shouldRender = true;
                updateFOVCamera(instance);
                instance.camera.updateMatrix();

                setCameraPosition(instance);
                instance.updateHUDCanvas();

                instance.camera.updateMatrix();
            });
        } else {
            if(callback) {
                callback();
            }
        }
    }

    exitVRMode() {
        const instance = this;

        if(instance.vrSession) {
            instance.vrSession.end();
        }
    }

    handleInstanceGamepadInput() {
        console.log("handleInstanceGamepadInput depreciated, switch to new implementation");
    }

    getCameraRadius() {
        return this.radius;
    }

    getCameraPosition() {
        let instance = this;

        const hp1 = actualLocationToVirtual(instance,0,0);
        const hp2 = actualLocationToVirtual(instance,instance.canvas.width,0);
        const hp3 = actualLocationToVirtual(instance,instance.canvas.width,instance.canvas.height);
        const hp4 = actualLocationToVirtual(instance,0,instance.canvas.height);
        
        return {
            x: instance.centerPosition.x,
            y: instance.centerPosition.y,
            z: instance.centerPosition.z,
            phi: instance.phi,
            radius: instance.radius,
            theta: instance.theta,
            corners: {
                tl: hp1,
                tr: hp2,
                br: hp3,
                bl: hp4
            }
        };
    }

    getCamera() {
        return this.camera;
    }

    getCameraPitchAndRotation() {
        const instance = this;

        let usePitch = instance.camera.rotation.x;
        let useRotation = instance.camera.rotation.y;

        if(instance.vrSession) {
            instance.camera.getWorldDirection(instance.cameraVector);
            useRotation = Math.atan2(instance.cameraVector.x,instance.cameraVector.z) + π;
        }

        return {
            pitch: usePitch,
            rotation: useRotation - ONE_POINT_FIVE_π
        };
    }

    setOrientationViewer(holder) {
        const instance = this;

        if(!instance) {
            return;
        }

        clearOrientationViewer(instance);

        if(holder) {

            instance.orientationHolder = holder;

            instance.orientationScene = new Scene();
            instance.orientationCamera = new PerspectiveCamera( 75, holder.offsetWidth / holder.offsetHeight, 0.05, 1000 );

            instance.orientationRenderer = new WebGLRenderer({
                alpha: true
            });
            instance.orientationRenderer.setSize(holder.offsetWidth, holder.offsetHeight);

            holder.appendChild(instance.orientationRenderer.domElement);

            const piece = new BoxGeometry(1, 1, 1).toNonIndexed();

            const material = new MeshBasicMaterial({
                vertexColors: true
            });


            const positionAttribute = piece.getAttribute("position");
            const colors = [];
            
            const color = new Color();

            let face = 0;
            
            for (let i = 0; i < positionAttribute.count; i += 6) {
                color.setHex(getHexForFace(face));
            
                colors.push(color.r, color.g, color.b);
                colors.push(color.r, color.g, color.b);
                colors.push(color.r, color.g, color.b);
            
                colors.push(color.r, color.g, color.b);
                colors.push(color.r, color.g, color.b);
                colors.push(color.r, color.g, color.b);

                face++;
            }
            
            // define the new attribute
            piece.setAttribute("color", new Float32BufferAttribute(colors, 3));

            instance.orientationCube = new Mesh(piece,material);
            instance.orientationScene.add(instance.orientationCube);

            instance.orientationCamera.position.z = 2.4;

            instance.orientationRenderer.domElement.onclick = function(e){
                let x = e.clientX;
                let y = e.clientY;

                x -= getOffset(holder).left;
                y -= getOffset(holder).top;

                let mouse = { 
                    x : (x / holder.offsetWidth ) * 2 - 1, 
                    y : -( y / holder.offsetHeight ) * 2 + 1
                };

                instance.raycaster.setFromCamera(mouse, instance.orientationCamera);
                let hits = instance.raycaster.intersectObjects(instance.orientationScene.children);

                if(hits && hits.length == 1) {
                    let fi = hits[0].faceIndex;

                    // right 
                    if(fi == 0 || fi == 1) {
                        instance.theta = 180;
                        instance.phi = 0;

                        setCameraPosition(instance);
                    }

                    // left 
                    if(fi == 2 || fi == 3) {
                        instance.theta = 540;
                        instance.phi = 0;

                        setCameraPosition(instance);
                    }

                    // top 
                    if(fi == 4 || fi == 5) {
                        instance.theta = 0;
                        instance.phi = 180;

                        setCameraPosition(instance);
                    }

                    // bottom 
                    if(fi == 6 || fi == 7) {
                        instance.theta = 0;
                        instance.phi = -180;

                        setCameraPosition(instance);
                    }

                    // face front
                    if(fi == 8 || fi == 9) {
                        instance.theta = 0;
                        instance.phi = 0;

                        setCameraPosition(instance);
                    }

                    // back front
                    if(fi == 10 || fi == 11) {
                        instance.theta = 360;
                        instance.phi = 0;

                        setCameraPosition(instance);
                    }
                }
            };
        }
    }

    dispose() {
        const instance = this;

        if(instance.renderer) {
            instance.renderer.setAnimationLoop(null);
        }

        delete scrollInstances[instance.id];

        instance.clearAllObjects();

        clearAllParticleSystems(instance);

        instance.renderer = null;
        instance.scene = null;
        instance.camera = null;
        instance.centerObject = null;
        instance.vrCamHolder = null;
        instance.canvas = null;
        instance.mouse = null;
        instance.raycaster = null;
        instance.waterTexture = null;
        instance.waterPlane = null;
        instance.effectAnaglyph = null;
        instance.postprocessor = {};

        instance.holder.innerHTML = "";
    }
}

class WorldObject {
    constructor(options) {
        this.id = options.useId || guid();

        this.object = new Object3D();
        this.mesh = options.mesh || null;

        this.isDisposed = false;
        this.blockInstancing = options.blockInstancing || false;

        this.x = options.x || 0;
        this.y = options.y || 0;
        this.z = options.z || 0;
        this.centerInTile = options.centerInTile || false;
        this.opacity = options.opacity || 1;
        this.type = options.type;
        this.rot = options.rot || 0;
        this.width = options.width || 1;
        this.height = options.height || 1;
        this.rawTallness = 2;
        this.color = options.color || null;
        this.color2 = options.color2 || null;

        let defNoHit = false;

        if(this.type == "sprite" || this.type == "fakelight") {
            defNoHit = true;
        }

        this.notHittable = options.notHittable || defNoHit;
        this.texture = options.texture || null;
        this.points = options.points || [];
        this.dashed = options.dashed || false;
        this.text = options.text || null;
        this.bars = options.bars || [];
        this.shadows = options.shadows || true;
        this.shadow = options.shadow || false;
        this.radius = options.radius || 1;
        this.intensity = options.intensity || 1; 
        this.basicMat = options.basicMat || options.useBasic || false;
        this.useLights = options.useLights || true;
        this.scale = options.scale || 1;
        this.isSymmetrical = options.isSymmetrical || true;
        this.emissive = options.emissive || null;
        this.metal = options.metal || false;
        this.scene = options.scene || null;
        this.custCanvas = null;
        this.custContext = null;
        this.vppData = options.vppData || null;
        this.vppPath = options.vppPath || null;
        this.instance = options.instance || null;
        this.vppMeshNameRef = null;
        this.progress = options.progress || 0;
        this.barTexture = null;
        this.tiles = options.tiles || null;
        this.file = options.file || null;
        this.rawTiles = options.rawTiles || null;
        this.fillRef = options.fillRef || null;
        this.rawZ = options.rawZ || 0;
        this.src = options.src || null;

        this.lights = [];
        this.emitters = [];

        this.hasCircle = null;
        this.circleFor = options.circleFor || null;

        // for camera follow mode
        this.camGoal = new Object3D();
        this.cameraTarget = new Vector3();
        this.cameraPosition = new Vector3();
        
        this.instancePositions = options.positions || [];
        this.instanceCount = options.count || DEF_INSTANCE_COUNT;

        this.instanceMatrix = new Matrix4();
        this.instancePosition = new Vector3();
        this.instanceRotation = new Euler();
        this.instanceQuaternion = new Quaternion();
        this.instanceScale = new Vector3();

        this.instanceParentId = null;

        initWorldObject(this);
    }
}

class LinearSpline {
    constructor(lerp) {
        this.points = [];
        this.lerp = lerp;
    }

    AddPoint(t, d) {
        this.points.push([t,d]);
    }

    Get(t) {
        let p1 = 0;

        for (let i = 0; i < this.points.length; i++) {
            if (this.points[i][0] >= t) {
                break;
            }

            p1 = i;
        }

        const p2 = Math.min(this.points.length - 1, p1 + 1);

        if (p1 == p2) {
            return this.points[p1][1];
        }

        return this.lerp(
            (t - this.points[p1][0]) / (
                this.points[p2][0] - this.points[p1][0]),
            this.points[p1][1], this.points[p2][1]);
    }
}

class ParticleSystem {
    constructor(params) {

        const PS = this;

        this.params = params;
        this.isSpecial = null;

        let useBlending = AdditiveBlending;

        if(params.blending && params.blending == "normal") {
            useBlending = NormalBlending;
        }

        let pointMP = window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * ONE_EIGHTY_π));

        this.uniforms = {
            diffuseTexture: {
                value: TEXTURE_LOADER.load(PS.params.image)
            },
            pointMultiplier: {
                value: pointMP
            }
        };

        this.uniforms.diffuseTexture.value.colorSpace = USE_COLORSPACE;

        this.material = new ShaderMaterial({
            uniforms: PS.uniforms,
            vertexShader: PARTICLE_VERTEX_SHADER,
            fragmentShader: PARTICLE_FRAGMENT_SHADER,
            blending: useBlending,//AdditiveBlending
            depthTest: true,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this.particles = [];

        this.geometry = new BufferGeometry();
        this.geometry.setAttribute("position", new Float32BufferAttribute([], 3));
        this.geometry.setAttribute("size", new Float32BufferAttribute([], 1));
        this.geometry.setAttribute("colour", new Float32BufferAttribute([], 4));
        this.geometry.setAttribute("angle", new Float32BufferAttribute([], 1));

        this.points = new Points(this.geometry, this.material);
        this.points.frustumCulled = false;

        params.scene.add(this.points);

        this.alphaSpline = new LinearSpline((t, a, b) => {
            return a + t * (b - a);
        });

        this.alphaSpline.AddPoint(0.0, 0.0);
        this.alphaSpline.AddPoint(0.1, 1.0);
        this.alphaSpline.AddPoint(0.6, 1.0);
        this.alphaSpline.AddPoint(1.0, 0.0);

        this.colourSpline = new LinearSpline((t, a, b) => {
            const c = a.clone();
            return c.lerp(b, t);
        });

        this.colourSpline.AddPoint(0.0, new Color("#666666"));
        this.colourSpline.AddPoint(1.0, new Color("#000000"));

        this.sizeSpline = new LinearSpline((t, a, b) => {
            return a + t * (b - a);
        });


        this.sizeSpline.AddPoint(0.0, 0.5);
        this.sizeSpline.AddPoint(0.5, 2.5);
        this.sizeSpline.AddPoint(1.0, 0.5);
    }
}

class Particle {
    constructor() {
        this.position = null;
        this.size = null;
        this.colour = null;
        this.colorSpline = null;
        this.alpha = 0.0;
        this.alpheSpline = null;
        this.life = 0.0;
        this.maxLife = 0.0;
        this.rotation = 0.0;
        this.velocity = null;
    }
}

function skyVertexShader() {
    return `
    varying vec3 vWorldPosition;

    void main() {

        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
        vWorldPosition = worldPosition.xyz;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
    `;
}

function skyFragmentShader() {
    return `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;

    varying vec3 vWorldPosition;

    void main() {

        float h = normalize( vWorldPosition + offset ).y;
        gl_FragColor =vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );

    }
    `;

    // gl_FragColor = LinearTosRGB(vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 ));
}

function setupFog(instance) {
    let skydomeOpacity = 0;

    if(instance.skydome && instance.stardome) {
        
        if(instance.sunAngle >= 181 && instance.sunAngle <= 184) {
            const diff = 184 - instance.sunAngle;
            skydomeOpacity = 1 - (diff / 3);
        }

        if(instance.sunAngle <= 359 && instance.sunAngle >= 356) {
            const diff = 359 - instance.sunAngle;
            skydomeOpacity = (diff / 3);
        }

            
        if(instance.sunAngle < 356 && instance.sunAngle > 184) {
            skydomeOpacity = 1;
        }   

        if(skydomeOpacity == 1) {
            instance.scene.fog = new FogExp2("#000000", instance.fogDensity);
            return;
        }
    } else {
        if(instance.stardome) {
            instance.scene.fog = new FogExp2("#000000", instance.fogDensity);
            return;
        }
    }

    instance.scene.fog = new FogExp2(instance.skyBottomColor, instance.fogDensity);
}

function getPoint(c1, c2, radius, angle){
    return [c1+Math.cos(angle)*radius,c2+Math.sin(angle)*radius];
}

function degreesToRadians(degrees) {
    return degrees * (π/180);
}

function drawSnowSegment(context, segmentLength, branchLength) {
    context.beginPath();
    context.moveTo(0,0);
    context.lineTo(segmentLength,0);
    context.stroke();
    context.translate(segmentLength,0);
    if (branchLength > 0) {
        drawSnowBranch(context, branchLength, 1);
        drawSnowBranch(context, branchLength, -1);
    }
}

function drawSnowBranch(context, branchLength, direction) {
    context.save();
    context.rotate(direction*π/3);
    context.moveTo(0,0);
    context.lineTo(branchLength,0);
    context.stroke();
    context.restore();
}

function onPadDown(id, btn) {

    if(currentGPPollInstance) {
        if(scrollInstances[currentGPPollInstance]) {
            const instance = scrollInstances[currentGPPollInstance];

            let button = GPH.standardButtonConversion(btn);

            if(id && id.toString().indexOf("vr") == 0) {
                button = GPH.vrPadButtonConversion(btn, id);
            }

            if(instance.uiGamepadElement) {

                if(button == "b" && instance.padDown) {
                    instance.padDown(id, button);
                    return;
                }

                const handled = GPH.handleUIGamepadSelection(instance.uiGamepadElement, btn);

                if(!handled && instance.padDown) {
                    instance.padDown(id, button);
                }

                return;
            }

            instance.lastPadId = id;
            
            if(button == "a" || button == "rt") {
                const x = instance.lastWidth / 2;
                const y = instance.lastHeight / 2;

                const hitPosition = actualLocationToVirtual(instance, x, y);

                if(hitPosition) {
                    if(instance.clickFunction) {
    
                        if(hitPosition.z < 0) {
                            hitPosition.z = 0;
                        }
    
                        instance.clickFunction(
                            buildInteractionResult(instance, {
                                down: false
                            }, hitPosition, x, y, "gamepad")
                        );
    
                        
                    }
                }
            }

            if(instance.padDown) {
                instance.padDown(id, button);
            }
        }
    }
}

function onPadUp(id, btn) {

    if(currentGPPollInstance) {
        if(scrollInstances[currentGPPollInstance]) {
            const instance = scrollInstances[currentGPPollInstance];

            if(instance.uiGamepadElement) {
                return;
            }

            instance.lastPadId = id;

            let button = GPH.standardButtonConversion(btn);

            if(id && id.toString().indexOf("vr") == 0) {
                button = GPH.vrPadButtonConversion(btn, id);
            }


            if(instance.padUp) {
                instance.padUp(id, button);
            }
        }
    }
}

function onPadVelocity(id, axis, val) {

    if(currentGPPollInstance) {
        if(scrollInstances[currentGPPollInstance]) {
            const instance = scrollInstances[currentGPPollInstance];

            if(instance.uiGamepadElement) {
                return;
            }

            instance.axisStates[axis] = val;
            instance.lastPadId = id;

            if(instance.padVelocity) {
                instance.padVelocity(id, axis, val);
            }
        }
    }
}

function resetAtlasTexture() {
    let totalAtlasSize = curAtlasIndex * useTextureSize;
    
    let atlasCanvas = document.createElement("canvas");

    atlasCanvas.style.imageRendering = "pixelated";

    let atlasContext = atlasCanvas.getContext("2d");

    atlasContext.imageSmoothingEnabled = false;

    atlasCanvas.width = totalAtlasSize;
    atlasCanvas.height = useTextureSize;

    for(let prop in textureAtlas) {
        let texture = textureAtlas[prop];

        if(texture.loading) {
            continue;
        }

        atlasContext.save();
        atlasContext.globalAlpha = texture.opacity;

        atlasContext.drawImage(texture.canvas,texture.idx * useTextureSize, 0);

        atlasContext.restore();
    }

    let data = atlasCanvas.toDataURL("image/png",1);

    curAtlasTexture = TEXTURE_LOADER.load(data);
    curAtlasTexture.magFilter = NearestFilter;
    curAtlasTexture.minFilter = NearestFilter;
    curAtlasTexture.colorSpace = USE_COLORSPACE;

    // just these options were working goodl for MC2, gotta figure
    // something otu
    let matOptions = {
        map: curAtlasTexture,
        dithering: false,
        premultipliedAlpha: false,
        wireframe: false,
        alphaTest: 0.1
    };

    if(!useSimplifiedAtlas) {
        matOptions.transparent = true;
    }
    
    curAtlasMaterial = new MeshLambertMaterial(matOptions);

    // might have to loop though all chunks and reapply the material, or all objects?!
}

/**
 * Set the size of the instance based on the holder's dimensions.
 * @param {Scroll3dEngine} instance - The instance to set the size for.
 */
function setInstanceSize(instance) {

    let useWidth = instance.holder.offsetWidth;
    let useHeight = instance.holder.offsetHeight;

    if(instance.squaredUp) {
        if(useWidth > useHeight) {
            useWidth = useHeight;
        } else {
            useHeight = useWidth;
        }
    }

    if(instance.forceHeight != null && instance.forceWidth != null) {
        useWidth = instance.forceWidth;
        useHeight = instance.forceHeight;

    }

    let renderWidth = useWidth;
    let renderHeight = useHeight;

    renderWidth = Math.floor(renderWidth * instance.renderScale);
    renderHeight = Math.floor(renderHeight * instance.renderScale);

    renderWidth = Math.floor(renderWidth * window.devicePixelRatio);
    renderHeight = Math.floor(renderHeight * window.devicePixelRatio);

    instance.lastWidth = renderWidth;
    instance.lastHeight = renderHeight;

    if(instance.canvas) {
        instance.canvas.width = renderWidth;
        instance.canvas.height = renderHeight;
    }

    instance.renderer.setPixelRatio(1);
    instance.renderer.setSize(renderWidth, renderHeight);

    instance.camera.aspect = renderWidth / renderHeight;
    instance.camera.updateProjectionMatrix();

    instance.shouldRender = true;

    if(instance.postprocessor) {
        if(instance.postprocessor.composer) {
            instance.postprocessor.composer.setSize(renderWidth, renderHeight);
        }

        if(instance.postprocessor.bokeh) {
            instance.postprocessor.bokeh.setSize(renderWidth, renderHeight);
        }
    }

    if(instance.effectAnaglyph) {
        instance.effectAnaglyph.setSize(renderWidth, renderHeight);
    }

    if(instance.orientationRenderer) {
        instance.orientationRenderer.setSize(instance.orientationHolder.offsetWidth, instance.orientationHolder.offsetHeight);
        instance.orientationCamera.aspect = instance.orientationHolder.offsetWidth / instance.orientationHolder.offsetHeight;
        instance.orientationCamera.updateProjectionMatrix();
    }

    setHudCanvasPosition(instance);
    updateFOVCamera(instance);

    if(instance.canvas) {

        instance.effectiveScale = instance.canvas.width / instance.holder.offsetWidth;

        if(instance.forceHeight == null || instance.forceWidth == null) {
            instance.canvas.style.width = "100%";
            instance.canvas.style.height = "100%";
            instance.canvas.style.maxWidth = null;
        } else {
            instance.canvas.style.width = "100%";
            instance.canvas.style.maxWidth = instance.forceWidth + "px";
            instance.canvas.style.height = "auto";
        }
        
    }

    if(instance.touchOverlay) {
        instance.touchOverlay.width = instance.holder.offsetWidth;
        instance.touchOverlay.height = instance.holder.offsetHeight;
    }
    
}

/**
 * Initialize the instance with default settings.
 * @param {Scroll3dEngine} instance - The instance to initialize.
 */
function initInstance(instance) {

    ColorManagement.enabled = true;
    
    instance.scene = new Scene();

    instance.camera = new PerspectiveCamera(45, instance.holder.offsetWidth / instance.holder.offsetHeight, 0.005, 40000);
    
    instance.centerObject = new Object3D();
    instance.centerObject.position.x = instance.centerPosition.x * 2;
    instance.centerObject.position.y = instance.centerPosition.z * 2;
    instance.centerObject.position.z = instance.centerPosition.y * 2;

    instance.scene.add(instance.centerObject);

    instance.setPlane(null);

    instance.vrCamHolder = new Group();
    instance.scene.add(instance.vrCamHolder);

    rebuildInstanceRenderer(instance);

    instance.vrCamHolder.position.set(
        instance.centerPosition.x + 20,
        instance.centerPosition.z + 30,
        instance.centerPosition.y + 50
    );
        
    instance.camera.lookAt(
        instance.centerPosition.x,
        instance.centerPosition.z,
        instance.centerPosition.y
    );

    instance.holder.style.backgroundColor = "#000000";

    if(instance.holderBackground) {
        instance.holder.style.backgroundColor = instance.holderBackground;
    }

    instance.mouse = new Vector2();
    instance.raycaster = new Raycaster();

    if(Refractor && WaterRefractionShader && instance.waterTextureUrl) {
        instance.waterTexture = TEXTURE_LOADER.load(instance.waterTextureUrl);
        instance.waterTexture.wrapS = instance.waterTexture.wrapT = RepeatWrapping; 
        instance.waterTexture.colorSpace = USE_COLORSPACE;
    } else {
        instance.waterTexture = null;
        instance.waterPlane = null;
    }

    if(instance.useAnaglyph) {
        instance.effectAnaglyph = new AnaglyphEffect(instance.renderer);
    }

    setInstanceLight(instance, "#ffffff");
    setInstanceSize(instance);
    setCameraPosition(instance);

    setTimeout(onResize, 150);

    setTimeout(function() {
        setInstanceSize(instance);
    }, 500);
}

/**
 * Initialize the world object based on its type.
 * @param {WorldObject} obj - The world object to initialize.
 */
function initWorldObject(obj) {
    if(obj.type == "bar") {
        initBarObject(obj);
    }

    if(obj.type == "fogofwar") {
        initFogObject(obj);
    }

    if(obj.type == "vpp") {
        initVPPObject(obj);
        return;
    }

    if(obj.type == "mesh") {
        finishInitMeshObject(obj);
        return;
    }

    if(obj.type == "instancecube") {
        initInstanceCube(obj);
    }

    if(obj.type == "cube") {
        initCubeObject(obj);
    }

    if(obj.type == "line") {
        initLineObject(obj);
    }

    if(obj.type == "text") {
        initTextObject(obj);
    }

    if(obj.type == "sprite") {
        initSpriteObject(obj);
        return;
    }

    if(obj.type == "fakelight") {
        initFakeLightObject(obj);
    }

    if(obj.type == "pointlight") {
        initPointLightObject(obj);
    }

    if(obj.type == "circle") {
        initCircleObject(obj);
    }

    obj.camGoal.position.set(obj.x * 2, obj.z * 2, obj.y * 2);
    obj.object.add(obj.camGoal);

    normalizeObjectPosition(obj);

    if(obj.mesh && obj.mesh.geometry) {
        obj.mesh.geometry.computeVertexNormals();
        obj.mesh.geometry.attributes.position.needsUpdate = true;
    }
}

function initBarObject(obj) {
    if(obj.progress > 0 && obj.progress < 1) {
        obj.progress = obj.progress * 100;
    }

    if(obj.progress > 100) {
        obj.progress = 100;
    }

    if(obj.progress < 0) {
        obj.progress = 0;
    }

    obj.custCanvas = document.createElement("canvas");
    obj.custContext = obj.custCanvas.getContext("2d");

    obj.custCanvas.height = 6;
    obj.custCanvas.width = 100;

    obj.barTexture = new CanvasTexture(obj.custCanvas);
    obj.barTexture.magFilter = NearestFilter;
    obj.barTexture.minFilter = NearestFilter;

    const material = new SpriteMaterial({
        map: obj.barTexture
    });

    const sprite = new Sprite(material);

    obj.object.add(sprite);

    updateProgressBarObject(obj);
}

function initFogObject(obj) {
    const color = new Color();
    color.setHex(obj.color);

    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    const size = obj.width * obj.height;

    const data = new Uint8Array( 4 * size );

    for(let i = 0; i < obj.tiles.length; i++) {
        const tile = obj.tiles[i];

        const x = tile.x;
        const y = tile.y;

        const yPos = y * obj.width;
        const pos = yPos + x;

        const idx = pos * 4;

        data[idx + 0] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;

        data[idx + 3] = 255;
    }

    const texture = new DataTexture(data, obj.width, obj.height);
    texture.needsUpdate = true;

    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;

    texture.generateMipmaps = false;

    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;

    const geometry = new PlaneGeometry(obj.width * 2, obj.height * 2);

    const material = new MeshBasicMaterial({
        map: texture, 
        side: DoubleSide, 
        transparent: true, 
        depthWrite: false,
        opacity: 1
    } );

    obj.mesh = new Mesh(geometry, material); 
    obj.object.add(obj.mesh);
}

/**
 * Initialize the VPP object based on its properties.
 * @param {WorldObject} obj - The world object to initialize.
 */
function initVPPObject(obj) {
    let path = null;
    let data = null;

    let meshName = "";

    if(obj.vppData) {
        data = obj.vppData;

        if(!data.id) {
            return;
        }

        meshName += "vpp." + data.id;
    }

    if(obj.vppPath) {
        data = null;
        meshName = "";
        path = obj.vppPath;

        meshName += "vpp." + path;
    }

    if(obj.file) {
        obj.vppPath = obj.file;

        data = null;
        meshName = "";
        path = obj.file;

        meshName += "vpp." + path;
    }

    if(!data && !path) {
        return;
    }

    if(obj.color) {
        meshName += ".col." + obj.color;
    }

    if(obj.color2) {
        meshName += ".col2." + obj.color2;
    }

    if(obj.opacity != 1) {
        meshName += ".op." + obj.opacity;
    }

    if(obj.basicMat) {
        meshName += ".bm";
    }

    if(obj.instance && obj.instance.vppInstances[meshName] && !blockVPPMeshIds[meshName] && !obj.blockInstancing) {

        obj.instanceParentId = meshName;
        
        obj.type = "vppInstanceItem";

        const instanceHolder = obj.instance.vppInstances[meshName];

        instanceHolder.changed = true;
        instanceHolder.items.push(obj.id);

        if(instanceHolder.size) {

            const size = instanceHolder.size;

            if(obj.isSymmetrical) {
                obj.width = Math.ceil(size.x / 2);
                obj.height = Math.ceil(size.z / 2);
    
                //for vpp, normalize w and h
            
                if(obj.width > obj.height) {
                    obj.height = obj.width;
                }
    
                if(obj.height > obj.width) {
                    obj.width = obj.height;
                }
            } else {
    
                obj.width = size.x / 2;
                obj.height = size.z / 2;
            }
    
            obj.width *= obj.scale;
            obj.height *= obj.scale;
        }

        obj.vppMeshNameRef = meshName;

        initVPPLightsAndEmitters(obj);

    } else {
        obj.type = "loading";

        if(!blockVPPMeshIds[meshName] && !obj.blockInstancing) {
            obj.instance.vppInstances[meshName] = {
                changed: true,
                items: [],
                loading: true,
                rawMesh: null,
                needsSetup: true,
                mesh: null,
                box: null,
                size: null,
                id: meshName
            };
        }
        
        const instanceHolder = obj.instance.vppInstances[meshName];

        // lights false for now
        // might add manually idk

        obj.vppMeshNameRef = meshName;

        const opts = {
            obj: data,
            path: path,
            color: obj.color,
            color2: obj.color2,
            scale: obj.instance.vppRatio,
            opacity: obj.opacity,
            useBasic: obj.basicMat,
            useLights: false
        };

        vppLoader.load(opts, function(mesh) {

            if(obj.isDisposed || !mesh) {
                return;
            }

            if(mesh.lights) {
                vppLightsRef[meshName] = mesh.lights;
            }

            if(mesh.emitters) {
                vppEmittersRef[meshName] = mesh.emitters;
            }

            if((mesh.type && mesh.type == "Group") || obj.blockInstancing) {

                if(obj.blockInstancing || blockVPPMeshIds[meshName]) {

                    if(obj.mesh) {
                        return;
                    }

                    obj.type = "mesh";
                    obj.mesh = mesh;

                    finishInitMeshObject(obj);
                    initVPPLightsAndEmitters(obj);
                    removeObjFromHittest(obj.instance, obj);

                    if(!obj.notHittable) {
                        addObjToHittest(obj.instance, obj, 0);
                    }

                    return;
                }

                if(mesh.children.length > 1) {
                    delete obj.instance.vppInstances[meshName];
                    blockVPPMeshIds[meshName] = true;

                    if(instanceHolder) {
                        for(let i = 0; i < instanceHolder.items.length; i++) {
                            const itemId = instanceHolder.items[i];

                            if(itemId == obj.id) {
                                continue;
                            }

                            const altItem = obj.instance.objects[itemId];

                            if(altItem && !altItem.mesh) {
                                console.log("handle a lost item!");
                            }
                        }
                    }

                    obj.type = "mesh";
                    obj.mesh = mesh;

                    finishInitMeshObject(obj);
                    initVPPLightsAndEmitters(obj);

                    return;
                }

                mesh = mesh.children[0];
            }

            if(!instanceHolder) {
                console.log("no instance holder!");
                return;
            }

            obj.instanceParentId = meshName;

            instanceHolder.items.push(obj.id);
            instanceHolder.loading = false;
            instanceHolder.changed = true;
            instanceHolder.rawMesh = mesh;

            initVPPLightsAndEmitters(obj);
        });
    }
}

function initInstanceCube(obj) {

    let material = null;
    let transparent = false;

    if(obj.opacity < 1) {
        transparent = true;
    }

    if(obj.basicMat) {
        material = new MeshBasicMaterial({
            opacity: obj.opacity,
            transparent: transparent
        });
    }

    if(obj.metal) {
        material = new MeshStandardMaterial({
            roughness: 0.8,
            metalness: 0.8,
            opacity: obj.opacity,
            transparent: transparent
        });
    }

    if(!material) {
        material = new MeshLambertMaterial({
            opacity: obj.opacity,
            transparent: transparent
        });
    }


    obj.mesh = new InstancedMesh(getCubeGeometry(obj.width, obj.height), material, obj.instanceCount);

    obj.mesh.count = obj.instancePositions.length;

    if(!obj.isDisposed) {
        obj.scene.add(obj.mesh);
    }
    
    normalizeObjectPosition(obj);
}

function initCubeObject(obj) {
    let env = null;

    if(obj.metal && obj.scene) {
        env = obj.scene.environment;
    }

    const useGeo = getCubeGeometry(obj.width, obj.height);

    obj.mesh = new Mesh(useGeo, getMaterial(obj.color, obj.opacity, obj.texture, obj.basicMat, obj.emissive, obj.metal, env, obj.height));
    
    obj.mesh.castShadow = true;
    obj.mesh.receiveShadow = true;

    obj.object.add(obj.mesh);
}

function initLineObject(obj) {

    if(obj.points.length > 0) {
        const geometry = new BufferGeometry().setFromPoints(obj.points);

        //LineSegments
        obj.mesh = new LineSegments(geometry, getLineMaterial(obj.color, obj.width, obj.dashed));
        obj.mesh.computeLineDistances();
        obj.object.add(obj.mesh);

        const heartShape = new Shape();

        for(let i = 0; i < obj.points.length; i++) {
            const point = obj.points[i];

            if(i == 0) {
                heartShape.moveTo(point.x * 2, point.y * 2);
            } else {
                heartShape.lineTo(point.x * 2, point.y * 2);
            }
        }

        if(obj.rawTiles && obj.fillRef) {

            const useZ = (obj.rawZ * 2);

            const rGeo = new BufferGeometry();
            const rawVert = [];

            for(let i = 0; i < obj.rawTiles.length; i++) {
                const tile = obj.rawTiles[i];

                rawVert.push(tile.x * 2);
                
                rawVert.push(useZ);
                rawVert.push(tile.y * 2);

                rawVert.push((tile.x + 1) * 2);
                
                rawVert.push(useZ);
                rawVert.push(tile.y * 2);

                rawVert.push((tile.x + 1) * 2);
                
                rawVert.push(useZ);
                rawVert.push((tile.y + 1) * 2);


                rawVert.push((tile.x + 1) * 2);
                
                rawVert.push(useZ);
                rawVert.push((tile.y + 1) * 2);

                rawVert.push(tile.x * 2);
                
                rawVert.push(useZ);
                rawVert.push((tile.y + 1) * 2);

                rawVert.push(tile.x * 2);
                
                rawVert.push(useZ);
                rawVert.push(tile.y * 2);
            }

            const vertices = new Float32Array(rawVert);

            rGeo.setAttribute("position", new BufferAttribute( vertices, 3  ));
            const rMat = new MeshBasicMaterial( { color: obj.color, side: DoubleSide, transparent: true, opacity:  obj.fillRef } );
            const rmesh = new Mesh(rGeo, rMat );

            obj.object.add(rmesh);
        }
    }
}

function initTextObject(obj) {
    obj.notHittable = true;

    obj.mesh = text2D(obj.text, {
        color: obj.color,
        radius: 128,
        bars: obj.bars
    });

    obj.object.add(obj.mesh);
}

function initSpriteObject(obj) {
    const sGeoName = obj.width + "x" + obj.height;

    let geometry = null;

    if(commonSpriteGeos[sGeoName]) {
        geometry = commonSpriteGeos[sGeoName];
    } else {
        geometry = new PlaneGeometry(obj.width * 2, obj.height * 2);
        commonSpriteGeos[sGeoName] = geometry;
    }

    getSpriteMaterial(obj.src, obj.opacity, obj.color, function(spriteMaterial) {
        obj.mesh = new Sprite(spriteMaterial);

        if(obj.scale != 1) {
            obj.mesh.scale.set((obj.width / obj.height) * obj.scale, obj.scale, obj.scale);
        }

        obj.object.add(obj.mesh);

        normalizeObjectPosition(obj);
    });
}

function initFakeLightObject(obj) {

    obj.radius = obj.radius * 2;

    let geometry = null;

    if(commonSpriteGeos[obj.radius]) {
        geometry = commonSpriteGeos[obj.radius];
    } else {
        geometry = new PlaneGeometry(obj.radius, obj.radius);
        commonSpriteGeos[obj.radius] = geometry;
    }

    let blending = AdditiveBlending;

    if(obj.shadow) {
        blending = NormalBlending;
    }

    let tx = getRadialTexture(obj.color, "transparent");

    if(obj.intensity > 1) {
        obj.mesh = new Group();

        for(let i = 0; i < obj.intensity; i++) {
            let spriteMaterial = new SpriteMaterial({
                map: tx, 
                blending: blending, 
                transparent: true
            });

            let spr = new Sprite(spriteMaterial);
            spr.scale.set(obj.radius, obj.radius, obj.radius);
            spr.geometry.attributes.position.needsUpdate = true;
            obj.mesh.add(spr);
        }


        obj.object.add(obj.mesh);
    } else {
        let spriteMaterial = new SpriteMaterial({
            map: tx, 
            blending: blending, 
            transparent: true
        });

        obj.mesh = new Sprite(spriteMaterial);
        obj.mesh.scale.set(obj.radius, obj.radius, obj.radius);
        obj.mesh.geometry.attributes.position.needsUpdate = true;
        obj.object.add(obj.mesh);
    }
}

function initPointLightObject(obj) {
    obj.notHittable = true;

    obj.radius = obj.radius * 2;

    obj.object.add(new PointLight(obj.color, obj.intensity, obj.radius));
}

function initCircleObject(obj) {
    obj.width = obj.radius;
    obj.height = obj.radius;

    let geo = null;

    if(commonCircleGeos[obj.radius.toString()]) {
        geo = commonCircleGeos[obj.radius.toString()];
    } else {
        geo = new CircleGeometry(obj.radius * 2, 32);
        commonCircleGeos[obj.radius.toString()] = geo;
    }

    if(geo) {
        const material = new MeshBasicMaterial({ 
            color: obj.color
        });
        const circle = new Mesh(geo, material);

        circle.rotation.set(MathUtils.degToRad(-90),0,0);

        obj.object.add(circle);
    }
}

function addObjToHittest(instance, obj, retryCount = 0) {

    if(obj.notHittable) {
        return;
    }

    if(!obj.mesh) {
        if(retryCount < 8) {
            setTimeout(function() {
                addObjToHittest(instance, obj, retryCount + 1);
            },1000);
        }

        return;
    }

    if(instance.hitTestObjects.indexOf(obj.mesh) > -1) {
        return;
    }

    obj.mesh.s3dob = obj.id;

    instance.hitTestObjects.push(obj.mesh);
}

function removeObjFromHittest(instance, obj) {
    if(obj) {
        if(obj.mesh && obj.mesh.children && obj.mesh.children.length > 0) {
            for(let i = 0; i < obj.mesh.children.length; i++) {
                const child = obj.mesh.children[i];

                removeFromArray(instance.hitTestObjects,child,false);
            }
        }

        removeFromArray(instance.hitTestObjects,obj.mesh,false);
        removeFromArray(instance.hitTestObjects,obj.object,false);
    }
    

    removeFromArray(instance.hitTestObjects,obj,false);

}

function updateProgressBarObject(obj) {

    if(!obj) {
        return;
    }

    if(!obj.custContext) {
        return;
    }

    let sizeY = 0.5 * obj.scale;
    let sizeX = 4 * obj.scale;
    
    if(obj.object && obj.object.children.length > 0) {
        obj.object.children[0].scale.y = sizeY;
        obj.object.children[0].scale.x = sizeX;
    }
    
    obj.custContext.fillStyle = "#222222";
    obj.custContext.fillRect(0,0,100,6);

    obj.custContext.fillStyle = obj.color;
    obj.custContext.fillRect(0,0,obj.progress,6);

    obj.custContext.strokeStyle = "#111111";
    obj.custContext.moveTo(0,0);
    obj.custContext.lineTo(100,0);
    obj.custContext.lineTo(100,6);
    obj.custContext.lineTo(0,6);
    obj.custContext.lineTo(0,0);
    obj.custContext.stroke();


    obj.barTexture.needsUpdate = true;
}

function getMaterial(color, opacity, texture, useBasic, emissive, metal, env, txHeight = 1, topMat = null) {

    if(!emissive) {
        emissive = null;
    }

    if(!metal) {
        metal = false;
    }

    if(!env) {
        env = null;
    }

    let txtName = "";

    if(!useBasic) {
        useBasic = false;
    }

    if(!texture) {
        texture = null;
    } else {
        txtName = "tx." + hash(texture);
    }

    let matName = color + "." + opacity + "." + txtName;

    if(useBasic) {
        matName = matName + ".ub";
    }

    if(emissive) {
        matName +=( "." + emissive);
    }

    if(metal) {
        matName += (".met");
    }

    matName += (".txH" + txHeight);

    if(topMat) {
        matName += "tm." + hash(topMat);
    }

    if(commonMaterials[matName]) {
        return commonMaterials[matName];
    }

    let matOptions = {};

    if(color && !texture) {
        matOptions.color = color;
    }

    if(opacity != 1) {
        matOptions.opacity = opacity;
        matOptions.transparent = true;
    }

    if(texture) {

        let topTxName = txtName;

        if(txHeight != 1) {
            txtName += ".txH" + txHeight;
        }
        
        if(topMat) {
            topTxName = hash(topMat);
        }

        if(txtName == topTxName) {
            let tx = commonMatTx[txtName];

            if(!tx) {
                tx = TEXTURE_LOADER.load(texture);

                tx.magFilter = NearestFilter;
                tx.minFilter = NearestFilter;
                tx.colorSpace = USE_COLORSPACE;

                commonMatTx[txtName] = tx;
            }

            
            matOptions.map = tx;
        } else {

            if(!topMat) {
                topMat = texture;
            }

            let topTx = commonMatTx[topTxName];

            if(!topTx) {
                topTx = TEXTURE_LOADER.load(topMat);
                
                topTx.magFilter = NearestFilter;
                topTx.minFilter = NearestFilter;
                topTx.colorSpace = USE_COLORSPACE;

                commonMatTx[topTxName] = topTx;
            }

            let midTx = commonMatTx[txtName];

            if(!midTx) {

                midTx = TEXTURE_LOADER.load(texture);
                
                midTx.magFilter = NearestFilter;
                midTx.minFilter = NearestFilter;
                midTx.colorSpace = USE_COLORSPACE;

                midTx.repeat.set(1, txHeight);

                commonMatTx[txtName] = midTx;
            }

            const materials = [];

            for(let i = 0; i < 6; i++) {
                const ob = JSON.parse(JSON.stringify(matOptions));
                
                if(i == 2 || i == 3) {
                    ob.map = topTx;
                } else {
                    ob.map = midTx;
                }

                materials.push(getFinalMat(ob, emissive, metal, useBasic));
            }

            commonMaterials[matName] = materials;

            return materials;
        }

    }

    const mat = getFinalMat(matOptions, emissive, metal, useBasic);

    commonMaterials[matName] = mat;

    return mat;
}

function getSpriteMaterial(src,opacity,color,callback) {
    let txNme = src;

    if(opacity == undefined && opacity == null) {
        opacity = 1;
    }

    if(!color) {
        color = "";
    }

    if(src.length > 200) {
        txNme = hash(src);
    }

    if(color) {
        txNme += "." + color;
    }

    let matName = "spr" + txNme + "." + opacity + "." + color;

    if(commonMaterials[matName]) {
        callback(commonMaterials[matName]);
        return;
    }

    if(commonSpriteTextures[txNme]) {
        let tx = commonSpriteTextures[txNme];
        completeSpriteMaterialLoad(callback,matName,tx,opacity);
    } else {
        TEXTURE_LOADER.load(src,function(tx){

            tx.needsUpdate = true;

            tx.magFilter = NearestFilter;
            tx.minFilter = NearestFilter;

            tx.colorSpace = USE_COLORSPACE;

            commonSpriteTextures[txNme] = tx;

            completeSpriteMaterialLoad(callback,matName,tx,opacity);
        });
        
    }
}

function normalizeObjectPosition(obj) {

    if(!obj || obj.isDisposed) {
        return;
    }

    if(obj.type == "cube") {
        const useZ = (obj.z * 2) + obj.height;
        obj.object.position.set((obj.x * 2) + 1, useZ, (obj.y * 2) + 1);
    }

    if(obj.type == "circle" || obj.type == "fakelight" || obj.type == "text" || obj.type == "sprite" || obj.type == "bar") {

        let useZ = (obj.z * 2) + 1;

        if(obj.type == "fakelight") {
            useZ = (obj.z * 2);
        }

        obj.object.position.set((obj.x * 2) + 1, useZ, (obj.y * 2) + 1);
    }

    if(obj.type == "mesh") {

        let x = (obj.x * 2 + (obj.width));
        let y = (obj.y * 2 + (obj.height));
        let z = (obj.z * 2);

        if(!obj.isSymmetrical) {
            x = (obj.x + 0.5) * 2;
            y = (obj.y + 0.5) * 2;
        }

        obj.object.position.set(x, z, y);

        if(!obj.mesh) {
            return;
        }

        if(obj.isSymmetrical) {
            let box = new Box3().setFromObject( obj.mesh );
            box.getCenter(obj.mesh.position);
            obj.mesh.position.multiplyScalar(-1);

            obj.mesh.position.set(-obj.width, 0, -obj.height);
        }

    }

    if(obj.rot != undefined && obj.type != "instancecube") {
        obj.object.rotation.set(0, MathUtils.degToRad(obj.rot), 0);
    }

    if(obj.type == "pointlight") {
        let x = (obj.x * 2 + 0.5);
        let y = (obj.y * 2 + 0.5);
        let z = (obj.z * 2 + 0.5);

        obj.object.position.set(x, z, y);
    }

    if(obj.type == "fogofwar") {

        let x = (obj.x * 2 + obj.width);
        let y = (obj.y * 2 + obj.height);
        let z = (obj.z * 2);

        obj.object.rotation.set(MathUtils.degToRad(90),0,0);

        obj.object.position.set(x, z, y);
    }

    if(obj.type == "instancecube") {


        obj.mesh.count = obj.instancePositions.length;

        for(let i = 0; i < obj.instancePositions.length; i++) {

            const posData = obj.instancePositions[i];

            let color = obj.color;

            if(posData.c) {
                color = posData.c;
            }

            const useZ = (posData.z * 2) + 1;

            obj.object.position.set((posData.x * 2) + 1, useZ, (posData.y * 2) + 1);
            obj.object.updateMatrix();


            obj.mesh.setMatrixAt(i, obj.object.matrix);
            obj.mesh.setColorAt(i, new Color(color));

        }

        obj.mesh.instanceMatrix.needsUpdate = true;
        obj.mesh.instanceColor.needsUpdate = true;
        
    }

    
    if(obj && obj.mesh) {
        obj.mesh.needsUpdate = true;

        if(obj.mesh.computeBoundingSphere) {
            obj.mesh.computeBoundingSphere();
        }
        

        // THIS MIGHT BE NEEDED FOR VOXEL PAINT, BUT WAS REALLY SLOWING 
        // DOWN MC2.  CHECK ON NEXT VOXEL PAINT UPDATE!!!
        if(obj.mesh.geometry) {
            //obj.mesh.geometry.computeVertexNormals();
            //obj.mesh.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    if(obj && obj.object) {
        obj.object.updateMatrix();
    }
}

function removeObjectFromThree(instance, object, andDispose) {
        
    if(!instance || !object) {
        return;
    }

    if(!andDispose) {
        andDispose = false;
    }

    if(object.children) {
        while(object.children.length > 0) { 
            let obj = object.children[0];

            object.remove(obj);

            if(andDispose) {
                if(obj.dispose) {
                    obj.dispose();
                }

                if(obj.material && obj.material.dispose) {
                    obj.material.dispose();
                }

                if(obj.geometry && obj.geometry.dispose) {
                    obj.geometry.dispose();
                }
            }
        }
    }
    
    instance.scene.remove(object);

    removeObjFromHittest(instance,object);

    if(object.dispose) {
        object.dispose();
    }

    if(object.material && object.material.dispose) {
        object.material.dispose();
    }

    if(object.geometry && object.geometry.dispose) {
        object.geometry.dispose();
    }
}

function getTextureIndex(options,chunkData,instance) {

    if(!options) {
        options = {};
    }

    if(!options.texture) {
        return;
    }

    if(options.opacity == null || options.opacity == undefined) {
        options.opacity = 1;
    }

    if(!options.topBlendColor) {
        options.topBlendColor = null;
    }

    if(!options.speckles) {
        options.speckles = null;
    }

    if(!options.slope) {
        options.slope = null;
    }

    if(!options.roads) {
        options.roads = null;
    }
    
    if(!options.noise) {
        options.noise = false;
    }

    if(!options.noiseSize) {
        options.noiseSize = 16;
    }


    let noiseHalfer = 5;

    if(options.noiseVariance) {
        noiseHalfer = options.noiseVariance;
    }

    let noiseVariance = noiseHalfer * 2;
    

    let refName = options.texture;

    if(options.noise) {
        refName += ".ynX" + noiseVariance;
    } else {
        refName += ".nn";
    }

    refName += ".ns" + options.noiseSize;

    if(options.topBlendColor) {
        refName += ".tb:" + options.topBlendColor;
    } else {
        refName += ".ntb";
    }

    refName += ".op" + options.opacity;

    if(options.speckles) {

        options.speckles.sort(function(a,b) {
            const aName = a.color + "-" + a.chance;
            const bName = b.color + "-" + b.chance;

            if(aName > bName) {
                return 1;
            }

            if(aName < bName) {
                return -1;
            }

            return 0;
        });

        for(let i = 0; i < options.speckles.length; i++) {
            let speckle = options.speckles[i];

            refName += ".spk" + speckle.color + "-" + speckle.chance;
        }
    }

    if(options.roads) {

        options.roads.sort(function(a,b) {
            const aName = a.dir + "-" + a.color + "-" + a.width;
            const bName = b.dir + "-" + b.color + "-" + b.width;

            if(aName > bName) {
                return 1;
            }

            if(aName < bName) {
                return -1;
            }

            return 0;
        });

        const roadNameBuild = {};

        for(let i = 0; i < options.roads.length; i++) {
            const road = options.roads[i];

            const roadBase = road.color + "." + road.width;

            if(!roadNameBuild[roadBase]) {
                roadNameBuild[roadBase] = {
                    "n": "0",
                    "ne": "0",
                    "e": "0",
                    "se": "0",
                    "s": "0",
                    "sw": "0",
                    "w": "0",
                    "nw": "0"
                };
            }

            roadNameBuild[roadBase][road.dir] = "1";
        }


        for(let roadBase in roadNameBuild) {
            refName += ".rd" + roadBase;

            for(let dir in roadNameBuild[roadBase]) {
                refName += ("-" + dir + roadNameBuild[roadBase][dir]);
            }
        }
    }

    let brick = false;
    let brickSize = 0;

    let brickAlt = options.texture;
    let brickAltOdd = options.texture;
    let brickAltEven = options.texture;

    if(options.topAlt) {
        refName += ".ta" + options.topAlt;
        brickAlt = options.topAlt;
        brickAltEven = options.topAlt;
    }

    let brickMortarFactor = -20;

    let brickNoiseVariance = noiseVariance * 2;
    let brickNoiseHalfer = noiseHalfer * 2;


    if(options.brick) {


        refName += ".brk";


        brick = true;
        brickSize = 8;
    }

    let checkered = false;
    let checkerSize = 0;

    if(options.gridline) {
        refName += ".gl";
    }

    if(options.checkered) {
        refName += ".chk";
        checkered = true;
        checkerSize = 4;
    }

    if(options.checkered || options.brick) {
        let brickAdj = randomIntFromInterval(0,brickNoiseVariance);
        brickAdj -= brickNoiseHalfer;

        brickAlt = LightenDarkenColor(brickAlt,brickAdj);

        brickAdj = randomIntFromInterval(0,brickNoiseVariance);
        brickAdj -= brickNoiseHalfer;

        brickAltOdd = LightenDarkenColor(brickAltOdd,brickAdj);

        brickAdj = randomIntFromInterval(0,brickNoiseVariance);
        brickAdj -= brickNoiseHalfer;

        brickAltEven = LightenDarkenColor(brickAltEven,brickAdj);
    }

    if(options.pppTextureData) {
        const datHash = hash(options.pppTextureData);
        refName += ".pppdat" + datHash;

        if(options.pppTextureDataColor) {
            refName += options.pppTextureDataColor.replace("#","");
        }
    }

    if(textureAtlas[refName]) {
        return textureAtlas[refName].idx;
    }

    let textObj = {
        idx: curAtlasIndex,
        canvas: null,
        loading: true,
        opacity: options.opacity
    };

    curAtlasIndex++;

    textureAtlas[refName] = textObj;

    textObj.canvas = document.createElement("canvas");

    textObj.canvas.style.imageRendering = "pixelated";
    
    const buildContext = textObj.canvas.getContext("2d");
    buildContext.imageSmoothingEnabled = false;

    textObj.canvas.height = useTextureSize;
    textObj.canvas.width = useTextureSize;

    // .ppp data loading 
    if(options.pppTextureData) {

        let color = null;
        let colrStr = "";

        if(options.pppTextureDataColor) {
            color = options.pppTextureDataColor;
            colrStr = color;
        }

        const datHash = hash(options.pppTextureData) + colrStr.replace("#","");
        const ret = commonPPPTextures[datHash];

        if(ret) {

            buildContext.drawImage(ret,0,0, useTextureSize, useTextureSize);

            if(options.gridline) {
                drawTextureGridline(buildContext);
            }

            textObj.loading = false;

            resetAtlasTexture();
        } else {

            renderPPP({
                callback: function(img) {
                    buildContext.drawImage(img,0,0, useTextureSize, useTextureSize);
                    textObj.loading = false;
                    commonPPPTextures[datHash] = img;

                    if(options.gridline) {
                        drawTextureGridline(buildContext);
                    }

                    resetAtlasTexture();

                    if(chunkData && instance && instance.removeChunk) {
                        let rOrder = "0";

                        if(chunkData.rOrder) {
                            rOrder = chunkData.rOrder;
                        }

                        instance.removeChunk(chunkData.x,chunkData.y,rOrder);
                        instance.addChunk(chunkData);
                    }
                },
                source: options.pppTextureData,
                color: color
            });
        }

        resetAtlasTexture();

        return textureAtlas[refName].idx;
    }

    // color loading 
    if(options.texture.indexOf("#") == 0 || options.texture == "transparent") {

        if(!options.topBlendColor && !options.noise && !options.speckles && !options.checkered && !options.brick) {
            buildContext.fillStyle = options.texture;
            buildContext.fillRect(0,0, useTextureSize, useTextureSize);
            
        } else {
            let noisePartSizeWidth = useTextureSize / options.noiseSize;
            let noisePartSizeHeight = useTextureSize / options.noiseSize;

            let halfNoiseSize =  Math.round(options.noiseSize / 2);

            let startingX = 0;
            let xAdder = 1;


            for(let x = startingX; x < options.noiseSize; x += xAdder) {

                let topPos = randomIntFromInterval(1,Math.floor(options.noiseSize * 0.4));

                let startingY = 0;
                let yAdder = 1;

                for(let y = startingY; y < options.noiseSize; y += yAdder) {

                    let fillColor = options.texture;
                    
                    // auto-checkers
                    if(checkered) {
                        let xBrickOffset = x;

                        let brickRow = Math.floor(y / checkerSize);

                        let evenRow = false;
                        let colOffset = 0;

                        if(brickRow % 2 == 0) {
                            evenRow = true;
                            colOffset = Math.floor(brickSize / 2);
                            xBrickOffset -= brickSize / 2;
                        }

                        let brickCol = Math.floor((x - colOffset) / checkerSize);

                        let evenCol = false;

                        if(brickCol % 2 == 0) {
                            evenCol = true;
                            
                        }

                        if(evenCol) {
                            fillColor = brickAlt;

                            if(evenRow) {
                                fillColor = brickAltOdd;
                            }
                        } else {
                            if(evenRow) {
                                fillColor = brickAltEven;
                            }
                        }

                        // is this a brick line
                        if(y % (brickSize / 2) == 0 || xBrickOffset % brickSize == 0) {
                            //fillColor = LightenDarkenColor(fillColor,brickMortarFactor);
                        }

                        if(y % (brickSize / 2) == 0) {
                            //fillColor = LightenDarkenColor(fillColor,brickMortarFactor);
                        }

                        if(xBrickOffset % brickSize == 0) {
                            //fillColor = LightenDarkenColor(fillColor,brickMortarFactor);
                        }

                    }


                    // auto-brick
                    if(brick) {
                        let xBrickOffset = x;

                        let brickRow = Math.floor(y / (brickSize / 2));

                        let evenRow = false;
                        let colOffset = 0;

                        if(brickRow % 2 == 0) {
                            evenRow = true;
                            colOffset = Math.floor(brickSize / 2);
                            xBrickOffset -= brickSize / 2;
                        }

                        let brickCol = Math.floor((x - colOffset) / brickSize);

                        let evenCol = false;

                        if(brickCol % 2 == 0) {
                            evenCol = true;
                            
                        }

                        if(evenCol) {
                            fillColor = brickAlt;

                            if(evenRow) {
                                fillColor = brickAltOdd;
                            }
                        } else {
                            if(evenRow) {
                                fillColor = brickAltEven;
                            }
                        }

                        // is this a brick line
                        if(y % (brickSize / 2) == 0 || xBrickOffset % brickSize == 0) {
                            fillColor = LightenDarkenColor(fillColor,brickMortarFactor);
                        }
                    }

                    if(options.topBlendColor) {
                        if(y < topPos) {
                            fillColor = options.topBlendColor;
                        }
                    }

                    if(options.speckles) {
                        for(let i = 0; i < options.speckles.length; i++) {
                            let speckle = options.speckles[i];

                            let speckleChance = randomIntFromInterval(0,100);

                            if(speckleChance <= speckle.chance) {
                                fillColor = speckle.color;
                            }
                        }
                    }

                    if(options.roads) {
                        for(let i = 0; i < options.roads.length; i++) {
                            let road = options.roads[i];

                            let halfRoadSize = Math.round(road.width / 2);

                            if(road.dir == "e") {
                                if(y > (halfNoiseSize - halfRoadSize) && y < (halfNoiseSize + halfRoadSize)) {
                                    if(x <= halfNoiseSize) {
                                        fillColor = road.color;
                                    }
                                }
                            }

                            if(road.dir == "w") {
                                if(y > (halfNoiseSize - halfRoadSize) && y < (halfNoiseSize + halfRoadSize)) {
                                    if(x >= halfNoiseSize) {
                                        fillColor = road.color;
                                    }
                                }
                            }

                            if(road.dir == "s") {
                                if(x > (halfNoiseSize - halfRoadSize) && x < (halfNoiseSize + halfRoadSize)) {
                                    if(y <= halfNoiseSize) {
                                        fillColor = road.color;
                                    }
                                }
                            }

                            if(road.dir == "n") {
                                if(x > (halfNoiseSize - halfRoadSize) && x < (halfNoiseSize + halfRoadSize)) {
                                    if(y >= halfNoiseSize) {
                                        fillColor = road.color;
                                    }
                                }
                            }

                            if(road.dir == "nw") {
                                if(x > (y - halfRoadSize) && x <= (y + halfRoadSize)) {
                                    if(y >= halfNoiseSize) {
                                        fillColor = road.color;
                                    }
                                }
                            }

                            if(road.dir == "se") {
                                if(x > (y - halfRoadSize) && x <= (y + halfRoadSize)) {
                                    if(y <= halfNoiseSize) {
                                        fillColor = road.color;
                                    }
                                }
                            }



                            if(road.dir == "ne") {
                                if(x > options.noiseSize - (y + halfRoadSize) && x <= options.noiseSize - (y - halfRoadSize)) {
                                    if(y >= halfNoiseSize) {
                                        fillColor = road.color;
                                    }
                                }
                            }

                            if(road.dir == "sw") {
                                if(x > options.noiseSize - (y + halfRoadSize) && x <= options.noiseSize - (y - halfRoadSize)) {
                                    if(y <= halfNoiseSize) {
                                        fillColor = road.color;
                                    }
                                }
                            }

                        }
                    }

                    if(options.noise && fillColor != "transparent") {
                        let adjAmount = randomIntFromInterval(0,noiseVariance);
                        adjAmount -= noiseHalfer;

                        fillColor = LightenDarkenColor(fillColor,adjAmount);
                    }

                    buildContext.fillStyle = fillColor;

                    buildContext.fillRect(x * noisePartSizeWidth,y * noisePartSizeHeight,noisePartSizeWidth,noisePartSizeHeight);
                }
            }
        }

        if(options.gridline) {
            drawTextureGridline(buildContext);
        }

        textObj.loading = false;
        resetAtlasTexture();

        return textureAtlas[refName].idx;
    }

    // if we got here, regular image loading 
    const img = new Image();
    img.onload = function(){
        buildContext.drawImage(img, 0, 0, useTextureSize, useTextureSize);

        if(options.gridline) {
            drawTextureGridline(buildContext);
        }

        textObj.loading = false;
        resetAtlasTexture();
    };
    img.src = options.texture;

    resetAtlasTexture();

    return -1;
}

function addChunkObPart(instance, obj, data, x, z, defTop, defBot, defMid, defTexture, defMidBleed, positions, normals, uvs, indices, totalAtlasSize, waterColor, hasWater) {
    let floorZ = 0;
    let useTop = defTop;
    let useBottom = defBot;
    let useMid = defMid;
    let waterNeighbor = false;

    if(!obj.isWater) {
        obj.isWater = false;
    }

    if(obj.z) {
        floorZ = obj.z;
    }

    if(obj.middle) {

        useMid = getTextureIndex({
            texture: obj.middle,
            noise: defTexture.noise,
            noiseSize: instance.vppSize,
            topBlendColor: defMidBleed
        }, data, instance);

        if(useMid == -1) {
            setTimeout(function() {
                instance.addChunk(data);
            }, 200);
        
            return null;
        }
                
    }

    if(obj.bottom) {

        useBottom = getTextureIndex({
            texture: obj.bottom,
            noise: defTexture.noise,
            noiseSize: instance.vppSize,
            topBlendColor: null
        },data,instance);

        if(useBottom == -1) {
            setTimeout(function() {
                instance.addChunk(data);
            }, 200);
        
            return null;
        }
    }

    if(obj.top) {

        let opacity = 1;
        let topNoise = defTexture.noise;

        if(obj.isWater) {
            opacity = instance.defaultWaterOpacity;

            if(instance.waterTexture) {
                topNoise = true;
            } else {
                topNoise = false;
            }

            useMid = getTextureIndex({
                texture: "#000000",
                noise: false,
                noiseSize: instance.vppSize,
                topBlendColor: null,
                opacity: 0
            },data,instance);
                    
            waterColor = obj.top;

            if(useMid == -1) {
                setTimeout(function() {
                    instance.addChunk(data);
                }, 200);
            
                return null;
            }
        }

        let speckles = null;
        let roads = null;

        if(obj.speckles) {
            speckles = obj.speckles;
        }

        if(obj.roads) {
            roads = obj.roads;
        }

        let useNoise = topNoise;

        if(obj.noise != undefined) {
            useNoise = obj.noise;
        }

        let noiseVariance = null;

        if(obj.noiseVariance != undefined) {
            noiseVariance = obj.noiseVariance;
        }

        let brick = false;
        let checkered = false;
        let topAlt = null;
        let gridline = false;

        let pppTextureData = null;
        let pppTextureDataColor = null;

        if(obj.pppTextureData != undefined) {
            pppTextureData = obj.pppTextureData;
        }

        if(obj.pppTextureDataColor != undefined) {
            pppTextureDataColor = obj.pppTextureDataColor;
        }

        if(obj.gridline != undefined) {
            gridline = obj.gridline;
        }

        if(obj.brick != undefined) {
            brick = obj.brick;
        }

        if(obj.checkered != undefined) {
            checkered = obj.checkered;
        }

        if(obj.topAlt != undefined) {
            topAlt = obj.topAlt;
        }

        useTop = getTextureIndex({
            texture:obj.top,
            noise: useNoise,
            noiseSize: instance.vppSize,
            topBlendColor: null,
            opacity: opacity,
            speckles: speckles,
            roads: roads,
            noiseVariance: noiseVariance,
            brick: brick,
            gridline: gridline,
            checkered: checkered,
            topAlt: topAlt,
            pppTextureDataColor: pppTextureDataColor,
            pppTextureData: pppTextureData
        },data,instance);

        if(useTop == -1) {
            setTimeout(function() {
                instance.addChunk(data);
            }, 200);
        
            return null;
        }
    }

    for(let y = 0; y < WORLD_HEIGHT; y++) {
        // there is ground here
        if(y <= floorZ) {
            for (const {dir, corners, uvRow, altcorners, slopes, smdepress} of TEXTURE_FACES) {

                const ux = x + dir[0];
                const uy = y + dir[1];
                const uz = z + dir[2];

                const neighbor = getChunkTileNeighbor(
                    data.data,
                    ux,
                    uy,
                    uz,
                    obj.isDepressed
                );

                let shouldSkip = false;

                if(neighbor && neighbor != -1) {
                    if(!neighbor.isWater) {
                        neighbor.isWater = false;
                    } else {
                        waterNeighbor = true;
                    }

                    if(!obj.isWater) {
                        obj.isWater = false;
                    }

                    shouldSkip = true;

                            
                    if(obj.isWater != neighbor.isWater) {
                        shouldSkip = false;
                    }

                    if(shouldSkip) {
                        if((obj.slope || neighbor.slope) && (obj.slope != neighbor.slope)) {
                            //shouldSkip = false;
                        }
                    }
                } else {
                    if(data.noSides && uvRow != 2 && neighbor != -1) {
                        shouldSkip = true;
                    }
                }

                if(obj.isWater && instance.waterTexture) {
                    hasWater = true;
                }

                if(waterNeighbor) {
                    shouldSkip = false;
                }


                if(!shouldSkip) {
                    let ndx = positions.length / 3;

                    let usecor = corners;

                    if(obj.isWater && y == floorZ) {
                        usecor = altcorners;
                    }

                    if(obj.isDepressed) {
                        usecor = smdepress;
                    }

                    if(obj.slope && slopes[obj.slope]) {
                        usecor = slopes[obj.slope];
                    }

                    if(obj.isWater && instance.waterTexture) {

                        for (const {pos, uv} of corners) {
                            positions.push(pos[0] + x, (pos[1] + y) - 1, pos[2] + z);
                            normals.push(...dir);

                            let tx = useTop;

                            let textureRow = 0;

                            let utx = useTextureSize * TEXTURE_SIZE_MULTIPLIER;

                            let uvx = (tx +   uv[0]) * utx / totalAtlasSize;

                            let uvy = 1 - (textureRow + 1 - uv[1]) * utx / utx;

                            uvs.push(uvx,uvy);
                        }

                        indices.push(
                            ndx, ndx + 1, ndx + 2,
                            ndx + 2, ndx + 1, ndx + 3
                        );
                    } else {
                        for (const {pos, uv} of usecor) {
                            positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                            normals.push(...dir);

                            let tx = useMid;
                                    
                            if(uvRow == 2) {
                                tx = useTop;
                            }

                            if(uvRow == 1) {
                                tx = useBottom;
                            }

                            let textureRow = 0;

                            let utx = useTextureSize * TEXTURE_SIZE_MULTIPLIER;

                            let uvx = (tx +   uv[0]) * utx / totalAtlasSize;

                            let uvy = 1 - (textureRow + 1 - uv[1]) * utx / utx;

                            uvs.push(uvx,uvy);
                        }

                        indices.push(
                            ndx, ndx + 1, ndx + 2,
                            ndx + 2, ndx + 1, ndx + 3
                        );

                        if(waterNeighbor || obj.slope) {

                            ndx = positions.length / 3;

                            for (const {pos, uv} of corners) {

                                let uyy = (pos[1] + y) - 1;

                                if(obj.slope) {
                                    uyy = pos[1] + y;
                                }

                                positions.push(pos[0] + x, uyy, pos[2] + z);
                                normals.push(...dir);

                                let tx = useBottom;

                                let textureRow = 0;
    
                                let utx = useTextureSize * TEXTURE_SIZE_MULTIPLIER;

                                let uvx = (tx +   uv[0]) * utx / totalAtlasSize;
    
                                let uvy = 1 - (textureRow + 1 - uv[1]) * utx / utx;
    
                                uvs.push(uvx,uvy);
                            }
    
                            indices.push(
                                ndx, ndx + 1, ndx + 2,
                                ndx + 2, ndx + 1, ndx + 3
                            );
                        }
                    }
                }
            }
        }
    }

    return {
        waterColor: waterColor,
        hasWater: hasWater
    };
}

function clearAllParticleSystems(instance) {

    const toDel = [];

    for(let systemname in instance.particleSystems) {
        const system = instance.particleSystems[systemname];

        removeObjectFromThree(instance,system.points,true);
        
        system.points = null;
        system.geometry = null;
        system.material = null;

        toDel.push(systemname);
    }

    while(toDel.length) {
        delete instance.particleSystems[toDel.pop()];
    }

    instance.particleSystems = {};
}

function setCameraPosition(instance) {

    if(instance.vrSession) {
        setVRCameraTheta(instance);
    }

    let tgtOb = null;

    if(instance.cameraTarget) {
        if(instance.objects[instance.cameraTarget]) {
            tgtOb = instance.objects[instance.cameraTarget];
        }
    }

    let camNear = 1;

    if(instance.vrSession) {
        camNear = 0.1;
    }

    const camScale = instance.cameraScale;

    if(tgtOb && tgtOb.camGoal) {

        let prevX = instance.centerPosition.x;
        let prevY = instance.centerPosition.y;

        
        if(instance.vrSession) {

            instance.camera.getWorldDirection(instance.currentVRVector);
            instance.currentVRCamRads = Math.atan2(instance.currentVRVector.x,instance.currentVRVector.z);



            let x = (tgtOb.x * 2 + (tgtOb.width));
            let y = (tgtOb.y * 2 + (tgtOb.height));
            let z = (tgtOb.z * 2);

            if(!tgtOb.isSymmetrical) {
                x = (tgtOb.x + 0.5) * 2;
                y = (tgtOb.y + 0.5) * 2;
            }

            instance.vrCamHolder.position.set(x, z, y);

            instance.centerPosition.x = tgtOb.x;
            instance.centerPosition.y = tgtOb.y;

            instance.vrCamHolder.scale.set(0.25,0.25,0.25);

        }


        if(instance.centerPosition.x != prevX || instance.centerPosition.y != prevY) {
            if(instance.cameraMovedFunction) {
                const cx = Math.floor(instance.centerPosition.x / instance.chunkSize);
                const cy = Math.floor(instance.centerPosition.y / instance.chunkSize);
        
                instance.cameraMovedFunction({
                    x: instance.centerPosition.x,
                    y: instance.centerPosition.y,
                    z: instance.centerPosition.z,
                    chunkX: cx,
                    chunkY: cy,
                    theta: instance.theta,
                    phi: instance.phi,
                    radius: instance.radius
                });
            }
            
        }
        

    } else {

        if(instance.vrSession) {
            instance.vrCamHolder.position.x = (instance.centerPosition.x * 2);
            instance.vrCamHolder.position.z = (instance.centerPosition.y * 2);
            instance.vrCamHolder.position.y = (instance.centerPosition.z * 2) + instance.radius;
    
            instance.vrCamHolder.position.y += instance.poleOffset;
        } else {
            instance.vrCamHolder.scale.set(camScale,camScale,camScale);

            instance.vrCamHolder.position.x = instance.radius * Math.sin( instance.theta * THREESISXY_PI ) * Math.cos( instance.phi * THREESISXY_PI );
            instance.vrCamHolder.position.y = instance.radius * Math.sin( instance.phi * THREESISXY_PI);
            instance.vrCamHolder.position.z = instance.radius * Math.cos( instance.theta * THREESISXY_PI) * Math.cos( instance.phi * THREESISXY_PI );
    
            instance.vrCamHolder.position.x += (instance.centerPosition.x * 2);
            instance.vrCamHolder.position.z += (instance.centerPosition.y * 2);
            instance.vrCamHolder.position.y += (instance.centerPosition.z * 2);
    
            instance.vrCamHolder.position.y += instance.poleOffset;
    
            instance.camera.lookAt(
                (instance.centerPosition.x * 2),
                (instance.centerPosition.z * 2),
                (instance.centerPosition.y * 2)
            );
        }
    }

    instance.camera.near = camNear;

    if(!instance.vrSession) {
        instance.camera.fov = 45;
    }

    if(instance.stardome) {
        instance.stardome.position.x = instance.centerPosition.x * 2;
        instance.stardome.position.y = instance.centerPosition.z * 2;
        instance.stardome.position.z = instance.centerPosition.y * 2;

        instance.stardome.geometry.attributes.position.needsUpdate = true;
    }

    if(instance.skydome) {
        instance.skydome.position.x = instance.centerPosition.x * 2;
        instance.skydome.position.y = instance.centerPosition.z * 2;
        instance.skydome.position.z = instance.centerPosition.y * 2;

        normalizeSunPosition(instance);

        instance.skydome.geometry.attributes.position.needsUpdate = true;
    }


    if(instance.cameraMovedFunction) {
        let cx = Math.floor(instance.centerPosition.x / instance.chunkSize);
        let cy = Math.floor(instance.centerPosition.y / instance.chunkSize);
        
        instance.cameraMovedFunction({
            x: instance.centerPosition.x,
            y: instance.centerPosition.y,
            z: instance.centerPosition.z,
            chunkX: cx,
            chunkY: cy,
            theta: instance.theta,
            phi: instance.phi,
            radius: instance.radius
        });
    }

    updateFOVCamera(instance);

    instance.shouldRender = true;
}

function getGroupRegionLines(tilesArray) {
    let i,j,l,tj,dTop,dRight,dBottom,dLeft;

    const linesToDraw = [];

    for(i = 0, l = tilesArray.length; i < l; i++) {
        const ti = tilesArray[i];
        const y1 = ti.y + 1;
        const x1 = ti.x + 1;

        dTop = true;
        dRight = true;
        dBottom = true;
        dLeft = true;

        let z = null;

        if(ti.z) {
            z = ti.z;
        }

        for(j = 0; j < tilesArray.length; j++) {
            tj = tilesArray[j];

            if(ti == tj) {
                continue;
            }

            if(ti.x == tj.x) {
                if(tj.y == ti.y - 1) {
                    dTop = false;
                }

                if(tj.y == y1) {
                    dBottom = false;
                }
            }

            if(ti.y == tj.y) {
                if(tj.x == ti.x - 1) {
                    dLeft = false;
                }

                if(tj.x == x1) {
                    dRight = false;
                }
            }
        }

        if(dTop) {
            linesToDraw.push({
                x1: ti.x,
                y1: ti.y,
                x2: x1,
                y2: ti.y,
                z: z
            });
        }

        if(dRight) {
            linesToDraw.push({
                x1: x1,
                y1: ti.y,
                x2: x1,
                y2: y1,
                z: z
            });
        }

        if(dBottom) {
            linesToDraw.push({
                x1: ti.x,
                y1: y1,
                x2: x1,
                y2: y1,
                z: z
            });
        }

        if(dLeft) {
            linesToDraw.push({
                x1: ti.x,
                y1: ti.y,
                x2: ti.x,
                y2: y1,
                z: z
            });
        }
    }

    return linesToDraw;
}

function clearOrientationViewer(instance) {

    let scene = instance.orientationScene;
    let cube = instance.orientationCube;
    let cam = instance.orientationCamera;

    if(cube) {

        if(cube.material && cube.material.dispose) {
            cube.material.dispose();
        }

        if(cube.geometry && cube.geometry.dispose) {
            cube.geometry.dispose();
        }

        if(cube.dispose) {
            cube.dispose();
        }

        if(scene) {
            scene.remove(cube);
        }
    }

    if(cam && cam.dispose) {
        cam.dispose();
    }

    if(instance.orientationHolder) {
        instance.orientationHolder.innerHTML = "";
    }

    instance.orientationHolder = null;
    instance.orientationCamera = null;
    instance.orientationCube = null;
    instance.orientationScene = null;
    instance.orientationRenderer = null;
}

function clearAutoCircleObjects(instance) {
    if(!instance) {
        return;
    }

    for(let i = 0; i < instance.curAutoCircleObjects.length; i++) {
        const obid = instance.curAutoCircleObjects[i];
        instance.removeObject(obid);
    }

    instance.curAutoCircleObjects = [];
}

function actualLocationToVirtual(instance, x, y) {
    instance.mouse.set((x / instance.lastWidth) * 2 - 1, - (y / instance.lastHeight) * 2 + 1);
    instance.raycaster.setFromCamera(instance.mouse, instance.camera);

    try {
        const hits = instance.raycaster.intersectObjects(instance.hitTestObjects,true);
        return checkHits(hits);
    } catch(ex) {
        console.log(ex);
        return null;
    }
}

/**
 * @param {Scroll3dEngine} instance - The instance of the object.
 */
function initPostProcessor(instance) {
        
    instance.postprocessor = null;

    if(!instance || !instance.renderer) {
        return;
    }

    if(!instance.filmMode && !instance.useDOFEffect) {
        return;
    }

    instance.postprocessor = {};

    const composer = new EffectComposer(instance.renderer);
    instance.postprocessor.composer = composer;

    instance.postprocessor.render = new RenderPass(instance.scene, instance.camera);
    composer.addPass(instance.postprocessor.render);

    if(instance.useDOFEffect) {
        instance.postprocessor.bokeh = new BokehPass(instance.scene, instance.camera, {
            focus: instance.radius,
            aperture: 0.025,
            maxblur: 0.01,
            width: instance.lastWidth,
            height: instance.lastHeight
        } );

        composer.addPass(instance.postprocessor.bokeh);
    }

    if(instance.filmMode) {
        instance.postprocessor.film = new FilmPass(0.10, 0.0, 0, instance.filmModeBW);
        composer.addPass(instance.postprocessor.film, 1);
    }

    const gammaCorrection = new ShaderPass(GammaCorrectionShader);
    composer.addPass(gammaCorrection);
    
    setInstanceSize(instance);

    instance.camera.updateMatrix();
    instance.shouldRender = true;

    updateFOVCamera(instance);
}

function checkHits(hits, ignoreId) {
    if(hits && hits.length > 0) {

        for(let i = 0; i < hits.length; i++) {
            const hit = hits[i];

            if(!hit.object) {
                continue;
            }

            if(ignoreId && hit.object.s3dob && ignoreId == hit.object.s3dob) {
                continue;
            }

            if(hit.object.isDisposed) {
                continue;
            }

            if(!chkHoverVec) {
                chkHoverVec = new Vector3(0,0,0);
            }

            if(!chkHoverVexAlt) {
                chkHoverVexAlt = new Vector3(0,0,0);
            }

            chkHoverVec.copy(hit.point);
            chkHoverVec.divideScalar(2).floor().multiplyScalar(2).addScalar(1);

            if(hit.face && hit.face.normal) {
                chkHoverVexAlt.copy(hit.point).add(hit.face.normal);
                chkHoverVexAlt.divideScalar(2).floor().multiplyScalar(2).addScalar(1);
            } else {
                chkHoverVexAlt.copy(hit.point);
                chkHoverVexAlt.divideScalar(2).floor().multiplyScalar(2).addScalar(1);
                
            }

            let instId = null;

            if(hit.instanceId != undefined) {
                instId = hit.instanceId;
            }

            return {
                x: Math.floor(chkHoverVec.x / 2),
                y: Math.floor(chkHoverVec.z / 2),
                z: Math.floor(chkHoverVec.y / 2),
                obj: hit.object,
                alt: {
                    x: Math.floor(chkHoverVexAlt.x / 2),
                    y: Math.floor(chkHoverVexAlt.z / 2),
                    z: Math.floor(chkHoverVexAlt.y / 2)
                },
                abs: {
                    x: hit.point.x / 2,
                    y: hit.point.z / 2,
                    z: hit.point.y / 2
                },
                instID: instId
            };
        }
    }

    return null;
}

function resetObjectCameraPosition(instance, obj) {

    if(!obj || !instance) {
        return;
    }

    obj.cameraTarget.x = 1;
    obj.cameraTarget.y = 0;
    obj.cameraTarget.z = 0;

    obj.cameraPosition.x = 1;
    obj.cameraPosition.y = instance.followCameraZOffset;
    obj.cameraPosition.z = -instance.followCameraDistance;

    let use = obj.mesh;

    if(!use) {
        use = obj.object;
    }

    if(!use) {
        return;
    }

    use.localToWorld(obj.cameraTarget);
    use.localToWorld(obj.cameraPosition);
}

/**
 * @param {Scroll3dEngine} instance - The instance of the object.
 */
function updateFOVCamera(instance) {
    if(instance.postprocessor && instance.postprocessor.bokeh) {
        instance.postprocessor.bokeh.uniforms.focus.value = instance.radius + instance.focusMod;
        instance.postprocessor.bokeh.uniforms.aperture.value = normalizeAperture(instance.apertureRatio);
        console.log("bookeh settings: " + instance.apertureRatio + " - " + instance.focusMod);
    }
}

function getLinearColorSpline(colorFirst, colorSecond) {
    const aploineName = colorFirst + "x" + colorSecond;

    if(splineRetentions[aploineName]) {
        return splineRetentions[aploineName];
    }

    const cSpline = new LinearSpline((t, a, b) => {
        const c = a.clone();
        return c.lerp(b, t);
    });

    cSpline.AddPoint(0.0, new Color(colorFirst));
    cSpline.AddPoint(1.0, new Color(colorSecond));

    splineRetentions[aploineName] = cSpline;

    return cSpline;
}

function getLinearAlphaSline(alpha) {
    const aploineName = "asplinex" + alpha;

    if(splineRetentions[aploineName]) {
        return splineRetentions[aploineName];
    }

    if(splineRetentions[aploineName]) {
        return splineRetentions[aploineName];
    }

    const aSpline = new LinearSpline((t, a, b) => {
        return a + t * (b - a);
    });

    aSpline.AddPoint(0.0, 0.0);
    aSpline.AddPoint(0.1, alpha);
    aSpline.AddPoint(0.6, alpha);
    aSpline.AddPoint(1.0, 0.0);

    splineRetentions[aploineName] = aSpline;

    return aSpline;
}

function addParticleSystem(instance,imageFile,blending) {

    const systemName = imageFile + ":" + blending;

    const systemParams = {
        image: imageFile,
        scene: instance.scene,
        camera: instance.camera,
        blending: blending
    };

    instance.particleSystems[systemName] = new ParticleSystem(systemParams);
}

function getNewParticle(options) {

    let particle = null;

    if(globalParticleRecycling.length > 0) {
        particle = globalParticleRecycling.pop();
    }

    if(!particle) {
        particle = new Particle();
    }

    particle.position = options.position;
    particle.size = options.size;
    particle.colour = options.colour;
    particle.colorSpline = options.colorSpline;
    particle.alpha = options.alpha;
    particle.alpheSpline = options.alpheSpline;
    particle.life = options.life;
    particle.maxLife = options.maxLife;
    particle.rotation = options.rotation;
    particle.velocity = options.velocity;

    return particle;
}

function clearLighting(instance) {

    if(instance.ambientLight) {
        removeObjectFromThree(instance, instance.ambientLight, true);
        instance.ambientLight = null;
    }

    if(instance.directionalLight) {
        removeObjectFromThree(instance, instance.directionalLight, true);
        instance.directionalLight = null;
    }

    if(instance.hemisphereLight) {
        removeObjectFromThree(instance, instance.hemisphereLight, true);
        instance.hemisphereLight = null;
    }

    if(instance.skydome) {
        removeObjectFromThree(instance, instance.skydome, true);
        instance.skydome = null;
    }

    if(instance.stardome) {
        removeObjectFromThree(instance, instance.stardome, true);
        instance.stardome = null;
    }

    if(instance.sunSphere) {
        removeObjectFromThree(instance, instance.sunSphere, true);
        instance.sunSphere = null;
    }
}

function setInstanceLight(instance, color) {

    clearLighting(instance);

    const darkerColor = LightenDarkenColor(color, -120);

    instance.ambientLight = new AmbientLight(darkerColor, SUN_INTENSITY);
    instance.scene.add(instance.ambientLight);

    instance.directionalLight = new DirectionalLight(color, SUN_INTENSITY);
    instance.directionalLight.position.set(1, 0.75, 0.5).normalize();
    instance.directionalLight.castShadow = true;
    instance.scene.add(instance.directionalLight);
}

function addSkyObjects(instance) {

    clearLighting(instance);

    // sun sphere
    if(instance.showSun) {
        if(!globalSunGeo) {
            globalSunGeo = new SphereGeometry(40,32,32);
        }

        instance.sunSphere = new Mesh(
            globalSunGeo,
            new MeshBasicMaterial({
                color: instance.sunColor, 
                fog: false 
            })
        );

        instance.scene.add(instance.sunSphere);
    }

    // hemisphere light
    instance.hemisphereLight = new HemisphereLight(instance.sunColor,instance.skyBottomColor,(instance.hemiBrightness * 2.4));
    instance.hemisphereLight.position.set( 0, 50, 0 );
    instance.scene.add(instance.hemisphereLight );
    
    // directional light
    instance.directionalLight = new DirectionalLight(instance.sunColor, SUN_INTENSITY);
    instance.directionalLight.castShadow = true;
    instance.directionalLight.target = instance.centerObject;
    instance.scene.add(instance.directionalLight);

    if(!instance.skydome && !instance.noSky) {
        // sky dome 
        let uniforms = {
            "topColor": { value: new Color(instance.skyTopColor) },
            "bottomColor": { value: new Color(instance.skyBottomColor) },
            "offset": { value: 33 }, //33
            "exponent": { value: 0.6 } // 0.6
        };

        let skyGeo = new SphereGeometry( 4000, 32, 15 );
        let skyMat = new ShaderMaterial( {
            uniforms: uniforms,
            vertexShader: skyVertexShader(),
            fragmentShader: skyFragmentShader(),
            side: BackSide
        } );

        instance.skydome = new Mesh(skyGeo, skyMat );
        instance.scene.add(instance.skydome);
    }
    

    

    // star dome 
    if(instance.starTexture && !instance.stardome) {
        let starTex = TEXTURE_LOADER.load(instance.starTexture);

        if(starTex) {
            starTex.colorSpace = USE_COLORSPACE;

            let starGeo = new SphereGeometry( 3900, 32, 15 );
            let starMat = new MeshBasicMaterial( {
                map: starTex,
                side: BackSide, 
                fog: false,
                transparent: true,
                opacity: 1
            } );

            instance.stardome = new Mesh( starGeo, starMat );
            instance.scene.add(instance.stardome);
        }
    }

    setupFog(instance);

    normalizeSunPosition(instance);
}

function normalizeSunPosition(instance) {
    if(instance.directionalLight) {
        let cpX = instance.centerPosition.x;
        let cpY = instance.centerPosition.y;
        let cpZ = instance.centerPosition.z;

        let point = getPoint(cpX, cpZ, 700, degreesToRadians(instance.sunAngle));

        cpY += instance.sunYoffset;

        cpX = point[0];
        cpZ = point[1];

        cpX *= 2;
        cpY *= 2;
        cpZ *= 2;

        instance.directionalLight.position.set(cpX, cpZ, cpY);

        if(instance.sunSphere) {
            instance.sunSphere.position.set(cpX, cpZ, cpY);
        }

        if(!instance.skydome && instance.stardome) {
            instance.directionalLight.castShadow = true;
            instance.directionalLight.intensity = SUN_INTENSITY;
        } else {
            if(instance.sunAngle < 0 || instance.sunAngle >= 184) {
                instance.directionalLight.castShadow = false;
                instance.directionalLight.intensity = 0;
            } else {
                instance.directionalLight.castShadow = true;
                instance.directionalLight.intensity = SUN_INTENSITY;
            }
        }

        

        instance.directionalLight.shadow.camera.far = 1600;

        let sizeOut = Math.round(instance.radius * 1.5);

        sizeOut = Math.round(instance.radius * 0.75);
        
        instance.directionalLight.shadow.camera.left = -sizeOut;
        instance.directionalLight.shadow.camera.right = sizeOut * instance.sizeOutMultiplier;
        instance.directionalLight.shadow.camera.top = sizeOut * instance.sizeOutMultiplier;
        instance.directionalLight.shadow.camera.bottom = -sizeOut;

        instance.centerObject.position.set(
            instance.centerPosition.x * 2,
            instance.centerPosition.z * 2,
            instance.centerPosition.y * 2
        );

        instance.directionalLight.shadow.camera.updateProjectionMatrix();


        if(instance.hemisphereLight) {
            if(!instance.skydome && instance.stardome) {
                instance.hemisphereLight.intensity = instance.hemiBrightness * 0.75;
            } else {
                if(instance.sunAngle < 0 || instance.sunAngle > 180) {
                    instance.hemisphereLight.intensity = instance.hemiBrightness * 0.5;
                } else {
                    instance.hemisphereLight.intensity = instance.hemiBrightness * 0.75;
                }
            }
            
        }

        let stardomeOpacity = 0;

        // straight noon is 90

        if(instance.skydome && instance.stardome) {
            

            if(instance.sunAngle > 0 && instance.sunAngle < 180) {
                stardomeOpacity = 0;
            } else {
                stardomeOpacity = 1;
            }

            
            if(instance.sunAngle >= 181 && instance.sunAngle <= 184) {
                const diff = 184 - instance.sunAngle;
                stardomeOpacity = 1 - (diff / 3);

            }

            if(instance.sunAngle <= 359 && instance.sunAngle >= 356) {
                const diff = 359 - instance.sunAngle;
                stardomeOpacity = (diff / 3);
            }

            
            if(instance.sunAngle < 356 && instance.sunAngle > 184) {
                stardomeOpacity = 1;
            }

            if(stardomeOpacity < 0) {
                stardomeOpacity = 0;
            }

            if(stardomeOpacity > 1) {
                stardomeOpacity = 1;
            }
            
            let nightTime = false;

            if(stardomeOpacity < 1) {
                instance.stardome.material.transparent = true;
                instance.stardome.material.opacity = stardomeOpacity;
            } else {
                instance.stardome.material.transparent = false;
                instance.stardome.material.opacity = 1;

                nightTime = true;
            }
            
            if(nightTime != instance.lastNight) {
                setupFog(instance);
                instance.lastNight = nightTime;
            }
        } else {
            if(instance.stardome) {
                instance.stardome.material.transparent = false;
                instance.stardome.material.opacity = 1;

                if(!instance.lastNight) {
                    setupFog(instance);
                    instance.lastNight = true;
                }
            }
        }

    }

    if(instance.waterPlane) {
        instance.waterPlane.position.set(instance.centerPosition.x * 2,1.8,instance.centerPosition.y * 2);
    }
}

function LightenDarkenColor(color, amount) {
    const rgb = hexToRGB(color);

    rgb.r += amount;
    rgb.g += amount;
    rgb.b += amount;

    for(let key in rgb) {
        if(rgb[key] < 0) {
            rgb[key] = 0;
        }

        if(rgb[key] > 255) {
            rgb[key] = 255;
        }
    }

    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function getSnowParticleTexture() {

    if(commonParticleTextures.snow) {
        return commonParticleTextures.snow;
    }

    let pCan = document.createElement("canvas");
    let pCon = pCan.getContext("2d");

    let size = 100;

    pCan.height = size * 4;
    pCan.width = size * 4;

    let halfSize = size / 2 ;

    pCon.lineWidth = 10;
    pCon.lineCap = "round";
    pCon.fillStyle = "rgba(255, 255, 255, 0.25)";
    pCon.strokeStyle = "#FFFFFF";

    pCon.translate(size * 2,size * 2);
    for(var count = 0; count < 6; count++) {
        pCon.save();

        drawSnowSegment(pCon, halfSize, halfSize * 0.4);
        drawSnowSegment(pCon, halfSize, halfSize * 0.8);
        drawSnowSegment(pCon, halfSize, 0);

        pCon.restore();			
        pCon.rotate(π/3);
    }

    let data = pCan.toDataURL("image/png",1);

    commonParticleTextures.snow = data;

    return data;
}

function setHudCanvasPosition(instance) {
    if(instance.currentHudCanvasTexture) {
        if(instance.vrSession) {
            instance.currentHudCanvasMesh.position.z = -1.4;
        } else {

            const ratio = instance.lastHeight / instance.lastWidth;
            let useZ = -(0.75 + ratio);

            if(useZ > -1.2) {
                useZ = -1.2;
            }

            instance.currentHudCanvasMesh.position.z = useZ;
        }
    }
}

function initVPPLightsAndEmitters(worldObject) {

    if(!worldObject || !worldObject.object || !worldObject.instance) {
        return;
    }

    const instance = worldObject.instance;

    const meshName = worldObject.vppMeshNameRef;

    if(!meshName) {
        return;
    }

    // first remove all existing lights and emitters 
    for(let i = 0; i < worldObject.lights.length; i++) {
        const lOb = worldObject.lights[i];

        worldObject.object.remove(lOb.pl);

        if(lOb.pl.dispose) {
            lOb.pl.dispose();
        }

        lOb.pl = null;
    }

    worldObject.lights = [];

    const lights = vppLightsRef[meshName];
    
    // eslint-disable-next-line no-unused-vars
    const emitters = vppEmittersRef[meshName];

    const scale = worldObject.scale * worldObject.instance.vppRatio;

    if(lights && lights.length > 0 && instance.dynamicLighting) {

        for(let i = 0; i < lights.length; i++) {
            const ld = lights[i];

            const rad = (ld.r * scale) * 3.14;

            const light = new PointLight(ld.c, ld.i * 12, rad, 1);
            
            light.position.x = (ld.x * scale) - worldObject.width;
            light.position.z = (ld.y * scale) - worldObject.height / 2;
            light.position.y = (ld.z * scale);

            worldObject.object.add(light);

            const lOb = {
                def: ld,
                pl: light
            };

            worldObject.lights.push(lOb);
        }
    }

}

function rebuildInstanceRenderer(instance) {

    if(instance.renderer) {
        instance.renderer.setAnimationLoop(null);
    }

    instance.postprocessor = null;
    instance.renderer = null;

    instance.vrController0 = null;
    instance.vrController1 = null;

    if(instance.vrCamHolder) {
        instance.vrCamHolder.clear();
        instance.vrCamHolder.add(instance.camera);
    }

    const rendererOptions = {
        antialias: instance.antialias, 
        alpha: true, 
        preserveDrawingBuffer: true
    };

    if(instance.canvas) {
        rendererOptions.canvas = instance.canvas;
    }

    instance.renderer = new WebGLRenderer(rendererOptions);
    instance.renderer.setPixelRatio(window.devicePixelRatio);
    instance.renderer.autoClear = false;

    instance.renderer.outputColorSpace = USE_COLORSPACE;
    instance.renderer.gammaOutput = true;

    if(instance.xr) {
        instance.renderer.xr.enabled = instance.xr;
        
        initController(instance, 0);
        initController(instance, 1);
    }

    instance.renderer.setAnimationLoop(function(t) {
        handleInstanceRender(instance, t);
    });

    if(instance.shadows) {
        instance.renderer.shadowMap.enabled = true;
    } else  {
        instance.renderer.shadowMap.enabled = false;
    }

    instance.renderer.shadowMap.autoUpdate = true;

    initPostProcessor(instance);

    if(!instance.canvas) {
        instance.canvas = instance.renderer.domElement;
        instance.holder.appendChild(instance.canvas);
    }

    if(instance.firstSetup) {
        instance.canvas.instanceId = instance.id;
        instance.canvas.style.pointerEvents = "none";

        instance.touchOverlay = document.createElement("canvas");
        instance.holder.appendChild(instance.touchOverlay);

        instance.touchOverlay.width = instance.holder.offsetWidth;
        instance.touchOverlay.height = instance.holder.offsetHeight;

        instance.touchOverlay.style.position = "absolute";
        instance.touchOverlay.style.top = "0px";
        instance.touchOverlay.style.left = "0px";

        instance.touchOverlay.style.width = "100%";
        instance.touchOverlay.style.height = "100%";

        instance.canvas.ontouchstart = function(e){e.preventDefault();};
        instance.canvas.ontouchend = function(e){e.preventDefault();};
        instance.canvas.ontouchcancel = function(e){e.preventDefault();};
        instance.canvas.ontouchmove = function(e){e.preventDefault();};

        handleInput({
            element: instance.canvas,
            down: onDown,
            move: onMove,
            up: onUp
        });

        instance.canvas.addEventListener("wheel", onMouseWheel);
        instance.canvas.addEventListener("contextmenu",function(e){
            e.preventDefault();
        });

        instance.canvas.style.display = "block";
        instance.canvas.style.margin = "0px auto";

        instance.firstSetup = false;
    }

    setInstanceSize(instance);

    instance.renderer.getContext().canvas.addEventListener("webglcontextlost", function() {
        instance.contextLost = true;
    });

    instance.renderer.getContext().canvas.addEventListener("webglcontextrestored", function() {
        if(instance.contextLost) {
            instance.contextLost = false;
            rebuildInstanceRenderer(instance);
        }
        
    });
}

function zeroOutCameraPosition(instance) {
    instance.cameraVector.x = 0;
    instance.cameraVector.y = 0;
    instance.cameraVector.z = 0;

    instance.camera.position.x = 0;
    instance.camera.position.y = 0;
    instance.camera.position.z = 0;

    instance.camera.rotation.x = 0;
    instance.camera.rotation.y = 0;
    instance.camera.rotation.z = 0;
}

function getHexForFace(face) {
    if(face == 0) {
        return 0xff0000;
    }

    if(face == 1) {
        return 0x660000;
    }

    if(face == 2) {
        return 0x00ff00;
    }

    if(face == 3) {
        return 0x006600;
    }

    if(face == 4) {
        return 0x0000ff;
    }

    return 0x000066;
}

function buildInteractionResult(instance, pointer, hitPosition, x, y, type) {
    let hitObj = null;

  
    if(hitPosition.obj && hitPosition.obj != instance.plane) {

        let testObj = hitPosition.obj;

        
        if(testObj.parent && testObj.parent.type == "Group") {
            testObj = testObj.parent;
        }
        
        // first check vpp instances
        if(hitPosition.instID != null) {
            for(let instid in instance.vppInstances) {
                const vppInst = instance.vppInstances[instid];

                if(vppInst.mesh == testObj) {

                    const instIdx = vppInst.items[hitPosition.instID];

                    if(instIdx) {

                        const obj = instance.objects[instIdx];

                        if(obj) {
                            hitObj = {
                                id: obj.id,
                                x: obj.x,
                                y: obj.y,
                                z: obj.z,
                                raw: obj
                            };

                            break;
                        }

                        
                    }

                    
                }
            }
        }
        

        if(!hitObj) {
            for(let objid in instance.objects) {


                const obj = instance.objects[objid];

                if(obj.mesh == testObj) {
                    hitObj = {
                        id: objid,
                        x: obj.x,
                        y: obj.y,
                        z: obj.z,
                        raw: obj
                    };

                    // or some other instance object
                    if(hitPosition.instID != null && obj.type == "instancecube") {
                        const instIdx = obj.instancePositions[hitPosition.instID];

                        if(instIdx) {
                            hitObj.x = instIdx.x;
                            hitObj.y = instIdx.y;
                            hitObj.z = instIdx.z;
                        }
                    }

                    break;
                }
                
            }
        }

    }

    return {
        x: hitPosition.x,
        y: hitPosition.y,
        z: hitPosition.z,
        type: type,
        actualX: x,
        actualY: y,
        altX: hitPosition.alt.x,
        altY: hitPosition.alt.y,
        altZ: hitPosition.alt.z,
        obj: hitObj,
        pd: pointer.down,
        absX: hitPosition.abs.x,
        absY: hitPosition.abs.y,
        absZ: hitPosition.abs.z
    };
}

function finishInitMeshObject(worldObject) {

    worldObject.mesh.scale.set(worldObject.scale, worldObject.scale, worldObject.scale);

    const box = new Box3().setFromObject(worldObject.mesh);
    const size = new Vector3();

    box.getSize(size);

    worldObject.rawTallness = size.y;

    if(worldObject.isSymmetrical) {
        worldObject.width = Math.ceil(size.x / 2);
        worldObject.height = Math.ceil(size.z / 2);

        //for vpp, normalize w and h
    
        if(worldObject.width > worldObject.height) {
            worldObject.height = worldObject.width;
        }

        if(worldObject.height > worldObject.width) {
            worldObject.width = worldObject.height;
        }
    } else {

        worldObject.width = size.x / 2;
        worldObject.height = size.z / 2;
    }

    worldObject.width *= worldObject.scale;
    worldObject.height *= worldObject.scale;

    worldObject.mesh.castShadow = true;
    worldObject.mesh.receiveShadow = true;

    if(worldObject.mesh.children) {
        for(let i = 0; i < worldObject.mesh.children.length; i++) {
            const child = worldObject.mesh.children[i];

            if(!child.type || child.type != "Mesh") {
                continue;
            }

            child.castShadow = true;
            child.receiveShadow = true;
        }
    }
    
    worldObject.object.add(worldObject.mesh);

    normalizeObjectPosition(worldObject);
}

function getCubeGeometry(w, h, slope = false) {

    let sl = 0;

    if(slope) {
        sl = 1;
    }

    const geoName = "cg:" + w + ":" + h + ":" + sl;

    if(commonCubeGeos[geoName]) {
        return commonCubeGeos[geoName];
    }

    const totalW = w * 2;
    const totalH = h * 2;

    const geo = new BoxGeometry(totalW, totalH, totalW);

    commonCubeGeos[geoName] = geo;

    return geo;
}

function getLineMaterial(color,width,dashed) {
    let dashName = "nodash";

    if(dashed) {
        dashName = "dash";
    }

    let matName = "linemat." + color + "." + width + "." + dashName;

    if(commonMaterials[matName]) {
        return commonMaterials[matName];
    }

    let matOptions = {};

    matOptions.color = color;
    matOptions.linewidth = width;

    let mat = null;


    if(dashed) {
        matOptions.scale = 1;
        matOptions.dashSize = 0.25;
        matOptions.gapSize = 0.25;

        mat = new LineDashedMaterial(matOptions);
    } else {
        mat = new LineBasicMaterial(matOptions);
    }

    commonMaterials[matName] = mat;

    return mat;
}

function text2D(text, params) {
    let canvas = document.createElement("canvas");

    canvas.width = 600;
    canvas.height = 80;

    if(params.bars) {
        canvas.height += (params.bars.length * 6);
    }

    let context = canvas.getContext("2d");
    context.font = "bold 50px sans-serif";

    let metrics = context.measureText(text);
    let textWidth = metrics.width;
    let textHeight = 50;

    context.lineJoin = "miter"; 
    context.lineWidth = 8;
    context.miterLimit = 2;
    context.fillStyle = params.color;
    context.strokeStyle = "#000000";

    context.strokeText(text, (canvas.width - textWidth) / 2, 40);
    context.fillText(text, (canvas.width - textWidth) / 2, 40);

    if(params.bars) {

        let barX = (canvas.width - textWidth) / 2;
        let barY = 38 + Math.ceil(textHeight / 2);

        for(let i = 0; i < params.bars.length; i++) {

            const bar = params.bars[i];
            const width = bar.percent * textWidth;

            context.fillStyle = "#000000";
            context.fillRect(barX,barY,textWidth,4);

            context.fillStyle = bar.color;
            context.fillRect(barX,barY,width,4);

            barY += 6;
        }
    }

    const texture = new Texture(canvas);
    texture.needsUpdate = true;
    texture.colorSpace = USE_COLORSPACE;

    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;

    const matOptions = {
        map: texture,
        depthWrite: false,
        depthTest: false,
        transparent: true
    };

    const spriteMaterial = new SpriteMaterial(matOptions);
    const sprite = new Sprite(spriteMaterial);
    sprite.scale.set(8, 1, 1);
    sprite.renderOrder = 999;
    return sprite;
}

function getRadialTexture(cCenter,cEdge,intensity) {

    if(!intensity) {
        intensity = 1;
    }

    let txidx = cCenter + "." + cEdge + "." + intensity;

    if(commonRadialTextures[txidx]) {
        return commonRadialTextures[txidx];
    }

    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    canvas.height = 64;
    canvas.width = 64;

    let grd = context.createRadialGradient(32,32,8,32,32,32);
    grd.addColorStop(0,cCenter);
    grd.addColorStop(1,cEdge);

    context.fillStyle = grd;

    for(let i = 0; i < intensity; i++) {
        context.fillRect(0,0,64,64);
    }

    let texture = new Texture(canvas);
    texture.needsUpdate = true;
    texture.colorSpace = USE_COLORSPACE;

    commonRadialTextures[txidx] = texture;

    return texture;
}

function getFinalMat(matOptions, emissive, metal, useBasic) {
    let mat = null;

    if(emissive) {
        matOptions.emissive = emissive; 
    }

    if(metal) {

        matOptions.roughness = 0.8;
        matOptions.metalness = 0.8;


        mat = new MeshStandardMaterial(matOptions);
    } else {
        if(useBasic) {
            mat = new MeshBasicMaterial(matOptions);
        } else {
            mat = new MeshLambertMaterial(matOptions);
        }
    }

    return mat;
}

function completeSpriteMaterialLoad(callback,matName,tx,opacity) {
    const matOptions = {
        map: tx,
        depthWrite: true,
        transparent: true
    };

    if(opacity != 1) {
        matOptions.opacity = opacity;
    }

    let material = new SpriteMaterial(matOptions);

    commonMaterials[matName] = material;

    callback(material);
}

function drawTextureGridline(buildContext) {

    buildContext.strokeStyle = "rgba(0, 0, 0 , 0.25)";

    buildContext.lineWidth = Math.ceil(useTextureSize / 16);

    buildContext.beginPath();
    buildContext.moveTo(0,0);
    buildContext.lineTo(0, useTextureSize);
    buildContext.lineTo(useTextureSize, useTextureSize);
    buildContext.stroke();
}

function getChunkTileNeighbor(data, x, y, z, dep) {

    if(y < 0) {
        return null;
    }

    if(x < 0 || z > data.length - 1) {
        return null;
    }

    if(z < 0 || z > data[0].length - 1) {
        return null;
    }

    if(!data[x]) {
        return null;
    }

    let tile = data[x][z];

    if(!tile) {
        return null;
    }

    let useZ = 0;

    if(tile.z) {
        useZ = tile.z;
    }

    if(useZ < y) {
        return null;
    }

    if(tile.isDepressed != dep) {
        return -1;
    }

    return tile;
}

function setVRCameraTheta(instance) {
    instance.camera.getWorldDirection(instance.cameraVector);

    const currentPlayerDirRadians = Math.atan2(instance.cameraVector.x,instance.cameraVector.z) + π;
    const thetaRot = currentPlayerDirRadians * ONE_EIGHTY_π_REV;

    instance.theta = thetaRot * 2;

    if(instance.theta > 720) {
        instance.theta = instance.theta - 720;
    }

    if(instance.theta < 0) {
        instance.theta = 720 + instance.theta;
    }
}

function normalizeAperture(ap) {
    return ap * 0.001;
}

function initController(instance, index) {
    const controller = instance.renderer.xr.getController(index);
    const grip = instance.renderer.xr.getControllerGrip(index);

    let gripMesh = null;

    controller.addEventListener("connected", function ( event ) {
        controller.add(buildController(event.data));

        if(index == 0) {
            instance.vrController0 = controller;
        }

        if(index == 1) {
            instance.vrController1 = controller;
        }

        if(!instance.useVRControllerGrips) {
            if(event.data.targetRayMode && event.data.targetRayMode == "tracked-pointer") {
                if(!sphereHandGeo) {
                    sphereHandGeo = new SphereGeometry(1,16,8);
                }

                const material = new MeshStandardMaterial( { color: "#444444" } );
                gripMesh = new Mesh(sphereHandGeo, material );
                gripMesh.scale.set(0.04,0.04,0.04);

                grip.add(gripMesh);

                instance.vrCamHolder.add(grip);
            }
        }
        
    } );

    controller.addEventListener("disconnected", function () {
        controller.remove(controller.children[0]);

        if(index == 0) {
            instance.vrController0 = null;
        }

        if(index == 1) {
            instance.vrController1 = null;
        }
    } );

    if(!controllerModelFactory) {
        controllerModelFactory = new XRControllerModelFactory();
    }

    grip.add(controllerModelFactory.createControllerModel(grip));
    instance.vrCamHolder.add(grip);

    instance.vrCamHolder.add(controller);


    return controller;
}

function handleInstanceRender(instance, t) {

    if(!instance) {
        return;
    }

    if(instance.lastRAF == null) {
        instance.lastRAF = t;
    }

    const elapsed = t - instance.lastRAF;
    instance.lastRAF = t;

    instance.curDelta = elapsed / TARGET_DELTA;

    instance.lastFPS.push(1000 / elapsed);

    calculateCurrentFPS(instance);

    if(isNaN(instance.curDelta)) {
        instance.curDelta = 1;
    }

    currentGPPollInstance = instance.id;
    GPH.forcePoll();

    handleInstanceGamepadScrolling(instance);

    if(instance.touchPadMode) {
        if(!instance.virtPad) {
            instance.virtPad = GPH.createVirtualPad({
                canvas: instance.touchOverlay,
                leftStick: instance.virtPadLeft,
                rightStick: instance.virtPadRight,
                buttons: instance.touchPadButtons
            });
        }

        instance.virtPad.render();

        if(instance.canvas.style.pointerEvents != "none") {
            instance.canvas.style.pointerEvents = "none";
        }

        if(instance.touchOverlay.style.display != "block") {
            instance.touchOverlay.style.display = "block";
        }
    } else {
        if(instance.canvas.style.pointerEvents != "all") {
            instance.canvas.style.pointerEvents = "all";
        }

        if(instance.touchOverlay.style.display != "none") {
            instance.touchOverlay.style.display = "none";
        }
    }

    for(let ps in instance.particleSystems) {
        const system = instance.particleSystems[ps];

        processSpecialParticleSystem(system,elapsed,instance);
        stepParticleSystem(system,elapsed);
    }

    for(let chunkId in instance.chunks) {
        if(chunkId.endsWith("water")) {
            const wMesh = instance.chunks[chunkId];
            wMesh.material.uniforms.time.value += 1.0 / 60.0;
        }
    }

    // retry removals
    const doRetries = [];

    while(instance.removeRetryObjects.length > 0) {
        doRetries.push(instance.removeRetryObjects.pop());
    }

    while(doRetries.length > 0) {

        let ro = doRetries.pop();

        if(ro.tries < 20) {
            instance.removeObject(ro.id,ro.tries);
        } else {
            delete instance.objects[ro.id];
        }
        
    }

    doPostProcessing(instance);
    
    if(instance.edgeScrolling && instance.edgeScrollDir) {

        if(instance.edgeScrollDir == "top") {
            conductPan(instance, 0, -EDGE_SCROLLING_SPEED);
        }

        if(instance.edgeScrollDir == "left") {
            conductPan(instance, -EDGE_SCROLLING_SPEED, 0);
        }

        if(instance.edgeScrollDir == "bottom") {
            conductPan(instance, 0, EDGE_SCROLLING_SPEED);
        }

        if(instance.edgeScrollDir == "right") {
            conductPan(instance, EDGE_SCROLLING_SPEED, 0);
        }
    }
    
    if(instance.renderLoopFunction) {
        instance.renderLoopFunction(elapsed, instance.curDelta, instance.curFPS);
    }

    if(instance.orientationRenderer) {
        instance.orientationRenderer.render(instance.orientationScene, instance.orientationCamera);

        if(instance.orientationCube) {

            const th = -MathUtils.degToRad(instance.theta / 2);
            const ph = MathUtils.degToRad(instance.phi / 2);

            instance.orientationCube.rotation.set(ph,th,0);
        }
    }

    if(instance.vrSession) {

        if(instance.vrController0 || instance.vrController1) {
            let useController = instance.vrController1;

            if(!useController) {
                useController = instance.vrController0;
            }

            if(useController) {
                tempMatrix.identity().extractRotation(useController.matrixWorld);

                instance.raycaster.ray.origin.setFromMatrixPosition(useController.matrixWorld );
                instance.raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );
    
                const hits = instance.raycaster.intersectObjects(instance.hitTestObjects,true);
                const hitPosition = checkHits(hits);
    
                if(hitPosition) {
                    instance.lastHoverReport.x = hitPosition.x;
                    instance.lastHoverReport.y = hitPosition.y;
                    instance.lastHoverReport.z = hitPosition.z;
        
                    if(hitPosition.z < 0) {
                        hitPosition.z = 0;
                    }
    
                    if(instance.hoverFunction) {
                        instance.hoverFunction(
                            buildInteractionResult(instance,{
                                down: false
                            },hitPosition,0,0,"vr")
                        );
                    }
                }
            }
        } 
    } else {
        let tgtOb = null;

        if(instance.cameraTarget) {
            if(instance.objects[instance.cameraTarget]) {
                tgtOb = instance.objects[instance.cameraTarget];
            }
        }

        if(tgtOb) {

            const camScale = instance.cameraScale;

            instance.vrCamHolder.scale.set(camScale, camScale, camScale);
            instance.followCameraZOffset = DEF_CAMZ_OFFSET;
            instance.followCameraDistance = 5;

            resetObjectCameraPosition(instance, tgtOb);

            instance.radius = 20;

            instance.vrCamHolder.position.lerp(tgtOb.cameraPosition, instance.lerpSpeed);

            instance.centerPosition.x = tgtOb.x;
            instance.centerPosition.y = tgtOb.y;

            instance.camera.lookAt(tgtOb.cameraTarget);
        }
    }

    if(instance.vppInstances) {
        for(let insName in instance.vppInstances) {
            const instOb = instance.vppInstances[insName];

            if(!instOb || instOb.loading || !instOb.changed || !instOb.rawMesh) {
                continue;
            }

            setupVPPInstanceObject(instance, instOb);
        }
    }
}

function onDown(e) {

    const instance = scrollInstances[e.element.instanceId];

    let x = e.x;
    let y = e.y;
    
    if(instance.effectiveScale != 1) {
        x *= instance.effectiveScale;
        y *= instance.effectiveScale;
    }

    if(instance.pointerListener) {
        instance.pointerListener({
            event: "down",
            object: e.element,
            id: e.id,
            x: x,
            y: y,
            type: e.type,
            pressure: e.pressure,
            which: e.which
        });
    }

    const pointer = getPointer(instance, e.id, x, y, e.type, e.which);

    pointer.down = true;
    pointer.x = x;
    pointer.y = y;
    pointer.lx = x;
    pointer.ly = y;

    instance.pointersDown++;

    if(e.type == "mouse" && e.which && e.which == 3) {
        pointer.right = true;
    } else {
        pointer.right = false;
    }

    if(e.which) {
        pointer.button = e.which;
    }
}

function onMove(e) {
    const instance = scrollInstances[e.element.instanceId];

    if(!instance) {
        return;
    }

    let x = e.x;
    let y = e.y;
    
    if(instance.effectiveScale != 1) {
        x *= instance.effectiveScale;
        y *= instance.effectiveScale;
    }

    if(instance.pointerListener) {
        instance.pointerListener({
            event: "move",
            object: e.element,
            id: e.id,
            x: x,
            y: y,
            type: e.type
        });
    }

    instance.edgeScrollDir = null;

    const pointer = getPointer(instance, e.id, x, y, e.type);

    if(instance.pointersDown == 2) {
        pointer.lx = x;
        pointer.ly = y;
        handlePinch(instance);
        return;
    }

    if(pointer.down) {

        if(instance.cameraMode == CAMERA_MODES.ROTATE) {
            const difX = (x - pointer.x) / instance.effectiveScale;
            const difY = (y - pointer.y) / instance.effectiveScale;

            instance.theta = - (difX * 0.5) + pointer.theta;
            instance.phi = (difY * 0.5) + pointer.phi;

            if(instance.theta > 720) {
                instance.theta = instance.theta - 720;
            }

            if(instance.theta < 0) {
                instance.theta = 720 + instance.theta;
            }

            instance.phi = Math.min(180, Math.max(-180, instance.phi));

            if(instance.phi > instance.maxPhi) {
                instance.phi = instance.maxPhi;
            }

            if(instance.phi < instance.minPhi) {
                instance.phi = instance.minPhi;
            }

            setCameraPosition(instance);
        }

        
        if(instance.cameraMode == CAMERA_MODES.PAN) {
            const difX = (pointer.lx - x) / instance.effectiveScale;
            const difY = (pointer.ly - y) / instance.effectiveScale;

            conductPan(instance, difX, difY);
        }

    }

    pointer.lx = x;
    pointer.ly = y;

    checkHoverHit(instance, x, y, pointer, e.type);

    if(instance.edgeScrolling && e.type && e.type == "mouse") {
        if(y < EDGE_SCROLLING_BUFFER) {
            instance.edgeScrollDir = "top";
        }

        if(x < EDGE_SCROLLING_BUFFER) {
            instance.edgeScrollDir = "left";

            if(y < EDGE_SCROLLING_BUFFER) {
                instance.edgeScrollDir = "topleft";
            }

            if(y > instance.lastHeight - EDGE_SCROLLING_BUFFER) {
                instance.edgeScrollDir = "bottomleft";
            }
        }

        if(y > instance.lastHeight - EDGE_SCROLLING_BUFFER) {
            instance.edgeScrollDir = "bottom";
        }

        if(x > instance.lastWidth - EDGE_SCROLLING_BUFFER) {
            instance.edgeScrollDir = "right";

            if(y < EDGE_SCROLLING_BUFFER) {
                instance.edgeScrollDir = "topright";
            }

            if(y > instance.lastHeight - EDGE_SCROLLING_BUFFER) {
                instance.edgeScrollDir = "bottomright";
            }
        }
    }
}

function onUp(e) {

    const instance = scrollInstances[e.element.instanceId];

    if(!instance) {
        return;
    }

    const pointer = getPointer(instance, e.id, null, null, e.type);

    if(instance.pointerListener) {
        instance.pointerListener({
            event: "up",
            object: e.element,
            id: e.id,
            type: e.type,
            which: pointer.button
        });
    }

    if(pointer.down) {
        pointer.down = false;
        instance.pointersDown--;

        let a = pointer.x - pointer.lx;
        let b = pointer.y - pointer.ly;

        let dist = Math.sqrt(a * a + b * b);

        if(dist > MAX_MOUSE_MOVE) {
            clearPointers(instance);
            return;
        }

        const hitPosition = actualLocationToVirtual(instance,pointer.x,pointer.y);

        if(hitPosition) {
            if(instance.clickFunction) {

                if(hitPosition.z < 0) {
                    hitPosition.z = 0;
                }

                if(pointer.right && instance.rightClickFunction) {
                    instance.rightClickFunction(
                        buildInteractionResult(instance, pointer, hitPosition, pointer.x, pointer.y, e.type)
                    );
                } else {
                    instance.clickFunction(
                        buildInteractionResult(instance, pointer, hitPosition, pointer.x, pointer.y, e.type)
                    );
                }

                    
            }
        }
    }

    clearPointers(instance);
}

function onMouseWheel(e) {
    const instance = scrollInstances[this.instanceId];
    const normalized = normalizeWheel(e);

    if(instance.wheelFunction) {
        const handled = instance.wheelFunction(normalized);

        if(handled) {
            return;
        }
    }

    doZoom(instance,normalized.spinY);
    setCameraPosition(instance);
}

function normalizeWheel(event) {
    let sX = 0, sY = 0, pX = 0, pY = 0;

    if ("detail"      in event) { sY = event.detail; }
    if ("wheelDelta"  in event) { sY = -event.wheelDelta / 120; }
    if ("wheelDeltaY" in event) { sY = -event.wheelDeltaY / 120; }
    if ("wheelDeltaX" in event) { sX = -event.wheelDeltaX / 120; }

    if ( "axis" in event && event.axis === event.HORIZONTAL_AXIS ) {
        sX = sY;
        sY = 0;
    }

    pX = sX * PIXEL_STEP;
    pY = sY * PIXEL_STEP;

    if ("deltaY" in event) { pY = event.deltaY; }
    if ("deltaX" in event) { pX = event.deltaX; }

    if ((pX || pY) && event.deltaMode) {
        if (event.deltaMode == 1) { 
            pX *= LINE_HEIGHT;
            pY *= LINE_HEIGHT;
        } else {  
            pX *= PAGE_HEIGHT;
            pY *= PAGE_HEIGHT;
        }
    }

    if (pX && !sX) { sX = (pX < 1) ? -1 : 1; }
    if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }

    return { 
        pinX  : sX,
        spinY  : sY,
        pixelX : pX,
        pixelY : pY 
    };
}

function buildController( data ) {
    let geometry, material;

    switch ( data.targetRayMode ) {

    case "tracked-pointer":
        geometry = new BufferGeometry();
        geometry.setAttribute("position", new Float32BufferAttribute([ 0, 0, 0, 0, 0, - 1 ], 3));
        geometry.setAttribute("color", new Float32BufferAttribute([ 0.5, 0.5, 0.5, 0, 0, 0 ], 3));

        material = new LineBasicMaterial({ vertexColors: true, blending: AdditiveBlending });

        return new Line( geometry, material );

    case "gaze":
        geometry = new RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
        material = new MeshBasicMaterial( { opacity: 0.5, transparent: true } );

        return new Mesh( geometry, material );
    }

}

function stepParticleSystem(system,timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    updateParticleSystemParticles(system,timeElapsedS);
    updateParticleSystemGeometry(system);
}

/**
 * Post-process the scene
 * @param {Scroll3dEngine} instance - The instance object
 */
function doPostProcessing(instance) {

    instance.renderer.clear();
    instance.camera.layers.set(0);

    let rendered = false;

    if(!instance.vrSession) {
        if(instance.effectAnaglyph) {
            instance.effectAnaglyph.render(instance.scene, instance.camera);
            rendered = true;
        }
    
        if(!rendered && instance.postprocessor) {
            if(instance.postprocessor.composer) {
                instance.postprocessor.composer.render(0.1);
                rendered = true;
            }
        }
    }
        

    if(rendered) {
        if(instance.currentHudCanvas) {
            instance.renderer.clearDepth();
            instance.camera.layers.set(1);
            instance.renderer.render(instance.scene, instance.camera);
        }
        
    } else {
        instance.renderer.render(instance.scene, instance.camera);

        if(instance.currentHudCanvas) {
            instance.renderer.clearDepth();
            instance.camera.layers.set(1);
            instance.renderer.render(instance.scene, instance.camera);
        }
    }
        

    if(instance.waterPlane) {

        if(!globalClock) {
            globalClock = new Clock();
        }

        instance.waterPlane.material.uniforms.time.value += globalClock.getDelta();
    }

    instance.camera.layers.set(0);
}

function conductPan(instance, x, y) {
        
    const thetaRot = instance.theta / 2;

    let rotation = thetaRot * ONE_EIGHTY_π;

    if(rotation == 0) {
        rotation = 360 * ONE_EIGHTY_π;
    }
    
    const useRotation = rotation;

    const cos = Math.cos(useRotation);
    const sin = Math.sin(useRotation);

    const cX = (cos * x) + (sin * y);
    const cY = (cos * y) - (sin * x);

    instance.centerPosition.x += cX / 16;
    instance.centerPosition.y += cY / 16;

    setCameraPosition(instance);
}

function processSpecialParticleSystem(system,timeElapsed,instance) {

    if(!system.isSpecial) {
        return;
    }

    // handle snow system generation
    if(system.isSpecial == "snow") {

        if(!instance.isSnowing) {
            return;
        }

        let size = 0.20;

        let cSpline = new LinearSpline((t, a, b) => {
            const c = a.clone();
            return c.lerp(b, t);
        });
    
        cSpline.AddPoint(0.0, new Color("#ffffff"));

        let aSpline = new LinearSpline((t, a, b) => {
            return a + t * (b - a);
        });

        aSpline.AddPoint(1.0, 0.7);

        let addCount = randomIntFromInterval(0,20);
        let snowCenterPos = instance.vrCamHolder.position;

        addFlakes(system,size,cSpline,aSpline,snowCenterPos,addCount);

        addCount = randomIntFromInterval(0,20);
        snowCenterPos = instance.centerPosition;

        addFlakes(system,size,cSpline,aSpline,snowCenterPos,addCount);
    }
}

function handleInstanceGamepadScrolling(instance) {
    let zoomax = null;
    let rotax = null;

    let panAxX = 0;
    let panAxY = 0;

    if(instance.cameraMode == CAMERA_MODES.LOCKED) {
        instance.axisStates.leftX = 0;
        instance.axisStates.leftY = 0;
        instance.axisStates.rightX = 0;
        instance.axisStates.rightY = 0;
    }

    if(instance.rotationLock) {
        instance.axisStates.rightX = 0;
    }

    for(let axis in instance.axisStates) {

        let val = instance.axisStates[axis];

        if(val < AXIS_DEADZONE && val > -AXIS_DEADZONE) {
            val = 0;
        }

        if(axis == "leftX") {
            panAxX = val;
        }

        if(axis == "leftY") {
            panAxY = val;
        }

        if(axis == "rightX") {
            rotax = val;
        }

        if(axis == "rightY") {
            zoomax = val;
        }
    }

    if(!instance.vrSession && rotax) {
        instance.theta -= rotax * 4;

        if(instance.theta > 720) {
            instance.theta = instance.theta - 720;
        }

        if(instance.theta < 0) {
            instance.theta = 720 + instance.theta;
        }

        setCameraPosition(instance);
    }

    if(panAxX || panAxY) {
        conductPan(instance, panAxX * 5, panAxY * 5);

        let padClassic = true;

        if(instance.lastPadId && instance.lastPadId.indexOf("vr") == 0) {
            padClassic = false;
        }

        if(padClassic) {
            const x = instance.lastWidth / 2;
            const y = instance.lastHeight / 2;

            checkHoverHit(instance, x, y, {
                down: false
            }, "gamepad");
        }
    }

    if(zoomax) {
        doZoom(instance, zoomax);
    }
}

function setupVPPInstanceObject(instance, instOb) {
    if(!instance || !instOb) {
        return;
    }

    if(instOb.needsSetup) {

        instOb.needsSetup = false;

        instOb.box = new Box3().setFromObject(instOb.rawMesh);
        instOb.size = new Vector3();

        instOb.box.getSize(instOb.size);

        const geometry = instOb.rawMesh.geometry;
        const material = instOb.rawMesh.material;

        geometry.center();

        instOb.mesh = new InstancedMesh(geometry, material, DEF_INSTANCE_COUNT);

        //addObjToHittest(instance, instOb, 0);

        instOb.mesh.castShadow = true;
        instOb.mesh.receiveShadow = true;

        instance.scene.add(instOb.mesh);
    }

    if(!instOb.mesh) {
        instOb.needsSetup = true;
        return;
    }

    const newObs = [];
    const newItems = [];

    let hittable = false;

    for(let i = 0; i < instOb.items.length; i++) {
        const item = instOb.items[i];

        const ob = instance.objects[item];

        if(!item || !ob || ob.isDisposed) {
            continue;
        }

        if(!ob.notHittable) {
            hittable = true;
        }

        newItems.push(item);
        newObs.push(ob);
    }

    removeObjFromHittest(instance, instOb);

    if(hittable) {
        addObjToHittest(instance, instOb, 0);
    }

    instOb.items = newItems;

    instOb.mesh.count = newItems.length;

    const width = instOb.size.x / 2;
    const height = instOb.size.z / 2;
    const tall = instOb.size.y / 2;

    for(let i = 0; i < newObs.length; i++) {
        const obj = newObs[i];

        if(!obj) {
            continue;
        }

        let x = (obj.x * 2) + width;
        let y = (obj.y * 2) + height;

        
        if(obj.scale == 1 && obj.centerInTile) {
            x = Math.ceil(x);
            y = Math.ceil(y);
        }

        const z = (obj.z * 2) + tall;

        obj.object.position.set(x, z, y);

        if(obj.rot != undefined) {
            obj.object.rotation.set(0, MathUtils.degToRad(obj.rot), 0);
        }

        obj.object.updateMatrix();

        instOb.mesh.setMatrixAt(i, obj.object.matrix);
    }

    instOb.mesh.needsUpdate = true;

    if(instOb.mesh.instanceMatrix) {
        instOb.mesh.instanceMatrix.needsUpdate = true;
    }

    if(instOb.mesh.computeBoundingSphere) {
        instOb.mesh.computeBoundingSphere();
    }

    if(instOb.mesh.updateMatrix) {
        instOb.mesh.updateMatrix();
    }

    instOb.changed = false;
}

function getPointer(instance, id, x, y, type, button) {

    if(!instance) {
        return null;
    }

    if(instance.allPointers[id]) {
        return instance.allPointers[id];
    }

    if(!button) {
        button = -1;
    }

    instance.allPointers[id] = {
        x: x,
        y: y,
        theta: instance.theta,
        phi: instance.phi,
        lx: x,
        ly: y,
        primary: false,
        type: type,
        right: false,
        id: id,
        down: false,
        button: button
    };

    if(instance.pointersDown == 0) {
        instance.allPointers[id].primary = true;
        instance.primaryPointer = instance.allPointers[id];
    }

    return instance.allPointers[id];
}

function handlePinch(instance) {
    let pointer1,pointer2;

    for(let prop in instance.allPointers) {
        if(instance.allPointers[prop].down) {
            if(!pointer1) {
                pointer1 = instance.allPointers[prop];
            } else {
                if(!pointer2) {
                    pointer2 = instance.allPointers[prop];
                }
            }
        }
    }

    if(!pointer1 || !pointer2) {
        return;
    }

    const c = distBetweenPoints(pointer1.lx, pointer1.ly, pointer2.lx, pointer2.ly) / instance.effectiveScale;

    if(instance.lastPinchDistance == 0) {
        instance.lastPinchDistance = c;
        return;
    }

    if(c > instance.lastPinchDistance + 3) {
        doZoom(instance, -1);
    }

    if(c < instance.lastPinchDistance - 3) {
        doZoom(instance, 1);
    }

    instance.lastPinchDistance = c;
}

function checkHoverHit(instance, x, y, pointer, type) {


    const hitPosition = actualLocationToVirtual(instance, x, y);

    if(hitPosition) {
        instance.lastHoverReport.x = hitPosition.x;
        instance.lastHoverReport.y = hitPosition.y;
        instance.lastHoverReport.z = hitPosition.z;

        if(hitPosition.z < 0) {
            hitPosition.z = 0;
        }

        if(instance.hoverFunction) {
            instance.hoverFunction(
                buildInteractionResult(instance,pointer,hitPosition,x,y,type)
            );
        }
    }
}

function clearPointers(instance) {
    if(instance.pointersDown <= 0) {
        instance.pointersDown = 0;
        instance.allPointers = {};
        instance.primaryPointer = null;
        instance.lastPinchDistance = 0;
    }
}

function doZoom(instance, amount) {

    let radius = instance.radius;

    amount *= 4;

    radius += amount;

    if(radius < instance.minZoom) {
        radius = instance.minZoom;
    }

    if(radius > instance.maxZoom) {
        radius = instance.maxZoom;
    }

    instance.centerOnPosition({
        radius: radius
    });

    if(instance.onZoomed) {
        instance.onZoomed(radius);
    }
}

function updateParticleSystemParticles(system,timeElapsed) {
    for(let p of system.particles) {
        p.life -= timeElapsed;
    }

    const newParts = [];

    for(let i = 0; i < system.particles.length; i++) {
        const p = system.particles[i];

        if(p.life > 0) {
            newParts.push(p);
        } else {
            if(globalParticleRecycling.length < 2000) {
                globalParticleRecycling.push(p);
            }
        }
    }

    system.particles = newParts;

    for(let p of system.particles) {
        const t = 1.0 - p.life / p.maxLife;

        p.rotation += timeElapsed * 0.5;
        p.alpha = p.alpheSpline.Get(t);
        p.currentSize = p.size * system.sizeSpline.Get(t);
        p.colour.copy(p.colorSpline.Get(t));

        p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

        const drag = p.velocity.clone();

        drag.multiplyScalar(timeElapsed * 0.1);

        drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
        drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
        drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));

        p.velocity.sub(drag);
    }

    system.particles.sort((a,b) => {
        const d1 = system.params.camera.position.distanceTo(a.position);
        const d2 = system.params.camera.position.distanceTo(b.position);

        if (d1 > d2) {
            return 1;
        }
    
        if (d1 < d2) {
            return -1;
        }
    
        return 0;
    });
}

function updateParticleSystemGeometry(system) {
    if(!system) {
        return;
    }

    const positions = [];
    const sizes = [];
    const colours = [];
    const angles = [];

    for(let p of system.particles) {
        positions.push(p.position.x,p.position.y,p.position.z);
        colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
        sizes.push(p.currentSize);
        angles.push(p.rotation);
    }

    system.geometry.setAttribute(
        "position",
        new Float32BufferAttribute(positions,3)
    );

    system.geometry.setAttribute(
        "size", new Float32BufferAttribute(sizes, 1));

    system.geometry.setAttribute(
        "colour", new Float32BufferAttribute(colours, 4));

    system.geometry.setAttribute(
        "angle", new Float32BufferAttribute(angles, 1));


    system.geometry.attributes.position.needsUpdate = true;
    system.geometry.attributes.size.needsUpdate = true;
    system.geometry.attributes.colour.needsUpdate = true;
    system.geometry.attributes.angle.needsUpdate = true;
}

function addFlakes(system, size, cSpline, aSpline, snowCenterPos, addCount) {
    for(let i = 0; i < addCount; i++) {
        let ux = randomIntFromInterval((snowCenterPos.x * 2) - SNOW_RANGE,(snowCenterPos.x * 2) + SNOW_RANGE);
        let uy = randomIntFromInterval(0,(snowCenterPos.z * 2) + SNOW_RANGE);
        let uz = randomIntFromInterval((snowCenterPos.y * 2) - SNOW_RANGE,(snowCenterPos.y * 2) + SNOW_RANGE);

        const life = 50;

        system.particles.push(getNewParticle({
            position: new Vector3(ux,uy,uz),
            size: (Math.random() * 0.5 + 0.5) * size,
            colour: new Color("#ffffff"),
            colorSpline: cSpline,
            alpha: 0.99,
            alpheSpline: aSpline,
            life: life,
            maxLife: life,
            rotation: Math.random() * 2.0 * π,
            velocity: new Vector3(0, -3.5, 0)
        }));
    }
}

function calculateCurrentFPS(instance) {
    let fps = 0;

    for(let i = 0; i < instance.lastFPS.length; i++) {
        fps += instance.lastFPS[i];
    }

    fps /= instance.lastFPS.length;

    instance.curFPS = fps;

    if(isNaN(instance.curFPS)) {
        instance.curFPS = TARGET_FPS;
    }

    if(instance.lastFPS.length > 100) {
        instance.lastFPS.shift();
    }
}

export default {
    getInstance,
    getAllInstances,
    getOffset,
    forceResize,
    setTextureSize,
    setUseSimplifiedAtlas,
    DEF_PHI,
    DEF_THETA,
    DEF_RADIUS,
    CAMERA_MODES,
    Scroll3dEngine
};