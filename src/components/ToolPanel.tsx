import React from 'react';
import { useAppContext } from '../context/AppContext';
import type { ToolName } from '../types';
import PreviewTool from './tools/PreviewTool';
import WorkflowTool from './tools/WorkflowTool';
import ColorReplacer from './tools/ColorReplacer';
import TransformTool from './tools/TransformTool';
import AttributesTool from './tools/AttributesTool';
import AlignmentTools from './tools/AlignmentTools';
import PathMerger from './tools/PathMerger';
import NodeEditor from './tools/NodeEditor';
import TextToPath from './tools/TextToPath';
import PathOffset from './tools/PathOffset';
import BooleanOps from './tools/BooleanOps';
import PathSimplifier from './tools/PathSimplifier';
import Optimizer from './tools/Optimizer';
import CleanupTools from './tools/CleanupTools';
import MeasurementTools from './tools/MeasurementTools';
import ImageTracer from './tools/ImageTracer';
import Animator from './tools/Animator';
import TokenInjector from './tools/TokenInjector';
import Comparator from './tools/Comparator';
import Generators from './tools/Generators';
import ShapeLibrary from './tools/ShapeLibrary';
import ExportManager from './tools/ExportManager';
import Templates from './tools/Templates';
import FilePatch from './tools/FilePatch';

const ToolPanel: React.FC = () => {
    const { state } = useAppContext();
    const toolTitles: Record<ToolName, string> = {
        'preview': 'Preview & Background',
        'workflow': 'Workflow Manager',
        'shapes': 'Shape Library',
        'color-replacer': 'Color Finder & Replacer',
        'transform': 'Transform Controller',
        'alignment': 'Alignment Tools',
        'attributes': 'Attribute Editor',
        'path-merger': 'Path Combiner & Merger',
        'node-editor': 'Node Editor',
        'text-to-path': 'Text to Path',
        'path-offset': 'Path Offset',
        'boolean-ops': 'Boolean Operations',
        'image-tracer': 'Image Tracer',
        'animator': 'Path Animator',
        'optimizer': 'SVG Optimizer',
        'path-simplifier': 'Path Simplifier',
        'token-injector': 'Token Injector',
        'comparator': 'SVG Comparator',
        'generators': 'Generators',
        'cleanup': 'Cleanup Tools',
        'measurement': 'Measurement Tools',
        'export': 'Export Manager',
        'templates': 'Template System',
        'file-patch': 'File Patching',
    };

    return (
        <aside className="tool-panel">
            <div className="panel-header">
                <h2 id="panelTitle">{toolTitles[state.currentPanel]}</h2>
                <button className="btn-icon" id="closePanelBtn">✕</button>
            </div>
            <div className="panel-content" id="toolPanel">
                {state.currentPanel === 'preview' && <PreviewTool />}
                {state.currentPanel === 'workflow' && <WorkflowTool />}
                {state.currentPanel === 'shapes' && <ShapeLibrary />}
                {state.currentPanel === 'color-replacer' && <ColorReplacer />}
                {state.currentPanel === 'transform' && <TransformTool />}
                {state.currentPanel === 'alignment' && <AlignmentTools />}
                {state.currentPanel === 'attributes' && <AttributesTool />}
                {state.currentPanel === 'path-merger' && <PathMerger />}
                {state.currentPanel === 'node-editor' && <NodeEditor />}
                {state.currentPanel === 'text-to-path' && <TextToPath />}
                {state.currentPanel === 'path-offset' && <PathOffset />}
                {state.currentPanel === 'boolean-ops' && <BooleanOps />}
                {state.currentPanel === 'image-tracer' && <ImageTracer />}
                {state.currentPanel === 'animator' && <Animator />}
                {state.currentPanel === 'optimizer' && <Optimizer />}
                {state.currentPanel === 'path-simplifier' && <PathSimplifier />}
                {state.currentPanel === 'token-injector' && <TokenInjector />}
                {state.currentPanel === 'comparator' && <Comparator />}
                {state.currentPanel === 'generators' && <Generators />}
                {state.currentPanel === 'cleanup' && <CleanupTools />}
                {state.currentPanel === 'measurement' && <MeasurementTools />}
                {state.currentPanel === 'export' && <ExportManager />}
                {state.currentPanel === 'templates' && <Templates />}
                {state.currentPanel === 'file-patch' && <FilePatch />}
            </div>
        </aside>
    );
};

export default ToolPanel;

