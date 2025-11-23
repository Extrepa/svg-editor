import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useHistory } from './useHistory';
import { usePathExtraction } from './usePathExtraction';
import { useSVGRenderer } from './useSVGRenderer';

export function useLayerReordering() {
    const { state } = useAppContext();
    const { saveState } = useHistory();
    const { extractPaths, extractGroups } = usePathExtraction();
    const { renderSVG } = useSVGRenderer();

    const moveLayerUp = useCallback((layerId: string, type: 'path' | 'group') => {
        if (!state.svgElement) return;

        saveState();

        const element = type === 'path'
            ? state.paths.find(p => p.id === layerId)?.element
            : state.groups.find(g => g.id === layerId)?.element;

        if (!element) return;

        const nextSibling = element.nextSibling;
        if (nextSibling) {
            element.parentNode?.insertBefore(element, nextSibling.nextSibling);
            extractPaths();
            extractGroups();
            renderSVG();
        }
    }, [state.svgElement, state.paths, state.groups, saveState, extractPaths, extractGroups, renderSVG]);

    const moveLayerDown = useCallback((layerId: string, type: 'path' | 'group') => {
        if (!state.svgElement) return;

        saveState();

        const element = type === 'path'
            ? state.paths.find(p => p.id === layerId)?.element
            : state.groups.find(g => g.id === layerId)?.element;

        if (!element) return;

        const previousSibling = element.previousSibling;
        if (previousSibling) {
            element.parentNode?.insertBefore(element, previousSibling);
            extractPaths();
            extractGroups();
            renderSVG();
        }
    }, [state.svgElement, state.paths, state.groups, saveState, extractPaths, extractGroups, renderSVG]);

    const reorderLayers = useCallback((fromIndex: number, toIndex: number, layers: Array<{ id: string; type: 'path' | 'group'; element: SVGElement }>) => {
        if (!state.svgElement || fromIndex === toIndex) return;

        saveState();

        // Get elements from layers array (already in correct order)
        const elements = layers.map(layer => layer.element).filter(Boolean) as SVGElement[];

        if (elements.length === 0) return;

        // Find the parent (should be the SVG element or a group)
        const firstElement = elements[0];
        const parent = firstElement.parentNode;
        if (!parent || !state.svgElement.contains(firstElement)) return;

        // Get current order in DOM
        const allChildren = Array.from(parent.childNodes).filter(
            node => node.nodeType === Node.ELEMENT_NODE
        ) as SVGElement[];

        // Find indices in actual DOM
        const fromElement = elements[fromIndex];
        const toElement = elements[toIndex];
        
        const fromDomIndex = allChildren.indexOf(fromElement);
        const toDomIndex = allChildren.indexOf(toElement);

        if (fromDomIndex === -1 || toDomIndex === -1) return;

        // Reorder in DOM
        if (fromDomIndex < toDomIndex) {
            // Moving down
            parent.insertBefore(fromElement, toElement.nextSibling);
        } else {
            // Moving up
            parent.insertBefore(fromElement, toElement);
        }

        extractPaths();
        extractGroups();
        renderSVG();
    }, [state.svgElement, saveState, extractPaths, extractGroups, renderSVG]);

    return {
        moveLayerUp,
        moveLayerDown,
        reorderLayers,
    };
}

