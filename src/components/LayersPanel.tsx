import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useLayerReordering } from '../hooks/useLayerReordering';
import { useSVGRenderer } from '../hooks/useSVGRenderer';
import { useHistory } from '../hooks/useHistory';
import { Eye, EyeOff, GripVertical, Search } from 'lucide-react';

interface LayersPanelProps {
    onLayerSelect?: (layerId: string, type: 'path' | 'group') => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ onLayerSelect }) => {
    const { state, setSelectedPaths, addSelectedPath, removeSelectedPath } = useAppContext();
    const { reorderLayers } = useLayerReordering();
    const { renderSVG } = useSVGRenderer();
    const { saveState } = useHistory();
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'path' | 'group'; index: number } | null>(null);

    // Build layers list from groups and ungrouped paths
    const buildLayersList = () => {
        const layers: Array<{ id: string; type: 'path' | 'group'; name: string; element: SVGElement; visible: boolean }> = [];
        
        // Add groups
        state.groups.forEach(group => {
            const visible = group.element.getAttribute('display') !== 'none' && 
                          group.element.getAttribute('visibility') !== 'hidden';
            layers.push({
                id: group.id,
                type: 'group',
                name: group.id || `Group ${group.id}`,
                element: group.element,
                visible: visible !== false,
            });
        });
        
        // Add ungrouped paths
        state.paths.forEach(path => {
            if (!path.parentGroup) {
                const visible = path.element.getAttribute('display') !== 'none' && 
                              path.element.getAttribute('visibility') !== 'hidden';
                layers.push({
                    id: path.id,
                    type: 'path',
                    name: path.id || `Path ${path.id}`,
                    element: path.element,
                    visible: visible !== false,
                });
            }
        });
        
        // Reverse for display (top layer first)
        return layers.reverse();
    };

    const layers = buildLayersList();
    
    // Filter layers by search
    const filteredLayers = layers.filter(layer =>
        layer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLayerClick = (layerId: string, type: 'path' | 'group', event: React.MouseEvent) => {
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            // Multi-select
            if (state.selectedPaths.has(layerId)) {
                removeSelectedPath(layerId);
            } else {
                addSelectedPath(layerId);
            }
        } else {
            // Single select
            setSelectedPaths(new Set([layerId]));
        }
        
        if (onLayerSelect) {
            onLayerSelect(layerId, type);
        }
    };

    const handleToggleVisibility = (layerId: string, type: 'path' | 'group', event: React.MouseEvent) => {
        event.stopPropagation();
        
        const layer = type === 'path' 
            ? state.paths.find(p => p.id === layerId)
            : state.groups.find(g => g.id === layerId);
        
        if (layer) {
            saveState();
            const element = layer.element;
            const currentDisplay = element.getAttribute('display');
            const currentVisibility = element.getAttribute('visibility');
            
            if (currentDisplay === 'none' || currentVisibility === 'hidden') {
                element.removeAttribute('display');
                element.removeAttribute('visibility');
            } else {
                element.setAttribute('display', 'none');
            }
            
            // Re-render SVG to reflect visibility change immediately
            renderSVG();
        }
    };

    const handleDragStart = (e: React.DragEvent, layerId: string, type: 'path' | 'group', index: number) => {
        setDraggedItem({ id: layerId, type, index });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (!draggedItem) return;
        
        // Reorder layers using the hook
        const allLayers = buildLayersList();
        const fromIndex = allLayers.findIndex(l => l.id === draggedItem.id);
        
        if (fromIndex !== -1 && fromIndex !== targetIndex) {
            const layersForReorder = allLayers.map(l => ({
                id: l.id,
                type: l.type,
                element: l.element,
            }));
            reorderLayers(fromIndex, targetIndex, layersForReorder);
        }
        
        setDraggedItem(null);
    };

    const isSelected = (layerId: string) => {
        return state.selectedPaths.has(layerId);
    };

    const getLayerIcon = (type: 'path' | 'group') => {
        if (type === 'group') return '📁';
        return '📄';
    };

    return (
        <div className="layers-panel">
            <div className="layers-panel-header">
                <div className="layers-search">
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search layers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="layers-search-input"
                    />
                </div>
            </div>
            
            <div className="layers-list">
                {filteredLayers.length === 0 ? (
                    <div className="layers-empty">
                        {searchQuery ? 'No layers found' : 'No layers yet'}
                    </div>
                ) : (
                    filteredLayers.map((layer, index) => {
                        const selected = isSelected(layer.id);
                        return (
                            <div
                                key={layer.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, layer.id, layer.type, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                className={`layer-item ${selected ? 'selected' : ''} ${draggedItem?.id === layer.id ? 'dragging' : ''}`}
                                onClick={(e) => handleLayerClick(layer.id, layer.type, e)}
                            >
                                <div className="layer-drag-handle">
                                    <GripVertical size={14} />
                                </div>
                                
                                <button
                                    className="layer-visibility"
                                    onClick={(e) => handleToggleVisibility(layer.id, layer.type, e)}
                                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                                >
                                    {layer.visible ? (
                                        <Eye size={14} />
                                    ) : (
                                        <EyeOff size={14} />
                                    )}
                                </button>
                                
                                <div className="layer-icon">
                                    {getLayerIcon(layer.type)}
                                </div>
                                
                                <span className="layer-name" title={layer.name}>
                                    {layer.name}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LayersPanel;

