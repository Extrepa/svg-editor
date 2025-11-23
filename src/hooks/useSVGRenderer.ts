import { useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePathSelection } from './usePathSelection';

export function useSVGRenderer() {
    const { state, updateState } = useAppContext();
    const { selectPath, updateSelectionVisual } = usePathSelection();
    const svgWrapperRef = useRef<HTMLDivElement | null>(null);
    
    // Use refs to store latest state values to avoid stale closures in event listeners
    const stateRef = useRef(state);
    const selectPathRef = useRef(selectPath);
    const updateStateRef = useRef(updateState);
    const updateSelectionVisualRef = useRef(updateSelectionVisual);
    
    // Keep refs in sync with current values
    useEffect(() => {
        stateRef.current = state;
    }, [state]);
    
    useEffect(() => {
        selectPathRef.current = selectPath;
    }, [selectPath]);
    
    useEffect(() => {
        updateStateRef.current = updateState;
    }, [updateState]);
    
    useEffect(() => {
        updateSelectionVisualRef.current = updateSelectionVisual;
    }, [updateSelectionVisual]);

    useEffect(() => {
        svgWrapperRef.current = document.getElementById('svgWrapper') as HTMLDivElement;
    }, []);

    const renderMiniMap = useCallback(() => {
        const miniMapContent = document.getElementById('miniMapContent');
        if (!miniMapContent || !state.svgElement) return;

        const wrapper = document.getElementById('svgWrapper');
        if (!wrapper) return;

        const svg = wrapper.querySelector('svg');
        if (!svg) return;

        miniMapContent.innerHTML = '';

        try {
            const bbox = svg.getBBox();
            const viewBox = svg.getAttribute('viewBox');
            
            let svgWidth = 0, svgHeight = 0;
            if (viewBox) {
                const [, , w, h] = viewBox.split(' ').map(Number);
                svgWidth = w;
                svgHeight = h;
            } else {
                svgWidth = bbox.width + bbox.x * 2;
                svgHeight = bbox.height + bbox.y * 2;
            }

            // Create mini-map SVG
            const miniSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            miniSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
            miniSvg.style.width = '100%';
            miniSvg.style.height = '100%';
            miniSvg.style.border = '1px solid rgba(0,0,0,0.1)';
            miniSvg.style.borderRadius = '4px';

            // Clone and scale down the SVG content
            const svgClone = state.svgElement.cloneNode(true) as SVGSVGElement;
            svgClone.style.width = '100%';
            svgClone.style.height = '100%';
            miniSvg.appendChild(svgClone);

            miniMapContent.appendChild(miniSvg);
        } catch (e) {
            console.warn('Could not render mini-map:', e);
        }
    }, [state.svgElement]);

    const attachPathListeners = useCallback((svgClone: SVGSVGElement) => {
        const paths = svgClone.querySelectorAll('path');
        paths.forEach(path => {
            const pathElement = path as SVGPathElement;
            
            // Mouse enter - hover effect
            pathElement.addEventListener('mouseenter', (e) => {
                const target = e.target as SVGPathElement;
                const pathId = target.id;
                
                // Access current state from ref to avoid stale closures
                const currentState = stateRef.current;
                
                // Update cursor based on active tool
                if (currentState.currentTool === 'move') {
                    target.style.cursor = 'move';
                } else if (currentState.currentTool === 'select') {
                    target.style.cursor = 'pointer';
                } else {
                    target.style.cursor = 'default';
                }
                
                // Hover effect (only if not selected)
                if (!currentState.selectedPaths.has(pathId)) {
                    target.dataset._prevFilter = target.style.filter || '';
                    target.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.25)) drop-shadow(0 0 6px rgba(0,0,0,0.15))';
                }
                
                updateStateRef.current({ hoveredPathId: pathId });
            });
            
            // Mouse leave - remove hover effect
            pathElement.addEventListener('mouseleave', (e) => {
                const target = e.target as SVGPathElement;
                const pathId = target.id;
                
                // Access current state from ref to avoid stale closures
                const currentState = stateRef.current;
                
                if (!currentState.selectedPaths.has(pathId)) {
                    target.style.filter = target.dataset._prevFilter || '';
                }
                target.style.cursor = '';
                
                if (currentState.hoveredPathId === pathId) {
                    updateStateRef.current({ hoveredPathId: null });
                }
            });
            
            // Mouse down - selection
            pathElement.addEventListener('mousedown', (e) => {
                const target = e.target as SVGPathElement;
                const pathId = target.id;
                const multiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
                
                // Use ref to access latest selectPath function
                selectPathRef.current(pathId, multiSelect);
                
                // Update selection visual after state update
                setTimeout(() => {
                    updateSelectionVisualRef.current();
                }, 0);
            });
        });
    }, []); // Empty dependency array since we use refs for all state access

    const applyBackgroundMods = useCallback(() => {
        const wrapper = svgWrapperRef.current || document.getElementById('svgWrapper');
        if (!wrapper) return;

        wrapper.classList.remove('grid', 'checkerboard');

        switch (state.backgroundMode) {
            case 'none':
                wrapper.style.backgroundColor = 'transparent';
                wrapper.style.backgroundImage = 'none';
                break;
            case 'color':
                wrapper.style.backgroundColor = state.previewBgColor;
                wrapper.style.backgroundImage = 'none';
                break;
            case 'grid':
                wrapper.style.backgroundColor = 'transparent';
                wrapper.classList.add('grid');
                break;
            case 'checkerboard':
                wrapper.style.backgroundColor = 'transparent';
                wrapper.classList.add('checkerboard');
                break;
        }
    }, [state.backgroundMode, state.previewBgColor]);

    const renderSVG = useCallback(() => {
        const wrapper = svgWrapperRef.current || document.getElementById('svgWrapper');
        if (!wrapper) return;

        wrapper.innerHTML = '';

        if (!state.svgElement) {
            const emptyDiv = document.getElementById('previewEmpty');
            const svgDiv = document.getElementById('previewSvg');
            if (emptyDiv) emptyDiv.style.display = 'flex';
            if (svgDiv) svgDiv.style.display = 'none';
            return;
        }

        const svgClone = state.svgElement.cloneNode(true) as SVGSVGElement;

        // Remove width/height attributes
        svgClone.removeAttribute('width');
        svgClone.removeAttribute('height');

        // Set preserveAspectRatio
        if (!svgClone.hasAttribute('preserveAspectRatio')) {
            svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }

        // Set explicit styles
        svgClone.style.width = '100%';
        svgClone.style.height = '100%';
        svgClone.style.maxWidth = 'none';
        svgClone.style.maxHeight = 'none';

        // Apply zoom transform
        if (state.currentZoom !== 1) {
            svgClone.style.transform = `scale(${state.currentZoom})`;
            svgClone.style.transformOrigin = 'center';
        }

        // Attach path listeners
        attachPathListeners(svgClone);

        wrapper.appendChild(svgClone);
        applyBackgroundMods();

        // Update selection visualization
        setTimeout(() => {
            updateSelectionVisual();
            renderMiniMap();
        }, 0);

        // Update UI visibility
        const emptyDiv = document.getElementById('previewEmpty');
        const svgDiv = document.getElementById('previewSvg');
        if (emptyDiv) emptyDiv.style.display = 'none';
        if (svgDiv) svgDiv.style.display = 'flex';
    }, [state.svgElement, state.currentZoom, applyBackgroundMods, updateSelectionVisual, attachPathListeners, renderMiniMap]);

    const fitToScreen = useCallback(() => {
        const wrapper = svgWrapperRef.current || document.getElementById('svgWrapper');
        if (!wrapper || !state.svgElement) {
            alert('No SVG loaded. Please load an SVG file first.');
            return;
        }

        const svg = wrapper.querySelector('svg');
        if (!svg) return;

        let contentWidth: number = 0, contentHeight: number = 0, contentX = 0, contentY = 0;

        try {
            const bbox = svg.getBBox();
            contentX = bbox.x;
            contentY = bbox.y;
            contentWidth = bbox.width;
            contentHeight = bbox.height;
        } catch (e) {
            // Fallback to viewBox
        }

        const viewBox = svg.getAttribute('viewBox');
        let width: number, height: number, minX = 0, minY = 0;

        if (viewBox) {
            const [x, y, w, h] = viewBox.split(' ').map(Number);
            minX = x || 0;
            minY = y || 0;
            width = w;
            height = h;

            if (contentWidth && contentHeight) {
                const contentMaxX = contentX + contentWidth;
                const contentMaxY = contentY + contentHeight;
                const viewBoxMaxX = minX + width;
                const viewBoxMaxY = minY + height;

                const actualMinX = Math.min(contentX, minX);
                const actualMinY = Math.min(contentY, minY);
                const actualMaxX = Math.max(contentMaxX, viewBoxMaxX);
                const actualMaxY = Math.max(contentMaxY, viewBoxMaxY);

                width = actualMaxX - actualMinX;
                height = actualMaxY - actualMinY;
                minX = actualMinX;
                minY = actualMinY;
            }
        } else if (contentWidth && contentHeight) {
            width = contentWidth;
            height = contentHeight;
            minX = contentX;
            minY = contentY;
        } else {
            alert('Could not determine SVG dimensions. SVG needs a viewBox or visible content.');
            return;
        }

        if (!width || !height) {
            alert('Could not determine SVG dimensions');
            return;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const padding = 40;
        const scale = Math.min(
            (wrapperRect.width - padding * 2) / width,
            (wrapperRect.height - padding * 2) / height
        );

        const finalScale = Math.max(scale, 1.0);
        updateState({ currentZoom: finalScale });
    }, [state.svgElement, updateState]);

    // Re-render mini-map when SVG changes
    useEffect(() => {
        if (state.svgElement) {
            renderMiniMap();
        }
    }, [state.svgElement, renderMiniMap]);

    return {
        renderSVG,
        applyBackgroundMods,
        fitToScreen,
        renderMiniMap,
    };
}

