import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export function usePathSelection() {
    const { state, addSelectedPath, removeSelectedPath, clearSelection } = useAppContext();

    const togglePathSelection = useCallback((pathId: string) => {
        if (state.selectedPaths.has(pathId)) {
            removeSelectedPath(pathId);
        } else {
            addSelectedPath(pathId);
        }
    }, [state.selectedPaths, addSelectedPath, removeSelectedPath]);

    const selectPath = useCallback((pathId: string, multiSelect: boolean = false) => {
        if (multiSelect) {
            togglePathSelection(pathId);
        } else {
            clearSelection();
            addSelectedPath(pathId);
        }
    }, [togglePathSelection, clearSelection, addSelectedPath]);

    const updateSelectionVisual = useCallback(() => {
        // This will be called after rendering to update visual feedback
        const wrapper = document.getElementById('svgWrapper');
        if (!wrapper) return;

        const svg = wrapper.querySelector('svg');
        if (!svg) return;

        // Remove previous selection highlights and boxes
        svg.querySelectorAll('[data-selected="true"]').forEach(el => {
            el.removeAttribute('data-selected');
            const path = el as SVGPathElement;
            if (path.style) {
                path.style.filter = path.dataset._prevFilter || '';
                path.style.outline = '';
            }
        });

        // Remove selection boxes
        svg.querySelectorAll('.selection-box').forEach(box => box.remove());

        // Add selection highlights and boxes
        state.selectedPaths.forEach(pathId => {
            const path = svg.querySelector(`#${pathId}`) as SVGPathElement;
            if (path) {
                path.setAttribute('data-selected', 'true');
                path.dataset._prevFilter = path.style.filter || '';
                
                // Enhanced visual feedback
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const shadowColor = isDark ? 'rgba(91, 163, 245, 0.8)' : 'rgba(74, 144, 226, 0.8)';
                path.style.filter = `drop-shadow(0 0 4px ${shadowColor}) drop-shadow(0 0 8px ${shadowColor.replace('0.8', '0.4')})`;
                
                // Add selection box (bounding box)
                try {
                    const bbox = path.getBBox();
                    const selectionBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    selectionBox.setAttribute('class', 'selection-box');
                    selectionBox.setAttribute('x', String(bbox.x - 2));
                    selectionBox.setAttribute('y', String(bbox.y - 2));
                    selectionBox.setAttribute('width', String(bbox.width + 4));
                    selectionBox.setAttribute('height', String(bbox.height + 4));
                    selectionBox.setAttribute('fill', 'none');
                    selectionBox.setAttribute('stroke', shadowColor);
                    selectionBox.setAttribute('stroke-width', '2');
                    selectionBox.setAttribute('stroke-dasharray', '5,5');
                    selectionBox.setAttribute('pointer-events', 'none');
                    svg.appendChild(selectionBox);
                } catch (e) {
                    // BBox might fail for some elements, ignore
                }
            }
        });

        // Also highlight selected groups
        state.groups.forEach(group => {
            if (state.selectedPaths.has(group.id)) {
                const groupEl = group.element;
                groupEl.setAttribute('data-selected', 'true');
                
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const shadowColor = isDark ? 'rgba(91, 163, 245, 0.8)' : 'rgba(74, 144, 226, 0.8)';
                groupEl.style.filter = `drop-shadow(0 0 4px ${shadowColor}) drop-shadow(0 0 8px ${shadowColor.replace('0.8', '0.4')})`;
            }
        });
    }, [state.selectedPaths, state.groups]);

    return {
        selectPath,
        togglePathSelection,
        updateSelectionVisual,
    };
}

