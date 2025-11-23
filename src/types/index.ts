// Type definitions for SVG Layer Toolkit

export interface PathData {
    id: string;
    element: SVGPathElement;
    d: string;
    fill: string;
    stroke: string;
    strokeWidth: string;
    transform: string;
    opacity: string;
    style: string;
    dataRegion: string;
    parentGroup: string | null;
    attributes: Record<string, string>;
}

export interface GroupData {
    id: string;
    element: SVGGElement;
    paths: number[];
    dataRegion: string;
    transform: string;
    attributes: Record<string, string>;
}

export interface HistoryState {
    svgData: string;
    timestamp: number;
}

export interface Template {
    id: string;
    name: string;
    svgData: string;
    createdAt: number;
}

export type BackgroundMode = 'none' | 'color' | 'grid' | 'checkerboard';
export type ToolName = 
    | 'preview' 
    | 'workflow' 
    | 'shapes' 
    | 'color-replacer' 
    | 'transform' 
    | 'alignment' 
    | 'attributes' 
    | 'path-merger' 
    | 'node-editor' 
    | 'text-to-path' 
    | 'path-offset' 
    | 'boolean-ops' 
    | 'image-tracer' 
    | 'animator' 
    | 'optimizer' 
    | 'path-simplifier' 
    | 'token-injector' 
    | 'comparator' 
    | 'generators' 
    | 'cleanup' 
    | 'measurement' 
    | 'export' 
    | 'templates' 
    | 'file-patch';

export type CanvasTool = 'select' | 'move' | 'resize' | 'copy' | 'duplicate' | 'delete';

// App State interface
export interface AppState {
    // SVG data
    svgData: string | null;
    svgElement: SVGSVGElement | null;
    paths: PathData[];
    groups: GroupData[];
    pathIdCounter: number;
    
    // Selection
    selectedPaths: Set<string>;
    hoveredPathId: string | null;
    selectionSource: string | null;
    
    // History
    history: HistoryState[];
    historyIndex: number;
    maxHistory: number;
    
    // UI state
    currentTool: CanvasTool;
    currentPanel: ToolName;
    backgroundMode: BackgroundMode;
    previewBgColor: string;
    spacePanning: boolean;
    
    // Templates
    templates: Template[];
    
    // Node editor
    nodeEditorActive: boolean;
    nodeHandles: SVGCircleElement[];
    editingPathId: string | null;
    
    // Snapping
    snapToGrid: boolean;
    snapToPoint: boolean;
    snapDistance: number;
    gridSize: number;
    showGridOverlay: boolean;
    
    // Selection tools
    isMarqueeSelecting: boolean;
    marqueeStart: { x: number; y: number } | null;
    
    // Clipboard
    clipboardPaths: PathData[];
    
    // Resize
    resizeHandles: SVGRectElement[];
    isResizing: boolean;
    resizeHandleType: string | null;
    
    // Drag
    pathDragEnabled: boolean;
    isDraggingPath: boolean;
    dragStartPoint: { x: number; y: number } | null;
    
    // Shape creation
    shapeCreationMode: string | null;
    shapeCreationStart: { x: number; y: number } | null;
    
    // Zoom
    currentZoom: number;
}
