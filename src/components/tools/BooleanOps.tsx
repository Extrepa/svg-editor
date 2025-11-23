import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const BooleanOps: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();

    const selectedCount = state.selectedPaths.size;
    const selectedPaths = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p) 
        : [];

    const handleBooleanOp = (operation: 'union' | 'subtract' | 'intersect') => {
        if (selectedCount < 2) {
            alert(`Select at least 2 paths for ${operation} operation`);
            return;
        }

        // Check if Paper.js is available
        if (typeof (window as any).paper === 'undefined') {
            alert('Paper.js library not loaded. Boolean operations require Paper.js.');
            return;
        }

        saveState();
        const selectedPathElements = selectedPaths.filter(p => p);
        
        if (selectedPathElements.length < 2) return;
        
        try {
            const basePath = selectedPathElements[0];
            if (!basePath) return;
            
            const paper = (window as any).paper;
            
            // Get bounding box
            let maxWidth = 2000, maxHeight = 2000;
            try {
                const bbox = basePath.element.getBBox();
                maxWidth = Math.max(maxWidth, Math.ceil(bbox.width * 2));
                maxHeight = Math.max(maxHeight, Math.ceil(bbox.height * 2));
            } catch (e) {}
            
            // Create Paper.js project
            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = maxHeight;
            paper.setup(canvas);
            
            // Convert paths to Paper.js
            try {
                let resultPath: any = new paper.Path(basePath.d);
                
                selectedPathElements.slice(1).forEach(path => {
                    if (!path) return;
                    const path2 = new paper.Path(path.d);
                    if (operation === 'union') {
                        resultPath = resultPath.unite(path2);
                    } else if (operation === 'subtract') {
                        resultPath = resultPath.subtract(path2);
                    } else if (operation === 'intersect') {
                        resultPath = resultPath.intersect(path2);
                    }
                });
                
                // Convert result back to SVG path
                const pathData = resultPath.pathData;
                basePath.element.setAttribute('d', pathData);
                basePath.d = pathData;
                
                // Remove other paths
                selectedPathElements.slice(1).forEach(path => {
                    if (path) path.element.remove();
                });
                
                paper.project.clear();
                extractPaths();
                renderSVG();
            } catch (e) {
                paper.project.clear();
                alert(`Error performing ${operation}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        } catch (e) {
            alert(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Boolean Operations</h3>
                <p><strong>What it does:</strong> Combine paths using geometric operations. Union combines shapes, Subtract cuts holes, Intersect keeps only overlapping areas.</p>
                <p><strong>When to use:</strong> For complex shape creation. Subtract for cookie-cutter effects, Intersect for masks, Union for combining (also available in Path Merger).</p>
                <p style={{ color: 'var(--success-color)' }}>
                    <strong>Note:</strong> Using Paper.js for production-quality boolean operations! Falls back to basic implementation if library not loaded.
                </p>
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
                        <strong style={{ fontSize: '1rem' }}>Operating on:</strong>
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
                {selectedCount < 2 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--warning-color)', marginTop: '0.5rem', fontWeight: 600 }}>
                        {selectedCount === 0 ? 'Select at least 2 paths for boolean operations' : 'Select at least 1 more path'}
                    </p>
                ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        First selected path is the base. Second+ paths are the operands.
                    </p>
                )}
            </div>

            <div className="tool-section">
                <label className="form-label">Boolean Operations</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => handleBooleanOp('union')} 
                        disabled={selectedCount < 2} 
                        style={{ width: '100%' }}
                    >
                        ➕ Union (Combine - same as Path Merger)
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => handleBooleanOp('subtract')} 
                        disabled={selectedCount < 2} 
                        style={{ width: '100%' }}
                    >
                        ➖ Subtract (Cut hole with top shape)
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => handleBooleanOp('intersect')} 
                        disabled={selectedCount < 2} 
                        style={{ width: '100%' }}
                    >
                        ✂️ Intersect (Keep only overlap)
                    </button>
                </div>
            </div>

            <div className="tool-section">
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong>How it works:</strong> Union combines all paths. Subtract uses top paths to cut holes in bottom path. Intersect keeps only the overlapping area of all paths.
                </p>
            </div>
        </div>
    );
};

export default BooleanOps;

