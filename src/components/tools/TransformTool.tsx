import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

const TransformTool: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotate: 0 });

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

    const updateTransformValue = (type: 'x' | 'y' | 'scale' | 'rotate', value: number) => {
        setTransform(prev => ({ ...prev, [type]: value }));
    };

    const adjustTransform = (type: 'x' | 'y' | 'scale' | 'rotate', delta: number) => {
        setTransform(prev => {
            const current = prev[type];
            let newValue = current + delta;
            
            // Clamp values
            if (type === 'x' || type === 'y') {
                newValue = Math.max(-500, Math.min(500, newValue));
            } else if (type === 'scale') {
                newValue = Math.max(0.1, Math.min(5, newValue));
            } else if (type === 'rotate') {
                newValue = Math.max(-360, Math.min(360, newValue));
            }
            
            return { ...prev, [type]: newValue };
        });
    };

    const resetTransform = () => {
        setTransform({ x: 0, y: 0, scale: 1, rotate: 0 });
    };

    const applyTransform = () => {
        if (selectedCount === 0) {
            alert('Please select paths or groups first');
            return;
        }
        
        saveState();
        const { x, y, scale, rotate } = transform;
        
        state.selectedPaths.forEach(itemId => {
            // Try to find as path first
            const path = state.paths.find(p => p.id === itemId);
            if (path) {
                let currentTransform = path.transform || '';
                const transforms = [];
                
                if (x !== 0 || y !== 0) {
                    transforms.push(`translate(${x}, ${y})`);
                }
                if (scale !== 1) {
                    transforms.push(`scale(${scale})`);
                }
                if (rotate !== 0) {
                    transforms.push(`rotate(${rotate})`);
                }
                
                if (currentTransform && transforms.length > 0) {
                    currentTransform += ' ' + transforms.join(' ');
                } else if (transforms.length > 0) {
                    currentTransform = transforms.join(' ');
                }
                
                if (currentTransform) {
                    path.element.setAttribute('transform', currentTransform);
                    path.transform = currentTransform;
                }
                return;
            }
            
            // Try to find as group
            const group = state.groups.find(g => g.id === itemId);
            if (group) {
                let currentTransform = group.transform || '';
                const transforms = [];
                
                if (x !== 0 || y !== 0) {
                    transforms.push(`translate(${x}, ${y})`);
                }
                if (scale !== 1) {
                    transforms.push(`scale(${scale})`);
                }
                if (rotate !== 0) {
                    transforms.push(`rotate(${rotate})`);
                }
                
                if (currentTransform && transforms.length > 0) {
                    currentTransform += ' ' + transforms.join(' ');
                } else if (transforms.length > 0) {
                    currentTransform = transforms.join(' ');
                }
                
                if (currentTransform) {
                    group.element.setAttribute('transform', currentTransform);
                    group.transform = currentTransform;
                }
            }
        });
        
        renderSVG();
        resetTransform();
    };

    if (selectedCount === 0) {
        return (
            <div className="tool-panel-content">
                <div className="tool-explanation">
                    <h3>Transform Controller</h3>
                    <p>Move, scale, and rotate selected paths or groups using sliders and buttons. Transformations are applied relative to existing transforms.</p>
                    <p><strong>When to use:</strong> After selecting paths or groups, use this to position and adjust them.</p>
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
                <h3>Transform Controller</h3>
                <p>Move, scale, and rotate selected paths using sliders and buttons. Transformations are applied relative to existing transforms.</p>
                <p><strong>When to use:</strong> After selecting paths, use this to position and adjust them.</p>
            </div>

            <div className="tool-section" style={{ padding: '1rem', background: 'rgba(74, 144, 226, 0.1)', borderRadius: 'var(--border-radius)', border: '2px solid var(--primary-color)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                        <strong style={{ fontSize: '1rem' }}>Transforming:</strong>
                        <span style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginLeft: '0.5rem' }}>
                            {selectedCount}
                        </span> {hasGroups && hasPaths ? 'item(s)' : hasGroups ? 'group(s)' : 'path(s)'}
                    </div>
                    <button className="btn btn-small" onClick={() => updateState({ currentPanel: 'workflow' })}>
                        Change Selection
                    </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {hasPaths && selectedPaths.filter((p): p is NonNullable<typeof p> => p !== undefined).slice(0, 3).map(p => p.id).join(', ')}
                    {hasPaths && hasGroups && ', '}
                    {hasGroups && selectedGroups.filter((g): g is NonNullable<typeof g> => g !== undefined).slice(0, 3).map(g => g.id).join(', ')}
                    {selectedCount > 3 ? ` and ${selectedCount - 3} more` : ''}
                </div>
            </div>

            <div className="tool-section">
                <label className="form-label">Transform {selectedCount} Selected {hasGroups && hasPaths ? 'Item(s)' : hasGroups ? 'Group(s)' : 'Path(s)'}</label>
                
                {/* Position */}
                <div className="transform-section" style={{ marginBottom: '1.5rem' }}>
                    <h4 className="transform-section-title">Position</h4>
                    <div className="transform-control" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label">X: {Math.round(transform.x)}</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="btn btn-small" onClick={() => adjustTransform('x', -10)}>−10</button>
                            <button className="btn btn-small" onClick={() => adjustTransform('x', -1)}>−1</button>
                            <input
                                type="range"
                                className="transform-slider"
                                min="-500"
                                max="500"
                                value={transform.x}
                                step="1"
                                onChange={(e) => updateTransformValue('x', parseFloat(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-small" onClick={() => adjustTransform('x', 1)}>+1</button>
                            <button className="btn btn-small" onClick={() => adjustTransform('x', 10)}>+10</button>
                        </div>
                    </div>
                    <div className="transform-control">
                        <label className="form-label">Y: {Math.round(transform.y)}</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="btn btn-small" onClick={() => adjustTransform('y', -10)}>−10</button>
                            <button className="btn btn-small" onClick={() => adjustTransform('y', -1)}>−1</button>
                            <input
                                type="range"
                                className="transform-slider"
                                min="-500"
                                max="500"
                                value={transform.y}
                                step="1"
                                onChange={(e) => updateTransformValue('y', parseFloat(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-small" onClick={() => adjustTransform('y', 1)}>+1</button>
                            <button className="btn btn-small" onClick={() => adjustTransform('y', 10)}>+10</button>
                        </div>
                    </div>
                </div>

                {/* Scale */}
                <div className="transform-section" style={{ marginBottom: '1.5rem' }}>
                    <h4 className="transform-section-title">Scale</h4>
                    <div className="transform-control">
                        <label className="form-label">Scale: {transform.scale.toFixed(2)}</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="btn btn-small" onClick={() => adjustTransform('scale', -0.1)}>−0.1</button>
                            <button className="btn btn-small" onClick={() => adjustTransform('scale', -0.01)}>−0.01</button>
                            <input
                                type="range"
                                className="transform-slider"
                                min="0.1"
                                max="5"
                                value={transform.scale}
                                step="0.01"
                                onChange={(e) => updateTransformValue('scale', parseFloat(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-small" onClick={() => adjustTransform('scale', 0.01)}>+0.01</button>
                            <button className="btn btn-small" onClick={() => adjustTransform('scale', 0.1)}>+0.1</button>
                        </div>
                    </div>
                </div>

                {/* Rotation */}
                <div className="transform-section" style={{ marginBottom: '1.5rem' }}>
                    <h4 className="transform-section-title">Rotation</h4>
                    <div className="transform-control">
                        <label className="form-label">Degrees: {Math.round(transform.rotate)}°</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="btn btn-small" onClick={() => adjustTransform('rotate', -15)}>−15°</button>
                            <button className="btn btn-small" onClick={() => adjustTransform('rotate', -1)}>−1°</button>
                            <input
                                type="range"
                                className="transform-slider"
                                min="-360"
                                max="360"
                                value={transform.rotate}
                                step="1"
                                onChange={(e) => updateTransformValue('rotate', parseFloat(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-small" onClick={() => adjustTransform('rotate', 1)}>+1°</button>
                            <button className="btn btn-small" onClick={() => adjustTransform('rotate', 15)}>+15°</button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={applyTransform} style={{ flex: 1 }}>
                        Apply Transform
                    </button>
                    <button className="btn" onClick={resetTransform}>Reset</button>
                </div>
            </div>
        </div>
    );
};

export default TransformTool;

