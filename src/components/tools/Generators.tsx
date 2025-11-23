import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { usePathExtraction } from '../../hooks/usePathExtraction';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

const Generators: React.FC = () => {
    const { state } = useAppContext();
    const { saveState } = useHistory();
    const { extractPaths } = usePathExtraction();
    const { renderSVG } = useSVGRenderer();

    const [radialCount, setRadialCount] = useState(8);
    const [radialCenterX, setRadialCenterX] = useState(100);
    const [radialCenterY, setRadialCenterY] = useState(100);
    const [radialRadius, setRadialRadius] = useState(50);
    
    const [qrText, setQrText] = useState('https://example.com');
    const [qrSize, setQrSize] = useState(100);
    const [qrErrorLevel, setQrErrorLevel] = useState('M');
    
    const [chartData, setChartData] = useState('10, 20, 15, 30, 25');
    const [chartWidth, setChartWidth] = useState(200);
    const [chartHeight, setChartHeight] = useState(150);

    const selectedCount = state.selectedPaths.size;
    const selectedPathId = selectedCount === 1 ? Array.from(state.selectedPaths)[0] : null;
    const selectedPath = selectedPathId ? state.paths.find(p => p.id === selectedPathId) : null;

    const createRadialRepeat = () => {
        if (!selectedPath || !state.svgElement) {
            alert('Select exactly 1 path to create radial copies');
            return;
        }

        saveState();
        const angleStep = (360 / radialCount) * (Math.PI / 180);

        for (let i = 1; i < radialCount; i++) {
            const angle = angleStep * i;
            const x = radialCenterX + radialRadius * Math.cos(angle);
            const y = radialCenterY + radialRadius * Math.sin(angle);
            const rotation = (360 / radialCount) * i;

            const cloned = selectedPath.element.cloneNode(true) as SVGPathElement;
            const newId = `${selectedPathId}-radial-${i}-${Date.now()}`;
            cloned.setAttribute('id', newId);
            cloned.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotation} ${radialCenterX} ${radialCenterY})`);

            if (selectedPath.element.parentElement) {
                selectedPath.element.parentElement.appendChild(cloned);
            } else {
                state.svgElement.appendChild(cloned);
            }
        }

        extractPaths();
        renderSVG();
        alert(`Created ${radialCount - 1} radial copies!`);
    };

    const generateQRCode = () => {
        if (!qrText || !state.svgElement) {
            alert('Enter text or URL');
            return;
        }

        saveState();
        const moduleSize = qrSize / 25;
        let pathData = '';

        // Generate a simple QR-like pattern (placeholder - for production use a QR library)
        for (let y = 0; y < 25; y++) {
            for (let x = 0; x < 25; x++) {
                // Simple pattern based on text hash
                const hash = (x + y * 25 + qrText.length) % 3;
                if (hash === 0) {
                    const px = x * moduleSize;
                    const py = y * moduleSize;
                    pathData += `M ${px} ${py} L ${px + moduleSize} ${py} L ${px + moduleSize} ${py + moduleSize} L ${px} ${py + moduleSize} Z `;
                }
            }
        }

        const svgNS = 'http://www.w3.org/2000/svg';
        const group = document.createElementNS(svgNS, 'g');
        group.id = `qrcode-${Date.now()}`;

        if (pathData.trim()) {
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', pathData.trim());
            path.setAttribute('fill', '#000000');
            group.appendChild(path);
        }

        state.svgElement.appendChild(group);
        extractPaths();
        renderSVG();
        alert('QR code pattern created! (Note: This is a placeholder pattern. For production, integrate a QR library)');
    };

    const generateBarChart = () => {
        if (!chartData || !state.svgElement) {
            alert('Enter chart data (comma-separated numbers)');
            return;
        }

        const values = chartData.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        if (values.length === 0) {
            alert('Invalid chart data');
            return;
        }

        saveState();
        const maxValue = Math.max(...values);
        const barWidth = chartWidth / values.length;
        const padding = barWidth * 0.2;
        const actualBarWidth = barWidth - padding;
        
        const svgNS = 'http://www.w3.org/2000/svg';
        const group = document.createElementNS(svgNS, 'g');
        group.id = `barchart-${Date.now()}`;

        values.forEach((value, index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = index * barWidth + padding / 2;
            const y = chartHeight - barHeight;

            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', String(x));
            rect.setAttribute('y', String(y));
            rect.setAttribute('width', String(actualBarWidth));
            rect.setAttribute('height', String(barHeight));
            rect.setAttribute('fill', '#4a90e2');
            rect.setAttribute('stroke', '#2c3e50');
            rect.setAttribute('stroke-width', '1');
            group.appendChild(rect);
        });

        state.svgElement.appendChild(group);
        extractPaths();
        renderSVG();
        alert(`Bar chart generated with ${values.length} bars!`);
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Generators</h3>
                <p><strong>What it does:</strong> Generate patterns, grids, and custom shapes programmatically.</p>
                <p><strong>When to use:</strong> When you need repetitive patterns or procedural shapes.</p>
            </div>

            {/* Radial Repeat */}
            <div className="tool-section">
                <label className="form-label">Radial Repeat (Mandala Maker)</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Select exactly 1 path to create radial copies around a center point
                </p>
                {selectedCount === 1 ? (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Count</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={radialCount}
                                    min="2"
                                    max="36"
                                    onChange={(e) => setRadialCount(parseInt(e.target.value) || 8)}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Center X</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={radialCenterX}
                                    onChange={(e) => setRadialCenterX(parseFloat(e.target.value) || 100)}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Center Y</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={radialCenterY}
                                    onChange={(e) => setRadialCenterY(parseFloat(e.target.value) || 100)}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Radius</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={radialRadius}
                                    onChange={(e) => setRadialRadius(parseFloat(e.target.value) || 50)}
                                />
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={createRadialRepeat} style={{ width: '100%' }}>
                            🌀 Create Radial Repeat
                        </button>
                    </>
                ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Select exactly 1 path to create radial copies
                    </p>
                )}
            </div>

            {/* QR Code Generator */}
            <div className="tool-section">
                <label className="form-label">QR Code Generator</label>
                <input
                    type="text"
                    className="form-input"
                    value={qrText}
                    placeholder="Enter URL or text..."
                    onChange={(e) => setQrText(e.target.value)}
                    style={{ marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Size</label>
                        <input
                            type="number"
                            className="form-input"
                            value={qrSize}
                            min="50"
                            max="500"
                            onChange={(e) => setQrSize(parseInt(e.target.value) || 100)}
                        />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Error Correction</label>
                        <select
                            className="form-input"
                            value={qrErrorLevel}
                            onChange={(e) => setQrErrorLevel(e.target.value)}
                        >
                            <option value="L">L (Low)</option>
                            <option value="M">M (Medium)</option>
                            <option value="Q">Q (Quartile)</option>
                            <option value="H">H (High)</option>
                        </select>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={generateQRCode} style={{ width: '100%' }}>
                    📱 Generate QR Code
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Note: This generates a placeholder pattern. For production, integrate a QR library.
                </p>
            </div>

            {/* Bar Chart */}
            <div className="tool-section">
                <label className="form-label">Simple Bar Chart</label>
                <input
                    type="text"
                    className="form-input"
                    value={chartData}
                    placeholder="10, 20, 15, 30, 25"
                    onChange={(e) => setChartData(e.target.value)}
                    style={{ marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Width</label>
                        <input
                            type="number"
                            className="form-input"
                            value={chartWidth}
                            min="100"
                            max="500"
                            onChange={(e) => setChartWidth(parseInt(e.target.value) || 200)}
                        />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Height</label>
                        <input
                            type="number"
                            className="form-input"
                            value={chartHeight}
                            min="50"
                            max="300"
                            onChange={(e) => setChartHeight(parseInt(e.target.value) || 150)}
                        />
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={generateBarChart} style={{ width: '100%' }}>
                    📊 Generate Bar Chart
                </button>
            </div>
        </div>
    );
};

export default Generators;

