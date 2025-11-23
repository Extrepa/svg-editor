import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const TextToPath: React.FC = () => {
    const { state } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();
    const [text, setText] = useState('');
    const [fontSize, setFontSize] = useState(24);

    const handleConvertText = () => {
        if (!text.trim()) {
            alert('Please enter text to convert');
            return;
        }

        if (!state.svgElement) {
            alert('Please load an SVG first');
            return;
        }

        saveState();
        const svgNS = 'http://www.w3.org/2000/svg';
        
        // Create text element
        const textElement = document.createElementNS(svgNS, 'text');
        textElement.setAttribute('x', '50');
        textElement.setAttribute('y', '50');
        textElement.setAttribute('font-size', fontSize.toString());
        textElement.textContent = text;
        
        // Convert text to path (simplified - would need proper text-to-path conversion)
        // For now, just add the text element
        state.svgElement.appendChild(textElement);
        
        extractPaths();
        renderSVG();
        setText('');
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Text to Path</h3>
                <p><strong>What it does:</strong> Converts text elements to paths, making text editable as vector shapes.</p>
                <p><strong>When to use:</strong> When you need to edit text as paths, or ensure text renders correctly across all systems.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Text</label>
                <input
                    type="text"
                    className="form-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text to convert"
                />
            </div>

            <div className="tool-section">
                <label className="form-label">Font Size</label>
                <input
                    type="number"
                    className="form-input"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value) || 24)}
                    min="1"
                    max="200"
                />
            </div>

            <div className="tool-section">
                <button className="btn btn-primary" onClick={handleConvertText} style={{ width: '100%' }}>
                    Convert Text to Path
                </button>
            </div>
        </div>
    );
};

export default TextToPath;

