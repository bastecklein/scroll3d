# Shadow Seam Solutions for Scroll3D Terrain

## Problem Confirmed
- `debugNoChunkShadowCasting = true` eliminates seams but removes important terrain shadows
- Need shadows for visual quality but without chunk boundary artifacts

## Alternative Solutions to Try

### 1. **Shadow Map Resolution & Bias Adjustment**
```javascript
// In shadow setup, try:
this.directionalLight.shadow.mapSize.width = 4096;  // Higher resolution
this.directionalLight.shadow.mapSize.height = 4096;
this.directionalLight.shadow.bias = -0.001;         // Reduce self-shadowing
this.directionalLight.shadow.normalBias = 0.02;     // Smooth normal-based bias
```

### 2. **Selective Shadow Casting (Best Option)**
Only disable shadow casting for chunk side faces, keep it for tops:
```javascript
// In chunk creation, create separate meshes for tops vs sides
// Or use material sidedness to control shadow behavior
```

### 3. **Shadow Camera Positioning**
```javascript
// Adjust shadow camera to reduce boundary effects
this.directionalLight.shadow.camera.near = 0.1;
this.directionalLight.shadow.camera.far = 1000;
this.directionalLight.shadow.camera.left = -500;
this.directionalLight.shadow.camera.right = 500;
this.directionalLight.shadow.camera.top = 500;
this.directionalLight.shadow.camera.bottom = -500;
```

### 4. **Chunk Geometry Overlap**
Make chunks slightly overlap at edges to eliminate gaps that cause seams.

### 5. **Custom Shadow Shader**
Replace Three.js shadow system with custom terrain-aware shadow mapping.

## Recommended Next Steps
1. Try shadow map resolution increase first (easiest)
2. Implement selective side-face shadow casting
3. Test chunk edge overlap approach