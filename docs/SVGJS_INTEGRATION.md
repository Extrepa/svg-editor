# SVG.js Integration Guide

## Overview

SVG.js has been added to the project to provide enhanced SVG manipulation capabilities. The library is loaded via CDN and available globally as `SVG`.

## Current Status

✅ **Library Added:** SVG.js v3.2.0 is loaded from CDN  
⚠️ **Integration:** Currently using native DOM APIs - SVG.js available for future enhancements

## SVG.js Benefits

### What SVG.js Provides:
- **Cleaner API:** More intuitive syntax than native DOM
- **Better Path Manipulation:** Easier path data handling
- **Transform Helpers:** Simplified transform operations
- **Animation Support:** Built-in animation capabilities
- **Group Management:** Better group/element organization

### What SVG.js Does NOT Provide:
- ❌ **Boolean Operations:** Still need `paper.js` or `clipper-lib` for Subtract/Intersect
- ❌ **Complex Path Math:** Advanced geometric operations require specialized libraries

## Usage Examples

### Creating Elements (SVG.js vs Native)

**Native DOM (Current):**
```javascript
const svgNS = 'http://www.w3.org/2000/svg';
const rect = document.createElementNS(svgNS, 'rect');
rect.setAttribute('x', 10);
rect.setAttribute('y', 10);
rect.setAttribute('width', 100);
rect.setAttribute('height', 100);
svg.appendChild(rect);
```

**SVG.js (Alternative):**
```javascript
const draw = SVG(svgElement); // Wrap existing SVG
const rect = draw.rect(100, 100).move(10, 10).fill('#f06');
```

### Path Manipulation

**Native DOM (Current):**
```javascript
path.element.setAttribute('d', newPathData);
```

**SVG.js (Alternative):**
```javascript
const path = SVG(pathElement);
path.plot(newPathData);
path.fill('#f06').stroke('#000');
```

### Transforms

**Native DOM (Current):**
```javascript
path.element.setAttribute('transform', 'translate(10, 10) rotate(45)');
```

**SVG.js (Alternative):**
```javascript
const path = SVG(pathElement);
path.transform({ translate: [10, 10], rotate: 45 });
```

## Integration Strategy

### Option 1: Hybrid Approach (Recommended)
- Keep native DOM for existing code
- Use SVG.js for new features
- Gradually migrate complex operations

### Option 2: Full Migration
- Refactor all DOM manipulation to SVG.js
- More consistent API
- Requires significant code changes

### Option 3: Feature-Specific
- Use SVG.js only for specific features:
  - Path creation/editing
  - Transform operations
  - Animation system
  - Group management

## Recommended Next Steps

1. **Path Creation Tools:** Use SVG.js for Shape Library and Text-to-Path
2. **Transform Operations:** Migrate transform tool to SVG.js API
3. **Animation System:** Leverage SVG.js animation capabilities
4. **Group Management:** Use SVG.js for better group handling

## Example: Migrating Shape Library

**Current (Native DOM):**
```javascript
const svgNS = 'http://www.w3.org/2000/svg';
const rect = document.createElementNS(svgNS, 'rect');
rect.setAttribute('x', x);
rect.setAttribute('y', y);
rect.setAttribute('width', width);
rect.setAttribute('height', height);
this.svgElement.appendChild(rect);
```

**With SVG.js:**
```javascript
const draw = SVG(this.svgElement);
const rect = draw.rect(width, height).move(x, y).fill('#000');
rect.id(`shape-${Date.now()}`);
```

## Boolean Operations Note

SVG.js does **not** include boolean operations. For production-quality Subtract/Intersect operations, consider:

1. **paper.js** - Full vector graphics library with boolean ops
2. **clipper-lib** - Specialized boolean operations library
3. **Current Implementation** - Basic even-odd fill rule (works for simple cases)

## Resources

- **SVG.js Docs:** https://svgjs.dev/docs/3.0/
- **SVG.js GitHub:** https://github.com/svgdotjs/svg.js
- **Examples:** https://svgjs.dev/docs/3.0/getting-started/

## Current Implementation

The toolkit currently uses native DOM APIs for:
- ✅ Path creation and manipulation
- ✅ Group management
- ✅ Attribute editing
- ✅ Transform operations

SVG.js is available for:
- 🔄 Future enhancements
- 🔄 New features
- 🔄 Code simplification opportunities

---

**Status:** Library loaded and ready for integration  
**Next:** Decide on integration strategy (hybrid vs full migration)

