import React from 'react';
import { useAppContext } from '../context/AppContext';
import type { ToolName } from '../types';

const Sidebar: React.FC = () => {
    const { state, updateState } = useAppContext();
    const handleToolClick = (tool: ToolName) => {
        updateState({ currentPanel: tool });
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-tool') === tool);
        });
    };

    const navSections = [
        {
            title: 'Core Workflow',
            tools: [
                { id: 'preview', icon: '👁️', label: 'Preview' },
                { id: 'workflow', icon: '🔄', label: 'Workflow Manager' },
                { id: 'shapes', icon: '⭐', label: 'Shape Library' },
            ]
        },
        {
            title: 'Editing Tools',
            tools: [
                { id: 'color-replacer', icon: '🎨', label: 'Color Replacer' },
                { id: 'transform', icon: '↔️', label: 'Transform' },
                { id: 'attributes', icon: '⚙️', label: 'Attributes' },
                { id: 'path-merger', icon: '🔗', label: 'Path Merger' },
                { id: 'node-editor', icon: '✏️', label: 'Node Editor' },
                { id: 'text-to-path', icon: '🔤', label: 'Text to Path' },
                { id: 'path-offset', icon: '📏', label: 'Path Offset' },
                { id: 'boolean-ops', icon: '✂️', label: 'Boolean Ops' },
                { id: 'alignment', icon: '📐', label: 'Alignment Tools' },
            ]
        },
        {
            title: 'Advanced Tools',
            tools: [
                { id: 'image-tracer', icon: '🖼️', label: 'Image Tracer' },
                { id: 'animator', icon: '✨', label: 'Animator' },
                { id: 'optimizer', icon: '⚡', label: 'Optimizer' },
                { id: 'path-simplifier', icon: '📏', label: 'Path Simplifier' },
                { id: 'token-injector', icon: '💉', label: 'Token Injector' },
                { id: 'comparator', icon: '🔀', label: 'Comparator' },
                { id: 'generators', icon: '🎲', label: 'Generators' },
            ]
        },
        {
            title: 'Precision & Cleanup',
            tools: [
                { id: 'cleanup', icon: '🧹', label: 'Cleanup Tools' },
                { id: 'measurement', icon: '📏', label: 'Measurement' },
            ]
        },
        {
            title: 'Export & System',
            tools: [
                { id: 'export', icon: '📤', label: 'Export Manager' },
                { id: 'templates', icon: '📋', label: 'Templates' },
                { id: 'file-patch', icon: '🔧', label: 'File Patch' },
            ]
        },
    ];

    return (
        <aside className="tools-sidebar">
            <nav className="tools-nav">
                {navSections.map((section, idx) => (
                    <div key={idx} className="nav-section">
                        <h3 className="nav-section-title">{section.title}</h3>
                        {section.tools.map(tool => (
                            <button
                                key={tool.id}
                                className={`nav-item ${state.currentPanel === tool.id ? 'active' : ''}`}
                                data-tool={tool.id}
                                onClick={() => handleToolClick(tool.id as ToolName)}
                            >
                                <span className="nav-icon">{tool.icon}</span>
                                <span className="nav-label">{tool.label}</span>
                            </button>
                        ))}
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;

