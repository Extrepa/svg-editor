import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import AccordionSection from './AccordionSection';
import LayersPanel from './LayersPanel';
import {
    Layers,
    Sliders,
    Palette,
    Merge,
    Type,
    Move,
    Scissors,
    Image as ImageIcon,
    Zap,
    FileOutput,
    Settings,
    Monitor
} from 'lucide-react';
import PreviewTool from './tools/PreviewTool';
import ColorReplacer from './tools/ColorReplacer';
import TransformTool from './tools/TransformTool';
import AttributesTool from './tools/AttributesTool';
import AlignmentTools from './tools/AlignmentTools';
import PathMerger from './tools/PathMerger';
import TextToPath from './tools/TextToPath';
import PathOffset from './tools/PathOffset';
import BooleanOps from './tools/BooleanOps';
import ImageTracer from './tools/ImageTracer';
import Animator from './tools/Animator';
import Optimizer from './tools/Optimizer';
import PathSimplifier from './tools/PathSimplifier';
import TokenInjector from './tools/TokenInjector';
import Comparator from './tools/Comparator';
import Generators from './tools/Generators';
import CleanupTools from './tools/CleanupTools';
import MeasurementTools from './tools/MeasurementTools';
import ExportManager from './tools/ExportManager';
import Templates from './tools/Templates';
import FilePatch from './tools/FilePatch';

