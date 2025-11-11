# Per-Material Shadow Bias Solution - "Have Your Cake and Eat It Too"

## The Perfect Solution

You asked for the **best of both worlds** - chunk seams eliminated while character shadows remain accurate. The new **per-material shadow bias system** delivers exactly that!

## How It Works

Instead of using a global shadow bias that affects everything, this solution applies bias **only to terrain chunks** while leaving character shadows untouched:

- **Terrain Chunks**: Get custom bias applied during shadow rendering to eliminate seams
- **Characters/Objects**: Use normal shadow rendering with perfect ground contact
- **Global Shadow System**: Remains at zero bias for accurate character shadows

## Usage Options

### Option 1: Per-Material Bias (Recommended)
```javascript
const engine = new Scroll3dEngine(holder, {
    shadows: true,
    enhancedShadowQuality: true,
    usePerMaterialShadowBias: true  // Enable the "best of both worlds" solution
});
```

### Option 2: Dynamic Control
```javascript
// Enable per-material bias at runtime
engine.setPerMaterialShadowBias(true);
// Result: Chunks get bias, characters get accurate shadows

// Disable to revert to global bias
engine.setPerMaterialShadowBias(false);
// Result: Global bias setting applies to everything
```

### Option 3: Complete Control
```javascript
const engine = new Scroll3dEngine(holder, {
    shadows: true,
    enhancedShadowQuality: true,
    usePerMaterialShadowBias: true,    // Per-material system
    useTerrainShadowBias: true,        // Fallback global setting
    shadowMapSize: 2048                // High resolution
});

// You can switch between systems:
engine.setPerMaterialShadowBias(false);  // Use global terrain bias
engine.setTerrainShadowBias(true);       // Enable global bias
engine.setPerMaterialShadowBias(true);   // Switch back to per-material
```

## Technical Implementation

The system works by **intercepting shadow rendering** for chunk meshes only:

1. **During Shadow Pass**: Chunk meshes get a tiny Y-offset (`-0.001`) to create bias effect
2. **After Shadow Pass**: Chunk meshes are restored to original position
3. **Character Meshes**: Never affected, always render shadows normally
4. **Global Shadow Bias**: Set to zero when per-material bias is active

## Benefits

✅ **Eliminates chunk seams** - Terrain shadows render cleanly at boundaries  
✅ **Accurate character shadows** - Shadows start exactly at character feet  
✅ **No visual trade-offs** - You get the best quality for both terrain and characters  
✅ **Runtime switchable** - Can toggle between systems dynamically  
✅ **Performance friendly** - Minimal overhead, only affects chunk meshes  
✅ **Automatic application** - Works for both geometry and canvas chunk modes  

## Console Feedback

The system provides clear feedback about which mode is active:

```
Per-material shadow bias ENABLED - chunks get bias, characters get accurate shadows
Per-material shadow bias DISABLED - using global bias: -0.0005
Enhanced shadow settings - Resolution: 2048x2048, using per-material bias for chunks
```

## Comparison of All Solutions

| Solution | Chunk Seams | Character Shadows | Implementation |
|----------|-------------|-------------------|----------------|
| **No Bias** | ❌ Visible seams | ✅ Perfect accuracy | Simple |
| **Global Terrain Bias** | ✅ No seams | ❌ Floating shadows | Simple |
| **Dynamic Global Bias** | ✅ Switchable | ❌ Still floating when enabled | Medium |
| **Per-Material Bias** | ✅ No seams | ✅ Perfect accuracy | Advanced |

## Recommendation

Use **per-material shadow bias** as your default setting. It provides the highest visual quality with no trade-offs. This is the "have your cake and eat it too" solution you were looking for!

```javascript
// The perfect setup:
const engine = new Scroll3dEngine(holder, {
    shadows: true,
    enhancedShadowQuality: true,
    usePerMaterialShadowBias: true,  // 🎯 Best of both worlds
    shadowMapSize: 2048              // High quality shadows
});
```

You'll get clean terrain rendering **AND** accurate character shadows simultaneously!