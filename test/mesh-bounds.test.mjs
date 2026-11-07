import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import { Box3, BoxGeometry, Group, Mesh, Vector3 } from "three";

const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

function functionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, name);
    const end = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, end === -1 ? source.length : end);
}

const { measureScaledMeshSize } = runInNewContext([
    functionSource("measureScaledMeshSize"),
    "({ measureScaledMeshSize })"
].join("\n"), { Box3, Vector3 });

// Emulates a bmloader model: baked child transforms (matrixAutoUpdate=false)
// whose world matrices were computed before finishInitMeshObject applied the
// object's scale.
function staleScaledModel(scale) {
    const root = new Group();
    const child = new Mesh(new BoxGeometry(2, 4, 2));

    child.matrixAutoUpdate = false;
    child.updateMatrix();
    root.add(child);
    root.updateMatrixWorld(true);

    root.scale.setScalar(scale);

    return root;
}

function boxSize(mesh) {
    const size = new Vector3();
    new Box3().setFromObject(mesh).getSize(size);
    return size;
}

describe("shadow culling bounds", () => {
    it("measures a bm hierarchy after the new root scale is applied", () => {
        const scale = 0.425;
        const model = staleScaledModel(scale);

        // A plain Box3 sees the child's stale world matrix, which is the bug.
        assert.deepEqual(boxSize(model).toArray(), [2, 4, 2]);

        const measured = measureScaledMeshSize(model);

        assert.ok(Math.abs(measured.x - (2 * scale)) < 1e-9);
        assert.ok(Math.abs(measured.y - (4 * scale)) < 1e-9);
        assert.ok(Math.abs(measured.z - (2 * scale)) < 1e-9);
    });

    it("keeps a torso part above the 12% shadow threshold", () => {
        const scale = 0.425;
        const model = staleScaledModel(scale);
        const torsoPartRadius = 0.625;

        // Measure the stale box before measureScaledMeshSize repairs the matrices.
        const inflatedRadius = boxSize(model).length() / 2 / scale;
        const localRadius = measureScaledMeshSize(model).length() / 2 / scale;

        assert.ok(torsoPartRadius >= localRadius * 0.12);
        assert.ok(torsoPartRadius < inflatedRadius * 0.12);
    });
});
