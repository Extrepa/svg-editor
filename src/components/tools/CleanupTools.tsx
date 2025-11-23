import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const CleanupTools: React.FC = () => {
    const { state } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();
    const [roundPrecision, setRoundPrecision] = useState(2);

    const handleRemoveInvisible = () => {
        saveState();
        let removed = 0;
        
        state.paths.forEach(path => {
            const opacity = parseFloat(path.opacity) || 1;
            const hasFill = path.fill && path.fill !== 'none' && path.fill !== 'transparent';
            const hasStroke = path.stroke && path.stroke !== 'none' && path.stroke !== 'transparent' && parseFloat(path.strokeWidth) > 0;
            
            if (opacity === 0 || (!hasFill && !hasStroke)) {
                path.element.remove();
                removed++;
            }
        });
        
        extractPaths();
        renderSVG();
        alert(`Removed ${removed} invisible object(s)!`);
    };

    const handleRemoveStrayPoints = () => {
        saveState();
        let removed = 0;
        
        state.paths.forEach(path => {
            const pointCount = (path.d.match(/[ML]/g) || []).length;
            if (pointCount <= 1) {
                path.element.remove();
                removed++;
            }
        });
        
        extractPaths();
        renderSVG();
        alert(`Removed ${removed} stray point(s)!`);
    };

    const handleRoundCoordinates = () => {
        saveState();
        state.paths.forEach(path => {
            const d = path.d.replace(/(\d+\.\d+)/g, (match) => {
                return parseFloat(match).toFixed(roundPrecision);
            });
            path.element.setAttribute('d', d);
            path.d = d;
        });
        
        extractPaths();
        renderSVG();
        alert('Rounded all coordinates!');
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Cleanup & Precision Tools</h3>
                <p><strong>What it does:</strong> One-click scripts to fix common SVG errors and improve precision. Essential for clean code and cutting machines.</p>
                <p><strong>When to use:</strong> Before exporting, or when paths aren't behaving correctly. Use these to clean up messy SVGs.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Bulk Cleanup Actions</label>
                
                <button className="btn btn-primary" onClick={handleRemoveInvisible} style={{ width: '100%', marginBottom: '0.5rem' }}>
                    🗑️ Remove Invisible Objects
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Deletes paths with opacity: 0, display: none, or no stroke/fill
                </p>
                
                <button className="btn btn-primary" onClick={handleRemoveStrayPoints} style={{ width: '100%', marginBottom: '0.5rem' }}>
                    🗑️ Remove Stray Points
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Deletes paths that only have 1 point (stray clicks)
                </p>
                
                <div style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">Round Coordinates</label>
                    <input
                        type="range"
                        className="form-input"
                        min="0"
                        max="5"
                        value={roundPrecision}
                        onChange={(e) => setRoundPrecision(parseInt(e.target.value))}
                    />
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {roundPrecision} decimals
                    </div>
                    <button className="btn btn-primary" onClick={handleRoundCoordinates} style={{ width: '100%', marginTop: '0.5rem' }}>
                        🔢 Round All Coordinates
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CleanupTools;

