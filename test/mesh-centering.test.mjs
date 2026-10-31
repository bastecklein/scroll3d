import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import { Object3D } from "three";

const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

function functionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, name);
    const end = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, end === -1 ? source.length : end);
}

const { normalizeObjectPosition } = runInNewContext([
    functionSource("normalizeObjectPosition"),
    "({ normalizeObjectPosition })"
].join("\n"), {
    MathUtils: { degToRad: degrees => degrees * Math.PI / 180 }
});

function makeObject(overrides = {}) {
    return {
        type: "mesh",
        subType: "vpp",
        isSymmetrical: true,
        x: 5,
        y: 6,
        z: 2,
        width: 1,
        height: 1,
        rawTallness: 0.875,
        rawCenterY: 0.4375,
        object: new Object3D(),
        mesh: new Object3D(),
        ...overrides
    };
}

describe("standalone VPP vertical centering", () => {
    it("puts a bottom-anchored symmetrical VPP mesh base on obj.z", () => {
        const obj = makeObject();

        normalizeObjectPosition(obj);

        assert.equal(obj.object.position.y, 4.4375);
        assert.equal(obj.mesh.position.y, -0.4375);
        assert.equal(obj.object.position.y + obj.mesh.position.y, obj.z * 2);
    });

    it("accounts for models whose lowest voxel is above zero", () => {
        const minY = 0.05;
        const height = 0.5;
        const obj = makeObject({
            rawTallness: height,
            rawCenterY: minY + (height / 2)
        });

        normalizeObjectPosition(obj);

        // object.y + mesh.y is the mesh origin; the geometry still adds minY.
        assert.equal(obj.object.position.y + obj.mesh.position.y + minY, obj.z * 2);
    });

    it("leaves non-VPP symmetrical mesh origins unchanged", () => {
        const obj = makeObject({ subType: "bm", rawCenterY: 0.9 });

        normalizeObjectPosition(obj);

        assert.equal(obj.mesh.position.y, 0);
    });

    it("does not override the centered mesh on the non-symmetrical path", () => {
        const obj = makeObject({ isSymmetrical: false });
        obj.mesh.position.y = -0.123;

        normalizeObjectPosition(obj);

        assert.equal(obj.mesh.position.y, -0.123);
    });
});
