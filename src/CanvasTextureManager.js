import { CanvasTexture, RepeatWrapping } from 'three';

export class CanvasTextureManager {
    constructor(chunkSize = 50, tileSize = 64) {
        this.chunkSize = chunkSize;
        this.tileSize = tileSize;
        this.canvasSize = chunkSize * tileSize;
        this.textureCache = new Map();
        this.canvas = null;
        this.ctx = null;
        this.imageCache = new Map();
        
        this.initCanvas();
    }

    initCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasSize;
        this.canvas.height = this.canvasSize;
        this.ctx = this.canvas.getContext('2d');
        
        // Enable image smoothing for better quality
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    async loadImage(src) {
        if (this.imageCache.has(src)) {
            return this.imageCache.get(src);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.imageCache.set(src, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    async generateChunkTexture(chunkData) {
        const cacheKey = this.generateCacheKey(chunkData);
        
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey);
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

        // Draw each tile
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const tileData = chunkData.data[x][z];
                if (!tileData) continue;

                await this.drawTile(x, z, tileData, chunkData.defTexture);
            }
        }

        // Create Three.js texture from canvas
        const texture = new CanvasTexture(this.canvas);
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.flipY = false; // Important for proper orientation
        
        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    async drawTile(x, z, tileData, defTexture) {
        const pixelX = x * this.tileSize;
        const pixelZ = z * this.tileSize;

        // Determine which texture to use for this tile
        let textureToUse = defTexture.middle; // default
        
        if (tileData.top) {
            textureToUse = tileData.top;
        } else if (tileData.middle) {
            textureToUse = tileData.middle;
        }

        // Draw base texture
        if (textureToUse) {
            await this.drawTextureToCanvas(textureToUse, pixelX, pixelZ);
        }

        // Handle water tiles
        if (tileData.isWater && tileData.top) {
            await this.drawTextureToCanvas(tileData.top, pixelX, pixelZ, 0.7);
        }

        // Add lighting effects if specified
        if (tileData.lighting !== undefined) {
            this.applyLighting(pixelX, pixelZ, tileData);
        }

        // Add noise/variation if enabled
        if (defTexture.noise) {
            this.applyNoise(pixelX, pixelZ, defTexture.noiseSize || 10);
        }

        // Handle special effects
        if (tileData.speckles) {
            this.applySpeckles(pixelX, pixelZ, tileData.speckles);
        }

        if (tileData.roads) {
            this.applyRoads(pixelX, pixelZ, tileData.roads);
        }
    }

    async drawTextureToCanvas(textureSrc, x, y, opacity = 1.0) {
        try {
            const img = await this.loadImage(textureSrc);
            
            if (opacity < 1.0) {
                this.ctx.globalAlpha = opacity;
            }
            
            this.ctx.drawImage(img, x, y, this.tileSize, this.tileSize);
            
            if (opacity < 1.0) {
                this.ctx.globalAlpha = 1.0;
            }
        } catch (error) {
            console.warn('Failed to load texture:', textureSrc, error);
            // Draw fallback color
            this.ctx.fillStyle = '#808080';
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }
    }

    applyLighting(x, y, tileData) {
        if (!tileData.lighting) return;

        // Create gradient for lighting
        const gradient = this.ctx.createRadialGradient(
            x + this.tileSize / 2, y + this.tileSize / 2, 0,
            x + this.tileSize / 2, y + this.tileSize / 2, this.tileSize
        );
        
        gradient.addColorStop(0, `rgba(255, 255, 255, ${tileData.lighting * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
    }

    applyNoise(x, y, intensity) {
        const imageData = this.ctx.getImageData(x, y, this.tileSize, this.tileSize);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }

        this.ctx.putImageData(imageData, x, y);
    }

    applySpeckles(x, y, speckles) {
        if (!speckles || !Array.isArray(speckles)) return;

        for (const speckle of speckles) {
            this.ctx.fillStyle = speckle.color || '#ffffff';
            const speckleX = x + (speckle.x || 0) * this.tileSize;
            const speckleY = y + (speckle.y || 0) * this.tileSize;
            const size = (speckle.size || 1) * 2;
            
            this.ctx.fillRect(speckleX, speckleY, size, size);
        }
    }

    applyRoads(x, y, roads) {
        if (!roads || !Array.isArray(roads)) return;

        for (const road of roads) {
            this.ctx.strokeStyle = road.color || '#666666';
            this.ctx.lineWidth = road.width || 2;
            
            this.ctx.beginPath();
            if (road.dir === 'horizontal') {
                this.ctx.moveTo(x, y + this.tileSize / 2);
                this.ctx.lineTo(x + this.tileSize, y + this.tileSize / 2);
            } else if (road.dir === 'vertical') {
                this.ctx.moveTo(x + this.tileSize / 2, y);
                this.ctx.lineTo(x + this.tileSize / 2, y + this.tileSize);
            }
            // Add more road directions as needed
            this.ctx.stroke();
        }
    }

    generateCacheKey(chunkData) {
        // Generate a hash-like key based on chunk data
        const key = `${chunkData.x}_${chunkData.y}_${chunkData.rOrder || '0'}`;
        return key;
    }

    clearCache() {
        this.textureCache.clear();
        this.imageCache.clear();
    }

    dispose() {
        this.clearCache();
        this.canvas = null;
        this.ctx = null;
    }
}
