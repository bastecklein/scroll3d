## Canvas Texture Implementation Guide

### Key Concept: UV Mapping Coordination

The critical insight for canvas texture mapping is that **each tile's position in the chunk must correspond exactly to its position in the canvas texture**.

### How It Works

1. **Canvas Layout**: Each tile occupies a specific area of the canvas
   ```
   Canvas (512x512 for 8x8 chunk):
   ┌─────┬─────┬─────┬─────┐
   │(0,0)│(1,0)│(2,0)│(3,0)│  <- Each cell is 64x64 pixels
   ├─────┼─────┼─────┼─────┤
   │(0,1)│(1,1)│(2,1)│(3,1)│
   ├─────┼─────┼─────┼─────┤
   │(0,2)│(1,2)│(2,2)│(3,2)│
   └─────┴─────┴─────┴─────┘
   ```

2. **UV Coordinates**: Geometry UVs map to canvas positions
   ```javascript
   // For tile at position (x, z) in chunk:
   const uvX = x / chunkSize;        // Left edge (0.0 to 1.0)
   const uvZ = z / chunkSize;        // Top edge (0.0 to 1.0)
   const uvSize = 1 / chunkSize;     // Size of each tile in UV space

   // UV coordinates for the tile's corners:
   uvs.push(uvX, uvZ);                    // Top-left
   uvs.push(uvX + uvSize, uvZ);           // Top-right
   uvs.push(uvX + uvSize, uvZ + uvSize);  // Bottom-right
   uvs.push(uvX, uvZ + uvSize);           // Bottom-left
   ```

3. **Canvas Drawing**: Tiles are drawn to exact pixel positions
   ```javascript
   // For tile at (x, z), draw to canvas at:
   const pixelX = x * tileSize;  // e.g., x=2, tileSize=64 → pixelX=128
   const pixelZ = z * tileSize;  // e.g., z=1, tileSize=64 → pixelZ=64
   
   // Draw texture to canvas area (pixelX, pixelZ) to (pixelX+64, pixelZ+64)
   ctx.drawImage(texture, pixelX, pixelZ, tileSize, tileSize);
   ```

### Usage Example

```javascript
// Enable canvas texture mode
const engine = new Scroll3dEngine(holder, {
    useCanvasTextures: true,  // Enable canvas mode
    // ... other options
});

// Or enable it later
engine.setCanvasTextureMode(true, 128); // true = enabled, 128 = tile resolution

// Create chunk data as usual
const chunkData = {
    x: 0,
    y: 0,
    defTexture: {
        top: "/path/to/grass.jpg",
        middle: "/path/to/dirt.jpg",
        noise: true,
        noiseSize: 10
    },
    data: [
        [
            { z: 0, top: "/path/to/grass.jpg" },    // Tile (0,0)
            { z: 1, top: "/path/to/stone.jpg" },    // Tile (0,1)
            // ... more tiles
        ],
        [
            { z: 0, top: "/path/to/water.jpg", isWater: true }, // Tile (1,0)
            { z: 2, top: "/path/to/rock.jpg" },     // Tile (1,1)
            // ... more tiles
        ]
        // ... more rows
    ]
};

// Add chunk - will use canvas textures if enabled
engine.addChunk(chunkData);
```

### Benefits

1. **Dynamic Textures**: Easy to add animated textures, lighting effects
2. **Higher Resolution**: Can use any texture resolution without atlas constraints
3. **Memory Efficient**: Only generates textures for visible chunks
4. **Flexible Effects**: Can add noise, roads, speckles, lighting in real-time
5. **Better Performance**: Modern browsers optimize canvas-to-texture operations

### Advanced Features

```javascript
// Add lighting effects
const tileData = {
    z: 1,
    top: "/path/to/texture.jpg",
    lighting: 0.8  // Brightness multiplier
};

// Add roads
const tileData = {
    z: 0,
    top: "/path/to/ground.jpg",
    roads: [
        { dir: "horizontal", color: "#333333", width: 4 }
    ]
};

// Add speckles/details
const tileData = {
    z: 0,
    top: "/path/to/base.jpg",
    speckles: [
        { x: 0.2, y: 0.3, size: 2, color: "#ffffff" },
        { x: 0.7, y: 0.8, size: 1, color: "#ffff00" }
    ]
};
```

### Performance Tips

1. **Tile Resolution**: Start with 64x64, adjust based on needs
2. **Chunk Size**: Smaller chunks = more textures but better culling
3. **Caching**: Identical chunks reuse the same generated texture
4. **LOD**: Use different resolutions based on camera distance

### Migration Path

1. Keep existing atlas system as default
2. Add `useCanvasTextures: true` option for testing
3. Gradually migrate chunks to canvas system
4. Eventually deprecate atlas system

The key is that the UV coordinates in your geometry must perfectly align with where you draw each tile's texture on the canvas!
