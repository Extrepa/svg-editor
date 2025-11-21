# SVG Layer Toolkit - Feature Status (truthful)

Last Updated: current session

## ✅ Implemented (current build)
- Load/save SVG, history (100 states), selection/multi-select, attribute edits (fill/stroke/opacity/transform/ID), color replace, token inject/export, clipboard copy.
- Background modes (none/color/grid/checkerboard) with zoom controls and mini-map (viewport outline); dark mode toggle.
- Path ops: transform (translate/scale/rotate), simple merge, optimizer (remove hidden/default attrs, round coords), export selected/full SVG.
- Path offset: attempts Paper.js expandStroke when available; falls back to basic offset.
- Workflow panel: selection/group info, region select, template loader (sample file), file patcher (update external SVG paths by ID), simple comparator (path count).
- Animator: CSS animations with optional GSAP if loaded.

## ⚠️ Partial / Basic
- Boolean operations (union/intersect/subtract): basic; Paper.js is loaded but robust ops are not wired.
- Image tracer/text-to-path: simple canvas threshold/contour trace; quality is limited.
- Gradient/stroke styling: basic attribute fields only; no dedicated gradient UI.
- Measurement: stats available; interactive ruler/tape not wired.
- Background controls: header and preview tool share `setBackgroundMode`; keep them in sync.

## 🚧 Not Implemented
- Node editor with point handles/snap.
- Bounding-box drag handles (scale/rotate/move).
- Advanced snapping (centers/edges with guides), drag-to-create guide lines.
- Robust boolean ops, QR generator, symmetry/mirror mode, advanced gradient editor.

## Notes
- CDN libraries loaded: svg.js, paper.js, qrcode.js, gsap.
- This file reflects the real codebase; update as features ship. 
