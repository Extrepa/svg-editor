// SVG Layer Toolkit - Main Application
// Complete SVG manipulation suite with 16 professional tools

class SVGLayerToolkit {
    constructor() {
        this.svgData = null;
        this.svgElement = null;
        this.paths = [];
        this.groups = [];
        this.pathIdCounter = 0;
        this.selectedPaths = new Set();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 100;
        this.currentTool = 'select'; // Default tool: select
        this.contextMenu = null; // Context menu element
        this.hoveredPathId = null;
        this.backgroundMode = 'color'; // 'none', 'color', 'grid', 'checkerboard'
        this.previewBgColor = '#ffffff';
        this.spacePanning = false;
        this.miniMapRaf = null;
        this.selectionSource = null;
        this.templates = this.loadTemplatesFromStorage();
        this.nodeEditorActive = false;
        this.nodeHandles = [];
        this.editingPathId = null;
        this.snapToGrid = true; // Default enabled
        this.snapToPoint = false;
        this.snapDistance = 10; // pixels
        this.gridSize = 10; // Grid size for snapping
        this.showGridOverlay = false; // Show visual grid overlay
        this.isMarqueeSelecting = false;
        this.marqueeStart = null;
        this.marqueeBox = null;
        this.gridOverlayGroup = null; // SVG group for grid overlay
        this.clipboardPaths = []; // Store copied paths for paste
        this.resizeHandles = []; // Resize handles for selected objects
        this.isResizing = false;
        this.resizeHandleType = null; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
        this.resizeStartPoint = null;
        this.resizeStartBounds = null;
        this.isNudging = false; // Track if nudging with arrow keys
        this.showStartEndIndicators = false;
        this.startEndIndicators = [];
        this.guideLineDragMode = false;
        this.guideLineCancelHandler = null;
        this.pathDragEnabled = true; // Enable/disable drag-to-move
        this.isDraggingPath = false;
        this.dragStartPoint = null;
        this.draggedPaths = [];
        this.dragStartPositions = [];
        this.shapeCreationMode = null; // 'star', 'polygon', 'circle', etc.
        this.shapeCreationStart = null;
        this.shapeCreationPreview = null;
        
        // Load persisted background mode
        const savedBgMode = localStorage.getItem('backgroundMode');
        if (savedBgMode && ['none', 'color', 'grid', 'checkerboard'].includes(savedBgMode)) {
            this.backgroundMode = savedBgMode;
        }
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPanAndZoom();
        this.initDarkMode();
        this.applyBackgroundMods(); // Initialize background
        this.loadTool('preview');
        // Initialize tool system - set default tool
        this.setActiveTool('select');
    }

    initDarkMode() {
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        // Set up toggle button
        const toggleBtn = document.getElementById('darkModeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
            });
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const toggleBtn = document.getElementById('darkModeToggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            toggleBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    }

    setActiveTool(toolName) {
        this.currentTool = toolName;
        
        // Update toolbar button states
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tool="${toolName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update UI based on tool
        const wrapper = document.getElementById('svgWrapper');
        if (wrapper) {
            // Update cursor based on tool
            switch(toolName) {
                case 'move':
                    wrapper.style.cursor = 'move';
                    break;
                case 'resize':
                    wrapper.style.cursor = 'default';
                    break;
                case 'select':
                    wrapper.style.cursor = 'default';
                    break;
                default:
                    wrapper.style.cursor = 'default';
            }
        }
        
        if (toolName === 'resize') {
            // Resize handles will be shown on next render
            this.renderSVG();
        } else {
            // Remove resize handles if switching away from resize tool
            this.removeResizeHandles();
        }
    }

    setupEventListeners() {
        // File operations
        document.getElementById('fileInput').addEventListener('change', (e) => this.loadSVGFile(e));
        document.getElementById('loadFileBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('saveFileBtn').addEventListener('click', () => this.saveSVG());
        
        // Canvas toolbar buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                if (tool) {
                    this.setActiveTool(tool);
                    
                    // Handle tool-specific actions
                    if (tool === 'copy' && this.selectedPaths.size > 0) {
                        this.copySelectedPaths();
                    } else if (tool === 'duplicate' && this.selectedPaths.size > 0) {
                        this.duplicateSelectedPaths();
                    } else if (tool === 'delete' && this.selectedPaths.size > 0) {
                        if (confirm(`Delete ${this.selectedPaths.size} path(s)?`)) {
                            this.deleteSelectedPaths();
                        }
                    }
                }
            });
        });
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.switchTool(tool);
            });
        });
        
        // History
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    // Allow delete in inputs
                    return;
                }
                return;
            }
            
            // Tool selection shortcuts (only when not using modifier keys)
            if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                if (e.key === 'v' || e.key === 'V') {
                    e.preventDefault();
                    this.setActiveTool('select');
                    return;
                }
                if (e.key === 'm' || e.key === 'M') {
                    e.preventDefault();
                    this.setActiveTool('move');
                    return;
                }
                if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    this.setActiveTool('resize');
                    return;
                }
                if (e.key === 'c' || e.key === 'C') {
                    e.preventDefault();
                    if (this.selectedPaths.size > 0) {
                        this.setActiveTool('copy');
                        this.copySelectedPaths();
                    } else {
                        this.setActiveTool('copy');
                    }
                    return;
                }
            }
            
            // Delete/Backspace: Delete selected paths
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedPaths.size > 0) {
                e.preventDefault();
                if (confirm(`Delete ${this.selectedPaths.size} selected path(s)?`)) {
                    this.deleteSelectedPaths();
                }
                return;
            }
            
            // Ctrl/Cmd + G: Group selected
            if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                e.preventDefault();
                if (this.selectedPaths.size > 0) {
                    this.switchTool('workflow');
                    setTimeout(() => {
                        const groupInput = document.getElementById('newGroupName');
                        if (groupInput) {
                            groupInput.focus();
                            groupInput.select();
                        }
                    }, 100);
                }
                return;
            }
            
            // Ctrl/Cmd + Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }
            
            // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
            if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
                e.preventDefault();
                this.redo();
                return;
            }
            
            // Ctrl/Cmd + C: Copy selected paths
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                this.copySelectedPaths();
                return;
            }
            
            // Ctrl/Cmd + V: Paste paths
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                this.pastePaths();
                return;
            }
            
            // V: Switch to Workflow Manager (Selection tool)
            if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                this.switchTool('workflow');
                return;
            }
            
            // P: Switch to Node Editor
            if (e.key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                this.switchTool('node-editor');
                return;
            }
            
            // Ctrl/Cmd + D: Duplicate selected paths
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (this.selectedPaths.size > 0) {
                    this.duplicateSelectedPaths();
                }
                return;
            }
            
            // Ctrl/Cmd + A: Select all paths
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.selectAll();
                return;
            }
            
            // Escape: Deselect all
            if (e.key === 'Escape') {
                e.preventDefault();
                this.deselectAll();
                return;
            }
            
            // Arrow keys: Nudge selected objects
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && this.selectedPaths.size > 0) {
                e.preventDefault();
                let deltaX = 0, deltaY = 0;
                const nudgeAmount = this.snapToGrid ? this.gridSize : 1;
                
                switch (e.key) {
                    case 'ArrowUp':
                        deltaY = -nudgeAmount;
                        break;
                    case 'ArrowDown':
                        deltaY = nudgeAmount;
                        break;
                    case 'ArrowLeft':
                        deltaX = -nudgeAmount;
                        break;
                    case 'ArrowRight':
                        deltaX = nudgeAmount;
                        break;
                }
                
                this.nudgeSelectedPaths(deltaX, deltaY);
                return;
            }
            
            // [ and ]: Send backward / Bring forward (layer reordering)
            if (e.key === '[' && this.selectedPaths.size > 0) {
                e.preventDefault();
                // Move selected paths backward
                this.moveSelectedBackward();
                return;
            }
            
            if (e.key === ']' && this.selectedPaths.size > 0) {
                e.preventDefault();
                // Move selected paths forward
                this.moveSelectedForward();
                return;
            }
        });
        
        // Preview controls - use event delegation for buttons in Preview tool
        document.addEventListener('click', (e) => {
            if (e.target.id === 'previewFitToScreenBtn' || e.target.closest('#previewFitToScreenBtn')) {
                e.preventDefault();
                this.fitToScreen();
            } else if (e.target.id === 'previewGridBtn' || e.target.closest('#previewGridBtn')) {
                e.preventDefault();
                this.setBackgroundMode('grid');
            } else if (e.target.id === 'previewCheckerBtn' || e.target.closest('#previewCheckerBtn')) {
                e.preventDefault();
                this.setBackgroundMode('checkerboard');
            } else if (e.target.classList.contains('background-mode-btn')) {
                e.preventDefault();
                const mode = e.target.dataset.mode;
                if (mode) {
                    this.setBackgroundMode(mode);
                }
            }
        });
        
        // Zoom controls
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
        });
    }

    setupPanAndZoom() {
        const wrapper = document.getElementById('svgWrapper');
        if (!wrapper) return;

        this.currentZoom = 1;

        // Removed mouse wheel zoom - using +/- buttons instead

        let isPanning = false;
        let panButton = null;
        let startX = 0;
        let startY = 0;
        let scrollStartX = 0;
        let scrollStartY = 0;

        wrapper.addEventListener('mousedown', (e) => {
            const isMiddle = e.button === 1;
            const isAltPan = e.button === 2 || (e.button === 0 && this.spacePanning);
            if (!isMiddle && !isAltPan) return;
            isPanning = true;
            panButton = e.button;
            startX = e.clientX;
            startY = e.clientY;
            scrollStartX = wrapper.scrollLeft;
            scrollStartY = wrapper.scrollTop;
            wrapper.style.cursor = 'grabbing';
            e.preventDefault();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (!this.svgElement) return;
                this.spacePanning = true;
                wrapper.style.cursor = 'grab';
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.spacePanning = false;
                if (!isPanning) {
                    wrapper.style.cursor = '';
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            wrapper.scrollLeft = scrollStartX - dx;
            wrapper.scrollTop = scrollStartY - dy;
        });

        window.addEventListener('mouseup', () => {
            if (!isPanning) return;
            isPanning = false;
            panButton = null;
            wrapper.style.cursor = '';
        });

        wrapper.addEventListener('contextmenu', (e) => {
            if (isPanning || panButton === 2) {
                e.preventDefault();
            }
            if (this.spacePanning) return;
            
            // If right-clicking on empty space (not a path), show context menu for selected paths
            if (e.target.tagName !== 'path' && this.selectedPaths.size > 0) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, Array.from(this.selectedPaths)[0]);
            }
            // Don't otherwise prevent default on wrapper - let path handlers work
        });
    }

    // ==================== FILE OPERATIONS ====================
    
    async loadSVGFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            if (!text || text.trim().length === 0) {
                this.showError('File is empty');
                return;
            }
            this.parseSVG(text);
        } catch (error) {
            this.showError(`Error reading file: ${error.message}`);
        }
    }

    parseSVG(svgText) {
        if (!svgText || typeof svgText !== 'string' || svgText.trim().length === 0) {
            this.showError('Invalid SVG: File is empty');
            return;
        }
        
        let parser, doc, svg;
        try {
            parser = new DOMParser();
            doc = parser.parseFromString(svgText, 'image/svg+xml');
            
            // Check for parsing errors
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                this.showError('Invalid SVG: XML parsing error. Please check the file format.');
                return;
            }
            
            svg = doc.documentElement;
            
            if (!svg || svg.tagName !== 'svg') {
                this.showError('Invalid SVG: Root element must be <svg>');
                return;
            }
        } catch (error) {
            this.showError(`Error parsing SVG: ${error.message}`);
            return;
        }
        
        // Clear any previous errors
        this.hideError();

        this.pathIdCounter = 0;
        this.history = [];
        this.historyIndex = -1;
        
        this.svgData = svgText;
        this.svgElement = svg;
        
        try {
            this.extractPaths();
            this.extractGroups();
            this.saveState();
            this.renderSVG();
            this.applyBackgroundMods();
            // Set default zoom to fit viewBox with padding
            setTimeout(() => {
                try {
                    this.fitToScreen();
                } catch (e) {
                    console.warn('Could not fit to screen:', e);
                }
            }, 100);
            this.updateUI();
            this.selectionSource = null;
        } catch (error) {
            this.showError(`Error processing SVG: ${error.message}`);
            console.error('SVG processing error:', error);
        }
    }

    showError(message) {
        // Remove existing error
        this.hideError();
        
        // Create error display
        const errorDiv = document.createElement('div');
        errorDiv.id = 'svgErrorDisplay';
        errorDiv.style.cssText = `
            position: absolute;
            top: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(220, 53, 69, 0.95);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            max-width: 500px;
            text-align: center;
            font-size: 0.875rem;
        `;
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: space-between;">
                <span>⚠️ ${message}</span>
                <button onclick="app.hideError()" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; padding: 0 0.5rem;">×</button>
            </div>
        `;
        
        const previewContainer = document.getElementById('previewContainer');
        if (previewContainer) {
            previewContainer.appendChild(errorDiv);
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        const errorDiv = document.getElementById('svgErrorDisplay');
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }

    extractPaths() {
        this.paths = [];
        const allPaths = this.svgElement.querySelectorAll('path');
        const existingIds = new Set(Array.from(allPaths).map(p => p.id).filter(Boolean));
        this.pathIdCounter = existingIds.size;
        
        allPaths.forEach((path, index) => {
            if (!path.id) {
                let candidate = `path-${this.pathIdCounter++}`;
                while (existingIds.has(candidate)) {
                    candidate = `path-${this.pathIdCounter++}`;
                }
                path.id = candidate;
                existingIds.add(candidate);
            }
            const pathData = {
                id: path.id,
                element: path,
                d: path.getAttribute('d') || '',
                fill: path.getAttribute('fill') || 'none',
                stroke: path.getAttribute('stroke') || 'none',
                strokeWidth: path.getAttribute('stroke-width') || '0',
                transform: path.getAttribute('transform') || '',
                opacity: path.getAttribute('opacity') || '1',
                style: path.getAttribute('style') || '',
                dataRegion: path.getAttribute('data-region') || '',
                parentGroup: this.findParentGroup(path),
                attributes: this.getAllAttributes(path)
            };
            this.paths.push(pathData);
        });
    }

    extractGroups() {
        this.groups = [];
        const allGroups = this.svgElement.querySelectorAll('g');
        
        allGroups.forEach((group, index) => {
            const groupData = {
                id: group.id || `group-${index}`,
                element: group,
                paths: Array.from(group.querySelectorAll('path')).map(p => 
                    this.paths.findIndex(pp => pp.element === p)
                ).filter(i => i !== -1),
                dataRegion: group.getAttribute('data-region') || '',
                transform: group.getAttribute('transform') || '',
                attributes: this.getAllAttributes(group)
            };
            this.groups.push(groupData);
        });
    }

    findParentGroup(element) {
        let parent = element.parentElement;
        while (parent && parent.tagName !== 'svg') {
            if (parent.tagName === 'g') {
                return parent.id || null;
            }
            parent = parent.parentElement;
        }
        return null;
    }

    getAllAttributes(element) {
        const attrs = {};
        Array.from(element.attributes).forEach(attr => {
            attrs[attr.name] = attr.value;
        });
        return attrs;
    }

    renderSVG() {
        const wrapper = document.getElementById('svgWrapper');
        wrapper.innerHTML = '';
        
        if (!this.svgElement) return;
        
        const svgClone = this.svgElement.cloneNode(true);
        
        // Remove width/height attributes to allow viewBox to control sizing
        // This prevents the viewBox from cutting off content
        svgClone.removeAttribute('width');
        svgClone.removeAttribute('height');
        
        // Ensure the SVG can display content beyond the viewBox
        // Set preserveAspectRatio to allow content to be visible
        if (!svgClone.hasAttribute('preserveAspectRatio')) {
            svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        
        // Set explicit style to ensure SVG uses viewBox for sizing
        svgClone.style.width = '100%';
        svgClone.style.height = '100%';
        svgClone.style.maxWidth = 'none';
        svgClone.style.maxHeight = 'none';
        
        this.attachPathListeners(svgClone);
        wrapper.appendChild(svgClone);
        this.applyBackgroundMods();
        this.setupMarqueeSelection(wrapper, svgClone);
        this.updateGridOverlay(svgClone);
        
        document.getElementById('previewEmpty').style.display = 'none';
        document.getElementById('previewSvg').style.display = 'flex';
        this.scheduleMiniMap();
    }

    attachPathListeners(svgClone) {
        const paths = svgClone.querySelectorAll('path');
        paths.forEach(path => {
            path.addEventListener('mouseenter', (e) => {
                // Update cursor based on active tool
                if (this.currentTool === 'move') {
                    e.target.style.cursor = 'move';
                } else if (this.currentTool === 'resize') {
                    e.target.style.cursor = 'default';
                } else if (this.currentTool === 'select') {
                    e.target.style.cursor = 'pointer';
                } else {
                    e.target.style.cursor = 'default';
                }
                const pathId = e.target.id;
                this.hoveredPathId = pathId;
                if (!this.selectedPaths.has(pathId)) {
                    e.target.dataset._prevFilter = e.target.style.filter || '';
                    e.target.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.25)) drop-shadow(0 0 6px rgba(0,0,0,0.15))';
                }
            });
            
            path.addEventListener('mouseleave', (e) => {
                if (!this.selectedPaths.has(e.target.id)) {
                    e.target.style.filter = e.target.dataset._prevFilter || '';
                }
                e.target.style.cursor = '';
            });
            
            path.addEventListener('mousedown', (e) => {
                // Don't start drag if shape creation mode is active
                if (this.shapeCreationMode) return;
                
                // If dragging is disabled, just do selection
                // Only allow drag when Move tool is active
                if (this.currentTool !== 'move' || !this.pathDragEnabled) {
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                        this.togglePathSelection(e.target.id);
                    } else {
                        this.selectedPaths.clear();
                        this.selectedPaths.add(e.target.id);
                        this.updateSelectionVisual();
                    }
                    this.switchTool('workflow');
                    return;
                }
                
                // Check if this path is selected
                const pathId = e.target.id;
                const isSelected = this.selectedPaths.has(pathId);
                
                if (!isSelected) {
                    // If not selected, select it (but don't start dragging yet)
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                        this.togglePathSelection(pathId);
                    } else {
                        this.selectedPaths.clear();
                        this.selectedPaths.add(pathId);
                        this.updateSelectionVisual();
                    }
                    this.switchTool('workflow');
                    return;
                }
                
                // Path is selected - start drag
                e.preventDefault();
                e.stopPropagation();
                
                this.isDraggingPath = true;
                const svg = svgClone;
                const startPoint = this.screenToSVG(svg, e.clientX, e.clientY);
                this.dragStartPoint = startPoint;
                
                // Store initial positions of all selected paths
                this.draggedPaths = Array.from(this.selectedPaths);
                this.dragStartPositions = this.draggedPaths.map(id => {
                    const path = this.paths.find(p => p.id === id);
                    if (!path) return null;
                    try {
                        const bbox = path.element.getBBox();
                        return {
                            id: id,
                            x: bbox.x,
                            y: bbox.y,
                            transform: path.transform || ''
                        };
                    } catch (e) {
                        return null;
                    }
                }).filter(p => p !== null);
                
                // Prevent text selection during drag
                document.body.style.userSelect = 'none';
                e.target.style.cursor = 'grabbing';
                
                // Mouse move handler
                const mouseMoveHandler = (moveE) => {
                    if (!this.isDraggingPath) return;
                    
                    const currentPoint = this.screenToSVG(svg, moveE.clientX, moveE.clientY);
                    let deltaX = currentPoint.x - this.dragStartPoint.x;
                    let deltaY = currentPoint.y - this.dragStartPoint.y;
                    
                    // Apply grid snapping if enabled
                    if (this.snapToGrid) {
                        deltaX = Math.round(deltaX / this.gridSize) * this.gridSize;
                        deltaY = Math.round(deltaY / this.gridSize) * this.gridSize;
                    }
                    
                    // Update position indicator
                    if (this.dragStartPositions.length > 0) {
                        const firstStartPos = this.dragStartPositions[0];
                        if (firstStartPos) {
                            const newX = firstStartPos.x + deltaX;
                            const newY = firstStartPos.y + deltaY;
                            this.updatePositionIndicator(newX, newY);
                        }
                    }
                    
                    // Create drag preview (ghost paths) if they don't exist
                    if (!this.dragPreviewPaths || this.dragPreviewPaths.length === 0) {
                        this.dragPreviewPaths = [];
                        this.draggedPaths.forEach(pathId => {
                            const previewPath = svgClone.querySelector(`#${pathId}`);
                            if (previewPath) {
                                const ghost = previewPath.cloneNode(true);
                                ghost.style.opacity = '0.4';
                                ghost.style.filter = 'drop-shadow(0 0 4px rgba(74, 144, 226, 0.6))';
                                ghost.style.pointerEvents = 'none';
                                ghost.id = `ghost-${pathId}`;
                                svgClone.appendChild(ghost);
                                this.dragPreviewPaths.push(ghost);
                            }
                        });
                    }
                    
                    // Update all selected paths and preview
                    this.draggedPaths.forEach((pathId, index) => {
                        const startPos = this.dragStartPositions[index];
                        if (!startPos) return;
                        
                        const path = this.paths.find(p => p.id === pathId);
                        if (!path || !path.element) return;
                        
                        // Calculate new transform
                        let newTransform = '';
                        if (startPos.transform) {
                            // Parse existing transform
                            const matches = startPos.transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                            if (matches) {
                                const tx = parseFloat(matches[1]) + deltaX;
                                const ty = parseFloat(matches[2]) + deltaY;
                                newTransform = `translate(${tx},${ty})`;
                            } else {
                                newTransform = `translate(${deltaX},${deltaY}) ${startPos.transform}`;
                            }
                        } else {
                            newTransform = `translate(${deltaX},${deltaY})`;
                        }
                        
                        // Apply transform to preview (clone)
                        const previewPath = svgClone.querySelector(`#${pathId}`);
                        if (previewPath) {
                            previewPath.setAttribute('transform', newTransform);
                        }
                        
                        // Update ghost preview
                        const ghost = svgClone.querySelector(`#ghost-${pathId}`);
                        if (ghost) {
                            ghost.setAttribute('transform', newTransform);
                        }
                    });
                };
                
                // Mouse up handler
                const mouseUpHandler = (upE) => {
                    if (!this.isDraggingPath) return;
                    
                    this.isDraggingPath = false;
                    document.body.style.userSelect = '';
                    
                    // Calculate final delta
                    const endPoint = this.screenToSVG(svg, upE.clientX, upE.clientY);
                    let deltaX = endPoint.x - this.dragStartPoint.x;
                    let deltaY = endPoint.y - this.dragStartPoint.y;
                    
                    // Apply grid snapping if enabled
                    if (this.snapToGrid) {
                        deltaX = Math.round(deltaX / this.gridSize) * this.gridSize;
                        deltaY = Math.round(deltaY / this.gridSize) * this.gridSize;
                    }
                    
                    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
                        // Apply transform to actual paths
                        this.saveState();
                        this.draggedPaths.forEach((pathId, index) => {
                            const startPos = this.dragStartPositions[index];
                            if (!startPos) return;
                            
                            const path = this.paths.find(p => p.id === pathId);
                            if (!path || !path.element) return;
                            
                            // Calculate new transform
                            let tx, ty;
                            if (startPos.transform) {
                                const matches = startPos.transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                                if (matches) {
                                    const origTx = parseFloat(matches[1]);
                                    const origTy = parseFloat(matches[2]);
                                    
                                    // Calculate new position
                                    let newX = startPos.x + origTx + deltaX;
                                    let newY = startPos.y + origTy + deltaY;
                                    
                                    // Apply grid snapping to new position
                                    if (this.snapToGrid) {
                                        newX = Math.round(newX / this.gridSize) * this.gridSize;
                                        newY = Math.round(newY / this.gridSize) * this.gridSize;
                                    }
                                    
                                    // Calculate transform from snapped position
                                    tx = newX - startPos.x;
                                    ty = newY - startPos.y;
                                } else {
                                    // No existing translate, just use delta with snapping
                                    if (this.snapToGrid) {
                                        const newX = Math.round((startPos.x + deltaX) / this.gridSize) * this.gridSize;
                                        const newY = Math.round((startPos.y + deltaY) / this.gridSize) * this.gridSize;
                                        tx = newX - startPos.x;
                                        ty = newY - startPos.y;
                                    } else {
                                        tx = deltaX;
                                        ty = deltaY;
                                    }
                                }
                            } else {
                                // No existing transform, calculate from start position
                                if (this.snapToGrid) {
                                    const newX = Math.round((startPos.x + deltaX) / this.gridSize) * this.gridSize;
                                    const newY = Math.round((startPos.y + deltaY) / this.gridSize) * this.gridSize;
                                    tx = newX - startPos.x;
                                    ty = newY - startPos.y;
                                } else {
                                    tx = deltaX;
                                    ty = deltaY;
                                }
                            }
                            
                            const newTransform = startPos.transform && !startPos.transform.match(/translate/) 
                                ? `translate(${tx},${ty}) ${startPos.transform}`
                                : `translate(${tx},${ty})`;
                            
                            path.element.setAttribute('transform', newTransform);
                            path.transform = newTransform;
                        });
                        
                        this.extractPaths();
                        this.renderSVG();
                    } else {
                        // Click without drag - handle selection
                        if (upE.shiftKey || upE.ctrlKey || upE.metaKey) {
                            this.togglePathSelection(upE.target.id);
                        } else {
                            this.selectedPaths.clear();
                            this.selectedPaths.add(upE.target.id);
                            this.updateSelectionVisual();
                        }
                        this.switchTool('workflow');
                    }
                    
                    // Clean up drag preview
                    if (this.dragPreviewPaths) {
                        this.dragPreviewPaths.forEach(ghost => {
                            if (ghost.parentNode) {
                                ghost.parentNode.removeChild(ghost);
                            }
                        });
                        this.dragPreviewPaths = [];
                    }
                    
                    // Clean up
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                    
                    // Hide position indicator
                    this.hidePositionIndicator();
                    
                    // Reset cursor
                    paths.forEach(p => {
                        if (this.selectedPaths.has(p.id)) {
                            p.style.cursor = 'grab';
                        } else {
                            p.style.cursor = 'pointer';
                        }
                    });
                };
                
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                
                // Set cursor to grabbing
                paths.forEach(p => {
                    if (this.selectedPaths.has(p.id)) {
                        p.style.cursor = 'grab';
                    }
                });
            });
            
            path.addEventListener('click', (e) => {
                // Only handle click if not dragging
                if (this.isDraggingPath) {
                    e.stopPropagation();
                    return;
                }
                
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    // Multi-select with modifier keys
                    this.togglePathSelection(e.target.id);
                } else {
                    // Single select
                    this.selectedPaths.clear();
                    this.selectedPaths.add(e.target.id);
                    this.updateSelectionVisual();
                }
                // Switch to workflow tool when clicking in preview
                this.switchTool('workflow');
            });
            
            // Right-click to show context menu
            path.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pathId = e.target.id;
                const pathElement = this.paths.find(p => p.id === pathId);
                if (!pathElement) return;
                
                // Select this path if not already selected
                if (!this.selectedPaths.has(pathId)) {
                    this.selectedPaths.clear();
                    this.selectedPaths.add(pathId);
                    this.updateSelectionVisual();
                }
                
                // Show context menu at cursor position
                this.showContextMenu(e.clientX, e.clientY, pathId);
                
                // Pick fill color first, then stroke (for color picker tool if needed)
                const colorToPick = pathElement.fill && pathElement.fill !== 'none' 
                    ? pathElement.fill 
                    : (pathElement.stroke && pathElement.stroke !== 'none' ? pathElement.stroke : null);
                
                if (colorToPick) {
                    this.selectedColor = colorToPick;
                    // Switch to workflow tool and open colors edit
                    this.switchTool('workflow');
                    setTimeout(() => {
                        this.toggleWorkflowEdit('colors');
                        // Set the color in both color picker and hex input
                        const fillInput = document.getElementById('workflowFillColor');
                        const fillHex = document.getElementById('workflowFillHex');
                        const strokeInput = document.getElementById('workflowStrokeColor');
                        const strokeHex = document.getElementById('workflowStrokeHex');
                        
                        if (pathElement.fill && pathElement.fill !== 'none') {
                            if (fillInput) fillInput.value = pathElement.fill;
                            if (fillHex) fillHex.value = pathElement.fill;
                        }
                        if (pathElement.stroke && pathElement.stroke !== 'none') {
                            if (strokeInput) strokeInput.value = pathElement.stroke;
                            if (strokeHex) strokeHex.value = pathElement.stroke;
                        }
                    }, 200);
                } else {
                    alert('This path has no fill or stroke color to pick');
                }
            });
        });
    }

    setupMarqueeSelection(wrapper, svg) {
        let marqueeStart = null;
        let marqueeBox = null;
        let isMarqueeActive = false;
        
        // Use a separate handler that runs in capture phase to check before path handlers
        const marqueeHandler = (e) => {
            // Only start marquee if clicking on empty space (wrapper or svg element, not paths)
            if (e.target.tagName === 'path') return;
            if (e.button !== 0) return; // Only left mouse button
            if (e.shiftKey || e.ctrlKey || e.metaKey) return; // Don't interfere with modifier key selections
            if (this.shapeCreationMode) return;
            if (this.spacePanning) return; // Don't interfere with panning
            
            // Check if clicking on wrapper or svg (empty space)
            const target = e.target;
            const isWrapper = target.id === 'svgWrapper';
            const isSVG = target.tagName === 'svg';
            const isInWrapper = target.closest('#svgWrapper');
            
            // Only proceed if clicking on wrapper or svg, not on paths
            if (!isWrapper && !isSVG && !isInWrapper) return;
            
            // Small delay to check if path click happened
            setTimeout(() => {
                // If a path was clicked or dragging started, don't start marquee
                if (this.isDraggingPath || e.target.tagName === 'path') return;
                
                // Start marquee selection
                marqueeStart = this.screenToSVG(svg, e.clientX, e.clientY);
                this.isMarqueeSelecting = true;
                isMarqueeActive = true;
                
                // Create marquee box
                const svgNS = 'http://www.w3.org/2000/svg';
                marqueeBox = document.createElementNS(svgNS, 'rect');
                marqueeBox.setAttribute('fill', 'rgba(74, 144, 226, 0.1)');
                marqueeBox.setAttribute('stroke', '#4a90e2');
                marqueeBox.setAttribute('stroke-width', '1');
                marqueeBox.setAttribute('stroke-dasharray', '5,5');
                marqueeBox.style.pointerEvents = 'none';
                marqueeBox.id = 'marquee-selection-box';
                svg.appendChild(marqueeBox);
                
                e.preventDefault();
                e.stopPropagation();
                
                const mouseMoveHandler = (moveE) => {
                    if (!isMarqueeActive || !marqueeStart) return;
                    
                    const currentPoint = this.screenToSVG(svg, moveE.clientX, moveE.clientY);
                    const x = Math.min(marqueeStart.x, currentPoint.x);
                    const y = Math.min(marqueeStart.y, currentPoint.y);
                    const width = Math.abs(currentPoint.x - marqueeStart.x);
                    const height = Math.abs(currentPoint.y - marqueeStart.y);
                    
                    if (marqueeBox) {
                        marqueeBox.setAttribute('x', x);
                        marqueeBox.setAttribute('y', y);
                        marqueeBox.setAttribute('width', width);
                        marqueeBox.setAttribute('height', height);
                    }
                    
                    // Highlight paths that intersect with marquee box
                    if (width > 5 && height > 5) {
                        const rect = { x, y, width, height };
                        const paths = svg.querySelectorAll('path');
                        paths.forEach(path => {
                            try {
                                const bbox = path.getBBox();
                                const intersects = !(bbox.x + bbox.width < rect.x || 
                                                    bbox.x > rect.x + rect.width ||
                                                    bbox.y + bbox.height < rect.y ||
                                                    bbox.y > rect.y + rect.height);
                                
                                if (intersects && !this.selectedPaths.has(path.id)) {
                                    // Highlight intersecting paths
                                    path.style.opacity = '0.6';
                                    path.style.filter = 'drop-shadow(0 0 4px rgba(74, 144, 226, 0.8))';
                                } else if (!intersects && !this.selectedPaths.has(path.id)) {
                                    // Reset non-intersecting paths
                                    path.style.opacity = '';
                                    path.style.filter = '';
                                }
                            } catch (e) {
                                // Skip paths without valid bounds
                            }
                        });
                    }
                };
                
                const mouseUpHandler = (upE) => {
                    if (!isMarqueeActive) return;
                    
                    isMarqueeActive = false;
                    this.isMarqueeSelecting = false;
                    
                    if (marqueeBox && marqueeBox.parentNode) {
                        const rect = {
                            x: parseFloat(marqueeBox.getAttribute('x')),
                            y: parseFloat(marqueeBox.getAttribute('y')),
                            width: parseFloat(marqueeBox.getAttribute('width')),
                            height: parseFloat(marqueeBox.getAttribute('height'))
                        };
                        
                        // Only select if marquee box has meaningful size
                        if (rect.width > 5 && rect.height > 5) {
                            // Find all paths that intersect with the marquee box
                            const selectedInMarquee = new Set();
                            this.paths.forEach(path => {
                                try {
                                    const bbox = path.element.getBBox();
                                    // Check if path bbox intersects with marquee box
                                    if (!(bbox.x + bbox.width < rect.x || 
                                          bbox.x > rect.x + rect.width ||
                                          bbox.y + bbox.height < rect.y ||
                                          bbox.y > rect.y + rect.height)) {
                                        selectedInMarquee.add(path.id);
                                    }
                                } catch (e) {
                                    // Skip paths that can't get bbox
                                }
                            });
                            
                            // Update selection
                            if (selectedInMarquee.size > 0) {
                                this.selectedPaths = selectedInMarquee;
                                this.updateSelectionVisual();
                                this.switchTool('workflow');
                            }
                        }
                        
                        // Remove marquee box
                        if (marqueeBox && marqueeBox.parentNode) {
                            marqueeBox.parentNode.removeChild(marqueeBox);
                        }
                        
                        // Reset all path highlights
                        const paths = svg.querySelectorAll('path');
                        paths.forEach(path => {
                            if (!this.selectedPaths.has(path.id)) {
                                path.style.opacity = '';
                                path.style.filter = '';
                            }
                        });
                    }
                    
                    marqueeBox = null;
                    marqueeStart = null;
                    
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                };
                
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            }, 10);
        };
        
        wrapper.addEventListener('mousedown', marqueeHandler, true); // Use capture phase
    }

    saveSVG(minify = false) {
        if (!this.svgElement) return;
        
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(this.svgElement);
        
        if (minify) {
            svgString = this.minifySVG(svgString);
        }
        
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited.svg';
        a.click();
        URL.revokeObjectURL(url);
    }

    // ==================== TOOL SYSTEM ====================
    
    switchTool(toolName) {
        this.currentTool = toolName;
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tool === toolName);
        });
        this.loadTool(toolName);
    }

    loadTool(toolName) {
        const panel = document.getElementById('toolPanel');
        const title = document.getElementById('panelTitle');
        
        const toolMap = {
            'preview': { title: 'Preview & Background', content: this.renderPreviewTool },
            'workflow': { title: 'Workflow Manager', content: this.renderWorkflowTool },
            'shapes': { title: 'Shape Library', content: this.renderShapeLibrary },
            'color-replacer': { title: 'Color Finder & Replacer', content: this.renderColorReplacer },
            'transform': { title: 'Transform Controller', content: this.renderTransformTool },
            'alignment': { title: 'Alignment Tools', content: this.renderAlignmentTools },
            'attributes': { title: 'Attribute Editor', content: this.renderAttributesTool },
            'path-merger': { title: 'Path Combiner & Merger', content: this.renderPathMerger },
            'node-editor': { title: 'Node Editor', content: this.renderNodeEditor },
            'text-to-path': { title: 'Text to Path', content: this.renderTextToPath },
            'path-offset': { title: 'Path Offset', content: this.renderPathOffset },
            'boolean-ops': { title: 'Boolean Operations', content: this.renderBooleanOps },
            'image-tracer': { title: 'Image Tracer', content: this.renderImageTracer },
            'animator': { title: 'Path Animator', content: this.renderAnimator },
            'optimizer': { title: 'SVG Optimizer', content: this.renderOptimizer },
            'path-simplifier': { title: 'Path Simplifier', content: this.renderPathSimplifier },
            'token-injector': { title: 'Token Injector', content: this.renderTokenInjector },
            'comparator': { title: 'SVG Comparator', content: this.renderComparator },
            'generators': { title: 'Generators', content: this.renderGenerators },
            'cleanup': { title: 'Cleanup Tools', content: this.renderCleanupTools },
            'measurement': { title: 'Measurement Tools', content: this.renderMeasurementTools },
            'export': { title: 'Export Manager', content: this.renderExportManager },
            'templates': { title: 'Template System', content: this.renderTemplates },
            'file-patch': { title: 'File Patching', content: this.renderFilePatch }
        };
        
        const tool = toolMap[toolName] || toolMap['preview'];
        title.textContent = tool.title;
        panel.innerHTML = tool.content.call(this);
        
        // Re-attach event listeners for the new tool
        this.attachToolListeners(toolName);
    }

    attachToolListeners(toolName) {
        if (toolName === 'path-inspector') {
            document.querySelectorAll('.path-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    const pathId = item.dataset.pathId;
                    this.togglePathSelection(pathId);
                    this.scrollPathIntoView(pathId);
                    this.loadTool('path-inspector');
                });
            });
        }
        
        if (toolName === 'groups') {
            this.setupLayerDragAndDrop();
        }
        
        if (toolName === 'selection') {
            // Sync color inputs
            setTimeout(() => {
                const fillPicker = document.getElementById('selFill');
                const fillHex = document.getElementById('selFillHex');
                const strokePicker = document.getElementById('selStroke');
                const strokeHex = document.getElementById('selStrokeHex');
                
                if (fillPicker && fillHex) {
                    fillPicker.addEventListener('input', (e) => {
                        fillHex.value = e.target.value;
                    });
                    fillHex.addEventListener('input', (e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                            fillPicker.value = val;
                        }
                    });
                }
                
                if (strokePicker && strokeHex) {
                    strokePicker.addEventListener('input', (e) => {
                        strokeHex.value = e.target.value;
                    });
                    strokeHex.addEventListener('input', (e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                            strokePicker.value = val;
                        }
                    });
                }
            }, 100);
        }
    }

    setupLayerDragAndDrop() {
        const panel = document.getElementById('layersPanel');
        if (!panel) return;
        
        let draggedElement = null;
        
        panel.querySelectorAll('.layer-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedElement = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedElement = null;
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const afterElement = this.getDragAfterElement(panel, e.clientY);
                if (afterElement == null) {
                    panel.appendChild(draggedElement);
                } else {
                    panel.insertBefore(draggedElement, afterElement);
                }
            });
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.layer-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // ==================== WORKFLOW MANAGER (Combined Path Inspector, Groups, Selection) ====================
    
    renderWorkflowTool() {
        if (!this.paths.length) {
            return `
                <div class="tool-explanation">
                    <h3>Workflow Manager</h3>
                    <p><strong>Step 1:</strong> Click paths in preview to select them</p>
                    <p><strong>Step 2:</strong> Name selected paths</p>
                    <p><strong>Step 3:</strong> Create groups from selected paths</p>
                    <p><strong>Step 4:</strong> Reorder layers (what appears on top)</p>
                    <p><strong>Step 5:</strong> Select group to edit all paths in it</p>
                </div>
                <p>No paths found. Load an SVG file first.</p>
            `;
        }
        
        // Path count validation
        const pathCount = this.paths.length;
        const normalMax = 500; // Normal SVG: 10-500 paths
        const warningMax = 2000; // Warning: 500-2000 paths
        let pathCountWarning = '';
        if (pathCount > warningMax) {
            pathCountWarning = `<div style="padding: 0.75rem; background: rgba(255, 165, 0, 0.1); border: 2px solid orange; border-radius: var(--border-radius); margin-bottom: 1rem;">
                <strong style="color: orange;">⚠️ Warning:</strong> This SVG has ${pathCount} paths, which is very high. Consider using Path Simplifier or Image Tracer with higher simplification settings.
            </div>`;
        } else if (pathCount > normalMax) {
            pathCountWarning = `<div style="padding: 0.75rem; background: rgba(255, 200, 0, 0.1); border: 2px solid #ffc800; border-radius: var(--border-radius); margin-bottom: 1rem;">
                <strong style="color: #ffc800;">ℹ️ Note:</strong> This SVG has ${pathCount} paths. Consider simplifying if performance is slow.
            </div>`;
        }
        
        // Find ungrouped paths
        const ungroupedPaths = [];
        const pathGroupMap = new Map();
        
        this.groups.forEach(group => {
            group.paths.forEach(pathIndex => {
                pathGroupMap.set(pathIndex, group.id);
            });
        });
        
        this.paths.forEach((path, index) => {
            if (!pathGroupMap.has(index) && !path.parentGroup) {
                ungroupedPaths.push(path);
            }
        });
        
        // Build layers list - only groups
        const allLayers = [];
        this.groups.forEach((group, index) => {
            allLayers.push({
                type: 'group',
                id: group.id,
                name: group.id,
                pathCount: group.paths.length,
                domIndex: index,
                element: group.element
            });
        });
        
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        // Get current group for selected paths (if all in same group)
        let currentGroup = null;
        if (selectedCount > 0) {
            const groups = new Set();
            selectedPaths.forEach(p => {
                const group = this.groups.find(g => g.paths.includes(this.paths.indexOf(p)));
                if (group) groups.add(group.id);
            });
            if (groups.size === 1) {
                currentGroup = Array.from(groups)[0];
            }
        }
        
        return `
            <div class="tool-explanation">
                <h3>Workflow Manager</h3>
                <p><strong>Workflow:</strong> 1) Click paths in preview → 2) Name them → 3) Create groups → 4) Reorder layers → 5) Select group to edit</p>
            </div>
            
            ${pathCountWarning}
            
            ${selectedCount > 0 ? `
                <div class="form-group workflow-editor" style="padding: 1.5rem; background: rgba(74, 144, 226, 0.1); border-radius: var(--border-radius); border: 2px solid var(--primary-color); margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div>
                            <strong style="font-size: 1.125rem; color: var(--primary-color);">${selectedCount} Path(s) Selected</strong>
                        </div>
                        <button class="btn btn-small" onclick="app.deselectAll()">Clear Selection</button>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                        <button class="btn btn-small" onclick="app.selectAll()">Select All (${this.paths.length})</button>
                        <button class="btn btn-small" onclick="app.invertSelection()">Invert Selection</button>
                        <button class="btn btn-small" onclick="app.selectSimilarPaths()">Select Similar</button>
                    </div>
                    
                    <!-- Name Field -->
                    <div class="workflow-field" style="margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <label class="form-label" style="margin: 0;">Path Name</label>
                            <button class="btn-icon workflow-edit-btn" onclick="app.toggleWorkflowEdit('name')" id="editNameBtn" title="Edit name">
                                ✏️
                            </button>
                        </div>
                        <div id="nameDisplay" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-weight: 600; color: var(--text-primary);">${selectedCount === 1 ? selectedPaths[0].id : `${selectedCount} paths`}</span>
                        </div>
                        <div id="nameEdit" style="display: none;">
                            <input type="text" class="form-input" id="workflowNameInput" value="${selectedCount === 1 ? selectedPaths[0].id : ''}" placeholder="Enter new name" style="margin-bottom: 0.5rem;">
                            <button class="btn btn-primary btn-small" onclick="app.saveWorkflowName()">Save Name</button>
                        </div>
                    </div>
                    
                    <!-- Group Field -->
                    <div class="workflow-field" style="margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <label class="form-label" style="margin: 0;">Group</label>
                            <button class="btn-icon workflow-edit-btn" onclick="app.toggleWorkflowEdit('group')" id="editGroupBtn" title="Edit group">
                                ✏️
                            </button>
                        </div>
                        <div id="groupDisplay" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: var(--text-primary);">${currentGroup || 'No group assigned'}</span>
                        </div>
                        <div id="groupEdit" style="display: none;">
                            <select class="form-input" id="workflowGroupSelect" style="margin-bottom: 0.5rem;">
                                <option value="">-- No Group --</option>
                                ${this.groups.map(g => `<option value="${g.id}" ${currentGroup === g.id ? 'selected' : ''}>${g.id}</option>`).join('')}
                            </select>
                            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <input type="text" class="form-input" id="workflowNewGroupInput" placeholder="Or create new group" style="flex: 1;">
                            </div>
                            <button class="btn btn-primary btn-small" onclick="app.saveWorkflowGroup()">Save Group</button>
                        </div>
                    </div>
                    
                    <!-- Attributes -->
                    <div class="workflow-field" style="margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <label class="form-label" style="margin: 0;">Attributes</label>
                            <button class="btn-icon workflow-edit-btn" onclick="app.toggleWorkflowEdit('attributes')" id="editAttributesBtn" title="Edit attributes">
                                ✏️
                            </button>
                        </div>
                        <div id="attributesDisplay">
                            ${selectedCount === 1 ? `
                                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                    Fill: ${selectedPaths[0].fill || 'none'} | Stroke: ${selectedPaths[0].stroke || 'none'} | Opacity: ${selectedPaths[0].opacity || '1'}
                                </div>
                            ` : `
                                <div style="font-size: 0.875rem; color: var(--text-secondary);">Multiple paths selected</div>
                            `}
                        </div>
                        <div id="attributesEdit" style="display: none;">
                            ${this.renderWorkflowAttributes(selectedPaths)}
                        </div>
                    </div>
                    
                    <!-- Transform -->
                    <div class="workflow-field" style="margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <label class="form-label" style="margin: 0;">Transform</label>
                            <button class="btn-icon workflow-edit-btn" onclick="app.toggleWorkflowEdit('transform')" id="editTransformBtn" title="Edit transform">
                                ✏️
                            </button>
                        </div>
                        <div id="transformDisplay" style="font-size: 0.875rem; color: var(--text-secondary);">
                            ${selectedCount === 1 && selectedPaths[0].transform ? selectedPaths[0].transform : 'No transform applied'}
                        </div>
                        <div id="transformEdit" style="display: none;">
                            ${this.renderWorkflowTransform()}
                        </div>
                    </div>
                    
                    <!-- Colors -->
                    <div class="workflow-field" style="margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <label class="form-label" style="margin: 0;">Colors</label>
                            <button class="btn-icon workflow-edit-btn" onclick="app.toggleWorkflowEdit('colors')" id="editColorsBtn" title="Edit colors">
                                ✏️
                            </button>
                        </div>
                        <div id="colorsDisplay" style="font-size: 0.875rem; color: var(--text-secondary);">
                            ${selectedCount === 1 ? `
                                Fill: <span style="display: inline-block; width: 20px; height: 20px; background: ${selectedPaths[0].fill || 'transparent'}; border: 1px solid var(--border-color); vertical-align: middle;"></span>
                                Stroke: <span style="display: inline-block; width: 20px; height: 20px; background: ${selectedPaths[0].stroke || 'transparent'}; border: 1px solid var(--border-color); vertical-align: middle;"></span>
                            ` : 'Multiple paths selected'}
                        </div>
                        <div id="colorsEdit" style="display: none;">
                            ${this.renderWorkflowColors(selectedPaths)}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="workflow-field" style="margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <label class="form-label" style="margin: 0;">Actions</label>
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn btn-small" onclick="app.duplicateSelectedPaths()">Duplicate</button>
                            <button class="btn btn-small" onclick="app.deleteSelectedPaths()" style="background: var(--danger-color);">Delete</button>
                        </div>
                    </div>
                    
                    <!-- Final Save -->
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid var(--border-color);">
                        <button class="btn btn-primary" onclick="app.saveWorkflowChanges()" style="width: 100%;">Save All Changes</button>
                    </div>
                </div>
            ` : `
                <div class="form-group" style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); text-align: center; margin-bottom: 1.5rem;">
                    <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">No paths selected</p>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">Click paths in the preview to select them</p>
                </div>
            `}
            
            <div class="form-group">
                <label class="form-label">Step 3: Layers (Top = Front, Bottom = Back)</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Drag to reorder. Items at top appear on top.
                </p>
                <div class="layers-panel" id="layersPanel">
                    ${allLayers.map((layer, idx) => {
                        const groupPaths = this.groups[layer.domIndex]?.paths.map(i => this.paths[i]).filter(p => p) || [];
                        const allSelected = groupPaths.length > 0 && groupPaths.every(p => this.selectedPaths.has(p.id));
                        return `
                        <div class="layer-item ${allSelected ? 'layer-selected' : ''}" draggable="true" data-layer-type="${layer.type}" data-layer-id="${layer.id}" data-layer-index="${idx}" data-dom-index="${layer.domIndex}">
                            <div class="layer-item-handle">☰</div>
                            <div class="layer-item-content" style="flex: 1; min-width: 0;">
                                <div class="layer-item-header">
                                    <input type="text" class="layer-name-input" value="${layer.name}" onchange="app.renameGroup('${layer.id}', this.value)" style="font-weight: 600; font-size: 0.875rem; border: none; background: transparent; padding: 0; width: auto; min-width: 80px; max-width: 150px;">
                                    <span class="layer-item-type">group</span>
                                </div>
                                <div class="layer-item-meta">
                                    <span>${layer.pathCount} paths</span>
                                </div>
                            </div>
                            <div class="layer-item-actions-compact">
                                <button class="btn-icon-compact" onclick="app.selectGroup('${layer.id}')" title="Select All">✓</button>
                                <button class="btn-icon-compact" onclick="app.duplicateGroup('${layer.id}')" title="Duplicate">📋</button>
                                <button class="btn-icon-compact" onclick="app.deleteGroup('${layer.id}')" title="Delete">🗑</button>
                                <button class="btn-icon-compact" onclick="app.moveLayerUp(${idx})" ${idx === 0 ? 'disabled' : ''} title="Move Up">↑</button>
                                <button class="btn-icon-compact" onclick="app.moveLayerDown(${idx})" ${idx === allLayers.length - 1 ? 'disabled' : ''} title="Move Down">↓</button>
                            </div>
                        </div>
                    `;
                    }).join('')}
                    ${ungroupedPaths.length > 0 ? `
                        <div class="layer-item" data-layer-type="ungrouped" data-layer-id="ungrouped">
                            <div class="layer-item-handle">☰</div>
                            <div class="layer-item-content" style="flex: 1; min-width: 0;">
                                <div class="layer-item-header">
                                    <span class="layer-item-name">Ungrouped Paths</span>
                                    <span class="layer-item-type">paths</span>
                                </div>
                                <div class="layer-item-meta">
                                    <span>${ungroupedPaths.length} paths</span>
                                </div>
                            </div>
                            <div class="layer-item-actions-compact">
                                <button class="btn-icon-compact" onclick="app.selectUngroupedPaths()" title="Select All">✓</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">All Paths (${this.paths.length})</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Click a path to select it. Click in preview to select multiple.
                </p>
                <div class="path-list" style="max-height: 300px;">
                    ${this.paths.map((path, index) => `
                        <div class="path-item ${this.selectedPaths.has(path.id) ? 'selected' : ''}" 
                             data-path-id="${path.id}"
                             onclick="app.togglePathSelection('${path.id}')">
                            <div class="path-item-header">
                                <input type="text" class="path-name-input" value="${path.id}" onchange="app.renamePath('${path.id}', this.value)" onclick="event.stopPropagation();" style="font-weight: 600; font-size: 0.875rem; border: 1px solid transparent; background: transparent; padding: 0.25rem; border-radius: 4px; width: auto; min-width: 120px;">
                                <div style="display: flex; gap: 0.25rem;">
                                    <button class="btn btn-small" onclick="app.editPathData('${path.id}'); event.stopPropagation();">Edit Data</button>
                                    <button class="btn btn-small" onclick="app.duplicatePath('${path.id}'); event.stopPropagation();">Copy</button>
                                    <button class="btn btn-small" onclick="app.deletePath('${path.id}'); event.stopPropagation();">Delete</button>
                                </div>
                            </div>
                            <div class="path-item-preview">${path.d.substring(0, 80)}${path.d.length > 80 ? '...' : ''}</div>
                            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary); display: flex; gap: 1rem;">
                                <span>Fill: ${path.fill || 'none'}</span>
                                <span>Stroke: ${path.stroke || 'none'}</span>
                                ${path.parentGroup ? `<span>Group: ${path.parentGroup}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-group" id="pathDataEditor" style="display: none;">
                <label class="form-label">Edit Path Data</label>
                <textarea class="form-textarea" id="pathDataInput" rows="5"></textarea>
                <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-primary" onclick="app.savePathEdit()">Save</button>
                    <button class="btn" onclick="app.cancelPathEdit()">Cancel</button>
                </div>
            </div>
        `;
    }

    // Workflow Manager Helper Functions
    toggleWorkflowEdit(section) {
        const display = document.getElementById(`${section}Display`);
        const edit = document.getElementById(`${section}Edit`);
        const btn = document.getElementById(`edit${section.charAt(0).toUpperCase() + section.slice(1)}Btn`);
        
        if (!display || !edit) return;
        
        const isVisible = edit.style.display !== 'none';
        edit.style.display = isVisible ? 'none' : 'block';
        display.style.display = isVisible ? 'block' : 'none';
        
        if (btn) {
            btn.textContent = isVisible ? '✏️' : '✓';
            btn.style.background = isVisible ? '' : 'var(--success-color)';
        }
    }

    renderWorkflowAttributes(selectedPaths) {
        if (selectedPaths.length === 0) return '';
        
        const commonFill = this.getCommonValue(selectedPaths, 'fill');
        const commonStroke = this.getCommonValue(selectedPaths, 'stroke');
        const commonStrokeWidth = this.getCommonValue(selectedPaths, 'strokeWidth');
        const commonOpacity = this.getCommonValue(selectedPaths, 'opacity');
        
        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                    <label class="form-label">Fill</label>
                    <input type="text" class="form-input" id="workflowFill" value="${commonFill || ''}" placeholder="#000000 or none">
                </div>
                <div>
                    <label class="form-label">Stroke</label>
                    <input type="text" class="form-input" id="workflowStroke" value="${commonStroke || ''}" placeholder="#000000 or none">
                </div>
                <div>
                    <label class="form-label">Stroke Width</label>
                    <input type="number" class="form-input" id="workflowStrokeWidth" value="${commonStrokeWidth || '0'}" step="0.1" min="0">
                </div>
                <div>
                    <label class="form-label">Opacity</label>
                    <input type="range" class="form-input" id="workflowOpacity" value="${commonOpacity || '1'}" step="0.01" min="0" max="1" oninput="document.getElementById('workflowOpacityValue').textContent = Math.round(this.value * 100) + '%'">
                    <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="workflowOpacityValue">${Math.round((commonOpacity || 1) * 100)}%</div>
                </div>
                <button class="btn btn-primary btn-small" onclick="app.saveWorkflowAttributes()">Save Attributes</button>
            </div>
        `;
    }

    renderWorkflowTransform() {
        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                    <label class="form-label">X Position</label>
                    <input type="number" class="form-input" id="workflowTransformX" value="0" step="1">
                </div>
                <div>
                    <label class="form-label">Y Position</label>
                    <input type="number" class="form-input" id="workflowTransformY" value="0" step="1">
                </div>
                <div>
                    <label class="form-label">Scale</label>
                    <input type="number" class="form-input" id="workflowTransformScale" value="1" step="0.1" min="0.1">
                </div>
                <div>
                    <label class="form-label">Rotation (degrees)</label>
                    <input type="number" class="form-input" id="workflowTransformRotate" value="0" step="1">
                </div>
                <button class="btn btn-primary btn-small" onclick="app.saveWorkflowTransform()">Save Transform</button>
            </div>
        `;
    }

    renderWorkflowColors(selectedPaths) {
        if (selectedPaths.length === 0) return '';
        
        const commonFill = this.getCommonValue(selectedPaths, 'fill');
        const commonStroke = this.getCommonValue(selectedPaths, 'stroke');
        
        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                    <label class="form-label">Fill Color</label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="color" class="form-input" id="workflowFillColor" value="${commonFill && commonFill !== 'none' ? commonFill : '#000000'}" style="width: 60px; height: 40px;">
                        <input type="text" class="form-input" id="workflowFillHex" value="${commonFill || ''}" placeholder="#000000" style="flex: 1;">
                        <button class="btn btn-small" onclick="app.setWorkflowColor('fill', 'none')">None</button>
                    </div>
                </div>
                <div>
                    <label class="form-label">Stroke Color</label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="color" class="form-input" id="workflowStrokeColor" value="${commonStroke && commonStroke !== 'none' ? commonStroke : '#000000'}" style="width: 60px; height: 40px;">
                        <input type="text" class="form-input" id="workflowStrokeHex" value="${commonStroke || ''}" placeholder="#000000" style="flex: 1;">
                        <button class="btn btn-small" onclick="app.setWorkflowColor('stroke', 'none')">None</button>
                    </div>
                </div>
                <button class="btn btn-primary btn-small" onclick="app.saveWorkflowColors()">Save Colors</button>
            </div>
        `;
    }

    saveWorkflowName() {
        const newName = document.getElementById('workflowNameInput').value.trim();
        if (!newName || this.selectedPaths.size === 0) {
            alert('Enter a name and select paths first');
            return;
        }
        
        this.saveState();
        let counter = 1;
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            const finalName = this.selectedPaths.size === 1 ? newName : `${newName}-${counter++}`;
            path.element.id = finalName;
            path.id = finalName;
        });
        
        this.extractPaths();
        this.renderSVG();
        this.loadTool('workflow');
    }

    saveWorkflowGroup() {
        const groupSelect = document.getElementById('workflowGroupSelect');
        const newGroupInput = document.getElementById('workflowNewGroupInput');
        
        if (!groupSelect || this.selectedPaths.size === 0) return;
        
        const selectedGroup = groupSelect.value;
        const newGroupName = newGroupInput ? newGroupInput.value.trim() : '';
        
        let targetGroup = selectedGroup;
        
        // Create new group if specified
        if (newGroupName) {
            targetGroup = newGroupName;
            // Check if group exists
            if (!this.groups.find(g => g.id === newGroupName)) {
                this.saveState();
                const svgNS = 'http://www.w3.org/2000/svg';
                const newGroup = document.createElementNS(svgNS, 'g');
                newGroup.id = newGroupName;
                
                // Collect paths to move
                const pathsToMove = [];
                this.selectedPaths.forEach(pathId => {
                    const path = this.paths.find(p => p.id === pathId);
                    if (path && path.element && path.element.parentElement) {
                        pathsToMove.push(path.element);
                    }
                });
                
                pathsToMove.forEach(pathElement => {
                    newGroup.appendChild(pathElement);
                });
                
                this.svgElement.appendChild(newGroup);
                this.extractPaths();
                this.extractGroups();
            }
        }
        
        // Move paths to group
        if (targetGroup) {
            this.saveState();
            const group = this.groups.find(g => g.id === targetGroup);
            if (group) {
                this.selectedPaths.forEach(pathId => {
                    const path = this.paths.find(p => p.id === pathId);
                    if (path && path.element && path.element.parentElement) {
                        group.element.appendChild(path.element);
                    }
                });
            }
        } else {
            // Remove from groups (ungroup)
            this.saveState();
            this.selectedPaths.forEach(pathId => {
                const path = this.paths.find(p => p.id === pathId);
                if (path && path.element && path.element.parentElement && path.element.parentElement.tagName === 'g') {
                    this.svgElement.appendChild(path.element);
                }
            });
        }
        
        this.extractPaths();
        this.extractGroups();
        this.renderSVG();
        this.loadTool('workflow');
    }

    saveWorkflowAttributes() {
        if (this.selectedPaths.size === 0) return;
        
        this.saveState();
        const fill = document.getElementById('workflowFill')?.value;
        const stroke = document.getElementById('workflowStroke')?.value;
        const strokeWidth = document.getElementById('workflowStrokeWidth')?.value;
        const opacity = document.getElementById('workflowOpacity')?.value;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            if (fill !== undefined && fill !== null && fill !== '') {
                path.element.setAttribute('fill', fill);
                path.fill = fill;
            }
            if (stroke !== undefined && stroke !== null && stroke !== '') {
                path.element.setAttribute('stroke', stroke);
                path.stroke = stroke;
            }
            if (strokeWidth !== undefined && strokeWidth !== null && strokeWidth !== '') {
                path.element.setAttribute('stroke-width', strokeWidth);
                path.strokeWidth = strokeWidth;
            }
            if (opacity !== undefined && opacity !== null) {
                path.element.setAttribute('opacity', opacity);
                path.opacity = opacity;
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        this.updateSelectionVisual();
        this.toggleWorkflowEdit('attributes');
        this.loadTool('workflow');
    }

    saveWorkflowTransform() {
        if (this.selectedPaths.size === 0) return;
        
        this.saveState();
        const tx = parseFloat(document.getElementById('workflowTransformX').value) || 0;
        const ty = parseFloat(document.getElementById('workflowTransformY').value) || 0;
        const scale = parseFloat(document.getElementById('workflowTransformScale').value) || 1;
        const rotate = parseFloat(document.getElementById('workflowTransformRotate').value) || 0;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            const transforms = [];
            if (tx !== 0 || ty !== 0) transforms.push(`translate(${tx}, ${ty})`);
            if (scale !== 1) transforms.push(`scale(${scale})`);
            if (rotate !== 0) transforms.push(`rotate(${rotate})`);
            
            if (transforms.length > 0) {
                const currentTransform = path.transform || '';
                const newTransform = currentTransform ? currentTransform + ' ' + transforms.join(' ') : transforms.join(' ');
                path.element.setAttribute('transform', newTransform);
                path.transform = newTransform;
            }
        });
        
        this.renderSVG();
        this.updateSelectionVisual();
        this.toggleWorkflowEdit('transform');
        this.loadTool('workflow');
    }

    saveWorkflowColors() {
        if (this.selectedPaths.size === 0) return;
        
        this.saveState();
        const fill = document.getElementById('workflowFillHex')?.value || document.getElementById('workflowFillColor')?.value;
        const stroke = document.getElementById('workflowStrokeHex')?.value || document.getElementById('workflowStrokeColor')?.value;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            if (fill !== undefined && fill !== null) {
                path.element.setAttribute('fill', fill);
                path.fill = fill;
            }
            if (stroke !== undefined && stroke !== null) {
                path.element.setAttribute('stroke', stroke);
                path.stroke = stroke;
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        this.updateSelectionVisual();
        this.toggleWorkflowEdit('colors');
        this.loadTool('workflow');
    }

    setWorkflowColor(type, value) {
        const input = document.getElementById(`workflow${type.charAt(0).toUpperCase() + type.slice(1)}Hex`);
        const colorInput = document.getElementById(`workflow${type.charAt(0).toUpperCase() + type.slice(1)}Color`);
        if (input) input.value = value;
        if (colorInput && value !== 'none') colorInput.value = value;
    }

    saveWorkflowChanges() {
        // This is a final confirmation save - all individual saves should already be done
        alert('All changes have been saved!');
        this.loadTool('workflow');
    }

    editPathData(pathId) {
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        const editor = document.getElementById('pathDataEditor');
        if (editor) {
            document.getElementById('pathDataInput').value = path.d;
            editor.style.display = 'block';
            editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        this.editingPathId = pathId;
    }
    
    editPath(pathId) {
        this.editPathData(pathId);
    }

    savePathEdit() {
        if (!this.editingPathId) return;
        
        const newD = document.getElementById('pathDataInput').value;
        const path = this.paths.find(p => p.id === this.editingPathId);
        if (!path) return;
        
        this.saveState();
        path.element.setAttribute('d', newD);
        path.d = newD;
        this.renderSVG();
        const editor = document.getElementById('pathDataEditor') || document.getElementById('pathEditor');
        if (editor) editor.style.display = 'none';
        this.editingPathId = null;
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    cancelPathEdit() {
        const editor = document.getElementById('pathDataEditor') || document.getElementById('pathEditor');
        if (editor) editor.style.display = 'none';
        this.editingPathId = null;
    }

    renamePath(pathId, newName) {
        if (!newName || newName === pathId) return;
        
        // Check if name already exists
        if (this.paths.find(p => p.id === newName && p.id !== pathId)) {
            alert(`Path with name "${newName}" already exists`);
            return;
        }
        
        this.saveState();
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        path.element.id = newName;
        path.id = newName;
        this.extractPaths();
        this.renderSVG();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    renameSelectedPaths() {
        const newName = document.getElementById('renamePathInput').value;
        if (!newName || this.selectedPaths.size === 0) {
            alert('Enter a name and select paths first');
            return;
        }
        
        this.saveState();
        let counter = 1;
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            const finalName = this.selectedPaths.size === 1 ? newName : `${newName}-${counter++}`;
            path.element.id = finalName;
            path.id = finalName;
        });
        
        this.extractPaths();
        this.renderSVG();
        this.loadTool('workflow');
        document.getElementById('renamePathInput').value = '';
    }

    deselectPath(pathId) {
        this.selectedPaths.delete(pathId);
        this.updateSelectionVisual();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    duplicateSelectedPaths() {
        if (this.selectedPaths.size === 0) {
            alert('Select paths first');
            return;
        }
        
        this.saveState();
        const duplicated = [];
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            const cloned = path.element.cloneNode(true);
            const newId = `${pathId}-copy-${Date.now()}`;
            cloned.id = newId;
            cloned.setAttribute('transform', `translate(10, 10) ${path.transform || ''}`);
            
            if (path.element.parentElement) {
                path.element.parentElement.appendChild(cloned);
            } else {
                this.svgElement.appendChild(cloned);
            }
            duplicated.push(newId);
        });
        
        this.extractPaths();
        this.selectedPaths.clear();
        duplicated.forEach(id => this.selectedPaths.add(id));
        this.renderSVG();
        this.loadTool('workflow');
    }

    deleteSelectedPaths() {
        if (this.selectedPaths.size === 0) {
            alert('Select paths first');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedPaths.size} selected path(s)? This cannot be undone.`)) return;
        
        this.saveState();
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (path && path.element) {
                path.element.remove();
            }
        });
        
        this.selectedPaths.clear();
        this.extractPaths();
        this.extractGroups();
        this.renderSVG();
        this.loadTool('workflow');
    }

    copySelectedPaths() {
        if (this.selectedPaths.size === 0) {
            return; // Silently fail if nothing selected
        }
        
        // Store serialized path data
        this.clipboardPaths = [];
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            // Clone the path element and serialize it
            const cloned = path.element.cloneNode(true);
            const serializer = new XMLSerializer();
            const pathData = {
                svgString: serializer.serializeToString(cloned),
                transform: path.transform || '',
                fill: path.fill || 'none',
                stroke: path.stroke || 'none',
                strokeWidth: path.strokeWidth || '0',
                opacity: path.opacity || '1'
            };
            this.clipboardPaths.push(pathData);
        });
        
        // Also copy to system clipboard if possible
        if (navigator.clipboard && navigator.clipboard.writeText) {
            const allPaths = this.clipboardPaths.map(p => p.svgString).join('\n');
            navigator.clipboard.writeText(allPaths).catch(() => {
                // Ignore clipboard errors
            });
        }
    }

    pastePaths() {
        if (this.clipboardPaths.length === 0) {
            return; // Nothing to paste
        }
        
        this.saveState();
        const pastedIds = [];
        
        this.clipboardPaths.forEach((pathData, index) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(pathData.svgString, 'image/svg+xml');
            const pastedPath = doc.documentElement.querySelector('path');
            
            if (!pastedPath) return;
            
            // Create new ID
            const newId = `path-${Date.now()}-${index}`;
            pastedPath.id = newId;
            
            // Apply offset to position (offset by 20px for visibility)
            const offsetX = 20;
            const offsetY = 20;
            let newTransform = pathData.transform;
            
            if (newTransform) {
                const matches = newTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                if (matches) {
                    const tx = parseFloat(matches[1]) + offsetX;
                    const ty = parseFloat(matches[2]) + offsetY;
                    newTransform = `translate(${tx},${ty})`;
                } else {
                    newTransform = `translate(${offsetX},${offsetY}) ${newTransform}`;
                }
            } else {
                newTransform = `translate(${offsetX},${offsetY})`;
            }
            
            pastedPath.setAttribute('transform', newTransform);
            
            // Restore attributes
            if (pathData.fill !== 'none') pastedPath.setAttribute('fill', pathData.fill);
            if (pathData.stroke !== 'none') pastedPath.setAttribute('stroke', pathData.stroke);
            if (pathData.strokeWidth !== '0') pastedPath.setAttribute('stroke-width', pathData.strokeWidth);
            if (pathData.opacity !== '1') pastedPath.setAttribute('opacity', pathData.opacity);
            
            // Add to SVG
            this.svgElement.appendChild(pastedPath);
            pastedIds.push(newId);
        });
        
        this.extractPaths();
        this.selectedPaths.clear();
        pastedIds.forEach(id => this.selectedPaths.add(id));
        this.renderSVG();
        this.updateSelectionVisual();
        this.loadTool('workflow');
    }

    nudgeSelectedPaths(deltaX, deltaY) {
        if (this.selectedPaths.size === 0) return;
        
        this.saveState();
        this.isNudging = true;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path || !path.element) return;
            
            try {
                const bbox = path.element.getBBox();
                const currentTransform = path.transform || '';
                
                // Calculate new transform
                let tx = deltaX, ty = deltaY;
                
                if (currentTransform) {
                    const matches = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                    if (matches) {
                        tx = parseFloat(matches[1]) + deltaX;
                        ty = parseFloat(matches[2]) + deltaY;
                    } else {
                        tx = deltaX;
                        ty = deltaY;
                    }
                }
                
                // Apply grid snapping to final position
                if (this.snapToGrid) {
                    const newX = Math.round((bbox.x + tx) / this.gridSize) * this.gridSize;
                    const newY = Math.round((bbox.y + ty) / this.gridSize) * this.gridSize;
                    tx = newX - bbox.x;
                    ty = newY - bbox.y;
                }
                
                const newTransform = currentTransform && !currentTransform.match(/translate/) 
                    ? `translate(${tx},${ty}) ${currentTransform}`
                    : `translate(${tx},${ty})`;
                
                path.element.setAttribute('transform', newTransform);
                path.transform = newTransform;
                
                // Update position indicator
                this.updatePositionIndicator(bbox.x + tx, bbox.y + ty);
            } catch (e) {
                // Skip paths that can't be nudged
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        
        // Hide position indicator after a short delay
        setTimeout(() => {
            this.isNudging = false;
            this.hidePositionIndicator();
        }, 500);
    }

    // ==================== TOOL 2: GROUPS & REGIONS ====================
    
    renderGroupsTool() {
        if (!this.groups.length && !this.paths.length) {
            return `
                <div class="tool-explanation">
                    <h3>Layers & Groups Manager</h3>
                    <p><strong>Layers</strong> control visual stacking order (what appears on top). <strong>Groups</strong> are SVG &lt;g&gt; elements that organize paths together.</p>
                    <p>Create groups to organize paths (like "face", "body"), then arrange them in layers to control what appears on top. Layers are reordered in the SVG DOM.</p>
                    <p><strong>Workflow:</strong> 1) Create groups from selected paths, 2) Arrange groups in layers panel, 3) Select groups to edit them.</p>
                </div>
                <p>No groups or paths found. Load an SVG file first.</p>
            `;
        }
        
        // Find ungrouped paths (not in any <g> element)
        const ungroupedPaths = [];
        const pathGroupMap = new Map(); // path index -> group
        
        this.groups.forEach(group => {
            group.paths.forEach(pathIndex => {
                pathGroupMap.set(pathIndex, group.id);
            });
        });
        
        this.paths.forEach((path, index) => {
            if (!pathGroupMap.has(index) && !path.parentGroup) {
                ungroupedPaths.push(path);
            }
        });
        
        // Build layers list - only groups (not regions, those are just metadata)
        const allLayers = [];
        this.groups.forEach((group, index) => {
            allLayers.push({
                type: 'group',
                id: group.id,
                name: group.id,
                dataRegion: group.dataRegion || '',
                pathCount: group.paths.length,
                domIndex: index,
                element: group.element
            });
        });
        
        // Also add ungrouped as a virtual layer
        if (ungroupedPaths.length > 0) {
            allLayers.push({
                type: 'ungrouped',
                id: 'ungrouped',
                name: 'Ungrouped Paths',
                dataRegion: '',
                pathCount: ungroupedPaths.length,
                domIndex: -1,
                element: null
            });
        }
        
        return `
            <div class="tool-explanation">
                <h3>Layers & Groups Manager</h3>
                <p><strong>Layers</strong> = Visual stacking order. Items at the top of the list appear on top. Drag to reorder.</p>
                <p><strong>Groups</strong> = SVG &lt;g&gt; elements that organize paths together (like "face", "body").</p>
                <p><strong>Workflow:</strong> 1) Select paths → 2) Create group → 3) Reorder layers (face above body) → 4) Select group to edit</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Layers (Top to Bottom = Front to Back)</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Drag layers to reorder. Items at the top appear on top of items below.
                </p>
                <div class="layers-panel" id="layersPanel">
                    ${allLayers.map((layer, idx) => `
                        <div class="layer-item" draggable="true" data-layer-type="${layer.type}" data-layer-id="${layer.id}" data-layer-index="${idx}" data-dom-index="${layer.domIndex}">
                            <div class="layer-item-handle">☰</div>
                            <div class="layer-item-content">
                                <div class="layer-item-header">
                                    <span class="layer-item-name">${layer.name}</span>
                                    <span class="layer-item-type">${layer.type === 'ungrouped' ? 'paths' : 'group'}</span>
                                </div>
                                <div class="layer-item-meta">
                                    <span>${layer.pathCount} paths</span>
                                    ${layer.dataRegion ? `<span style="color: var(--secondary-color);">Region: ${layer.dataRegion}</span>` : ''}
                                </div>
                            </div>
                            <div class="layer-item-actions">
                                <button class="btn-icon" onclick="app.selectLayer('${layer.type}', '${layer.id}')" title="Select All">✓</button>
                                ${layer.type === 'group' ? `
                                    <button class="btn-icon" onclick="app.duplicateGroup('${layer.id}')" title="Duplicate">📋</button>
                                    <button class="btn-icon" onclick="app.deleteGroup('${layer.id}')" title="Delete">🗑</button>
                                ` : ''}
                                <button class="btn-icon" onclick="app.moveLayerUp(${idx})" ${idx === 0 ? 'disabled' : ''} title="Move Up (Front)">↑</button>
                                <button class="btn-icon" onclick="app.moveLayerDown(${idx})" ${idx === allLayers.length - 1 ? 'disabled' : ''} title="Move Down (Back)">↓</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${this.selectedPaths.size > 0 ? `
                <div class="form-group" style="padding: 1rem; background: rgba(74, 144, 226, 0.1); border-radius: var(--border-radius); border: 2px solid var(--primary-color); margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="font-size: 1rem;">${this.selectedPaths.size} path(s) selected</strong>
                        </div>
                        <button class="btn btn-primary btn-small" onclick="app.switchTool('selection')">Open Selection Editor</button>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        Click "Open Selection Editor" to edit these paths, or continue organizing below.
                    </p>
                </div>
            ` : ''}
            
            ${ungroupedPaths.length > 0 ? `
                <div class="form-group">
                    <label class="form-label">Ungrouped Paths (${ungroupedPaths.length})</label>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                        These paths aren't in any group. Select them and create a group to organize them.
                    </p>
                    <div class="path-list" style="max-height: 200px;">
                        ${ungroupedPaths.map(path => `
                            <div class="path-item ${this.selectedPaths.has(path.id) ? 'selected' : ''}" data-path-id="${path.id}">
                                <div class="path-item-header">
                                    <span class="path-item-id">${path.id}</span>
                                    <div style="display: flex; gap: 0.25rem;">
                                        <button class="btn btn-small" onclick="app.selectPath('${path.id}')">Select</button>
                                        <button class="btn btn-small" onclick="app.duplicatePath('${path.id}')">Copy</button>
                                        <button class="btn btn-small" onclick="app.deletePath('${path.id}')">Delete</button>
                                    </div>
                                </div>
                                <div class="path-item-preview">${path.d.substring(0, 80)}${path.d.length > 80 ? '...' : ''}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-small" onclick="app.selectUngroupedPaths()">Select All Ungrouped</button>
                        <button class="btn btn-primary btn-small" onclick="app.createGroupFromSelected()" ${this.selectedPaths.size === 0 ? 'disabled' : ''}>
                            Create Group from Selected (${this.selectedPaths.size})
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <div class="form-group">
                <label class="form-label">All Groups (${this.groups.length})</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Click a group to see its paths. Select group to edit all paths in it.
                </p>
                <div class="groups-tree">
                    ${this.groups.map((group, idx) => {
                        const groupPaths = group.paths.map(idx => this.paths[idx]).filter(p => p);
                        const isSelected = groupPaths.every(p => this.selectedPaths.has(p.id));
                        return `
                        <div class="group-item ${isSelected ? 'selected-group' : ''}">
                            <div class="group-item-header">
                                <span class="group-item-name">${group.id}</span>
                                <span class="group-item-count">${group.paths.length} paths</span>
                            </div>
                            ${group.dataRegion ? `<div style="font-size: 0.75rem; color: var(--secondary-color); margin-top: 0.25rem;">Region: ${group.dataRegion}</div>` : ''}
                            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button class="btn btn-primary btn-small" onclick="app.selectGroup('${group.id}')">Select Group</button>
                                <button class="btn btn-small" onclick="app.renameGroup('${group.id}')">Rename</button>
                                <button class="btn btn-small" onclick="app.duplicateGroup('${group.id}')">Duplicate</button>
                                <button class="btn btn-small" onclick="app.deleteGroup('${group.id}')">Delete</button>
                            </div>
                            <details style="margin-top: 0.5rem;">
                                <summary style="cursor: pointer; font-size: 0.75rem; color: var(--text-secondary);">Show ${groupPaths.length} paths in this group</summary>
                                <div class="path-list" style="margin-top: 0.5rem; max-height: 200px;">
                                    ${groupPaths.map(path => `
                                        <div class="path-item ${this.selectedPaths.has(path.id) ? 'selected' : ''}" data-path-id="${path.id}">
                                            <div class="path-item-header">
                                                <span class="path-item-id">${path.id}</span>
                                                <button class="btn btn-small" onclick="app.selectPath('${path.id}')">Select</button>
                                            </div>
                                            <div class="path-item-preview">${path.d.substring(0, 60)}${path.d.length > 60 ? '...' : ''}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    selectRegion(region) {
        this.selectedPaths.clear();
        this.paths.forEach(path => {
            if (path.dataRegion === region) {
                this.selectedPaths.add(path.id);
            }
        });
        this.updateSelectionVisual();
        this.selectionSource = `Region: ${region}`;
        // Don't switch tools - just select and stay in Groups tool
        this.loadTool('groups');
    }

    selectGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        this.selectedPaths.clear();
        group.paths.forEach(pathIndex => {
            const path = this.paths[pathIndex];
            if (path) {
                this.selectedPaths.add(path.id);
            }
        });
        this.updateSelectionVisual();
        this.selectionSource = `Group: ${groupId}`;
        // Don't switch tools - just select and stay in current tool
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    selectLayer(type, id) {
        if (type === 'group') {
            this.selectGroup(id);
        } else if (type === 'region') {
            const region = id.replace('region-', '');
            this.selectRegion(region);
        } else if (type === 'ungrouped') {
            this.selectUngroupedPaths();
        }
    }

    selectPath(pathId) {
        this.selectedPaths.add(pathId);
        this.updateSelectionVisual();
        this.selectionSource = 'Path selection';
        // Don't auto-switch - only switch when clicking in preview
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    selectUngroupedPaths() {
        this.selectedPaths.clear();
        const ungrouped = this.paths.filter(path => {
            const inGroup = this.groups.some(g => g.paths.includes(this.paths.indexOf(path)));
            return !inGroup && !path.parentGroup;
        });
        ungrouped.forEach(path => this.selectedPaths.add(path.id));
        this.updateSelectionVisual();
        this.selectionSource = 'Ungrouped paths';
        // Don't switch tools - just select and stay in current tool
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    createGroupFromSelected() {
        if (this.selectedPaths.size === 0) {
            alert('Select paths first');
            return;
        }
        
        const groupNameInput = document.getElementById('newGroupName');
        const groupName = groupNameInput ? groupNameInput.value.trim() : '';
        
        if (!groupName) {
            alert('Enter a group name first');
            if (groupNameInput) groupNameInput.focus();
            return;
        }
        
        // Check if name already exists
        if (this.groups.find(g => g.id === groupName)) {
            if (!confirm(`Group "${groupName}" already exists. Overwrite it?`)) return;
            const existing = this.groups.find(g => g.id === groupName);
            if (existing && existing.element) {
                existing.element.remove();
            }
        }
        
        this.saveState();
        const svgNS = 'http://www.w3.org/2000/svg';
        const newGroup = document.createElementNS(svgNS, 'g');
        newGroup.id = groupName;
        
        // Collect paths to move
        const pathsToMove = [];
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (path && path.element && path.element.parentElement) {
                pathsToMove.push(path.element);
            }
        });
        
        // Move paths into new group
        pathsToMove.forEach(pathElement => {
            newGroup.appendChild(pathElement);
        });
        
        // Insert at the end (will appear on top)
        this.svgElement.appendChild(newGroup);
        this.extractPaths();
        this.extractGroups();
        this.selectedPaths.clear();
        if (groupNameInput) groupNameInput.value = '';
        this.renderSVG();
        this.loadTool('workflow');
    }

    duplicatePath(pathId) {
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        this.saveState();
        const cloned = path.element.cloneNode(true);
        const newId = `${pathId}-copy-${Date.now()}`;
        cloned.id = newId;
        cloned.setAttribute('transform', `translate(10, 10) ${path.transform || ''}`);
        
        if (path.element.parentElement) {
            path.element.parentElement.appendChild(cloned);
        } else {
            this.svgElement.appendChild(cloned);
        }
        
        this.extractPaths();
        this.renderSVG();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    deletePath(pathId) {
        if (!confirm('Delete this path? This cannot be undone.')) return;
        
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        this.saveState();
        path.element.remove();
        this.selectedPaths.delete(pathId);
        this.extractPaths();
        this.renderSVG();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    duplicateGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group || !group.element) return;
        
        this.saveState();
        const cloned = group.element.cloneNode(true);
        const newId = `${groupId}-copy-${Date.now()}`;
        cloned.id = newId;
        
        this.svgElement.appendChild(cloned);
        this.extractGroups();
        this.renderSVG();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    deleteGroup(groupId) {
        if (!confirm('Delete this group and all its paths? This cannot be undone.')) return;
        
        const group = this.groups.find(g => g.id === groupId);
        if (!group || !group.element) return;
        
        this.saveState();
        group.element.remove();
        this.extractGroups();
        this.extractPaths();
        this.renderSVG();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    duplicateLayer(type, id) {
        if (type === 'group') {
            this.duplicateGroup(id);
        } else {
            alert('Cannot duplicate regions - they are logical groupings');
        }
    }

    deleteLayer(type, id) {
        if (type === 'group') {
            this.deleteGroup(id);
        } else {
            alert('Cannot delete regions - they are logical groupings based on data-region attributes');
        }
    }

    moveLayerUp(index) {
        // Move group up in DOM (appears more on top)
        if (index === 0) return;
        
        const layers = Array.from(document.querySelectorAll('.layer-item'));
        const currentItem = layers[index];
        const currentData = {
            type: currentItem.dataset.layerType,
            id: currentItem.dataset.layerId,
            domIndex: parseInt(currentItem.dataset.domIndex)
        };
        
        if (currentData.type === 'ungrouped') {
            alert('Ungrouped paths cannot be reordered. Create a group first.');
            return;
        }
        
        this.saveState();
        const group = this.groups.find(g => g.id === currentData.id);
        if (!group || !group.element) return;
        
        const prevItem = layers[index - 1];
        const prevDomIndex = parseInt(prevItem.dataset.domIndex);
        
        if (prevDomIndex >= 0) {
            const prevGroup = this.groups[prevDomIndex];
            if (prevGroup && prevGroup.element) {
                // Insert current group before previous group
                this.svgElement.insertBefore(group.element, prevGroup.element);
            }
        } else {
            // Moving before ungrouped - insert at end of groups
            const lastGroup = this.groups[this.groups.length - 1];
            if (lastGroup && lastGroup.element && lastGroup.element !== group.element) {
                this.svgElement.insertBefore(group.element, lastGroup.element.nextSibling);
            }
        }
        
        this.extractGroups();
        this.renderSVG();
        this.loadTool('groups');
    }

    moveLayerDown(index) {
        // Move group down in DOM (appears more behind)
        const layers = Array.from(document.querySelectorAll('.layer-item'));
        if (index === layers.length - 1) return;
        
        const currentItem = layers[index];
        const currentData = {
            type: currentItem.dataset.layerType,
            id: currentItem.dataset.layerId,
            domIndex: parseInt(currentItem.dataset.domIndex)
        };
        
        if (currentData.type === 'ungrouped') {
            alert('Ungrouped paths cannot be reordered. Create a group first.');
            return;
        }
        
        this.saveState();
        const group = this.groups.find(g => g.id === currentData.id);
        if (!group || !group.element) return;
        
        const nextItem = layers[index + 1];
        const nextDomIndex = parseInt(nextItem.dataset.domIndex);
        
        if (nextDomIndex >= 0) {
            const nextGroup = this.groups[nextDomIndex];
            if (nextGroup && nextGroup.element) {
                // Insert current group after next group
                if (nextGroup.element.nextSibling) {
                    this.svgElement.insertBefore(group.element, nextGroup.element.nextSibling);
                } else {
                    this.svgElement.appendChild(group.element);
                }
            }
        } else {
            // Moving after ungrouped - move to end
            this.svgElement.appendChild(group.element);
        }
        
        this.extractGroups();
        this.renderSVG();
        this.loadTool('groups');
    }

    renameGroup(groupId, newName) {
        if (!newName) return;
        
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        if (newName === group.id) return;
        
        // Check if name already exists
        if (this.groups.find(g => g.id === newName && g.id !== groupId)) {
            alert(`Group with name "${newName}" already exists`);
            return;
        }
        
        this.saveState();
        group.element.id = newName;
        group.id = newName;
        this.extractGroups();
        this.renderSVG();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    editGroupRegion(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        const newRegion = prompt('Enter new region name:', group.dataRegion || '');
        if (newRegion === null) return;
        
        this.saveState();
        if (group.element) {
            group.element.setAttribute('data-region', newRegion);
        }
        group.dataRegion = newRegion;
        
        // Update all paths in this group
        group.paths.forEach(pathIndex => {
            const path = this.paths[pathIndex];
            if (path && path.element) {
                path.element.setAttribute('data-region', newRegion);
                path.dataRegion = newRegion;
            }
        });
        
        this.extractGroups();
        this.renderSVG();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    // ==================== TOOL 3: COLOR REPLACER (Paint Bucket Style) ====================
    
    renderColorReplacer() {
        const colors = this.extractAllColors();
        const selectedCount = this.selectedPaths.size;
        
        return `
            <div class="tool-explanation">
                <h3>Color Finder & Replacer (Paint Bucket)</h3>
                <p>Pick colors from your SVG or use the color palette. Right-click paths in preview to pick their color, or click a swatch to select a color to replace.</p>
                <p><strong>When to use:</strong> Use this to standardize colors or create color variants. Works with selected paths or entire SVG.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Color Palette - Click to Select</label>
                <div class="color-palette">
                    ${colors.map((color, index) => `
                        <div class="color-swatch ${this.selectedColor === color ? 'selected' : ''}" 
                             style="background-color: ${color};"
                             onclick="app.selectColor('${color}')"
                             oncontextmenu="app.pickColorFromPalette('${color}'); return false;"
                             title="${color} - Right-click to use as replacement">
                            <div class="color-swatch-label">${color.length > 7 ? color.substring(0, 7) + '...' : color}</div>
                        </div>
                    `).join('')}
                </div>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    💡 Right-click paths in preview to pick their color, or right-click swatches to use as replacement
                </p>
            </div>
            
            ${this.selectedColor ? `
                <div class="form-group" style="padding: 1rem; background: rgba(74, 144, 226, 0.1); border-radius: var(--border-radius); border: 2px solid var(--primary-color);">
                    <label class="form-label">Replacing: ${this.selectedColor}</label>
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
                        <input type="color" class="form-input" id="newColorPicker" value="${this.selectedColor}" style="width: 60px; height: 40px;">
                        <input type="text" class="form-input" id="newColorHex" value="${this.selectedColor}" placeholder="#000000" style="flex: 1;">
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="app.replaceColor()">Replace All</button>
                        <button class="btn ${selectedCount > 0 ? 'btn-secondary' : ''}" onclick="app.replaceColorInSelection()" ${selectedCount === 0 ? 'disabled' : ''}>
                            Replace in Selection (${selectedCount})
                        </button>
                        <button class="btn" onclick="app.selectPathsByColor()">Select All with This Color</button>
                    </div>
                </div>
            ` : `
                <div class="form-group" style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius);">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); text-align: center;">
                        Click a color swatch above or right-click a path in preview to select a color to replace.
                    </p>
                </div>
            `}
        `;
    }

    pickColorFromPalette(color) {
        this.selectedColor = color;
        const picker = document.getElementById('newColorPicker');
        const hex = document.getElementById('newColorHex');
        if (picker) picker.value = color;
        if (hex) hex.value = color;
        this.loadTool('color-replacer');
    }

    extractAllColors() {
        const colors = new Set();
        this.paths.forEach(path => {
            if (path.fill && path.fill !== 'none') colors.add(path.fill);
            if (path.stroke && path.stroke !== 'none') colors.add(path.stroke);
        });
        return Array.from(colors);
    }

    selectColor(color) {
        this.selectedColor = color;
        this.loadTool('color-replacer');
        // Sync color picker and hex input
        setTimeout(() => {
            const picker = document.getElementById('newColorPicker');
            const hex = document.getElementById('newColorHex');
            if (picker) picker.value = color;
            if (hex) hex.value = color;
            
            // Sync hex input with color picker
            if (picker) {
                picker.addEventListener('input', (e) => {
                    if (hex) hex.value = e.target.value;
                });
            }
            if (hex) {
                hex.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(val) && picker) {
                        picker.value = val;
                    }
                });
            }
        }, 100);
    }

    replaceColor() {
        const newColor = document.getElementById('newColorPicker')?.value || document.getElementById('newColorHex')?.value;
        if (!this.selectedColor || !newColor) return;
        
        this.saveState();
        this.paths.forEach(path => {
            if (path.fill === this.selectedColor) {
                path.element.setAttribute('fill', newColor);
                path.fill = newColor;
            }
            if (path.stroke === this.selectedColor) {
                path.element.setAttribute('stroke', newColor);
                path.stroke = newColor;
            }
        });
        this.renderSVG();
        this.selectedColor = null;
        this.loadTool('color-replacer');
    }

    replaceColorInSelection() {
        const newColor = document.getElementById('newColorPicker')?.value || document.getElementById('newColorHex')?.value;
        if (!this.selectedColor || !newColor || this.selectedPaths.size === 0) return;
        
        this.saveState();
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            if (path.fill === this.selectedColor) {
                path.element.setAttribute('fill', newColor);
                path.fill = newColor;
            }
            if (path.stroke === this.selectedColor) {
                path.element.setAttribute('stroke', newColor);
                path.stroke = newColor;
            }
        });
        this.renderSVG();
        this.loadTool('color-replacer');
    }

    selectPathsByColor() {
        if (!this.selectedColor) return;
        
        this.selectedPaths.clear();
        this.paths.forEach(path => {
            if (path.fill === this.selectedColor || path.stroke === this.selectedColor) {
                this.selectedPaths.add(path.id);
            }
        });
        this.updateSelectionVisual();
    }

    // ==================== TOOL 4: PATH ANIMATOR ====================
    
    renderAnimator() {
        const hasGSAP = typeof gsap !== 'undefined';
        const selectedCount = this.selectedPaths.size;
        const targetPaths = selectedCount > 0 ? selectedCount : this.paths.length;
        
        return `
            <div class="tool-explanation">
                <h3>Path Animator</h3>
                <p>Create animations for your SVG paths. Choose from multiple animation types including drawing effects, fades, and more.</p>
                <p><strong>When to use:</strong> After finalizing your design, use this to add motion. Works best after optimizing your SVG.</p>
            </div>
            
            <div class="form-group" style="padding: 1rem; background: ${selectedCount > 0 ? 'rgba(74, 144, 226, 0.1)' : 'var(--bg-secondary)'}; border-radius: var(--border-radius); border: 2px solid ${selectedCount > 0 ? 'var(--primary-color)' : 'var(--border-color)'}; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 1rem;">Animating:</strong>
                        <span style="font-size: 1.25rem; color: var(--primary-color); margin-left: 0.5rem;">${targetPaths}</span> path(s)
                    </div>
                    ${selectedCount > 0 ? `
                        <button class="btn btn-small" onclick="app.switchTool('selection')">Change Selection</button>
                    ` : `
                        <button class="btn btn-small" onclick="app.selectAll()">Select All</button>
                    `}
                </div>
                ${selectedCount > 0 ? `
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        Only selected paths will be animated. Use Selection tool to choose different paths.
                    </p>
                ` : `
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        All paths will be animated. Select specific paths in Selection tool to animate only those.
                    </p>
                `}
            </div>
            
            ${hasGSAP ? `
                <div class="form-group" style="padding: 0.75rem; background: rgba(46, 204, 113, 0.1); border-radius: var(--border-radius); border: 1px solid rgba(46, 204, 113, 0.3); margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="color: #2ecc71; font-weight: 600;">✨ GSAP Enabled</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">
                        GSAP (GreenSock) is loaded! You can use powerful GSAP animations for smoother, more performant animations.
                    </p>
                    <label class="form-checkbox" style="margin-top: 0.5rem;">
                        <input type="checkbox" id="useGSAP" checked>
                        <span>Use GSAP animations (recommended)</span>
                    </label>
                </div>
            ` : `
                <div class="form-group" style="padding: 0.75rem; background: rgba(243, 156, 18, 0.1); border-radius: var(--border-radius); border: 1px solid rgba(243, 156, 18, 0.3); margin-bottom: 1rem;">
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">
                        <strong>Tip:</strong> GSAP library not detected. Using CSS animations. For better performance and more animation options, GSAP is recommended.
                    </p>
                </div>
            `}
            
            <div class="form-group">
                <label class="form-label">Animation Type</label>
                <select class="form-select" id="animType" onchange="app.updateAnimationUI()">
                    <option value="draw">Draw Path (stroke drawing)</option>
                    <option value="fade">Fade In</option>
                    <option value="scale">Scale In</option>
                    <option value="rotate">Rotate In</option>
                    <option value="slide">Slide In</option>
                    <option value="bounce">Bounce In</option>
                    <option value="pulse">Pulse</option>
                    <option value="wiggle">Wiggle</option>
                    <option value="shimmer">Shimmer</option>
                    <option value="glow">Glow Pulse</option>
                    <option value="float">Float Up</option>
                    <option value="spin">Spin</option>
                    <option value="elastic">Elastic Bounce</option>
                    ${hasGSAP ? `
                        <option value="morph">Morph (GSAP)</option>
                        <option value="motionPath">Motion Path (GSAP)</option>
                        <option value="stagger">Stagger Animation (GSAP)</option>
                    ` : ''}
                    <option value="colorCycle">Color Cycle</option>
                    <option value="colorPulse">Color Pulse</option>
                    <option value="rainbow">Rainbow Shift</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Animation Settings</label>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Duration (seconds)</label>
                    <input type="number" class="form-input" id="animDuration" value="2" min="0.1" step="0.1">
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Delay Between Paths (seconds)</label>
                    <input type="number" class="form-input" id="animDelay" value="0.1" min="0" step="0.1">
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Easing</label>
                    <select class="form-select" id="animEasing">
                        <option value="power1.out">Power1 Out (GSAP)</option>
                        <option value="power2.out">Power2 Out (GSAP)</option>
                        <option value="power3.out">Power3 Out (GSAP)</option>
                        <option value="power4.out">Power4 Out (GSAP)</option>
                        <option value="back.out">Back Out (GSAP)</option>
                        <option value="elastic.out">Elastic Out (GSAP)</option>
                        <option value="bounce.out">Bounce Out (GSAP)</option>
                        <option value="sine.inOut">Sine InOut (GSAP)</option>
                        <option value="ease-in-out">Ease In-Out (CSS)</option>
                        <option value="ease-out">Ease Out (CSS)</option>
                        <option value="ease-in">Ease In (CSS)</option>
                        <option value="linear">Linear</option>
                    </select>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="animLoop">
                        <span>Loop Animation</span>
                    </label>
                </div>
                <div id="animDirectionGroup" style="margin-bottom: 0.75rem; display: none;">
                    <label class="form-label">Direction</label>
                    <select class="form-select" id="animDirection">
                        <option value="normal">Normal</option>
                        <option value="reverse">Reverse</option>
                        <option value="alternate">Alternate</option>
                    </select>
                </div>
            </div>
            
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-primary" onclick="app.applyAnimation()" style="flex: 1;">Apply Animation</button>
                <button class="btn" onclick="app.removeAnimation()">Remove</button>
            </div>
        `;
    }

    updateAnimationUI() {
        const animType = document.getElementById('animType').value;
        const directionGroup = document.getElementById('animDirectionGroup');
        if (animType === 'draw' || animType === 'slide') {
            directionGroup.style.display = 'block';
        } else {
            directionGroup.style.display = 'none';
        }
    }

    applyAnimation() {
        const animType = document.getElementById('animType').value;
        const duration = parseFloat(document.getElementById('animDuration').value) || 2;
        const delay = parseFloat(document.getElementById('animDelay').value) || 0.1;
        const loop = document.getElementById('animLoop').checked;
        const direction = document.getElementById('animDirection')?.value || 'normal';
        const easing = document.getElementById('animEasing')?.value || 'power2.out';
        const useGSAP = typeof gsap !== 'undefined' && (document.getElementById('useGSAP')?.checked !== false);
        
        this.saveState();
        
        // Use GSAP if available and enabled
        if (useGSAP && typeof gsap !== 'undefined') {
            this.applyGSAPAnimation(animType, duration, delay, loop, easing);
            return;
        }
        
        // Fallback to CSS animations
        // Add animation styles
        let styleElement = this.svgElement.querySelector('style');
        if (!styleElement) {
            styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            this.svgElement.insertBefore(styleElement, this.svgElement.firstChild);
        }
        
        const animations = {
            draw: {
                keyframes: `@keyframes drawPath {
                    from { stroke-dasharray: 1000; stroke-dashoffset: 1000; opacity: 1; }
                    to { stroke-dasharray: 1000; stroke-dashoffset: 0; opacity: 1; }
                }`,
                style: `stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: drawPath ${duration}s ease-in-out forwards;`
            },
            fade: {
                keyframes: `@keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }`,
                style: `animation: fadeIn ${duration}s ease-in forwards;`
            },
            scale: {
                keyframes: `@keyframes scaleIn {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }`,
                style: `animation: scaleIn ${duration}s ease-out forwards;`
            },
            rotate: {
                keyframes: `@keyframes rotateIn {
                    from { transform: rotate(-180deg) scale(0); opacity: 0; }
                    to { transform: rotate(0deg) scale(1); opacity: 1; }
                }`,
                style: `animation: rotateIn ${duration}s ease-out forwards;`
            },
            slide: {
                keyframes: `@keyframes slideIn {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }`,
                style: `animation: slideIn ${duration}s ease-out forwards;`
            },
            bounce: {
                keyframes: `@keyframes bounceIn {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }`,
                style: `animation: bounceIn ${duration}s ease-out forwards;`
            },
            pulse: {
                keyframes: `@keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.05); }
                }`,
                style: `animation: pulse ${duration}s ease-in-out forwards;`
            },
            wiggle: {
                keyframes: `@keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-5deg); }
                    75% { transform: rotate(5deg); }
                }`,
                style: `animation: wiggle ${duration}s ease-in-out forwards;`
            },
            morph: {
                keyframes: `@keyframes morph {
                    0%, 100% { d: attr(d); }
                    50% { filter: blur(2px); opacity: 0.8; }
                }`,
                style: `animation: morph ${duration}s ease-in-out forwards;`
            },
            shimmer: {
                keyframes: `@keyframes shimmer {
                    0% { opacity: 1; filter: brightness(1); }
                    50% { opacity: 0.7; filter: brightness(1.5); }
                    100% { opacity: 1; filter: brightness(1); }
                }`,
                style: `animation: shimmer ${duration}s ease-in-out forwards;`
            },
            glow: {
                keyframes: `@keyframes glow {
                    0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
                    50% { filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 12px currentColor); }
                }`,
                style: `animation: glow ${duration}s ease-in-out forwards;`
            },
            float: {
                keyframes: `@keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }`,
                style: `animation: float ${duration}s ease-in-out forwards;`
            },
            spin: {
                keyframes: `@keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }`,
                style: `animation: spin ${duration}s linear forwards;`
            },
            elastic: {
                keyframes: `@keyframes elastic {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    75% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }`,
                style: `animation: elastic ${duration}s ease-out forwards;`
            },
            colorCycle: {
                keyframes: `@keyframes colorCycle {
                    0% { fill: #ff0000; }
                    16.66% { fill: #ff8800; }
                    33.33% { fill: #ffff00; }
                    50% { fill: #00ff00; }
                    66.66% { fill: #0088ff; }
                    83.33% { fill: #8800ff; }
                    100% { fill: #ff0000; }
                }`,
                style: `animation: colorCycle ${duration}s linear forwards;`
            },
            colorPulse: {
                keyframes: `@keyframes colorPulse {
                    0%, 100% { fill: currentColor; filter: brightness(1); }
                    50% { fill: currentColor; filter: brightness(1.5) saturate(1.3); }
                }`,
                style: `animation: colorPulse ${duration}s ease-in-out forwards;`
            },
            rainbow: {
                keyframes: `@keyframes rainbow {
                    0% { filter: hue-rotate(0deg); }
                    100% { filter: hue-rotate(360deg); }
                }`,
                style: `animation: rainbow ${duration}s linear forwards;`
            }
        };
        
        const anim = animations[animType] || animations.draw;
        let animationCSS = anim.keyframes;
        
        if (direction === 'reverse') {
            animationCSS = animationCSS.replace('from', 'to').replace('to', 'from');
        } else if (direction === 'alternate') {
            animationCSS += animationCSS.replace('@keyframes', '@keyframes reverse');
        }
        
        styleElement.textContent = (styleElement.textContent || '') + '\n' + animationCSS;
        
        // Apply to selected paths only, or all if none selected
        const pathsToAnimate = this.selectedPaths.size > 0 
            ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p)
            : this.paths;
        
        pathsToAnimate.forEach((path, index) => {
            path.element.style.cssText = (path.element.style.cssText || '') + anim.style;
            path.element.style.animationDelay = `${index * delay}s`;
            if (loop) {
                path.element.style.animationIterationCount = 'infinite';
            }
            if (direction === 'alternate') {
                path.element.style.animationDirection = 'alternate';
            }
        });
        
        this.renderSVG();
        this.updateSelectionVisual();
    }

    applyGSAPAnimation(animType, duration, delay, loop, easing) {
        const pathsToAnimate = this.selectedPaths.size > 0 
            ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p)
            : this.paths;
        
        if (pathsToAnimate.length === 0) {
            alert('No paths to animate');
            return;
        }
        
        // Clear any existing GSAP animations
        pathsToAnimate.forEach(path => {
            if (path.element._gsap) {
                gsap.killTweensOf(path.element);
            }
        });
        
        const animations = {
            fade: (el) => gsap.from(el, { opacity: 0, duration, ease: easing }),
            scale: (el) => gsap.from(el, { scale: 0, opacity: 0, duration, ease: easing }),
            rotate: (el) => gsap.from(el, { rotation: -180, scale: 0, opacity: 0, duration, ease: easing }),
            slide: (el) => gsap.from(el, { y: -50, opacity: 0, duration, ease: easing }),
            bounce: (el) => gsap.from(el, { 
                scale: 0, 
                opacity: 0, 
                duration, 
                ease: 'bounce.out'
            }),
            pulse: (el) => gsap.to(el, { 
                scale: 1.05, 
                opacity: 0.7, 
                duration: duration / 2, 
                yoyo: true, 
                repeat: loop ? -1 : 0,
                ease: easing
            }),
            wiggle: (el) => gsap.to(el, { 
                rotation: 5, 
                duration: duration / 4, 
                yoyo: true, 
                repeat: loop ? -1 : 0,
                ease: 'sine.inOut'
            }),
            shimmer: (el) => gsap.to(el, { 
                opacity: 0.7, 
                filter: 'brightness(1.5)',
                duration: duration / 2, 
                yoyo: true, 
                repeat: loop ? -1 : 0,
                ease: easing
            }),
            glow: (el) => gsap.to(el, { 
                filter: 'drop-shadow(0 0 8px currentColor) drop-shadow(0 0 12px currentColor)',
                duration: duration / 2, 
                yoyo: true, 
                repeat: loop ? -1 : 0,
                ease: easing
            }),
            float: (el) => gsap.to(el, { 
                y: -10, 
                duration: duration / 2, 
                yoyo: true, 
                repeat: loop ? -1 : 0,
                ease: 'sine.inOut'
            }),
            spin: (el) => gsap.to(el, { 
                rotation: 360, 
                duration, 
                repeat: loop ? -1 : 0,
                ease: 'none'
            }),
            elastic: (el) => gsap.from(el, { 
                scale: 0, 
                opacity: 0, 
                duration, 
                ease: 'elastic.out(1, 0.3)'
            }),
            morph: (el) => gsap.to(el, { 
                filter: 'blur(2px)',
                opacity: 0.8,
                duration: duration / 2, 
                yoyo: true, 
                repeat: loop ? -1 : 0,
                ease: easing
            }),
            motionPath: (el) => {
                // Create a simple circular motion path
                try {
                    const bbox = el.getBBox();
                    const centerX = bbox.x + bbox.width / 2;
                    const centerY = bbox.y + bbox.height / 2;
                    const radius = Math.max(bbox.width, bbox.height) / 2;
                    
                    gsap.to(el, {
                        motionPath: {
                            path: `M ${centerX} ${centerY} m -${radius},0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`,
                            autoRotate: true
                        },
                        duration,
                        repeat: loop ? -1 : 0,
                        ease: easing
                    });
                } catch (e) {
                    console.warn('Motion path requires MotionPathPlugin:', e);
                    gsap.to(el, { rotation: 360, duration, repeat: loop ? -1 : 0, ease: easing });
                }
            },
            stagger: (elements) => {
                gsap.from(elements, {
                    opacity: 0,
                    scale: 0,
                    duration,
                    stagger: delay,
                    ease: easing,
                    repeat: loop ? -1 : 0
                });
            },
            colorCycle: (el) => {
                const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
                gsap.to(el, {
                    fill: colors,
                    duration,
                    repeat: loop ? -1 : 0,
                    ease: 'none'
                });
            },
            colorPulse: (el) => gsap.to(el, { 
                filter: 'brightness(1.5) saturate(1.3)',
                duration: duration / 2, 
                yoyo: true, 
                repeat: loop ? -1 : 0,
                ease: easing
            }),
            rainbow: (el) => gsap.to(el, { 
                filter: 'hue-rotate(360deg)',
                duration, 
                repeat: loop ? -1 : 0,
                ease: 'none'
            }),
            draw: (el) => {
                // GSAP draw animation using stroke-dasharray
                try {
                    const pathLength = el.getTotalLength();
                    gsap.fromTo(el, 
                        { strokeDasharray: pathLength, strokeDashoffset: pathLength },
                        { strokeDashoffset: 0, duration, ease: easing }
                    );
                } catch (e) {
                    // Fallback if getTotalLength fails
                    gsap.from(el, { opacity: 0, duration, ease: easing });
                }
            }
        };
        
        const animFunc = animations[animType];
        if (!animFunc) {
            alert('Animation type not supported');
            return;
        }
        
        if (animType === 'stagger') {
            // Stagger applies to all elements at once
            animFunc(pathsToAnimate.map(p => p.element));
        } else {
            // Apply animation to each path with delay
            pathsToAnimate.forEach((path, index) => {
                gsap.delayedCall(index * delay, () => {
                    animFunc(path.element);
                });
            });
        }
        
        this.renderSVG();
        this.updateSelectionVisual();
        alert(`GSAP animation "${animType}" applied to ${pathsToAnimate.length} path(s)!`);
    }

    removeAnimation() {
        this.saveState();
        
        // Remove GSAP animations
        if (typeof gsap !== 'undefined') {
            this.paths.forEach(path => {
                if (path.element._gsap) {
                    gsap.killTweensOf(path.element);
                }
            });
        }
        
        // Remove CSS animations
        const styleElement = this.svgElement.querySelector('style');
        if (styleElement) {
            styleElement.remove();
        }
        this.paths.forEach(path => {
            path.element.style.animation = '';
            path.element.style.animationDelay = '';
            path.element.style.animationIterationCount = '';
            path.element.style.animationDirection = '';
        });
        this.renderSVG();
        this.updateSelectionVisual();
    }

    // ==================== TOOL: IMAGE TRACER (PNG/JPG to SVG) ====================
    
    renderImageTracer() {
        return `
            <div class="tool-explanation">
                <h3>Image Tracer - Convert PNG/JPG to SVG</h3>
                <p>Upload a PNG or JPG image and convert it to SVG paths. Uses edge detection to trace the image and create vector paths.</p>
                <p><strong>When to use:</strong> Start your workflow by converting raster images to SVG. Works best with simple images, logos, and line art.</p>
                <p style="color: var(--warning-color);"><strong>Note:</strong> Complex photos may produce large SVG files. Best for simple graphics.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Upload Image</label>
                <input type="file" class="form-input" id="imageTracerInput" accept="image/png,image/jpeg,image/jpg,image/webp" onchange="app.traceImage(event)">
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Supported formats: PNG, JPG, JPEG, WebP
                </p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Tracing Options</label>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Threshold (0-255)</label>
                    <input type="range" class="form-input" id="traceThreshold" min="0" max="255" value="128" step="1" oninput="document.getElementById('thresholdValue').textContent = this.value">
                    <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="thresholdValue">128</div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Lower = more detail, Higher = simpler paths
                    </p>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Simplify Paths</label>
                    <input type="range" class="form-input" id="traceSimplify" min="0" max="10" value="2" step="0.5" oninput="document.getElementById('simplifyValue').textContent = this.value">
                    <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="simplifyValue">2</div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Higher = fewer points, simpler paths
                    </p>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="traceColor" checked>
                        <span>Preserve colors (creates separate paths per color)</span>
                    </label>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="traceSmooth" checked>
                        <span>Smooth curves (use bezier curves instead of lines)</span>
                    </label>
                </div>
            </div>
            
            <div id="tracePreview" style="display: none; margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius);">
                <label class="form-label">Preview</label>
                <div id="tracePreviewContent" style="max-height: 300px; overflow: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 1rem; background: white;"></div>
            </div>
        `;
    }

    async traceImage(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.showLoading('Tracing image...');
        
        const threshold = parseInt(document.getElementById('traceThreshold').value) || 128;
        const simplify = parseFloat(document.getElementById('traceSimplify').value) || 2;
        const preserveColor = document.getElementById('traceColor').checked;
        const smooth = document.getElementById('traceSmooth').checked;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const svg = this.imageToSVG(img, threshold, simplify, preserveColor, smooth);
                    document.getElementById('tracePreview').style.display = 'block';
                    document.getElementById('tracePreviewContent').innerHTML = svg;
                    
                    // Replace current SVG with traced version
                    if (confirm('Replace current SVG with traced image? This will clear your current work.')) {
                        this.parseSVG(svg);
                        this.hideLoading();
                        alert('Image traced! Your SVG has been replaced with the traced version.');
                    } else {
                        this.hideLoading();
                    }
                } catch (error) {
                    this.hideLoading();
                    this.showError(`Error tracing image: ${error.message}`);
                    console.error(error);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    imageToSVG(img, threshold, simplify, preserveColor, smooth) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = 1200; // Increased for better quality
        let width = img.width;
        let height = img.height;
        
        // Maintain aspect ratio while scaling
        if (width > maxSize || height > maxSize) {
            const scale = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Improved edge detection with Sobel-like gradient calculation
        const grayscale = new Float32Array(width * height);
        const edgeStrength = new Float32Array(width * height);
        
        // First pass: convert to grayscale and calculate edge strength
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                
                // Weighted grayscale
                const gray = (r * 0.299 + g * 0.587 + b * 0.114);
                grayscale[y * width + x] = gray;
                
                // Calculate edge strength using Sobel operator
                if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
                    // Sobel kernels
                    const gx = -grayscale[(y - 1) * width + (x - 1)] + grayscale[(y - 1) * width + (x + 1)]
                              -2 * grayscale[y * width + (x - 1)] + 2 * grayscale[y * width + (x + 1)]
                              -grayscale[(y + 1) * width + (x - 1)] + grayscale[(y + 1) * width + (x + 1)];
                    const gy = -grayscale[(y - 1) * width + (x - 1)] - 2 * grayscale[(y - 1) * width + x] - grayscale[(y - 1) * width + (x + 1)]
                              +grayscale[(y + 1) * width + (x - 1)] + 2 * grayscale[(y + 1) * width + x] + grayscale[(y + 1) * width + (x + 1)];
                    edgeStrength[y * width + x] = Math.sqrt(gx * gx + gy * gy);
                }
            }
        }
        
        // Adaptive thresholding: use local average with edge enhancement
        const binary = [];
        const colorMap = new Map(); // For color preservation
        
        // Calculate adaptive threshold based on local mean and edge strength
        const adaptiveThreshold = this.calculateAdaptiveThreshold(grayscale, edgeStrength, width, height, threshold);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                
                const gray = grayscale[y * width + x];
                const edge = edgeStrength[y * width + x] || 0;
                
                // Adaptive threshold with edge enhancement
                const localThreshold = adaptiveThreshold[y * width + x];
                const edgeBoost = Math.min(edge / 50, 30); // Boost threshold near edges
                const effectiveThreshold = localThreshold - edgeBoost;
                
                // Consider alpha channel and use enhanced thresholding
                const isForeground = gray < effectiveThreshold && a > 100;
                binary.push(isForeground ? 1 : 0);
                
                // Store color for color preservation
                if (preserveColor && isForeground) {
                    const colorKey = `${Math.floor(r/32)*32},${Math.floor(g/32)*32},${Math.floor(b/32)*32}`;
                    if (!colorMap.has(colorKey)) {
                        colorMap.set(colorKey, `rgb(${r},${g},${b})`);
                    }
                }
            }
        }
        
        // Enhanced contour tracing with better simplification
        const paths = this.traceContours(binary, width, height, simplify, preserveColor ? imageData : null, smooth);
        
        // Create SVG
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('xmlns', svgNS);
        
        paths.forEach((pathData, index) => {
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', pathData.d);
            path.setAttribute('id', `traced-path-${index}`);
            if (pathData.color) {
                path.setAttribute('fill', pathData.color);
            } else {
                path.setAttribute('fill', '#000000');
            }
            svg.appendChild(path);
        });
        
        const serializer = new XMLSerializer();
        return serializer.serializeToString(svg);
    }

    calculateAdaptiveThreshold(grayscale, edgeStrength, width, height, baseThreshold) {
        const thresholdMap = new Float32Array(width * height);
        const windowSize = 15; // Local window size for adaptive threshold
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Calculate local mean and variance
                let sum = 0;
                let count = 0;
                
                for (let dy = -halfWindow; dy <= halfWindow; dy++) {
                    for (let dx = -halfWindow; dx <= halfWindow; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            sum += grayscale[ny * width + nx];
                            count++;
                        }
                    }
                }
                
                const localMean = sum / count;
                // Use baseThreshold adjusted by local mean
                thresholdMap[y * width + x] = baseThreshold + (localMean - 128) * 0.3;
            }
        }
        
        return thresholdMap;
    }

    traceContours(binary, width, height, simplify, colorData, smooth) {
        const paths = [];
        const visited = new Set();
        
        // Find all contours
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (binary[idx] === 1 && !visited.has(idx)) {
                    const contour = this.traceContour(binary, width, height, x, y, visited);
                    if (contour.length > 2) {
                        const simplified = this.simplifyContour(contour, simplify);
                        const pathData = smooth ? this.contourToBezier(simplified) : this.contourToPath(simplified);
                        
                        let color = null;
                        if (colorData) {
                            const firstPoint = contour[0];
                            const colorIdx = (firstPoint.y * width + firstPoint.x) * 4;
                            const r = colorData.data[colorIdx];
                            const g = colorData.data[colorIdx + 1];
                            const b = colorData.data[colorIdx + 2];
                            color = `rgb(${r},${g},${b})`;
                        }
                        
                        paths.push({ d: pathData, color });
                    }
                }
            }
        }
        
        return paths;
    }

    traceContour(binary, width, height, startX, startY, visited) {
        const contour = [];
        const stack = [[startX, startY]];
        const dirs = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const idx = y * width + x;
            if (visited.has(idx) || binary[idx] === 0) continue;
            
            visited.add(idx);
            contour.push({ x, y });
            
            // Add neighbors
            for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                const nIdx = ny * width + nx;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
                    !visited.has(nIdx) && binary[nIdx] === 1) {
                    stack.push([nx, ny]);
                }
            }
        }
        
        return contour;
    }

    simplifyContour(contour, tolerance) {
        if (contour.length <= 2 || tolerance === 0) return contour;
        
        // Douglas-Peucker algorithm
        const simplified = [];
        const self = this;
        
        function pointToLineDist(point, lineStart, lineEnd) {
            const A = point.x - lineStart.x;
            const B = point.y - lineStart.y;
            const C = lineEnd.x - lineStart.x;
            const D = lineEnd.y - lineStart.y;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            
            if (lenSq !== 0) param = dot / lenSq;
            
            let xx, yy;
            if (param < 0) {
                xx = lineStart.x;
                yy = lineStart.y;
            } else if (param > 1) {
                xx = lineEnd.x;
                yy = lineEnd.y;
            } else {
                xx = lineStart.x + param * C;
                yy = lineStart.y + param * D;
            }
            
            const dx = point.x - xx;
            const dy = point.y - yy;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        function simplifySegment(start, end) {
            let maxDist = 0;
            let maxIdx = -1;
            
            for (let i = start + 1; i < end; i++) {
                const dist = pointToLineDist(contour[i], contour[start], contour[end]);
                if (dist > maxDist) {
                    maxDist = dist;
                    maxIdx = i;
                }
            }
            
            if (maxDist > tolerance) {
                simplifySegment(start, maxIdx);
                simplified.push(contour[maxIdx]);
                simplifySegment(maxIdx, end);
            }
        }
        
        simplified.push(contour[0]);
        simplifySegment(0, contour.length - 1);
        simplified.push(contour[contour.length - 1]);
        
        return simplified;
    }

    contourToPath(contour) {
        if (contour.length === 0) return '';
        let path = `M ${contour[0].x} ${contour[0].y}`;
        for (let i = 1; i < contour.length; i++) {
            path += ` L ${contour[i].x} ${contour[i].y}`;
        }
        return path + ' Z';
    }

    contourToBezier(contour) {
        if (contour.length < 3) return this.contourToPath(contour);
        
        // Improved bezier curve fitting using Catmull-Rom-like interpolation
        let path = `M ${contour[0].x} ${contour[0].y}`;
        
        // Handle first point
        if (contour.length === 3) {
            // Simple quadratic for 3 points
            const mid = contour[1];
            const end = contour[2];
            const cp1x = (contour[0].x + mid.x * 2) / 3;
            const cp1y = (contour[0].y + mid.y * 2) / 3;
            const cp2x = (mid.x * 2 + end.x) / 3;
            const cp2y = (mid.y * 2 + end.y) / 3;
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
        } else {
            // Use Catmull-Rom spline interpolation for smoother curves
            for (let i = 0; i < contour.length - 1; i++) {
                const p0 = i > 0 ? contour[i - 1] : contour[contour.length - 2];
                const p1 = contour[i];
                const p2 = contour[i + 1];
                const p3 = i < contour.length - 2 ? contour[i + 2] : contour[0];
                
                // Catmull-Rom to Bezier conversion
                // Control points for smooth interpolation
                const tension = 0.5; // Tension parameter for curve smoothness
                const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
                const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
                const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
                const cp2y = p2.y - (p3.y - p1.y) * tension / 6;
                
                if (i === 0) {
                    // First segment
                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                } else if (i === contour.length - 2) {
                    // Last segment - ensure it connects back
                    path += ` S ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                } else {
                    path += ` S ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                }
            }
        }
        
        return path + ' Z';
    }

    // ==================== TOOL: PATH SIMPLIFIER ====================
    
    renderPathSimplifier() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        return `
            <div class="tool-explanation">
                <h3>Path Simplifier</h3>
                <p>Reduce path complexity by removing unnecessary points and simplifying curves. This reduces file size and improves performance.</p>
                <p><strong>When to use:</strong> After creating or importing paths, use this to clean them up. Works great with traced images or complex paths.</p>
                <p style="color: var(--warning-color);"><strong>Note:</strong> Higher simplification may change path appearance. Preview changes before applying.</p>
            </div>
            
            ${selectedCount === 0 ? `
                <div class="form-group">
                    <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); text-align: center;">
                        <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">No paths selected</p>
                        <button class="btn btn-primary" onclick="app.switchTool('workflow')">Go to Workflow Manager</button>
                    </div>
                </div>
            ` : `
                <div class="form-group" style="padding: 1rem; background: rgba(74, 144, 226, 0.1); border-radius: var(--border-radius); border: 2px solid var(--primary-color); margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="font-size: 1rem;">Simplifying:</strong>
                            <span style="font-size: 1.25rem; color: var(--primary-color); margin-left: 0.5rem;">${selectedCount}</span> path(s)
                        </div>
                        <button class="btn btn-small" onclick="app.switchTool('workflow')">Change Selection</button>
                    </div>
                </div>
            `}
            
            <div class="form-group">
                <label class="form-label">Simplification Options</label>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Tolerance (0-10)</label>
                    <input type="range" class="form-input" id="simplifyTolerance" min="0" max="10" value="2" step="0.1" oninput="document.getElementById('toleranceValue').textContent = this.value">
                    <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="toleranceValue">2</div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Higher = more simplification, fewer points. Start with 1-3 for subtle changes.
                    </p>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="simplifyRound" checked>
                        <span>Round coordinates (reduce decimal precision)</span>
                    </label>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="simplifyRemoveRedundant" checked>
                        <span>Remove redundant commands (consecutive L, M commands)</span>
                    </label>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="simplifyCurves">
                        <span>Convert lines to curves where appropriate</span>
                    </label>
                </div>
                <button class="btn btn-primary" onclick="app.simplifyPaths()" ${selectedCount === 0 ? 'disabled' : ''} style="width: 100%;">
                    Simplify ${selectedCount > 0 ? 'Selected' : 'All'} Paths
                </button>
            </div>
            
            <div id="simplifyResults" style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); display: none;">
                <h3 style="font-size: 0.875rem; margin-bottom: 0.5rem;">Simplification Results</h3>
                <div id="simplifyResultsContent"></div>
            </div>
        `;
    }

    simplifyPaths() {
        const selectedCount = this.selectedPaths.size;
        if (selectedCount === 0 && this.paths.length === 0) {
            alert('No paths to simplify');
            return;
        }
        
        this.saveState();
        const tolerance = parseFloat(document.getElementById('simplifyTolerance').value) || 2;
        const roundCoords = document.getElementById('simplifyRound').checked;
        const removeRedundant = document.getElementById('simplifyRemoveRedundant').checked;
        const convertCurves = document.getElementById('simplifyCurves').checked;
        
        const pathsToSimplify = selectedCount > 0 
            ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p)
            : this.paths;
        
        let totalPointsBefore = 0;
        let totalPointsAfter = 0;
        let totalLengthBefore = 0;
        let totalLengthAfter = 0;
        
        pathsToSimplify.forEach(path => {
            const originalD = path.d;
            totalPointsBefore += (originalD.match(/[ML]/g) || []).length;
            totalLengthBefore += originalD.length;
            
            let simplified = originalD;
            
            // Apply Douglas-Peucker-like simplification
            if (tolerance > 0) {
                simplified = this.simplifyPathData(simplified, tolerance);
            }
            
            // Remove redundant commands
            if (removeRedundant) {
                simplified = simplified.replace(/(L\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+)+L\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g, (match) => {
                    const parts = match.trim().split(/\s+/);
                    return 'L ' + parts[parts.length - 2] + ' ' + parts[parts.length - 1];
                });
                simplified = simplified.replace(/M\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+M\s+/g, 'M ');
            }
            
            // Round coordinates
            if (roundCoords) {
                simplified = simplified.replace(/(-?\d+\.\d{3,})/g, (match) => {
                    return parseFloat(match).toFixed(2);
                });
            }
            
            // Convert lines to curves (basic implementation)
            if (convertCurves && tolerance > 0) {
                simplified = this.linesToCurves(simplified);
            }
            
            path.element.setAttribute('d', simplified);
            path.d = simplified;
            
            totalPointsAfter += (simplified.match(/[ML]/g) || []).length;
            totalLengthAfter += simplified.length;
        });
        
        const pointsReduction = totalPointsBefore > 0 ? ((totalPointsBefore - totalPointsAfter) / totalPointsBefore * 100).toFixed(1) : '0';
        const lengthReduction = totalLengthBefore > 0 ? ((totalLengthBefore - totalLengthAfter) / totalLengthBefore * 100).toFixed(1) : '0';
        
        document.getElementById('simplifyResults').style.display = 'block';
        document.getElementById('simplifyResultsContent').innerHTML = `
            <div>Points before: ${totalPointsBefore}</div>
            <div>Points after: ${totalPointsAfter}</div>
            <div style="color: var(--secondary-color); font-weight: 600;">Points reduced: ${pointsReduction}%</div>
            <div style="margin-top: 0.5rem;">Path length before: ${totalLengthBefore} chars</div>
            <div>Path length after: ${totalLengthAfter} chars</div>
            <div style="color: var(--secondary-color); font-weight: 600;">Length reduced: ${lengthReduction}%</div>
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
                Simplified ${pathsToSimplify.length} path(s)
            </div>
        `;
        
        this.extractPaths();
        this.renderSVG();
        this.updateSelectionVisual();
    }

    simplifyPathData(pathData, tolerance) {
        // Extract points from path data
        const commands = pathData.match(/[ML][^ML]*/g) || [];
        if (commands.length < 2) return pathData;
        
        // Parse points
        const points = [];
        commands.forEach(cmd => {
            const coords = cmd.match(/-?\d+\.?\d*/g) || [];
            for (let i = 0; i < coords.length; i += 2) {
                if (coords[i] && coords[i + 1]) {
                    points.push({ x: parseFloat(coords[i]), y: parseFloat(coords[i + 1]) });
                }
            }
        });
        
        if (points.length < 3) return pathData;
        
        // Apply simplification
        const simplified = this.douglasPeucker(points, tolerance);
        
        // Rebuild path
        if (simplified.length === 0) return pathData;
        let result = `M ${simplified[0].x} ${simplified[0].y}`;
        for (let i = 1; i < simplified.length; i++) {
            result += ` L ${simplified[i].x} ${simplified[i].y}`;
        }
        return result;
    }

    douglasPeucker(points, epsilon) {
        if (points.length <= 2) return points;
        
        let maxDist = 0;
        let maxIdx = 0;
        const end = points.length - 1;
        
        for (let i = 1; i < end; i++) {
            const dist = this.perpendicularDistance(points[i], points[0], points[end]);
            if (dist > maxDist) {
                maxDist = dist;
                maxIdx = i;
            }
        }
        
        if (maxDist > epsilon) {
            const left = this.douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
            const right = this.douglasPeucker(points.slice(maxIdx), epsilon);
            return left.slice(0, -1).concat(right);
        } else {
            return [points[0], points[end]];
        }
    }

    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag === 0) {
            const dx2 = point.x - lineStart.x;
            const dy2 = point.y - lineStart.y;
            return Math.sqrt(dx2 * dx2 + dy2 * dy2);
        }
        const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);
        const closestX = lineStart.x + u * dx;
        const closestY = lineStart.y + u * dy;
        const dx2 = point.x - closestX;
        const dy2 = point.y - closestY;
        return Math.sqrt(dx2 * dx2 + dy2 * dy2);
    }

    linesToCurves(pathData) {
        // Convert straight line segments to smooth curves where appropriate
        // This is a simplified version - full implementation would be more complex
        return pathData.replace(/L\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+L\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+L\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g, 
            (match, x1, y1, x2, y2, x3, y3) => {
                // Only convert if points form a smooth curve
                const angle1 = Math.atan2(parseFloat(y2) - parseFloat(y1), parseFloat(x2) - parseFloat(x1));
                const angle2 = Math.atan2(parseFloat(y3) - parseFloat(y2), parseFloat(x3) - parseFloat(x2));
                const angleDiff = Math.abs(angle1 - angle2);
                if (angleDiff < 0.3) { // Smooth transition
                    return `Q ${x2} ${y2}, ${x3} ${y3}`;
                }
                return match;
            });
    }

    // ==================== TOOL 5: SVG OPTIMIZER ====================
    
    renderOptimizer() {
        const selectedCount = this.selectedPaths.size;
        const targetPaths = selectedCount > 0 ? selectedCount : this.paths.length;
        
        return `
            <div class="tool-explanation">
                <h3>SVG Optimizer</h3>
                <p>Clean and optimize your SVG to reduce file size while maintaining visual quality. Removes unnecessary data, rounds coordinates, and reduces path complexity.</p>
                <p><strong>When to use:</strong> Before exporting for production. Use this near the end of your workflow, after all editing is complete.</p>
            </div>
            
            <div class="form-group" style="padding: 1rem; background: ${selectedCount > 0 ? 'rgba(74, 144, 226, 0.1)' : 'var(--bg-secondary)'}; border-radius: var(--border-radius); border: 2px solid ${selectedCount > 0 ? 'var(--primary-color)' : 'var(--border-color)'}; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 1rem;">Optimizing:</strong>
                        <span style="font-size: 1.25rem; color: var(--primary-color); margin-left: 0.5rem;">${targetPaths}</span> path(s)
                    </div>
                    ${selectedCount > 0 ? `
                        <button class="btn btn-small" onclick="app.switchTool('selection')">Change Selection</button>
                    ` : `
                        <button class="btn btn-small" onclick="app.selectAll()">Select All</button>
                    `}
                </div>
                ${selectedCount > 0 ? `
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        Only selected paths will be optimized. Use Selection tool to choose different paths.
                    </p>
                ` : `
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        All paths will be optimized. Select specific paths in Selection tool to optimize only those.
                    </p>
                `}
            </div>
            
            <div class="form-group">
                <label class="form-label">Optimization Options</label>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="optRemoveHidden" checked>
                        <span>Remove hidden elements (display:none, opacity:0)</span>
                    </label>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="optRemoveDefaults" checked>
                        <span>Remove default attributes</span>
                    </label>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="optRoundCoords" checked>
                        <span>Round coordinates (reduce precision to 2 decimals)</span>
                    </label>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="optSimplifyPaths">
                        <span>Simplify paths (reduce path length - may change appearance)</span>
                    </label>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; margin-left: 1.5rem;">
                        Removes redundant points and simplifies curves. Use with caution.
                    </p>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="optRemoveEmpty">
                        <span>Remove empty groups and paths</span>
                    </label>
                </div>
                <button class="btn btn-primary" onclick="app.optimizeSVG()" style="width: 100%;">Optimize ${selectedCount > 0 ? 'Selected' : 'All'} Paths</button>
            </div>
            <div id="optimizationResults" style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); display: none;">
                <h3 style="font-size: 0.875rem; margin-bottom: 0.5rem;">Optimization Results</h3>
                <div id="optResultsContent"></div>
            </div>
        `;
    }

    optimizeSVG() {
        this.saveState();
        const originalSize = new Blob([this.svgData]).size;
        const selectedCount = this.selectedPaths.size;
        const pathsToOptimize = selectedCount > 0 
            ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p)
            : this.paths;
        
        // Remove hidden elements
        if (document.getElementById('optRemoveHidden').checked) {
            pathsToOptimize.forEach(path => {
                const style = path.element.getAttribute('style') || '';
                const opacity = path.element.getAttribute('opacity') || '1';
                if (style.includes('display:none') || opacity === '0') {
                    path.element.remove();
                }
            });
        }
        
        // Round coordinates
        if (document.getElementById('optRoundCoords').checked) {
            pathsToOptimize.forEach(path => {
                const d = path.d;
                const rounded = d.replace(/(\d+\.\d{3,})/g, (match) => {
                    return parseFloat(match).toFixed(2);
                });
                path.element.setAttribute('d', rounded);
                path.d = rounded;
            });
        }
        
        // Simplify paths (reduce path length)
        if (document.getElementById('optSimplifyPaths').checked) {
            pathsToOptimize.forEach(path => {
                const d = path.d;
                // Remove redundant L commands (consecutive line-to with same direction)
                let simplified = d.replace(/(L\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+)+L\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g, (match) => {
                    const parts = match.trim().split(/\s+/);
                    return 'L ' + parts[parts.length - 2] + ' ' + parts[parts.length - 1];
                });
                // Remove redundant M commands
                simplified = simplified.replace(/M\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+M\s+/g, 'M ');
                // Round small numbers to 0
                simplified = simplified.replace(/(-?\d+\.\d{2,})/g, (match) => {
                    const num = parseFloat(match);
                    return Math.abs(num) < 0.01 ? '0' : num.toFixed(2);
                });
                path.element.setAttribute('d', simplified);
                path.d = simplified;
            });
        }
        
        // Remove default attributes
        if (document.getElementById('optRemoveDefaults').checked) {
            pathsToOptimize.forEach(path => {
                if (path.fill === 'black' || path.fill === '#000000') path.element.removeAttribute('fill');
                if (path.stroke === 'none') path.element.removeAttribute('stroke');
                if (path.strokeWidth === '0' || path.strokeWidth === '0px') path.element.removeAttribute('stroke-width');
            });
        }
        
        // Remove empty groups
        if (document.getElementById('optRemoveEmpty').checked) {
            this.groups.forEach(group => {
                if (group.element && group.paths.length === 0) {
                    group.element.remove();
                }
            });
        }
        
        this.extractPaths();
        this.extractGroups();
        const serializer = new XMLSerializer();
        const optimizedSVG = serializer.serializeToString(this.svgElement);
        const newSize = new Blob([optimizedSVG]).size;
        const reduction = originalSize > 0 ? ((originalSize - newSize) / originalSize * 100).toFixed(1) : '0';
        
        document.getElementById('optimizationResults').style.display = 'block';
        document.getElementById('optResultsContent').innerHTML = `
            <div>Original size: ${(originalSize / 1024).toFixed(2)} KB</div>
            <div>Optimized size: ${(newSize / 1024).toFixed(2)} KB</div>
            <div style="color: var(--secondary-color); font-weight: 600;">Reduction: ${reduction}%</div>
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
                Optimized ${selectedCount > 0 ? selectedCount : this.paths.length} path(s)
            </div>
        `;
        
        this.renderSVG();
        this.updateSelectionVisual();
    }

    // ==================== TOOL 6: TRANSFORM CONTROLLER ====================
    
    renderTransformTool() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        return `
            <div class="tool-explanation">
                <h3>Transform Controller</h3>
                <p>Move, scale, and rotate selected paths using sliders and buttons. Transformations are applied relative to existing transforms.</p>
                <p><strong>When to use:</strong> After selecting paths, use this to position and adjust them.</p>
            </div>
            
            ${selectedCount === 0 ? `
                <div class="form-group">
                    <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); text-align: center;">
                        <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">No paths selected</p>
                        <button class="btn btn-primary" onclick="app.switchTool('workflow')">Go to Workflow Manager</button>
                    </div>
                </div>
            ` : `
                <div class="form-group" style="padding: 1rem; background: rgba(74, 144, 226, 0.1); border-radius: var(--border-radius); border: 2px solid var(--primary-color); margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div>
                            <strong style="font-size: 1rem;">Transforming:</strong>
                            <span style="font-size: 1.25rem; color: var(--primary-color); margin-left: 0.5rem;">${selectedCount}</span> path(s)
                        </div>
                        <button class="btn btn-small" onclick="app.switchTool('workflow')">Change Selection</button>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                        ${selectedPaths.slice(0, 3).map(p => p.id).join(', ')}${selectedCount > 3 ? ` and ${selectedCount - 3} more` : ''}
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Transform ${selectedCount} Selected Path(s)</label>
                    
                    <div class="transform-section">
                        <h4 class="transform-section-title">Position</h4>
                        <div class="transform-control">
                            <label class="form-label">X: <span id="transformXValue">0</span></label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('x', -10)">−10</button>
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('x', -1)">−1</button>
                                <input type="range" class="transform-slider" id="transformX" min="-500" max="500" value="0" step="1" oninput="app.updateTransformValue('x', this.value)">
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('x', 1)">+1</button>
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('x', 10)">+10</button>
                            </div>
                        </div>
                        <div class="transform-control" style="margin-top: 0.75rem;">
                            <label class="form-label">Y: <span id="transformYValue">0</span></label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('y', -10)">−10</button>
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('y', -1)">−1</button>
                                <input type="range" class="transform-slider" id="transformY" min="-500" max="500" value="0" step="1" oninput="app.updateTransformValue('y', this.value)">
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('y', 1)">+1</button>
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('y', 10)">+10</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="transform-section">
                        <h4 class="transform-section-title">Scale</h4>
                        <div class="transform-control">
                            <label class="form-label">Scale: <span id="transformScaleValue">1.0</span></label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('scale', -0.1)">−0.1</button>
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('scale', -0.01)">−0.01</button>
                                <input type="range" class="transform-slider" id="transformScale" min="0.1" max="5" value="1" step="0.01" oninput="app.updateTransformValue('scale', this.value)">
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('scale', 0.01)">+0.01</button>
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('scale', 0.1)">+0.1</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="transform-section">
                        <h4 class="transform-section-title">Rotation</h4>
                        <div class="transform-control">
                            <label class="form-label">Degrees: <span id="transformRotateValue">0</span>°</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('rotate', -15)">−15°</button>
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('rotate', -1)">−1°</button>
                                <input type="range" class="transform-slider" id="transformRotate" min="-360" max="360" value="0" step="1" oninput="app.updateTransformValue('rotate', this.value)">
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('rotate', 1)">+1°</button>
                                <button class="btn btn-small transform-bump" onclick="app.adjustTransform('rotate', 15)">+15°</button>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="app.applyTransform()" style="flex: 1;">Apply Transform</button>
                        <button class="btn" onclick="app.resetTransform()">Reset</button>
                    </div>
                </div>
            `}
        `;
    }

    updateTransformValue(type, value) {
        const valueElement = document.getElementById(`transform${type.charAt(0).toUpperCase() + type.slice(1)}Value`);
        if (valueElement) {
            if (type === 'scale') {
                valueElement.textContent = parseFloat(value).toFixed(2);
            } else if (type === 'rotate') {
                valueElement.textContent = Math.round(parseFloat(value));
            } else {
                valueElement.textContent = Math.round(parseFloat(value));
            }
        }
    }

    adjustTransform(type, delta) {
        const input = document.getElementById(`transform${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (!input) return;
        
        const current = parseFloat(input.value) || 0;
        const newValue = current + delta;
        const min = parseFloat(input.min) || -Infinity;
        const max = parseFloat(input.max) || Infinity;
        const clamped = Math.max(min, Math.min(max, newValue));
        
        input.value = clamped;
        this.updateTransformValue(type, clamped);
    }

    resetTransform() {
        document.getElementById('transformX').value = 0;
        document.getElementById('transformY').value = 0;
        document.getElementById('transformScale').value = 1;
        document.getElementById('transformRotate').value = 0;
        this.updateTransformValue('x', 0);
        this.updateTransformValue('y', 0);
        this.updateTransformValue('scale', 1);
        this.updateTransformValue('rotate', 0);
    }

    applyTransform() {
        if (this.selectedPaths.size === 0) {
            alert('Please select paths first');
            return;
        }
        
        this.saveState();
        const tx = parseFloat(document.getElementById('transformX').value) || 0;
        const ty = parseFloat(document.getElementById('transformY').value) || 0;
        const scale = parseFloat(document.getElementById('transformScale').value) || 1;
        const rotate = parseFloat(document.getElementById('transformRotate').value) || 0;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            let currentTransform = path.transform || '';
            const transforms = [];
            
            if (tx !== 0 || ty !== 0) {
                transforms.push(`translate(${tx}, ${ty})`);
            }
            if (scale !== 1) {
                transforms.push(`scale(${scale})`);
            }
            if (rotate !== 0) {
                transforms.push(`rotate(${rotate})`);
            }
            
            if (currentTransform && transforms.length > 0) {
                currentTransform += ' ' + transforms.join(' ');
            } else if (transforms.length > 0) {
                currentTransform = transforms.join(' ');
            }
            
            if (currentTransform) {
                path.element.setAttribute('transform', currentTransform);
                path.transform = currentTransform;
            }
        });
        
        this.renderSVG();
        this.updateSelectionVisual();
    }

    // ==================== TOOL: ALIGNMENT TOOLS ====================
    
    renderAlignmentTools() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        return `
            <div class="tool-explanation">
                <h3>Alignment Tools</h3>
                <p><strong>What it does:</strong> Align and distribute selected paths relative to each other or to the canvas. Essential for creating clean, organized designs.</p>
                <p><strong>When to use:</strong> After selecting multiple paths, use these tools to align them perfectly before bridging or merging.</p>
            </div>
            
            <div class="form-group" style="padding: 1rem; background: ${selectedCount >= 2 ? 'rgba(74, 144, 226, 0.1)' : selectedCount > 0 ? 'rgba(243, 156, 18, 0.1)' : 'var(--bg-secondary)'}; border-radius: var(--border-radius); border: 2px solid ${selectedCount >= 2 ? 'var(--primary-color)' : selectedCount > 0 ? 'var(--warning-color)' : 'var(--border-color)'}; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 1rem;">Aligning:</strong>
                        <span style="font-size: 1.25rem; color: ${selectedCount >= 2 ? 'var(--primary-color)' : 'var(--warning-color)'}; margin-left: 0.5rem;">${selectedCount}</span> path(s)
                    </div>
                    ${selectedCount > 0 ? `
                        <button class="btn btn-small" onclick="app.switchTool('workflow')">Change Selection</button>
                    ` : `
                        <button class="btn btn-small" onclick="app.switchTool('workflow')">Go to Selection</button>
                    `}
                </div>
                ${selectedCount < 2 ? `
                    <p style="font-size: 0.75rem; color: var(--warning-color); margin-top: 0.5rem; font-weight: 600;">
                        ${selectedCount === 0 ? 'Select at least 2 paths to align' : 'Select at least 1 more path to align'}
                    </p>
                ` : ''}
            </div>
            
            <div class="form-group">
                <label class="form-label">Align to Canvas</label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 0.75rem;">
                    <button class="btn btn-small" onclick="app.alignPaths('left', 'canvas')" ${selectedCount === 0 ? 'disabled' : ''}>Align Left</button>
                    <button class="btn btn-small" onclick="app.alignPaths('center', 'canvas')" ${selectedCount === 0 ? 'disabled' : ''}>Align Center</button>
                    <button class="btn btn-small" onclick="app.alignPaths('right', 'canvas')" ${selectedCount === 0 ? 'disabled' : ''}>Align Right</button>
                    <button class="btn btn-small" onclick="app.alignPaths('top', 'canvas')" ${selectedCount === 0 ? 'disabled' : ''}>Align Top</button>
                    <button class="btn btn-small" onclick="app.alignPaths('middle', 'canvas')" ${selectedCount === 0 ? 'disabled' : ''}>Align Middle</button>
                    <button class="btn btn-small" onclick="app.alignPaths('bottom', 'canvas')" ${selectedCount === 0 ? 'disabled' : ''}>Align Bottom</button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Align to Selection</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    Align paths relative to each other (requires 2+ paths)
                </p>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 0.75rem;">
                    <button class="btn btn-small" onclick="app.alignPaths('left', 'selection')" ${selectedCount < 2 ? 'disabled' : ''}>Align Left</button>
                    <button class="btn btn-small" onclick="app.alignPaths('center', 'selection')" ${selectedCount < 2 ? 'disabled' : ''}>Align Center</button>
                    <button class="btn btn-small" onclick="app.alignPaths('right', 'selection')" ${selectedCount < 2 ? 'disabled' : ''}>Align Right</button>
                    <button class="btn btn-small" onclick="app.alignPaths('top', 'selection')" ${selectedCount < 2 ? 'disabled' : ''}>Align Top</button>
                    <button class="btn btn-small" onclick="app.alignPaths('middle', 'selection')" ${selectedCount < 2 ? 'disabled' : ''}>Align Middle</button>
                    <button class="btn btn-small" onclick="app.alignPaths('bottom', 'selection')" ${selectedCount < 2 ? 'disabled' : ''}>Align Bottom</button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Distribute</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    Evenly space paths (requires 3+ paths)
                </p>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                    <button class="btn btn-small" onclick="app.distributePaths('horizontal')" ${selectedCount < 3 ? 'disabled' : ''}>Distribute Horizontally</button>
                    <button class="btn btn-small" onclick="app.distributePaths('vertical')" ${selectedCount < 3 ? 'disabled' : ''}>Distribute Vertically</button>
                </div>
            </div>
        `;
    }

    alignPaths(alignment, reference) {
        if (this.selectedPaths.size === 0) {
            alert('Please select at least one path');
            return;
        }
        
        this.saveState();
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p && p.element);
        
        if (selectedPathElements.length === 0) return;
        
        // Get bounding boxes
        const bboxes = selectedPathElements.map(path => {
            try {
                return path.element.getBBox();
            } catch (e) {
                return null;
            }
        }).filter(b => b !== null);
        
        if (bboxes.length === 0) {
            alert('Could not determine path positions');
            return;
        }
        
        if (reference === 'canvas') {
            // Get SVG viewBox or dimensions
            const viewBox = this.svgElement.getAttribute('viewBox');
            let svgWidth = 100, svgHeight = 100;
            if (viewBox) {
                const [, , w, h] = viewBox.split(' ').map(Number);
                svgWidth = w;
                svgHeight = h;
            } else {
                svgWidth = parseFloat(this.svgElement.getAttribute('width')) || 100;
                svgHeight = parseFloat(this.svgElement.getAttribute('height')) || 100;
            }
            
            // Align each path to canvas edge
            selectedPathElements.forEach((path, idx) => {
                if (!bboxes[idx]) return;
                const bbox = bboxes[idx];
                let tx = 0, ty = 0;
                
                switch (alignment) {
                    case 'left':
                        tx = -bbox.x;
                        break;
                    case 'center':
                        tx = (svgWidth / 2) - (bbox.x + bbox.width / 2);
                        break;
                    case 'right':
                        tx = svgWidth - (bbox.x + bbox.width);
                        break;
                    case 'top':
                        ty = -bbox.y;
                        break;
                    case 'middle':
                        ty = (svgHeight / 2) - (bbox.y + bbox.height / 2);
                        break;
                    case 'bottom':
                        ty = svgHeight - (bbox.y + bbox.height);
                        break;
                }
                
                this.applyAlignmentTransform(path, tx, ty);
            });
        } else {
            // Align relative to selection
            if (selectedPathElements.length < 2) {
                alert('Select at least 2 paths to align relative to each other');
                return;
            }
            
            // Find min/max bounds
            const minX = Math.min(...bboxes.map(b => b.x));
            const maxX = Math.max(...bboxes.map(b => b.x + b.width));
            const minY = Math.min(...bboxes.map(b => b.y));
            const maxY = Math.max(...bboxes.map(b => b.y + b.height));
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            
            selectedPathElements.forEach((path, idx) => {
                if (!bboxes[idx]) return;
                const bbox = bboxes[idx];
                let tx = 0, ty = 0;
                
                switch (alignment) {
                    case 'left':
                        tx = minX - bbox.x;
                        break;
                    case 'center':
                        tx = centerX - (bbox.x + bbox.width / 2);
                        break;
                    case 'right':
                        tx = maxX - (bbox.x + bbox.width);
                        break;
                    case 'top':
                        ty = minY - bbox.y;
                        break;
                    case 'middle':
                        ty = centerY - (bbox.y + bbox.height / 2);
                        break;
                    case 'bottom':
                        ty = maxY - (bbox.y + bbox.height);
                        break;
                }
                
                this.applyAlignmentTransform(path, tx, ty);
            });
        }
        
        this.extractPaths();
        this.renderSVG();
        this.loadTool('alignment');
    }

    distributePaths(direction) {
        if (this.selectedPaths.size < 3) {
            alert('Please select at least 3 paths to distribute');
            return;
        }
        
        this.saveState();
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p && p.element);
        
        // Get bounding boxes and sort
        const pathsWithBBoxes = selectedPathElements.map(path => {
            try {
                const bbox = path.element.getBBox();
                return { path, bbox, center: direction === 'horizontal' ? bbox.x + bbox.width / 2 : bbox.y + bbox.height / 2 };
            } catch (e) {
                return null;
            }
        }).filter(p => p !== null).sort((a, b) => a.center - b.center);
        
        if (pathsWithBBoxes.length < 3) {
            alert('Could not determine path positions');
            return;
        }
        
        // Calculate distribution
        const first = pathsWithBBoxes[0].center;
        const last = pathsWithBBoxes[pathsWithBBoxes.length - 1].center;
        const spacing = (last - first) / (pathsWithBBoxes.length - 1);
        
        pathsWithBBoxes.forEach((item, idx) => {
            const targetCenter = first + (spacing * idx);
            const currentCenter = item.center;
            const offset = targetCenter - currentCenter;
            
            if (direction === 'horizontal') {
                this.applyAlignmentTransform(item.path, offset, 0);
            } else {
                this.applyAlignmentTransform(item.path, 0, offset);
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        this.loadTool('alignment');
    }

    applyAlignmentTransform(path, tx, ty) {
        // Parse existing transform or create new one
        const existingTransform = path.element.getAttribute('transform') || '';
        const transformMatch = existingTransform.match(/translate\(([^)]+)\)/);
        
        let newTx = tx;
        let newTy = ty;
        
        if (transformMatch) {
            const [, coords] = transformMatch;
            const [x, y] = coords.split(/[\s,]+/).map(Number);
            newTx += x || 0;
            newTy += y || 0;
        }
        
        // Combine with other transforms (scale, rotate)
        const otherTransforms = existingTransform.replace(/translate\([^)]+\)/g, '').trim();
        const newTransform = `translate(${newTx},${newTy})${otherTransforms ? ' ' + otherTransforms : ''}`.trim();
        
        path.element.setAttribute('transform', newTransform);
    }

    // ==================== TOOL 7: PATH MERGER ====================
    
    renderPathMerger() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        return `
            <div class="tool-explanation">
                <h3>Path Combiner & Merger</h3>
                <p><strong>What it does:</strong> Combines multiple selected paths into a single path by concatenating their path data.</p>
                <p><strong>When to use:</strong> When you have related paths (like parts of an icon) that should be one path. Useful before exporting or animating to reduce complexity.</p>
                <p><strong>How it works:</strong> Takes the 'd' attribute from each selected path and combines them with spaces. The first path's attributes (fill, stroke) are preserved.</p>
                <p style="color: var(--warning-color); font-weight: 600;"><strong>⚠️ Warning:</strong> This operation cannot be easily undone. Use History (Ctrl+Z) to revert if needed.</p>
            </div>
            
            <div class="form-group" style="padding: 1rem; background: ${selectedCount >= 2 ? 'rgba(74, 144, 226, 0.1)' : selectedCount > 0 ? 'rgba(243, 156, 18, 0.1)' : 'var(--bg-secondary)'}; border-radius: var(--border-radius); border: 2px solid ${selectedCount >= 2 ? 'var(--primary-color)' : selectedCount > 0 ? 'var(--warning-color)' : 'var(--border-color)'}; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 1rem;">Merging:</strong>
                        <span style="font-size: 1.25rem; color: ${selectedCount >= 2 ? 'var(--primary-color)' : 'var(--warning-color)'}; margin-left: 0.5rem;">${selectedCount}</span> path(s)
                    </div>
                    ${selectedCount > 0 ? `
                        <button class="btn btn-small" onclick="app.switchTool('selection')">Change Selection</button>
                    ` : `
                        <button class="btn btn-small" onclick="app.switchTool('selection')">Go to Selection</button>
                    `}
                </div>
                ${selectedCount < 2 ? `
                    <p style="font-size: 0.75rem; color: var(--warning-color); margin-top: 0.5rem; font-weight: 600;">
                        ${selectedCount === 0 ? 'Select at least 2 paths to merge' : 'Select at least 1 more path to merge'}
                    </p>
                ` : `
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        These ${selectedCount} paths will be combined into one path.
                    </p>
                    <div style="margin-top: 0.75rem; max-height: 150px; overflow-y: auto;">
                        ${selectedPaths.map(p => `
                            <div style="padding: 0.5rem; background: var(--bg-primary); border-radius: 4px; margin-bottom: 0.25rem; font-size: 0.75rem;">
                                <strong>${p.id}</strong> - ${p.d.substring(0, 50)}${p.d.length > 50 ? '...' : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            <div class="form-group">
                <button class="btn btn-primary" onclick="app.mergePaths()" ${selectedCount < 2 ? 'disabled' : ''} style="width: 100%;">
                    Merge ${selectedCount >= 2 ? selectedCount : ''} Selected Paths
                </button>
            </div>
        `;
    }

    mergePaths() {
        if (this.selectedPaths.size < 2) {
            alert('Please select at least 2 paths to merge');
            return;
        }
        
        this.saveState();
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p);
        
        if (selectedPathElements.length < 2) return;
        
        const firstPath = selectedPathElements[0];
        const mergedD = selectedPathElements.map(p => p.d).join(' ');
        
        firstPath.element.setAttribute('d', mergedD);
        firstPath.d = mergedD;
        
        // Remove other paths
        selectedPathElements.slice(1).forEach(path => {
            path.element.remove();
        });
        
        this.extractPaths();
        this.selectedPaths.clear();
        this.renderSVG();
        this.loadTool('path-merger');
    }

    // ==================== TOOL: NODE EDITOR ====================
    
    renderNodeEditor() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        return `
            <div class="tool-explanation">
                <h3>Node Editor</h3>
                <p><strong>What it does:</strong> Edit individual points (nodes) on paths by clicking and dragging handles. Perfect for fine-tuning curves and fixing bridging issues.</p>
                <p><strong>When to use:</strong> After bridging gaps or merging paths, when you need to adjust specific points. Essential for precision editing.</p>
                <p><strong>How to use:</strong> 1) Select a path → 2) Click "Show Nodes" → 3) Drag handles to move points → 4) Click "Update Path" to save</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Selected Path${selectedCount !== 1 ? 's' : ''}</label>
                ${selectedCount === 0 ? `
                    <p style="color: var(--text-secondary); font-size: 0.875rem;">
                        Select a path in the preview to edit its nodes.
                    </p>
                ` : selectedCount === 1 ? `
                    <div style="padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--border-radius); margin-bottom: 0.75rem;">
                        <strong>${selectedPaths[0].id}</strong>
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            ${selectedPaths[0].d.substring(0, 80)}${selectedPaths[0].d.length > 80 ? '...' : ''}
                        </p>
                    </div>
                    <button class="btn btn-primary" onclick="app.showNodeHandles('${selectedPaths[0].id}')" style="width: 100%; margin-bottom: 0.5rem;">
                        ${this.nodeEditorActive && this.editingPathId === selectedPaths[0].id ? 'Hide Nodes' : 'Show Nodes'}
                    </button>
                    ${this.nodeEditorActive && this.editingPathId === selectedPaths[0].id ? `
                        <button class="btn btn-secondary" onclick="app.updatePathFromNodes('${selectedPaths[0].id}')" style="width: 100%; margin-bottom: 0.5rem;">
                            Update Path
                        </button>
                        <button class="btn" onclick="app.closePath('${selectedPaths[0].id}')" style="width: 100%; margin-bottom: 0.5rem;">
                            Close Path (Join First to Last)
                        </button>
                        <button class="btn btn-secondary" onclick="app.showBoundingBox('${selectedPaths[0].id}')" style="width: 100%; margin-bottom: 0.5rem;">
                            📦 Show Bounding Box Controls
                        </button>
                    ` : ''}
                ` : `
                    <p style="color: var(--warning-color); font-size: 0.875rem;">
                        Please select exactly 1 path for node editing. Multiple paths not supported.
                    </p>
                `}
            </div>
            
            <div class="form-group">
                <label class="form-label">Snapping Options</label>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="snapToGrid" ${this.snapToGrid ? 'checked' : ''} onchange="app.snapToGrid = this.checked">
                        <span>Snap to Grid</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="snapToPoint" ${this.snapToPoint ? 'checked' : ''} onchange="app.snapToPoint = this.checked">
                        <span>Snap to Point</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="snapToCentersNode" ${this.snapToCenters ? 'checked' : ''} onchange="app.snapToCenters = this.checked">
                        <span>Snap to Object Centers</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="snapToEdgesNode" ${this.snapToEdges ? 'checked' : ''} onchange="app.snapToEdges = this.checked">
                        <span>Snap to Object Edges</span>
                    </label>
                </div>
                <div style="margin-top: 0.5rem;">
                    <label class="form-label">Snap Distance: <span id="snapDistanceValue">${this.snapDistance}</span>px</label>
                    <input type="range" min="5" max="50" value="${this.snapDistance}" oninput="app.snapDistance = parseInt(this.value); document.getElementById('snapDistanceValue').textContent = this.value;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Symmetry Mode</label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
                    <input type="checkbox" id="symmetryMode" ${this.symmetryMode ? 'checked' : ''} onchange="app.toggleSymmetryMode(this.checked)">
                    <span>Enable Symmetry/Mirror</span>
                </label>
                ${this.symmetryMode ? `
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Axis</label>
                        <select class="form-input" id="symmetryAxis" onchange="app.symmetryAxis = this.value">
                            <option value="vertical" ${this.symmetryAxis === 'vertical' ? 'selected' : ''}>Vertical (Left/Right)</option>
                            <option value="horizontal" ${this.symmetryAxis === 'horizontal' ? 'selected' : ''}>Horizontal (Top/Bottom)</option>
                        </select>
                    </div>
                ` : ''}
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    When enabled, editing one side automatically mirrors to the other side.
                </p>
            </div>
            
            <div class="form-group">
                <p style="font-size: 0.75rem; color: var(--text-secondary);">
                    <strong>Tip:</strong> Drag handles to move points. Use snapping to align points perfectly. Close Path connects the last point to the first point.
                </p>
            </div>
        `;
    }

    parsePathData(d) {
        // Parse SVG path data into array of commands with coordinates
        const commands = [];
        const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
        let match;
        let currentX = 0, currentY = 0;
        let startX = 0, startY = 0;
        
        while ((match = regex.exec(d)) !== null) {
            const cmd = match[1];
            const args = match[2].trim().split(/[\s,]+/).filter(s => s).map(Number);
            const isRelative = cmd === cmd.toLowerCase();
            const absCmd = cmd.toUpperCase();
            
            let points = [];
            
            switch (absCmd) {
                case 'M': // Move to
                    if (args.length >= 2) {
                        currentX = isRelative ? currentX + args[0] : args[0];
                        currentY = isRelative ? currentY + args[1] : args[1];
                        startX = currentX;
                        startY = currentY;
                        points.push({ x: currentX, y: currentY, type: 'move' });
                    }
                    break;
                case 'L': // Line to
                    if (args.length >= 2) {
                        currentX = isRelative ? currentX + args[0] : args[0];
                        currentY = isRelative ? currentY + args[1] : args[1];
                        points.push({ x: currentX, y: currentY, type: 'line' });
                    }
                    break;
                case 'H': // Horizontal line
                    currentX = isRelative ? currentX + args[0] : args[0];
                    points.push({ x: currentX, y: currentY, type: 'line' });
                    break;
                case 'V': // Vertical line
                    currentY = isRelative ? currentY + args[0] : args[0];
                    points.push({ x: currentX, y: currentY, type: 'line' });
                    break;
                case 'C': // Cubic Bezier
                    if (args.length >= 6) {
                        points.push({ x: args[0], y: args[1], type: 'control' }); // Control 1
                        points.push({ x: args[2], y: args[3], type: 'control' }); // Control 2
                        currentX = isRelative ? currentX + args[4] : args[4];
                        currentY = isRelative ? currentY + args[5] : args[5];
                        points.push({ x: currentX, y: currentY, type: 'curve' });
                    }
                    break;
                case 'Z': // Close path
                    points.push({ x: startX, y: startY, type: 'close' });
                    break;
                default:
                    // For other commands, try to extract coordinates
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
    }

    showNodeHandles(pathId) {
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        if (this.nodeEditorActive && this.editingPathId === pathId) {
            // Hide handles
            this.hideNodeHandles();
            this.nodeEditorActive = false;
            this.editingPathId = null;
            this.renderSVG();
            this.loadTool('node-editor');
            return;
        }
        
        this.saveState();
        this.nodeEditorActive = true;
        this.editingPathId = pathId;
        this.hideNodeHandles(); // Clear any existing handles
        
        const commands = this.parsePathData(path.d);
        const wrapper = document.getElementById('svgWrapper');
        const svg = wrapper.querySelector('svg');
        if (!svg) return;
        
        // Get SVG transform to convert coordinates
        const svgRect = svg.getBoundingClientRect();
        const viewBox = svg.getAttribute('viewBox');
        
        // Create handles for each point
        commands.forEach((command, cmdIndex) => {
            command.points.forEach((point, pointIndex) => {
                if (point.type === 'close') return; // Skip close points
                
                const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                handle.setAttribute('cx', point.x);
                handle.setAttribute('cy', point.y);
                handle.setAttribute('r', '6');
                handle.setAttribute('fill', point.type === 'control' ? '#ff8800' : '#4a90e2');
                handle.setAttribute('stroke', '#ffffff');
                handle.setAttribute('stroke-width', '2');
                handle.setAttribute('style', 'cursor: move; pointer-events: all;');
                handle.classList.add('node-handle');
                handle.dataset.pathId = pathId;
                handle.dataset.cmdIndex = cmdIndex;
                handle.dataset.pointIndex = pointIndex;
                handle.dataset.originalX = point.x;
                handle.dataset.originalY = point.y;
                handle.dataset.pointType = point.type;
                
                // Make draggable
                this.makeHandleDraggable(handle, path, commands, cmdIndex, pointIndex);
                
                svg.appendChild(handle);
                this.nodeHandles.push(handle);
            });
        });
        
        this.loadTool('node-editor');
    }

    // Helper: Convert screen coordinates to SVG coordinates
    screenToSVG(svg, screenX, screenY) {
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = screenX;
        svgPoint.y = screenY;
        const ctm = svg.getScreenCTM();
        if (ctm) {
            const inverseCTM = ctm.inverse();
            const svgCoord = svgPoint.matrixTransform(inverseCTM);
            return { x: svgCoord.x, y: svgCoord.y };
        }
        // Fallback: use viewBox calculation
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
        // Last resort: direct calculation
        return {
            x: screenX - svgRect.left,
            y: screenY - svgRect.top
        };
    }

    makeHandleDraggable(handle, path, commands, cmdIndex, pointIndex) {
        let isDragging = false;
        const moveHandler = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const svg = document.getElementById('svgWrapper').querySelector('svg');
            if (!svg) return;
            
            // Use proper coordinate conversion
            const svgCoords = this.screenToSVG(svg, e.clientX, e.clientY);
            let newX = svgCoords.x;
            let newY = svgCoords.y;
            
            // Apply snapping
            if (this.snapToGrid) {
                newX = Math.round(newX / 20) * 20;
                newY = Math.round(newY / 20) * 20;
            }
            
            if (this.snapToPoint) {
                // Snap to nearby points
                commands.forEach((cmd, ci) => {
                    cmd.points.forEach((pt, pi) => {
                        if (ci === cmdIndex && pi === pointIndex) return;
                        const dx = pt.x - newX;
                        const dy = pt.y - newY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < this.snapDistance) {
                            newX = pt.x;
                            newY = pt.y;
                        }
                    });
                });
            }
            
            // Enhanced snapping: snap to object centers
            if (this.snapToCenters) {
                this.paths.forEach(p => {
                    if (p.id === path.id) return;
                    try {
                        const bbox = p.element.getBBox();
                        const centerX = bbox.x + bbox.width / 2;
                        const centerY = bbox.y + bbox.height / 2;
                        const dx = centerX - newX;
                        const dy = centerY - newY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < this.snapDistance) {
                            newX = centerX;
                            newY = centerY;
                        }
                    } catch (e) {}
                });
            }
            
            // Enhanced snapping: snap to object edges
            if (this.snapToEdges) {
                this.paths.forEach(p => {
                    if (p.id === path.id) return;
                    try {
                        const bbox = p.element.getBBox();
                        // Check horizontal edges
                        if (Math.abs(newY - bbox.y) < this.snapDistance) newY = bbox.y;
                        if (Math.abs(newY - (bbox.y + bbox.height)) < this.snapDistance) newY = bbox.y + bbox.height;
                        // Check vertical edges
                        if (Math.abs(newX - bbox.x) < this.snapDistance) newX = bbox.x;
                        if (Math.abs(newX - (bbox.x + bbox.width)) < this.snapDistance) newX = bbox.x + bbox.width;
                    } catch (e) {}
                });
            }
            
            // Apply symmetry if enabled
            if (this.symmetryMode) {
                const svg = document.getElementById('svgWrapper').querySelector('svg');
                if (svg) {
                    const viewBox = svg.getAttribute('viewBox');
                    if (viewBox) {
                        const [minX, minY, width, height] = viewBox.split(' ').map(Number);
                        if (this.symmetryAxis === 'vertical') {
                            const centerX = minX + width / 2;
                            const offsetX = newX - centerX;
                            const mirrorX = centerX - offsetX;
                            // Find corresponding point and mirror it
                            const totalPoints = commands.reduce((sum, cmd) => sum + cmd.points.length, 0);
                            const currentIndex = commands.slice(0, cmdIndex).reduce((sum, cmd) => sum + cmd.points.length, 0) + pointIndex;
                            const mirrorIndex = totalPoints - currentIndex - 1;
                            // Find and update mirror point
                            let found = false;
                            let mirrorCmdIndex = 0;
                            let mirrorPointIndex = 0;
                            let count = 0;
                            for (let ci = 0; ci < commands.length && !found; ci++) {
                                for (let pi = 0; pi < commands[ci].points.length && !found; pi++) {
                                    if (count === mirrorIndex) {
                                        mirrorCmdIndex = ci;
                                        mirrorPointIndex = pi;
                                        found = true;
                                    }
                                    count++;
                                }
                            }
                            if (found && (mirrorCmdIndex !== cmdIndex || mirrorPointIndex !== pointIndex)) {
                                commands[mirrorCmdIndex].points[mirrorPointIndex].x = mirrorX;
                                commands[mirrorCmdIndex].points[mirrorPointIndex].y = newY;
                                // Update mirror handle position
                                const mirrorHandle = this.nodeHandles.find(h => 
                                    h.dataset.cmdIndex == mirrorCmdIndex && h.dataset.pointIndex == mirrorPointIndex
                                );
                                if (mirrorHandle) {
                                    mirrorHandle.setAttribute('cx', mirrorX);
                                    mirrorHandle.setAttribute('cy', newY);
                                }
                            }
                        } else {
                            const centerY = minY + height / 2;
                            const offsetY = newY - centerY;
                            const mirrorY = centerY - offsetY;
                            // Find corresponding point and mirror it
                            const totalPoints = commands.reduce((sum, cmd) => sum + cmd.points.length, 0);
                            const currentIndex = commands.slice(0, cmdIndex).reduce((sum, cmd) => sum + cmd.points.length, 0) + pointIndex;
                            const mirrorIndex = totalPoints - currentIndex - 1;
                            // Find and update mirror point
                            let found = false;
                            let mirrorCmdIndex = 0;
                            let mirrorPointIndex = 0;
                            let count = 0;
                            for (let ci = 0; ci < commands.length && !found; ci++) {
                                for (let pi = 0; pi < commands[ci].points.length && !found; pi++) {
                                    if (count === mirrorIndex) {
                                        mirrorCmdIndex = ci;
                                        mirrorPointIndex = pi;
                                        found = true;
                                    }
                                    count++;
                                }
                            }
                            if (found && (mirrorCmdIndex !== cmdIndex || mirrorPointIndex !== pointIndex)) {
                                commands[mirrorCmdIndex].points[mirrorPointIndex].x = newX;
                                commands[mirrorCmdIndex].points[mirrorPointIndex].y = mirrorY;
                                // Update mirror handle position
                                const mirrorHandle = this.nodeHandles.find(h => 
                                    h.dataset.cmdIndex == mirrorCmdIndex && h.dataset.pointIndex == mirrorPointIndex
                                );
                                if (mirrorHandle) {
                                    mirrorHandle.setAttribute('cx', newX);
                                    mirrorHandle.setAttribute('cy', mirrorY);
                                }
                            }
                        }
                    }
                }
            }
            
            // Update command point
            commands[cmdIndex].points[pointIndex].x = newX;
            commands[cmdIndex].points[pointIndex].y = newY;
            
            // Update handle position
            handle.setAttribute('cx', newX);
            handle.setAttribute('cy', newY);
        };
        
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDragging = true;
            document.addEventListener('mousemove', moveHandler);
        });
        
        const upHandler = () => {
            if (isDragging) {
                isDragging = false;
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            }
        };
        
        document.addEventListener('mouseup', upHandler);
    }

    updatePathFromNodes(pathId) {
        const path = this.paths.find(p => p.id === pathId);
        if (!path || !this.nodeEditorActive) return;
        
        const commands = this.parsePathData(path.d);
        // Rebuild path data from modified commands
        let newD = '';
        
        commands.forEach(command => {
            newD += command.cmd;
            if (command.cmd.toUpperCase() === 'Z') {
                // Close path - no args
            } else if (command.points.length > 0) {
                command.points.forEach(point => {
                    if (point.type !== 'close') {
                        newD += ` ${point.x},${point.y}`;
                    }
                });
            } else {
                // Preserve original args for commands we don't fully parse
                newD += ' ' + command.args.join(' ');
            }
        });
        
        path.element.setAttribute('d', newD.trim());
        path.d = newD.trim();
        this.saveState();
        this.hideNodeHandles();
        this.nodeEditorActive = false;
        this.editingPathId = null;
        this.renderSVG();
        this.loadTool('node-editor');
    }

    closePath(pathId) {
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        this.saveState();
        const commands = this.parsePathData(path.d);
        
        // Find first and last points
        let firstPoint = null;
        let lastPoint = null;
        
        for (const cmd of commands) {
            for (const point of cmd.points) {
                if (point.type === 'move') {
                    firstPoint = point;
                }
                if (point.type !== 'close' && point.type !== 'control') {
                    lastPoint = point;
                }
            }
        }
        
        if (firstPoint && lastPoint && (firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y)) {
            // Add line to first point if not already closed
            if (!path.d.trim().endsWith('Z') && !path.d.trim().endsWith('z')) {
                path.d += ` L ${firstPoint.x},${firstPoint.y} Z`;
            } else {
                // Update last point to match first
                lastPoint.x = firstPoint.x;
                lastPoint.y = firstPoint.y;
            }
            
            path.element.setAttribute('d', path.d);
            this.extractPaths();
            this.renderSVG();
            this.loadTool('node-editor');
        }
    }

    hideNodeHandles() {
        this.nodeHandles.forEach(handle => handle.remove());
        this.nodeHandles = [];
    }

    showBoundingBox(pathId) {
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        try {
            const bbox = path.element.getBBox();
            const svg = document.getElementById('svgWrapper').querySelector('svg');
            if (!svg) return;
            
            // Hide existing bounding box
            this.hideBoundingBox();
            
            const svgNS = 'http://www.w3.org/2000/svg';
            
            // Create bounding box rectangle
            const box = document.createElementNS(svgNS, 'rect');
            box.setAttribute('x', bbox.x);
            box.setAttribute('y', bbox.y);
            box.setAttribute('width', bbox.width);
            box.setAttribute('height', bbox.height);
            box.setAttribute('fill', 'none');
            box.setAttribute('stroke', '#4a90e2');
            box.setAttribute('stroke-width', '2');
            box.setAttribute('stroke-dasharray', '5,5');
            box.setAttribute('opacity', '0.7');
            box.classList.add('bounding-box');
            box.dataset.pathId = pathId;
            svg.appendChild(box);
            
            // Create 8 handles (corners + midpoints)
            const handles = [
                { x: bbox.x, y: bbox.y, type: 'corner', pos: 'tl' }, // top-left
                { x: bbox.x + bbox.width / 2, y: bbox.y, type: 'edge', pos: 't' }, // top
                { x: bbox.x + bbox.width, y: bbox.y, type: 'corner', pos: 'tr' }, // top-right
                { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2, type: 'edge', pos: 'r' }, // right
                { x: bbox.x + bbox.width, y: bbox.y + bbox.height, type: 'corner', pos: 'br' }, // bottom-right
                { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height, type: 'edge', pos: 'b' }, // bottom
                { x: bbox.x, y: bbox.y + bbox.height, type: 'corner', pos: 'bl' }, // bottom-left
                { x: bbox.x, y: bbox.y + bbox.height / 2, type: 'edge', pos: 'l' }, // left
            ];
            
            handles.forEach((handle, index) => {
                const circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('cx', handle.x);
                circle.setAttribute('cy', handle.y);
                circle.setAttribute('r', '6');
                circle.setAttribute('fill', handle.type === 'corner' ? '#4a90e2' : '#50c878');
                circle.setAttribute('stroke', '#ffffff');
                circle.setAttribute('stroke-width', '2');
                circle.setAttribute('style', 'cursor: move; pointer-events: all;');
                circle.classList.add('bbox-handle');
                circle.dataset.pathId = pathId;
                circle.dataset.handleIndex = index;
                circle.dataset.handleType = handle.type;
                circle.dataset.handlePos = handle.pos;
                svg.appendChild(circle);
                this.boundingBoxHandles.push(circle);
            });
            
            // Create rotation handle (above top center)
            const rotHandle = document.createElementNS(svgNS, 'circle');
            rotHandle.setAttribute('cx', bbox.x + bbox.width / 2);
            rotHandle.setAttribute('cy', bbox.y - 20);
            rotHandle.setAttribute('r', '6');
            rotHandle.setAttribute('fill', '#f39c12');
            rotHandle.setAttribute('stroke', '#ffffff');
            rotHandle.setAttribute('stroke-width', '2');
            rotHandle.setAttribute('style', 'cursor: crosshair; pointer-events: all;');
            rotHandle.classList.add('bbox-handle');
            rotHandle.dataset.pathId = pathId;
            rotHandle.dataset.handleType = 'rotate';
            svg.appendChild(rotHandle);
            this.boundingBoxHandles.push(rotHandle);
            
            // Create center handle for moving
            const centerHandle = document.createElementNS(svgNS, 'circle');
            centerHandle.setAttribute('cx', bbox.x + bbox.width / 2);
            centerHandle.setAttribute('cy', bbox.y + bbox.height / 2);
            centerHandle.setAttribute('r', '8');
            centerHandle.setAttribute('fill', '#e74c3c');
            centerHandle.setAttribute('stroke', '#ffffff');
            centerHandle.setAttribute('stroke-width', '2');
            centerHandle.setAttribute('style', 'cursor: move; pointer-events: all;');
            centerHandle.classList.add('bbox-handle');
            centerHandle.dataset.pathId = pathId;
            centerHandle.dataset.handleType = 'move';
            svg.appendChild(centerHandle);
            this.boundingBoxHandles.push(centerHandle);
            
            this.boundingBoxActive = true;
            this.makeBoundingBoxDraggable(path);
            
        } catch (e) {
            alert('Could not create bounding box: ' + e.message);
        }
    }

    hideBoundingBox() {
        const svg = document.querySelector('#svgWrapper svg');
        if (svg) {
            svg.querySelectorAll('.bounding-box, .bbox-handle').forEach(el => el.remove());
        }
        this.boundingBoxHandles = [];
        this.boundingBoxActive = false;
    }

    makeBoundingBoxDraggable(path) {
        const svg = document.getElementById('svgWrapper').querySelector('svg');
        if (!svg) return;
        
        let isDragging = false;
        let dragStart = null;
        let initialBBox = null;
        let initialPathData = null;
        let handleType = null;
        let handlePos = null;
        
        this.boundingBoxHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isDragging = true;
                handleType = handle.dataset.handleType;
                handlePos = handle.dataset.handlePos;
                
                try {
                    initialBBox = path.element.getBBox();
                    initialPathData = path.d;
                    const svgCoords = this.screenToSVG(svg, e.clientX, e.clientY);
                    dragStart = { x: svgCoords.x, y: svgCoords.y };
                    
                    document.addEventListener('mousemove', dragHandler);
                    document.addEventListener('mouseup', endDrag);
                } catch (err) {
                    console.error('Bounding box drag error:', err);
                    isDragging = false;
                }
            });
        });
        
        const dragHandler = (e) => {
            if (!isDragging || !dragStart || !initialBBox) return;
            e.preventDefault();
            
            const svgCoords = this.screenToSVG(svg, e.clientX, e.clientY);
            const deltaX = svgCoords.x - dragStart.x;
            const deltaY = svgCoords.y - dragStart.y;
            
            if (handleType === 'move') {
                // Move the entire path
                const commands = this.parsePathData(initialPathData);
                commands.forEach(cmd => {
                    cmd.points.forEach(point => {
                        if (point.type !== 'close' && point.type !== 'control') {
                            point.x += deltaX;
                            point.y += deltaY;
                        }
                    });
                });
                const newD = this.rebuildPathData(commands);
                path.element.setAttribute('d', newD);
                path.d = newD;
                
                // Update bounding box and handles
                this.updateBoundingBox(path.id);
            } else if (handleType === 'rotate') {
                // Rotate around center
                const centerX = initialBBox.x + initialBBox.width / 2;
                const centerY = initialBBox.y + initialBBox.height / 2;
                const angle = Math.atan2(svgCoords.y - centerY, svgCoords.x - centerX) - 
                              Math.atan2(dragStart.y - centerY, dragStart.x - centerX);
                
                const commands = this.parsePathData(initialPathData);
                commands.forEach(cmd => {
                    cmd.points.forEach(point => {
                        if (point.type !== 'close' && point.type !== 'control') {
                            const dx = point.x - centerX;
                            const dy = point.y - centerY;
                            const cos = Math.cos(angle);
                            const sin = Math.sin(angle);
                            point.x = centerX + (dx * cos - dy * sin);
                            point.y = centerY + (dx * sin + dy * cos);
                        }
                    });
                });
                const newD = this.rebuildPathData(commands);
                path.element.setAttribute('d', newD);
                path.d = newD;
                
                this.updateBoundingBox(path.id);
            } else if (handleType === 'corner' || handleType === 'edge') {
                // Scale from opposite corner
                const scaleX = (svgCoords.x - initialBBox.x) / initialBBox.width;
                const scaleY = (svgCoords.y - initialBBox.y) / initialBBox.height;
                
                // Determine scale origin based on handle position
                let originX = initialBBox.x;
                let originY = initialBBox.y;
                if (handlePos && handlePos.includes('r')) originX = initialBBox.x + initialBBox.width;
                if (handlePos && handlePos.includes('b')) originY = initialBBox.y + initialBBox.height;
                
                const commands = this.parsePathData(initialPathData);
                commands.forEach(cmd => {
                    cmd.points.forEach(point => {
                        if (point.type !== 'close' && point.type !== 'control') {
                            const dx = point.x - originX;
                            const dy = point.y - originY;
                            point.x = originX + dx * (handlePos && handlePos.includes('r') ? scaleX : (handlePos && handlePos.includes('l') ? 2 - scaleX : 1));
                            point.y = originY + dy * (handlePos && handlePos.includes('b') ? scaleY : (handlePos && handlePos.includes('t') ? 2 - scaleY : 1));
                        }
                    });
                });
                const newD = this.rebuildPathData(commands);
                path.element.setAttribute('d', newD);
                path.d = newD;
                
                this.updateBoundingBox(path.id);
            }
            
            dragStart = svgCoords;
        };
        
        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                this.saveState();
                this.extractPaths();
                this.renderSVG();
                this.updateBoundingBox(path.id);
            }
            document.removeEventListener('mousemove', dragHandler);
            document.removeEventListener('mouseup', endDrag);
        };
    }

    rebuildPathData(commands) {
        let newD = '';
        commands.forEach(command => {
            newD += command.cmd;
            if (command.cmd.toUpperCase() === 'Z') {
                // Close path - no args
            } else if (command.points.length > 0) {
                command.points.forEach(point => {
                    if (point.type !== 'close' && point.type !== 'control') {
                        newD += ` ${point.x},${point.y}`;
                    }
                });
            } else {
                newD += ' ' + command.args.join(' ');
            }
        });
        return newD.trim();
    }

    updateBoundingBox(pathId) {
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        try {
            const bbox = path.element.getBBox();
            const svg = document.getElementById('svgWrapper').querySelector('svg');
            if (!svg) return;
            
            // Update bounding box rect
            const box = svg.querySelector('.bounding-box');
            if (box) {
                box.setAttribute('x', bbox.x);
                box.setAttribute('y', bbox.y);
                box.setAttribute('width', bbox.width);
                box.setAttribute('height', bbox.height);
            }
            
            // Update handles
            const handles = [
                { x: bbox.x, y: bbox.y, pos: 'tl' },
                { x: bbox.x + bbox.width / 2, y: bbox.y, pos: 't' },
                { x: bbox.x + bbox.width, y: bbox.y, pos: 'tr' },
                { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2, pos: 'r' },
                { x: bbox.x + bbox.width, y: bbox.y + bbox.height, pos: 'br' },
                { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height, pos: 'b' },
                { x: bbox.x, y: bbox.y + bbox.height, pos: 'bl' },
                { x: bbox.x, y: bbox.y + bbox.height / 2, pos: 'l' },
            ];
            
            this.boundingBoxHandles.forEach((handle, index) => {
                if (index < 8 && handles[index]) {
                    handle.setAttribute('cx', handles[index].x);
                    handle.setAttribute('cy', handles[index].y);
                } else if (index === 8) {
                    // Rotation handle
                    handle.setAttribute('cx', bbox.x + bbox.width / 2);
                    handle.setAttribute('cy', bbox.y - 20);
                } else if (index === 9) {
                    // Center handle
                    handle.setAttribute('cx', bbox.x + bbox.width / 2);
                    handle.setAttribute('cy', bbox.y + bbox.height / 2);
                }
            });
        } catch (e) {
            console.error('Update bounding box error:', e);
        }
    }

    // ==================== TOOL: TEXT TO PATH ====================
    
    renderTextToPath() {
        return `
            <div class="tool-explanation">
                <h3>Text to Path Converter</h3>
                <p><strong>What it does:</strong> Converts SVG &lt;text&gt; elements into editable path elements. This ensures text looks identical on all devices regardless of installed fonts.</p>
                <p><strong>When to use:</strong> When creating logos or graphics with text that needs to be merged, edited, or guaranteed to look the same everywhere.</p>
                <p><strong>How it works:</strong> Uses canvas API to render text and trace it into path data.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Create Text</label>
                <input type="text" class="form-input" id="textInput" placeholder="Enter text..." value="Hello SVG" style="margin-bottom: 0.5rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Font Size</label>
                        <input type="number" class="form-input" id="textFontSize" value="48" min="8" max="200">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Font Family</label>
                        <select class="form-input" id="textFontFamily">
                            <option>Arial</option>
                            <option>Times New Roman</option>
                            <option>Courier New</option>
                            <option>Georgia</option>
                            <option>Verdana</option>
                            <option>Helvetica</option>
                            <option>Impact</option>
                            <option>Comic Sans MS</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">X Position</label>
                        <input type="number" class="form-input" id="textX" value="50">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Y Position</label>
                        <input type="number" class="form-input" id="textY" value="100">
                    </div>
                </div>
                <button class="btn btn-primary" onclick="app.createTextAsPath()" style="width: 100%;">
                    Create Text as Path
                </button>
            </div>
            
            <div class="form-group">
                <label class="form-label">Convert Existing Text Elements</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    Convert all &lt;text&gt; elements in your SVG to paths.
                </p>
                <button class="btn btn-secondary" onclick="app.convertAllTextToPath()" style="width: 100%;">
                    Convert All Text to Paths
                </button>
            </div>
        `;
    }

    createTextAsPath() {
        const text = document.getElementById('textInput').value;
        const fontSize = parseInt(document.getElementById('textFontSize').value) || 48;
        const fontFamily = document.getElementById('textFontFamily').value || 'Arial';
        const x = parseFloat(document.getElementById('textX').value) || 50;
        const y = parseFloat(document.getElementById('textY').value) || 100;
        
        if (!text) {
            alert('Please enter some text');
            return;
        }
        
        this.saveState();
        
        // Create canvas to render text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1000;
        canvas.height = 200;
        
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = '#000000';
        ctx.fillText(text, 0, fontSize);
        
        // Get image data and trace
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pathData = this.traceTextToPath(imageData, x, y, fontSize);
        
        // Create path element
        const svgNS = 'http://www.w3.org/2000/svg';
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', '#000000');
        path.id = `text-path-${Date.now()}`;
        
        this.svgElement.appendChild(path);
        this.extractPaths();
        this.renderSVG();
        alert('Text created as path!');
    }

    traceTextToPath(imageData, offsetX, offsetY, fontSize) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Convert to binary (alpha threshold)
        const binary = [];
        for (let i = 0; i < data.length; i += 4) {
            binary.push(data[i + 3] > 128 ? 1 : 0);
        }
        
        // Use improved contour tracing
        const paths = this.traceContours(binary, width, height, 1, imageData, true);
        
        if (paths.length === 0) {
            // Fallback: simple pixel-based tracing
            const simplePaths = [];
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = y * width + x;
                    if (binary[idx] === 1) {
                        const px = (x / width) * fontSize * 10 + offsetX;
                        const py = (y / height) * fontSize + offsetY;
                        simplePaths.push(`M ${px} ${py} L ${px + 1} ${py} L ${px + 1} ${py + 1} L ${px} ${py + 1} Z`);
                    }
                }
            }
            return simplePaths.join(' ');
        }
        
        // Scale and offset paths
        const scaleX = fontSize * 10 / width;
        const scaleY = fontSize / height;
        
        const scaledPaths = paths.map(pathObj => {
            // Parse path data and scale coordinates
            let scaledD = pathObj.d;
            // Scale all coordinates in path data
            scaledD = scaledD.replace(/(-?\d+\.?\d*)/g, (match, num) => {
                const n = parseFloat(num);
                // Determine if it's X or Y coordinate (alternating)
                const isX = scaledD.indexOf(match) % 2 === 0;
                const scaled = isX ? n * scaleX + offsetX : n * scaleY + offsetY;
                return scaled.toFixed(2);
            });
            return scaledD;
        });
        
        return scaledPaths.join(' ');
    }

    convertAllTextToPath() {
        const textElements = this.svgElement.querySelectorAll('text');
        if (textElements.length === 0) {
            alert('No text elements found in SVG');
            return;
        }
        
        this.saveState();
        const svgNS = 'http://www.w3.org/2000/svg';
        let converted = 0;
        
        textElements.forEach(textEl => {
            const text = textEl.textContent;
            const x = parseFloat(textEl.getAttribute('x') || 0);
            const y = parseFloat(textEl.getAttribute('y') || 0);
            const fontSize = parseFloat(textEl.getAttribute('font-size') || window.getComputedStyle(textEl).fontSize) || 16;
            const fontFamily = textEl.getAttribute('font-family') || 'Arial';
            const fill = textEl.getAttribute('fill') || '#000000';
            
            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1000;
            canvas.height = 200;
            
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.fillStyle = fill;
            ctx.fillText(text, 0, fontSize);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pathData = this.traceTextToPath(imageData, x, y, fontSize);
            
            // Create path
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('fill', fill);
            path.id = textEl.id || `text-path-${Date.now()}-${converted}`;
            
            // Replace text with path
            textEl.parentNode.replaceChild(path, textEl);
            converted++;
        });
        
        this.extractPaths();
        this.renderSVG();
        alert(`Converted ${converted} text element(s) to paths!`);
    }

    // ==================== TOOL: PATH OFFSET ====================
    
    renderPathOffset() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        return `
            <div class="tool-explanation">
                <h3>Path Offset / Stroke Expansion</h3>
                <p><strong>What it does:</strong> Converts strokes into filled shapes by creating an outline around paths. Essential for CNC/laser cutting, stickers (white borders), and merging thick strokes with filled shapes.</p>
                <p><strong>When to use:</strong> When you need closed paths for cutting machines, or want to merge a stroke with a fill.</p>
                <p><strong>How it works:</strong> Expands the path outward by the stroke width, creating a new filled path.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Selected Path${selectedCount !== 1 ? 's' : ''}</label>
                ${selectedCount === 0 ? `
                    <p style="color: var(--text-secondary); font-size: 0.875rem;">
                        Select a path in the preview to expand its stroke.
                    </p>
                ` : `
                    <div style="padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--border-radius); margin-bottom: 0.75rem;">
                        <strong>${selectedCount} path(s) selected</strong>
                        ${selectedPaths.map(p => `
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                ${p.id} - Stroke: ${p.strokeWidth || 'none'}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            <div class="form-group">
                <label class="form-label">Offset Distance</label>
                <input type="range" class="form-input" id="offsetDistance" min="1" max="50" value="5" step="0.5" oninput="document.getElementById('offsetValue').textContent = this.value + 'px'">
                <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="offsetValue">5px</div>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Distance to expand the path outward. Use stroke width for accurate expansion.
                </p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Options</label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
                    <input type="checkbox" id="keepOriginal" checked>
                    <span>Keep original path</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="useStrokeWidth">
                    <span>Use path's stroke-width (if available)</span>
                </label>
            </div>
            
            <div class="form-group">
                <button class="btn btn-primary" onclick="app.expandPathStroke()" ${selectedCount === 0 ? 'disabled' : ''} style="width: 100%;">
                    Expand Stroke to Filled Path
                </button>
            </div>
        `;
    }

    expandPathStroke() {
        if (this.selectedPaths.size === 0) {
            alert('Please select at least one path');
            return;
        }
        
        this.saveState();
        const offset = parseFloat(document.getElementById('offsetDistance').value) || 5;
        const keepOriginal = document.getElementById('keepOriginal')?.checked !== false;
        const useStrokeWidth = document.getElementById('useStrokeWidth')?.checked;
        
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p);
        
        const svgNS = 'http://www.w3.org/2000/svg';
        let created = 0;
        
        selectedPathElements.forEach(path => {
            const strokeWidth = useStrokeWidth && path.strokeWidth ? parseFloat(path.strokeWidth) : offset;
            const expandedPath = this.createOffsetPath(path.d, strokeWidth);
            
            if (expandedPath) {
                const newPath = document.createElementNS(svgNS, 'path');
                newPath.setAttribute('d', expandedPath);
                newPath.setAttribute('fill', path.stroke || path.fill || '#000000');
                newPath.setAttribute('stroke', 'none');
                newPath.id = `${path.id}-expanded-${Date.now()}`;
                
                path.element.parentNode.insertBefore(newPath, path.element.nextSibling);
                
                if (!keepOriginal) {
                    path.element.remove();
                }
                created++;
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        alert(`Created ${created} expanded path(s)!`);
    }

    createOffsetPath(pathData, offset) {
        // Use Paper.js for accurate path offset if available
        if (typeof paper !== 'undefined') {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 2048;
                canvas.height = 2048;
                paper.setup(canvas);
                
                let paperPath = new paper.Path(pathData);
                paperPath.closed = true;
                paperPath.flatten(0.5);
                
                // Use expandStroke to offset; strokeWidth represents the expansion radius*2
                paperPath.strokeColor = 'black';
                paperPath.strokeWidth = Math.abs(offset) * 2;
                let expanded = paperPath.expandStroke();
                
                // If contraction requested, expand and then attempt to contract further
                if (offset < 0 && expanded) {
                    expanded.strokeColor = 'black';
                    expanded.strokeWidth = Math.abs(offset) * 2;
                    expanded = expanded.expandStroke();
                }
                
                const resultPathData = Array.isArray(expanded)
                    ? (expanded[0]?.getPathData?.() || expanded[0]?.pathData || null)
                    : (expanded?.getPathData?.() || expanded?.pathData || null);
                
                paper.project.clear();
                if (resultPathData) {
                    return resultPathData;
                }
            } catch (e) {
                console.warn('Paper.js offset failed, using basic method:', e);
                try { paper.project.clear(); } catch (_) {}
                // Fall through to basic implementation
            }
        }
        
        // Basic implementation: expand path by offsetting points
        try {
            const commands = this.parsePathData(pathData);
            if (commands.length === 0) return pathData;
            
            // Calculate center for better offset calculation
            let sumX = 0, sumY = 0, count = 0;
            commands.forEach(cmd => {
                cmd.points.forEach(point => {
                    if (point.type !== 'close' && point.type !== 'control') {
                        sumX += point.x;
                        sumY += point.y;
                        count++;
                    }
                });
            });
            
            if (count === 0) return pathData;
            
            const centerX = sumX / count;
            const centerY = sumY / count;
            
            // Offset each point outward from center
            let newPath = '';
            commands.forEach(cmd => {
                newPath += cmd.cmd;
                if (cmd.points.length > 0) {
                    cmd.points.forEach(point => {
                        if (point.type !== 'close' && point.type !== 'control') {
                            const dx = point.x - centerX;
                            const dy = point.y - centerY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist > 0) {
                                const scale = (dist + offset) / dist;
                                const newX = centerX + dx * scale;
                                const newY = centerY + dy * scale;
                                newPath += ` ${newX},${newY}`;
                            } else {
                                newPath += ` ${point.x},${point.y}`;
                            }
                        }
                    });
                } else {
                    newPath += ' ' + cmd.args.join(' ');
                }
            });
            
            return newPath.trim() || pathData;
        } catch (e) {
            console.error('Path offset error:', e);
            return pathData;
        }
    }

    // ==================== TOOL: BOOLEAN OPERATIONS ====================
    
    renderBooleanOps() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        return `
            <div class="tool-explanation">
                <h3>Boolean Operations</h3>
                <p><strong>What it does:</strong> Combine paths using geometric operations. Union combines shapes, Subtract cuts holes, Intersect keeps only overlapping areas.</p>
                <p><strong>When to use:</strong> For complex shape creation. Subtract for cookie-cutter effects, Intersect for masks, Union for combining (also available in Path Merger).</p>
                <p style="color: var(--success-color);"><strong>Note:</strong> Using Paper.js for production-quality boolean operations! Falls back to basic implementation if library not loaded.</p>
            </div>
            
            <div class="form-group" style="padding: 1rem; background: ${selectedCount >= 2 ? 'rgba(74, 144, 226, 0.1)' : selectedCount > 0 ? 'rgba(243, 156, 18, 0.1)' : 'var(--bg-secondary)'}; border-radius: var(--border-radius); border: 2px solid ${selectedCount >= 2 ? 'var(--primary-color)' : selectedCount > 0 ? 'var(--warning-color)' : 'var(--border-color)'}; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 1rem;">Operating on:</strong>
                        <span style="font-size: 1.25rem; color: ${selectedCount >= 2 ? 'var(--primary-color)' : 'var(--warning-color)'}; margin-left: 0.5rem;">${selectedCount}</span> path(s)
                    </div>
                    ${selectedCount > 0 ? `
                        <button class="btn btn-small" onclick="app.switchTool('workflow')">Change Selection</button>
                    ` : `
                        <button class="btn btn-small" onclick="app.switchTool('workflow')">Go to Selection</button>
                    `}
                </div>
                ${selectedCount < 2 ? `
                    <p style="font-size: 0.75rem; color: var(--warning-color); margin-top: 0.5rem; font-weight: 600;">
                        ${selectedCount === 0 ? 'Select at least 2 paths for boolean operations' : 'Select at least 1 more path'}
                    </p>
                ` : `
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        First selected path is the base. Second+ paths are the operands.
                    </p>
                `}
            </div>
            
            <div class="form-group">
                <label class="form-label">Boolean Operations</label>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary" onclick="app.booleanUnion()" ${selectedCount < 2 ? 'disabled' : ''} style="width: 100%;">
                        ➕ Union (Combine - same as Path Merger)
                    </button>
                    <button class="btn btn-secondary" onclick="app.booleanSubtract()" ${selectedCount < 2 ? 'disabled' : ''} style="width: 100%;">
                        ➖ Subtract (Cut hole with top shape)
                    </button>
                    <button class="btn btn-secondary" onclick="app.booleanIntersect()" ${selectedCount < 2 ? 'disabled' : ''} style="width: 100%;">
                        ✂️ Intersect (Keep only overlap)
                    </button>
                </div>
            </div>
            
            <div class="form-group">
                <p style="font-size: 0.75rem; color: var(--text-secondary);">
                    <strong>How it works:</strong> Union combines all paths. Subtract uses top paths to cut holes in bottom path. Intersect keeps only the overlapping area of all paths.
                </p>
            </div>
        `;
    }

    booleanUnion() {
        if (this.selectedPaths.size < 2) {
            alert('Select at least 2 paths for union operation');
            return;
        }
        
        // Check if Paper.js is available
        if (typeof paper === 'undefined') {
            alert('Paper.js library not loaded. Using basic implementation.');
            this.booleanUnionBasic();
            return;
        }
        
        this.showLoading('Performing union operation...');
        this.saveState();
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p);
        
        if (selectedPathElements.length < 2) return;
        
        try {
            const basePath = selectedPathElements[0];
            
            // Get bounding box to determine canvas size
            let maxWidth = 2000, maxHeight = 2000;
            try {
                const bbox = basePath.element.getBBox();
                maxWidth = Math.max(maxWidth, Math.ceil(bbox.width * 2));
                maxHeight = Math.max(maxHeight, Math.ceil(bbox.height * 2));
            } catch (e) {}
            
            // Create Paper.js project with appropriate size
            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = maxHeight;
            paper.setup(canvas);
            
            // Convert base path to Paper.js Path
            let resultPath;
            try {
                resultPath = new paper.Path(basePath.d);
                if (basePath.fill && basePath.fill !== 'none') {
                    resultPath.fillColor = basePath.fill;
                } else {
                    resultPath.fillColor = '#000000';
                }
                resultPath.closed = true; // Ensure closed path
            } catch (e) {
                console.error('Error creating base Paper.js path:', e);
                paper.project.clear();
                this.booleanUnionBasic();
                return;
            }
            
            // Union with each other path sequentially
            for (const path of selectedPathElements.slice(1)) {
                try {
                    const unionPaperPath = new paper.Path(path.d);
                    unionPaperPath.closed = true;
                    
                    // Perform union operation
                    const result = resultPath.unite(unionPaperPath);
                    
                    if (result && result.length > 0) {
                        // Remove old path
                        resultPath.remove();
                        // Use first result (or combine if multiple)
                        resultPath = result.length === 1 ? result[0] : result[0];
                    }
                } catch (e) {
                    console.warn('Error uniting path:', path.id, e);
                    // Continue with next path
                }
            }
            
            // Convert result back to SVG path data
            let resultPathData;
            if (resultPath.getPathData) {
                resultPathData = resultPath.getPathData();
            } else if (resultPath.pathData) {
                resultPathData = resultPath.pathData;
            } else {
                // Fallback: export as SVG
                const svgString = resultPath.exportSVG({ asString: true });
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
                const pathEl = svgDoc.querySelector('path');
                resultPathData = pathEl ? pathEl.getAttribute('d') : basePath.d;
            }
            
            // Update base path with result
            basePath.element.setAttribute('d', resultPathData);
            basePath.d = resultPathData;
            
            // Remove other paths
            selectedPathElements.slice(1).forEach(path => {
                path.element.remove();
            });
            
            // Clean up Paper.js
            paper.project.clear();
            
            this.extractPaths();
            this.selectedPaths.clear();
            this.selectedPaths.add(basePath.id);
            this.renderSVG();
            this.loadTool('boolean-ops');
            this.hideLoading();
            alert('Union operation completed using Paper.js!');
            
        } catch (e) {
            console.error('Paper.js union error:', e);
            if (typeof paper !== 'undefined') {
                try {
                    paper.project.clear();
                } catch (clearErr) {}
            }
            this.hideLoading();
            alert('Error with Paper.js union. Falling back to basic implementation.');
            this.booleanUnionBasic();
        }
    }

    booleanUnionBasic() {
        // Fallback basic implementation (uses mergePaths)
        if (this.selectedPaths.size < 2) {
            alert('Select at least 2 paths for union operation');
            return;
        }
        this.mergePaths();
    }

    booleanSubtract() {
        if (this.selectedPaths.size < 2) {
            alert('Select at least 2 paths for subtract operation');
            return;
        }
        
        // Check if Paper.js is available
        if (typeof paper === 'undefined') {
            alert('Paper.js library not loaded. Using basic implementation.');
            this.booleanSubtractBasic();
            return;
        }
        
        this.showLoading('Performing subtract operation...');
        this.saveState();
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p);
        
        if (selectedPathElements.length < 2) return;
        
        try {
            const basePath = selectedPathElements[0];
            const subtractPaths = selectedPathElements.slice(1);
            
            // Get bounding box to determine canvas size
            let maxWidth = 2000, maxHeight = 2000;
            try {
                const bbox = basePath.element.getBBox();
                maxWidth = Math.max(maxWidth, Math.ceil(bbox.width * 1.5));
                maxHeight = Math.max(maxHeight, Math.ceil(bbox.height * 1.5));
            } catch (e) {}
            
            // Create Paper.js project with appropriate size
            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = maxHeight;
            paper.setup(canvas);
            
            // Convert base path to Paper.js Path with proper fill
            let basePaperPath;
            try {
                basePaperPath = new paper.Path(basePath.d);
                if (basePath.fill && basePath.fill !== 'none') {
                    basePaperPath.fillColor = basePath.fill;
                } else {
                    basePaperPath.fillColor = '#000000';
                }
                basePaperPath.closed = true; // Ensure closed path
            } catch (e) {
                console.error('Error creating base Paper.js path:', e);
                paper.project.clear();
                this.booleanSubtractBasic();
                return;
            }
            
            // Subtract each path sequentially
            let currentResult = basePaperPath;
            let allSucceeded = true;
            
            for (const path of subtractPaths) {
                try {
                    const subtractPaperPath = new paper.Path(path.d);
                    subtractPaperPath.closed = true;
                    
                    // Perform subtract operation
                    const result = currentResult.subtract(subtractPaperPath);
                    
                    if (result && result.length > 0) {
                        // Remove old path
                        currentResult.remove();
                        // Use first result (or combine if multiple)
                        currentResult = result.length === 1 ? result[0] : result[0];
                    } else {
                        allSucceeded = false;
                        break;
                    }
                } catch (e) {
                    console.warn('Error subtracting path:', path.id, e);
                    allSucceeded = false;
                    break;
                }
            }
            
            if (allSucceeded && currentResult) {
                // Convert result back to SVG path data
                let resultPathData;
                if (currentResult.getPathData) {
                    resultPathData = currentResult.getPathData();
                } else if (currentResult.pathData) {
                    resultPathData = currentResult.pathData;
                } else {
                    // Fallback: export as SVG
                    const svgString = currentResult.exportSVG({ asString: true });
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
                    const pathEl = svgDoc.querySelector('path');
                    resultPathData = pathEl ? pathEl.getAttribute('d') : basePath.d;
                }
                
                // Update base path
                basePath.element.setAttribute('d', resultPathData);
                basePath.d = resultPathData;
                
                // Remove subtract paths
                subtractPaths.forEach(path => {
                    path.element.remove();
                });
                
                // Clean up Paper.js
                paper.project.clear();
                
                this.extractPaths();
                this.selectedPaths.clear();
                this.selectedPaths.add(basePath.id);
                this.renderSVG();
                this.loadTool('boolean-ops');
                this.hideLoading();
                alert('Subtract operation completed successfully!');
            } else {
                paper.project.clear();
                this.hideLoading();
                alert('Subtract operation had issues. Falling back to basic implementation.');
                this.booleanSubtractBasic();
            }
            
        } catch (e) {
            console.error('Paper.js subtract error:', e);
            if (typeof paper !== 'undefined') {
                try {
                    paper.project.clear();
                } catch (clearErr) {}
            }
            this.hideLoading();
            alert('Error with Paper.js subtract. Falling back to basic implementation.');
            this.booleanSubtractBasic();
        }
    }

    booleanSubtractBasic() {
        // Fallback basic implementation
        if (this.selectedPaths.size < 2) return;
        
        this.saveState();
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p);
        
        if (selectedPathElements.length < 2) return;
        
        const basePath = selectedPathElements[0];
        const subtractPaths = selectedPathElements.slice(1);
        
        // Basic subtract: create a compound path with even-odd fill rule
        let combinedD = basePath.d;
        
        subtractPaths.forEach(path => {
            // Reverse the path to create a "hole"
            const reversed = this.reversePath(path.d);
            combinedD += ' ' + reversed;
        });
        
        // Apply even-odd fill rule for subtract effect
        basePath.element.setAttribute('d', combinedD);
        basePath.element.setAttribute('fill-rule', 'evenodd');
        basePath.d = combinedD;
        
        // Remove subtract paths
        subtractPaths.forEach(path => {
            path.element.remove();
        });
        
        this.extractPaths();
        this.selectedPaths.clear();
        this.selectedPaths.add(basePath.id);
        this.renderSVG();
        this.loadTool('boolean-ops');
    }

    booleanIntersect() {
        if (this.selectedPaths.size < 2) {
            alert('Select at least 2 paths for intersect operation');
            return;
        }
        
        // Check if Paper.js is available
        if (typeof paper === 'undefined') {
            alert('Paper.js library not loaded. Using basic implementation.');
            this.booleanIntersectBasic();
            return;
        }
        
        this.showLoading('Performing intersect operation...');
        this.saveState();
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p);
        
        if (selectedPathElements.length < 2) return;
        
        try {
            const basePath = selectedPathElements[0];
            
            // Create Paper.js project
            const canvas = document.createElement('canvas');
            canvas.width = 2000;
            canvas.height = 2000;
            paper.setup(canvas);
            
            // Convert base path to Paper.js Path
            let resultPath = new paper.Path(basePath.d);
            resultPath.fillColor = basePath.fill || '#000000';
            
            // Intersect with each other path
            selectedPathElements.slice(1).forEach(path => {
                const intersectPaperPath = new paper.Path(path.d);
                const result = resultPath.intersect(intersectPaperPath);
                if (result && result.length > 0) {
                    resultPath.remove();
                    resultPath = result[0]; // Get first result
                }
            });
            
            // Convert result back to SVG path data
            const resultPathData = resultPath.pathData || resultPath.getPathData();
            
            // Update base path with result
            basePath.element.setAttribute('d', resultPathData);
            basePath.d = resultPathData;
            
            // Remove other paths
            selectedPathElements.slice(1).forEach(path => {
                path.element.remove();
            });
            
            // Clean up Paper.js
            paper.project.clear();
            
            this.extractPaths();
            this.selectedPaths.clear();
            this.selectedPaths.add(basePath.id);
            this.renderSVG();
            this.loadTool('boolean-ops');
            this.hideLoading();
            alert('Intersect operation applied using Paper.js!');
            
        } catch (e) {
            console.error('Paper.js intersect error:', e);
            this.hideLoading();
            alert('Error with Paper.js intersect. Falling back to basic implementation.');
            this.booleanIntersectBasic();
        }
    }

    booleanIntersectBasic() {
        // Fallback basic implementation
        if (this.selectedPaths.size < 2) return;
        
        this.saveState();
        const selectedPathElements = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p);
        
        if (selectedPathElements.length < 2) return;
        
        const basePath = selectedPathElements[0];
        
        // Basic intersect: find overlapping bounding boxes and create mask
        const bboxes = selectedPathElements.map(path => {
            try {
                return path.element.getBBox();
            } catch (e) {
                return null;
            }
        }).filter(b => b !== null);
        
        if (bboxes.length < 2) {
            alert('Could not determine path bounds for intersection');
            return;
        }
        
        // Find intersection of bounding boxes
        const minX = Math.max(...bboxes.map(b => b.x));
        const maxX = Math.min(...bboxes.map(b => b.x + b.width));
        const minY = Math.max(...bboxes.map(b => b.y));
        const maxY = Math.min(...bboxes.map(b => b.y + b.height));
        
        if (minX >= maxX || minY >= maxY) {
            alert('Paths do not overlap');
            return;
        }
        
        // Create intersection rectangle (simplified)
        const svgNS = 'http://www.w3.org/2000/svg';
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', minX);
        rect.setAttribute('y', minY);
        rect.setAttribute('width', maxX - minX);
        rect.setAttribute('height', maxY - minY);
        rect.setAttribute('fill', basePath.fill || '#000000');
        rect.id = `intersect-${Date.now()}`;
        
        // Remove original paths
        selectedPathElements.forEach(path => {
            path.element.remove();
        });
        
        this.svgElement.appendChild(rect);
        this.extractPaths();
        this.selectedPaths.clear();
        this.renderSVG();
        this.loadTool('boolean-ops');
    }

    reversePath(pathData) {
        // Reverse path direction by parsing and reversing commands
        const commands = this.parsePathData(pathData);
        const reversed = [];
        
        for (let i = commands.length - 1; i >= 0; i--) {
            const cmd = commands[i];
            const newCmd = { ...cmd };
            
            // Reverse point order
            if (newCmd.points.length > 0) {
                newCmd.points = newCmd.points.reverse();
            }
            
            reversed.push(newCmd);
        }
        
        // Rebuild path data
        let newD = '';
        reversed.forEach(command => {
            newD += command.cmd;
            if (command.points.length > 0) {
                command.points.forEach(point => {
                    if (point.type !== 'close') {
                        newD += ` ${point.x},${point.y}`;
                    }
                });
            } else {
                newD += ' ' + command.args.join(' ');
            }
        });
        
        return newD.trim();
    }

    // ==================== TOOL: CLEANUP TOOLS ====================
    
    renderCleanupTools() {
        return `
            <div class="tool-explanation">
                <h3>Cleanup & Precision Tools</h3>
                <p><strong>What it does:</strong> One-click scripts to fix common SVG errors and improve precision. Essential for clean code and cutting machines.</p>
                <p><strong>When to use:</strong> Before exporting, or when paths aren't behaving correctly. Use these to clean up messy SVGs.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Visual Indicators</label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.75rem;">
                    <input type="checkbox" id="showStartEnd" ${this.showStartEndIndicators ? 'checked' : ''} onchange="app.showStartEndIndicators = this.checked; app.updateSelectionVisual();">
                    <span>Show Start/End Points (Green = Start, Red = End)</span>
                </label>
                <p style="font-size: 0.75rem; color: var(--text-secondary);">
                    Visualize path start and end points to identify gaps and winding direction.
                </p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Bulk Cleanup Actions</label>
                
                <button class="btn btn-primary" onclick="app.removeInvisibleObjects()" style="width: 100%; margin-bottom: 0.5rem;">
                    🗑️ Remove Invisible Objects
                </button>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Deletes paths with opacity: 0, display: none, or no stroke/fill
                </p>
                
                <button class="btn btn-primary" onclick="app.removeStrayPoints()" style="width: 100%; margin-bottom: 0.5rem;">
                    🗑️ Remove Stray Points
                </button>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Deletes paths that only have 1 point (stray clicks)
                </p>
                
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Round Coordinates</label>
                    <input type="range" class="form-input" id="roundPrecision" min="0" max="5" value="2" oninput="document.getElementById('roundValue').textContent = this.value + ' decimals'">
                    <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="roundValue">2 decimals</div>
                    <button class="btn btn-primary" onclick="app.roundCoordinates()" style="width: 100%; margin-top: 0.5rem;">
                        🔢 Round All Coordinates
                    </button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Transform Operations</label>
                <button class="btn btn-secondary" onclick="app.flattenTransforms()" style="width: 100%; margin-bottom: 0.5rem;">
                    🔨 Flatten/Bake Transforms
                </button>
                <p style="font-size: 0.75rem; color: var(--text-secondary);">
                    Applies transform attributes to path coordinates and removes transform. Essential for clean code and accurate bridging.
                </p>
            </div>
        `;
    }

    removeInvisibleObjects() {
        this.saveState();
        let removed = 0;
        
        this.paths.forEach(path => {
            const opacity = parseFloat(path.opacity) || 1;
            const display = path.element.style.display || window.getComputedStyle(path.element).display;
            const hasFill = path.fill && path.fill !== 'none' && path.fill !== 'transparent';
            const hasStroke = path.stroke && path.stroke !== 'none' && path.stroke !== 'transparent' && parseFloat(path.strokeWidth) > 0;
            
            if (opacity === 0 || display === 'none' || (!hasFill && !hasStroke)) {
                path.element.remove();
                this.selectedPaths.delete(path.id);
                removed++;
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        alert(`Removed ${removed} invisible object(s)!`);
    }

    removeStrayPoints() {
        this.saveState();
        let removed = 0;
        
        this.paths.forEach(path => {
            const commands = this.parsePathData(path.d);
            const pointCount = commands.reduce((sum, cmd) => sum + cmd.points.filter(p => p.type !== 'close' && p.type !== 'control').length, 0);
            
            if (pointCount <= 1) {
                path.element.remove();
                this.selectedPaths.delete(path.id);
                removed++;
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        alert(`Removed ${removed} stray point(s)!`);
    }

    roundCoordinates() {
        const precision = parseInt(document.getElementById('roundPrecision').value) || 2;
        this.saveState();
        let rounded = 0;
        
        this.paths.forEach(path => {
            const commands = this.parsePathData(path.d);
            let newD = '';
            
            commands.forEach(command => {
                newD += command.cmd;
                if (command.points.length > 0) {
                    command.points.forEach(point => {
                        if (point.type !== 'close') {
                            const x = parseFloat(point.x.toFixed(precision));
                            const y = parseFloat(point.y.toFixed(precision));
                            newD += ` ${x},${y}`;
                        }
                    });
                } else if (command.args.length > 0) {
                    newD += ' ' + command.args.map(arg => parseFloat(arg.toFixed(precision))).join(' ');
                }
            });
            
            if (newD !== path.d) {
                path.element.setAttribute('d', newD.trim());
                path.d = newD.trim();
                rounded++;
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        alert(`Rounded coordinates in ${rounded} path(s) to ${precision} decimals!`);
    }

    flattenTransforms() {
        if (this.selectedPaths.size === 0) {
            if (!confirm('No paths selected. Flatten transforms for ALL paths?')) return;
        }
        
        this.saveState();
        const pathsToFlatten = this.selectedPaths.size > 0
            ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p)
            : this.paths;
        
        let flattened = 0;
        
        pathsToFlatten.forEach(path => {
            const transform = path.element.getAttribute('transform');
            if (!transform) return;
            
            // Parse transform
            const translateMatch = transform.match(/translate\(([^)]+)\)/);
            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
            
            let tx = 0, ty = 0, scaleX = 1, scaleY = 1, rotate = 0;
            
            if (translateMatch) {
                const coords = translateMatch[1].split(/[\s,]+/).map(Number);
                tx = coords[0] || 0;
                ty = coords[1] || 0;
            }
            
            if (scaleMatch) {
                const scales = scaleMatch[1].split(/[\s,]+/).map(Number);
                scaleX = scales[0] || 1;
                scaleY = scales[1] || scaleX;
            }
            
            if (rotateMatch) {
                rotate = parseFloat(rotateMatch[1]) || 0;
            }
            
            // Apply to path data
            const commands = this.parsePathData(path.d);
            const centerX = 0, centerY = 0; // Could calculate from bbox
            
            commands.forEach(cmd => {
                cmd.points.forEach(point => {
                    if (point.type === 'close') return;
                    
                    // Apply rotation
                    if (rotate !== 0) {
                        const rad = (rotate * Math.PI) / 180;
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        const dx = point.x - centerX;
                        const dy = point.y - centerY;
                        point.x = centerX + (dx * cos - dy * sin);
                        point.y = centerY + (dx * sin + dy * cos);
                    }
                    
                    // Apply scale
                    point.x *= scaleX;
                    point.y *= scaleY;
                    
                    // Apply translation
                    point.x += tx;
                    point.y += ty;
                });
            });
            
            // Rebuild path data
            let newD = '';
            commands.forEach(command => {
                newD += command.cmd;
                if (command.points.length > 0) {
                    command.points.forEach(point => {
                        if (point.type !== 'close') {
                            newD += ` ${point.x},${point.y}`;
                        }
                    });
                } else {
                    newD += ' ' + command.args.join(' ');
                }
            });
            
            path.element.setAttribute('d', newD.trim());
            path.element.removeAttribute('transform');
            path.d = newD.trim();
            path.transform = '';
            flattened++;
        });
        
        this.extractPaths();
        this.renderSVG();
        alert(`Flattened transforms for ${flattened} path(s)!`);
    }

    // ==================== TOOL: MEASUREMENT TOOLS ====================
    
    renderMeasurementTools() {
        return `
            <div class="tool-explanation">
                <h3>Measurement & Dimension Tools</h3>
                <p><strong>What it does:</strong> Measure distances, inspect coordinates, and get precise dimensions. Essential for closing gaps and precision work.</p>
                <p><strong>When to use:</strong> When you need to know exact distances between points or precise coordinates for bridging.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Ruler / Tape Measure</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    Click two points in the preview to measure distance
                </p>
                <button class="btn ${this.rulerActive ? 'btn-secondary' : 'btn-primary'}" onclick="app.startRulerMeasurement()" style="width: 100%; margin-bottom: 0.5rem;">
                    ${this.rulerActive ? '❌ Cancel Measurement' : '📏 Start Measurement'}
                </button>
                <div id="measurementResult" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--border-radius); display: none;">
                    <strong>Distance:</strong> <span id="measurementDistance">0</span>px
                </div>
                ${this.rulerActive ? `
                    <p style="font-size: 0.75rem; color: var(--primary-color); margin-top: 0.5rem; font-weight: 600;">
                        Click first point in preview...
                    </p>
                ` : ''}
            </div>
            
            <div class="form-group">
                <label class="form-label">Enhanced Snapping</label>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="snapToCenters" ${this.snapToCenters ? 'checked' : ''} onchange="app.snapToCenters = this.checked">
                        <span>Snap to Object Centers</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="snapToEdges" ${this.snapToEdges ? 'checked' : ''} onchange="app.snapToEdges = this.checked">
                        <span>Snap to Object Edges</span>
                    </label>
                </div>
                <button class="btn btn-small ${this.guideLineDragMode ? 'btn-secondary' : ''}" onclick="app.addGuideLine()" style="width: 100%;">
                    ${this.guideLineDragMode ? '❌ Cancel Guide Line Mode' : '➕ Add Guide Line (Drag from Edge)'}
                </button>
                ${this.guideLines.length > 0 ? `
                    <div style="margin-top: 0.5rem;">
                        <label class="form-label" style="font-size: 0.75rem;">Guide Lines (${this.guideLines.length})</label>
                        <button class="btn btn-small" onclick="app.clearGuideLines()" style="width: 100%;">
                            🗑️ Clear All Guides
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="form-group">
                <label class="form-label">Coordinate Inspector</label>
                ${this.selectedPaths.size === 1 ? `
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                        Selected path: <strong>${Array.from(this.selectedPaths)[0]}</strong>
                    </p>
                    <div id="coordinateInspector">
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">
                            Use Node Editor to see and edit individual point coordinates
                        </p>
                    </div>
                ` : `
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">
                        Select exactly 1 path to inspect coordinates
                    </p>
                `}
            </div>
            
            <div class="form-group">
                <label class="form-label">Path Statistics</label>
                <div id="pathStats" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--border-radius);">
                    ${this.selectedPaths.size > 0 ? this.getPathStatistics() : 'Select paths to see statistics'}
                </div>
            </div>
        `;
    }

    startRulerMeasurement() {
        if (this.rulerActive) {
            // Cancel measurement
            this.cancelRulerMeasurement();
            return;
        }
        
        this.rulerActive = true;
        this.rulerPoints = [];
        const svg = document.querySelector('#svgWrapper svg');
        if (!svg) {
            alert('Load an SVG first');
            this.rulerActive = false;
            return;
        }
        
        // Add click listener
        const measureHandler = (e) => {
            if (!this.rulerActive) return;
            
            // Use proper coordinate conversion
            const svgCoords = this.screenToSVG(svg, e.clientX, e.clientY);
            const x = svgCoords.x;
            const y = svgCoords.y;
            
            this.rulerPoints.push({ x, y });
            
            if (this.rulerPoints.length === 1) {
                // First point - show marker
                this.drawRulerPoint(svg, x, y, 1);
            } else if (this.rulerPoints.length === 2) {
                // Second point - calculate distance and show line
                const dist = Math.sqrt(
                    Math.pow(this.rulerPoints[1].x - this.rulerPoints[0].x, 2) +
                    Math.pow(this.rulerPoints[1].y - this.rulerPoints[0].y, 2)
                );
                
                this.drawRulerLine(svg, this.rulerPoints[0], this.rulerPoints[1], dist);
                
                document.getElementById('measurementResult').style.display = 'block';
                document.getElementById('measurementDistance').textContent = dist.toFixed(2);
                
                // Remove listener after second click
                svg.removeEventListener('click', measureHandler);
                this.rulerActive = false;
            }
        };
        
        svg.addEventListener('click', measureHandler);
        alert('Click two points in the preview to measure distance. Click "Start Measurement" again to cancel.');
    }

    cancelRulerMeasurement() {
        this.rulerActive = false;
        this.rulerPoints = [];
        // Remove ruler visuals
        const svg = document.querySelector('#svgWrapper svg');
        if (svg) {
            svg.querySelectorAll('.ruler-point, .ruler-line, .ruler-label').forEach(el => el.remove());
        }
        document.getElementById('measurementResult').style.display = 'none';
    }

    drawRulerPoint(svg, x, y, num) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', '#4a90e2');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        circle.classList.add('ruler-point');
        svg.appendChild(circle);
        
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y - 10);
        text.setAttribute('fill', '#4a90e2');
        text.setAttribute('font-size', '12');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = num;
        text.classList.add('ruler-label');
        svg.appendChild(text);
    }

    drawRulerLine(svg, p1, p2, distance) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', p1.x);
        line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x);
        line.setAttribute('y2', p2.y);
        line.setAttribute('stroke', '#4a90e2');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.classList.add('ruler-line');
        svg.appendChild(line);
        
        // Draw second point
        this.drawRulerPoint(svg, p2.x, p2.y, 2);
        
        // Add distance label at midpoint
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY - 5);
        text.setAttribute('fill', '#4a90e2');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('stroke', '#4a90e2');
        text.setAttribute('stroke-width', '0.5');
        text.textContent = distance.toFixed(2) + 'px';
        text.classList.add('ruler-label');
        svg.appendChild(text);
    }

    toggleSymmetryMode(enabled) {
        this.symmetryMode = enabled;
        if (enabled) {
            alert('Symmetry mode enabled! Editing one side will mirror to the other. (Note: Full implementation requires tracking all points)');
        }
    }

    addGuideLine() {
        // Toggle drag-to-create mode
        if (this.guideLineDragMode) {
            // Cancel mode
            this.guideLineDragMode = false;
            const wrapper = document.getElementById('svgWrapper');
            if (wrapper) {
                wrapper.style.cursor = '';
                wrapper.title = '';
            }
            if (this.guideLineCancelHandler) {
                this.guideLineCancelHandler();
            }
            this.loadTool('measurement'); // Refresh UI
            return;
        }
        
        // Enable drag-to-create mode
        this.guideLineDragMode = true;
        const wrapper = document.getElementById('svgWrapper');
        if (!wrapper) return;
        
        const svg = wrapper.querySelector('svg');
        if (!svg) {
            alert('Load an SVG first');
            this.guideLineDragMode = false;
            return;
        }
        
        wrapper.style.cursor = 'crosshair';
        wrapper.title = 'Click and drag from canvas edge (within 20px) to create guide line';
        
        let isDragging = false;
        let startPoint = null;
        let currentGuide = null;
        const svgNS = 'http://www.w3.org/2000/svg';
        
        const mouseDownHandler = (e) => {
            if (!this.guideLineDragMode) return;
            const rect = wrapper.getBoundingClientRect();
            const edgeThreshold = 20;
            
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const nearLeft = x < edgeThreshold;
            const nearRight = x > rect.width - edgeThreshold;
            const nearTop = y < edgeThreshold;
            const nearBottom = y > rect.height - edgeThreshold;
            
            if (nearLeft || nearRight || nearTop || nearBottom) {
                isDragging = true;
                const svgCoords = this.screenToSVG(svg, e.clientX, e.clientY);
                startPoint = svgCoords;
                
                currentGuide = document.createElementNS(svgNS, 'line');
                currentGuide.setAttribute('stroke', '#4a90e2');
                currentGuide.setAttribute('stroke-width', '1');
                currentGuide.setAttribute('stroke-dasharray', '5,5');
                currentGuide.setAttribute('opacity', '0.5');
                currentGuide.classList.add('guide-line');
                currentGuide.dataset.guideId = `guide-${Date.now()}`;
                
                const viewBox = svg.getAttribute('viewBox');
                if (viewBox) {
                    const [minX, minY, width, height] = viewBox.split(' ').map(Number);
                    if (nearLeft || nearRight) {
                        currentGuide.setAttribute('x1', svgCoords.x);
                        currentGuide.setAttribute('y1', minY);
                        currentGuide.setAttribute('x2', svgCoords.x);
                        currentGuide.setAttribute('y2', minY + height);
                    } else {
                        currentGuide.setAttribute('x1', minX);
                        currentGuide.setAttribute('y1', svgCoords.y);
                        currentGuide.setAttribute('x2', minX + width);
                        currentGuide.setAttribute('y2', svgCoords.y);
                    }
                } else {
                    currentGuide.setAttribute('x1', svgCoords.x);
                    currentGuide.setAttribute('y1', svgCoords.y);
                    currentGuide.setAttribute('x2', svgCoords.x);
                    currentGuide.setAttribute('y2', svgCoords.y);
                }
                
                svg.appendChild(currentGuide);
                e.preventDefault();
            }
        };
        
        const mouseMoveHandler = (e) => {
            if (!isDragging || !currentGuide) return;
            const rect = wrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const nearLeft = x < 20;
            const nearRight = x > rect.width - 20;
            const nearTop = y < 20;
            const nearBottom = y > rect.height - 20;
            
            const viewBox = svg.getAttribute('viewBox');
            if (viewBox) {
                const [minX, minY, width, height] = viewBox.split(' ').map(Number);
                if (nearLeft || nearRight) {
                    const svgCoords = this.screenToSVG(svg, e.clientX, e.clientY);
                    currentGuide.setAttribute('x1', svgCoords.x);
                    currentGuide.setAttribute('y1', minY);
                    currentGuide.setAttribute('x2', svgCoords.x);
                    currentGuide.setAttribute('y2', minY + height);
                } else if (nearTop || nearBottom) {
                    const svgCoords = this.screenToSVG(svg, e.clientX, e.clientY);
                    currentGuide.setAttribute('x1', minX);
                    currentGuide.setAttribute('y1', svgCoords.y);
                    currentGuide.setAttribute('x2', minX + width);
                    currentGuide.setAttribute('y2', svgCoords.y);
                }
            }
        };
        
        const mouseUpHandler = () => {
            if (isDragging && currentGuide) {
                this.guideLines.push(currentGuide);
                this.saveState();
                this.renderSVG();
            }
            isDragging = false;
            currentGuide = null;
            startPoint = null;
        };
        
        const cancelHandler = () => {
            this.guideLineDragMode = false;
            wrapper.style.cursor = '';
            wrapper.title = '';
            if (currentGuide && !isDragging) {
                currentGuide.remove();
            }
            wrapper.removeEventListener('mousedown', mouseDownHandler);
            wrapper.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        wrapper.addEventListener('mousedown', mouseDownHandler);
        wrapper.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        
        this.guideLineCancelHandler = cancelHandler;
        this.loadTool('measurement'); // Refresh UI to show cancel button
        alert('Click and drag from canvas edge (within 20px) to create guide line. Click "Add Guide Line" again to cancel.');
    }

    clearGuideLines() {
        const svg = document.querySelector('#svgWrapper svg');
        if (svg) {
            svg.querySelectorAll('.guide-line').forEach(line => line.remove());
        }
        this.guideLines = [];
        this.renderSVG();
    }

    getPathStatistics() {
        const selected = Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p);
        if (selected.length === 0) return '';
        
        let totalPoints = 0;
        let totalLength = 0;
        const bboxes = [];
        
        selected.forEach(path => {
            const commands = this.parsePathData(path.d);
            const points = commands.reduce((sum, cmd) => sum + cmd.points.length, 0);
            totalPoints += points;
            
            try {
                const bbox = path.element.getBBox();
                bboxes.push(bbox);
                totalLength += Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);
            } catch (e) {}
        });
        
        if (bboxes.length === 0) return 'Could not calculate statistics';
        
        const minX = Math.min(...bboxes.map(b => b.x));
        const maxX = Math.max(...bboxes.map(b => b.x + b.width));
        const minY = Math.min(...bboxes.map(b => b.y));
        const maxY = Math.max(...bboxes.map(b => b.y + b.height));
        
        return `
            <div style="font-size: 0.875rem;">
                <div><strong>Paths:</strong> ${selected.length}</div>
                <div><strong>Total Points:</strong> ${totalPoints}</div>
                <div><strong>Bounding Box:</strong> ${minX.toFixed(1)}, ${minY.toFixed(1)} to ${maxX.toFixed(1)}, ${maxY.toFixed(1)}</div>
                <div><strong>Size:</strong> ${(maxX - minX).toFixed(1)} × ${(maxY - minY).toFixed(1)}px</div>
            </div>
        `;
    }

    // ==================== TOOL 8: EXPORT MANAGER ====================
    
    renderExportManager() {
        const selectedCount = this.selectedPaths.size;
        
        return `
            <div class="tool-explanation">
                <h3>Export Manager</h3>
                <p>Export your SVG in multiple formats for different use cases. Export full SVG, selected paths, token maps, or copy data to clipboard.</p>
                <p><strong>When to use:</strong> At the end of your workflow. After optimizing and finalizing your design, use this to export in the format you need.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Optimization</label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
                    <input type="checkbox" id="minifySVG" checked>
                    <span>Minify SVG (remove comments, whitespace, round decimals)</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-label">Export Options</label>
                <button class="btn btn-primary" style="width: 100%; margin-bottom: 0.75rem;" onclick="app.exportFullSVG()">
                    📥 Export Full SVG
                </button>
                <button class="btn btn-secondary" style="width: 100%; margin-bottom: 0.75rem;" onclick="app.exportSelectedPaths()" ${selectedCount === 0 ? 'disabled' : ''}>
                    📥 Export Selected Paths (${selectedCount})
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 0.75rem;" onclick="app.exportTokenMap()">
                    📥 Export Token Map (JSON)
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 0.75rem;" onclick="app.exportAsJSX()">
                    ⚛️ Copy as React Component
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 0.75rem;" onclick="app.exportAsBase64()">
                    🔗 Copy as Data URI
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 0.75rem;" onclick="app.exportAsPNG()">
                    🖼️ Export as PNG
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 0.75rem;" onclick="app.exportAsSpriteSheet()" ${this.groups.length === 0 ? 'disabled' : ''}>
                    🎯 Export as Sprite Sheet
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 0.75rem;" onclick="app.copyAsClipPath()" ${selectedCount === 0 ? 'disabled' : ''}>
                    ✂️ Copy as CSS Clip-Path
                </button>
                <button class="btn" style="width: 100%;" onclick="app.copyToClipboard()">
                    📋 Copy Path Data to Clipboard
                </button>
            </div>
        `;
    }

    exportFullSVG() {
        const minify = document.getElementById('minifySVG')?.checked || false;
        this.saveSVG(minify);
    }

    minifySVG(svgString) {
        // Basic minification: remove comments, whitespace, round decimals
        let minified = svgString
            .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/>\s+</g, '><') // Remove space between tags
            .trim();
        
        // Round decimal numbers to 2 decimal places
        minified = minified.replace(/(\d+\.\d{3,})/g, (match) => {
            return parseFloat(match).toFixed(2);
        });
        
        return minified;
    }

    exportSelectedPaths() {
        if (this.selectedPaths.size === 0) {
            alert('Please select paths first');
            return;
        }
        
        const serializer = new XMLSerializer();
        const svgNS = 'http://www.w3.org/2000/svg';
        const newSvg = document.createElementNS(svgNS, 'svg');
        newSvg.setAttribute('xmlns', svgNS);
        newSvg.setAttribute('viewBox', this.svgElement.getAttribute('viewBox') || '0 0 100 100');
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (path) {
                newSvg.appendChild(path.element.cloneNode(true));
            }
        });
        
        const svgString = serializer.serializeToString(newSvg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'selected-paths.svg';
        a.click();
        URL.revokeObjectURL(url);
    }

    exportTokenMap() {
        const tokenMap = {};
        this.paths.forEach(path => {
            tokenMap[path.id] = {
                d: path.d,
                fill: path.fill,
                stroke: path.stroke,
                strokeWidth: path.strokeWidth,
                transform: path.transform,
                attributes: path.attributes
            };
        });
        
        const json = JSON.stringify(tokenMap, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'token-map.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    copyToClipboard() {
        if (this.selectedPaths.size === 0) {
            navigator.clipboard.writeText(this.paths.map(p => p.d).join('\n'));
        } else {
            const selected = Array.from(this.selectedPaths)
                .map(id => this.paths.find(p => p.id === id))
                .filter(p => p)
                .map(p => p.d)
                .join('\n');
            navigator.clipboard.writeText(selected);
        }
        alert('Copied to clipboard!');
    }

    exportAsJSX() {
        if (!this.svgElement) return;
        
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(this.svgElement);
        
        // Convert SVG attributes to React/JSX format
        svgString = svgString
            .replace(/(\w+)-(\w+)=/g, (match, p1, p2) => {
                // Convert kebab-case to camelCase
                return p1 + p2.charAt(0).toUpperCase() + p2.slice(1) + '=';
            })
            .replace(/="([^"]*)"/g, '={"$1"}') // Convert to JSX string format
            .replace(/viewBox=/g, 'viewBox=')
            .replace(/xmlns=/g, 'xmlns=')
            .replace(/xml:space=/g, 'xmlSpace=');
        
        // Wrap in React component
        const componentName = 'SvgComponent';
        const jsx = `import React from 'react';

const ${componentName} = (props) => {
    return (
        ${svgString.replace(/<svg/, '<svg {...props}')}
    );
};

export default ${componentName};`;
        
        navigator.clipboard.writeText(jsx);
        alert('React component copied to clipboard!');
    }

    exportAsBase64() {
        if (!this.svgElement) return;
        
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(this.svgElement);
        
        // Encode to base64
        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        const dataUri = `data:image/svg+xml;base64,${base64}`;
        
        navigator.clipboard.writeText(dataUri);
        alert('Data URI copied to clipboard!\n\nUse in CSS: background-image: url(\'' + dataUri.substring(0, 50) + '...\');');
    }

    exportAsPNG() {
        if (!this.svgElement) return;
        
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(this.svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const viewBox = this.svgElement.getAttribute('viewBox');
        let width = 800, height = 600;
        if (viewBox) {
            const [, , w, h] = viewBox.split(' ').map(Number);
            width = w;
            height = h;
        }
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'export.png';
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.src = url;
    }

    exportAsSpriteSheet() {
        if (this.groups.length === 0) {
            alert('No groups found. Create groups first to export as sprite sheet.');
            return;
        }
        
        const serializer = new XMLSerializer();
        const svgNS = 'http://www.w3.org/2000/svg';
        const spriteSvg = document.createElementNS(svgNS, 'svg');
        spriteSvg.setAttribute('xmlns', svgNS);
        spriteSvg.setAttribute('style', 'display: none;');
        
        this.groups.forEach(group => {
            const symbol = document.createElementNS(svgNS, 'symbol');
            symbol.id = group.id;
            symbol.setAttribute('viewBox', this.svgElement.getAttribute('viewBox') || '0 0 100 100');
            
            group.paths.forEach(pathIndex => {
                const path = this.paths[pathIndex];
                if (path) {
                    symbol.appendChild(path.element.cloneNode(true));
                }
            });
            
            spriteSvg.appendChild(symbol);
        });
        
        const svgString = serializer.serializeToString(spriteSvg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sprite-sheet.svg';
        a.click();
        URL.revokeObjectURL(url);
        alert('Sprite sheet exported! Use with: <use href="#symbol-id" />');
    }

    copyAsClipPath() {
        if (this.selectedPaths.size === 0) {
            alert('Select at least one path');
            return;
        }
        
        const selected = Array.from(this.selectedPaths)
            .map(id => this.paths.find(p => p.id === id))
            .filter(p => p);
        
        if (selected.length === 1) {
            const pathData = selected[0].d;
            const clipPath = `clip-path: path('${pathData}');`;
            navigator.clipboard.writeText(clipPath);
            alert('CSS clip-path copied to clipboard!');
        } else {
            // Multiple paths - combine them
            const combinedPath = selected.map(p => p.d).join(' ');
            const clipPath = `clip-path: path('${combinedPath}');`;
            navigator.clipboard.writeText(clipPath);
            alert('CSS clip-path (combined) copied to clipboard!');
        }
    }

    // ==================== TOOL 9: TOKEN INJECTOR ====================
    
    renderTokenInjector() {
        return `
            <div class="tool-explanation">
                <h3>Token Injector</h3>
                <p>Apply design token data from JSON files to your SVG paths. Matches tokens to paths by ID and updates their attributes.</p>
                <p><strong>When to use:</strong> When working with design systems. Load tokens from your design system to batch-update SVG attributes. Use this after organizing your paths with Groups tool.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Load Token JSON File</label>
                <input type="file" class="form-input" id="tokenFileInput" accept=".json" onchange="app.loadTokenFile(event)">
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    JSON format: <code>{"path-id": {"d": "...", "fill": "#000", "stroke": "#fff"}}</code>
                </p>
            </div>
            <div class="form-group">
                <label class="form-label">Or Paste JSON</label>
                <textarea class="form-textarea" id="tokenJSON" rows="10" placeholder='{"path-id": {"d": "M0 0 L10 10", "fill": "#000000", "stroke": "#ffffff", "strokeWidth": "2"}}'></textarea>
                <button class="btn btn-primary" onclick="app.injectTokens()" style="margin-top: 0.75rem; width: 100%;">Inject Tokens</button>
            </div>
        `;
    }

    async loadTokenFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        document.getElementById('tokenJSON').value = text;
    }

    injectTokens() {
        const jsonText = document.getElementById('tokenJSON').value;
        if (!jsonText) {
            alert('Please provide token JSON');
            return;
        }
        
        try {
            const tokens = JSON.parse(jsonText);
            this.saveState();
            
            Object.entries(tokens).forEach(([pathId, tokenData]) => {
                const path = this.paths.find(p => p.id === pathId);
                if (!path) return;
                
                if (tokenData.d) {
                    path.element.setAttribute('d', tokenData.d);
                    path.d = tokenData.d;
                }
                if (tokenData.fill !== undefined) {
                    path.element.setAttribute('fill', tokenData.fill);
                    path.fill = tokenData.fill;
                }
                if (tokenData.stroke !== undefined) {
                    path.element.setAttribute('stroke', tokenData.stroke);
                    path.stroke = tokenData.stroke;
                }
                if (tokenData.strokeWidth !== undefined) {
                    path.element.setAttribute('stroke-width', tokenData.strokeWidth);
                    path.strokeWidth = tokenData.strokeWidth;
                }
                if (tokenData.transform !== undefined) {
                    path.element.setAttribute('transform', tokenData.transform);
                    path.transform = tokenData.transform;
                }
            });
            
            this.renderSVG();
            alert('Tokens injected successfully!');
        } catch (e) {
            alert('Invalid JSON: ' + e.message);
        }
    }

    // ==================== TOOL 10: SVG COMPARATOR ====================
    
    renderComparator() {
        return `
            <div class="tool-explanation">
                <h3>SVG Comparator</h3>
                <p>Compare two SVG files side-by-side to see differences. Useful for verifying changes, quality assurance, and before/after optimization checks.</p>
                <p><strong>When to use:</strong> After optimizing or making significant changes. Compare original vs optimized, or different versions of your design.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Load SVG to Compare</label>
                <input type="file" class="form-input" id="compareFileInput" accept=".svg" onchange="app.loadCompareSVG(event)">
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Current SVG has ${this.paths.length} paths. Load another SVG to compare.
                </p>
            </div>
            <div id="comparisonResults" style="display: none;">
                <h3 style="font-size: 0.875rem; margin-bottom: 0.5rem;">Comparison Results</h3>
                <div id="comparisonContent"></div>
            </div>
        `;
    }

    async loadCompareSVG(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const compareSvg = doc.documentElement;
        
        if (!this.svgElement) {
            alert('Please load the original SVG first');
            return;
        }
        
        const originalPaths = this.paths.length;
        const comparePaths = compareSvg.querySelectorAll('path').length;
        
        document.getElementById('comparisonResults').style.display = 'block';
        document.getElementById('comparisonContent').innerHTML = `
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius);">
                <div><strong>Original:</strong> ${originalPaths} paths</div>
                <div><strong>Compare:</strong> ${comparePaths} paths</div>
                <div style="margin-top: 0.5rem; color: ${originalPaths === comparePaths ? 'var(--secondary-color)' : 'var(--warning-color)'};">
                    ${originalPaths === comparePaths ? '✓ Same number of paths' : '⚠ Different number of paths'}
                </div>
            </div>
        `;
    }

    // ==================== TOOL: GENERATORS ====================
    
    renderGenerators() {
        return `
            <div class="tool-explanation">
                <h3>Automated Generators</h3>
                <p><strong>What it does:</strong> Generate complex paths automatically. Create QR codes, charts, and radial patterns (mandalas) with just a few inputs.</p>
                <p><strong>When to use:</strong> When you need standard shapes or patterns that would be tedious to draw manually.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Radial Repeat (Mandala Maker)</label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    Select a path, then create radial copies around a center point
                </p>
                ${this.selectedPaths.size === 1 ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <div>
                            <label class="form-label" style="font-size: 0.75rem;">Count</label>
                            <input type="number" class="form-input" id="radialCount" value="8" min="2" max="36">
                        </div>
                        <div>
                            <label class="form-label" style="font-size: 0.75rem;">Center X</label>
                            <input type="number" class="form-input" id="radialCenterX" value="100">
                        </div>
                        <div>
                            <label class="form-label" style="font-size: 0.75rem;">Center Y</label>
                            <input type="number" class="form-input" id="radialCenterY" value="100">
                        </div>
                        <div>
                            <label class="form-label" style="font-size: 0.75rem;">Radius</label>
                            <input type="number" class="form-input" id="radialRadius" value="50">
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="app.createRadialRepeat()" style="width: 100%;">
                        🌀 Create Radial Repeat
                    </button>
                ` : `
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">
                        Select exactly 1 path to create radial copies
                    </p>
                `}
            </div>
            
            <div class="form-group">
                <label class="form-label">QR Code Generator</label>
                <input type="text" class="form-input" id="qrCodeText" placeholder="Enter URL or text..." value="https://example.com" style="margin-bottom: 0.5rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Size</label>
                        <input type="number" class="form-input" id="qrSize" value="100" min="50" max="500">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Error Correction</label>
                        <select class="form-input" id="qrErrorLevel">
                            <option value="L">L (Low)</option>
                            <option value="M" selected>M (Medium)</option>
                            <option value="Q">Q (Quartile)</option>
                            <option value="H">H (High)</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="app.generateQRCode()" style="width: 100%;">
                    📱 Generate QR Code
                </button>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Note: QR code generation uses a simple pattern. For production, use a dedicated QR library.
                </p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Simple Bar Chart</label>
                <input type="text" class="form-input" id="chartData" placeholder="10, 20, 15, 30, 25" value="10, 20, 15, 30, 25" style="margin-bottom: 0.5rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Width</label>
                        <input type="number" class="form-input" id="chartWidth" value="200" min="100" max="500">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Height</label>
                        <input type="number" class="form-input" id="chartHeight" value="150" min="50" max="300">
                    </div>
                </div>
                <button class="btn btn-secondary" onclick="app.generateBarChart()" style="width: 100%;">
                    📊 Generate Bar Chart
                </button>
            </div>
        `;
    }

    createRadialRepeat() {
        if (this.selectedPaths.size !== 1) {
            alert('Select exactly 1 path to create radial copies');
            return;
        }
        
        this.saveState();
        const pathId = Array.from(this.selectedPaths)[0];
        const path = this.paths.find(p => p.id === pathId);
        if (!path) return;
        
        const count = parseInt(document.getElementById('radialCount').value) || 8;
        const centerX = parseFloat(document.getElementById('radialCenterX').value) || 100;
        const centerY = parseFloat(document.getElementById('radialCenterY').value) || 100;
        const radius = parseFloat(document.getElementById('radialRadius').value) || 50;
        
        const svgNS = 'http://www.w3.org/2000/svg';
        const angleStep = (360 / count) * (Math.PI / 180);
        
        for (let i = 1; i < count; i++) {
            const angle = angleStep * i;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            const rotation = (360 / count) * i;
            
            const cloned = path.element.cloneNode(true);
            cloned.id = `${pathId}-radial-${i}-${Date.now()}`;
            cloned.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotation} ${centerX} ${centerY})`);
            
            if (path.element.parentElement) {
                path.element.parentElement.appendChild(cloned);
            } else {
                this.svgElement.appendChild(cloned);
            }
        }
        
        this.extractPaths();
        this.renderSVG();
        alert(`Created ${count - 1} radial copies!`);
    }

    async generateQRCode() {
        const text = document.getElementById('qrCodeText').value;
        if (!text) {
            alert('Enter text or URL');
            return;
        }
        
        // Check if QRCode library is available
        if (typeof QRCode === 'undefined') {
            alert('QR Code library not loaded. Using placeholder pattern.');
            this.generateQRCodePlaceholder();
            return;
        }
        
        try {
            this.saveState();
            const size = parseInt(document.getElementById('qrSize').value) || 100;
            const errorCorrection = document.getElementById('qrErrorLevel')?.value || 'M';
            
            // Generate QR code data using the library
            const qrData = await QRCode.toDataURL(text, {
                width: size,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: errorCorrection
            });
            
            // Convert data URL to SVG paths by tracing the image
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, size, size);
                const paths = this.traceQRCodeToPaths(imageData, size);
                
                const svgNS = 'http://www.w3.org/2000/svg';
                const group = document.createElementNS(svgNS, 'g');
                group.id = `qrcode-${Date.now()}`;
                
                paths.forEach(pathData => {
                    const path = document.createElementNS(svgNS, 'path');
                    path.setAttribute('d', pathData);
                    path.setAttribute('fill', '#000000');
                    group.appendChild(path);
                });
                
                this.svgElement.appendChild(group);
                this.extractPaths();
                this.renderSVG();
                alert(`QR Code generated with ${paths.length} path(s)!`);
            };
            img.src = qrData;
            
        } catch (e) {
            console.error('QR Code generation error:', e);
            alert('Error generating QR code. Using placeholder pattern.');
            this.generateQRCodePlaceholder();
        }
    }

    generateQRCodePlaceholder() {
        const text = document.getElementById('qrCodeText').value;
        if (!text) return;
        
        this.saveState();
        const size = parseInt(document.getElementById('qrSize').value) || 100;
        const moduleSize = size / 25;
        
        let pathData = '';
        for (let y = 0; y < 25; y++) {
            for (let x = 0; x < 25; x++) {
                if ((x + y) % 3 === 0) {
                    const px = x * moduleSize;
                    const py = y * moduleSize;
                    pathData += `M ${px} ${py} L ${px + moduleSize} ${py} L ${px + moduleSize} ${py + moduleSize} L ${px} ${py + moduleSize} Z `;
                }
            }
        }
        
        const svgNS = 'http://www.w3.org/2000/svg';
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData.trim());
        path.setAttribute('fill', '#000000');
        path.id = `qrcode-${Date.now()}`;
        
        this.svgElement.appendChild(path);
        this.extractPaths();
        this.renderSVG();
        alert('QR code pattern created! (Placeholder - QR library not loaded)');
    }

    traceQRCodeToPaths(imageData, size) {
        const paths = [];
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const visited = new Set();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const isBlack = r < 128 && g < 128 && b < 128;
                
                if (isBlack && !visited.has(`${x},${y}`)) {
                    let right = x;
                    let bottom = y;
                    
                    while (right < width - 1) {
                        const nextIdx = (y * width + (right + 1)) * 4;
                        const nextR = data[nextIdx];
                        const nextG = data[nextIdx + 1];
                        const nextB = data[nextIdx + 2];
                        if (nextR < 128 && nextG < 128 && nextB < 128) {
                            right++;
                        } else {
                            break;
                        }
                    }
                    
                    let canExpandDown = true;
                    while (canExpandDown && bottom < height - 1) {
                        for (let checkX = x; checkX <= right; checkX++) {
                            const checkIdx = ((bottom + 1) * width + checkX) * 4;
                            const checkR = data[checkIdx];
                            const checkG = data[checkIdx + 1];
                            const checkB = data[checkIdx + 2];
                            if (checkR >= 128 || checkG >= 128 || checkB >= 128) {
                                canExpandDown = false;
                                break;
                            }
                        }
                        if (canExpandDown) bottom++;
                    }
                    
                    for (let py = y; py <= bottom; py++) {
                        for (let px = x; px <= right; px++) {
                            visited.add(`${px},${py}`);
                        }
                    }
                    
                    const pathData = `M ${x} ${y} L ${right + 1} ${y} L ${right + 1} ${bottom + 1} L ${x} ${bottom + 1} Z`;
                    paths.push(pathData);
                }
            }
        }
        
        return paths;
    }

    generateBarChart() {
        const dataStr = document.getElementById('chartData').value;
        if (!dataStr) {
            alert('Enter chart data (comma-separated numbers)');
            return;
        }
        
        const values = dataStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        if (values.length === 0) {
            alert('Invalid chart data');
            return;
        }
        
        this.saveState();
        const width = parseFloat(document.getElementById('chartWidth').value) || 200;
        const height = parseFloat(document.getElementById('chartHeight').value) || 150;
        const maxValue = Math.max(...values);
        const barWidth = width / values.length;
        const padding = barWidth * 0.1;
        const actualBarWidth = barWidth - (padding * 2);
        
        const svgNS = 'http://www.w3.org/2000/svg';
        const group = document.createElementNS(svgNS, 'g');
        group.id = `chart-${Date.now()}`;
        
        values.forEach((value, index) => {
            const barHeight = (value / maxValue) * height;
            const x = index * barWidth + padding;
            const y = height - barHeight;
            
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', actualBarWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', `hsl(${(index * 360) / values.length}, 70%, 50%)`);
            group.appendChild(rect);
        });
        
        this.svgElement.appendChild(group);
        this.extractPaths();
        this.renderSVG();
        alert(`Bar chart created with ${values.length} bars!`);
    }

    // ==================== TOOL 11: SELECTION SYSTEM ====================
    
    renderSelectionTool() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        // Get common values for editor
        const commonFill = selectedCount > 0 ? this.getCommonValue(selectedPaths, 'fill') : null;
        const commonStroke = selectedCount > 0 ? this.getCommonValue(selectedPaths, 'stroke') : null;
        const commonStrokeWidth = selectedCount > 0 ? this.getCommonValue(selectedPaths, 'strokeWidth') : null;
        const commonOpacity = selectedCount > 0 ? this.getCommonValue(selectedPaths, 'opacity') : null;
        
        // Check if selection came from groups/regions
        const selectionSource = this.selectionSource || null;
        
        return `
            <div class="tool-explanation">
                <h3>Selection System</h3>
                <p>Select paths or groups to work with them. When you select a group or region from the Groups tool, the editing tools automatically appear here.</p>
                <p><strong>When to use:</strong> Start here! Select paths from Groups tool, Path Inspector, or click directly in the preview. The unified editor below lets you adjust everything in one place.</p>
                ${selectionSource ? `<p style="color: var(--primary-color);"><strong>Selected from:</strong> ${selectionSource}</p>` : ''}
            </div>
            
            <div class="form-group">
                <label class="form-label">Selection Controls</label>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
                    <button class="btn" onclick="app.selectAll()">Select All (${this.paths.length})</button>
                    <button class="btn" onclick="app.deselectAll()">Deselect All</button>
                    <button class="btn" onclick="app.invertSelection()">Invert Selection</button>
                </div>
                <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); text-align: center;">
                    <strong style="font-size: 1.125rem;">${selectedCount}</strong> path(s) selected
                </div>
            </div>
            
            ${selectedCount > 0 ? `
                <div class="form-group" style="border-top: 2px solid var(--border-color); padding-top: 1.5rem; margin-top: 1.5rem;">
                    <label class="form-label" style="font-size: 1rem; font-weight: 600;">Unified Editor for Selected Paths</label>
                    
                    <!-- Colors -->
                    <div class="editor-section">
                        <h4 class="editor-section-title">Colors</h4>
                        <div style="margin-bottom: 0.75rem;">
                            <label class="form-label">Fill</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="color" class="form-input" id="selFill" value="${commonFill || '#000000'}" style="width: 50px; height: 35px;">
                                <input type="text" class="form-input" id="selFillHex" value="${commonFill || '#000000'}" placeholder="#000000" style="flex: 1;">
                                <button class="btn btn-small" onclick="app.setSelAttribute('fill', 'none')">None</button>
                            </div>
                        </div>
                        <div>
                            <label class="form-label">Stroke</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                                <input type="color" class="form-input" id="selStroke" value="${commonStroke || '#000000'}" style="width: 50px; height: 35px;">
                                <input type="text" class="form-input" id="selStrokeHex" value="${commonStroke || '#000000'}" placeholder="#000000" style="flex: 1;">
                                <button class="btn btn-small" onclick="app.setSelAttribute('stroke', 'none')">None</button>
                            </div>
                            <input type="number" class="form-input" id="selStrokeWidth" value="${commonStrokeWidth || '0'}" step="0.1" min="0" placeholder="Width">
                        </div>
                    </div>
                    
                    <!-- Transform -->
                    <div class="editor-section">
                        <h4 class="editor-section-title">Transform</h4>
                        <div class="transform-row">
                            <div class="transform-input-group">
                                <label class="form-label">X</label>
                                <input type="number" class="form-input" id="selX" value="0" step="1">
                            </div>
                            <div class="transform-input-group">
                                <label class="form-label">Y</label>
                                <input type="number" class="form-input" id="selY" value="0" step="1">
                            </div>
                        </div>
                        <div class="transform-row" style="margin-top: 0.5rem;">
                            <div class="transform-input-group">
                                <label class="form-label">Scale</label>
                                <input type="number" class="form-input" id="selScale" value="1" step="0.1" min="0.1">
                            </div>
                            <div class="transform-input-group">
                                <label class="form-label">Rotate</label>
                                <input type="number" class="form-input" id="selRotate" value="0" step="1" placeholder="°">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Opacity -->
                    <div class="editor-section">
                        <h4 class="editor-section-title">Opacity</h4>
                        <input type="range" class="form-input" id="selOpacity" value="${commonOpacity || '1'}" step="0.01" min="0" max="1" oninput="document.getElementById('selOpacityValue').textContent = Math.round(this.value * 100) + '%'">
                        <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="selOpacityValue">${Math.round((commonOpacity || 1) * 100)}%</div>
                    </div>
                    
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="app.applySelectionEditor()" style="flex: 1;">Apply All Changes</button>
                    </div>
                </div>
            ` : ''}
        `;
    }

    setSelAttribute(attr, value) {
        if (attr === 'fill') {
            document.getElementById('selFill').value = value === 'none' ? '#000000' : value;
            document.getElementById('selFillHex').value = value;
        } else if (attr === 'stroke') {
            document.getElementById('selStroke').value = value === 'none' ? '#000000' : value;
            document.getElementById('selStrokeHex').value = value;
        }
    }

    applySelectionEditor() {
        if (this.selectedPaths.size === 0) return;
        
        this.saveState();
        
        // Apply colors
        const fill = document.getElementById('selFillHex')?.value || document.getElementById('selFill')?.value;
        const stroke = document.getElementById('selStrokeHex')?.value || document.getElementById('selStroke')?.value;
        const strokeWidth = document.getElementById('selStrokeWidth')?.value;
        const opacity = document.getElementById('selOpacity')?.value;
        
        // Apply transform
        const tx = parseFloat(document.getElementById('selX')?.value) || 0;
        const ty = parseFloat(document.getElementById('selY')?.value) || 0;
        const scale = parseFloat(document.getElementById('selScale')?.value) || 1;
        const rotate = parseFloat(document.getElementById('selRotate')?.value) || 0;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            // Apply attributes
            if (fill !== undefined && fill !== null) {
                path.element.setAttribute('fill', fill);
                path.fill = fill;
            }
            if (stroke !== undefined && stroke !== null) {
                path.element.setAttribute('stroke', stroke);
                path.stroke = stroke;
            }
            if (strokeWidth !== undefined && strokeWidth !== null && strokeWidth !== '') {
                path.element.setAttribute('stroke-width', strokeWidth);
                path.strokeWidth = strokeWidth;
            }
            if (opacity !== undefined && opacity !== null) {
                path.element.setAttribute('opacity', opacity);
                path.opacity = opacity;
            }
            
            // Apply transform
            if (tx !== 0 || ty !== 0 || scale !== 1 || rotate !== 0) {
                const transforms = [];
                if (tx !== 0 || ty !== 0) transforms.push(`translate(${tx}, ${ty})`);
                if (scale !== 1) transforms.push(`scale(${scale})`);
                if (rotate !== 0) transforms.push(`rotate(${rotate})`);
                
                let currentTransform = path.transform || '';
                if (currentTransform && transforms.length > 0) {
                    currentTransform += ' ' + transforms.join(' ');
                } else if (transforms.length > 0) {
                    currentTransform = transforms.join(' ');
                }
                
                if (currentTransform) {
                    path.element.setAttribute('transform', currentTransform);
                    path.transform = currentTransform;
                }
            }
        });
        
        this.renderSVG();
        this.updateSelectionVisual();
    }

    selectAll() {
        this.paths.forEach(path => this.selectedPaths.add(path.id));
        this.updateSelectionVisual();
        this.loadTool('selection');
    }

    deselectAll() {
        this.selectedPaths.clear();
        this.updateSelectionVisual();
        this.loadTool('selection');
    }

    invertSelection() {
        const allIds = new Set(this.paths.map(p => p.id));
        this.selectedPaths.forEach(id => allIds.delete(id));
        this.selectedPaths = allIds;
        this.updateSelectionVisual();
        if (this.currentTool === 'workflow' || this.currentTool === 'selection') {
            this.loadTool(this.currentTool);
        }
    }

    selectSimilarPaths() {
        if (this.selectedPaths.size === 0) {
            alert('Select a path first to find similar paths');
            return;
        }
        
        // Get attributes from first selected path
        const firstPathId = Array.from(this.selectedPaths)[0];
        const firstPath = this.paths.find(p => p.id === firstPathId);
        if (!firstPath) return;
        
        const matchFill = firstPath.fill || 'none';
        const matchStroke = firstPath.stroke || 'none';
        
        // Find all paths with matching attributes
        const similarPaths = new Set();
        this.paths.forEach(path => {
            const fillMatch = (path.fill || 'none') === matchFill;
            const strokeMatch = (path.stroke || 'none') === matchStroke;
            
            // Match if either fill or stroke matches (or both)
            if (fillMatch || strokeMatch) {
                similarPaths.add(path.id);
            }
        });
        
        // Update selection
        this.selectedPaths = similarPaths;
        this.updateSelectionVisual();
        if (this.currentTool === 'workflow' || this.currentTool === 'selection') {
            this.loadTool(this.currentTool);
        }
    }

    togglePathSelection(pathId) {
        if (this.selectedPaths.has(pathId)) {
            this.selectedPaths.delete(pathId);
        } else {
            this.selectedPaths.add(pathId);
        }
        this.updateSelectionVisual();
        // When clicking in preview, switch to workflow tool
        this.switchTool('workflow');
    }

    deselectAll() {
        this.selectedPaths.clear();
        this.updateSelectionVisual();
        if (this.currentTool === 'workflow') {
            this.loadTool('workflow');
        }
    }

    scrollPathIntoView(pathId) {
        const svg = document.querySelector('#svgWrapper svg');
        if (!svg) return;
        const safeId = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(pathId) : pathId.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
        const target = svg.querySelector(`#${safeId}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }

    updateSelectionVisual() {
        const svgClone = document.querySelector('#svgWrapper svg');
        if (!svgClone) return;
        
        // Remove existing start/end indicators and resize handles
        this.hideStartEndIndicators();
        this.removeResizeHandles();
        
        const paths = svgClone.querySelectorAll('path');
        paths.forEach(path => {
            if (this.selectedPaths.has(path.id)) {
                // Add fade-in animation class
                path.style.transition = 'opacity 0.2s ease-in, filter 0.2s ease-in';
                path.style.opacity = '0.85';
                path.style.filter = 'drop-shadow(0 0 2px #4a90e2) drop-shadow(0 0 6px rgba(74,144,226,0.5))';
                
                // Add start/end indicators if enabled
                if (this.showStartEndIndicators) {
                    this.addStartEndIndicators(path, svgClone);
                }
            } else {
                path.style.transition = 'opacity 0.2s ease-out, filter 0.2s ease-out';
                path.style.opacity = '';
                path.style.filter = '';
            }
        });
        
        // Add resize handles for selected paths
        if (this.selectedPaths.size > 0) {
            this.addResizeHandles(svgClone);
            // Delay toolbar rendering slightly to ensure SVG is fully rendered
            // Also update toolbar position if it already exists
            setTimeout(() => {
                if (this.selectedPaths.size > 0) {
                    const existingToolbar = document.getElementById('quickActionsToolbar');
                    if (existingToolbar) {
                        // Update existing toolbar position
                        if (this.toolbarPositionUpdater) {
                            this.toolbarPositionUpdater();
                        }
                    } else {
                        // Create new toolbar
                        // Quick actions toolbar disabled - using context menu instead
                        // this.renderQuickActionsToolbar(svgClone);
                    }
                }
            }, 10);
        } else {
            this.hideQuickActionsToolbar();
        }
        
        this.scheduleMiniMap();
    }

    renderQuickActionsToolbar(svg) {
        if (this.selectedPaths.size === 0) {
            this.hideQuickActionsToolbar();
            return;
        }
        
        // Remove existing toolbar
        this.hideQuickActionsToolbar();
        
        // Calculate bounding box center for positioning
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasValidBounds = false;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            try {
                const bbox = path.element.getBBox();
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
                hasValidBounds = true;
            } catch (e) {
                // Skip paths without valid bounds
            }
        });
        
        if (!hasValidBounds) return;
        
        const centerX = (minX + maxX) / 2;
        const centerY = minY - 40; // Position above selection
        
        // Create toolbar container
        const toolbar = document.createElement('div');
        toolbar.id = 'quickActionsToolbar';
        toolbar.style.cssText = `
            position: absolute;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translateX(-50%);
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            padding: 0.5rem;
            display: flex;
            gap: 0.25rem;
            z-index: 300;
            pointer-events: all;
        `;
        
        // Create buttons
        const buttons = [
            { label: '📋', title: 'Copy (Ctrl+C)', action: () => this.copySelectedPaths() },
            { label: '📄', title: 'Duplicate (Ctrl+D)', action: () => this.duplicateSelectedPaths() },
            { label: '🗑️', title: 'Delete (Del)', action: () => { if (confirm(`Delete ${this.selectedPaths.size} path(s)?`)) this.deleteSelectedPaths(); } },
            { label: '⬅️', title: 'Align Left', action: () => this.alignSelected('left') },
            { label: '↔️', title: 'Align Center', action: () => this.alignSelected('center') },
            { label: '➡️', title: 'Align Right', action: () => this.alignSelected('right') },
            { label: '⬆️', title: 'Align Top', action: () => this.alignSelected('top') },
            { label: '↕️', title: 'Align Middle', action: () => this.alignSelected('middle') },
            { label: '⬇️', title: 'Align Bottom', action: () => this.alignSelected('bottom') }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.label;
            button.title = btn.title;
            button.style.cssText = `
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                padding: 0.375rem 0.5rem;
                cursor: pointer;
                font-size: 0.875rem;
                transition: all 0.2s;
            `;
            button.onmouseover = () => {
                button.style.background = 'var(--bg-tertiary)';
                button.style.borderColor = 'var(--primary-color)';
            };
            button.onmouseout = () => {
                button.style.background = 'var(--bg-secondary)';
                button.style.borderColor = 'var(--border-color)';
            };
            button.onclick = (e) => {
                e.stopPropagation();
                btn.action();
            };
            toolbar.appendChild(button);
        });
        
        // Position toolbar relative to wrapper using SVG coordinate system
        const wrapper = document.getElementById('svgWrapper');
        if (wrapper && svg) {
            // Helper function to update toolbar position
            const updateToolbarPosition = () => {
                if (!toolbar.parentNode) return;
                
                try {
                    const svgRect = svg.getBoundingClientRect();
                    const wrapperRect = wrapper.getBoundingClientRect();
                    const ctm = svg.getScreenCTM();
                    
                    if (!ctm) {
                        // Fallback: use simple positioning if CTM not available
                        const scale = this.currentZoom || 1;
                        let toolbarLeft = (centerX * scale) + wrapper.scrollLeft;
                        let toolbarTop = (centerY * scale) + wrapper.scrollTop - 50;
                        
                        // Get toolbar dimensions for viewport constraint
                        const toolbarRect = toolbar.getBoundingClientRect();
                        const toolbarWidth = toolbarRect.width || 200;
                        const toolbarHeight = toolbarRect.height || 40;
                        
                        // Constrain to viewport
                        const padding = 10;
                        const maxLeft = wrapperRect.width - toolbarWidth - padding;
                        const maxTop = wrapperRect.height - toolbarHeight - padding;
                        
                        toolbarLeft = Math.max(padding, Math.min(toolbarLeft, maxLeft));
                        toolbarTop = Math.max(padding, Math.min(toolbarTop, maxTop));
                        
                        toolbar.style.left = `${toolbarLeft}px`;
                        toolbar.style.top = `${toolbarTop}px`;
                        toolbar.style.transform = 'translateX(-50%)';
                        return;
                    }
                    
                    // Get the transform matrix from SVG to screen
                    const point = svg.createSVGPoint();
                    point.x = centerX;
                    point.y = centerY;
                    const screenPoint = point.matrixTransform(ctm);
                    
                    // Calculate toolbar position relative to wrapper
                    let toolbarLeft = screenPoint.x - wrapperRect.left;
                    let toolbarTop = screenPoint.y - wrapperRect.top - 50; // Offset above
                    
                    // Get toolbar dimensions
                    const toolbarRect = toolbar.getBoundingClientRect();
                    const toolbarWidth = toolbarRect.width || 200; // Fallback width
                    const toolbarHeight = toolbarRect.height || 40; // Fallback height
                    
                    // Constrain to viewport - prevent toolbar from going outside wrapper bounds
                    const padding = 10; // Padding from edges
                    const maxLeft = wrapperRect.width - toolbarWidth - padding;
                    const maxTop = wrapperRect.height - toolbarHeight - padding;
                    
                    // Clamp position to viewport bounds
                    toolbarLeft = Math.max(padding, Math.min(toolbarLeft, maxLeft));
                    toolbarTop = Math.max(padding, Math.min(toolbarTop, maxTop));
                    
                    // Position relative to wrapper
                    toolbar.style.left = `${toolbarLeft}px`;
                    toolbar.style.top = `${toolbarTop}px`;
                    toolbar.style.transform = 'translateX(-50%)'; // Center horizontally
                } catch (e) {
                    // Fallback positioning if transform fails
                    const scale = this.currentZoom || 1;
                    let toolbarLeft = (centerX * scale) + wrapper.scrollLeft;
                    let toolbarTop = (centerY * scale) + wrapper.scrollTop - 50;
                    
                    // Get toolbar dimensions for viewport constraint
                    const toolbarRect = toolbar.getBoundingClientRect();
                    const toolbarWidth = toolbarRect.width || 200;
                    const toolbarHeight = toolbarRect.height || 40;
                    
                    // Constrain to viewport
                    const padding = 10;
                    const maxLeft = wrapperRect.width - toolbarWidth - padding;
                    const maxTop = wrapperRect.height - toolbarHeight - padding;
                    
                    toolbarLeft = Math.max(padding, Math.min(toolbarLeft, maxLeft));
                    toolbarTop = Math.max(padding, Math.min(toolbarTop, maxTop));
                    
                    toolbar.style.left = `${toolbarLeft}px`;
                    toolbar.style.top = `${toolbarTop}px`;
                    toolbar.style.transform = 'translateX(-50%)';
                }
            };
            
            // Initial positioning
            updateToolbarPosition();
            wrapper.appendChild(toolbar);
            
            // Store update function for later cleanup
            this.toolbarPositionUpdater = updateToolbarPosition;
            
            // Update on scroll/zoom
            wrapper.addEventListener('scroll', updateToolbarPosition);
            
            // Also update when zoom changes (if zoom buttons are used)
            const zoomButtons = document.querySelectorAll('#zoomInBtn, #zoomOutBtn');
            zoomButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    setTimeout(updateToolbarPosition, 100);
                });
            });
        }
    }

    hideQuickActionsToolbar() {
        const toolbar = document.getElementById('quickActionsToolbar');
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.removeChild(toolbar);
        }
        
        // Clean up position updater
        if (this.toolbarPositionUpdater) {
            const wrapper = document.getElementById('svgWrapper');
            if (wrapper) {
                wrapper.removeEventListener('scroll', this.toolbarPositionUpdater);
            }
            this.toolbarPositionUpdater = null;
        }
    }

    alignSelected(alignment) {
        if (this.selectedPaths.size === 0) return;
        
        this.saveState();
        
        // Get bounding boxes of all selected paths
        const bounds = [];
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            try {
                const bbox = path.element.getBBox();
                bounds.push({ id: pathId, bbox, path });
            } catch (e) {
                // Skip paths without valid bounds
            }
        });
        
        if (bounds.length === 0) return;
        
        // Calculate reference bounds
        let refLeft = Math.min(...bounds.map(b => b.bbox.x));
        let refRight = Math.max(...bounds.map(b => b.bbox.x + b.bbox.width));
        let refTop = Math.min(...bounds.map(b => b.bbox.y));
        let refBottom = Math.max(...bounds.map(b => b.bbox.y + b.bbox.height));
        const refCenterX = (refLeft + refRight) / 2;
        const refCenterY = (refTop + refBottom) / 2;
        
        // Apply alignment
        bounds.forEach(({ id, bbox, path }) => {
            const currentTransform = path.transform || '';
            let tx = 0, ty = 0;
            
            switch (alignment) {
                case 'left':
                    tx = refLeft - bbox.x;
                    break;
                case 'center':
                    tx = refCenterX - (bbox.x + bbox.width / 2);
                    break;
                case 'right':
                    tx = refRight - (bbox.x + bbox.width);
                    break;
                case 'top':
                    ty = refTop - bbox.y;
                    break;
                case 'middle':
                    ty = refCenterY - (bbox.y + bbox.height / 2);
                    break;
                case 'bottom':
                    ty = refBottom - (bbox.y + bbox.height);
                    break;
            }
            
            // Apply grid snapping
            if (this.snapToGrid) {
                tx = Math.round(tx / this.gridSize) * this.gridSize;
                ty = Math.round(ty / this.gridSize) * this.gridSize;
            }
            
            if (tx !== 0 || ty !== 0) {
                let newTransform = '';
                if (currentTransform) {
                    const matches = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                    if (matches) {
                        const origTx = parseFloat(matches[1]) + tx;
                        const origTy = parseFloat(matches[2]) + ty;
                        newTransform = `translate(${origTx},${origTy})`;
                    } else {
                        newTransform = `translate(${tx},${ty}) ${currentTransform}`;
                    }
                } else {
                    newTransform = `translate(${tx},${ty})`;
                }
                
                path.element.setAttribute('transform', newTransform);
                path.transform = newTransform;
            }
        });
        
        this.extractPaths();
        this.renderSVG();
    }

    removeResizeHandles() {
        this.resizeHandles.forEach(handle => {
            if (handle.parentNode) {
                handle.parentNode.removeChild(handle);
            }
        });
        this.resizeHandles = [];
        
        // Remove bounding box if it exists
        const bbox = document.querySelector('#selection-bounding-box');
        if (bbox && bbox.parentNode) {
            bbox.parentNode.removeChild(bbox);
        }
    }

    addResizeHandles(svg) {
        // Only show resize handles when Resize tool is active
        if (this.currentTool !== 'resize') return;
        if (this.selectedPaths.size === 0) return;
        
        // Calculate combined bounding box for all selected paths
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasValidBounds = false;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            try {
                const bbox = path.element.getBBox();
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
                hasValidBounds = true;
            } catch (e) {
                // Skip paths without valid bounds
            }
        });
        
        if (!hasValidBounds) return;
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Add padding for handles
        const padding = 5;
        const boxX = minX - padding;
        const boxY = minY - padding;
        const boxWidth = width + padding * 2;
        const boxHeight = height + padding * 2;
        
        const svgNS = 'http://www.w3.org/2000/svg';
        
        // Create bounding box rectangle
        const bboxRect = document.createElementNS(svgNS, 'rect');
        bboxRect.id = 'selection-bounding-box';
        bboxRect.setAttribute('x', boxX);
        bboxRect.setAttribute('y', boxY);
        bboxRect.setAttribute('width', boxWidth);
        bboxRect.setAttribute('height', boxHeight);
        bboxRect.setAttribute('fill', 'none');
        bboxRect.setAttribute('stroke', '#4a90e2');
        bboxRect.setAttribute('stroke-width', '2');
        bboxRect.setAttribute('stroke-dasharray', '5,5');
        bboxRect.style.pointerEvents = 'none';
        svg.appendChild(bboxRect);
        
        // Create resize handles (corners and edges)
        const handleSize = 8;
        const handlePositions = [
            { type: 'nw', x: boxX, y: boxY },
            { type: 'ne', x: boxX + boxWidth, y: boxY },
            { type: 'sw', x: boxX, y: boxY + boxHeight },
            { type: 'se', x: boxX + boxWidth, y: boxY + boxHeight },
            { type: 'n', x: boxX + boxWidth / 2, y: boxY },
            { type: 's', x: boxX + boxWidth / 2, y: boxY + boxHeight },
            { type: 'w', x: boxX, y: boxY + boxHeight / 2 },
            { type: 'e', x: boxX + boxWidth, y: boxY + boxHeight / 2 }
        ];
        
        handlePositions.forEach(pos => {
            const handle = document.createElementNS(svgNS, 'rect');
            handle.setAttribute('x', pos.x - handleSize / 2);
            handle.setAttribute('y', pos.y - handleSize / 2);
            handle.setAttribute('width', handleSize);
            handle.setAttribute('height', handleSize);
            handle.setAttribute('fill', '#4a90e2');
            handle.setAttribute('stroke', '#ffffff');
            handle.setAttribute('stroke-width', '1');
            handle.dataset.handleType = pos.type;
            handle.style.cursor = this.getResizeCursor(pos.type);
            handle.style.pointerEvents = 'all';
            
            // Make handle draggable
            this.makeResizeHandleDraggable(handle, svg, boxX, boxY, boxWidth, boxHeight);
            
            svg.appendChild(handle);
            this.resizeHandles.push(handle);
        });
    }

    getResizeCursor(type) {
        const cursors = {
            'nw': 'nw-resize',
            'ne': 'ne-resize',
            'sw': 'sw-resize',
            'se': 'se-resize',
            'n': 'n-resize',
            's': 's-resize',
            'e': 'e-resize',
            'w': 'w-resize'
        };
        return cursors[type] || 'default';
    }

    makeResizeHandleDraggable(handle, svg, startX, startY, startWidth, startHeight) {
        // Only allow resize when Resize tool is active
        if (this.currentTool !== 'resize') return;
        let isDragging = false;
        
        handle.addEventListener('mousedown', (e) => {
            // Only allow resize when Resize tool is active
            if (this.currentTool !== 'resize') return;
            
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = true;
            this.isResizing = true;
            this.resizeHandleType = handle.dataset.handleType;
            this.resizeStartPoint = this.screenToSVG(svg, e.clientX, e.clientY);
            this.resizeStartBounds = { x: startX, y: startY, width: startWidth, height: startHeight };
            this.maintainAspectRatio = e.shiftKey; // Track Shift key for aspect ratio
            
            document.body.style.userSelect = 'none';
            
            const mouseMoveHandler = (moveE) => {
                if (!isDragging) return;
                
                const currentPoint = this.screenToSVG(svg, moveE.clientX, moveE.clientY);
                let deltaX = currentPoint.x - this.resizeStartPoint.x;
                let deltaY = currentPoint.y - this.resizeStartPoint.y;
                
                // Apply grid snapping if enabled
                if (this.snapToGrid) {
                    deltaX = Math.round(deltaX / this.gridSize) * this.gridSize;
                    deltaY = Math.round(deltaY / this.gridSize) * this.gridSize;
                }
                
                // Calculate new bounds based on handle type
                let newX = startX, newY = startY, newWidth = startWidth, newHeight = startHeight;
                
                switch (this.resizeHandleType) {
                    case 'nw':
                        newX = startX + deltaX;
                        newY = startY + deltaY;
                        newWidth = startWidth - deltaX;
                        newHeight = startHeight - deltaY;
                        break;
                    case 'ne':
                        newY = startY + deltaY;
                        newWidth = startWidth + deltaX;
                        newHeight = startHeight - deltaY;
                        break;
                    case 'sw':
                        newX = startX + deltaX;
                        newWidth = startWidth - deltaX;
                        newHeight = startHeight + deltaY;
                        break;
                    case 'se':
                        if (this.maintainAspectRatio) {
                            // Maintain aspect ratio - use the larger delta
                            const scale = Math.max(Math.abs(deltaX) / startWidth, Math.abs(deltaY) / startHeight);
                            newWidth = startWidth + (deltaX >= 0 ? 1 : -1) * startWidth * scale;
                            newHeight = startHeight + (deltaY >= 0 ? 1 : -1) * startHeight * scale;
                        } else {
                            newWidth = startWidth + deltaX;
                            newHeight = startHeight + deltaY;
                        }
                        break;
                    case 'nw':
                        if (this.maintainAspectRatio) {
                            const scale = Math.max(Math.abs(deltaX) / startWidth, Math.abs(deltaY) / startHeight);
                            newX = startX + (deltaX <= 0 ? -1 : 1) * startWidth * scale;
                            newY = startY + (deltaY <= 0 ? -1 : 1) * startHeight * scale;
                            newWidth = startWidth - (deltaX <= 0 ? -1 : 1) * startWidth * scale;
                            newHeight = startHeight - (deltaY <= 0 ? -1 : 1) * startHeight * scale;
                        } else {
                            newX = startX + deltaX;
                            newY = startY + deltaY;
                            newWidth = startWidth - deltaX;
                            newHeight = startHeight - deltaY;
                        }
                        break;
                    case 'ne':
                        if (this.maintainAspectRatio) {
                            const scale = Math.max(Math.abs(deltaX) / startWidth, Math.abs(deltaY) / startHeight);
                            newY = startY + (deltaY <= 0 ? -1 : 1) * startHeight * scale;
                            newWidth = startWidth + (deltaX >= 0 ? 1 : -1) * startWidth * scale;
                            newHeight = startHeight - (deltaY <= 0 ? -1 : 1) * startHeight * scale;
                        } else {
                            newY = startY + deltaY;
                            newWidth = startWidth + deltaX;
                            newHeight = startHeight - deltaY;
                        }
                        break;
                    case 'sw':
                        if (this.maintainAspectRatio) {
                            const scale = Math.max(Math.abs(deltaX) / startWidth, Math.abs(deltaY) / startHeight);
                            newX = startX + (deltaX <= 0 ? -1 : 1) * startWidth * scale;
                            newWidth = startWidth - (deltaX <= 0 ? -1 : 1) * startWidth * scale;
                            newHeight = startHeight + (deltaY >= 0 ? 1 : -1) * startHeight * scale;
                        } else {
                            newX = startX + deltaX;
                            newWidth = startWidth - deltaX;
                            newHeight = startHeight + deltaY;
                        }
                        break;
                    case 'n':
                        newY = startY + deltaY;
                        newHeight = startHeight - deltaY;
                        break;
                    case 's':
                        newHeight = startHeight + deltaY;
                        break;
                    case 'w':
                        newX = startX + deltaX;
                        newWidth = startWidth - deltaX;
                        break;
                    case 'e':
                        newWidth = startWidth + deltaX;
                        break;
                }
                
                // Update visual preview (bounding box)
                const bbox = document.querySelector('#selection-bounding-box');
                if (bbox) {
                    bbox.setAttribute('x', newX);
                    bbox.setAttribute('y', newY);
                    bbox.setAttribute('width', newWidth);
                    bbox.setAttribute('height', newHeight);
                }
                
                // Update handle positions
                this.updateResizeHandlePositions(newX, newY, newWidth, newHeight);
                
                // Update position indicator (show center of bounding box)
                const centerX = newX + newWidth / 2;
                const centerY = newY + newHeight / 2;
                this.updatePositionIndicator(centerX, centerY);
            };
            
            const mouseUpHandler = (upE) => {
                if (!isDragging) return;
                
                isDragging = false;
                this.isResizing = false;
                document.body.style.userSelect = '';
                
                // Calculate final bounds
                const currentPoint = this.screenToSVG(svg, upE.clientX, upE.clientY);
                let deltaX = currentPoint.x - this.resizeStartPoint.x;
                let deltaY = currentPoint.y - this.resizeStartPoint.y;
                
                if (this.snapToGrid) {
                    deltaX = Math.round(deltaX / this.gridSize) * this.gridSize;
                    deltaY = Math.round(deltaY / this.gridSize) * this.gridSize;
                }
                
                // Apply resize to actual paths
                this.applyResizeToPaths(deltaX, deltaY);
                
                // Hide position indicator
                this.hidePositionIndicator();
                
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    updateResizeHandlePositions(x, y, width, height) {
        const handleSize = 8;
        const positions = [
            { type: 'nw', x: x, y: y },
            { type: 'ne', x: x + width, y: y },
            { type: 'sw', x: x, y: y + height },
            { type: 'se', x: x + width, y: y + height },
            { type: 'n', x: x + width / 2, y: y },
            { type: 's', x: x + width / 2, y: y + height },
            { type: 'w', x: x, y: y + height / 2 },
            { type: 'e', x: x + width, y: y + height / 2 }
        ];
        
        positions.forEach((pos, index) => {
            if (this.resizeHandles[index]) {
                this.resizeHandles[index].setAttribute('x', pos.x - handleSize / 2);
                this.resizeHandles[index].setAttribute('y', pos.y - handleSize / 2);
            }
        });
    }

    applyResizeToPaths(deltaX, deltaY) {
        if (this.selectedPaths.size === 0 || !this.resizeHandleType) return;
        
        this.saveState();
        
        // Calculate scale factors based on handle type and original bounds
        const originalBounds = this.resizeStartBounds;
        let scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0;
        
        switch (this.resizeHandleType) {
            case 'nw':
                scaleX = (originalBounds.width - deltaX) / originalBounds.width;
                scaleY = (originalBounds.height - deltaY) / originalBounds.height;
                offsetX = deltaX;
                offsetY = deltaY;
                break;
            case 'ne':
                scaleX = (originalBounds.width + deltaX) / originalBounds.width;
                scaleY = (originalBounds.height - deltaY) / originalBounds.height;
                offsetY = deltaY;
                break;
            case 'sw':
                scaleX = (originalBounds.width - deltaX) / originalBounds.width;
                scaleY = (originalBounds.height + deltaY) / originalBounds.height;
                offsetX = deltaX;
                break;
            case 'se':
                scaleX = (originalBounds.width + deltaX) / originalBounds.width;
                scaleY = (originalBounds.height + deltaY) / originalBounds.height;
                break;
            case 'n':
                scaleY = (originalBounds.height - deltaY) / originalBounds.height;
                offsetY = deltaY;
                break;
            case 's':
                scaleY = (originalBounds.height + deltaY) / originalBounds.height;
                break;
            case 'w':
                scaleX = (originalBounds.width - deltaX) / originalBounds.width;
                offsetX = deltaX;
                break;
            case 'e':
                scaleX = (originalBounds.width + deltaX) / originalBounds.width;
                break;
        }
        
        // Apply transform to each selected path
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            try {
                const bbox = path.element.getBBox();
                const centerX = bbox.x + bbox.width / 2;
                const centerY = bbox.y + bbox.height / 2;
                
                // Calculate new transform
                const currentTransform = path.transform || '';
                let newTransform = '';
                
                // Apply scale and translate
                if (scaleX !== 1 || scaleY !== 1) {
                    newTransform += `translate(${centerX},${centerY}) scale(${scaleX},${scaleY}) translate(${-centerX},${-centerY})`;
                }
                
                if (offsetX !== 0 || offsetY !== 0) {
                    newTransform += ` translate(${offsetX},${offsetY})`;
                }
                
                if (currentTransform) {
                    newTransform = currentTransform + ' ' + newTransform;
                }
                
                path.element.setAttribute('transform', newTransform.trim());
                path.transform = newTransform.trim();
            } catch (e) {
                // Skip paths that can't be resized
            }
        });
        
        this.extractPaths();
        this.renderSVG();
    }

    addStartEndIndicators(pathElement, svg) {
        const pathData = pathElement.getAttribute('d') || '';
        if (!pathData) return;
        
        // Parse to find first and last points
        const commands = this.parsePathData(pathData);
        if (commands.length === 0) return;
        
        // Find first point (from first Move command)
        let firstPoint = null;
        for (const cmd of commands) {
            if (cmd.points.length > 0) {
                const movePoint = cmd.points.find(p => p.type === 'move');
                if (movePoint) {
                    firstPoint = movePoint;
                    break;
                }
            }
        }
        
        // Find last point (last non-close point)
        let lastPoint = null;
        for (let i = commands.length - 1; i >= 0; i--) {
            const cmd = commands[i];
            if (cmd.points.length > 0) {
                const nonClosePoint = cmd.points.find(p => p.type !== 'close' && p.type !== 'control');
                if (nonClosePoint) {
                    lastPoint = nonClosePoint;
                    break;
                }
            }
        }
        
        const svgNS = 'http://www.w3.org/2000/svg';
        
        // Add green dot at start
        if (firstPoint) {
            const startDot = document.createElementNS(svgNS, 'circle');
            startDot.setAttribute('cx', firstPoint.x);
            startDot.setAttribute('cy', firstPoint.y);
            startDot.setAttribute('r', '8');
            startDot.setAttribute('fill', '#00ff00');
            startDot.setAttribute('stroke', '#ffffff');
            startDot.setAttribute('stroke-width', '2');
            startDot.classList.add('start-indicator');
            startDot.dataset.pathId = pathElement.id;
            svg.appendChild(startDot);
            this.startEndIndicators.push(startDot);
        }
        
        // Add red dot at end
        if (lastPoint && (firstPoint === null || firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y)) {
            const endDot = document.createElementNS(svgNS, 'circle');
            endDot.setAttribute('cx', lastPoint.x);
            endDot.setAttribute('cy', lastPoint.y);
            endDot.setAttribute('r', '8');
            endDot.setAttribute('fill', '#ff0000');
            endDot.setAttribute('stroke', '#ffffff');
            endDot.setAttribute('stroke-width', '2');
            endDot.classList.add('end-indicator');
            endDot.dataset.pathId = pathElement.id;
            svg.appendChild(endDot);
            this.startEndIndicators.push(endDot);
        }
    }

    hideStartEndIndicators() {
        this.startEndIndicators.forEach(indicator => indicator.remove());
        this.startEndIndicators = [];
    }

    moveSelectedBackward() {
        if (this.selectedPaths.size === 0) return;
        this.saveState();
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path || !path.element) return;
            
            const parent = path.element.parentElement;
            const prevSibling = path.element.previousElementSibling;
            if (prevSibling && parent) {
                parent.insertBefore(path.element, prevSibling);
            }
        });
        
        this.extractPaths();
        this.renderSVG();
    }

    moveSelectedForward() {
        if (this.selectedPaths.size === 0) return;
        this.saveState();
        
        const selectedArray = Array.from(this.selectedPaths);
        // Process in reverse to maintain order
        for (let i = selectedArray.length - 1; i >= 0; i--) {
            const pathId = selectedArray[i];
            const path = this.paths.find(p => p.id === pathId);
            if (!path || !path.element) continue;
            
            const parent = path.element.parentElement;
            const nextSibling = path.element.nextElementSibling;
            if (nextSibling && parent) {
                parent.insertBefore(nextSibling, path.element);
            } else if (parent) {
                // Move to end
                parent.appendChild(path.element);
            }
        }
        
        this.extractPaths();
        this.renderSVG();
    }

    // ==================== TOOL 12: ATTRIBUTE EDITOR ====================
    
    renderAttributesTool() {
        const selectedCount = this.selectedPaths.size;
        const selectedPaths = selectedCount > 0 ? Array.from(this.selectedPaths).map(id => this.paths.find(p => p.id === id)).filter(p => p) : [];
        
        if (selectedCount === 0) {
            return `
                <div class="tool-explanation">
                    <h3>Attribute Editor</h3>
                    <p>Edit all attributes (ID, fill, stroke, opacity, and more) for selected paths. All selected paths will be updated together.</p>
                    <p><strong>When to use:</strong> After selecting paths, use this to modify their properties and attributes.</p>
                </div>
                <div class="form-group">
                    <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); text-align: center;">
                        <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">No paths selected</p>
                        <button class="btn btn-primary" onclick="app.switchTool('workflow')">Go to Workflow Manager</button>
                    </div>
                </div>
            `;
        }
        
        // Show which paths are being edited
        const pathNames = selectedPaths.slice(0, 5).map(p => p.id).join(', ');
        const moreCount = selectedCount > 5 ? ` and ${selectedCount - 5} more` : '';
        
        // Get common values from selected paths
        const commonFill = this.getCommonValue(selectedPaths, 'fill');
        const commonStroke = this.getCommonValue(selectedPaths, 'stroke');
        const commonStrokeWidth = this.getCommonValue(selectedPaths, 'strokeWidth');
        const commonOpacity = this.getCommonValue(selectedPaths, 'opacity');
        const commonId = selectedCount === 1 ? selectedPaths[0].id : null;
        
        return `
            <div class="tool-explanation">
                <h3>Attribute Editor</h3>
                <p>Edit all attributes (ID, fill, stroke, opacity, and more) for selected paths. All selected paths will be updated together.</p>
                <p><strong>When to use:</strong> After selecting paths, use this to modify their properties and attributes.</p>
            </div>
            
            <div class="form-group" style="padding: 1rem; background: rgba(74, 144, 226, 0.1); border-radius: var(--border-radius); border: 2px solid var(--primary-color); margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div>
                        <strong style="font-size: 1rem;">Editing:</strong>
                        <span style="font-size: 1.25rem; color: var(--primary-color); margin-left: 0.5rem;">${selectedCount}</span> path(s)
                    </div>
                    <button class="btn btn-small" onclick="app.switchTool('workflow')">Change Selection</button>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); max-height: 60px; overflow-y: auto;">
                    <strong>Paths:</strong> ${pathNames}${moreCount}
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Edit Attributes</label>
                
                ${selectedCount === 1 ? `
                    <div class="attribute-section">
                        <h4 class="attribute-section-title">Path ID</h4>
                        <input type="text" class="form-input" id="attrId" value="${commonId}" placeholder="path-id">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            Change the path identifier
                        </p>
                    </div>
                ` : ''}
                
                <div class="attribute-section">
                    <h4 class="attribute-section-title">Fill</h4>
                    <div style="margin-bottom: 0.75rem;">
                        <label class="form-label" style="font-size: 0.75rem;">Fill Type</label>
                        <select class="form-input" id="fillType" onchange="app.toggleFillType()">
                            <option value="solid">Solid Color</option>
                            <option value="gradient">Gradient</option>
                        </select>
                    </div>
                    <div id="solidFillSection">
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="color" class="form-input" id="attrFill" value="${commonFill || '#000000'}" style="width: 60px; height: 40px;">
                            <input type="text" class="form-input" id="attrFillHex" value="${commonFill || '#000000'}" placeholder="#000000" style="flex: 1;">
                            <button class="btn btn-small" onclick="app.setAttributeValue('fill', 'none')">None</button>
                        </div>
                    </div>
                    <div id="gradientFillSection" style="display: none;">
                        <div style="margin-bottom: 0.5rem;">
                            <label class="form-label" style="font-size: 0.75rem;">Gradient Type</label>
                            <select class="form-input" id="gradientType" onchange="app.updateGradientTypeOptions(); app.updateGradientPreview();">
                                <option value="linear">Linear</option>
                                <option value="radial">Radial</option>
                            </select>
                        </div>
                        <div id="linearGradientOptions" style="margin-bottom: 0.75rem;">
                            <label class="form-label" style="font-size: 0.75rem;">Angle (degrees)</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="range" class="form-input" id="gradientAngle" min="0" max="360" value="0" step="1" oninput="app.updateGradientPreview()" style="flex: 1;">
                                <input type="number" class="form-input" id="gradientAngleValue" value="0" min="0" max="360" step="1" onchange="app.updateGradientPreview()" style="width: 80px;">
                            </div>
                        </div>
                        <div id="radialGradientOptions" style="margin-bottom: 0.75rem; display: none;">
                            <label class="form-label" style="font-size: 0.75rem;">Center Position</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                                <div>
                                    <label class="form-label" style="font-size: 0.7rem;">X (%)</label>
                                    <input type="number" class="form-input" id="radialCX" value="50" min="0" max="100" step="1" onchange="app.updateGradientPreview()">
                                </div>
                                <div>
                                    <label class="form-label" style="font-size: 0.7rem;">Y (%)</label>
                                    <input type="number" class="form-input" id="radialCY" value="50" min="0" max="100" step="1" onchange="app.updateGradientPreview()">
                                </div>
                            </div>
                        </div>
                        <div style="margin-bottom: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <label class="form-label" style="font-size: 0.75rem;">Gradient Stops</label>
                                <button class="btn btn-small" onclick="app.addGradientStop()" style="font-size: 0.75rem;">+ Add Stop</button>
                            </div>
                            <div id="gradientStopsContainer" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 0.5rem;">
                                <!-- Gradient stops will be added here -->
                            </div>
                        </div>
                        <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: var(--border-radius);">
                            <label class="form-label" style="font-size: 0.75rem;">Preview</label>
                            <div id="gradientPreview" style="width: 100%; height: 60px; border: 1px solid var(--border-color); border-radius: var(--border-radius); background: linear-gradient(to right, #000000, #ffffff);"></div>
                        </div>
                        <button class="btn btn-small" onclick="app.applyGradient()" style="width: 100%;">Apply Gradient</button>
                    </div>
                </div>
                
                <div class="attribute-section">
                    <h4 class="attribute-section-title">Stroke</h4>
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                        <input type="color" class="form-input" id="attrStroke" value="${commonStroke || '#000000'}" style="width: 60px; height: 40px;">
                        <input type="text" class="form-input" id="attrStrokeHex" value="${commonStroke || '#000000'}" placeholder="#000000" style="flex: 1;">
                        <button class="btn btn-small" onclick="app.setAttributeValue('stroke', 'none')">None</button>
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <label class="form-label">Stroke Width</label>
                        <input type="number" class="form-input" id="attrStrokeWidth" value="${commonStrokeWidth || '0'}" step="0.1" min="0">
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <label class="form-label" style="font-size: 0.75rem;">Line Cap</label>
                        <select class="form-input" id="strokeLinecap">
                            <option value="butt">Butt</option>
                            <option value="round">Round</option>
                            <option value="square">Square</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <label class="form-label" style="font-size: 0.75rem;">Line Join</label>
                        <select class="form-input" id="strokeLinejoin">
                            <option value="miter">Miter</option>
                            <option value="round">Round</option>
                            <option value="bevel">Bevel</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Dash Array (e.g., "5,5" for dashed)</label>
                        <input type="text" class="form-input" id="strokeDasharray" placeholder="5,5" value="${selectedPaths[0]?.attributes?.['stroke-dasharray'] || ''}">
                    </div>
                </div>
                
                <div class="attribute-section">
                    <h4 class="attribute-section-title">Opacity</h4>
                    <input type="range" class="form-input" id="attrOpacity" value="${commonOpacity || '1'}" step="0.01" min="0" max="1" oninput="document.getElementById('attrOpacityValue').textContent = Math.round(this.value * 100) + '%'">
                    <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="attrOpacityValue">${Math.round((commonOpacity || 1) * 100)}%</div>
                </div>
                
                <div class="attribute-section">
                    <h4 class="attribute-section-title">Other Attributes</h4>
                    <div style="margin-bottom: 0.5rem;">
                        <label class="form-label">Transform</label>
                        <input type="text" class="form-input" id="attrTransform" value="${selectedPaths[0]?.transform || ''}" placeholder="translate(0,0) scale(1) rotate(0)">
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <label class="form-label">Class</label>
                        <input type="text" class="form-input" id="attrClass" value="${selectedPaths[0]?.attributes?.class || ''}" placeholder="css-class-name">
                    </div>
                    <div>
                        <label class="form-label">Data Region</label>
                        <input type="text" class="form-input" id="attrDataRegion" value="${selectedPaths[0]?.dataRegion || ''}" placeholder="region-name">
                    </div>
                </div>
                
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="app.saveAttributes()" style="width: 100%;">Apply to Selected Paths</button>
                </div>
            </div>
        `;
    }

    getCommonValue(paths, attribute) {
        if (paths.length === 0) return null;
        const values = paths.map(p => p[attribute]).filter(v => v !== undefined && v !== null);
        if (values.length === 0) return null;
        const first = values[0];
        return values.every(v => v === first) ? first : null;
    }

    setAttributeValue(attr, value) {
        if (attr === 'fill') {
            document.getElementById('attrFill').value = value === 'none' ? '#000000' : value;
            document.getElementById('attrFillHex').value = value;
        } else if (attr === 'stroke') {
            document.getElementById('attrStroke').value = value === 'none' ? '#000000' : value;
            document.getElementById('attrStrokeHex').value = value;
        }
    }

    toggleFillType() {
        const fillType = document.getElementById('fillType').value;
        const solidSection = document.getElementById('solidFillSection');
        const gradientSection = document.getElementById('gradientFillSection');
        
        if (fillType === 'gradient') {
            solidSection.style.display = 'none';
            gradientSection.style.display = 'block';
            // Initialize gradient stops if empty
            this.initializeGradientStops();
            // Update gradient type options
            this.updateGradientTypeOptions();
            // Initialize preview
            setTimeout(() => this.updateGradientPreview(), 100);
        } else {
            solidSection.style.display = 'block';
            gradientSection.style.display = 'none';
        }
    }

    initializeGradientStops() {
        const container = document.getElementById('gradientStopsContainer');
        if (!container) return;
        
        // Check if stops already exist
        if (container.children.length > 0) return;
        
        // Initialize with 2 default stops
        this.addGradientStop(0, '#000000');
        this.addGradientStop(100, '#ffffff');
    }

    addGradientStop(offset = null, color = null) {
        const container = document.getElementById('gradientStopsContainer');
        if (!container) return;
        
        // Generate default offset if not provided
        if (offset === null) {
            const existingStops = Array.from(container.children);
            if (existingStops.length === 0) {
                offset = 0;
            } else {
                // Find the maximum offset
                const maxOffset = Math.max(...existingStops.map(stop => {
                    const offsetInput = stop.querySelector('.gradient-stop-offset');
                    return offsetInput ? parseFloat(offsetInput.value) : 0;
                }));
                offset = Math.min(maxOffset + 25, 100);
            }
        }
        
        if (color === null) {
            // Generate a random color or use a default
            const colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            color = colors[container.children.length % colors.length];
        }
        
        const stopId = `gradient-stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const stopDiv = document.createElement('div');
        stopDiv.className = 'gradient-stop-item';
        stopDiv.dataset.stopId = stopId;
        stopDiv.style.cssText = 'display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: var(--border-radius);';
        
        stopDiv.innerHTML = `
            <input type="number" class="form-input gradient-stop-offset" value="${offset}" min="0" max="100" step="0.1" style="width: 70px; font-size: 0.75rem;" onchange="app.updateGradientPreview()">
            <span style="font-size: 0.7rem; color: var(--text-secondary);">%</span>
            <input type="color" class="form-input gradient-stop-color" value="${color}" style="width: 60px; height: 35px;" onchange="app.updateGradientPreview()">
            <input type="text" class="form-input gradient-stop-color-hex" value="${color}" placeholder="#000000" style="flex: 1; font-size: 0.75rem;" onchange="this.previousElementSibling.value = this.value; app.updateGradientPreview()">
            <button class="btn btn-small" onclick="app.removeGradientStop('${stopId}')" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">×</button>
        `;
        
        // Sync color inputs
        const colorInput = stopDiv.querySelector('.gradient-stop-color');
        const hexInput = stopDiv.querySelector('.gradient-stop-color-hex');
        colorInput.addEventListener('change', () => {
            hexInput.value = colorInput.value;
            this.updateGradientPreview();
        });
        hexInput.addEventListener('input', () => {
            if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) {
                colorInput.value = hexInput.value;
                this.updateGradientPreview();
            }
        });
        
        container.appendChild(stopDiv);
        
        // Sort stops by offset
        this.sortGradientStops();
        this.updateGradientPreview();
    }

    removeGradientStop(stopId) {
        const container = document.getElementById('gradientStopsContainer');
        if (!container) return;
        
        const stopItem = container.querySelector(`[data-stop-id="${stopId}"]`);
        if (stopItem) {
            stopItem.remove();
            
            // Ensure at least 2 stops remain
            if (container.children.length < 2) {
                this.initializeGradientStops();
            }
            
            this.updateGradientPreview();
        }
    }

    sortGradientStops() {
        const container = document.getElementById('gradientStopsContainer');
        if (!container) return;
        
        const stops = Array.from(container.children);
        stops.sort((a, b) => {
            const offsetA = parseFloat(a.querySelector('.gradient-stop-offset').value) || 0;
            const offsetB = parseFloat(b.querySelector('.gradient-stop-offset').value) || 0;
            return offsetA - offsetB;
        });
        
        // Re-append in sorted order
        stops.forEach(stop => container.appendChild(stop));
    }

    updateGradientTypeOptions() {
        const gradientType = document.getElementById('gradientType')?.value || 'linear';
        const linearOptions = document.getElementById('linearGradientOptions');
        const radialOptions = document.getElementById('radialGradientOptions');
        
        if (linearOptions && radialOptions) {
            if (gradientType === 'linear') {
                linearOptions.style.display = 'block';
                radialOptions.style.display = 'none';
            } else {
                linearOptions.style.display = 'none';
                radialOptions.style.display = 'block';
            }
        }
    }

    updateGradientPreview() {
        const gradientType = document.getElementById('gradientType')?.value || 'linear';
        const preview = document.getElementById('gradientPreview');
        
        if (!preview) return;
        
        // Get all gradient stops
        const container = document.getElementById('gradientStopsContainer');
        if (!container || container.children.length === 0) {
            // Default gradient if no stops
            preview.style.background = 'linear-gradient(to right, #000000, #ffffff)';
            return;
        }
        
        const stops = Array.from(container.children).map(stopItem => {
            const offset = parseFloat(stopItem.querySelector('.gradient-stop-offset').value) || 0;
            const color = stopItem.querySelector('.gradient-stop-color').value || '#000000';
            return { offset: Math.max(0, Math.min(100, offset)), color };
        }).sort((a, b) => a.offset - b.offset);
        
        // Build gradient string
        let gradientCSS = '';
        if (gradientType === 'linear') {
            const angle = parseFloat(document.getElementById('gradientAngle')?.value || 0);
            const angleRad = (angle * Math.PI) / 180;
            const stopsStr = stops.map(s => `${s.color} ${s.offset}%`).join(', ');
            gradientCSS = `linear-gradient(${angle}deg, ${stopsStr})`;
        } else {
            const cx = parseFloat(document.getElementById('radialCX')?.value || 50);
            const cy = parseFloat(document.getElementById('radialCY')?.value || 50);
            const stopsStr = stops.map(s => `${s.color} ${s.offset}%`).join(', ');
            gradientCSS = `radial-gradient(circle at ${cx}% ${cy}%, ${stopsStr})`;
        }
        
        preview.style.background = gradientCSS;
    }

    applyGradient() {
        if (this.selectedPaths.size === 0) {
            alert('Select paths first');
            return;
        }
        
        // Get gradient stops
        const container = document.getElementById('gradientStopsContainer');
        if (!container || container.children.length < 2) {
            alert('Add at least 2 gradient stops');
            return;
        }
        
        this.saveState();
        const gradientType = document.getElementById('gradientType').value;
        
        // Get all gradient stops
        const stops = Array.from(container.children).map(stopItem => {
            const offset = parseFloat(stopItem.querySelector('.gradient-stop-offset').value) || 0;
            const color = stopItem.querySelector('.gradient-stop-color').value || '#000000';
            return { offset: Math.max(0, Math.min(100, offset)), color };
        }).sort((a, b) => a.offset - b.offset);
        
        // Create gradient definition
        const svgNS = 'http://www.w3.org/2000/svg';
        let defs = this.svgElement.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS(svgNS, 'defs');
            this.svgElement.insertBefore(defs, this.svgElement.firstChild);
        }
        
        const gradientId = `gradient-${Date.now()}`;
        const gradient = document.createElementNS(svgNS, gradientType === 'linear' ? 'linearGradient' : 'radialGradient');
        gradient.id = gradientId;
        
        if (gradientType === 'linear') {
            const angle = parseFloat(document.getElementById('gradientAngle')?.value || 0);
            // Convert angle to x1, y1, x2, y2 coordinates
            const angleRad = (angle * Math.PI) / 180;
            const centerX = 0.5;
            const centerY = 0.5;
            const length = 0.5;
            
            const x1 = centerX - length * Math.cos(angleRad - Math.PI / 2);
            const y1 = centerY - length * Math.sin(angleRad - Math.PI / 2);
            const x2 = centerX + length * Math.cos(angleRad - Math.PI / 2);
            const y2 = centerY + length * Math.sin(angleRad - Math.PI / 2);
            
            gradient.setAttribute('x1', (x1 * 100) + '%');
            gradient.setAttribute('y1', (y1 * 100) + '%');
            gradient.setAttribute('x2', (x2 * 100) + '%');
            gradient.setAttribute('y2', (y2 * 100) + '%');
        } else {
            const cx = parseFloat(document.getElementById('radialCX')?.value || 50);
            const cy = parseFloat(document.getElementById('radialCY')?.value || 50);
            gradient.setAttribute('cx', cx + '%');
            gradient.setAttribute('cy', cy + '%');
            gradient.setAttribute('r', '50%');
        }
        
        // Create stops
        stops.forEach(stop => {
            const stopEl = document.createElementNS(svgNS, 'stop');
            stopEl.setAttribute('offset', stop.offset + '%');
            stopEl.setAttribute('stop-color', stop.color);
            gradient.appendChild(stopEl);
        });
        
        defs.appendChild(gradient);
        
        // Apply to selected paths
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (path) {
                path.element.setAttribute('fill', `url(#${gradientId})`);
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        alert('Gradient applied!');
    }

    saveAttributes() {
        if (this.selectedPaths.size === 0) return;
        
        this.saveState();
        const fill = document.getElementById('attrFillHex')?.value || document.getElementById('attrFill')?.value;
        const stroke = document.getElementById('attrStrokeHex')?.value || document.getElementById('attrStroke')?.value;
        const strokeWidth = document.getElementById('attrStrokeWidth')?.value;
        const opacity = document.getElementById('attrOpacity')?.value;
        const newId = document.getElementById('attrId')?.value;
        const transform = document.getElementById('attrTransform')?.value;
        const className = document.getElementById('attrClass')?.value;
        const dataRegion = document.getElementById('attrDataRegion')?.value;
        const strokeLinecap = document.getElementById('strokeLinecap')?.value;
        const strokeLinejoin = document.getElementById('strokeLinejoin')?.value;
        const strokeDasharray = document.getElementById('strokeDasharray')?.value;
        
        this.selectedPaths.forEach(pathId => {
            const path = this.paths.find(p => p.id === pathId);
            if (!path) return;
            
            // Update ID if single selection
            if (newId && this.selectedPaths.size === 1 && newId !== pathId) {
                path.element.id = newId;
                path.id = newId;
            }
            
            if (fill !== undefined && fill !== null) {
                path.element.setAttribute('fill', fill);
                path.fill = fill;
            }
            if (stroke !== undefined && stroke !== null) {
                path.element.setAttribute('stroke', stroke);
                path.stroke = stroke;
            }
            if (strokeWidth !== undefined && strokeWidth !== null && strokeWidth !== '') {
                path.element.setAttribute('stroke-width', strokeWidth);
                path.strokeWidth = strokeWidth;
            }
            if (opacity !== undefined && opacity !== null) {
                path.element.setAttribute('opacity', opacity);
                path.opacity = opacity;
            }
            if (strokeLinecap) {
                path.element.setAttribute('stroke-linecap', strokeLinecap);
            }
            if (strokeLinejoin) {
                path.element.setAttribute('stroke-linejoin', strokeLinejoin);
            }
            if (strokeDasharray) {
                path.element.setAttribute('stroke-dasharray', strokeDasharray);
            } else if (strokeDasharray === '') {
                path.element.removeAttribute('stroke-dasharray');
            }
            if (transform !== undefined && transform !== null) {
                path.element.setAttribute('transform', transform);
                path.transform = transform;
            }
            if (className !== undefined && className !== null) {
                if (className) {
                    path.element.setAttribute('class', className);
                } else {
                    path.element.removeAttribute('class');
                }
            }
            if (dataRegion !== undefined && dataRegion !== null) {
                if (dataRegion) {
                    path.element.setAttribute('data-region', dataRegion);
                    path.dataRegion = dataRegion;
                } else {
                    path.element.removeAttribute('data-region');
                    path.dataRegion = '';
                }
            }
        });
        
        this.extractPaths();
        this.renderSVG();
        this.updateSelectionVisual();
        if (this.currentTool === 'attributes') {
            this.loadTool('attributes');
        }
    }

    // ==================== TOOL 13: TEMPLATE SYSTEM ====================
    
    renderTemplates() {
        // Built-in example templates
        const builtInTemplates = [
            { id: 'example1', name: 'Example: Body with Limbs', path: 'errl-body-with-limbs.svg' },
            { id: 'example2', name: 'Example: Body Face Eyes Mouth', path: 'errl-body-face-eyes-mouth-with-limbs copy.svg' }
        ];
        
        const allTemplates = [...builtInTemplates, ...this.templates];
        
        return `
            <div class="tool-explanation">
                <h3>Template System</h3>
                <p>Quick-start with pre-built SVG templates or save your current SVG as a template. Templates help you understand SVG structure and jump into editing quickly.</p>
                <p><strong>When to use:</strong> At the beginning of your workflow. Use templates to learn SVG structure or as starting points for new designs.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Load Template</label>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    Choose a template to start with, or load your own SVG file.
                </p>
                
                ${allTemplates.length > 0 ? `
                    <div class="template-list" style="margin-bottom: 1rem; max-height: 300px; overflow-y: auto;">
                        ${allTemplates.map((template, index) => `
                            <div class="template-item" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--border-radius); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.25rem;">${template.name}</div>
                                    ${template.path ? `<div style="font-size: 0.75rem; color: var(--text-secondary);">${template.path}</div>` : ''}
                                </div>
                                <div style="display: flex; gap: 0.25rem;">
                                    ${template.path ? `
                                        <button class="btn btn-small" onclick="app.loadTemplate('${template.path}')">Load</button>
                                    ` : `
                                        <button class="btn btn-small" onclick="app.loadSavedTemplate('${template.id}')">Load</button>
                                        <button class="btn btn-small" onclick="app.deleteTemplate('${template.id}')" style="background: var(--danger-color);">Delete</button>
                                    `}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <label class="form-label">Save Current SVG as Template</label>
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <input type="text" class="form-input" id="templateNameInput" placeholder="Template name (e.g., 'My Icon')" style="flex: 1;">
                        <button class="btn btn-primary" onclick="app.saveCurrentAsTemplate()" ${!this.svgElement ? 'disabled' : ''}>
                            Save Template
                        </button>
                    </div>
                    ${!this.svgElement ? `
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">
                            Load an SVG first to save it as a template.
                        </p>
                    ` : ''}
                </div>
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <button class="btn" style="width: 100%;" onclick="document.getElementById('fileInput').click()">
                        📁 Or Load Your Own SVG File
                    </button>
                </div>
            </div>
        `;
    }

    loadTemplate(path) {
        fetch(path)
            .then(response => {
                if (!response.ok) throw new Error('File not found');
                return response.text();
            })
            .then(text => {
                this.parseSVG(text);
                alert('Template loaded successfully!');
            })
            .catch(err => {
                console.error('Error loading template:', err);
                alert(`Could not load template "${path}". The file may not exist in the workspace.`);
            });
    }

    loadSavedTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template || !template.svgData) {
            alert('Template not found or corrupted');
            return;
        }
        
        this.parseSVG(template.svgData);
        alert(`Template "${template.name}" loaded successfully!`);
    }

    saveCurrentAsTemplate() {
        if (!this.svgElement) {
            alert('No SVG loaded. Load an SVG file first.');
            return;
        }
        
        const nameInput = document.getElementById('templateNameInput');
        const name = nameInput ? nameInput.value.trim() : '';
        
        if (!name) {
            alert('Enter a template name');
            if (nameInput) nameInput.focus();
            return;
        }
        
        // Check if name already exists
        if (this.templates.find(t => t.name === name)) {
            if (!confirm(`Template "${name}" already exists. Overwrite it?`)) return;
            this.templates = this.templates.filter(t => t.name !== name);
        }
        
        const serializer = new XMLSerializer();
        const svgData = serializer.serializeToString(this.svgElement);
        
        const template = {
            id: `template-${Date.now()}`,
            name: name,
            svgData: svgData,
            createdAt: Date.now()
        };
        
        this.templates.push(template);
        this.saveTemplatesToStorage();
        
        if (nameInput) nameInput.value = '';
        this.loadTool('templates');
        alert(`Template "${name}" saved successfully!`);
    }

    deleteTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;
        
        if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
        
        this.templates = this.templates.filter(t => t.id !== templateId);
        this.saveTemplatesToStorage();
        this.loadTool('templates');
    }

    loadTemplatesFromStorage() {
        try {
            const stored = localStorage.getItem('svgTemplates');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading templates from storage:', e);
            return [];
        }
    }

    saveTemplatesToStorage() {
        try {
            localStorage.setItem('svgTemplates', JSON.stringify(this.templates));
        } catch (e) {
            console.error('Error saving templates to storage:', e);
            alert('Could not save template. Storage may be full.');
        }
    }

    // ==================== TOOL 14: HISTORY SYSTEM ====================
    
    saveState() {
        if (!this.svgElement) return;
        
        const serializer = new XMLSerializer();
        const state = {
            svgData: serializer.serializeToString(this.svgElement),
            timestamp: Date.now()
        };

        const last = this.history[this.historyIndex];
        if (last && last.svgData === state.svgData) {
            return;
        }
        
        // Remove any states after current index (for redo)
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateHistoryUI();
    }

    undo() {
        if (this.historyIndex <= 0) return;
        
        this.historyIndex--;
        this.restoreState(this.history[this.historyIndex]);
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) return;
        
        this.historyIndex++;
        this.restoreState(this.history[this.historyIndex]);
    }

    restoreState(state) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(state.svgData, 'image/svg+xml');
        this.svgElement = doc.documentElement;
        this.svgData = state.svgData;
        this.extractPaths();
        this.extractGroups();
        this.renderSVG();
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
        document.getElementById('historyInfo').textContent = 
            `History: ${this.historyIndex + 1} / ${this.history.length}`;
        this.renderHistoryList();
    }

    renderHistoryList() {
        const list = document.getElementById('historyList');
        if (!list) return;
        list.innerHTML = '';
        const start = Math.max(0, this.history.length - 12);
        this.history.slice(start).forEach((state, idx) => {
            const actualIndex = start + idx;
            const chip = document.createElement('button');
            chip.className = `history-chip ${actualIndex === this.historyIndex ? 'active' : ''}`;
            chip.textContent = actualIndex === 0 ? 'Import' : `#${actualIndex + 1}`;
            chip.title = new Date(state.timestamp).toLocaleTimeString();
            chip.addEventListener('click', () => this.jumpToHistory(actualIndex));
            list.appendChild(chip);
        });
    }

    jumpToHistory(index) {
        if (index < 0 || index >= this.history.length) return;
        this.historyIndex = index;
        this.restoreState(this.history[index]);
    }

    // ==================== TOOL 15: PREVIEW SYSTEM ====================
    
    renderShapeLibrary() {
        const modeActive = this.shapeCreationMode !== null;
        const modeInfo = modeActive ? `
            <div style="padding: 0.75rem; background: rgba(74, 144, 226, 0.2); border: 2px solid var(--primary-color); border-radius: var(--border-radius); margin-bottom: 1rem;">
                <p style="color: var(--primary-color); font-weight: 600; margin-bottom: 0.5rem;">
                    ✨ Placement Mode Active: ${this.shapeCreationMode}
                </p>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    Click on the canvas to place the shape, then drag to size it. Press ESC or click "Cancel" to cancel.
                </p>
                <button class="btn btn-small" onclick="app.cancelShapeCreation()" style="width: 100%;">Cancel Placement</button>
            </div>
        ` : '';
        
        return `
            <div class="tool-explanation">
                <h3>Primitive Shape Library</h3>
                <p><strong>What it does:</strong> Quickly add pre-made shapes (stars, polygons, arrows, speech bubbles) to your SVG. Perfect for creating icons, logos, and graphics without drawing from scratch.</p>
                <p><strong>When to use:</strong> At the start of your design or when you need standard shapes. Modify them with Node Editor or Transform tools after adding.</p>
                <p><strong>How to use:</strong> Click a shape button, then click on the canvas to place it. Drag to size before placing.</p>
            </div>
            
            ${modeInfo}
            
            <div class="form-group">
                <label class="form-label">Stars</label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
                    <button class="btn" onclick="app.startShapePlacement('star', 5)" ${modeActive ? 'disabled' : ''}>5-Point Star</button>
                    <button class="btn" onclick="app.startShapePlacement('star', 6)" ${modeActive ? 'disabled' : ''}>6-Point Star</button>
                    <button class="btn" onclick="app.startShapePlacement('star', 8)" ${modeActive ? 'disabled' : ''}>8-Point Star</button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Polygons</label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
                    <button class="btn" onclick="app.startShapePlacement('polygon', 3)" ${modeActive ? 'disabled' : ''}>Triangle</button>
                    <button class="btn" onclick="app.startShapePlacement('polygon', 4)" ${modeActive ? 'disabled' : ''}>Square</button>
                    <button class="btn" onclick="app.startShapePlacement('polygon', 5)" ${modeActive ? 'disabled' : ''}>Pentagon</button>
                    <button class="btn" onclick="app.startShapePlacement('polygon', 6)" ${modeActive ? 'disabled' : ''}>Hexagon</button>
                    <button class="btn" onclick="app.startShapePlacement('polygon', 8)" ${modeActive ? 'disabled' : ''}>Octagon</button>
                    <button class="btn" onclick="app.startShapePlacement('polygon', 12)" ${modeActive ? 'disabled' : ''}>Dodecagon</button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Arrows</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
                    <button class="btn" onclick="app.startShapePlacement('arrow', 'right')" ${modeActive ? 'disabled' : ''}>Right Arrow</button>
                    <button class="btn" onclick="app.startShapePlacement('arrow', 'left')" ${modeActive ? 'disabled' : ''}>Left Arrow</button>
                    <button class="btn" onclick="app.startShapePlacement('arrow', 'up')" ${modeActive ? 'disabled' : ''}>Up Arrow</button>
                    <button class="btn" onclick="app.startShapePlacement('arrow', 'down')" ${modeActive ? 'disabled' : ''}>Down Arrow</button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Other Shapes</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                    <button class="btn" onclick="app.startShapePlacement('speechBubble')" ${modeActive ? 'disabled' : ''}>Speech Bubble</button>
                    <button class="btn" onclick="app.startShapePlacement('heart')" ${modeActive ? 'disabled' : ''}>Heart</button>
                    <button class="btn" onclick="app.startShapePlacement('circle')" ${modeActive ? 'disabled' : ''}>Circle</button>
                    <button class="btn" onclick="app.startShapePlacement('ellipse')" ${modeActive ? 'disabled' : ''}>Ellipse</button>
                </div>
            </div>
            
            <div class="form-group" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <label class="form-label">Custom Shape</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Sides</label>
                        <input type="number" class="form-input" id="customSides" value="5" min="3" max="20" ${modeActive ? 'disabled' : ''}>
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem;">Radius</label>
                        <input type="number" class="form-input" id="customRadius" value="50" min="10" max="200" ${modeActive ? 'disabled' : ''}>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="app.startCustomPolygonPlacement()" style="width: 100%;" ${modeActive ? 'disabled' : ''}>Add Custom Polygon</button>
            </div>
        `;
    }

    addStar(points, outerRadius, innerRadius = null) {
        if (!innerRadius) innerRadius = outerRadius * 0.5;
        this.saveState();
        
        const centerX = 100;
        const centerY = 100;
        let pathData = `M ${centerX} ${centerY - outerRadius}`;
        
        for (let i = 1; i <= points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            pathData += ` L ${x} ${y}`;
        }
        pathData += ' Z';
        
        this.createPathFromData(pathData, `star-${points}-${Date.now()}`);
    }

    addPolygon(sides, radius) {
        this.saveState();
        const centerX = 100;
        const centerY = 100;
        let pathData = '';
        
        for (let i = 0; i <= sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            pathData += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        }
        pathData += ' Z';
        
        const names = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 8: 'octagon', 12: 'dodecagon' };
        this.createPathFromData(pathData, `${names[sides] || 'polygon'}-${Date.now()}`);
    }

    addArrow(direction, width, height) {
        this.saveState();
        const centerX = 100;
        const centerY = 100;
        let pathData = '';
        
        const w = width / 2;
        const h = height / 2;
        const arrowHead = w * 0.3;
        
        switch (direction) {
            case 'right':
                pathData = `M ${centerX - w} ${centerY - h/3} L ${centerX - w} ${centerY + h/3} L ${centerX - w + arrowHead} ${centerY + h/3} L ${centerX - w + arrowHead} ${centerY + h} L ${centerX + w} ${centerY} L ${centerX - w + arrowHead} ${centerY - h} L ${centerX - w + arrowHead} ${centerY - h/3} Z`;
                break;
            case 'left':
                pathData = `M ${centerX + w} ${centerY - h/3} L ${centerX + w} ${centerY + h/3} L ${centerX + w - arrowHead} ${centerY + h/3} L ${centerX + w - arrowHead} ${centerY + h} L ${centerX - w} ${centerY} L ${centerX + w - arrowHead} ${centerY - h} L ${centerX + w - arrowHead} ${centerY - h/3} Z`;
                break;
            case 'up':
                pathData = `M ${centerX - h/3} ${centerY + h} L ${centerX + h/3} ${centerY + h} L ${centerX + h/3} ${centerY + h - arrowHead} L ${centerX + w} ${centerY + h - arrowHead} L ${centerX} ${centerY - h} L ${centerX - w} ${centerY + h - arrowHead} L ${centerX - h/3} ${centerY + h - arrowHead} Z`;
                break;
            case 'down':
                pathData = `M ${centerX - h/3} ${centerY - h} L ${centerX + h/3} ${centerY - h} L ${centerX + h/3} ${centerY - h + arrowHead} L ${centerX + w} ${centerY - h + arrowHead} L ${centerX} ${centerY + h} L ${centerX - w} ${centerY - h + arrowHead} L ${centerX - h/3} ${centerY - h + arrowHead} Z`;
                break;
        }
        
        this.createPathFromData(pathData, `arrow-${direction}-${Date.now()}`);
    }

    addSpeechBubble() {
        this.saveState();
        const centerX = 100;
        const centerY = 100;
        const width = 80;
        const height = 60;
        const radius = 10;
        const tailX = centerX - 20;
        const tailY = centerY + height / 2;
        
        const pathData = `M ${centerX - width/2 + radius} ${centerY - height/2} 
            L ${centerX + width/2 - radius} ${centerY - height/2} 
            Q ${centerX + width/2} ${centerY - height/2} ${centerX + width/2} ${centerY - height/2 + radius}
            L ${centerX + width/2} ${centerY + height/2 - radius}
            Q ${centerX + width/2} ${centerY + height/2} ${centerX + width/2 - radius} ${centerY + height/2}
            L ${tailX + 10} ${centerY + height/2}
            L ${tailX} ${tailY + 10}
            L ${tailX - 10} ${centerY + height/2}
            L ${centerX - width/2 + radius} ${centerY + height/2}
            Q ${centerX - width/2} ${centerY + height/2} ${centerX - width/2} ${centerY + height/2 - radius}
            L ${centerX - width/2} ${centerY - height/2 + radius}
            Q ${centerX - width/2} ${centerY - height/2} ${centerX - width/2 + radius} ${centerY - height/2} Z`;
        
        this.createPathFromData(pathData.replace(/\s+/g, ' ').trim(), `speech-bubble-${Date.now()}`);
    }

    addHeart() {
        this.saveState();
        const centerX = 100;
        const centerY = 100;
        const size = 50;
        
        const pathData = `M ${centerX} ${centerY + size * 0.3}
            C ${centerX} ${centerY + size * 0.3} ${centerX - size * 0.5} ${centerY - size * 0.2} ${centerX - size * 0.5} ${centerY - size * 0.5}
            C ${centerX - size * 0.5} ${centerY - size * 0.8} ${centerX} ${centerY - size * 0.8} ${centerX} ${centerY - size * 0.5}
            C ${centerX} ${centerY - size * 0.8} ${centerX + size * 0.5} ${centerY - size * 0.8} ${centerX + size * 0.5} ${centerY - size * 0.5}
            C ${centerX + size * 0.5} ${centerY - size * 0.2} ${centerX} ${centerY + size * 0.3} ${centerX} ${centerY + size * 0.3} Z`;
        
        this.createPathFromData(pathData, `heart-${Date.now()}`);
    }

    addCircle(radius) {
        this.saveState();
        const centerX = 100;
        const centerY = 100;
        const pathData = `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY + radius} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY - radius} Z`;
        this.createPathFromData(pathData, `circle-${Date.now()}`);
    }

    addEllipse(rx, ry) {
        this.saveState();
        const centerX = 100;
        const centerY = 100;
        const pathData = `M ${centerX} ${centerY - ry} A ${rx} ${ry} 0 0 1 ${centerX} ${centerY + ry} A ${rx} ${ry} 0 0 1 ${centerX} ${centerY - ry} Z`;
        this.createPathFromData(pathData, `ellipse-${Date.now()}`);
    }

    addCustomPolygon() {
        const sides = parseInt(document.getElementById('customSides').value) || 5;
        const radius = parseFloat(document.getElementById('customRadius').value) || 50;
        this.addPolygon(sides, radius);
    }

    startShapePlacement(type, param = null) {
        this.shapeCreationMode = { type, param };
        this.shapeCreationStart = null;
        this.shapeCreationPreview = null;
        
        // Update UI
        this.loadTool('shapes');
        
        // Enable canvas click mode
        this.setupShapePlacement();
        
        // Show instructions
        alert(`Click on the canvas to place the ${type}, then drag to size it. Press ESC to cancel.`);
    }

    startCustomPolygonPlacement() {
        const sides = parseInt(document.getElementById('customSides').value) || 5;
        this.startShapePlacement('polygon', sides);
    }

    cancelShapeCreation() {
        this.shapeCreationMode = null;
        this.shapeCreationStart = null;
        if (this.shapeCreationPreview) {
            this.shapeCreationPreview.remove();
            this.shapeCreationPreview = null;
        }
        const wrapper = document.getElementById('svgWrapper');
        if (wrapper) {
            wrapper.style.cursor = '';
            wrapper.title = '';
        }
        this.loadTool('shapes');
    }

    setupShapePlacement() {
        const wrapper = document.getElementById('svgWrapper');
        if (!wrapper || !this.svgElement) return;
        
        const svg = wrapper.querySelector('svg');
        if (!svg) return;
        
        wrapper.style.cursor = 'crosshair';
        wrapper.title = 'Click to place shape, then drag to size. Press ESC to cancel.';
        
        // Add click handler for shape placement
        const clickHandler = (e) => {
            if (!this.shapeCreationMode) return;
            
            // Don't interfere with path selection
            if (e.target.tagName === 'path' && !this.shapeCreationMode) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const point = this.screenToSVG(svg, e.clientX, e.clientY);
            
            if (!this.shapeCreationStart) {
                // First click - start placement
                this.shapeCreationStart = point;
                this.createShapePreview(point, point);
                
                // Add drag handler
                const dragHandler = (moveE) => {
                    const currentPoint = this.screenToSVG(svg, moveE.clientX, moveE.clientY);
                    this.updateShapePreview(this.shapeCreationStart, currentPoint);
                };
                
                const upHandler = (upE) => {
                    const endPoint = this.screenToSVG(svg, upE.clientX, upE.clientY);
                    this.finishShapeCreation(this.shapeCreationStart, endPoint);
                    
                    document.removeEventListener('mousemove', dragHandler);
                    document.removeEventListener('mouseup', upHandler);
                };
                
                document.addEventListener('mousemove', dragHandler);
                document.addEventListener('mouseup', upHandler);
            }
        };
        
        // Remove existing handler if any
        if (this.shapePlacementClickHandler) {
            wrapper.removeEventListener('click', this.shapePlacementClickHandler);
        }
        
        this.shapePlacementClickHandler = clickHandler;
        wrapper.addEventListener('click', clickHandler);
        
        // Add ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape' && this.shapeCreationMode) {
                this.cancelShapeCreation();
                document.removeEventListener('keydown', escHandler);
            }
        };
        
        if (this.shapePlacementEscHandler) {
            document.removeEventListener('keydown', this.shapePlacementEscHandler);
        }
        
        this.shapePlacementEscHandler = escHandler;
        document.addEventListener('keydown', escHandler);
    }

    createShapePreview(startPoint, endPoint) {
        if (!this.shapeCreationMode || !this.svgElement) return;
        
        const wrapper = document.getElementById('svgWrapper');
        const svg = wrapper.querySelector('svg');
        if (!svg) return;
        
        // Remove existing preview
        if (this.shapeCreationPreview) {
            this.shapeCreationPreview.remove();
        }
        
        const width = Math.abs(endPoint.x - startPoint.x);
        const height = Math.abs(endPoint.y - startPoint.y);
        const centerX = (startPoint.x + endPoint.x) / 2;
        const centerY = (startPoint.y + endPoint.y) / 2;
        const size = Math.max(width, height, 20); // Minimum size
        
        const svgNS = 'http://www.w3.org/2000/svg';
        const preview = document.createElementNS(svgNS, 'path');
        preview.style.fill = 'rgba(74, 144, 226, 0.3)';
        preview.style.stroke = '#4a90e2';
        preview.style.strokeWidth = '2';
        preview.style.strokeDasharray = '5,5';
        preview.style.pointerEvents = 'none';
        preview.id = 'shape-preview';
        
        const pathData = this.generateShapePath(this.shapeCreationMode.type, this.shapeCreationMode.param, centerX, centerY, size, width, height);
        preview.setAttribute('d', pathData);
        
        svg.appendChild(preview);
        this.shapeCreationPreview = preview;
    }

    updateShapePreview(startPoint, endPoint) {
        if (!this.shapeCreationStart) return;
        this.createShapePreview(this.shapeCreationStart, endPoint);
    }

    finishShapeCreation(startPoint, endPoint) {
        if (!this.shapeCreationMode || !this.svgElement) return;
        
        const width = Math.abs(endPoint.x - startPoint.x);
        const height = Math.abs(endPoint.y - startPoint.y);
        const centerX = (startPoint.x + endPoint.x) / 2;
        const centerY = (startPoint.y + endPoint.y) / 2;
        const size = Math.max(width, height, 10); // Minimum size
        
        this.saveState();
        
        const pathData = this.generateShapePath(this.shapeCreationMode.type, this.shapeCreationMode.param, centerX, centerY, size, width, height);
        const id = this.generateShapeId(this.shapeCreationMode.type, this.shapeCreationMode.param);
        
        // Remove preview
        if (this.shapeCreationPreview) {
            this.shapeCreationPreview.remove();
            this.shapeCreationPreview = null;
        }
        
        // Create actual path
        this.createPathFromData(pathData, id);
        
        // Reset mode
        this.shapeCreationMode = null;
        this.shapeCreationStart = null;
        
        // Clean up
        const wrapper = document.getElementById('svgWrapper');
        if (wrapper) {
            wrapper.style.cursor = '';
            wrapper.title = '';
            if (this.shapePlacementClickHandler) {
                wrapper.removeEventListener('click', this.shapePlacementClickHandler);
                this.shapePlacementClickHandler = null;
            }
        }
        
        if (this.shapePlacementEscHandler) {
            document.removeEventListener('keydown', this.shapePlacementEscHandler);
            this.shapePlacementEscHandler = null;
        }
        
        this.loadTool('shapes');
    }

    generateShapePath(type, param, centerX, centerY, size, width = null, height = null) {
        const radius = size / 2;
        
        switch (type) {
            case 'star':
                const points = param || 5;
                const innerRadius = radius * 0.5;
                let pathData = `M ${centerX} ${centerY - radius}`;
                for (let i = 1; i <= points * 2; i++) {
                    const angle = (i * Math.PI) / points - Math.PI / 2;
                    const r = i % 2 === 0 ? radius : innerRadius;
                    const x = centerX + r * Math.cos(angle);
                    const y = centerY + r * Math.sin(angle);
                    pathData += ` L ${x} ${y}`;
                }
                return pathData + ' Z';
                
            case 'polygon':
                const sides = param || 4;
                let polyPath = '';
                for (let i = 0; i <= sides; i++) {
                    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    polyPath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
                }
                return polyPath + ' Z';
                
            case 'circle':
                return `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY + radius} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY - radius} Z`;
                
            case 'ellipse':
                const rx = (width && width > 0) ? width / 2 : radius;
                const ry = (height && height > 0) ? height / 2 : radius;
                return `M ${centerX} ${centerY - ry} A ${rx} ${ry} 0 0 1 ${centerX} ${centerY + ry} A ${rx} ${ry} 0 0 1 ${centerX} ${centerY - ry} Z`;
                
            case 'arrow':
                const direction = param || 'right';
                const w = size * 0.6;
                const h = size * 0.4;
                const w2 = w / 2;
                const h2 = h / 2;
                const arrowHead = w * 0.3;
                
                switch (direction) {
                    case 'right':
                        return `M ${centerX - w2} ${centerY - h2/2} L ${centerX - w2} ${centerY + h2/2} L ${centerX - w2 + arrowHead} ${centerY + h2/2} L ${centerX - w2 + arrowHead} ${centerY + h2} L ${centerX + w2} ${centerY} L ${centerX - w2 + arrowHead} ${centerY - h2} L ${centerX - w2 + arrowHead} ${centerY - h2/2} Z`;
                    case 'left':
                        return `M ${centerX + w2} ${centerY - h2/2} L ${centerX + w2} ${centerY + h2/2} L ${centerX + w2 - arrowHead} ${centerY + h2/2} L ${centerX + w2 - arrowHead} ${centerY + h2} L ${centerX - w2} ${centerY} L ${centerX + w2 - arrowHead} ${centerY - h2} L ${centerX + w2 - arrowHead} ${centerY - h2/2} Z`;
                    case 'up':
                        return `M ${centerX - h2/2} ${centerY + h2} L ${centerX + h2/2} ${centerY + h2} L ${centerX + h2/2} ${centerY + h2 - arrowHead} L ${centerX + w2} ${centerY + h2 - arrowHead} L ${centerX} ${centerY - h2} L ${centerX - w2} ${centerY + h2 - arrowHead} L ${centerX - h2/2} ${centerY + h2 - arrowHead} Z`;
                    case 'down':
                        return `M ${centerX - h2/2} ${centerY - h2} L ${centerX + h2/2} ${centerY - h2} L ${centerX + h2/2} ${centerY - h2 + arrowHead} L ${centerX + w2} ${centerY - h2 + arrowHead} L ${centerX} ${centerY + h2} L ${centerX - w2} ${centerY - h2 + arrowHead} L ${centerX - h2/2} ${centerY - h2 + arrowHead} Z`;
                }
                break;
                
            case 'heart':
                const heartSize = size * 0.5;
                return `M ${centerX} ${centerY + heartSize * 0.3}
                    C ${centerX} ${centerY + heartSize * 0.3} ${centerX - heartSize * 0.5} ${centerY - heartSize * 0.2} ${centerX - heartSize * 0.5} ${centerY - heartSize * 0.5}
                    C ${centerX - heartSize * 0.5} ${centerY - heartSize * 0.8} ${centerX} ${centerY - heartSize * 0.8} ${centerX} ${centerY - heartSize * 0.5}
                    C ${centerX} ${centerY - heartSize * 0.8} ${centerX + heartSize * 0.5} ${centerY - heartSize * 0.8} ${centerX + heartSize * 0.5} ${centerY - heartSize * 0.5}
                    C ${centerX + heartSize * 0.5} ${centerY - heartSize * 0.2} ${centerX} ${centerY + heartSize * 0.3} ${centerX} ${centerY + heartSize * 0.3} Z`;
                    
            case 'speechBubble':
                const bubbleWidth = size * 0.8;
                const bubbleHeight = size * 0.6;
                const bubbleRadius = Math.min(10, size * 0.1);
                const tailX = centerX - 20;
                const tailY = centerY + bubbleHeight / 2;
                return `M ${centerX - bubbleWidth/2 + bubbleRadius} ${centerY - bubbleHeight/2} 
                    L ${centerX + bubbleWidth/2 - bubbleRadius} ${centerY - bubbleHeight/2} 
                    Q ${centerX + bubbleWidth/2} ${centerY - bubbleHeight/2} ${centerX + bubbleWidth/2} ${centerY - bubbleHeight/2 + bubbleRadius}
                    L ${centerX + bubbleWidth/2} ${centerY + bubbleHeight/2 - bubbleRadius}
                    Q ${centerX + bubbleWidth/2} ${centerY + bubbleHeight/2} ${centerX + bubbleWidth/2 - bubbleRadius} ${centerY + bubbleHeight/2}
                    L ${tailX + 10} ${centerY + bubbleHeight/2}
                    L ${tailX} ${tailY + 10}
                    L ${tailX - 10} ${centerY + bubbleHeight/2}
                    L ${centerX - bubbleWidth/2 + bubbleRadius} ${centerY + bubbleHeight/2}
                    Q ${centerX - bubbleWidth/2} ${centerY + bubbleHeight/2} ${centerX - bubbleWidth/2} ${centerY + bubbleHeight/2 - bubbleRadius}
                    L ${centerX - bubbleWidth/2} ${centerY - bubbleHeight/2 + bubbleRadius}
                    Q ${centerX - bubbleWidth/2} ${centerY - bubbleHeight/2} ${centerX - bubbleWidth/2 + bubbleRadius} ${centerY - bubbleHeight/2} Z`;
        }
        
        return '';
    }

    generateShapeId(type, param) {
        const timestamp = Date.now();
        switch (type) {
            case 'star':
                return `star-${param}-${timestamp}`;
            case 'polygon':
                const names = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 8: 'octagon', 12: 'dodecagon' };
                return `${names[param] || 'polygon'}-${timestamp}`;
            case 'arrow':
                return `arrow-${param}-${timestamp}`;
            default:
                return `${type}-${timestamp}`;
        }
    }

    createPathFromData(pathData, id) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', '#000000');
        path.setAttribute('stroke', 'none');
        path.id = id;
        
        this.svgElement.appendChild(path);
        this.extractPaths();
        this.renderSVG();
        alert(`Shape "${id}" added!`);
    }

    renderPreviewTool() {
        return `
            <div class="tool-explanation">
                <h3>Preview & Background System</h3>
                <p>Customize how your SVG is displayed. Choose background style (none, color, grid, or checkerboard), adjust zoom level, and fit to screen.</p>
                <p><strong>When to use:</strong> Use this throughout your workflow to see your changes. Adjust the preview to match your target environment.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Preview Settings</label>
                
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Background Style</label>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 0.5rem;">
                        <button class="btn background-mode-btn ${this.backgroundMode === 'none' ? 'btn-primary' : ''}" data-mode="none" style="width: 100%;">
                            None
                        </button>
                        <button class="btn background-mode-btn ${this.backgroundMode === 'color' ? 'btn-primary' : ''}" data-mode="color" style="width: 100%;">
                            Color
                        </button>
                        <button class="btn background-mode-btn ${this.backgroundMode === 'grid' ? 'btn-primary' : ''}" data-mode="grid" style="width: 100%;">
                            Grid
                        </button>
                        <button class="btn background-mode-btn ${this.backgroundMode === 'checkerboard' ? 'btn-primary' : ''}" data-mode="checkerboard" style="width: 100%;">
                            Checkerboard
                        </button>
                    </div>
                    ${this.backgroundMode === 'color' ? `
                        <div>
                            <label class="form-label">Background Color</label>
                            <input type="color" class="form-input" id="previewBgColor" value="${this.previewBgColor}" onchange="app.updatePreviewBg()">
                        </div>
                    ` : ''}
                </div>
                
                <div style="margin-bottom: 0.75rem;">
                    <label class="form-label">Zoom</label>
                    <input type="range" class="form-input" id="previewZoom" min="0.1" max="5" step="0.05" value="${this.currentZoom || 1}" oninput="app.updatePreviewZoom()">
                    <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary);" id="zoomValue">${Math.round((this.currentZoom || 1) * 100)}%</div>
                </div>
                
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                    <button class="btn btn-primary" onclick="app.fitToScreen()" id="previewFitToScreenBtn" style="flex: 1;">Fit to Screen</button>
                </div>
                
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--border-radius);">
                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="pathDragEnabled" ${this.pathDragEnabled ? 'checked' : ''} onchange="app.togglePathDrag(this.checked)" style="cursor: pointer;">
                        <span>Enable drag-to-move objects</span>
                    </label>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; margin-bottom: 0.75rem;">
                        When enabled, click and drag selected paths to move them. Disable to use click-only selection.
                    </p>
                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="snapToGridPreview" ${this.snapToGrid ? 'checked' : ''} onchange="app.toggleGridSnap(this.checked)" style="cursor: pointer;">
                        <span>Snap to grid</span>
                    </label>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; margin-bottom: 0.75rem;">
                        When enabled, objects snap to a grid when moved. Helps with alignment.
                    </p>
                    <div style="margin-bottom: 0.75rem;">
                        <label class="form-label" style="font-size: 0.75rem;">Grid Size (px)</label>
                        <input type="number" class="form-input" id="gridSizeInput" value="${this.gridSize}" min="5" max="100" step="5" onchange="app.setGridSize(parseInt(this.value) || 10)">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; margin-bottom: 0;">
                            Size of the snap grid. Smaller = more precision.
                        </p>
                    </div>
                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="showGridOverlay" ${this.showGridOverlay ? 'checked' : ''} onchange="app.toggleGridOverlay(this.checked)" style="cursor: pointer;">
                        <span>Show grid overlay</span>
                    </label>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; margin-bottom: 0;">
                        Display grid lines on the canvas when grid snapping is enabled.
                    </p>
                </div>
                
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                    Tip: Middle-click + drag to pan. Use zoom buttons (+/-) in preview corner. ${this.pathDragEnabled ? 'Click and drag selected objects to move them.' : ''}
                </div>
            </div>
        `;
    }

    updatePreviewBg() {
        const colorInput = document.getElementById('previewBgColor');
        if (!colorInput) return;
        
        const color = colorInput.value;
        this.previewBgColor = color;
        
        // Apply background based on current mode
        this.applyBackgroundMods();
    }

    togglePathDrag(enabled) {
        this.pathDragEnabled = enabled;
        // Update cursor for selected paths
        const wrapper = document.getElementById('svgWrapper');
        if (wrapper) {
            const svg = wrapper.querySelector('svg');
            if (svg) {
                const paths = svg.querySelectorAll('path');
                paths.forEach(path => {
                    if (this.selectedPaths.has(path.id)) {
                        path.style.cursor = enabled ? 'grab' : 'pointer';
                    }
                });
            }
        }
    }

    toggleGridSnap(enabled) {
        this.snapToGrid = enabled;
        // Update grid overlay if needed
        const wrapper = document.getElementById('svgWrapper');
        if (wrapper) {
            const svg = wrapper.querySelector('svg');
            if (svg) {
                this.updateGridOverlay(svg);
            }
        }
    }

    setGridSize(size) {
        this.gridSize = Math.max(5, Math.min(100, size));
        // Update grid overlay if visible
        if (this.showGridOverlay) {
            const wrapper = document.getElementById('svgWrapper');
            if (wrapper) {
                const svg = wrapper.querySelector('svg');
                if (svg) {
                    this.updateGridOverlay(svg);
                }
            }
        }
        // Update preview tool to show new grid size
        if (this.currentTool === 'preview') {
            this.loadTool('preview');
        }
    }

    toggleGridOverlay(enabled) {
        this.showGridOverlay = enabled;
        const wrapper = document.getElementById('svgWrapper');
        if (wrapper) {
            const svg = wrapper.querySelector('svg');
            if (svg) {
                this.updateGridOverlay(svg);
            }
        }
    }

    updateGridOverlay(svg) {
        if (!svg) return;
        
        // Remove existing grid overlay
        const existing = svg.querySelector('#grid-overlay-group');
        if (existing) {
            existing.remove();
        }
        
        // Only show overlay if enabled and grid snapping is on
        if (!this.showGridOverlay || !this.snapToGrid) {
            this.gridOverlayGroup = null;
            return;
        }
        
        // Get viewBox or calculate bounds
        let minX = 0, minY = 0, maxX = 1000, maxY = 1000;
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
            const [x, y, w, h] = viewBox.split(' ').map(Number);
            minX = x || 0;
            minY = y || 0;
            maxX = minX + (w || 1000);
            maxY = minY + (h || 1000);
        } else {
            try {
                const bbox = svg.getBBox();
                minX = bbox.x;
                minY = bbox.y;
                maxX = bbox.x + bbox.width;
                maxY = bbox.y + bbox.height;
            } catch (e) {
                // Use defaults
            }
        }
        
        // Expand bounds to show more grid
        const padding = this.gridSize * 10;
        minX = Math.floor((minX - padding) / this.gridSize) * this.gridSize;
        minY = Math.floor((minY - padding) / this.gridSize) * this.gridSize;
        maxX = Math.ceil((maxX + padding) / this.gridSize) * this.gridSize;
        maxY = Math.ceil((maxY + padding) / this.gridSize) * this.gridSize;
        
        // Create grid overlay group
        const svgNS = 'http://www.w3.org/2000/svg';
        const gridGroup = document.createElementNS(svgNS, 'g');
        gridGroup.id = 'grid-overlay-group';
        gridGroup.style.pointerEvents = 'none';
        
        // Create grid lines
        const gridColor = 'rgba(74, 144, 226, 0.2)';
        const gridStrokeWidth = 0.5;
        
        // Vertical lines
        for (let x = minX; x <= maxX; x += this.gridSize) {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', minY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', maxY);
            line.setAttribute('stroke', gridColor);
            line.setAttribute('stroke-width', gridStrokeWidth);
            gridGroup.appendChild(line);
        }
        
        // Horizontal lines
        for (let y = minY; y <= maxY; y += this.gridSize) {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', minX);
            line.setAttribute('y1', y);
            line.setAttribute('x2', maxX);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', gridColor);
            line.setAttribute('stroke-width', gridStrokeWidth);
            gridGroup.appendChild(line);
        }
        
        // Insert grid overlay at the beginning (behind all content)
        svg.insertBefore(gridGroup, svg.firstChild);
        this.gridOverlayGroup = gridGroup;
    }

    showContextMenu(x, y, pathId) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        
        // Handle case where pathId might be null/undefined (empty space click)
        if (!pathId && this.selectedPaths.size === 0) {
            // No selection, show basic menu
            let menuHTML = '<div class="context-menu-item" onclick="app.setActiveTool(\'select\'); app.hideContextMenu();">Select Tool</div>';
            menuHTML += '<div class="context-menu-item" onclick="app.setActiveTool(\'move\'); app.hideContextMenu();">Move Tool</div>';
            menuHTML += '<div class="context-menu-item" onclick="app.setActiveTool(\'resize\'); app.hideContextMenu();">Resize Tool</div>';
            menu.innerHTML = menuHTML;
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.style.display = 'block';
            return;
        }
        
        // Get path info
        const path = pathId ? this.paths.find(p => p.id === pathId) : null;
        const isSelected = pathId ? this.selectedPaths.has(pathId) : false;
        const hasMultipleSelected = this.selectedPaths.size > 1;
        
        // Build menu items
        let menuHTML = '<div class="context-menu-item" onclick="app.setActiveTool(\'move\'); app.hideContextMenu();">Move</div>';
        menuHTML += '<div class="context-menu-item" onclick="app.setActiveTool(\'resize\'); app.hideContextMenu();">Resize</div>';
        menuHTML += '<div class="context-menu-item" onclick="app.copySelectedPaths(); app.hideContextMenu();">Copy</div>';
        menuHTML += '<div class="context-menu-item" onclick="app.duplicateSelectedPaths(); app.hideContextMenu();">Duplicate</div>';
        menuHTML += '<div class="context-menu-separator"></div>';
        
        if (!isSelected) {
            menuHTML += `<div class="context-menu-item" onclick="app.selectedPaths.clear(); app.selectedPaths.add('${pathId}'); app.renderSVG(); app.hideContextMenu();">Select</div>`;
        }
        
        if (hasMultipleSelected) {
            menuHTML += '<div class="context-menu-item" onclick="app.alignSelected(\'left\'); app.hideContextMenu();">Align Left</div>';
            menuHTML += '<div class="context-menu-item" onclick="app.alignSelected(\'center\'); app.hideContextMenu();">Align Center</div>';
            menuHTML += '<div class="context-menu-item" onclick="app.alignSelected(\'right\'); app.hideContextMenu();">Align Right</div>';
            menuHTML += '<div class="context-menu-item" onclick="app.alignSelected(\'top\'); app.hideContextMenu();">Align Top</div>';
            menuHTML += '<div class="context-menu-item" onclick="app.alignSelected(\'middle\'); app.hideContextMenu();">Align Middle</div>';
            menuHTML += '<div class="context-menu-item" onclick="app.alignSelected(\'bottom\'); app.hideContextMenu();">Align Bottom</div>';
            menuHTML += '<div class="context-menu-separator"></div>';
        }
        
        menuHTML += `<div class="context-menu-item" onclick="if(confirm('Delete ${this.selectedPaths.size || 1} path(s)?')) { app.deleteSelectedPaths(); } app.hideContextMenu();">Delete</div>`;
        
        menu.innerHTML = menuHTML;
        
        // Position menu, ensuring it stays within viewport
        const menuWidth = 160; // Approximate menu width
        const menuHeight = menuHTML.split('</div>').length * 32; // Approximate height per item
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let menuX = x;
        let menuY = y;
        
        // Adjust if menu would go off right edge
        if (menuX + menuWidth > viewportWidth) {
            menuX = viewportWidth - menuWidth - 10;
        }
        
        // Adjust if menu would go off bottom edge
        if (menuY + menuHeight > viewportHeight) {
            menuY = viewportHeight - menuHeight - 10;
        }
        
        // Ensure menu doesn't go off left or top edges
        menuX = Math.max(10, menuX);
        menuY = Math.max(10, menuY);
        
        menu.style.left = `${menuX}px`;
        menu.style.top = `${menuY}px`;
        menu.style.display = 'block';
        
        // Close menu on outside click
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    this.hideContextMenu();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    }

    updatePositionIndicator(x, y) {
        const statusBar = document.getElementById('statusBar');
        const statusBarText = document.getElementById('statusBarText');
        if (statusBar && statusBarText) {
            // Format coordinates with 2 decimal places
            const formattedX = x.toFixed(2);
            const formattedY = y.toFixed(2);
            
            // Check if grid snapping is enabled
            const snapIndicator = this.snapToGrid ? ' (snapped)' : '';
            statusBarText.textContent = `X: ${formattedX}  Y: ${formattedY}${snapIndicator}`;
            statusBar.style.display = 'block';
        }
    }

    hidePositionIndicator() {
        const statusBar = document.getElementById('statusBar');
        if (statusBar) {
            statusBar.style.display = 'none';
        }
    }

    updatePreviewZoom() {
        const zoom = parseFloat(document.getElementById('previewZoom').value) || 1;
        this.currentZoom = zoom;
        document.getElementById('zoomValue').textContent = Math.round(zoom * 100) + '%';
        const miniZoom = document.getElementById('miniMapZoom');
        if (miniZoom) miniZoom.textContent = Math.round(zoom * 100) + '%';
        const wrapper = document.getElementById('svgWrapper');
        const svg = wrapper.querySelector('svg');
        if (svg) {
            svg.style.transform = `scale(${zoom})`;
            svg.style.transformOrigin = 'center';
        }
    }

    renderMiniMap() {
        const mini = document.getElementById('miniMapContent');
        const miniWrap = document.getElementById('miniMap');
        if (!mini || !miniWrap) return;
        mini.innerHTML = '';
        if (!this.svgElement) {
            miniWrap.style.display = 'none';
            return;
        }
        
        const simpleSvg = this.svgElement.cloneNode(false);
        simpleSvg.removeAttribute('width');
        simpleSvg.removeAttribute('height');
        
        // Copy viewBox
        if (this.svgElement.getAttribute('viewBox')) {
            simpleSvg.setAttribute('viewBox', this.svgElement.getAttribute('viewBox'));
        }
        
        // When selected paths exist, show them with highlight; otherwise render full SVG
        const addPathClone = (path) => {
            const clone = path.element.cloneNode(true);
            clone.style.filter = 'drop-shadow(0 0 4px #4a90e2)';
            simpleSvg.appendChild(clone);
        };

        if (this.selectedPaths.size > 0) {
            this.selectedPaths.forEach(pathId => {
                const path = this.paths.find(p => p.id === pathId);
                if (path && path.element) {
                    addPathClone(path);
                }
            });
        } else {
            Array.from(this.svgElement.children).forEach(child => {
                if (child.tagName === 'style' || child.tagName === 'defs') return;
                simpleSvg.appendChild(child.cloneNode(true));
            });
        }
        
        mini.appendChild(simpleSvg);
        miniWrap.style.display = 'flex';

        // Add a rough viewport indicator based on current visible area
        const liveWrapper = document.getElementById('svgWrapper');
        const liveSvg = liveWrapper ? liveWrapper.querySelector('svg') : null;
        if (liveWrapper && liveSvg && (this.svgElement.getAttribute('viewBox') || liveSvg.getBBox)) {
            let vbWidth;
            let vbHeight;
            const vb = liveSvg.getAttribute('viewBox');
            if (vb) {
                [, , vbWidth, vbHeight] = vb.split(' ').map(Number);
            } else {
                const bbox = liveSvg.getBBox();
                vbWidth = bbox.width || 1;
                vbHeight = bbox.height || 1;
            }

            const liveRect = liveSvg.getBoundingClientRect();
            const wrapRect = liveWrapper.getBoundingClientRect();
            const visibleWidthPx = Math.min(wrapRect.width, liveRect.width);
            const visibleHeightPx = Math.min(wrapRect.height, liveRect.height);
            const offsetLeftPx = Math.max(0, wrapRect.left - liveRect.left);
            const offsetTopPx = Math.max(0, wrapRect.top - liveRect.top);

            const viewportRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            viewportRect.setAttribute('fill', 'none');
            viewportRect.setAttribute('stroke', '#4a90e2');
            viewportRect.setAttribute('stroke-width', Math.max(0.5, vbWidth * 0.002));
            viewportRect.setAttribute('stroke-dasharray', '4 2');

            viewportRect.setAttribute('x', (offsetLeftPx / liveRect.width) * vbWidth);
            viewportRect.setAttribute('y', (offsetTopPx / liveRect.height) * vbHeight);
            viewportRect.setAttribute('width', (visibleWidthPx / liveRect.width) * vbWidth);
            viewportRect.setAttribute('height', (visibleHeightPx / liveRect.height) * vbHeight);
            simpleSvg.appendChild(viewportRect);
        }

        const miniZoom = document.getElementById('miniMapZoom');
        if (miniZoom) miniZoom.textContent = Math.round((this.currentZoom || 1) * 100) + '%';
        this.lastMiniMapRender = Date.now();
        this.miniMapRaf = null;
    }

    scheduleMiniMap() {
        const now = Date.now();
        const elapsed = now - (this.lastMiniMapRender || 0);
        const cooldown = 150;

        if (elapsed < cooldown) {
            if (this.miniMapTimeout) clearTimeout(this.miniMapTimeout);
            this.miniMapTimeout = setTimeout(() => {
                this.miniMapTimeout = null;
                this.renderMiniMap();
            }, cooldown - elapsed);
            return;
        }

        if (this.miniMapRaf) cancelAnimationFrame(this.miniMapRaf);
        this.miniMapRaf = requestAnimationFrame(() => this.renderMiniMap());
    }

    setBackgroundMode(mode) {
        // Ensure only one background mode is active at a time
        if (!['none', 'color', 'grid', 'checkerboard'].includes(mode)) {
            console.warn('Invalid background mode:', mode);
            return;
        }
        
        this.backgroundMode = mode;
        // Persist background mode
        localStorage.setItem('backgroundMode', mode);
        this.applyBackgroundMods();
        this.syncBackgroundButtons();
        
        // Re-render preview tool to update UI
        if (this.currentTool === 'preview') {
            this.loadTool('preview');
        }
    }

    applyBackgroundMods() {
        const wrapper = document.getElementById('svgWrapper');
        if (!wrapper) return;
        
        // Remove all background classes
        wrapper.classList.remove('grid', 'checkerboard');
        
        // Apply based on mode
        switch (this.backgroundMode) {
            case 'none':
                wrapper.style.backgroundColor = 'transparent';
                wrapper.style.backgroundImage = 'none';
                break;
            case 'color':
                wrapper.style.backgroundColor = this.previewBgColor;
                wrapper.style.backgroundImage = 'none';
                break;
            case 'grid':
                wrapper.style.backgroundColor = 'transparent';
                wrapper.classList.add('grid');
                break;
            case 'checkerboard':
                wrapper.style.backgroundColor = 'transparent';
                wrapper.classList.add('checkerboard');
                break;
        }
    }

    syncBackgroundButtons() {
        // Sync background mode buttons in Preview tool
        document.querySelectorAll('.background-mode-btn').forEach(btn => {
            const mode = btn.dataset.mode;
            if (mode === this.backgroundMode) {
                btn.classList.add('btn-primary');
            } else {
                btn.classList.remove('btn-primary');
            }
        });
    }

    zoomIn() {
        const zoomInput = document.getElementById('previewZoom');
        if (!zoomInput) return;
        const currentZoom = parseFloat(zoomInput.value) || 1;
        const newZoom = Math.min(5, currentZoom + 0.1);
        zoomInput.value = newZoom.toFixed(2);
        this.updatePreviewZoom();
    }

    zoomOut() {
        const zoomInput = document.getElementById('previewZoom');
        if (!zoomInput) return;
        const currentZoom = parseFloat(zoomInput.value) || 1;
        const newZoom = Math.max(0.1, currentZoom - 0.1);
        zoomInput.value = newZoom.toFixed(2);
        this.updatePreviewZoom();
    }

    fitToScreen() {
        const wrapper = document.getElementById('svgWrapper');
        if (!wrapper) return;
        
        const svg = wrapper.querySelector('svg');
        if (!svg) {
            alert('No SVG loaded. Please load an SVG file first.');
            return;
        }
        
        // Try to get actual content bounds first (to handle content beyond viewBox)
        let contentWidth, contentHeight, contentX = 0, contentY = 0;
        try {
            const bbox = svg.getBBox();
            contentX = bbox.x;
            contentY = bbox.y;
            contentWidth = bbox.width;
            contentHeight = bbox.height;
        } catch (e) {
            // If getBBox fails, fall back to viewBox
        }
        
        // Use viewBox if available, otherwise use content bounds
        const viewBox = svg.getAttribute('viewBox');
        let width, height, minX = 0, minY = 0;
        
        if (viewBox) {
            const [x, y, w, h] = viewBox.split(' ').map(Number);
            minX = x || 0;
            minY = y || 0;
            width = w;
            height = h;
            
            // If content extends beyond viewBox, use the larger bounds
            if (contentWidth && contentHeight) {
                const contentMaxX = contentX + contentWidth;
                const contentMaxY = contentY + contentHeight;
                const viewBoxMaxX = minX + width;
                const viewBoxMaxY = minY + height;
                
                // Expand to include all content
                const actualMinX = Math.min(contentX, minX);
                const actualMinY = Math.min(contentY, minY);
                const actualMaxX = Math.max(contentMaxX, viewBoxMaxX);
                const actualMaxY = Math.max(contentMaxY, viewBoxMaxY);
                
                width = actualMaxX - actualMinX;
                height = actualMaxY - actualMinY;
                minX = actualMinX;
                minY = actualMinY;
            }
        } else if (contentWidth && contentHeight) {
            // No viewBox, use content bounds
            width = contentWidth;
            height = contentHeight;
            minX = contentX;
            minY = contentY;
        } else {
            alert('Could not determine SVG dimensions. SVG needs a viewBox or visible content.');
            return;
        }
        
        if (!width || !height) {
            alert('Could not determine SVG dimensions');
            return;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const padding = 40; // Padding around SVG
        const scale = Math.min(
            (wrapperRect.width - padding * 2) / width,
            (wrapperRect.height - padding * 2) / height
        );

        // Ensure minimum zoom of 1.0 (100%) - don't shrink below 100%
        const finalScale = Math.max(scale, 1.0);

        const zoomInput = document.getElementById('previewZoom');
        if (zoomInput) {
            if (finalScale > parseFloat(zoomInput.max)) {
                zoomInput.max = Math.ceil(finalScale * 1.2 * 100) / 100;
            }
            zoomInput.value = finalScale.toFixed(2);
            this.updatePreviewZoom();
        } else {
            // Fallback if zoom input doesn't exist
            this.currentZoom = finalScale;
            const svgEl = wrapper.querySelector('svg');
            if (svgEl) {
                svgEl.style.transform = `scale(${finalScale})`;
                svgEl.style.transformOrigin = 'center';
            }
        }
    }

    // ==================== TOOL 16: FILE PATCHING ====================
    
    renderFilePatch() {
        return `
            <div class="tool-explanation">
                <h3>File Patching System</h3>
                <p>Update existing SVG files with new path data from your current SVG. Matches paths by ID and updates their attributes and path data.</p>
                <p><strong>When to use:</strong> When you need to update multiple related SVG files with the same changes. Useful for maintaining consistency across a set of files.</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Patch Existing SVG File</label>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    Select an SVG file to update with path data from the current SVG.
                </p>
                <input type="file" class="form-input" id="patchFileInput" accept=".svg" onchange="app.patchFile(event)">
                <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius);">
                    <strong>Note:</strong> Paths are matched by ID. The patched file will be downloaded with "-patched" suffix.
                </div>
            </div>
        `;
    }

    async patchFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!this.svgElement) {
            alert('Please load an SVG first');
            return;
        }
        
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const targetSvg = doc.documentElement;
        
        // Patch paths by matching IDs
        this.paths.forEach(sourcePath => {
            const targetPath = targetSvg.querySelector(`#${sourcePath.id}`);
            if (targetPath && sourcePath.d) {
                targetPath.setAttribute('d', sourcePath.d);
                if (sourcePath.fill) targetPath.setAttribute('fill', sourcePath.fill);
                if (sourcePath.stroke) targetPath.setAttribute('stroke', sourcePath.stroke);
            }
        });
        
        const serializer = new XMLSerializer();
        const patchedSVG = serializer.serializeToString(targetSvg);
        const blob = new Blob([patchedSVG], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace('.svg', '-patched.svg');
        a.click();
        URL.revokeObjectURL(url);
        
        alert('File patched and downloaded!');
    }

    // ==================== UTILITY METHODS ====================
    
    updateUI() {
        document.getElementById('saveFileBtn').disabled = !this.svgElement;
        this.applyBackgroundMods();
        this.syncBackgroundButtons();
        if (this.currentTool) {
            this.loadTool(this.currentTool);
        }
    }
}

// Initialize the application
const app = new SVGLayerToolkit();
