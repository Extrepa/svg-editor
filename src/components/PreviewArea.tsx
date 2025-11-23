import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { usePathExtraction } from '../hooks/usePathExtraction';
import { useHistory } from '../hooks/useHistory';
import { useSVGRenderer } from '../hooks/useSVGRenderer';
import { usePathSelection } from '../hooks/usePathSelection';

const PreviewArea: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { extractPaths, extractGroups } = usePathExtraction();
    const { saveState } = useHistory();
    const { renderSVG, applyBackgroundMods, fitToScreen } = useSVGRenderer();
    const { updateSelectionVisual } = usePathSelection();

    // When SVG is loaded, extract paths/groups and render
    useEffect(() => {
        if (state.svgElement && state.paths.length === 0) {
            extractPaths();
            extractGroups();
            saveState();
            renderSVG();
            applyBackgroundMods();
            setTimeout(() => {
                try {
                    fitToScreen();
                } catch (e) {
                    console.warn('Could not fit to screen:', e);
                }
            }, 100);
        }
    }, [state.svgElement, state.paths.length, extractPaths, extractGroups, saveState, renderSVG, applyBackgroundMods, fitToScreen]);

    // Re-render when zoom changes
    useEffect(() => {
        if (state.svgElement) {
            renderSVG();
        }
    }, [state.currentZoom, state.svgElement, renderSVG]);

    // Update selection visual when selection changes
    useEffect(() => {
        if (state.svgElement) {
            updateSelectionVisual();
        }
    }, [state.selectedPaths, state.svgElement, updateSelectionVisual]);

    return (
        <main className="preview-area">
            <div className="preview-container" id="previewContainer">
                {!state.svgElement ? (
                    <div className="preview-empty" id="previewEmpty">
                        <div className="empty-content">
                            <div className="empty-icon">📐</div>
                            <h2>No SVG Loaded</h2>
                            <p>Load an SVG file or choose a template to get started</p>
                            <button 
                                className="btn btn-primary"
                                onClick={() => document.getElementById('fileInput')?.click()}
                            >
                                Load SVG File
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="preview-svg" id="previewSvg" style={{ display: 'flex' }}>
                        {/* Canvas Toolbar */}
                        <div className="canvas-toolbar" id="canvasToolbar">
                            <div className="toolbar-group">
                                <button 
                                    className={`tool-btn ${state.currentTool === 'select' ? 'active' : ''}`}
                                    data-tool="select"
                                    title="Select Tool (V)"
                                    onClick={() => updateState({ currentTool: 'select' })}
                                >
                                    <span className="tool-icon">🔘</span>
                                </button>
                                <button 
                                    className={`tool-btn ${state.currentTool === 'move' ? 'active' : ''}`}
                                    data-tool="move"
                                    title="Move Tool (M)"
                                    onClick={() => updateState({ currentTool: 'move' })}
                                >
                                    <span className="tool-icon">↔️</span>
                                </button>
                                <button 
                                    className={`tool-btn ${state.currentTool === 'resize' ? 'active' : ''}`}
                                    data-tool="resize"
                                    title="Resize Tool (R)"
                                    onClick={() => updateState({ currentTool: 'resize' })}
                                >
                                    <span className="tool-icon">⤢</span>
                                </button>
                                <button 
                                    className={`tool-btn ${state.currentTool === 'copy' ? 'active' : ''}`}
                                    data-tool="copy"
                                    title="Copy Tool (C)"
                                    onClick={() => updateState({ currentTool: 'copy' })}
                                >
                                    <span className="tool-icon">📋</span>
                                </button>
                            </div>
                            <div className="toolbar-separator"></div>
                            <div className="toolbar-group">
                                <button 
                                    className={`tool-btn ${state.currentTool === 'duplicate' ? 'active' : ''}`}
                                    data-tool="duplicate"
                                    title="Duplicate (Ctrl+D)"
                                    onClick={() => updateState({ currentTool: 'duplicate' })}
                                >
                                    <span className="tool-icon">📄</span>
                                </button>
                                <button 
                                    className={`tool-btn ${state.currentTool === 'delete' ? 'active' : ''}`}
                                    data-tool="delete"
                                    title="Delete (Del)"
                                    onClick={() => updateState({ currentTool: 'delete' })}
                                >
                                    <span className="tool-icon">🗑️</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Context Menu */}
                        <div className="context-menu" id="contextMenu" style={{ display: 'none' }}></div>
                        
                        {/* SVG Wrapper */}
                        <div 
                            className={`svg-wrapper ${state.backgroundMode}`}
                            id="svgWrapper"
                        ></div>
                        
                        {/* Zoom Controls */}
                        <div className="zoom-controls">
                            <button 
                                className="btn btn-small"
                                id="zoomInBtn"
                                title="Zoom In"
                                onClick={() => {
                                    const newZoom = Math.min(5, state.currentZoom + 0.1);
                                    updateState({ currentZoom: newZoom });
                                }}
                            >
                                +
                            </button>
                            <button 
                                className="btn btn-small"
                                id="zoomOutBtn"
                                title="Zoom Out"
                                onClick={() => {
                                    const newZoom = Math.max(0.1, state.currentZoom - 0.1);
                                    updateState({ currentZoom: newZoom });
                                }}
                            >
                                −
                            </button>
                        </div>
                        
                        {/* Status Bar */}
                        <div className="status-bar" id="statusBar" style={{ display: 'none' }}>
                            <span id="statusBarText">X: 0.00  Y: 0.00</span>
                        </div>
                    </div>
                )}
                
                {/* Mini-map */}
                <div className="mini-map" id="miniMap" style={{ display: state.svgElement ? 'flex' : 'none' }}>
                    <div className="mini-map-header">
                        <span>Mini-map</span>
                        <span id="miniMapZoom">{Math.round(state.currentZoom * 100)}%</span>
                    </div>
                    <div className="mini-map-content" id="miniMapContent"></div>
                </div>
            </div>
        </main>
    );
};

export default PreviewArea;
