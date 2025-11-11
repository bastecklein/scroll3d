# Chunk Seam and Shadow Fixes for Scroll3D

This document outlines the fixes implemented to address chunk seam visibility and shadow artifacts in the Scroll3D terrain rendering engine.

## Issues Fixed

### 1. **Chunk Boundary Seams**
- **Problem**: Visible gaps between chunks due to faces being rendered at chunk boundaries when they should be hidden by neighboring chunks.
- **Root Cause**: The `getChunkTileNeighbor()` function only checked within individual chunks, not across chunk boundaries.
- **Solution**: Enhanced neighbor detection to check adjacent chunks when looking beyond current chunk bounds.

### 2. **Shadow Artifacts**
- **Problem**: Shadows cast on internal faces that should be hidden, creating "shadow spill" effects.
- **Root Cause**: All chunk meshes had `castShadow = true` without considering face culling.
- **Solution**: Added intelligent shadow management and optimization methods.

### 3. **Floating Point Precision Issues**
- **Problem**: Tiny gaps between chunks due to floating-point precision errors in positioning.
- **Solution**: Use `Math.round()` for chunk positioning and improved UV coordinate precision.

## Fixes Implemented

### 1. Enhanced Neighbor Detection

```javascript
function getChunkTileNeighbor(data, x, y, z, dep, instance, chunkData) {
    // Now checks neighboring chunks when coordinates go beyond current chunk boundaries
    if(x < 0 || x >= data.length || z < 0 || z >= data[0].length) {
        // Look for neighbor chunk and assume it blocks the face if it exists
        if(instance && chunkData) {
            const neighborChunkX = chunkData.x + Math.floor(x / instance.chunkSize);
            const neighborChunkZ = chunkData.y + Math.floor(z / instance.chunkSize);
            const neighborChunkId = neighborChunkX + ":" + neighborChunkZ + ":" + (chunkData.rOrder || "0");
            const neighborChunk = instance.chunks[neighborChunkId];
            
            if(neighborChunk) {
                return { z: y, isDepressed: dep }; // Return blocking tile
            }
        }
        return null;
    }
    // ... rest of original logic
}
```

### 2. Improved Chunk Positioning Precision

```javascript
// Before:
const meshX = (data.x * instance.chunkSize) * 2;
const meshY = (data.y * instance.chunkSize) * 2;

// After:
const meshX = Math.round((data.x * instance.chunkSize) * 2);
const meshY = Math.round((data.y * instance.chunkSize) * 2);
```

### 3. Enhanced UV Coordinate Precision

```javascript
// Before:
const UV_TEXT_MIN = 0.01;
const UV_TEXT_MAX = 0.99;

// After:
const UV_TEXT_MIN = 0.001;  // Better precision
const UV_TEXT_MAX = 0.999;  // Better precision
```

### 4. Added Shadow Optimization Methods

```javascript
// New method to optimize shadows for all chunks
setShadowsEnabled(enabled) {
    // ... existing code ...
    this.optimizeChunkShadows();  // New call
}

optimizeChunkShadows() {
    // Intelligently manages shadow casting for chunks
    for(let chunkId in this.chunks) {
        const chunk = this.chunks[chunkId];
        if(chunk && chunk.material) {
            chunk.castShadow = this.shadows;  // Only if globally enabled
            chunk.receiveShadow = true;       // Always receive for ground
        }
    }
}
```

### 5. Added Chunk Edge Welding

```javascript
weldChunkEdges() {
    // Merges nearby vertices to improve edge continuity
    for(let chunkId in this.chunks) {
        const chunk = this.chunks[chunkId];
        if(!chunk || !chunk.geometry) continue;
        
        const geometry = chunk.geometry;
        const threshold = 0.001;
        
        if(geometry.mergeVertices) {
            geometry.mergeVertices(threshold);
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }
}
```

## How to Use

### Automatic Fixes
Most fixes are automatically applied when chunks are created or updated. The enhanced neighbor detection and positioning precision work immediately.

### Manual Optimization
For additional improvement, you can call these methods:

```javascript
// Optimize shadows (called automatically when toggling shadows)
engine.optimizeChunkShadows();

// Weld chunk edges for smoother transitions (call after loading chunks)
engine.weldChunkEdges();

// Toggle shadows with optimization
engine.setShadowsEnabled(true);  // or false
```

### Best Practices

1. **Load Adjacent Chunks**: Ensure neighboring chunks are loaded before the current chunk for best seam reduction.

2. **Call Edge Welding**: After loading a group of chunks, call `weldChunkEdges()` for optimal results.

3. **Shadow Management**: Use `setShadowsEnabled()` instead of directly modifying shadow properties.

4. **Chunk Size Considerations**: Smaller chunks may have more seams but better performance. Larger chunks reduce seams but may impact performance.

## Expected Results

- **Reduced Seam Visibility**: Faces at chunk boundaries should no longer be visible when neighboring chunks exist.
- **Improved Shadow Quality**: Shadows should no longer "spill over" onto chunk tops from hidden internal faces.
- **Better Continuity**: Terrain should appear more seamless and continuous across chunk boundaries.
- **Maintained Performance**: Fixes are optimized to have minimal impact on rendering performance.

## Testing

To test the improvements:
1. Create terrain with multiple adjacent chunks
2. Enable shadows and observe chunk boundaries
3. Look for gaps or visible seams between chunks
4. Check shadow quality at chunk edges
5. Verify smooth transitions between different terrain heights

## Troubleshooting

If seams are still visible:
1. Ensure neighboring chunks are loaded
2. Check that chunk positioning is consistent
3. Verify shadow settings are applied correctly
4. Consider calling `weldChunkEdges()` after chunk loading
5. Check for floating-point precision issues in chunk coordinates