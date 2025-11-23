import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { usePathExtraction } from '../../hooks/usePathExtraction';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

const WorkflowTool: React.FC = () => {
    const { state, updateState, clearSelection, setSelectedPaths } = useAppContext();
    const { saveState } = useHistory();
    const { extractPaths, extractGroups } = usePathExtraction();
    const { renderSVG } = useSVGRenderer();

    if (!state.paths.length) {
        return (
            <div className="tool-panel-content">
                <div className="tool-explanation">
                    <h3>Workflow Manager</h3>
                    <p><strong>Step 1:</strong> Click paths in preview to select them</p>
                    <p><strong>Step 2:</strong> Name selected paths</p>
                    <p><strong>Step 3:</strong> Create groups from selected paths</p>
                    <p><strong>Step 4:</strong> Reorder layers (what appears on top)</p>
                    <p><strong>Step 5:</strong> Select group to edit all paths in it</p>
                </div>
                <p>No paths found. Load an SVG file first.</p>
            </div>
        );
    }

    const selectedCount = state.selectedPaths.size;
    const selectedPaths = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p) 
        : [];

    const handleClearSelection = () => {
        clearSelection();
    };

    const handleSelectAll = () => {
        const allIds = new Set(state.paths.map(p => p.id));
        setSelectedPaths(allIds);
    };

    const handleInvertSelection = () => {
        const allIds = new Set(state.paths.map(p => p.id));
        const newSelection = new Set<string>();
        allIds.forEach(id => {
            if (!state.selectedPaths.has(id)) {
                newSelection.add(id);
            }
        });
        setSelectedPaths(newSelection);
    };

    const handleSelectSimilar = () => {
        if (selectedPaths.length === 0) return;
        const firstPath = selectedPaths[0];
        if (!firstPath) return;
        
        const similarPaths = state.paths.filter(path => {
            return path.fill === firstPath.fill && path.stroke === firstPath.stroke;
        });
        
        const similarIds = new Set(similarPaths.map(p => p.id));
        setSelectedPaths(similarIds);
    };

    const handleDuplicate = () => {
        if (state.selectedPaths.size === 0 || !state.svgElement) return;
        
        saveState();
        
        const newPaths: string[] = [];
        
        state.selectedPaths.forEach(pathId => {
            const path = state.paths.find(p => p.id === pathId);
            if (!path) return;
            
            const cloned = path.element.cloneNode(true) as SVGPathElement;
            const newId = `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            cloned.setAttribute('id', newId);
            
            // Offset position slightly
            const transform = path.transform || '';
            const offset = 20;
            const newTransform = transform 
                ? `${transform} translate(${offset}, ${offset})`
                : `translate(${offset}, ${offset})`;
            cloned.setAttribute('transform', newTransform);
            
            state.svgElement!.appendChild(cloned);
            newPaths.push(newId);
        });
        
        setSelectedPaths(new Set(newPaths));
        extractPaths();
        renderSVG();
    };

    const handleDelete = () => {
        if (state.selectedPaths.size === 0 || !state.svgElement) return;
        
        if (!confirm(`Delete ${state.selectedPaths.size} selected path(s)?`)) {
            return;
        }
        
        saveState();
        
        state.selectedPaths.forEach(pathId => {
            const path = state.paths.find(p => p.id === pathId);
            if (path) {
                path.element.remove();
            }
        });
        
        clearSelection();
        extractPaths();
        extractGroups();
        renderSVG();
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Workflow Manager</h3>
                <p><strong>Workflow:</strong> 1) Click paths in preview → 2) Name them → 3) Create groups → 4) Reorder layers → 5) Select group to edit</p>
            </div>

            {selectedCount > 0 ? (
                <div className="tool-section" style={{ padding: '1.5rem', background: 'rgba(74, 144, 226, 0.1)', borderRadius: 'var(--border-radius)', border: '2px solid var(--primary-color)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <strong style={{ fontSize: '1.125rem', color: 'var(--primary-color)' }}>
                                {selectedCount} Path(s) Selected
                            </strong>
                        </div>
                        <button className="btn btn-small" onClick={handleClearSelection}>
                            Clear Selection
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                        <button className="btn btn-small" onClick={handleSelectAll}>
                            Select All ({state.paths.length})
                        </button>
                        <button className="btn btn-small" onClick={handleInvertSelection}>
                            Invert Selection
                        </button>
                        <button className="btn btn-small" onClick={handleSelectSimilar}>
                            Select Similar
                        </button>
                    </div>

                    {/* Selected Paths List */}
                    <div className="tool-section">
                        <h4>Selected Paths</h4>
                        <div className="selected-paths-list">
                            {selectedPaths.filter((p): p is NonNullable<typeof p> => p !== undefined).map(path => (
                                <div key={path.id} className="selected-path-item">
                                    <span>{path.id}</span>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Fill: {path.fill || 'none'} | Stroke: {path.stroke || 'none'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="tool-section" style={{ marginTop: '1rem' }}>
                        <h4>Actions</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-small" onClick={handleDuplicate}>
                                Duplicate
                            </button>
                            <button 
                                className="btn btn-small" 
                                style={{ background: 'var(--danger-color)' }}
                                onClick={handleDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="tool-section" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', textAlign: 'center', marginBottom: '1.5rem' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>No paths selected</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click paths in the preview to select them</p>
                </div>
            )}

            {/* All Paths List */}
            <div className="tool-section">
                <h4>All Paths ({state.paths.length})</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Click a path to select it. Click in preview to select multiple.
                </p>
                <div className="path-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {state.paths.map((path) => (
                        <div
                            key={path.id}
                            className={`path-item ${state.selectedPaths.has(path.id) ? 'selected' : ''}`}
                            onClick={() => {
                                const newSet = new Set(state.selectedPaths);
                                if (newSet.has(path.id)) {
                                    newSet.delete(path.id);
                                } else {
                                    newSet.add(path.id);
                                }
                                updateState({ selectedPaths: newSet });
                            }}
                        >
                            <div className="path-item-header">
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{path.id}</span>
                            </div>
                            <div className="path-item-preview" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {path.d.substring(0, 80)}{path.d.length > 80 ? '...' : ''}
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                                <span>Fill: {path.fill || 'none'}</span>
                                <span>Stroke: {path.stroke || 'none'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WorkflowTool;

