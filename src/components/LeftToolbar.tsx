import React from 'react';
import { useAppContext } from '../context/AppContext';
import {
    MousePointer2,
    PenTool,
    Square,
    Circle,
    Star,
    Hexagon,
    Minus,
    Type,
    Merge,
    Scissors,
    AlignCenter,
    Shapes
} from 'lucide-react';

interface ToolButton {
    id: string;
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    group?: number;
}

const LeftToolbar: React.FC = () => {
    const { state, updateState } = useAppContext();

    const tools: ToolButton[] = [
        // Selection Tools
        { id: 'select', icon: MousePointer2, label: 'Select Tool', shortcut: 'V', group: 0 },
        { id: 'node-editor', icon: PenTool, label: 'Node Editor', shortcut: 'P', group: 0 },
        
        // Shape Tools
        { id: 'pen', icon: PenTool, label: 'Pen Tool', shortcut: 'P', group: 1 },
        { id: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R', group: 1 },
        { id: 'circle', icon: Circle, label: 'Circle', shortcut: 'C', group: 1 },
        { id: 'star', icon: Star, label: 'Star', group: 1 },
        { id: 'poly', icon: Hexagon, label: 'Polygon', group: 1 },
        { id: 'line', icon: Minus, label: 'Line', shortcut: 'L', group: 1 },
        
        // Edit Tools
        { id: 'path-merger', icon: Merge, label: 'Path Merger', group: 2 },
        { id: 'boolean-ops', icon: Scissors, label: 'Boolean Ops', group: 2 },
        { id: 'alignment', icon: AlignCenter, label: 'Alignment', group: 2 },
        
        // Text & Shapes
        { id: 'text', icon: Type, label: 'Text Tool', shortcut: 'T', group: 3 },
        { id: 'shapes', icon: Shapes, label: 'Shape Library', group: 3 },
    ];

    const handleToolClick = (toolId: string) => {
        // Map toolbar tool IDs to panel names
        const toolMap: Record<string, any> = {
            'select': { currentTool: 'select', currentPanel: 'workflow' },
            'node-editor': { currentPanel: 'node-editor' },
            'path-merger': { currentPanel: 'path-merger' },
            'boolean-ops': { currentPanel: 'boolean-ops' },
            'alignment': { currentPanel: 'alignment' },
            'shapes': { currentPanel: 'shapes' },
        };

        if (toolMap[toolId]) {
            updateState(toolMap[toolId]);
        } else {
            // For shape tools, set shape creation mode
            updateState({ shapeCreationMode: toolId, currentTool: 'select' });
        }
    };

    const getGroupSeparator = (currentGroup: number, prevGroup: number | undefined) => {
        if (prevGroup !== undefined && currentGroup !== prevGroup) {
            return <div key={`divider-${currentGroup}`} className="toolbar-divider"></div>;
        }
        return null;
    };

    let prevGroup: number | undefined;

    return (
        <div className="left-toolbar">
            <div className="toolbar-group">
                    {tools.map((tool) => {
                    const separator = getGroupSeparator(tool.group || 0, prevGroup);
                    prevGroup = tool.group;
                    
                    const isActive = 
                        (tool.id === 'select' && state.currentTool === 'select') ||
                        (tool.id === 'node-editor' && state.currentPanel === 'node-editor') ||
                        (tool.id === 'path-merger' && state.currentPanel === 'path-merger') ||
                        (tool.id === 'boolean-ops' && state.currentPanel === 'boolean-ops') ||
                        (tool.id === 'alignment' && state.currentPanel === 'alignment') ||
                        (tool.id === 'shapes' && state.currentPanel === 'shapes') ||
                        (tool.id === state.shapeCreationMode);

                    return (
                        <React.Fragment key={tool.id}>
                            {separator}
                            <button
                                className={`toolbar-button ${isActive ? 'active' : ''}`}
                                onClick={() => handleToolClick(tool.id)}
                                title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
                            >
                                <tool.icon size={20} />
                                {isActive && <div className="toolbar-active-indicator"></div>}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default LeftToolbar;

