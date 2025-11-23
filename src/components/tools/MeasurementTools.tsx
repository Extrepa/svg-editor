import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

const MeasurementTools: React.FC = () => {
    const { state, updateState } = useAppContext();
    const selectedCount = state.selectedPaths.size;
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [measurements, setMeasurements] = useState<Array<{ start: { x: number; y: number }; end: { x: number; y: number }; distance: number }>>([]);
    const [currentStart, setCurrentStart] = useState<{ x: number; y: number } | null>(null);

    const selectedPaths = selectedCount > 0 
        ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p)
        : [];

    const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    useEffect(() => {
        if (!isMeasuring) return;

        const handleClick = (e: MouseEvent) => {
            const wrapper = document.getElementById('svgWrapper');
            const svg = wrapper?.querySelector('svg');
            if (!svg || !wrapper) return;

            // Convert screen coordinates to SVG coordinates
            const rect = wrapper.getBoundingClientRect();
            const viewBox = svg.getAttribute('viewBox');
            
            let x: number, y: number;
            
            if (viewBox) {
                const [minX, minY, width, height] = viewBox.split(' ').map(Number);
                const scaleX = width / rect.width;
                const scaleY = height / rect.height;
                x = (e.clientX - rect.left) * scaleX + minX;
                y = (e.clientY - rect.top) * scaleY + minY;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }

            if (!currentStart) {
                setCurrentStart({ x, y });
            } else {
                const distance = calculateDistance(currentStart.x, currentStart.y, x, y);
                setMeasurements([...measurements, { start: currentStart, end: { x, y }, distance }]);
                setCurrentStart(null);
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [isMeasuring, currentStart, measurements]);

    const startMeasurement = () => {
        setIsMeasuring(true);
        setMeasurements([]);
        setCurrentStart(null);
        updateState({ currentTool: 'select' });
    };

    const stopMeasurement = () => {
        setIsMeasuring(false);
        setCurrentStart(null);
    };

    const clearMeasurements = () => {
        setMeasurements([]);
        // Remove measurement lines from SVG
        const svg = document.getElementById('svgWrapper')?.querySelector('svg');
        if (svg) {
            svg.querySelectorAll('.measurement-line').forEach(el => el.remove());
            svg.querySelectorAll('.measurement-label').forEach(el => el.remove());
        }
    };

    // Function to render measurement lines
    const renderMeasurements = () => {
        if (measurements.length === 0) return;

        const svg = document.getElementById('svgWrapper')?.querySelector('svg');
        if (!svg) return;

        // Clear previous
        svg.querySelectorAll('.measurement-line').forEach(el => el.remove());
        svg.querySelectorAll('.measurement-label').forEach(el => el.remove());

        measurements.forEach((measurement) => {
            const svgNS = 'http://www.w3.org/2000/svg';
            
            // Line
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', String(measurement.start.x));
            line.setAttribute('y1', String(measurement.start.y));
            line.setAttribute('x2', String(measurement.end.x));
            line.setAttribute('y2', String(measurement.end.y));
            line.setAttribute('stroke', '#ff0000');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '5,5');
            line.classList.add('measurement-line');
            svg.appendChild(line);

            // Label
            const midX = (measurement.start.x + measurement.end.x) / 2;
            const midY = (measurement.start.y + measurement.end.y) / 2;
            
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', String(midX));
            text.setAttribute('y', String(midY - 5));
            text.setAttribute('fill', '#ff0000');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = `${measurement.distance.toFixed(2)}px`;
            text.classList.add('measurement-label');
            text.style.pointerEvents = 'none';
            svg.appendChild(text);
        });
    };

    // Render measurement lines when measurements change
    useEffect(() => {
        renderMeasurements();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [measurements]);

    // Re-render measurements after SVG re-renders (persist through operations)
    useEffect(() => {
        if (measurements.length === 0) return;

        const wrapper = document.getElementById('svgWrapper');
        if (!wrapper) return;

        // Use MutationObserver to watch for SVG content changes
        const observer = new MutationObserver((mutations) => {
            // Check if SVG element was replaced (which happens on renderSVG)
            const hasSVGChange = mutations.some(mutation => 
                mutation.type === 'childList' && 
                Array.from(mutation.addedNodes).some(node => 
                    node.nodeName === 'svg' || (node as Element)?.querySelector?.('svg')
                )
            );
            
            if (hasSVGChange) {
                // Small delay to ensure SVG is fully rendered
                setTimeout(() => {
                    renderMeasurements();
                }, 50);
            }
        });

        observer.observe(wrapper, { 
            childList: true, 
            subtree: false // Only watch direct children to avoid too many callbacks
        });

        // Re-apply measurements when paths change (indicates SVG might have been re-rendered)
        const timeoutId = setTimeout(() => {
            renderMeasurements();
        }, 200);

        return () => {
            observer.disconnect();
            clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.svgElement, measurements, state.paths.length, state.groups.length]);

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Measurement & Dimension Tools</h3>
                <p><strong>What it does:</strong> Measure distances, inspect coordinates, and get precise dimensions. Essential for closing gaps and precision work.</p>
                <p><strong>When to use:</strong> When you need to know exact distances between points or precise coordinates for bridging.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Ruler / Tape Measure</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Click two points in the preview to measure distance
                </p>
                {!isMeasuring ? (
                    <button className="btn btn-primary" onClick={startMeasurement} style={{ width: '100%', marginBottom: '0.5rem' }}>
                        📏 Start Measurement
                    </button>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={stopMeasurement} style={{ width: '100%', marginBottom: '0.5rem' }}>
                            Stop Measurement
                        </button>
                        {currentStart && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
                                Click second point to measure...
                            </p>
                        )}
                    </>
                )}
                {measurements.length > 0 && (
                    <button className="btn btn-small" onClick={clearMeasurements} style={{ width: '100%' }}>
                        Clear Measurements
                    </button>
                )}
            </div>

            {measurements.length > 0 && (
                <div className="tool-section">
                    <label className="form-label">Measurement Results</label>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)' }}>
                        {measurements.map((m, idx) => (
                            <div key={idx} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                <strong>Measurement {idx + 1}:</strong> {m.distance.toFixed(2)}px
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Start: ({m.start.x.toFixed(1)}, {m.start.y.toFixed(1)}) → End: ({m.end.x.toFixed(1)}, {m.end.y.toFixed(1)})
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="tool-section">
                <label className="form-label">Path Statistics</label>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)' }}>
                    {selectedCount > 0 ? (
                        <div>
                            <p><strong>Selected Paths:</strong> {selectedCount}</p>
                            <p><strong>Total Paths:</strong> {state.paths.length}</p>
                            <p><strong>Total Groups:</strong> {state.groups.length}</p>
                            {selectedPaths.length > 0 && (
                                <>
                                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                                        <p><strong>Selected Path Details:</strong></p>
                                        {selectedPaths.filter((p): p is NonNullable<typeof p> => p !== undefined).map(path => {
                                            try {
                                                const bbox = path.element.getBBox();
                                                return (
                                                    <div key={path.id} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                        <strong>{path.id}:</strong> W: {bbox.width.toFixed(2)}px, H: {bbox.height.toFixed(2)}px
                                                        <div style={{ color: 'var(--text-secondary)' }}>
                                                            Position: ({bbox.x.toFixed(1)}, {bbox.y.toFixed(1)})
                                                        </div>
                                                    </div>
                                                );
                                            } catch (e) {
                                                return null;
                                            }
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <p>Select paths to see statistics</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MeasurementTools;

