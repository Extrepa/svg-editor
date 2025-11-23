import { useAppContext } from '../../context/AppContext';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

const PreviewTool: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { fitToScreen } = useSVGRenderer();

    return (
        <div className="tool-panel-content">
            <div className="tool-section">
                <h3>Background</h3>
                <div className="form-group">
                    <label>Background Mode</label>
                    <select
                        value={state.backgroundMode}
                        onChange={(e) => {
                            const value = e.target.value.toLowerCase() as typeof state.backgroundMode;
                            updateState({ backgroundMode: value });
                        }}
                    >
                        <option value="none">None (Transparent)</option>
                        <option value="color">Solid Color</option>
                        <option value="grid">Grid</option>
                        <option value="checkerboard">Checkerboard</option>
                    </select>
                </div>
                {state.backgroundMode === 'color' && (
                    <div className="form-group">
                        <label>Background Color</label>
                        <input
                            type="color"
                            value={state.previewBgColor}
                            onChange={(e) => updateState({ previewBgColor: e.target.value })}
                        />
                    </div>
                )}
            </div>

            <div className="tool-section">
                <h3>View</h3>
                <div className="form-group">
                    <label>Zoom: {Math.round(state.currentZoom * 100)}%</label>
                    <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={state.currentZoom}
                        onChange={(e) => updateState({ currentZoom: parseFloat(e.target.value) })}
                    />
                </div>
                <button className="btn btn-secondary" onClick={fitToScreen}>
                    Fit to Screen
                </button>
            </div>

            {state.svgElement && (
                <div className="tool-section">
                    <h3>SVG Info</h3>
                    <div className="info-group">
                        <div className="info-item">
                            <span className="info-label">Paths:</span>
                            <span className="info-value">{state.paths.length}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Groups:</span>
                            <span className="info-value">{state.groups.length}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Selected:</span>
                            <span className="info-value">{state.selectedPaths.size}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreviewTool;

