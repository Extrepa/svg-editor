import { useState, useCallback, useRef } from 'react';
import type { AppState } from '../types';

const initialState: AppState = {
    svgData: null,
    svgElement: null,
    paths: [],
    groups: [],
    pathIdCounter: 0,
    selectedPaths: new Set(),
    hoveredPathId: null,
    selectionSource: null,
    history: [],
    historyIndex: -1,
    maxHistory: 100,
    currentTool: 'select',
    currentPanel: 'preview',
    backgroundMode: (localStorage.getItem('backgroundMode') as AppState['backgroundMode']) || 'color',
    previewBgColor: '#ffffff',
    spacePanning: false,
    templates: JSON.parse(localStorage.getItem('svgTemplates') || '[]'),
    nodeEditorActive: false,
    nodeHandles: [],
    editingPathId: null,
    snapToGrid: true,
    snapToPoint: false,
    snapDistance: 10,
    gridSize: 10,
    showGridOverlay: false,
    isMarqueeSelecting: false,
    marqueeStart: null,
    clipboardPaths: [],
    resizeHandles: [],
    isResizing: false,
    resizeHandleType: null,
    pathDragEnabled: true,
    isDraggingPath: false,
    dragStartPoint: null,
    shapeCreationMode: null,
    shapeCreationStart: null,
    currentZoom: 1,
};

export function useAppState() {
    const [state, setState] = useState<AppState>(initialState);
    const stateRef = useRef(state);
    stateRef.current = state;

    const updateState = useCallback((updates: Partial<AppState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    const setSelectedPaths = useCallback((paths: Set<string>) => {
        setState(prev => ({ ...prev, selectedPaths: paths }));
    }, []);

    const addSelectedPath = useCallback((pathId: string) => {
        setState(prev => {
            const newSet = new Set(prev.selectedPaths);
            newSet.add(pathId);
            return { ...prev, selectedPaths: newSet };
        });
    }, []);

    const removeSelectedPath = useCallback((pathId: string) => {
        setState(prev => {
            const newSet = new Set(prev.selectedPaths);
            newSet.delete(pathId);
            return { ...prev, selectedPaths: newSet };
        });
    }, []);

    const clearSelection = useCallback(() => {
        setState(prev => ({ ...prev, selectedPaths: new Set() }));
    }, []);

    return {
        state,
        stateRef,
        updateState,
        setSelectedPaths,
        addSelectedPath,
        removeSelectedPath,
        clearSelection,
    };
}
