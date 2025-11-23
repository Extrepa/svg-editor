import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const PathMerger: React.FC = () => {
    const { state, updateState, clearSelection } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();

    const selectedCount = state.selectedPaths.size;
    const selectedPaths = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p) 
        : [];

    const handleMergePaths = () => {
        if (selectedCount < 2) {
            alert('Please select at least 2 paths to merge');
            return;
        }
        
        saveState();
        const selectedPathElements = selectedPaths.filter((p): p is NonNullable<typeof p> => p !== undefined);
        
        if (selectedPathElements.length < 2) return;
        
        const firstPath = selectedPathElements[0];
        if (!firstPath) return;
        
        const mergedD = selectedPathElements.map(p => p.d).join(' ');
        
        firstPath.element.setAttribute('d', mergedD);
        firstPath.d = mergedD;
        
        // Remove other paths
        selectedPathElements.slice(1).forEach(path => {
            if (path) path.element.remove();
        });
        
        extractPaths();
        clearSelection();
        renderSVG();
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Path Combiner & Merger</h3>
                <p><strong>What it does:</strong> Combines multiple selected paths into a single path by concatenating their path data.</p>
                <p><strong>When to use:</strong> When you have related paths (like parts of an icon) that should be one path. Useful before exporting or animating to reduce complexity.</p>
                <p><strong>How it works:</strong> Takes the 'd' attribute from each selected path and combines them with spaces. The first path's attributes (fill, stroke) are preserved.</p>
                <p style={{ color: 'var(--warning-color)', fontWeight: 600 }}>
                    <strong>⚠️ Warning:</strong> This operation cannot be easily undone. Use History (Ctrl+Z) to revert if needed.
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
                        <strong style={{ fontSize: '1rem' }}>Merging:</strong>
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
                        {selectedCount === 0 ? 'Select at least 2 paths to merge' : 'Select at least 1 more path to merge'}
                    </p>
                ) : (
                    <>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            These {selectedCount} paths will be combined into one path.
                        </p>
                        <div style={{ marginTop: '0.75rem', maxHeight: '150px', overflowY: 'auto' }}>
                            {selectedPaths.filter((p): p is NonNullable<typeof p> => p !== undefined).map(p => (
                                <div key={p.id} style={{ padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '4px', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                                    <strong>{p.id}</strong> - {p.d.substring(0, 50)}{p.d.length > 50 ? '...' : ''}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="tool-section">
                <button 
                    className="btn btn-primary" 
                    onClick={handleMergePaths} 
                    disabled={selectedCount < 2} 
                    style={{ width: '100%' }}
                >
                    Merge {selectedCount >= 2 ? selectedCount : ''} Selected Paths
                </button>
            </div>
        </div>
    );
};

export default PathMerger;

