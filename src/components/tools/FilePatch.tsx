import { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { usePathExtraction } from '../../hooks/usePathExtraction';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

const FilePatch: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { saveState } = useHistory();
    const { extractPaths, extractGroups } = usePathExtraction();
    const { renderSVG } = useSVGRenderer();
    const patchInputRef = useRef<HTMLInputElement>(null);
    const [patchMode, setPatchMode] = useState<'replace' | 'merge' | 'selective'>('replace');
    const [patchStatus, setPatchStatus] = useState<string>('');

    const handleLoadPatch = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const patchText = await file.text();
            if (!state.svgElement) {
                setPatchStatus('Error: No SVG loaded. Load an SVG file first.');
                return;
            }

            saveState();

            const parser = new DOMParser();
            const patchDoc = parser.parseFromString(patchText, 'image/svg+xml');
            const patchSVG = patchDoc.documentElement;

            if (patchMode === 'replace') {
                // Replace current SVG with patch
                const patchedText = patchText;
                updateState({ svgData: patchedText });
                
                const newSvg = parser.parseFromString(patchedText, 'image/svg+xml').documentElement as unknown as SVGSVGElement;
                updateState({ svgElement: newSvg });
                
                extractPaths();
                extractGroups();
                renderSVG();
                setPatchStatus('✓ Patch applied: Replaced entire SVG');
            } else if (patchMode === 'merge') {
                // Merge patch paths into current SVG
                const patchPaths = patchSVG.querySelectorAll('path');
                let added = 0;
                
                patchPaths.forEach(patchPath => {
                    const cloned = patchPath.cloneNode(true) as SVGPathElement;
                    cloned.setAttribute('id', cloned.id || `patched-${Date.now()}-${added}`);
                    state.svgElement!.appendChild(cloned);
                    added++;
                });
                
                extractPaths();
                extractGroups();
                renderSVG();
                setPatchStatus(`✓ Patch applied: Merged ${added} path(s) into current SVG`);
            } else if (patchMode === 'selective') {
                // Selective patching: only update paths that exist in both
                const patchPaths = Array.from(patchSVG.querySelectorAll('path'));
                const currentPathMap = new Map(state.paths.map(p => [p.id, p]));
                let updated = 0;
                
                patchPaths.forEach(patchPath => {
                    const patchId = patchPath.id;
                    if (patchId && currentPathMap.has(patchId)) {
                        const currentPath = currentPathMap.get(patchId)!;
                        // Update path data
                        if (patchPath.getAttribute('d')) {
                            currentPath.element.setAttribute('d', patchPath.getAttribute('d') || '');
                        }
                        // Update attributes
                        ['fill', 'stroke', 'stroke-width', 'transform'].forEach(attr => {
                            const patchValue = patchPath.getAttribute(attr);
                            if (patchValue !== null) {
                                currentPath.element.setAttribute(attr, patchValue);
                            }
                        });
                        updated++;
                    }
                });
                
                extractPaths();
                extractGroups();
                renderSVG();
                setPatchStatus(`✓ Patch applied: Updated ${updated} existing path(s)`);
            }
        } catch (error) {
            setPatchStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>File Patching</h3>
                <p><strong>What it does:</strong> Apply incremental changes or updates to SVG files.</p>
                <p><strong>When to use:</strong> When you need to apply patches or incremental updates to SVG files.</p>
            </div>

            {!state.svgElement && (
                <div className="tool-section" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Load an SVG file first before applying patches</p>
                </div>
            )}

            {state.svgElement && (
                <>
                    <div className="tool-section">
                        <label className="form-label">Patch Mode</label>
                        <select
                            className="form-input"
                            value={patchMode}
                            onChange={(e) => {
                                setPatchMode(e.target.value as 'replace' | 'merge' | 'selective');
                                setPatchStatus('');
                            }}
                        >
                            <option value="replace">Replace Entire SVG</option>
                            <option value="merge">Merge Paths</option>
                            <option value="selective">Selective Update (by ID)</option>
                        </select>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            {patchMode === 'replace' && 'Replaces the entire current SVG with the patch file.'}
                            {patchMode === 'merge' && 'Adds all paths from patch file to the current SVG.'}
                            {patchMode === 'selective' && 'Only updates paths that have matching IDs in both files.'}
                        </p>
                    </div>

                    <div className="tool-section">
                        <label className="form-label">Load Patch File</label>
                        <input
                            ref={patchInputRef}
                            type="file"
                            className="form-input"
                            accept=".svg"
                            onChange={handleLoadPatch}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={() => patchInputRef.current?.click()}
                            style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                            📄 Select Patch File
                        </button>
                    </div>

                    {patchStatus && (
                        <div className="tool-section" style={{
                            padding: '0.75rem',
                            background: patchStatus.startsWith('✓') ? 'rgba(80, 200, 120, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                            borderRadius: 'var(--border-radius)',
                            border: `1px solid ${patchStatus.startsWith('✓') ? 'var(--success-color)' : 'var(--danger-color)'}`
                        }}>
                            <p style={{
                                fontSize: '0.875rem',
                                color: patchStatus.startsWith('✓') ? 'var(--success-color)' : 'var(--danger-color)'
                            }}>
                                {patchStatus}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default FilePatch;

