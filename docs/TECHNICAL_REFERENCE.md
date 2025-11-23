# SVG Layer Toolkit - Technical Reference

## API Documentation for Developers

This document provides technical details for extending and maintaining the SVG Layer Toolkit.

---

## 📐 Architecture

### Class Structure
```javascript
class SVGLayerToolkit {
    constructor() {
        // State management
        this.svgData = null;
        this.svgElement = null;
        this.paths = [];
        this.groups = [];
        this.selectedPaths = new Set();
        this.currentTool = 'preview';
        this.history = [];
        this.historyIndex = -1;
        // ... more properties
    }
}
```

### Data Flow
1. **Load:** SVG file → Parse → Extract paths/groups → Render
2. **Edit:** User action → Save state → Modify DOM → Extract → Render
3. **Save:** DOM → Serialize → Download

---

## 🔧 Core Methods

### File Operations

#### `loadSVGFile(event)`
Loads and parses an SVG file.
```javascript
async loadSVGFile(event) {
    const file = event.target.files[0];
    const text = await file.text();
    this.parseSVG(text);
}
```

#### `parseSVG(svgText)`
Parses SVG text into DOM structure.
```javascript
parseSVG(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    this.svgElement = doc.documentElement;
    this.extractPaths();
    this.extractGroups();
    this.renderSVG();
}
```

#### `saveSVG()`
Serializes and downloads SVG.
```javascript
saveSVG() {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(this.svgElement);
    // Create blob and download
}
```

---

### Path Management

#### `extractPaths()`
Extracts all path elements from SVG.
```javascript
extractPaths() {
    this.paths = [];
    const paths = this.svgElement.querySelectorAll('path');
    paths.forEach((pathEl, index) => {
        // Extract path data, attributes, etc.
    });
}
```

#### `extractGroups()`
Extracts all group elements.
```javascript
extractGroups() {
    this.groups = [];
    const groups = this.svgElement.querySelectorAll('g');
    // Build group structure
}
```

---

### Selection Management

#### `togglePathSelection(pathId)`
Toggles path selection.
```javascript
togglePathSelection(pathId) {
    if (this.selectedPaths.has(pathId)) {
        this.selectedPaths.delete(pathId);
    } else {
        this.selectedPaths.add(pathId);
    }
    this.updateSelectionVisual();
    this.switchTool('workflow');
}
```

#### `deselectAll()`
Clears all selections.
```javascript
deselectAll() {
    this.selectedPaths.clear();
    this.updateSelectionVisual();
}
```

---

### State Management

#### `saveState()`
Saves current state to history.
```javascript
saveState() {
    const state = {
        svgData: this.svgData,
        timestamp: Date.now()
    };
    // Add to history, limit to 100 states
}
```

#### `undo()` / `redo()`
Navigate history.
```javascript
undo() {
    if (this.historyIndex > 0) {
        this.historyIndex--;
        this.restoreState(this.history[this.historyIndex]);
    }
}
```

---

## 🎨 Workflow Manager API

### Main Render Function
```javascript
renderWorkflowTool() {
    // Builds complete workflow interface
    // Returns HTML string
}
```

### Edit Toggle
```javascript
toggleWorkflowEdit(section) {
    // section: 'name', 'group', 'attributes', 'transform', 'colors'
    // Toggles between display and edit modes
}
```

### Save Functions
```javascript
saveWorkflowName() {
    // Saves path name changes
}

saveWorkflowGroup() {
    // Saves group assignment
}

saveWorkflowAttributes() {
    // Saves attribute changes
}

saveWorkflowTransform() {
    // Saves transform changes
}

saveWorkflowColors() {
    // Saves color changes
}
```

### Render Helpers
```javascript
renderWorkflowAttributes(selectedPaths) {
    // Returns HTML for attributes editor
}

renderWorkflowTransform() {
    // Returns HTML for transform editor
}

renderWorkflowColors(selectedPaths) {
    // Returns HTML for color editor
}
```

---

## 🖼️ Image Tracer API

### Main Function
```javascript
async traceImage(event) {
    const file = event.target.files[0];
    // Read file, process image, convert to SVG
}
```

