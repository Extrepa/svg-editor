import { useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useHistory } from './useHistory';
import { usePathExtraction } from './usePathExtraction';
import { useSVGRenderer } from './useSVGRenderer';
import type { PathData } from '../types';

export function useKeyboardShortcuts() {
    const { state, updateState, setSelectedPaths, clearSelection } = useAppContext();
    const { undo, redo, saveState } = useHistory();
    const { extractPaths, extractGroups } = usePathExtraction();
    const { renderSVG } = useSVGRenderer();

    const copySelectedPaths = useCallback(() => {
        if (state.selectedPaths.size === 0) return;
        
        const clipboardPaths: PathData[] = [];
        state.selectedPaths.forEach(pathId => {
            const path = state.paths.find(p => p.id === pathId);
            if (path) {
                clipboardPaths.push({
                    ...path,
                    element: path.element.cloneNode(true) as SVGPathElement,
                });
            }
        });
        
        updateState({ clipboardPaths });
        
        // Also copy to system clipboard if possible
        if (navigator.clipboard && navigator.clipboard.writeText) {
            const allPaths = clipboardPaths.map(p => {
                const serializer = new XMLSerializer();
                return serializer.serializeToString(p.element);
            }).join('\n');
            navigator.clipboard.writeText(allPaths).catch(() => {
                // Ignore clipboard errors
            });
        }
    }, [state.selectedPaths, state.paths, updateState]);

    const pastePaths = useCallback(() => {
        if (state.clipboardPaths.length === 0 || !state.svgElement) return;
        
        saveState();
        
        const newPaths: PathData[] = [];
        state.clipboardPaths.forEach(clipboardPath => {
            const cloned = clipboardPath.element.cloneNode(true) as SVGPathElement;
            const newId = `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            cloned.setAttribute('id', newId);
            
            // Offset position slightly
            const transform = clipboardPath.transform || '';
            const offset = 20;
            const newTransform = transform 
                ? `${transform} translate(${offset}, ${offset})`
                : `translate(${offset}, ${offset})`;
            cloned.setAttribute('transform', newTransform);
            
            state.svgElement!.appendChild(cloned);
            
            newPaths.push({
                ...clipboardPath,
                id: newId,
                element: cloned,
                transform: newTransform,
            });
        });
        
        // Select newly pasted paths
        const newSelectedPaths = new Set(newPaths.map(p => p.id));
        setSelectedPaths(newSelectedPaths);
        
        extractPaths();
        renderSVG();
    }, [state.clipboardPaths, state.svgElement, saveState, setSelectedPaths, extractPaths, renderSVG]);

    const duplicateSelectedPaths = useCallback(() => {
        if (state.selectedPaths.size === 0 || !state.svgElement) return;
        
        saveState();
        
        const newPaths: PathData[] = [];
        const newSelectedPaths = new Set<string>();
        
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
            
            newPaths.push({
                ...path,
                id: newId,
                element: cloned,
                transform: newTransform,
            });
            
            newSelectedPaths.add(newId);
        });
        
        setSelectedPaths(newSelectedPaths);
        extractPaths();
        renderSVG();
    }, [state.selectedPaths, state.paths, state.svgElement, saveState, setSelectedPaths, extractPaths, renderSVG]);

    const deleteSelectedPaths = useCallback(() => {
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
    }, [state.selectedPaths, state.paths, state.svgElement, saveState, clearSelection, extractPaths, extractGroups, renderSVG]);

    const selectAllPaths = useCallback(() => {
        const allIds = new Set(state.paths.map(p => p.id));
        setSelectedPaths(allIds);
    }, [state.paths, setSelectedPaths]);

    const nudgePaths = useCallback((dx: number, dy: number) => {
        if (state.selectedPaths.size === 0 || !state.svgElement) return;
        
        saveState();
        
        state.selectedPaths.forEach(pathId => {
            const path = state.paths.find(p => p.id === pathId);
            if (!path) return;
            
            const transform = path.transform || '';
            const translateMatch = transform.match(/translate\(([^)]+)\)/);
            let currentX = 0;
            let currentY = 0;
            
            if (translateMatch) {
                const coords = translateMatch[1].split(',').map(Number);
                currentX = coords[0] || 0;
                currentY = coords[1] || 0;
            }
            
            const newX = state.snapToGrid 
                ? Math.round((currentX + dx) / state.gridSize) * state.gridSize
                : currentX + dx;
            const newY = state.snapToGrid
                ? Math.round((currentY + dy) / state.gridSize) * state.gridSize
                : currentY + dy;
            
            const newTransform = transform
                ? transform.replace(/translate\([^)]+\)/, `translate(${newX}, ${newY})`)
                : `translate(${newX}, ${newY})`;
            
            path.element.setAttribute('transform', newTransform);
            path.transform = newTransform;
        });
        
        renderSVG();
    }, [state.selectedPaths, state.paths, state.svgElement, state.snapToGrid, state.gridSize, saveState, renderSVG]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                (target.tagName === 'SELECT' && e.key !== 'Escape')
            ) {
                // Allow Delete/Backspace in inputs
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    return;
                }
                // Allow Escape to close dialogs
                if (e.key === 'Escape') {
                    return;
                }
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

            // Undo: Ctrl/Cmd + Z
            if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                setTimeout(() => {
                    extractPaths();
                    extractGroups();
                    renderSVG();
                }, 0);
                return;
            }

            // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
            if (ctrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
                setTimeout(() => {
                    extractPaths();
                    extractGroups();
                    renderSVG();
                }, 0);
                return;
            }

            // Copy: Ctrl/Cmd + C
            if (ctrlOrCmd && e.key === 'c') {
                e.preventDefault();
                copySelectedPaths();
                return;
            }

            // Paste: Ctrl/Cmd + V
            if (ctrlOrCmd && e.key === 'v') {
                e.preventDefault();
                pastePaths();
                return;
            }

            // Duplicate: Ctrl/Cmd + D
            if (ctrlOrCmd && e.key === 'd') {
                e.preventDefault();
                duplicateSelectedPaths();
                return;
            }

            // Select All: Ctrl/Cmd + A
            if (ctrlOrCmd && e.key === 'a') {
                e.preventDefault();
                selectAllPaths();
                return;
            }

            // Delete/Backspace: Delete selected paths
            if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedPaths.size > 0) {
                e.preventDefault();
                deleteSelectedPaths();
                return;
            }

            // Escape: Deselect all / Cancel shape placement
            if (e.key === 'Escape') {
                e.preventDefault();
                clearSelection();
                updateState({ shapeCreationMode: null });
                return;
            }

            // Arrow Keys: Nudge selected objects
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const nudgeAmount = e.shiftKey ? 10 : 1;
                switch (e.key) {
                    case 'ArrowUp':
                        nudgePaths(0, -nudgeAmount);
                        break;
                    case 'ArrowDown':
                        nudgePaths(0, nudgeAmount);
                        break;
                    case 'ArrowLeft':
                        nudgePaths(-nudgeAmount, 0);
                        break;
                    case 'ArrowRight':
                        nudgePaths(nudgeAmount, 0);
                        break;
                }
                return;
            }

            // Tool switching shortcuts (only when not using modifier keys)
            if (!ctrlOrCmd && !e.altKey && !e.shiftKey) {
                // V: Switch to Workflow Manager
                if (e.key === 'v' || e.key === 'V') {
                    e.preventDefault();
                    updateState({ currentPanel: 'workflow' });
                    return;
                }

                // P: Switch to Node Editor
                if (e.key === 'p' || e.key === 'P') {
                    e.preventDefault();
                    updateState({ currentPanel: 'node-editor' });
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        undo,
        redo,
        copySelectedPaths,
        pastePaths,
        duplicateSelectedPaths,
        deleteSelectedPaths,
        selectAllPaths,
        nudgePaths,
        clearSelection,
        updateState,
        state.selectedPaths.size,
        extractPaths,
        extractGroups,
        renderSVG,
    ]);

    return {
        copySelectedPaths,
        pastePaths,
        duplicateSelectedPaths,
        deleteSelectedPaths,
        selectAllPaths,
        nudgePaths,
    };
}

