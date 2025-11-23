import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

const TokenInjector: React.FC = () => {
    const { state } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const [token, setToken] = useState('');
    const [replacement, setReplacement] = useState('');

    const handleInject = () => {
        if (!token || !replacement) {
            alert('Please enter both token and replacement');
            return;
        }

        saveState();
        let replaced = 0;
        
        state.paths.forEach(path => {
            if (path.d.includes(token)) {
                const newD = path.d.replace(new RegExp(token, 'g'), replacement);
                path.element.setAttribute('d', newD);
                path.d = newD;
                replaced++;
            }
        });
        
        renderSVG();
        alert(`Replaced token in ${replaced} path(s)!`);
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Token Injector</h3>
                <p><strong>What it does:</strong> Replace tokens/placeholders in path data with actual values. Useful for parameterized SVGs.</p>
                <p><strong>When to use:</strong> When working with template SVGs that contain placeholder values.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Token to Replace</label>
                <input
                    type="text"
                    className="form-input"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="e.g., {WIDTH} or {HEIGHT}"
                />
            </div>

            <div className="tool-section">
                <label className="form-label">Replacement Value</label>
                <input
                    type="text"
                    className="form-input"
                    value={replacement}
                    onChange={(e) => setReplacement(e.target.value)}
                    placeholder="e.g., 100"
                />
            </div>

            <div className="tool-section">
                <button className="btn btn-primary" onClick={handleInject} style={{ width: '100%' }}>
                    Inject Token
                </button>
            </div>
        </div>
    );
};

export default TokenInjector;