### Core Algorithm
```javascript
imageToSVG(img, threshold, simplify, preserveColor, smooth) {
    // 1. Draw image to canvas
    // 2. Convert to grayscale
    // 3. Apply threshold
    // 4. Trace contours
    // 5. Simplify paths
    // 6. Create SVG paths
}
```

### Contour Tracing
```javascript
traceContours(binary, width, height, simplify, colorData, smooth) {
    // Uses flood-fill algorithm
    // Returns array of path data objects
}
```

---

## 📏 Path Simplifier API

### Main Function
```javascript
simplifyPaths() {
    // Applies Douglas-Peucker algorithm
    // Removes redundant commands
    // Rounds coordinates
}
```

### Douglas-Peucker Algorithm
```javascript
douglasPeucker(points, epsilon) {
    // Recursive simplification
    // Returns simplified point array
}
```

### Helper Functions
```javascript
perpendicularDistance(point, lineStart, lineEnd) {
    // Calculates distance from point to line
}

simplifyPathData(pathData, tolerance) {
    // Parses path data, applies simplification
}
```

---

## 🎨 Color Replacer API

### Color Extraction
```javascript
extractAllColors() {
    // Scans all paths for fill/stroke colors
    // Returns unique color array
}
```

### Color Replacement
```javascript
replaceColor() {
    // Replaces color across all paths
}

replaceColorInSelection() {
    // Replaces color in selected paths only
}
```

### Color Picking
```javascript
// Right-click handler in attachPathListeners()
path.addEventListener('contextmenu', (e) => {
    // Picks color from path
    // Opens Workflow Manager Colors editor
});
```

---

## 🎬 Animator API

### Animation Application
```javascript
applyAnimation() {
    // Creates CSS keyframes
    // Applies animation to paths
}
```

### Animation Types
```javascript
const animations = {
    draw: { keyframes: '...', style: '...' },
    fade: { keyframes: '...', style: '...' },
    // ... 17 total animation types
};
```

---

## 🔄 Event Handlers

### Path Listeners
```javascript
attachPathListeners(svgClone) {
    paths.forEach(path => {
        // mouseenter - Hover effect
        // mouseleave - Remove hover
        // click - Select path
        // contextmenu - Right-click color picker
    });
}
```

### Pan and Zoom
```javascript
setupPanAndZoom() {
    // Middle-click pan
    // Spacebar pan
    // Zoom buttons
    // Fit to screen
}
```

---

## 📊 Utility Functions

### Common Value Extraction
```javascript
getCommonValue(paths, attribute) {
    // Returns common value if all paths have same
    // Returns null if different
}
```

### Path Validation
```javascript
// Path count validation in renderWorkflowTool()
const normalMax = 500;
const warningMax = 2000;
```

---

## 🎯 Tool System

### Tool Registration
```javascript
const toolMap = {
    'tool-name': { 
        title: 'Tool Title', 
        content: this.renderTool 
    }
};
```

### Tool Loading
```javascript
loadTool(toolName) {
    const tool = toolMap[toolName];
    title.textContent = tool.title;
    panel.innerHTML = tool.content.call(this);
}
```

### Adding New Tool
1. Add to `toolMap`
2. Create `renderToolName()` method
3. Add navigation button in HTML
4. Implement tool logic

---

## 🎨 Rendering System

### SVG Rendering
```javascript
renderSVG() {
    // Clones SVG element
    // Attaches event listeners
    // Updates preview
    // Schedules mini-map update
}
```

### Mini-map
```javascript
renderMiniMap() {
    // Clones only selected paths
    // Scales to fit mini-map
    // Uses requestAnimationFrame
}
```

### Selection Visual
```javascript
updateSelectionVisual() {
    // Applies visual effects to selected paths
    // Uses drop-shadow filter
}
```

---

## 🔍 Path Finding

### Find Path by ID
```javascript
const path = this.paths.find(p => p.id === pathId);
```

### Find Group for Path
```javascript
const group = this.groups.find(g => 
    g.paths.includes(this.paths.indexOf(path))
);
```

### Find Ungrouped Paths
```javascript
const ungrouped = this.paths.filter(path => {
    const inGroup = this.groups.some(g => 
        g.paths.includes(this.paths.indexOf(path))
    );
    return !inGroup && !path.parentGroup;
});
```

