# SVG Layer Toolkit - Update Log (truthful)

Last Updated: current session

## Recent Changes
- Added Paper.js via CDN; path offset now attempts `expandStroke` with fallback to the basic offset routine.
- Mini-map always renders with a viewport outline; hover uses outline instead of opacity to keep strokes legible.
- Background modes unified (color/grid/checkerboard), zoom controls refined, saved preferences respected.
- History chips show “Import” for the initial state; timestamps on hover.

## Known Gaps
- Boolean operations still use basic logic; Paper.js is loaded but not wired for robust union/subtract/intersect.
- Node editor, bounding-box drag handles, advanced snapping/guides, symmetry, gradient UI, QR generator are not implemented.
- Image tracer/text-to-path is a simple threshold/contour trace and not production-grade.

## Notes
- CDN libraries: svg.js, paper.js, qrcode.js, gsap. Only Paper is used for offset attempts; others are mostly unused or optional (GSAP in animator if present). 
