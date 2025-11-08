# Simple Water System

A new stylized water shader system that works with both orthographic and perspective cameras, inspired by the water effects in Link's Awakening and Civilization 6.

## Features

- **Camera Agnostic**: Works perfectly with both orthographic and perspective cameras
- **No Texture Dependencies**: Pure shader-based water with no external texture requirements
- **Animated Waves**: Real-time wave animation with configurable speed and scale
- **Stylized Colors**: Customizable deep/shallow/foam colors for artistic control
- **Performance Friendly**: Lightweight shader that doesn't require complex reflections
- **Edge Effects**: Automatic foam and transparency effects at water edges

## Usage

### Basic Usage

```javascript
# Enhanced Water System Documentation

The Enhanced Water system provides realistic water effects with optional texture support that work with both orthographic and perspective cameras. It combines the flexibility of stylized water with the realism of textured water effects.

## Basic Usage

### Stylized Water (No Texture)
```javascript
// Create stylized water without texture
engine.setSimpleWater({
    deepColor: "#0066AA",
    shallowColor: "#4DD0E1",
    foamColor: "#FFFFFF",
    waveSpeed: 1.0,
    waveScale: 2.0,
    opacity: 0.85,
    position: { x: 0, y: 0, z: 0.6 }
});
```

### Realistic Water (With Texture)
```javascript
// Create realistic water with texture
engine.setSimpleWater({
    deepColor: "#003366",
    shallowColor: "#0099CC", 
    foamColor: "#FFFFFF",
    texture: "path/to/water_normal_map.jpg",
    waveSpeed: 1.2,
    waveScale: 1.5,
    textureScale: 10.0,
    reflectionStrength: 0.8,
    refractionStrength: 0.4,
    opacity: 0.9,
    segments: 128,  // Higher geometry detail for texture effects
    position: { x: 0, y: 0, z: 0.6 }
});
```

### Using Existing Texture from Old Water System
```javascript
// Reuse texture from setWaterTexture() call
engine.setWaterTexture("path/to/dudv_map.jpg");
engine.setSimpleWater({
    deepColor: "#002244",
    shallowColor: "#0077BB",
    foamColor: "#FFFFFF", 
    waveSpeed: 1.0,
    waveScale: 2.0,
    reflectionStrength: 0.7,
    opacity: 0.85
    // texture will be automatically used from setWaterTexture
});
```

## Style Presets

### Link's Awakening Style (Stylized)
```javascript
engine.setSimpleWater({
    deepColor: "#2E4F8C",
    shallowColor: "#6BB6FF", 
    foamColor: "#FFFFFF",
    waveSpeed: 0.8,
    waveScale: 3.0,
    opacity: 0.9,
    position: { x: 0, y: 0, z: 0.6 }
});
```

### Civilization 6 Style (Semi-Realistic)
```javascript
engine.setSimpleWater({
    deepColor: "#1B365D",
    shallowColor: "#4A90A4",
    foamColor: "#E8F4F8",
    waveSpeed: 0.6,
    waveScale: 2.5,
    reflectionStrength: 0.4,
    opacity: 0.85,
    position: { x: 0, y: 0, z: 0.6 }
});
```

### Realistic Ocean Style (With Texture)
```javascript
engine.setSimpleWater({
    deepColor: "#001133",
    shallowColor: "#003366", 
    foamColor: "#FFFFFF",
    texture: "water_dudv.jpg",
    textureScale: 15.0,
    waveSpeed: 1.0,
    waveScale: 1.2,
    reflectionStrength: 0.9,
    refractionStrength: 0.5,
    opacity: 0.92,
    segments: 128,
    position: { x: 0, y: 0, z: 0.6 }
});
```

### Tropical/Caribbean Style  
```javascript
engine.setSimpleWater({
    deepColor: "#004B87", 
    shallowColor: "#00B4D8",
    foamColor: "#FFFFFF",
    texture: "water_tropical.jpg",
    textureScale: 8.0,
    waveSpeed: 1.2,
    waveScale: 2.0,
    reflectionStrength: 0.6,
    opacity: 0.8,
    position: { x: 0, y: 0, z: 0.6 }
});
```

## Configuration Options

### Basic Properties
- `deepColor` - Color for deep water areas (default: "#0066AA")
- `shallowColor` - Color for shallow water areas (default: "#4DD0E1")
- `foamColor` - Color for foam/wave crests (default: "#FFFFFF")
- `opacity` - Water transparency (default: 0.85)
- `size` - Water plane size (default: 64)
- `segments` - Geometry detail level (default: 64, use 128+ for textured water)
- `position` - Water position {x, y, z} (default: {x: 0, y: 0, z: 0.6})

### Wave Properties  
- `waveSpeed` - Animation speed multiplier (default: 1.0)
- `waveScale` - Wave size/frequency (default: 2.0) 
- `normalScale` - Normal map intensity (default: 1.0)

### Texture Properties
- `texture` - Texture URL, texture object, or null for no texture
- `textureScale` - Texture tiling scale (default: 8.0)
- `reflectionStrength` - Reflection effect intensity (default: 0.6)
- `refractionStrength` - Refraction effect intensity (default: 0.3)

## Real-time Updates

You can update all water properties without recreating the water:

```javascript
// Change visual properties
engine.updateSimpleWater({
    deepColor: "#FF6B6B",
    waveSpeed: 2.0,
    reflectionStrength: 0.9
});

