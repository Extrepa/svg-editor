import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const AlignmentTools: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();

    const selectedCount = state.selectedPaths.size;
    const selectedPaths = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p) 
        : [];

    const applyAlignmentTransform = (path: NonNullable<typeof selectedPaths[0]>, tx: number, ty: number) => {
        const existingTransform = path.element.getAttribute('transform') || '';
        const transformMatch = existingTransform.match(/translate\(([^)]+)\)/);
        
        let newTx = tx;
        let newTy = ty;
        
        if (transformMatch) {
            const [, coords] = transformMatch;
            const [x, y] = coords.split(/[\s,]+/).map(Number);
            newTx += x || 0;
            newTy += y || 0;
        }
        
        const otherTransforms = existingTransform.replace(/translate\([^)]+\)/g, '').trim();
        const newTransform = `translate(${newTx},${newTy})${otherTransforms ? ' ' + otherTransforms : ''}`.trim();
        
        path.element.setAttribute('transform', newTransform);
    };

    const alignPaths = (alignment: string, reference: 'canvas' | 'selection') => {
        if (selectedCount === 0) {
            alert('Please select at least one path');
            return;
        }
        
        saveState();
        const selectedPathElements = selectedPaths.filter(p => p && p.element);
        
        if (selectedPathElements.length === 0) return;
        
        const bboxes = selectedPathElements.map(path => {
            if (!path) return null;
            try {
                return path.element.getBBox();
            } catch (e) {
                return null;
            }
        }).filter((b): b is SVGRect => b !== null);
        
        if (bboxes.length === 0) {
            alert('Could not determine path positions');
            return;
        }
        
        if (reference === 'canvas') {
            const viewBox = state.svgElement?.getAttribute('viewBox');
            let svgWidth = 100, svgHeight = 100;
            if (viewBox) {
                const [, , w, h] = viewBox.split(' ').map(Number);
                svgWidth = w;
                svgHeight = h;
            } else if (state.svgElement) {
                svgWidth = parseFloat(state.svgElement.getAttribute('width') || '100');
                svgHeight = parseFloat(state.svgElement.getAttribute('height') || '100');
            }
            
            selectedPathElements.forEach((path, idx) => {
                if (!bboxes[idx] || !path) return;
                const bbox = bboxes[idx];
                let tx = 0, ty = 0;
                
                switch (alignment) {
                    case 'left':
                        tx = -bbox.x;
                        break;
                    case 'center':
                        tx = (svgWidth / 2) - (bbox.x + bbox.width / 2);
                        break;
                    case 'right':
                        tx = svgWidth - (bbox.x + bbox.width);
                        break;
                    case 'top':
                        ty = -bbox.y;
                        break;
                    case 'middle':
                        ty = (svgHeight / 2) - (bbox.y + bbox.height / 2);
                        break;
                    case 'bottom':
                        ty = svgHeight - (bbox.y + bbox.height);
                        break;
                }
                
                applyAlignmentTransform(path, tx, ty);
            });
        } else {
            if (selectedPathElements.length < 2) {
                alert('Select at least 2 paths to align relative to each other');
                return;
            }
            
            const minX = Math.min(...bboxes.map(b => b.x));
            const maxX = Math.max(...bboxes.map(b => b.x + b.width));
            const minY = Math.min(...bboxes.map(b => b.y));
            const maxY = Math.max(...bboxes.map(b => b.y + b.height));
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            
            selectedPathElements.forEach((path, idx) => {
                if (!bboxes[idx] || !path) return;
                const bbox = bboxes[idx];
                let tx = 0, ty = 0;
                
                switch (alignment) {
                    case 'left':
                        tx = minX - bbox.x;
                        break;
                    case 'center':
                        tx = centerX - (bbox.x + bbox.width / 2);
                        break;
                    case 'right':
                        tx = maxX - (bbox.x + bbox.width);
                        break;
                    case 'top':
                        ty = minY - bbox.y;
                        break;
                    case 'middle':
                        ty = centerY - (bbox.y + bbox.height / 2);
                        break;
                    case 'bottom':
                        ty = maxY - (bbox.y + bbox.height);
                        break;
                }
                
                applyAlignmentTransform(path, tx, ty);
            });
        }
        
        extractPaths();
        renderSVG();
    };

    const distributePaths = (direction: 'horizontal' | 'vertical') => {
        if (selectedCount < 3) {
            alert('Please select at least 3 paths to distribute');
            return;
        }
        
        saveState();
        const selectedPathElements = selectedPaths.filter(p => p && p.element);
        
        const pathsWithBBoxes = selectedPathElements.map(path => {
            if (!path) return null;
            try {
                const bbox = path.element.getBBox();
                return { 
                    path, 
                    bbox, 
                    center: direction === 'horizontal' ? bbox.x + bbox.width / 2 : bbox.y + bbox.height / 2 
                };
            } catch (e) {
                return null;
            }
        }).filter((p): p is { path: NonNullable<typeof selectedPaths[0]>, bbox: SVGRect, center: number } => p !== null).sort((a, b) => a.center - b.center);
        
        if (pathsWithBBoxes.length < 3) {
            alert('Could not determine path positions');
            return;
        }
        
        const first = pathsWithBBoxes[0].center;
        const last = pathsWithBBoxes[pathsWithBBoxes.length - 1].center;
        const spacing = (last - first) / (pathsWithBBoxes.length - 1);
        
        pathsWithBBoxes.forEach((item, idx) => {
            if (!item.path) return;
            const targetCenter = first + (spacing * idx);
            const currentCenter = item.center;
            const offset = targetCenter - currentCenter;
            
            if (direction === 'horizontal') {
                applyAlignmentTransform(item.path, offset, 0);
            } else {
                applyAlignmentTransform(item.path, 0, offset);
            }
        });
        
        extractPaths();
        renderSVG();
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Alignment Tools</h3>
                <p><strong>What it does:</strong> Align and distribute selected paths relative to each other or to the canvas. Essential for creating clean, organized designs.</p>
                <p><strong>When to use:</strong> After selecting multiple paths, use these tools to align them perfectly before bridging or merging.</p>
            </div>

            <div className="tool-section" style={{ 
                padding: '1rem', 
                background: selectedCount >= 2 ? 'rgba(74, 144, 226, 0.1)' : selectedCount > 0 ? 'rgba(243, 156, 18, 0.1)' : 'var(--bg-secondary)', 
                borderRadius: 'var(--border-radius)', 
                border: `2px solid ${selectedCount >= 2 ? 'var(--primary-color)' : selectedCount > 0 ? 'var(--warning-color)' : 'var(--border-color)'}`, 
                marginBottom: '1.5rem' 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong style={{ fontSize: '1rem' }}>Aligning:</strong>
                        <span style={{ fontSize: '1.25rem', color: selectedCount >= 2 ? 'var(--primary-color)' : 'var(--warning-color)', marginLeft: '0.5rem' }}>
                            {selectedCount}
                        </span> path(s)
                    </div>
                    {selectedCount > 0 ? (
                        <button className="btn btn-small" onClick={() => updateState({ currentPanel: 'workflow' })}>
                            Change Selection
                        </button>
                    ) : (
                        <button className="btn btn-small" onClick={() => updateState({ currentPanel: 'workflow' })}>
                            Go to Selection
                        </button>
                    )}
                </div>
                {selectedCount < 2 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--warning-color)', marginTop: '0.5rem', fontWeight: 600 }}>
                        {selectedCount === 0 ? 'Select at least 2 paths to align' : 'Select at least 1 more path to align'}
                    </p>
                )}
            </div>

            <div className="tool-section">
                <label className="form-label">Align to Canvas</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button className="btn btn-small" onClick={() => alignPaths('left', 'canvas')} disabled={selectedCount === 0}>
                        Align Left
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('center', 'canvas')} disabled={selectedCount === 0}>
                        Align Center
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('right', 'canvas')} disabled={selectedCount === 0}>
                        Align Right
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('top', 'canvas')} disabled={selectedCount === 0}>
                        Align Top
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('middle', 'canvas')} disabled={selectedCount === 0}>
                        Align Middle
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('bottom', 'canvas')} disabled={selectedCount === 0}>
                        Align Bottom
                    </button>
                </div>
            </div>

            <div className="tool-section">
                <label className="form-label">Align to Selection</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Align paths relative to each other (requires 2+ paths)
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button className="btn btn-small" onClick={() => alignPaths('left', 'selection')} disabled={selectedCount < 2}>
                        Align Left
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('center', 'selection')} disabled={selectedCount < 2}>
                        Align Center
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('right', 'selection')} disabled={selectedCount < 2}>
                        Align Right
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('top', 'selection')} disabled={selectedCount < 2}>
                        Align Top
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('middle', 'selection')} disabled={selectedCount < 2}>
                        Align Middle
                    </button>
                    <button className="btn btn-small" onClick={() => alignPaths('bottom', 'selection')} disabled={selectedCount < 2}>
                        Align Bottom
                    </button>
                </div>
            </div>

            <div className="tool-section">
                <label className="form-label">Distribute</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Evenly space paths (requires 3+ paths)
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    <button className="btn btn-small" onClick={() => distributePaths('horizontal')} disabled={selectedCount < 3}>
                        Distribute Horizontally
                    </button>
                    <button className="btn btn-small" onClick={() => distributePaths('vertical')} disabled={selectedCount < 3}>
                        Distribute Vertically
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlignmentTools;

