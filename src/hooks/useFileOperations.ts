import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export function useFileOperations() {
    const { state, updateState } = useAppContext();

    const showError = useCallback((message: string) => {
        const errorDiv = document.getElementById('svgErrorDisplay');
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }

        const newErrorDiv = document.createElement('div');
        newErrorDiv.id = 'svgErrorDisplay';
        newErrorDiv.style.cssText = `
            position: absolute;
            top: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(220, 53, 69, 0.95);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            max-width: 500px;
            text-align: center;
            font-size: 0.875rem;
        `;
        newErrorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: space-between;">
                <span>⚠️ ${message}</span>
                <button onclick="document.getElementById('svgErrorDisplay')?.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; padding: 0 0.5rem;">×</button>
            </div>
        `;

        const previewContainer = document.getElementById('previewContainer');
        if (previewContainer) {
            previewContainer.appendChild(newErrorDiv);
        }

        setTimeout(() => {
            const err = document.getElementById('svgErrorDisplay');
            if (err) err.remove();
        }, 5000);
    }, []);

    const hideError = useCallback(() => {
        const errorDiv = document.getElementById('svgErrorDisplay');
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, []);

    const parseSVG = useCallback((svgText: string): SVGSVGElement | null => {
        if (!svgText || typeof svgText !== 'string' || svgText.trim().length === 0) {
            showError('Invalid SVG: File is empty');
            return null;
        }

        let parser: DOMParser;
        let doc: Document;
        let svg: SVGSVGElement;

        try {
            parser = new DOMParser();
            doc = parser.parseFromString(svgText, 'image/svg+xml');

            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                showError('Invalid SVG: XML parsing error. Please check the file format.');
                return null;
            }

            const rootElement = doc.documentElement;
            if (!rootElement || rootElement.tagName !== 'svg') {
                showError('Invalid SVG: Root element must be <svg>');
                return null;
            }
            svg = rootElement as unknown as SVGSVGElement;
        } catch (error) {
            showError(`Error parsing SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }

        hideError();

        // Update state with parsed SVG
        updateState({
            pathIdCounter: 0,
            history: [],
            historyIndex: -1,
            svgData: svgText,
            svgElement: svg,
            selectedPaths: new Set(),
            selectionSource: null,
        });

        return svg;
    }, [updateState, showError, hideError]);

    const loadSVGFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            if (!text || text.trim().length === 0) {
                showError('File is empty');
                return;
            }
            parseSVG(text);
        } catch (error) {
            showError(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [parseSVG, showError]);

    const saveSVG = useCallback((minify: boolean = false) => {
        if (!state.svgElement) return;

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(state.svgElement);

        if (minify) {
            // Basic minification
            svgString = svgString
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/\s+/g, ' ')
                .replace(/>\s+</g, '><')
                .trim();
        }

        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited.svg';
        a.click();
        URL.revokeObjectURL(url);
    }, [state.svgElement]);

    return {
        loadSVGFile,
        parseSVG,
        saveSVG,
        showError,
        hideError,
    };
}
