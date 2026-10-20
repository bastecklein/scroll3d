import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import {
    BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial,
    Object3D, Scene, Shape, Vector2, Vector3
} from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

// Exercise the actual lifecycle with real Three objects, without starting a WebGL renderer.
const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
function functionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, name);
    const end = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, end === -1 ? source.length : end);
}
const clearStart = source.indexOf("    clearAllObjects() {");
const clearEnd = source.indexOf("\n    outlineObjects(", clearStart);
const lifecycle = runInNewContext([
    ...["initLineObject", "getLineMaterial", "buildLineSegmentsGeometry",
        "removeObjectFromThree"].map(functionSource),
    "function " + source.slice(clearStart, clearEnd).trim(),
    "({ initLineObject, removeObjectFromThree, clearAllObjects })"
].join("\n"), {
    BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial,
    Object3D, Shape, Vector2, LineMaterial, LineSegments2, LineSegmentsGeometry,
    removeObjFromHittest() {},
    disposeBMInstanceBatches() {},
    clearOrientationViewer() {}
});

function instance() {
    return {
        scene: new Scene(),
        lineMaterials: new Map(),
        lastWidth: 800, lastHeight: 600,
        objects: {}, activeUpdateObjects: new Set(), chunks: {}
    };
}

function line(engine, options = {}) {
    const object = {
        instance: engine,
        object: new Object3D(),
        color: "#50a0ff", width: 2, dashed: true, outline: "#101020",
        rawZ: 1, fillRef: 0.2, rawTiles: [{ x: 1, y: 2 }],
        points: [new Vector3(2, 2, 4), new Vector3(4, 2, 4)],
        ...options
    };
    lifecycle.initLineObject(object);
    engine.scene.add(object.object);
    engine.objects[Object.keys(engine.objects).length] = object;
    return object;
}

function remove(engine, object) {
    lifecycle.removeObjectFromThree(engine, object.object, true);
    lifecycle.removeObjectFromThree(engine, object.mesh, true);
}

describe("line material ownership", () => {
    it("reuses the line, outline and fill through 100 preview rebuilds", () => {
        const engine = instance();
        const first = line(engine);
        const materials = first.object.children.map(child => child.material);
        let disposed = 0;
        for(const material of materials) {
            material.addEventListener("dispose", () => disposed++);
        }
        remove(engine, first);
        for(let i = 0; i < 100; i++) {
            const next = line(engine);
            assert.deepEqual(next.object.children.map(child => child.material), materials);
            remove(engine, next);
        }
        assert.equal(disposed, 0);
        assert.equal(engine.lineMaterials.size, 3);
        assert.equal(engine.scene.children.length, 0);
    });

    it("releases removed line and fill geometry while retaining materials", () => {
        const engine = instance();
        const object = line(engine);
        const geometries = new Set(object.object.children.map(child => child.geometry));
        const released = new Set();
        for(const geometry of geometries) {
            geometry.addEventListener("dispose", () => released.add(geometry));
        }
        remove(engine, object);
        assert.deepEqual(released, geometries);
    });

    it("keeps style variants distinct, including fill opacity and outline role", () => {
        const engine = instance();
        const first = line(engine);
        const variants = [
            { color: "#ff0000" }, { width: 4 }, { dashed: false }, { outline: null }
        ];
        for(const options of variants) {
            assert.notEqual(line(engine, options).mesh.material, first.mesh.material);
        }
        const otherFill = line(engine, { fillRef: 0.4 });
        assert.notEqual(otherFill.object.children[2].material, first.object.children[2].material);
        assert.equal(otherFill.mesh.material, first.mesh.material);
        assert.equal(first.object.children[2].material.depthWrite, false);
        assert.equal(first.object.children[2].material.side, DoubleSide);
        assert.equal(first.object.children[2].renderOrder, 2);
    });

    it("does not share resolution or disposal across engine instances", () => {
        const a = instance();
        const b = instance();
        b.lastWidth = 320;
        b.lastHeight = 240;
        const first = line(a);
        const second = line(b);
        assert.notEqual(first.mesh.material, second.mesh.material);
        assert.equal(first.mesh.material.resolution.x, 800);
        assert.equal(second.mesh.material.resolution.x, 320);
        let disposed = 0;
        second.mesh.material.addEventListener("dispose", () => disposed++);
        lifecycle.clearAllObjects.call(a);
        assert.equal(disposed, 0);
        assert.equal(b.lineMaterials.size, 3);
    });

    it("refreshes cached line resolution when drawing at a new buffer size", () => {
        const engine = instance();
        const first = line(engine);
        engine.lastWidth = 1200;
        engine.lastHeight = 900;
        const next = line(engine);
        assert.equal(next.mesh.material, first.mesh.material);
        for(const material of [next.mesh.material, next.outlineMesh.material]) {
            assert.equal(material.resolution.x, 1200);
            assert.equal(material.resolution.y, 900);
        }
    });

    it("disposes every cached material once on clear and can draw again", () => {
        const engine = instance();
        const first = line(engine);
        let disposed = 0;
        for(const material of engine.lineMaterials.values()) {
            material.addEventListener("dispose", () => disposed++);
        }
        lifecycle.clearAllObjects.call(engine);
        assert.equal(disposed, 3);
        assert.equal(engine.lineMaterials.size, 0);
        assert.equal(engine.scene.children.length, 0);
        lifecycle.clearAllObjects.call(engine);
        assert.equal(disposed, 3);
        assert.notEqual(line(engine).mesh.material, first.mesh.material);
    });
});
