import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";

// Exercise the actual chunk removal lifecycle without starting a WebGL renderer.
const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

function functionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, name);
    const end = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, end === -1 ? source.length : end);
}

const removeStart = source.indexOf("    removeChunk(x, y, rOrder, withDelay = 0) {");
const removeEnd = source.indexOf("\n    addOutlineTileGroupObject(", removeStart);
assert.notEqual(removeStart, -1, "removeChunk");
assert.notEqual(removeEnd, -1, "removeChunk end");

const lifecycle = runInNewContext([
    ...["removeObjectFromThree", "removeChunkObjectFromThree", "bumpChunkBuildGen"].map(functionSource),
    "function " + source.slice(removeStart, removeEnd).trim(),
    "({ removeChunk })"
].join("\n"), {
    chunkCanvases: {},
    removeFromArray(array, item) {
        const index = array.indexOf(item);

        if(index > -1) {
            array.splice(index, 1);
        }
    },
    removeObjFromHittest() {},
    setCameraPosition() {},
    setTimeout,
    clearTimeout
});

function counter() {
    const value = { count: 0 };

    value.dispose = function() {
        value.count++;
    };

    return value;
}

function engine() {
    const engine = {
        id: "test-instance",
        scene: { remove() {} },
        hitTestObjects: [],
        chunks: {},
        chunkBuildGens: {}
    };

    return engine;
}

function chunkMesh(ownedTextures) {
    const mesh = {
        userData: ownedTextures ? { ownedTextures } : {},
        material: counter(),
        geometry: counter()
    };

    return mesh;
}

const sleep = time => new Promise(resolve => setTimeout(resolve, time));

describe("canvas chunk texture lifecycle", () => {
    it("disposes the textures a canvas chunk owns when it is removed", () => {
        const instance = engine();
        const diffuse = counter();
        const bump = counter();
        const mesh = chunkMesh([diffuse, bump]);

        instance.chunks["2:3:0"] = mesh;
        instance.hitTestObjects.push(mesh);

        lifecycle.removeChunk.call(instance, 2, 3, "0");

        assert.equal(diffuse.count, 1);
        assert.equal(bump.count, 1);
        assert.equal(mesh.material.count, 1);
        assert.equal(mesh.geometry.count, 1);
        assert.equal(instance.chunks["2:3:0"], undefined);
        assert.equal(instance.hitTestObjects.length, 0);
        assert.equal(mesh.userData.ownedTextures, null);
    });

    it("disposes owned textures after the delayed removal path as well", async () => {
        const instance = engine();
        const diffuse = counter();
        const bump = counter();
        const mesh = chunkMesh([diffuse, bump]);

        instance.chunks["-1:4:0"] = mesh;
        instance.hitTestObjects.push(mesh);

        lifecycle.removeChunk.call(instance, -1, 4, "0", 1);

        assert.equal(diffuse.count, 0);
        assert.equal(bump.count, 0);

        await sleep(20);

        assert.equal(diffuse.count, 1);
        assert.equal(bump.count, 1);
    });

    it("does not dispose a texture the chunk does not own", () => {
        const instance = engine();
        const mesh = chunkMesh(null);
        const atlasTexture = counter();

        mesh.material.map = atlasTexture;

        instance.chunks["0:0:0"] = mesh;

        lifecycle.removeChunk.call(instance, 0, 0, "0");

        assert.equal(atlasTexture.count, 0);
        assert.equal(mesh.material.count, 1);
    });

    it("does not dispose the same chunk twice", () => {
        const instance = engine();
        const diffuse = counter();
        const mesh = chunkMesh([diffuse]);

        instance.chunks["0:0:0"] = mesh;

        lifecycle.removeChunk.call(instance, 0, 0, "0");
        lifecycle.removeChunk.call(instance, 0, 0, "0");

        assert.equal(diffuse.count, 1);
    });
});
