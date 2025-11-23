import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

const Comparator: React.FC = () => {
    const { state } = useAppContext();
    const [comparisonSVG, setComparisonSVG] = useState<string>('');
    const [comparisonElement, setComparisonElement] = useState<SVGSVGElement | null>(null);
    const [comparisonPaths, setComparisonPaths] = useState<Array<{ id: string; d: string; fill: string; stroke: string }>>([]);
    const [differences, setDifferences] = useState<Array<{ type: string; pathId: string; message: string }>>([]);

    const handleLoadComparison = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            setComparisonSVG(text);
            
            // Parse comparison SVG
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'image/svg+xml');
            const svgElement = doc.documentElement as unknown as SVGSVGElement;
            setComparisonElement(svgElement);
            
            // Extract paths from comparison SVG
            const paths = Array.from(svgElement.querySelectorAll('path')).map(path => ({
                id: path.id || `path-${Math.random()}`,
                d: path.getAttribute('d') || '',
                fill: path.getAttribute('fill') || 'none',
                stroke: path.getAttribute('stroke') || 'none',
            }));
            setComparisonPaths(paths);
            
            // Compare with current SVG
            compareSVGs();
        } catch (error) {
            alert(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const compareSVGs = () => {
        if (!comparisonElement || !state.svgElement) return;

        const differences: Array<{ type: string; pathId: string; message: string }> = [];
        
        // Compare path counts
        const currentPathCount = state.paths.length;
        const comparisonPathCount = comparisonPaths.length;
        
        if (currentPathCount !== comparisonPathCount) {
            differences.push({
                type: 'count',
                pathId: '',
                message: `Path count differs: Current has ${currentPathCount}, comparison has ${comparisonPathCount}`,
            });
        }

        // Compare individual paths by ID
        const currentPathMap = new Map(state.paths.map(p => [p.id, p]));
        const comparisonPathMap = new Map(comparisonPaths.map(p => [p.id, p]));

        // Check for paths in current that don't exist in comparison
        currentPathMap.forEach((path, id) => {
            const compPath = comparisonPathMap.get(id);
            if (!compPath) {
                differences.push({
                    type: 'missing',
                    pathId: id,
                    message: `Path "${id}" exists in current but not in comparison`,
                });
            } else {
                // Compare path data
                if (path.d !== compPath.d) {
                    differences.push({
                        type: 'changed',
                        pathId: id,
                        message: `Path "${id}" data differs`,
                    });
                }
                if (path.fill !== compPath.fill) {
                    differences.push({
                        type: 'changed',
                        pathId: id,
                        message: `Path "${id}" fill color differs: ${path.fill} vs ${compPath.fill}`,
                    });
                }
                if (path.stroke !== compPath.stroke) {
                    differences.push({
                        type: 'changed',
                        pathId: id,
                        message: `Path "${id}" stroke color differs: ${path.stroke} vs ${compPath.stroke}`,
                    });
                }
            }
        });

        // Check for paths in comparison that don't exist in current
        comparisonPathMap.forEach((_, id) => {
            if (!currentPathMap.has(id)) {
                differences.push({
                    type: 'added',
                    pathId: id,
                    message: `Path "${id}" exists in comparison but not in current`,
                });
            }
        });

        setDifferences(differences);
    };

    useEffect(() => {
        if (comparisonSVG && state.svgElement) {
            compareSVGs();
        }
    }, [comparisonSVG, state.paths, comparisonPaths]);

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>SVG Comparator</h3>
                <p><strong>What it does:</strong> Compare two SVG files side-by-side to identify differences.</p>
                <p><strong>When to use:</strong> When you need to see what changed between two versions of an SVG.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Load Comparison SVG</label>
                <input
                    type="file"
                    className="form-input"
                    accept=".svg"
                    onChange={handleLoadComparison}
                />
                {comparisonSVG && state.svgElement && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--success-color)', marginTop: '0.5rem' }}>
                        ✓ Comparison SVG loaded
                    </p>
                )}
                {!state.svgElement && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Load an SVG file first to compare against
                    </p>
                )}
            </div>

            {comparisonSVG && state.svgElement && (
                <div className="tool-section">
                    <label className="form-label">Comparison Results</label>
                    <div style={{ 
                        maxHeight: '400px', 
                        overflowY: 'auto', 
                        padding: '0.75rem', 
                        background: 'var(--bg-secondary)', 
                        borderRadius: 'var(--border-radius)',
                        marginTop: '0.5rem'
                    }}>
                        {differences.length === 0 ? (
                            <p style={{ color: 'var(--success-color)', fontSize: '0.875rem' }}>
                                ✓ No differences found! Both SVGs are identical.
                            </p>
                        ) : (
                            <>
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Found {differences.length} difference(s):
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {differences.map((diff, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '0.5rem',
                                                background: 'var(--bg-primary)',
                                                borderRadius: '4px',
                                                border: `1px solid ${
                                                    diff.type === 'missing' ? 'var(--danger-color)' :
                                                    diff.type === 'added' ? 'var(--success-color)' :
                                                    'var(--warning-color)'
                                                }`,
                                                fontSize: '0.75rem',
                                            }}
                                        >
                                            <div style={{ 
                                                fontWeight: 600, 
                                                marginBottom: '0.25rem',
                                                color: diff.type === 'missing' ? 'var(--danger-color)' :
                                                       diff.type === 'added' ? 'var(--success-color)' :
                                                       'var(--warning-color)'
                                            }}>
                                                {diff.type === 'missing' ? '❌ Missing' :
                                                 diff.type === 'added' ? '➕ Added' :
                                                 diff.type === 'changed' ? '⚠️ Changed' :
                                                 'ℹ️ ' + diff.type}
                                            </div>
                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                {diff.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {comparisonSVG && state.svgElement && (
                <div className="tool-section">
                    <label className="form-label">Preview Comparison</label>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '0.5rem',
                        marginTop: '0.5rem'
                    }}>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                Current SVG
                            </p>
                            <div 
                                style={{ 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    background: 'var(--bg-secondary)',
                                    maxHeight: '200px',
                                    overflow: 'auto'
                                }}
                                dangerouslySetInnerHTML={{ __html: state.svgData || '' }}
                            />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                Comparison SVG
                            </p>
                            <div 
                                style={{ 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    background: 'var(--bg-secondary)',
                                    maxHeight: '200px',
                                    overflow: 'auto'
                                }}
                                dangerouslySetInnerHTML={{ __html: comparisonSVG }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Comparator;

