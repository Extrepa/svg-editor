# SVG Layer Toolkit

**Photoshop for SVGs** - A comprehensive suite of 25+ professional tools for complete SVG manipulation, editing, and creation.

## 🎨 Overview

SVG Layer Toolkit is designed as the **Photoshop equivalent for SVG files** - providing specialized tools for every aspect of SVG manipulation. Each tool operates independently but works seamlessly together, giving you complete control over SVG editing.

## 🚀 Features

### 25+ Professional Tools

#### Core Workflow (3)
1. **Preview** - Visual preview with customizable backgrounds, drag-to-move toggle
2. **Workflow Manager** - Unified path/group management with inline editing
3. **Shape Library** - Interactive shape creation (click to place, drag to size)

#### Editing Tools (10)
4. **Color Replacer** - Auto-detect and batch replace colors
5. **Transform** - Move, scale, rotate paths with sliders
6. **Attributes** - Direct attribute editing with gradient editor
7. **Path Merger** - Merge multiple paths into one
8. **Node Editor** - Point manipulation with snapping and symmetry
9. **Text to Path** - Convert text elements to editable paths
10. **Path Offset** - Expand strokes to filled shapes
11. **Boolean Ops** - Union, subtract, intersect operations
12. **Alignment Tools** - Align and distribute paths

#### Advanced Tools (8)
13. **Image Tracer** - Convert PNG/JPG to SVG paths
14. **Animator** - GSAP-powered path animations
15. **Optimizer** - Clean and reduce file size
16. **Path Simplifier** - Simplify paths with Douglas-Peucker
17. **Token Injector** - Apply design tokens from JSON
18. **Comparator** - Compare two SVG files
19. **Generators** - Radial repeat, bar charts, QR codes

#### Precision & Cleanup (2)
20. **Cleanup Tools** - Remove invisible objects, stray points
21. **Measurement Tools** - Interactive ruler and path statistics

#### Export & System (4)
22. **Export Manager** - Multiple export formats (PNG, JSX, Base64, etc.)
23. **Templates** - Quick-start templates
24. **File Patch** - Update existing files
25. **History & Undo** - Full undo/redo (100 states)

## 📦 Installation

No installation required! Just open `index.html` in a modern web browser.

### Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server needed - works entirely client-side

## 🎯 Usage

### Getting Started

1. Open `index.html` in your browser
2. Click **"Load SVG"** to upload an SVG file
3. Navigate tools using the left sidebar
4. Use tools to edit your SVG
5. Click **"Save SVG"** to download your edited file

### Keyboard Shortcuts

