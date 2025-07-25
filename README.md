# scroll3d

## for npm

```json
"dependencies": {
    "scroll3d": "git+ssh://git@github.com:bastecklein/scroll3d.git#main"
}
```

## Usage

```javascript
// node
import scroll3d from "scroll3d";

// browser
import scroll3d from "./scroll3d.js";

const engine = scroll3d.getInstance({
    holder: document.getElementById("scrollHolder");
});

```

## Rounded Corners Feature

The `addChunk` function now supports an optional `roundedCorners` parameter to create smoother, less boxy chunk geometry.

### Basic Usage

```javascript
// Generate chunk with sharp corners (default)
engine.addChunk(chunkData);

// Generate chunk with rounded corners
const roundedCorners = {
    enabled: true,
    radius: 0.15,    // Corner rounding radius (0.0 - 0.5)
    segments: 4      // Number of segments for corner smoothing
};

engine.addChunk(chunkData, roundedCorners);
```

### Parameters

- **enabled** (boolean): Whether to enable rounded corners. Default: `false`
- **radius** (number): Controls how much the corners are rounded. Range: 0.0 to 0.5. Default: `0.15`
- **segments** (number): Number of segments used for corner smoothing. Higher values create smoother curves but increase geometry complexity. Default: `4`

### Example

```javascript
// Create a chunk with custom rounded corners
const chunkData = {
    x: 0,
    y: 0,
    data: myChunkData,
    defTexture: {
        top: "#4CAF50",
        middle: "#666666",
        noise: false
    }
};

const roundedCorners = {
    enabled: true,
    radius: 0.25,
    segments: 6
};

engine.addChunk(chunkData, roundedCorners);
```

This feature helps create more organic-looking terrain and structures by reducing the harsh, blocky appearance of traditional voxel geometry.

Functions to be documented when I have a bit more time!