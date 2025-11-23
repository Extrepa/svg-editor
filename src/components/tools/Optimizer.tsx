import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const Optimizer: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();
    const [options, setOptions] = useState({
        removeHidden: true,
        removeDefaults: true,
        roundCoords: true,
        simplifyPaths: false,
        removeEmpty: true,
    });

    const selectedCount = state.selectedPaths.size;
    const targetPaths = selectedCount > 0 ? selectedCount : state.paths.length;
    const pathsToOptimize = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p)
        : state.paths;

    const handleOptimize = () => {
        if (pathsToOptimize.length === 0) {
            alert('No paths to optimize');
            return;
        }

        saveState();
        const originalSize = state.svgData ? new Blob([state.svgData]).size : 0;
        
        // Remove hidden elements
        if (options.removeHidden) {
            pathsToOptimize.forEach(path => {
                if (!path) return;
                const style = path.element.getAttribute('style') || '';
                const opacity = path.element.getAttribute('opacity') || '1';
                if (style.includes('display:none') || opacity === '0') {
                    path.element.remove();
                }
            });
        }
        
        // Round coordinates
        if (options.roundCoords) {
            pathsToOptimize.forEach(path => {
                if (!path) return;
                const d = path.d.replace(/(\d+\.\d+)/g, (match) => {
                    return parseFloat(match).toFixed(2);
                });
                path.element.setAttribute('d', d);
                path.d = d;
            });
        }
        
        extractPaths();
        renderSVG();
        
        const newSize = state.svgData ? new Blob([state.svgData]).size : 0;
        const reduction = originalSize > 0 ? ((originalSize - newSize) / originalSize * 100).toFixed(1) : 0;
        alert(`Optimized ${pathsToOptimize.length} path(s)! Size reduction: ${reduction}%`);
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>SVG Optimizer</h3>
                <p>Clean and optimize your SVG to reduce file size while maintaining visual quality. Removes unnecessary data, rounds coordinates, and reduces path complexity.</p>
                <p><strong>When to use:</strong> Before exporting for production. Use this near the end of your workflow, after all editing is complete.</p>
            </div>

            <div className="tool-section" style={{ 
                padding: '1rem', 
                background: selectedCount > 0 ? 'rgba(74, 144, 226, 0.1)' : 'var(--bg-secondary)', 
                borderRadius: 'var(--border-radius)', 
                border: `2px solid ${selectedCount > 0 ? 'var(--primary-color)' : 'var(--border-color)'}`, 
                marginBottom: '1.5rem' 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong style={{ fontSize: '1rem' }}>Optimizing:</strong>
                        <span style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginLeft: '0.5rem' }}>
                            {targetPaths}
                        </span> path(s)
                    </div>
                    {selectedCount > 0 ? (
                        <button className="btn btn-small" onClick={() => updateState({ currentPanel: 'workflow' })}>
                            Change Selection
                        </button>
                    ) : (
                        <button className="btn btn-small" onClick={() => {
                            const allIds = new Set(state.paths.map(p => p.id));
                            updateState({ selectedPaths: allIds });
                        }}>
                            Select All
                        </button>
                    )}
                </div>
            </div>

            <div className="tool-section">
                <label className="form-label">Optimization Options</label>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={options.removeHidden}
                            onChange={(e) => setOptions(prev => ({ ...prev, removeHidden: e.target.checked }))}
                        />
                        <span>Remove hidden elements (display:none, opacity:0)</span>
                    </label>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={options.removeDefaults}
                            onChange={(e) => setOptions(prev => ({ ...prev, removeDefaults: e.target.checked }))}
                        />
                        <span>Remove default attributes</span>
                    </label>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={options.roundCoords}
                            onChange={(e) => setOptions(prev => ({ ...prev, roundCoords: e.target.checked }))}
                        />
                        <span>Round coordinates (reduce precision to 2 decimals)</span>
                    </label>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={options.simplifyPaths}
                            onChange={(e) => setOptions(prev => ({ ...prev, simplifyPaths: e.target.checked }))}
                        />
                        <span>Simplify paths (reduce path length - may change appearance)</span>
                    </label>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={options.removeEmpty}
                            onChange={(e) => setOptions(prev => ({ ...prev, removeEmpty: e.target.checked }))}
                        />
                        <span>Remove empty groups and paths</span>
                    </label>
                </div>
                <button className="btn btn-primary" onClick={handleOptimize} style={{ width: '100%' }}>
                    Optimize {selectedCount > 0 ? 'Selected' : 'All'} Paths
                </button>
            </div>
        </div>
    );
};

export default Optimizer;

