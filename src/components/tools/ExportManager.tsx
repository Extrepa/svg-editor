import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useFileOperations } from '../../hooks/useFileOperations';

const ExportManager: React.FC = () => {
    const { state } = useAppContext();
    const { saveSVG } = useFileOperations();
    const [minify, setMinify] = useState(true);

    const handleExportFull = () => {
        saveSVG(minify);
    };

    const handleExportSelected = () => {
        if (state.selectedPaths.size === 0) {
            alert('Please select paths first');
            return;
        }

        const serializer = new XMLSerializer();
        const svgNS = 'http://www.w3.org/2000/svg';
        const newSvg = document.createElementNS(svgNS, 'svg');
        newSvg.setAttribute('xmlns', svgNS);
        newSvg.setAttribute('viewBox', state.svgElement?.getAttribute('viewBox') || '0 0 100 100');
        
        state.selectedPaths.forEach(pathId => {
            const path = state.paths.find(p => p.id === pathId);
            if (path) {
                newSvg.appendChild(path.element.cloneNode(true));
            }
        });
        
        const svgString = serializer.serializeToString(newSvg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'selected-paths.svg';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopyToClipboard = async () => {
        if (state.selectedPaths.size === 0) {
            alert('Please select paths first');
            return;
        }

        const pathData = Array.from(state.selectedPaths)
            .map(id => {
                const path = state.paths.find(p => p.id === id);
                return path ? path.d : '';
            })
            .filter(Boolean)
            .join('\n');

        try {
            await navigator.clipboard.writeText(pathData);
            alert('Path data copied to clipboard!');
        } catch (error) {
            alert('Failed to copy to clipboard');
        }
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Export Manager</h3>
                <p>Export your SVG in multiple formats for different use cases. Export full SVG, selected paths, token maps, or copy data to clipboard.</p>
                <p><strong>When to use:</strong> At the end of your workflow. After optimizing and finalizing your design, use this to export in the format you need.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Optimization</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={minify}
                        onChange={(e) => setMinify(e.target.checked)}
                    />
                    <span>Minify SVG (remove comments, whitespace, round decimals)</span>
                </label>
            </div>

            <div className="tool-section">
                <label className="form-label">Export Options</label>
                <button className="btn btn-primary" onClick={handleExportFull} style={{ width: '100%', marginBottom: '0.75rem' }}>
                    📥 Export Full SVG
                </button>
                <button 
                    className="btn btn-secondary" 
                    onClick={handleExportSelected} 
                    disabled={state.selectedPaths.size === 0}
                    style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                    📥 Export Selected Paths ({state.selectedPaths.size})
                </button>
                <button className="btn" onClick={handleCopyToClipboard} style={{ width: '100%', marginBottom: '0.75rem' }}>
                    📋 Copy Path Data to Clipboard
                </button>
            </div>
        </div>
    );
};

export default ExportManager;

