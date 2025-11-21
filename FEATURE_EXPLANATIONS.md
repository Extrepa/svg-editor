# SVG Layer Toolkit - Feature Explanations

> **Note:** This guide is descriptive/aspirational. For the truthful implementation status, see `FEATURE_STATUS.md`. For a quick feature reference, see `FEATURE_NOTES.md`.

## 📖 Complete Guide to All Features

This document provides detailed explanations of every feature in the SVG Layer Toolkit, including how they work, when to use them, and best practices.

---

## 🎨 Background System

### Overview
The background system allows you to customize how your SVG is displayed in the preview area. This helps with visibility, especially when working with transparent or light-colored SVGs.

### Location
**Preview Tool** → Right Sidebar → Background Style section

### Background Modes

#### 1. None
- **What it does:** Shows a completely transparent background
- **When to use:** When you want to see the underlying page color or when exporting with transparency
- **Visual:** No background pattern or color

#### 2. Color
- **What it does:** Displays a solid color background
- **When to use:** When you need a specific background color for preview or testing
- **How to use:**
  1. Select "Color" mode
  2. Use the color picker to choose your color
  3. Color is saved automatically
- **Visual:** Solid color fills the preview area

#### 3. Grid
- **What it does:** Overlays a grid pattern on the background
- **When to use:** For alignment, measuring, or when you need visual reference lines
- **How it works:**
  - Light mode: Dark gray grid lines on light background
  - Dark mode: Light gray grid lines on dark background
  - Grid size: 20px × 20px squares
- **Visual:** Grid pattern visible in both themes

