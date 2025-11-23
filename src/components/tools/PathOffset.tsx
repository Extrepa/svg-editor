import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const PathOffset: React.FC = () => {
    const { state } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();
    const [offset, setOffset] = useState(5);
    const [keepOriginal, setKeepOriginal] = useState(true);
    const [useStrokeWidth, setUseStrokeWidth] = useState(false);

    const selectedCount = state.selectedPaths.size;
    const selectedPaths = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p) 
        : [];

    const createOffsetPath = (pathData: string, offsetDistance: number): string | null => {
        // Check if Paper.js is available
        if (typeof (window as any).paper === 'undefined') {
            // Fallback: return original path
            return pathData;
        }

        try {
            const paper = (window as any).paper;
            
            // Create a temporary Paper.js scope
            const scope = new paper.PaperScope();
            scope.activate();
            
            // Create a Paper.js path from SVG path data
            const path = new scope.Path(pathData);
            
            if (!path || path.segments.length === 0) {
                return pathData;
            }
            
            // Offset the path
            const offsetPath = path.offset(offsetDistance);
            
            if (!offsetPath || offsetPath.segments.length === 0) {
                return pathData;
            }
            
            // Convert Paper.js path back to SVG path data
            const svgPathData = offsetPath.pathData;
            
            return svgPathData;
        } catch (error) {
            console.warn('Path offset error:', error);
            // Fallback: return original path
            return pathData;
        }
    };

    const handleExpandStroke = () => {
        if (selectedCount === 0) {
            alert('Please select at least one path');
            return;
        }
        
        saveState();
        const selectedPathElements = selectedPaths.filter((p): p is NonNullable<typeof p> => p !== undefined);
        const svgNS = 'http://www.w3.org/2000/svg';
        let created = 0;
        
        selectedPathElements.forEach(path => {
            const offsetDistance = useStrokeWidth && path.strokeWidth ? parseFloat(path.strokeWidth) / 2 : offset;
            const expandedPath = createOffsetPath(path.d, offsetDistance);
            
            if (expandedPath && expandedPath !== path.d) {
                const newPath = document.createElementNS(svgNS, 'path');
                newPath.setAttribute('d', expandedPath);
                newPath.setAttribute('fill', path.stroke || path.fill || '#000000');
                newPath.setAttribute('stroke', 'none');
                newPath.id = `${path.id}-expanded-${Date.now()}`;
                
                path.element.parentNode?.insertBefore(newPath, path.element.nextSibling);
                
                if (!keepOriginal) {
                    path.element.remove();
                }
                created++;
            } else if (expandedPath === path.d) {
                // Path offset didn't change (might be an error or zero offset)
                alert(`Warning: Could not offset path "${path.id}". Path may be too complex or offset too small.`);
            }
        });
        
        extractPaths();
        renderSVG();
        alert(`Created ${created} expanded path(s)!`);
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Path Offset / Stroke Expansion</h3>
                <p><strong>What it does:</strong> Converts strokes into filled shapes by creating an outline around paths. Essential for CNC/laser cutting, stickers (white borders), and merging thick strokes with filled shapes.</p>
                <p><strong>When to use:</strong> When you need closed paths for cutting machines, or want to merge a stroke with a fill.</p>
                <p><strong>How it works:</strong> Expands the path outward by the stroke width, creating a new filled path.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Selected Path{selectedCount !== 1 ? 's' : ''}</label>
                {selectedCount === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Select a path in the preview to expand its stroke.
                    </p>
                ) : (
                    <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', marginBottom: '0.75rem' }}>
                        <strong>{selectedCount} path(s) selected</strong>
                        {selectedPaths.filter((p): p is NonNullable<typeof p> => p !== undefined).map(p => (
                            <div key={p.id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                {p.id} - Stroke: {p.strokeWidth || 'none'}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="tool-section">
                <label className="form-label">Offset Distance</label>
                <input
                    type="range"
                    className="form-input"
                    min="1"
                    max="50"
                    value={offset}
                    step="0.5"
                    onChange={(e) => setOffset(parseFloat(e.target.value))}
                />
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {offset}px
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Distance to expand the path outward. Use stroke width for accurate expansion.
                </p>
            </div>

            <div className="tool-section">
                <label className="form-label">Options</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={keepOriginal}
                        onChange={(e) => setKeepOriginal(e.target.checked)}
                    />
                    <span>Keep original path</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={useStrokeWidth}
                        onChange={(e) => setUseStrokeWidth(e.target.checked)}
                    />
                    <span>Use path's stroke-width (if available)</span>
                </label>
            </div>

            <div className="tool-section">
                <button 
                    className="btn btn-primary" 
                    onClick={handleExpandStroke} 
                    disabled={selectedCount === 0} 
                    style={{ width: '100%' }}
                >
                    Expand Stroke to Filled Path
                </button>
            </div>
        </div>
    );
};

export default PathOffset;

