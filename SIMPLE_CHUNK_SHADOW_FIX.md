# Simple Chunk Shadow Fix for Scroll3D

This is a minimal, targeted fix to prevent shadows from appearing on chunk side edges while maintaining proper shadow receiving on top faces.

## What It Does

- **Top faces**: Continue to receive shadows normally (for realistic ground shadows)
- **Side faces at chunk edges**: Reduce shadow receiving to minimize visible shadow artifacts between chunks
- **Performance**: Minimal impact, only processes vertices at chunk creation time

## How It Works

The fix modifies the surface normals of side faces at chunk boundaries to make them less receptive to shadows while keeping top faces fully shadow-receptive.

## Usage

### Default Behavior
By default, the optimization is **enabled**. Chunks will automatically have optimized shadow receiving.

### Manual Control
```javascript
// Create engine with shadow optimization enabled (default)
const engine = new Scroll3dEngine({
    shadows: true,
    optimizeChunkShadows: true  // Default: true
});

// Or disable if you want original behavior
const engine = new Scroll3dEngine({
    shadows: true,
    optimizeChunkShadows: false
});
```

### Toggle at Runtime
```javascript
// Enable/disable the optimization
engine.optimizeChunkShadows = true;  // Enable
engine.optimizeChunkShadows = false; // Disable

// Note: Changes only affect newly created chunks
// Existing chunks retain their current shadow behavior
```

## Technical Details

### What Gets Modified
- Only vertices on **side faces** (horizontal normals) at **chunk edges**
- Normals are adjusted to point more upward, reducing horizontal shadow reception
- Top faces (vertical normals) remain unchanged

### Edge Detection
The system identifies chunk edges by checking vertex positions:
- Vertices at X coordinates: 0, chunkSize*2 (absolute edges)  
- Vertices at Z coordinates: 0, chunkSize*2 (absolute edges)

### Normal Modification
For side faces at edges:
```javascript
// Original normal: (nx, ny, nz) where ny ≈ 0 for horizontal faces
// Modified normal: (nx*0.3, max(ny, 0.7), nz*0.3)
// Result: More upward-pointing, less shadow-receptive from sides
```

## Expected Results

- **Reduced shadow artifacts** on chunk boundaries
- **Maintained realistic shadows** on terrain tops
- **Seamless appearance** between adjacent chunks
- **No performance impact** during rendering

## Testing

1. Create terrain with multiple adjacent chunks
2. Enable shadows: `engine.setShadowsEnabled(true)`
3. Observe chunk boundaries - side faces should have minimal shadow artifacts
4. Verify top faces still receive shadows properly

## Troubleshooting

**If shadows still appear on chunk edges:**
- Ensure `optimizeChunkShadows` is set to `true`
- Check that chunks are being created after enabling the option
- Verify shadow casting objects aren't too close to chunk edges

**If top faces don't receive enough shadows:**
- The optimization only affects side faces at edges
- Top faces should be unchanged - check shadow casting setup

**To disable completely:**
```javascript
engine.optimizeChunkShadows = false;
// Then reload/recreate affected chunks
```

## Comparison with Complex Fixes

This approach is much simpler than:
- Cross-chunk neighbor detection
- Geometry welding  
- Material modifications
- Face culling systems

It provides a good balance of simplicity and effectiveness for the common case of shadow artifacts on chunk boundaries.