const RightPanel: React.FC = () => {
    const { state, updateState } = useAppContext();
    
    const [layersOpen, setLayersOpen] = useState(true);
    const [propertiesOpen, setPropertiesOpen] = useState(true);
    const [editingToolsOpen, setEditingToolsOpen] = useState(false);
    const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);
    const [exportToolsOpen, setExportToolsOpen] = useState(false);
    const [canvasOpen, setCanvasOpen] = useState(false);

    // Auto-open properties when a path is selected
    useEffect(() => {
        if (state.selectedPaths.size > 0) {
            setPropertiesOpen(true);
        }
    }, [state.selectedPaths]);

    // Get selected path/group for properties panel
    const selectedLayer = state.selectedPaths.size > 0
        ? state.paths.find(p => state.selectedPaths.has(p.id)) ||
          state.groups.find(g => state.selectedPaths.has(g.id))
        : null;

    const handleLayerSelect = () => {
        // Selection is handled by LayersPanel
    };

    // Tool component renderer
    const renderTool = (toolName: string) => {
        switch (toolName) {
            case 'preview': return <PreviewTool />;
            case 'color-replacer': return <ColorReplacer />;
            case 'transform': return <TransformTool />;
            case 'attributes': return <AttributesTool />;
            case 'alignment': return <AlignmentTools />;
            case 'path-merger': return <PathMerger />;
            case 'text-to-path': return <TextToPath />;
            case 'path-offset': return <PathOffset />;
            case 'boolean-ops': return <BooleanOps />;
            case 'image-tracer': return <ImageTracer />;
            case 'animator': return <Animator />;
            case 'optimizer': return <Optimizer />;
            case 'path-simplifier': return <PathSimplifier />;
            case 'token-injector': return <TokenInjector />;
            case 'comparator': return <Comparator />;
            case 'generators': return <Generators />;
            case 'cleanup': return <CleanupTools />;
            case 'measurement': return <MeasurementTools />;
            case 'export': return <ExportManager />;
            case 'templates': return <Templates />;
            case 'file-patch': return <FilePatch />;
            default: return null;
        }
    };

    const openTool = (toolName: string) => {
        updateState({ currentPanel: toolName as any });
        // Open the appropriate accordion section
        if (['color-replacer', 'path-merger', 'text-to-path', 'path-offset', 'boolean-ops', 'alignment'].includes(toolName)) {
            setEditingToolsOpen(true);
        } else if (['image-tracer', 'animator', 'optimizer', 'path-simplifier', 'token-injector', 'comparator', 'generators'].includes(toolName)) {
            setAdvancedToolsOpen(true);
        } else if (['export', 'templates', 'file-patch', 'cleanup', 'measurement'].includes(toolName)) {
            setExportToolsOpen(true);
        }
    };

    // Check if any tool in a section is active
    const isToolActive = (toolNames: string[]) => {
        return toolNames.includes(state.currentPanel);
    };

    return (
        <aside className="right-panel">
            {/* Layers Section - Always visible when SVG loaded */}
            {state.svgElement && (
                <AccordionSection
                    title="Layers"
                    icon={Layers}
                    isOpen={layersOpen}
                    onToggle={() => setLayersOpen(!layersOpen)}
                >
                    <LayersPanel onLayerSelect={handleLayerSelect} />
                </AccordionSection>
            )}

            {/* Properties Section - Visible when layer selected */}
            {selectedLayer && (
                <AccordionSection
                    title="Properties"
                    icon={Sliders}
                    isOpen={propertiesOpen}
                    onToggle={() => setPropertiesOpen(!propertiesOpen)}
                >
                    <div className="properties-panel">
                        {renderTool('transform')}
                        {renderTool('attributes')}
                    </div>
                </AccordionSection>
            )}

            {/* Editing Tools */}
            <AccordionSection
                title="Editing Tools"
                icon={Palette}
                isOpen={editingToolsOpen}
                onToggle={() => setEditingToolsOpen(!editingToolsOpen)}
            >
                <div className="tools-list">
                    <button 
                        className={`tool-button ${isToolActive(['color-replacer']) ? 'active' : ''}`}
                        onClick={() => openTool('color-replacer')}
                    >
                        <Palette size={16} />
                        Color Replacer
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['path-merger']) ? 'active' : ''}`}
                        onClick={() => openTool('path-merger')}
                    >
                        <Merge size={16} />
                        Path Merger
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['text-to-path']) ? 'active' : ''}`}
                        onClick={() => openTool('text-to-path')}
                    >
                        <Type size={16} />
                        Text to Path
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['path-offset']) ? 'active' : ''}`}
                        onClick={() => openTool('path-offset')}
                    >
                        <Move size={16} />
                        Path Offset
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['boolean-ops']) ? 'active' : ''}`}
                        onClick={() => openTool('boolean-ops')}
                    >
                        <Scissors size={16} />
                        Boolean Operations
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['alignment']) ? 'active' : ''}`}
                        onClick={() => openTool('alignment')}
                    >
                        <Monitor size={16} />
                        Alignment Tools
                    </button>
                </div>
                {editingToolsOpen && isToolActive(['color-replacer', 'path-merger', 'text-to-path', 'path-offset', 'boolean-ops', 'alignment']) && (
                    <div className="tool-content">
                        {renderTool(state.currentPanel) || <div className="tool-placeholder">Select a tool to view its options</div>}
                    </div>
                )}
            </AccordionSection>

            {/* Advanced Tools */}
            <AccordionSection
                title="Advanced Tools"
                icon={Zap}
                isOpen={advancedToolsOpen}
                onToggle={() => setAdvancedToolsOpen(!advancedToolsOpen)}
            >
                <div className="tools-list">
                    <button 
                        className={`tool-button ${isToolActive(['image-tracer']) ? 'active' : ''}`}
                        onClick={() => openTool('image-tracer')}
                    >
                        <ImageIcon size={16} />
                        Image Tracer
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['animator']) ? 'active' : ''}`}
                        onClick={() => openTool('animator')}
                    >
                        <Zap size={16} />
                        Animator
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['optimizer']) ? 'active' : ''}`}
                        onClick={() => openTool('optimizer')}
                    >
                        <Zap size={16} />
                        Optimizer
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['path-simplifier']) ? 'active' : ''}`}
                        onClick={() => openTool('path-simplifier')}
                    >
                        <Move size={16} />
                        Path Simplifier
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['token-injector']) ? 'active' : ''}`}
                        onClick={() => openTool('token-injector')}
                    >
                        <Settings size={16} />
                        Token Injector
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['comparator']) ? 'active' : ''}`}
                        onClick={() => openTool('comparator')}
                    >
                        <Monitor size={16} />
                        Comparator
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['generators']) ? 'active' : ''}`}
                        onClick={() => openTool('generators')}
                    >
                        <Zap size={16} />
                        Generators
                    </button>
                </div>
                {advancedToolsOpen && isToolActive(['image-tracer', 'animator', 'optimizer', 'path-simplifier', 'token-injector', 'comparator', 'generators']) && (
                    <div className="tool-content">
                        {renderTool(state.currentPanel) || <div className="tool-placeholder">Select a tool to view its options</div>}
                    </div>
                )}
            </AccordionSection>

            {/* Export & Utilities */}
            <AccordionSection
                title="Export & Utilities"
                icon={FileOutput}
                isOpen={exportToolsOpen}
                onToggle={() => setExportToolsOpen(!exportToolsOpen)}
            >
                <div className="tools-list">
                    <button 
                        className={`tool-button ${isToolActive(['export']) ? 'active' : ''}`}
                        onClick={() => openTool('export')}
                    >
                        <FileOutput size={16} />
                        Export Manager
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['templates']) ? 'active' : ''}`}
                        onClick={() => openTool('templates')}
                    >
                        <FileOutput size={16} />
                        Templates
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['file-patch']) ? 'active' : ''}`}
                        onClick={() => openTool('file-patch')}
                    >
                        <Settings size={16} />
                        File Patch
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['cleanup']) ? 'active' : ''}`}
                        onClick={() => openTool('cleanup')}
                    >
                        <Zap size={16} />
                        Cleanup Tools
                    </button>
                    <button 
                        className={`tool-button ${isToolActive(['measurement']) ? 'active' : ''}`}
                        onClick={() => openTool('measurement')}
                    >
                        <Monitor size={16} />
                        Measurement Tools
                    </button>
                </div>
                {exportToolsOpen && isToolActive(['export', 'templates', 'file-patch', 'cleanup', 'measurement']) && (
                    <div className="tool-content">
                        {renderTool(state.currentPanel) || <div className="tool-placeholder">Select a tool to view its options</div>}
                    </div>
                )}
            </AccordionSection>

            {/* Canvas Settings */}
            <AccordionSection
                title="Canvas Settings"
                icon={Monitor}
                isOpen={canvasOpen}
                onToggle={() => setCanvasOpen(!canvasOpen)}
            >
                <div className="canvas-settings-content">
                    {renderTool('preview')}
                </div>
            </AccordionSection>
        </aside>
    );
};

export default RightPanel;

