import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const PathSimplifier: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();
    const [tolerance, setTolerance] = useState(2);
    const [roundCoords, setRoundCoords] = useState(true);
    const [removeRedundant, setRemoveRedundant] = useState(true);

    const selectedCount = state.selectedPaths.size;
    const pathsToSimplify = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p)
        : state.paths;

    const handleSimplify = () => {
        if (pathsToSimplify.length === 0) {
            alert('No paths to simplify');
            return;
        }

        saveState();
        pathsToSimplify.filter((p): p is NonNullable<typeof p> => p !== undefined).forEach(path => {
            let simplified = path.d;
            
            // Round coordinates
            if (roundCoords) {
                simplified = simplified.replace(/(\d+\.\d+)/g, (match) => {
                    return parseFloat(match).toFixed(2);
                });
            }
            
            // Remove redundant commands (simplified)
            if (removeRedundant) {
                simplified = simplified.replace(/L\s+([\d.-]+)\s+([\d.-]+)\s+L\s+\1\s+\2/gi, 'L $1 $2');
            }
            
            path.element.setAttribute('d', simplified);
            path.d = simplified;
        });
        
        extractPaths();
        renderSVG();
        alert(`Simplified ${pathsToSimplify.length} path(s)!`);
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Path Simplifier</h3>
                <p>Reduce path complexity by removing unnecessary points and simplifying curves. This reduces file size and improves performance.</p>
                <p><strong>When to use:</strong> After creating or importing paths, use this to clean them up. Works great with traced images or complex paths.</p>
                <p style={{ color: 'var(--warning-color)' }}>
                    <strong>Note:</strong> Higher simplification may change path appearance. Preview changes before applying.
                </p>
            </div>

            {selectedCount === 0 ? (
                <div className="tool-section" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>No paths selected</p>
                    <button className="btn btn-primary" onClick={() => updateState({ currentPanel: 'workflow' })}>
                        Go to Workflow Manager
                    </button>
                </div>
            ) : (
                <div className="tool-section" style={{ padding: '1rem', background: 'rgba(74, 144, 226, 0.1)', borderRadius: 'var(--border-radius)', border: '2px solid var(--primary-color)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong style={{ fontSize: '1rem' }}>Simplifying:</strong>
                            <span style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginLeft: '0.5rem' }}>
                                {selectedCount}
                            </span> path(s)
                        </div>
                        <button className="btn btn-small" onClick={() => updateState({ currentPanel: 'workflow' })}>
                            Change Selection
                        </button>
                    </div>
                </div>
            )}

            <div className="tool-section">
                <label className="form-label">Simplification Options</label>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">Tolerance (0-10)</label>
                    <input
                        type="range"
                        className="form-input"
                        min="0"
                        max="10"
                        value={tolerance}
                        step="0.1"
                        onChange={(e) => setTolerance(parseFloat(e.target.value))}
                    />
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {tolerance}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Higher = more simplification, fewer points. Start with 1-3 for subtle changes.
                    </p>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={roundCoords}
                            onChange={(e) => setRoundCoords(e.target.checked)}
                        />
                        <span>Round coordinates (reduce decimal precision)</span>
                    </label>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={removeRedundant}
                            onChange={(e) => setRemoveRedundant(e.target.checked)}
                        />
                        <span>Remove redundant commands (consecutive L, M commands)</span>
                    </label>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={handleSimplify} 
                    disabled={pathsToSimplify.length === 0} 
                    style={{ width: '100%' }}
                >
                    Simplify {selectedCount > 0 ? 'Selected' : 'All'} Paths
                </button>
            </div>
        </div>
    );
};

export default PathSimplifier;