---

## 🛠️ DOM Manipulation

### Creating SVG Elements
```javascript
const svgNS = 'http://www.w3.org/2000/svg';
const newGroup = document.createElementNS(svgNS, 'g');
newGroup.id = 'group-name';
```

### Moving Elements
```javascript
// Move path to group
group.element.appendChild(path.element);

// Remove from group
svgElement.appendChild(path.element);
```

### Attribute Management
```javascript
// Set attribute
path.element.setAttribute('fill', '#ff0000');

// Remove attribute
path.element.removeAttribute('fill');

// Get attribute
const fill = path.element.getAttribute('fill');
```

---

## 📦 Data Structures

### Path Object
```javascript
{
    id: 'path-id',
    element: <SVGPathElement>,
    d: 'M 0 0 L 100 100',
    fill: '#000000',
    stroke: 'none',
    strokeWidth: '0',
    opacity: '1',
    transform: 'translate(10, 10)',
    parentGroup: 'group-id' || null
}
```

### Group Object
```javascript
{
    id: 'group-id',
    element: <SVGGroupElement>,
    paths: [0, 1, 2], // Array of path indices
    dataRegion: 'region-name' || null
}
```

### History State
```javascript
{
    svgData: '<svg>...</svg>',
    timestamp: 1234567890
}
```

---

## 🎨 CSS Variables

```css
:root {
    --primary-color: #4a90e2;
    --secondary-color: #50c878;
    --success-color: #50c878;
    --danger-color: #e74c3c;
    --warning-color: #f39c12;
    --bg-primary: #ffffff;
    --bg-secondary: #f5f7fa;
    --bg-tertiary: #e8ecf0;
    --text-primary: #2c3e50;
    --text-secondary: #7f8c8d;
    --border-color: #dfe6e9;
    --border-radius: 8px;
    --transition: all 0.3s ease;
}
```

---

## 🔐 State Management

### Saving State
Always call `saveState()` before:
- Modifying path data
- Changing attributes
- Moving elements
- Deleting elements

### State Restoration
```javascript
restoreState(state) {
    this.parseSVG(state.svgData);
    this.historyIndex = // appropriate index
}
```

---

## 🐛 Error Handling

### SVG Parsing
```javascript
parseSVG(svgText) {
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    if (svg.tagName !== 'svg') {
        alert('Invalid SVG file');
        return;
    }
}
```

### Path Validation
```javascript
if (!path || !path.element) return;
```

### Selection Validation
```javascript
if (this.selectedPaths.size === 0) {
    alert('Select paths first');
    return;
}
```

---

## ⚡ Performance

### Optimization Techniques
1. **Debouncing:** Mini-map rendering uses `requestAnimationFrame`
2. **State Checking:** Prevents saving identical states
3. **Lazy Rendering:** Only renders visible elements
4. **Path Limits:** Warnings for excessive paths

### Best Practices
- Save state before major operations
- Use `extractPaths()` after DOM changes
- Call `renderSVG()` after modifications
- Limit history to 100 states

---

## 🔄 Extension Points

### Adding New Tool
1. Create render method
2. Add to toolMap
3. Add navigation button
4. Implement save/load if needed

### Adding New Animation
1. Add to animations object
2. Define keyframes
3. Add to dropdown in renderAnimator

### Adding New Attribute
1. Add to path extraction
2. Add to attributes editor
3. Add to save function

---

## 📝 Code Style

### Naming Conventions
- Methods: `camelCase`
- Variables: `camelCase`
- CSS Classes: `kebab-case`
- IDs: `camelCase`

### File Organization
- Tools grouped by category
- Helper functions after main functions
- Utility functions at end

### Comments
- Tool explanations in render methods
- Complex algorithms documented
- TODO comments for future work

---

## 🧪 Testing

### Test Cases
1. Load various SVG files
2. Test with different path counts
3. Test all tool functions
4. Test undo/redo
5. Test edge cases (empty SVG, no paths, etc.)

### Debugging
- Check browser console
- Verify DOM structure
- Check state management
- Validate SVG output

---

**Technical Reference Version:** 1.0
**Last Updated:** November 2025