**Editing:**
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z` - Redo
- `Ctrl/Cmd + C` - Copy selected paths
- `Ctrl/Cmd + V` - Paste paths
- `Ctrl/Cmd + D` - Duplicate selected paths
- `Ctrl/Cmd + A` - Select all paths
- `Delete` or `Backspace` - Delete selected paths
- `Escape` - Deselect all / Cancel shape placement mode
- `Arrow Keys` - Nudge selected objects (with grid snapping if enabled)

**Tool Switching:**
- `V` - Switch to Workflow Manager (Selection tool)
- `P` - Switch to Node Editor

### Mouse Interactions

- **Click and Drag** - Move selected paths (when drag-to-move is enabled in Preview tool)
- **Click** - Select paths (or multi-select with Shift/Ctrl/Cmd)
- **Click and Drag (empty space)** - Marquee selection to select multiple paths
- **Right-click path** - Pick color from path
- **Middle-click + Drag** - Pan preview
- **Spacebar + Drag** - Pan preview
- **Shift + Resize Handle** - Maintain aspect ratio while resizing

## 🛠️ Tool Guide

### Shape Library
- Click any shape button to enter placement mode
- Click on the canvas where you want the shape
- Drag to size the shape before placing
- Press ESC to cancel placement mode
- Real-time preview shows the shape while dragging

### Workflow Manager
- **Selection Controls**: Select All, Deselect All, Invert Selection, Select Similar buttons
- **Unified Editor**: Edit fill, stroke, transform, and opacity for selected paths in one place
- **Quick Actions**: Duplicate, Delete, and group management
- **Visual Feedback**: Selected paths show with highlight effects and resize handles
- **Path Information**: View and edit path names, groups, and attributes

### Path Inspector
- View all paths in your SVG
- Click "Edit" to modify path data directly
- See path attributes and properties

### Color Replacer
- Automatically detects all colors
- Click a color swatch to select it
- Replace all instances or select paths by color

### Preview & Background
- **Grid Snapping**: Toggle grid snapping on/off, configure grid size (default 10px), show visual grid overlay
- **Drag-to-Move**: Enable/disable click-and-drag to move selected paths
- **Position Indicator**: Status bar showing X/Y coordinates during drag operations with grid snapping indicator
- **Resize Handles**: Visual handles appear around selected objects for easy resizing (8 handles: corners and edges)
- **Quick Actions Toolbar**: Floating toolbar with Copy, Duplicate, Delete, and alignment buttons (appears near selected objects)
- **Marquee Selection**: Click and drag on empty space to select multiple paths
- **Shift+Resize**: Hold Shift while dragging resize handles to maintain aspect ratio

### Transform Controller
- Select paths first
- Enter translate, scale, or rotate values
- Apply transformations to selected paths
- **Tip**: You can also drag selected paths directly in the preview to move them quickly

### Path Animator
- Set animation duration and delay
- Enable looping for continuous animations
- Creates CSS-based path drawing effects

### SVG Optimizer
- Remove hidden elements
- Round coordinates for smaller files
- Remove default attributes
- See size reduction statistics

### Export Manager
- Export full SVG
- Export only selected paths
- Export token map as JSON
- Copy path data to clipboard

## 📁 Project Structure

```
svg_paths copy/
├── index.html          # Main HTML structure
├── styles.css          # All styling
├── app.js              # Complete application (all 25+ tools)
├── README.md           # This file
└── *.svg               # Example SVG files
```

## 🎨 How It Works

### Architecture

- **Single Page Application** - All tools in one interface
- **Shared State Management** - All tools work with the same SVG data
- **Non-Destructive Editing** - Full history system with undo/redo
- **Real-time Preview** - See changes immediately

### Data Flow

1. SVG file is parsed into DOM structure
2. Paths and groups are extracted and indexed
3. Tools manipulate the DOM structure
4. Changes are rendered in real-time
5. History system tracks all changes

## 🔧 Technical Details

### Technologies

- **Vanilla JavaScript** - No frameworks, pure JS
- **DOM API** - Direct SVG manipulation
- **CSS3** - Modern styling with CSS variables
- **HTML5** - Semantic markup

### Browser APIs Used

- `DOMParser` - Parse SVG XML
- `XMLSerializer` - Serialize SVG back to string
- `FileReader` - Read uploaded files
- `Clipboard API` - Copy to clipboard
- `Blob API` - Create downloadable files

## 💡 Use Cases

### Icon Design
1. Use Path Inspector to edit icon paths
2. Use Transform Controller to align elements
3. Use Color Replacer for brand colors
4. Use Optimizer to reduce file size
5. Export individual icons

### Character Design
1. Use Groups & Regions to organize body parts
2. Use Path Editor to refine shapes
3. Use Color Replacer for color variants
4. Use Path Merger to combine related shapes

### Animation
1. Use Path Inspector to prepare paths
2. Use Path Animator to add drawing effects
3. Preview animations in real-time
4. Export animated SVG

### Design Systems
1. Use Token Injector to apply design tokens
2. Use Color Replacer to standardize colors
3. Use Optimizer for production-ready files
4. Export token maps

## 🎓 Learning Path

### Beginner
- Start with Preview tool
- Try Color Replacer for simple changes
- Use Selection System to understand paths
- Export your work

### Intermediate
- Learn Path Inspector for direct editing
- Master Transform Controller
- Use Groups & Regions for organization
- Explore Path Animator

### Advanced
- Combine multiple tools in workflows
- Use Attribute Editor for custom modifications
- Master Optimizer for production
- Use Token Injector for design systems

## 🐛 Known Limitations

- Large SVGs (>10MB) may be slow
- Complex transforms may need manual adjustment
- Some SVG features (filters) are preserved but not editable. Gradients are fully editable with the enhanced gradient editor.
- History limited to 100 states

## 🔮 Future Enhancements

- Enhanced gradient editor with multiple stops (already implemented)
- Filter effects editor
- Layer system with visibility controls
- Batch processing multiple files
- Plugin system for custom tools

## 📝 License

This project is provided as-is for educational and professional use.

## 🤝 Contributing

This is a complete toolkit. Feel free to extend it with additional tools or improvements!

## 📧 Support

For issues or questions, please check the code comments in `app.js` - each tool is well-documented.

---

**SVG Layer Toolkit** - Every tool. Every capability. Every possibility. All in one comprehensive suite for professional SVG manipulation.

*This is your Photoshop for SVGs.*

