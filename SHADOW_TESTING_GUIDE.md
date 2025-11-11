# Chunk Shadow Testing Guide

Now you have several options to test and see the shadow behavior more clearly:

## 1. Check if the Optimization is Running

Look in your browser console when chunks are created. You should see messages like:
```
Starting shadow optimization for chunk with X vertices
Chunk shadow optimization: modified Y vertices out of X
```

If you don't see these messages, the optimization isn't running.

## 2. Test Complete Shadow Disabling (Most Visible)

To see a dramatic difference, try completely disabling chunk shadow receiving:

```javascript
// Disable all chunk shadow receiving (for testing)
engine.debugNoChunkShadows = true;

// Then create/reload chunks and you should see no shadows on chunks at all
```

This will make chunks not receive any shadows, so you can clearly see the difference.

## 3. Test Normal Modification (Subtle)

```javascript
// Enable normal modification (default)
engine.optimizeChunkShadows = true;
engine.debugNoChunkShadows = false;

// Reload chunks and look for reduced shadow artifacts on edges
```

## 4. Compare Before/After

```javascript
// Original behavior
engine.optimizeChunkShadows = false;
engine.debugNoChunkShadows = false;
// Load chunks, observe shadows

// Then switch to optimized
engine.optimizeChunkShadows = true;
// Reload same chunks, compare shadows
```

## 5. Visual Test Scenarios

**Best ways to see chunk shadow issues:**

1. **Create terrain with elevation differences** between adjacent chunks
2. **Place a tall object** (tree, building) near chunk boundaries
3. **Use strong directional lighting** (like sun at low angle)
4. **Look at chunk edges from the side** where shadows would be cast

## 6. Debug Output

The console will show:
- How many vertices were processed
- How many vertices were modified
- Whether chunks are receiving shadows or not

## Expected Results

- `debugNoChunkShadows = true`: No shadows on chunks at all (very visible)
- `optimizeChunkShadows = true`: Reduced shadow artifacts on chunk edges (subtle)
- Both `false`: Original behavior with potential shadow artifacts

Try the `debugNoChunkShadows = true` first to see a dramatic difference, then you can work backwards to find the right balance!