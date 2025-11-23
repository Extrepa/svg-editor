import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { usePathExtraction } from '../../hooks/usePathExtraction';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

interface PathCommand {
    cmd: string;
    args: number[];
    points: Array<{ x: number; y: number; type: string }>;
    original: string;
}

const NodeEditor: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { saveState } = useHistory();
    const { extractPaths } = usePathExtraction();
    const { renderSVG } = useSVGRenderer();

    const [editingPathId, setEditingPathId] = useState<string | null>(null);
    const [pathCommands, setPathCommands] = useState<PathCommand[]>([]);

    const selectedCount = state.selectedPaths.size;
    const selectedPathId = selectedCount === 1 ? Array.from(state.selectedPaths)[0] : null;
    const selectedPath = selectedPathId ? state.paths.find(p => p.id === selectedPathId) : null;

    const parsePathData = useCallback((d: string): PathCommand[] => {
        const commands: PathCommand[] = [];
        const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
        let match;
        let currentX = 0, currentY = 0;
        let startX = 0, startY = 0;

        while ((match = regex.exec(d)) !== null) {
            const cmd = match[1];
            const args = match[2].trim().split(/[\s,]+/).filter(s => s).map(Number);
            const isRelative = cmd === cmd.toLowerCase();
            const absCmd = cmd.toUpperCase();

            let points: Array<{ x: number; y: number; type: string }> = [];

            switch (absCmd) {
                case 'M':
                    if (args.length >= 2) {
                        currentX = isRelative ? currentX + args[0] : args[0];
                        currentY = isRelative ? currentY + args[1] : args[1];
                        startX = currentX;
                        startY = currentY;
                        points.push({ x: currentX, y: currentY, type: 'move' });
                    }
                    break;
                case 'L':
                    if (args.length >= 2) {
                        currentX = isRelative ? currentX + args[0] : args[0];
                        currentY = isRelative ? currentY + args[1] : args[1];
                        points.push({ x: currentX, y: currentY, type: 'line' });
                    }
                    break;
                case 'C':
                    if (args.length >= 6) {
                        points.push({ x: args[0], y: args[1], type: 'control' });
                        points.push({ x: args[2], y: args[3], type: 'control' });
                        currentX = isRelative ? currentX + args[4] : args[4];
                        currentY = isRelative ? currentY + args[5] : args[5];
                        points.push({ x: currentX, y: currentY, type: 'curve' });
                    }
                    break;
                case 'Z':
                    points.push({ x: startX, y: startY, type: 'close' });
                    break;
                default:
                    for (let i = 0; i < args.length; i += 2) {
                        if (i + 1 < args.length) {
                            const x = isRelative ? currentX + args[i] : args[i];
                            const y = isRelative ? currentY + args[i + 1] : args[i + 1];
                            currentX = x;
                            currentY = y;
                            points.push({ x, y, type: 'point' });
                        }
                    }
            }

            commands.push({ cmd, args, points, original: match[0] });
        }

        return commands;
    }, []);

    const screenToSVG = useCallback((svg: SVGSVGElement, screenX: number, screenY: number) => {
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = screenX;
        svgPoint.y = screenY;
        const ctm = svg.getScreenCTM();
        if (ctm) {
            const inverseCTM = ctm.inverse();
            const svgCoord = svgPoint.matrixTransform(inverseCTM);
            return { x: svgCoord.x, y: svgCoord.y };
        }
        const svgRect = svg.getBoundingClientRect();
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
            const [minX, minY, width, height] = viewBox.split(' ').map(Number);
            const scaleX = width / svgRect.width;
            const scaleY = height / svgRect.height;
            const x = (screenX - svgRect.left) * scaleX + minX;
            const y = (screenY - svgRect.top) * scaleY + minY;
            return { x, y };
        }
        return {
            x: screenX - svgRect.left,
            y: screenY - svgRect.top
        };
    }, []);

    const rebuildPathData = useCallback((commands: PathCommand[]): string => {
        let pathData = '';

        commands.forEach(cmd => {
            const absCmd = cmd.cmd.toUpperCase();

            if (absCmd === 'Z') {
                pathData += 'Z ';
                return;
            }

            switch (absCmd) {
                case 'M':
                    if (cmd.points.length > 0) {
                        const point = cmd.points[0];
                        pathData += `${cmd.cmd} ${point.x} ${point.y} `;
                    }
                    break;
                case 'L':
                    if (cmd.points.length > 0) {
                        const point = cmd.points[0];
                        pathData += `${cmd.cmd} ${point.x} ${point.y} `;
                    }
                    break;
                case 'C':
                    if (cmd.points.length >= 3) {
                        const cp1 = cmd.points[0];
                        const cp2 = cmd.points[1];
                        const end = cmd.points[2];
                        pathData += `${cmd.cmd} ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y} `;
                    }
                    break;
                default:
                    pathData += cmd.original + ' ';
            }
        });

        return pathData.trim();
    }, []);

    const showNodeHandles = useCallback(() => {
        if (!selectedPath || !state.svgElement) return;

        if (editingPathId === selectedPath.id) {
            hideNodeHandles();
            return;
        }

        saveState();
        setEditingPathId(selectedPath.id);
        
        const commands = parsePathData(selectedPath.d);
        setPathCommands(commands);

        const wrapper = document.getElementById('svgWrapper');
        const svg = wrapper?.querySelector('svg') as SVGSVGElement;
        if (!svg) return;

        // Clear existing handles
        svg.querySelectorAll('.node-handle').forEach(el => el.remove());
        const handles: SVGCircleElement[] = [];

        commands.forEach((command, cmdIndex) => {
            command.points.forEach((point, pointIndex) => {
                if (point.type === 'close') return;

                const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                handle.setAttribute('cx', String(point.x));
                handle.setAttribute('cy', String(point.y));
                handle.setAttribute('r', '6');
                handle.setAttribute('fill', point.type === 'control' ? '#ff8800' : '#4a90e2');
                handle.setAttribute('stroke', '#ffffff');
                handle.setAttribute('stroke-width', '2');
                handle.setAttribute('style', 'cursor: move; pointer-events: all;');
                handle.classList.add('node-handle');
                (handle as any).dataset.pathId = selectedPath.id;
                (handle as any).dataset.cmdIndex = cmdIndex;
                (handle as any).dataset.pointIndex = pointIndex;

                let isDragging = false;

                const handleMouseDown = (e: MouseEvent) => {
                    e.stopPropagation();
                    isDragging = true;
                };

                const handleMouseMove = (e: MouseEvent) => {
                    if (!isDragging) return;
                    e.preventDefault();

                    const svgCoords = screenToSVG(svg, e.clientX, e.clientY);
                    let newX = svgCoords.x;
                    let newY = svgCoords.y;

                    if (state.snapToGrid) {
                        newX = Math.round(newX / state.gridSize) * state.gridSize;
                        newY = Math.round(newY / state.gridSize) * state.gridSize;
                    }

                    handle.setAttribute('cx', String(newX));
                    handle.setAttribute('cy', String(newY));

                    // Update command - use functional update to avoid stale closure
                    setPathCommands(prevCommands => {
                        const updated = [...prevCommands];
                        if (updated[cmdIndex] && updated[cmdIndex].points[pointIndex]) {
                            updated[cmdIndex] = {
                                ...updated[cmdIndex],
                                points: updated[cmdIndex].points.map((pt, idx) =>
                                    idx === pointIndex ? { ...pt, x: newX, y: newY } : pt
                                )
                            };
                        }
                        return updated;
                    });
                };

                const handleMouseUp = () => {
                    if (isDragging) {
                        isDragging = false;
                        updatePathFromCommands();
                    }
                };

                handle.addEventListener('mousedown', handleMouseDown);
                const moveListener = handleMouseMove;
                const upListener = handleMouseUp;
                document.addEventListener('mousemove', moveListener);
                document.addEventListener('mouseup', upListener);

                // Store cleanup function
                (handle as any)._cleanup = () => {
                    document.removeEventListener('mousemove', moveListener);
                    document.removeEventListener('mouseup', upListener);
                };

                svg.appendChild(handle);
                handles.push(handle);
            });
        });
        
        // Cleanup function
        return () => {
            handles.forEach(handle => {
                if ((handle as any)._cleanup) {
                    (handle as any)._cleanup();
                }
            });
        };
    }, [selectedPath, state.svgElement, editingPathId, parsePathData, screenToSVG, state.snapToGrid, state.gridSize]);

    const hideNodeHandles = useCallback(() => {
        const svg = document.getElementById('svgWrapper')?.querySelector('svg');
        if (svg) {
            svg.querySelectorAll('.node-handle').forEach(el => el.remove());
        }
        setEditingPathId(null);
    }, []);

    const updatePathFromCommands = useCallback(() => {
        if (!selectedPath || !state.svgElement) return;

        const newPathData = rebuildPathData(pathCommands);
        selectedPath.element.setAttribute('d', newPathData);
        selectedPath.d = newPathData;
        
        extractPaths();
        renderSVG();
    }, [selectedPath, state.svgElement, pathCommands, rebuildPathData, extractPaths, renderSVG]);

    useEffect(() => {
        return () => {
            hideNodeHandles();
        };
    }, [hideNodeHandles]);

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Node Editor</h3>
                <p><strong>What it does:</strong> Edit individual points (nodes) on paths by clicking and dragging handles. Perfect for fine-tuning curves and fixing bridging issues.</p>
                <p><strong>When to use:</strong> After bridging gaps or merging paths, when you need to adjust specific points. Essential for precision editing.</p>
                <p><strong>How to use:</strong> 1) Select a path → 2) Click "Show Nodes" → 3) Drag handles to move points</p>
            </div>

            {selectedCount === 0 ? (
                <div className="tool-section" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Select exactly 1 path in the preview to edit its nodes.</p>
                    <button className="btn btn-primary" onClick={() => updateState({ currentPanel: 'workflow' })}>
                        Go to Workflow Manager
                    </button>
                </div>
            ) : selectedCount !== 1 ? (
                <div className="tool-section" style={{ padding: '1rem', background: 'rgba(243, 156, 18, 0.1)', borderRadius: 'var(--border-radius)', border: '1px solid var(--warning-color)' }}>
                    <p style={{ color: 'var(--warning-color)' }}>Please select exactly 1 path to edit nodes.</p>
                </div>
            ) : (
                <div className="tool-section">
                    {editingPathId === selectedPathId ? (
                        <>
                            <p style={{ color: 'var(--success-color)', marginBottom: '0.75rem' }}>
                                ✓ Node handles are visible. Drag handles to edit the path.
                            </p>
                            <button className="btn btn-secondary" onClick={hideNodeHandles} style={{ width: '100%', marginBottom: '0.5rem' }}>
                                Hide Nodes
                            </button>
                            <button className="btn btn-primary" onClick={updatePathFromCommands} style={{ width: '100%' }}>
                                Update Path
                            </button>
                        </>
                    ) : (
                        <>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                Selected path: <strong>{selectedPathId}</strong>
                            </p>
                            <button className="btn btn-primary" onClick={showNodeHandles} style={{ width: '100%' }}>
                                Show Nodes
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default NodeEditor;