#### 4. Checkerboard
- **What it does:** Shows a black and white checkerboard pattern
- **When to use:** Standard way to show transparency in graphics software
- **How it works:**
  - Always black (#000000) and white (#ffffff)
  - Works identically in light and dark mode
  - 20px × 20px squares
- **Visual:** Classic transparency checkerboard

### Important Notes
- **Mutually Exclusive:** Only one background mode can be active at a time
- **Persistent:** Your choice is saved and restored on reload
- **Preview Only:** Background doesn't affect exported SVG

---

## 🔍 Fit to Screen

### Overview
Automatically scales your SVG to fit perfectly within the preview area, using the SVG's viewBox for accurate sizing.

### Location
**Preview Tool** → Right Sidebar → "Fit to Screen" button

### How It Works
1. Reads the SVG's `viewBox` attribute
2. Calculates the scale needed to fit the viewBox dimensions
3. Adds 40px padding around all sides
4. Updates the zoom slider to match
5. Applies the transform to the SVG

### When to Use
- After loading a new SVG
- When you've zoomed in/out and want to reset
- When preview area size changes
- To see the full SVG at once

### Default Behavior
- Automatically fits to screen when SVG loads
- Uses viewBox if available
- Falls back to getBBox() if no viewBox
- Shows alert if dimensions unavailable

### Technical Details
- **Padding:** 40px on all sides
- **Scale Calculation:** `min((width - padding) / viewBoxWidth, (height - padding) / viewBoxHeight)`
- **Zoom Range:** Automatically adjusts max if needed

---

## 📋 Template System

### Overview
Save your current SVG as a template for quick reuse, or load from built-in examples.

### Location
**System Tools** → Templates

### Features

#### Built-in Templates
- **Example: Body with Limbs** - Basic character structure
- **Example: Body Face Eyes Mouth** - More detailed character

These are example SVG files from your workspace that demonstrate structure.

#### Save Current SVG as Template
1. Load or create an SVG
2. Go to Templates tool
3. Enter a descriptive name (e.g., "My Icon", "Logo Base")
4. Click "Save Template"
5. Template is saved to browser storage

#### Load Template
1. Go to Templates tool
2. See list of all templates (built-in + saved)
3. Click "Load" on any template
4. SVG loads immediately

#### Delete Template
1. Go to Templates tool
2. Find saved template (built-in can't be deleted)
3. Click "Delete"
4. Confirm deletion

### Storage
- **Location:** Browser localStorage
- **Persistence:** Survives browser restarts
- **Data Stored:**
  - Template name
  - Complete SVG data
  - Creation timestamp

### Best Practices
- **Naming:** Use descriptive names (e.g., "Button Base", "Icon Template")
- **Organization:** Save common starting points
- **Cleanup:** Delete unused templates to save space
- **Backup:** Important templates should also be saved as files

### Limitations
- Templates are stored locally (browser-specific)
- Limited by localStorage size (~5-10MB typically)
- Not synced across devices

---

## 🌙 Dark Mode

### Overview
Complete dark theme for the entire application, with persistent preference.

### Location
**Header** → Moon/Sun icon (top-right)

### Features
- **Toggle:** Click to switch between light and dark
- **Persistent:** Preference saved automatically
- **Complete Theme:** All UI components styled
- **Background Compatible:** Grid and checkerboard work in both themes

### How to Use
1. Click moon icon (🌙) to enable dark mode
2. Click sun icon (☀️) to return to light mode
3. Preference is saved automatically

### What Changes
- **Background Colors:** Dark grays instead of whites
- **Text Colors:** Light text on dark backgrounds
- **Borders:** Adjusted for visibility
- **Buttons:** Theme-aware styling
- **Grid:** Opacity adjusted for dark mode
- **All UI Elements:** Fully themed

### Storage
- Saved to localStorage as `isDarkMode`
- Automatically restored on page load

---

## 🎯 Layer Panel

### Overview
The layer panel in the Workflow Manager shows all groups and ungrouped paths, with controls for selection, duplication, deletion, and reordering.

### Location
**Workflow Manager** → Right Sidebar → Step 3: Layers section

### Features

#### Layer Display
- **Name:** Editable group/path name
- **Type:** Shows "GROUP" or "paths"
- **Path Count:** Number of paths in group
- **Visual Indicators:** Checkbox, visibility icon

#### Compact Action Buttons
All buttons are 24×24px for space efficiency:

1. **Check (✓)**
   - **Action:** Select all paths in this layer
   - **When to use:** To quickly select an entire group
   - **Note:** Doesn't switch to Selection tool (only preview clicks do)

2. **Copy (📋)**
   - **Action:** Duplicate the entire group
   - **When to use:** To create variations or backups
   - **Result:** New group with all paths copied

3. **Delete (🗑)**
   - **Action:** Remove the group and all its paths
   - **When to use:** To clean up unused groups
   - **Warning:** Cannot be undone (use Undo if needed)

4. **Up (↑)**
   - **Action:** Move layer forward (toward front)
   - **When to use:** To bring layer to front
   - **Disabled:** When already at top

5. **Down (↓)**
   - **Action:** Move layer backward (toward back)
   - **When to use:** To send layer to back
   - **Disabled:** When already at bottom

### Reordering
- **Drag and Drop:** Drag layer items to reorder
- **Visual Feedback:** Shows drag state
- **Top = Front:** Items at top appear on top
- **Bottom = Back:** Items at bottom appear behind

### Best Practices
- **Naming:** Use descriptive group names
- **Organization:** Group related paths together
- **Ordering:** Keep important elements on top
- **Cleanup:** Delete unused groups regularly

---

## 🔧 Button Consolidation

### Overview
All preview controls have been consolidated into a single location for clarity and consistency.

### Changes Made

#### Removed
- **Top Toolbar Buttons:** Fit to Screen, Grid, Checker removed from preview area top bar
- **Duplicate Controls:** No more multiple locations for same functions

#### Kept
- **Preview Tool:** All controls in right sidebar
- **Zoom Controls:** + and - buttons in preview corner (unchanged)

### Current Layout

**Preview Tool (Right Sidebar):**
- Background Style selector (None, Color, Grid, Checkerboard)
- Background Color picker (when Color mode active)
- Zoom slider
- Fit to Screen button
- Tip text

**Preview Area:**
- Zoom + and - buttons (corner)
- SVG display area

### Benefits
- **Less Confusion:** One place for all controls
- **Cleaner UI:** No duplicate buttons
- **Better Organization:** Related controls grouped together
- **Consistent:** All preview settings in one panel

---

## 📊 Technical Details

### Background System Implementation

**State Management:**
```javascript
backgroundMode: 'none' | 'color' | 'grid' | 'checkerboard'
previewBgColor: '#ffffff' // hex color string
```

**Key Functions:**
- `setBackgroundMode(mode)` - Sets active mode, persists to storage
- `applyBackgroundMods()` - Applies visual changes to wrapper
- `syncBackgroundButtons()` - Updates button states in UI

**CSS Classes:**
- `.svg-wrapper.grid` - Grid pattern
- `.svg-wrapper.checkerboard` - Checkerboard pattern
- Background color applied via inline style

### Template System Implementation

**Storage Structure:**
```javascript
{
    id: 'template-1234567890',
    name: 'My Template',
    svgData: '<svg>...</svg>',
    createdAt: 1234567890
}
```

**Key Functions:**
- `saveCurrentAsTemplate()` - Saves current SVG
- `loadTemplate(path)` - Loads built-in example
- `loadSavedTemplate(id)` - Loads saved template
- `deleteTemplate(id)` - Removes template
- `loadTemplatesFromStorage()` - Loads from localStorage
- `saveTemplatesToStorage()` - Saves to localStorage

### Fit to Screen Implementation

**Algorithm:**
1. Get SVG viewBox: `svg.getAttribute('viewBox')`
2. Parse dimensions: `[minX, minY, width, height]`
3. Get wrapper size: `wrapper.getBoundingClientRect()`
4. Calculate scale: `min((width - padding) / viewBoxWidth, (height - padding) / viewBoxHeight)`
5. Update zoom slider: `zoomInput.value = scale`
6. Apply transform: `updatePreviewZoom()`

**Default Behavior:**
- Called automatically after `parseSVG()`
- Uses `setTimeout(100ms)` to ensure DOM is ready
- Falls back to getBBox() if no viewBox

---

## 🎓 Best Practices

### Background Selection
- **Transparent SVGs:** Use checkerboard to see transparency
- **Alignment:** Use grid for precise positioning
- **Testing:** Use color to test against specific backgrounds
- **Export Prep:** Use none when preparing transparent exports

### Template Management
- **Naming Convention:** Use clear, descriptive names
- **Regular Cleanup:** Delete unused templates monthly
- **Backup Important:** Save critical templates as files too
- **Version Control:** Add version numbers for templates (e.g., "Button v2")

### Layer Organization
- **Logical Grouping:** Group related paths together
- **Naming:** Use descriptive group names
- **Ordering:** Keep most important elements on top
- **Cleanup:** Remove unused groups regularly

### Workflow Integration
1. **Start:** Load SVG or template
2. **Preview:** Adjust background for visibility
3. **Organize:** Create groups in Workflow Manager
4. **Edit:** Use inline editing for changes
5. **Finalize:** Fit to screen, check appearance
6. **Export:** Use Export Manager

---

## ❓ Frequently Asked Questions

### Q: Why can't I see my transparent SVG?
**A:** Switch to "Checkerboard" background mode to see transparency.

### Q: Can I have both grid and checkerboard?
**A:** No, background modes are mutually exclusive. Choose one.

### Q: Where did the top toolbar buttons go?
**A:** They're now in the Preview tool (right sidebar) for better organization.

### Q: How do I reset the zoom?
**A:** Click "Fit to Screen" in the Preview tool.

### Q: Can I share templates with others?
**A:** Templates are stored locally. Export your SVG and share the file instead.

### Q: Why doesn't dark mode affect the checkerboard?
**A:** Checkerboard is always black and white for consistency, regardless of theme.

### Q: How do I delete a built-in template?
**A:** Built-in templates can't be deleted, only saved templates can be removed.

### Q: What happens if localStorage is full?
**A:** You'll see an alert when trying to save. Delete old templates to free space.

---

## 🔄 Migration Guide

### If You're Upgrading

**Button Locations:**
- Old: Buttons in top toolbar
- New: All in Preview tool (right sidebar)

**Background Controls:**
- Old: Separate Grid/Checker buttons
- New: Unified mode selector (None, Color, Grid, Checkerboard)

**Templates:**
- Old: Only built-in examples
- New: Save your own templates

**Dark Mode:**
- Old: Not available
- New: Full dark theme with toggle

---

---

## 🎬 Path Animator (Enhanced with GSAP)

### Overview
The Path Animator tool allows you to add professional animations to your SVG paths. With GSAP integration, you get access to hardware-accelerated, smooth animations with advanced easing options.

### Location
**Advanced Tools** → Animator

### GSAP Integration

#### What is GSAP?
GSAP (GreenSock Animation Platform) is a professional-grade JavaScript animation library that provides:
- Hardware-accelerated animations
- Superior performance
- Advanced easing functions
- More animation control

#### GSAP Detection
- **Automatic:** GSAP is automatically detected when loaded
- **Visual Indicator:** Green badge shows "✨ GSAP Enabled" when available
- **Toggle:** Checkbox to use GSAP or CSS animations
- **Fallback:** Automatically uses CSS if GSAP not loaded

### Animation Types

#### Standard Animations (CSS & GSAP)
- **Draw Path:** Stroke drawing effect
- **Fade In:** Opacity animation
- **Scale In:** Scale from 0 to 1
- **Rotate In:** Rotation with scale
- **Slide In:** Vertical slide
- **Bounce In:** Bounce effect
- **Pulse:** Continuous pulsing
- **Wiggle:** Rotation wiggle
- **Shimmer:** Brightness animation
- **Glow:** Drop shadow glow
- **Float:** Vertical floating
- **Spin:** Continuous rotation
- **Elastic:** Elastic bounce
- **Color Cycle:** Color transitions
- **Color Pulse:** Color brightness pulse
- **Rainbow:** Hue rotation

#### GSAP-Only Animations
- **Motion Path:** Animate paths along custom motion paths
- **Stagger:** Staggered animations across multiple paths
- **Enhanced Morph:** Better morphing capabilities

### Easing Functions

#### GSAP Easing (Recommended)
- **Power Easing:** `power1.out`, `power2.out`, `power3.out`, `power4.out`
- **Back Easing:** `back.out` - Overshoot effect
- **Elastic Easing:** `elastic.out` - Spring-like effect
- **Bounce Easing:** `bounce.out` - Bouncing effect
- **Sine Easing:** `sine.inOut` - Smooth sine wave

#### CSS Easing (Fallback)
- `ease-in-out` - Standard ease
- `ease-out` - Fast start, slow end
- `ease-in` - Slow start, fast end
- `linear` - Constant speed

### How to Use

#### Basic Usage
1. Select paths to animate (or animate all)
2. Choose animation type
3. Set duration (seconds)
4. Set delay between paths (seconds)
5. Choose easing function
6. Check "Loop Animation" if desired
7. Click "Apply Animation"

#### With GSAP
1. Ensure GSAP is loaded (check for green badge)
2. Check "Use GSAP animations (recommended)"
3. Select GSAP easing function
4. Choose animation type
5. Apply animation

#### Removing Animations
- Click "Remove" button
- Removes both GSAP and CSS animations
- Cleans up all animation properties

### Settings Explained

#### Duration
- **What it does:** How long the animation takes
- **Range:** 0.1 to 10+ seconds
- **Default:** 2 seconds
- **Tip:** Shorter = snappier, Longer = smoother

#### Delay Between Paths
- **What it does:** Time between each path's animation start
- **Range:** 0 to 10+ seconds
- **Default:** 0.1 seconds
- **Tip:** Creates cascading/staggered effect

#### Loop Animation
- **What it does:** Repeats animation infinitely
- **When to use:** For continuous effects (pulse, spin, float)
- **Note:** Works with both CSS and GSAP

#### Direction
- **Normal:** Animation plays forward
- **Reverse:** Animation plays backward
- **Alternate:** Animation alternates forward/backward
- **Note:** Only available for certain animation types

### Best Practices

#### Performance
- **Use GSAP:** Better performance, especially for complex animations
- **Limit Paths:** Animating too many paths can slow down
- **Simple Animations:** Use simple animations for better performance

#### Animation Selection
- **Draw Path:** Best for line art, logos
- **Fade/Scale:** Good for general use
- **Pulse/Glow:** Great for attention-grabbing elements
- **Stagger:** Perfect for lists or groups

#### Timing
- **Short Duration (0.5-1s):** Quick, snappy animations
- **Medium Duration (1-3s):** Standard animations
- **Long Duration (3-5s):** Slow, dramatic animations

### Technical Details

#### GSAP Implementation
```javascript
// Example: Fade animation with GSAP
gsap.from(element, {
    opacity: 0,
    duration: 2,
    ease: 'power2.out'
});
```

#### CSS Fallback
```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

#### Animation Cleanup
- GSAP animations: `gsap.killTweensOf(element)`
- CSS animations: Remove style attributes
- Both are cleaned up when "Remove" is clicked

### When to Use

#### Use Animations For:
- **Presentations:** Add motion to static SVGs
- **Web Graphics:** Create engaging web animations
- **Prototypes:** Show interaction states
- **Demonstrations:** Highlight specific elements

#### Don't Use For:
- **Final Exports:** If animations aren't needed
- **Print Graphics:** Animations don't work in print
- **Complex Paths:** May cause performance issues

### Troubleshooting

#### Animations Not Working
- **Check Selection:** Ensure paths are selected
- **Check GSAP:** Verify GSAP is loaded (green badge)
- **Check Browser:** Some older browsers may not support all animations

#### Performance Issues
- **Reduce Paths:** Animate fewer paths at once
- **Use GSAP:** Better performance than CSS
- **Simplify Animations:** Use simpler animation types

#### GSAP Not Detected
- **Check CDN:** Verify GSAP CDN is loaded in HTML
- **Check Console:** Look for GSAP errors
- **Fallback:** CSS animations will work automatically

---

**Last Updated:** November 2024
**Document Version:** 1.1 (GSAP Integration)
**Coverage:** All Recent Features Including GSAP
