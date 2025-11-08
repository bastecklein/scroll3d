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
// Create simple blue water
instance.setSimpleWater({
    deepColor: "#0066AA",
    shallowColor: "#4DD0E1",
    foamColor: "#FFFFFF"
});
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