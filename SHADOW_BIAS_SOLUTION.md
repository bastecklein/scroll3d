# Dynamic Shadow Bias Solution for Scroll3D

## The Problem Explained

The `shadow.bias` property in Three.js controls shadow depth offset to prevent **shadow acne** (z-fighting between surfaces and their shadows).

### What Different Bias Values Do:

- **Negative bias** (e.g., `-0.0005`): Pushes shadows **away** from surfaces
- **Zero bias**: No offset - shadows appear exactly where they should geometrically
- **Positive bias**: Pulls shadows **closer** to surfaces (rarely used)

### The Terrain vs Character Shadow Conflict:

**Terrain Chunks** (chunk seams):
- Need **negative bias** to prevent self-shadowing artifacts at chunk boundaries
- Chunk edges can create shadow acne without bias adjustment
- `-0.0005` effectively eliminates seam shadows

**Characters/Objects** (ground contact):
- Need **zero bias** for accurate shadow placement
- Negative bias makes shadows appear "floating" above feet
- Creates illusion that characters aren't touching the ground

## New Dynamic Solution

Instead of a global bias setting, the engine now supports **context-sensitive bias**:

```javascript
// Initialize engine with dynamic bias control
const engine = new Scroll3dEngine(holder, {
    shadows: true,
    enhancedShadowQuality: true,
    useTerrainShadowBias: true  // Default: optimized for terrain rendering
});

// Switch to character-accurate shadows when needed
engine.setTerrainShadowBias(false);  // Characters have accurate ground contact

// Switch back to terrain mode for chunk rendering
engine.setTerrainShadowBias(true);   // Eliminates chunk seams
```

## Usage Scenarios

### Scenario 1: Terrain-Heavy Scenes
```javascript
engine.setTerrainShadowBias(true);
// - Chunk seams eliminated
// - Character shadows may appear slightly floating
// - Best for exploration/terrain-focused gameplay
```

### Scenario 2: Character-Focused Scenes  
```javascript
engine.setTerrainShadowBias(false);
// - Character shadows accurate at feet
// - Chunk seams may be visible
// - Best for character interactions/closeups
```

### Scenario 3: Dynamic Switching
```javascript
// Switch based on camera distance or focus
if (cameraFocusedOnCharacter) {
    engine.setTerrainShadowBias(false);  // Accurate character shadows
} else {
    engine.setTerrainShadowBias(true);   // Clean terrain rendering
}
```

## Technical Implementation

The system works by:

1. **Constructor Option**: `useTerrainShadowBias` controls default mode
2. **Dynamic Method**: `setTerrainShadowBias()` allows runtime switching
3. **Automatic Update**: Changes bias immediately when directional light exists
4. **Console Feedback**: Logs bias changes for debugging

## Alternative Approaches

If dynamic switching doesn't meet your needs, consider:

1. **Separate Shadow Layers**: Different shadow maps for terrain vs objects
2. **Custom Shadow Shaders**: Per-material bias control
3. **Shadow Map Resolution**: Higher resolution can reduce need for bias
4. **Normal Bias Only**: Use `normalBias` instead of `bias` for gentler correction

## Recommended Settings

**For Most Use Cases:**
```javascript
shadowMapSize: 2048,           // High resolution
useTerrainShadowBias: true,    // Start with terrain optimization
enhancedShadowQuality: true    // Enable all enhancements
```

**For Character-Heavy Games:**
```javascript
useTerrainShadowBias: false,   // Prioritize character accuracy
shadowMapSize: 4096            // Higher resolution to compensate
```

This solution gives you the flexibility to choose between chunk seam elimination and character shadow accuracy based on your current gameplay context.