// Add or change texture dynamically
engine.updateSimpleWater({
    texture: "new_water_texture.jpg",
    textureScale: 12.0
});

// Remove texture (switch to stylized mode)
engine.updateSimpleWater({
    texture: null
});
```

## Texture Guidelines

### Recommended Texture Types
1. **Dudv Maps** - For displacement/distortion effects (best results)
2. **Normal Maps** - For surface detail and lighting
3. **Noise Textures** - For procedural wave patterns
4. **Combined Maps** - RGB channels with different data

### Texture Tips
- Use tileable textures for seamless repetition
- Higher contrast = more pronounced effects
- Adjust `textureScale` to control tiling frequency  
- Use `normalScale` to control texture intensity

## Camera Compatibility

Works flawlessly with both camera types:

- **Perspective Camera**: Full realistic effects with proper fresnel, depth-based colors
- **Orthographic Camera**: Maintains visual consistency and performance  

## Migration from Refractor Water

To migrate from the old `setWater()` method:

```javascript
// Old way
engine.setWater("#03A9F4", 0.6);

// New way (stylized)
engine.setSimpleWater({
    deepColor: "#0066AA",
    shallowColor: "#03A9F4", 
    position: {z: 0.6}
});

// New way (with existing texture)
engine.setSimpleWater({
    deepColor: "#0066AA",
    shallowColor: "#03A9F4",
    reflectionStrength: 0.7,
    position: {z: 0.6}
    // Will automatically use texture from setWaterTexture() if available
});
```

## Performance Notes

- Uses efficient shader-based rendering with vertex displacement
- Procedural noise generation when no texture is provided
- Texture mode adds realistic surface details and lighting
- Optimized for both desktop and mobile devices
- Compatible with all post-processing effects
- Higher `segments` value improves wave quality but reduces performance
```

### Advanced Configuration

```javascript
// Fully customized water
instance.setSimpleWater({
    deepColor: "#1565C0",        // Deep water color
    shallowColor: "#81D4FA",     // Shallow water color  
    foamColor: "#E8F5E8",        // Foam/wave crest color
    waveSpeed: 1.5,              // Animation speed
    waveScale: 3.0,              // Wave pattern size
    opacity: 0.9,                // Water transparency
    size: 128,                   // Water plane size
    position: {                  // Water position
        x: 0,
        y: 0, 
        z: 0.5
    }
});
```

### Updating Water Properties

```javascript
// Update colors and animation without recreating water
instance.updateSimpleWater({
    deepColor: "#2E7D32",
    waveSpeed: 0.8,
    opacity: 0.7
});
```

### Preset Styles

**Link's Awakening Style:**
```javascript
instance.setSimpleWater({
    deepColor: "#1976D2",
    shallowColor: "#64B5F6", 
    foamColor: "#FFFFFF",
    waveSpeed: 0.8,
    waveScale: 2.5,
    opacity: 0.85
});
```

**Civilization 6 Style:**
```javascript
instance.setSimpleWater({
    deepColor: "#0D47A1",
    shallowColor: "#42A5F5",
    foamColor: "#E3F2FD", 
    waveSpeed: 1.2,
    waveScale: 1.8,
    opacity: 0.8
});
```

**Tropical Style:**
```javascript
instance.setSimpleWater({
    deepColor: "#00695C",
    shallowColor: "#4DB6AC",
    foamColor: "#E0F2F1",
    waveSpeed: 0.6,
    waveScale: 3.5,
    opacity: 0.75
});
```

## Compatibility

- ✅ Orthographic Camera
- ✅ Perspective Camera  
- ✅ VR Mode
- ✅ Post-processing Effects
- ✅ Mobile Devices

## Migration from Refractor Water

The new simple water system can be used alongside the existing `setWater()` method. To switch from refractor-based water to simple water:

```javascript
// Old way (refractor-based)
instance.setWater("#4DD0E1", 0.6);

// New way (simple shader-based)  
instance.setSimpleWater({
    deepColor: "#0066AA",
    shallowColor: "#4DD0E1", 
    position: { z: 0.6 }
});
```

## Performance Notes

- The simple water system is more performant than refractor-based water
- No reflection rendering passes required
- Works well on mobile devices
- Scales with render resolution automatically