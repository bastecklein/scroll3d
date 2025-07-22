// Test implementation to demonstrate canvas texture approach
import { CanvasTextureManager } from "./CanvasTextureManager.js";
import { BufferGeometry, BufferAttribute, Mesh, MeshLambertMaterial } from 'three';

export class CanvasChunkRenderer {
    constructor(chunkSize = 50, tileResolution = 64) {
        this.chunkSize = chunkSize;
        this.tileResolution = tileResolution;
        this.canvasTextureManager = new CanvasTextureManager(chunkSize, tileResolution);
    }

    async generateChunkMesh(chunkData, scene) {
        try {
            // Generate the geometry
            const geometry = this.generateChunkGeometry(chunkData);
            
            // Generate the canvas texture
            const canvasTexture = await this.canvasTextureManager.generateChunkTexture(chunkData);
            
            // Create material with the canvas texture
            const material = new MeshLambertMaterial({
                map: canvasTexture,
                transparent: false
            });

            // Create the mesh
            const mesh = new Mesh(geometry, material);
            
            // Position the mesh
            const meshX = (chunkData.x * this.chunkSize) * 2;
            const meshY = (chunkData.y * this.chunkSize) * 2;
            mesh.position.set(meshX, 0, meshY);
            mesh.receiveShadow = true;

            return mesh;
        } catch (error) {
            console.error('Failed to generate chunk mesh:', error);
            return null;
        }
    }

    generateChunkGeometry(chunkData) {
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        // Generate geometry for each tile in the chunk
        for(let x = 0; x < chunkData.data.length; x++) {
            for(let z = 0; z < chunkData.data.length; z++) {
                const tileData = chunkData.data[x][z];
                if (!tileData) continue;

                this.addTileGeometry(x, z, tileData, positions, normals, uvs, indices);
            }
        }

        const geometry = new BufferGeometry();
        
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
        geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
        geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
        geometry.setIndex(indices);

        geometry.scale(2, 2, 2);
        geometry.computeVertexNormals();

        return geometry;
    }

    addTileGeometry(x, z, tileData, positions, normals, uvs, indices) {
        const chunkSize = this.chunkSize;
        
        // Calculate UV coordinates based on tile position in chunk
        const uvX = x / chunkSize;
        const uvZ = z / chunkSize;
        const uvSize = 1 / chunkSize;

        const height = tileData.z || 0;
        const startIndex = positions.length / 3;

        // Top face vertices
        positions.push(x, height, z);
        positions.push(x + 1, height, z);
        positions.push(x + 1, height, z + 1);
        positions.push(x, height, z + 1);

        // Top face UVs - map to corresponding area in canvas texture
        uvs.push(uvX, uvZ);
        uvs.push(uvX + uvSize, uvZ);
        uvs.push(uvX + uvSize, uvZ + uvSize);
        uvs.push(uvX, uvZ + uvSize);

        // Top face normals
        normals.push(0, 1, 0);
        normals.push(0, 1, 0);
        normals.push(0, 1, 0);
        normals.push(0, 1, 0);

        // Top face indices
        indices.push(startIndex, startIndex + 1, startIndex + 2);
        indices.push(startIndex, startIndex + 2, startIndex + 3);

        // Add side faces if needed (similar pattern)
        if (height > 0) {
            this.addSideFaces(x, z, height, positions, normals, uvs, indices, uvX, uvZ, uvSize);
        }
    }

    addSideFaces(x, z, height, positions, normals, uvs, indices, uvX, uvZ, uvSize) {
        const startIndex = positions.length / 3;

        // Front face
        positions.push(x, 0, z + 1);
        positions.push(x + 1, 0, z + 1);
        positions.push(x + 1, height, z + 1);
        positions.push(x, height, z + 1);

        // Use the same UV area for sides (you could use different areas if desired)
        uvs.push(uvX, uvZ);
        uvs.push(uvX + uvSize, uvZ);
        uvs.push(uvX + uvSize, uvZ + uvSize);
        uvs.push(uvX, uvZ + uvSize);

        normals.push(0, 0, 1);
        normals.push(0, 0, 1);
        normals.push(0, 0, 1);
        normals.push(0, 0, 1);

        indices.push(startIndex, startIndex + 1, startIndex + 2);
        indices.push(startIndex, startIndex + 2, startIndex + 3);

        // Add other side faces similarly...
    }

    dispose() {
        if (this.canvasTextureManager) {
            this.canvasTextureManager.dispose();
            this.canvasTextureManager = null;
        }
    }
}
