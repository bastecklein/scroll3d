import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";

// Exercise the particle-system teardown without starting a WebGL renderer.
const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

function functionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, name);
    const end = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, end === -1 ? source.length : end);
}

const clearStart = source.indexOf("    clearAllObjects() {");
const clearEnd = source.indexOf("\n    outlineObjects(", clearStart);
assert.notEqual(clearStart, -1, "clearAllObjects");
assert.notEqual(clearEnd, -1, "clearAllObjects end");

const lifecycle = runInNewContext([
    ...["removeObjectFromThree", "clearAllParticleSystems"].map(functionSource),
    "function " + source.slice(clearStart, clearEnd).trim(),
    "({ clearAllObjects, clearAllParticleSystems })"
].join("\n"), {
    removeObjFromHittest() {},
    disposeBMInstanceBatches() {},
    clearOrientationViewer() {}
});

function counter() {
    const value = { count: 0 };

    value.dispose = function() {
        value.count++;
    };

    return value;
}

function scene() {
    const removed = [];

    return {
        removed,
        remove(object) {
            removed.push(object);
        }
    };
}

function particleSystem() {
    const texture = counter();
    const points = {
        material: counter(),
        geometry: counter()
    };

    return {
        texture,
        points,
        system: {
            points,
            particles: [{}, {}],
            uniforms: {
                diffuseTexture: { value: texture }
            }
        }
    };
}

function engine() {
    return {
        scene: scene(),
        objects: {},
        activeUpdateObjects: new Set(),
        chunks: {},
        lineMaterials: new Map(),
        liquidMaterials: new Map(),
        vppInstances: {},
        vppModelCache: null,
        particleSystems: {}
    };
}

describe("particle system lifecycle", () => {
    it("releases the particle texture and points when systems are cleared", () => {
        const instance = engine();
        const first = particleSystem();
        const second = particleSystem();

        instance.particleSystems.fire = first.system;
        instance.particleSystems.snow = second.system;

        lifecycle.clearAllParticleSystems(instance);

        assert.equal(first.texture.count, 1);
        assert.equal(second.texture.count, 1);
        assert.equal(first.points.material.count, 1);
        assert.equal(second.points.material.count, 1);
        assert.equal(first.points.geometry.count, 1);
        assert.equal(second.points.geometry.count, 1);
        assert.deepEqual(instance.scene.removed, [first.points, second.points]);
        assert.equal(Object.keys(instance.particleSystems).length, 0);
        assert.equal(first.system.uniforms, null);
        assert.equal(first.system.points, null);
    });

    it("does not double-dispose when cleared twice", () => {
        const instance = engine();
        const particle = particleSystem();

        instance.particleSystems.fire = particle.system;

        lifecycle.clearAllParticleSystems(instance);
        lifecycle.clearAllParticleSystems(instance);

        assert.equal(particle.texture.count, 1);
        assert.equal(particle.points.material.count, 1);
        assert.equal(particle.points.geometry.count, 1);
    });

    it("routes scene clearing through the particle teardown", () => {
        const instance = engine();
        const particle = particleSystem();

        instance.particleSystems.fire = particle.system;

        lifecycle.clearAllObjects.call(instance);

        assert.equal(particle.texture.count, 1);
        assert.equal(particle.points.material.count, 1);
        assert.equal(particle.points.geometry.count, 1);
        assert.deepEqual(instance.scene.removed, [particle.points]);
        assert.equal(Object.keys(instance.particleSystems).length, 0);
    });
});
