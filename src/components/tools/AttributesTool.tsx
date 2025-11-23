import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

const AttributesTool: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    
    const selectedCount = state.selectedPaths.size;
    // Get selected paths and groups
    const selectedPaths = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p) 
        : [];
    const selectedGroups = selectedCount > 0
        ? Array.from(state.selectedPaths).map(id => state.groups.find(g => g.id === id)).filter(g => g)
        : [];
    
    // Check if selection contains groups
    const hasGroups = selectedGroups.length > 0;
    const hasPaths = selectedPaths.length > 0;

    // Get common value from paths (for path-specific attributes)
    const getCommonPathValue = (paths: typeof selectedPaths, attribute: 'fill' | 'stroke' | 'strokeWidth' | 'opacity') => {
        if (paths.length === 0) return null;
        const values = paths.map(p => {
            if (!p) return null;
            if (attribute === 'fill') return p.fill;
            if (attribute === 'stroke') return p.stroke;
            if (attribute === 'strokeWidth') return p.strokeWidth;
            if (attribute === 'opacity') return p.opacity;
            return null;
        }).filter(v => v !== undefined && v !== null);
        if (values.length === 0) return null;
        const first = values[0];
        return values.every(v => v === first) ? first : null;
    };
    
    // Get common attribute value from groups (for group attributes)
    const getCommonGroupValue = (groups: typeof selectedGroups, attribute: 'id' | 'transform' | 'opacity' | 'class' | 'dataRegion') => {
        if (groups.length === 0) return null;
        const values = groups.map(g => {
            if (!g) return null;
            if (attribute === 'id') return g.id;
            if (attribute === 'transform') return g.transform || '';
            if (attribute === 'opacity') return g.element.getAttribute('opacity') || '1';
            if (attribute === 'class') return g.attributes?.class || '';
            if (attribute === 'dataRegion') return g.dataRegion || '';
            return null;
        }).filter(v => v !== undefined && v !== null);
        if (values.length === 0) return null;
        const first = values[0];
        return values.every(v => v === first) ? first : null;
    };

    // Initialize attributes based on what's selected
    const getInitialAttributes = () => {
        if (hasGroups && !hasPaths) {
            // Only groups selected
            return {
                fill: '',
                stroke: '',
                strokeWidth: '',
                opacity: getCommonGroupValue(selectedGroups, 'opacity') || '1',
                id: selectedCount === 1 ? selectedGroups[0]?.id || '' : '',
                transform: getCommonGroupValue(selectedGroups, 'transform') || '',
                class: getCommonGroupValue(selectedGroups, 'class') || '',
                dataRegion: getCommonGroupValue(selectedGroups, 'dataRegion') || '',
            };
        } else if (hasPaths) {
            // Paths selected (may also have groups)
            return {
                fill: getCommonPathValue(selectedPaths, 'fill') || '#000000',
                stroke: getCommonPathValue(selectedPaths, 'stroke') || '#000000',
                strokeWidth: getCommonPathValue(selectedPaths, 'strokeWidth') || '0',
                opacity: getCommonPathValue(selectedPaths, 'opacity') || '1',
                id: selectedCount === 1 ? selectedPaths[0]?.id || selectedGroups[0]?.id || '' : '',
                transform: selectedPaths[0]?.transform || selectedGroups[0]?.transform || '',
                class: selectedPaths[0]?.attributes?.class || selectedGroups[0]?.attributes?.class || '',
                dataRegion: selectedPaths[0]?.dataRegion || selectedGroups[0]?.dataRegion || '',
            };
        }
        return {
            fill: '#000000',
            stroke: '#000000',
            strokeWidth: '0',
            opacity: '1',
            id: '',
            transform: '',
            class: '',
            dataRegion: '',
        };
    };
    
    const [attributes, setAttributes] = useState(getInitialAttributes());

    useEffect(() => {
        setAttributes(getInitialAttributes());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCount, selectedPaths.length, selectedGroups.length, hasPaths, hasGroups]);

    const handleSaveAttributes = () => {
        if (selectedCount === 0) return;
        
        saveState();
        state.selectedPaths.forEach(itemId => {
            // Try to find as path first
            const path = state.paths.find(p => p.id === itemId);
            if (path) {
                // Only apply path-specific attributes to paths
                if (attributes.fill) path.element.setAttribute('fill', attributes.fill);
                if (attributes.stroke) path.element.setAttribute('stroke', attributes.stroke);
                if (attributes.strokeWidth) path.element.setAttribute('stroke-width', attributes.strokeWidth);
                if (attributes.opacity) path.element.setAttribute('opacity', attributes.opacity);
                if (attributes.transform) path.element.setAttribute('transform', attributes.transform);
                if (attributes.class) path.element.setAttribute('class', attributes.class);
                if (attributes.dataRegion) path.element.setAttribute('data-region', attributes.dataRegion);
                
                // Update single path ID
                if (selectedCount === 1 && attributes.id && attributes.id !== path.id) {
                    path.element.id = attributes.id;
                    path.id = attributes.id;
                }
                
                // Update path data
                path.fill = attributes.fill;
                path.stroke = attributes.stroke;
                path.strokeWidth = attributes.strokeWidth;
                path.opacity = attributes.opacity;
                path.transform = attributes.transform;
                path.dataRegion = attributes.dataRegion;
                return;
            }
            
            // Try to find as group
            const group = state.groups.find(g => g.id === itemId);
            if (group) {
                // Apply group-compatible attributes
                if (attributes.opacity) group.element.setAttribute('opacity', attributes.opacity);
                if (attributes.transform) group.element.setAttribute('transform', attributes.transform);
                if (attributes.class) group.element.setAttribute('class', attributes.class);
                if (attributes.dataRegion) group.element.setAttribute('data-region', attributes.dataRegion);
                
                // Update single group ID
                if (selectedCount === 1 && attributes.id && attributes.id !== group.id) {
                    group.element.id = attributes.id;
                    group.id = attributes.id;
                }
                
                // Update group data
                group.transform = attributes.transform;
                group.dataRegion = attributes.dataRegion;
                if (attributes.opacity) {
                    group.attributes = { ...group.attributes, opacity: attributes.opacity };
                }
                if (attributes.class) {
                    group.attributes = { ...group.attributes, class: attributes.class };
                }
            }
        });
        
        renderSVG();
    };

    if (selectedCount === 0) {
        return (
            <div className="tool-panel-content">
                <div className="tool-explanation">
                    <h3>Attribute Editor</h3>
                    <p>Edit all attributes (ID, fill, stroke, opacity, and more) for selected paths. All selected paths will be updated together.</p>
                    <p><strong>When to use:</strong> After selecting paths, use this to modify their properties and attributes.</p>
                </div>
                <div className="tool-section" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>No paths or groups selected</p>
                    <button className="btn btn-primary" onClick={() => updateState({ currentPanel: 'workflow' })}>
                        Go to Workflow Manager
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Attribute Editor</h3>
                <p>Edit all attributes (ID, fill, stroke, opacity, and more) for selected paths or groups. All selected items will be updated together.</p>
                <p><strong>When to use:</strong> After selecting paths or groups, use this to modify their properties and attributes.</p>
            </div>

            <div className="tool-section" style={{ padding: '1rem', background: 'rgba(74, 144, 226, 0.1)', borderRadius: 'var(--border-radius)', border: '2px solid var(--primary-color)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                        <strong style={{ fontSize: '1rem' }}>Editing:</strong>
                        <span style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginLeft: '0.5rem' }}>
                            {selectedCount}
                        </span> {hasGroups && hasPaths ? 'item(s)' : hasGroups ? 'group(s)' : 'path(s)'}
                    </div>
                    <button className="btn btn-small" onClick={() => updateState({ currentPanel: 'workflow' })}>
                        Change Selection
                    </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxHeight: '60px', overflowY: 'auto' }}>
                    {hasPaths && <><strong>Paths:</strong> {selectedPaths.slice(0, 5).map(p => p?.id).filter(Boolean).join(', ')}</>}
                    {hasPaths && hasGroups && ', '}
                    {hasGroups && <><strong>Groups:</strong> {selectedGroups.slice(0, 5).map(g => g?.id).filter(Boolean).join(', ')}</>}
                    {selectedCount > 5 ? ` and ${selectedCount - 5} more` : ''}
                </div>
            </div>

            <div className="tool-section">
                <label className="form-label">Edit Attributes</label>
                
                {selectedCount === 1 && (
                    <div className="attribute-section" style={{ marginBottom: '1rem' }}>
                        <h4 className="attribute-section-title">{hasGroups && !hasPaths ? 'Group' : 'Path'} ID</h4>
                        <input
                            type="text"
                            className="form-input"
                            value={attributes.id}
                            onChange={(e) => setAttributes(prev => ({ ...prev, id: e.target.value }))}
                            placeholder={hasGroups && !hasPaths ? "group-id" : "path-id"}
                        />
                    </div>
                )}
                
                {/* Path-specific attributes - only show for paths */}
                {hasPaths && (
                    <>
                        <div className="attribute-section" style={{ marginBottom: '1rem' }}>
                            <h4 className="attribute-section-title">Fill</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    className="form-input"
                                    value={attributes.fill === 'none' ? '#000000' : attributes.fill}
                                    onChange={(e) => setAttributes(prev => ({ ...prev, fill: e.target.value }))}
                                    style={{ width: '60px', height: '40px' }}
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    value={attributes.fill}
                                    onChange={(e) => setAttributes(prev => ({ ...prev, fill: e.target.value }))}
                                    placeholder="#000000 or none"
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-small" onClick={() => setAttributes(prev => ({ ...prev, fill: 'none' }))}>
                                    None
                                </button>
                            </div>
                        </div>
                        
                        <div className="attribute-section" style={{ marginBottom: '1rem' }}>
                            <h4 className="attribute-section-title">Stroke</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <input
                                    type="color"
                                    className="form-input"
                                    value={attributes.stroke === 'none' ? '#000000' : attributes.stroke}
                                    onChange={(e) => setAttributes(prev => ({ ...prev, stroke: e.target.value }))}
                                    style={{ width: '60px', height: '40px' }}
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    value={attributes.stroke}
                                    onChange={(e) => setAttributes(prev => ({ ...prev, stroke: e.target.value }))}
                                    placeholder="#000000 or none"
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-small" onClick={() => setAttributes(prev => ({ ...prev, stroke: 'none' }))}>
                                    None
                                </button>
                            </div>
                            <div>
                                <label className="form-label">Stroke Width</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={attributes.strokeWidth}
                                    onChange={(e) => setAttributes(prev => ({ ...prev, strokeWidth: e.target.value }))}
                                    step="0.1"
                                    min="0"
                                />
                            </div>
                        </div>
                    </>
                )}
                
                <div className="attribute-section" style={{ marginBottom: '1rem' }}>
                    <h4 className="attribute-section-title">Opacity</h4>
                    <input
                        type="range"
                        className="form-input"
                        value={attributes.opacity}
                        onChange={(e) => setAttributes(prev => ({ ...prev, opacity: e.target.value }))}
                        step="0.01"
                        min="0"
                        max="1"
                    />
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {Math.round(parseFloat(attributes.opacity) * 100)}%
                    </div>
                </div>
                
                <div className="attribute-section" style={{ marginBottom: '1rem' }}>
                    <h4 className="attribute-section-title">Other Attributes</h4>
                    <div style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label">Transform</label>
                        <input
                            type="text"
                            className="form-input"
                            value={attributes.transform}
                            onChange={(e) => setAttributes(prev => ({ ...prev, transform: e.target.value }))}
                            placeholder="translate(0,0) scale(1) rotate(0)"
                        />
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label">Class</label>
                        <input
                            type="text"
                            className="form-input"
                            value={attributes.class}
                            onChange={(e) => setAttributes(prev => ({ ...prev, class: e.target.value }))}
                            placeholder="css-class-name"
                        />
                    </div>
                    <div>
                        <label className="form-label">Data Region</label>
                        <input
                            type="text"
                            className="form-input"
                            value={attributes.dataRegion}
                            onChange={(e) => setAttributes(prev => ({ ...prev, dataRegion: e.target.value }))}
                            placeholder="region-name"
                        />
                    </div>
                </div>
                
                <div style={{ marginTop: '1rem' }}>
                    <button className="btn btn-primary" onClick={handleSaveAttributes} style={{ width: '100%' }}>
                        Apply to Selected {hasGroups && hasPaths ? 'Items' : hasGroups ? 'Groups' : 'Paths'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttributesTool;

