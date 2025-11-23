import { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useFileOperations } from '../hooks/useFileOperations';
import { useHistory } from '../hooks/useHistory';
import { 
    FileUp, Save, Download, 
    Undo, Redo, Copy, Clipboard,
    ZoomIn, ZoomOut, Maximize2, Grid,
    Moon, Sun, ChevronDown
} from 'lucide-react';

const Header: React.FC = () => {
    const { state, updateState, setSelectedPaths, clearSelection } = useAppContext();
    const { loadSVGFile, saveSVG } = useFileOperations();
    const { undo, redo } = useHistory();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [fileMenuOpen, setFileMenuOpen] = useState(false);
    const [editMenuOpen, setEditMenuOpen] = useState(false);
    const [viewMenuOpen, setViewMenuOpen] = useState(false);
    const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

    const handleThemeToggle = () => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const handleLoadFile = () => {
        fileInputRef.current?.click();
        setFileMenuOpen(false);
    };

    const handleSaveFile = () => {
        saveSVG(false);
        setFileMenuOpen(false);
    };

    const handleSaveAs = () => {
        saveSVG(false);
        setFileMenuOpen(false);
    };

    const handleZoomIn = () => {
        const newZoom = Math.min(5, state.currentZoom + 0.1);
        updateState({ currentZoom: newZoom });
    };

    const handleZoomOut = () => {
        const newZoom = Math.max(0.1, state.currentZoom - 0.1);
        updateState({ currentZoom: newZoom });
    };

    const handleFitToScreen = () => {
        // This will be handled by PreviewArea
        updateState({ currentZoom: 1 });
    };

    const handleSelectAll = () => {
        const allIds = new Set(state.paths.map(p => p.id));
        setSelectedPaths(allIds);
        setEditMenuOpen(false);
    };

    const handleDeselectAll = () => {
        clearSelection();
        setEditMenuOpen(false);
    };

    const handleCopy = () => {
        // Copy functionality to be implemented
        setEditMenuOpen(false);
    };

    const handlePaste = () => {
        // Paste functionality to be implemented
        setEditMenuOpen(false);
    };

    const handleToggleGrid = () => {
        updateState({ showGridOverlay: !state.showGridOverlay });
        setViewMenuOpen(false);
    };

    const MenuDropdown: React.FC<{
        label: string;
        isOpen: boolean;
        onToggle: () => void;
        children: React.ReactNode;
    }> = ({ label, isOpen, onToggle, children }) => (
        <div className="menu-item" onMouseLeave={() => onToggle()}>
            <button 
                className={`menu-button ${isOpen ? 'active' : ''}`}
                onMouseEnter={() => onToggle()}
                onClick={() => onToggle()}
            >
                {label}
                <ChevronDown className="menu-chevron" size={14} />
            </button>
            {isOpen && (
                <div className="menu-dropdown">
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <header className="app-header">
            <div className="header-left">
                <div className="app-brand">
                    <h1 className="app-title">🎨 SVG Studio</h1>
                </div>
                
                <div className="menu-bar">
                    <MenuDropdown 
                        label="File" 
                        isOpen={fileMenuOpen}
                        onToggle={() => {
                            setFileMenuOpen(!fileMenuOpen);
                            setEditMenuOpen(false);
                            setViewMenuOpen(false);
                            setToolsMenuOpen(false);
                            setExportMenuOpen(false);
                        }}
                    >
                        <button onClick={handleLoadFile} className="menu-item-button">
                            <FileUp size={14} /> Open SVG
                        </button>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".svg" 
                            style={{ display: 'none' }}
                            onChange={loadSVGFile}
                        />
                        <button 
                            onClick={handleSaveFile} 
                            disabled={!state.svgElement}
                            className="menu-item-button"
                        >
                            <Save size={14} /> Save
                        </button>
                        <button 
                            onClick={handleSaveAs} 
                            disabled={!state.svgElement}
                            className="menu-item-button"
                        >
                            <Save size={14} /> Save As...
                        </button>
                    </MenuDropdown>

                    <MenuDropdown 
                        label="Edit" 
                        isOpen={editMenuOpen}
                        onToggle={() => {
                            setEditMenuOpen(!editMenuOpen);
                            setFileMenuOpen(false);
                            setViewMenuOpen(false);
                            setToolsMenuOpen(false);
                            setExportMenuOpen(false);
                        }}
                    >
                        <button 
                            onClick={undo}
                            disabled={state.historyIndex <= 0}
                            className="menu-item-button"
                        >
                            <Undo size={14} /> Undo
                        </button>
                        <button 
                            onClick={redo}
                            disabled={state.historyIndex >= state.history.length - 1}
                            className="menu-item-button"
                        >
                            <Redo size={14} /> Redo
                        </button>
                        <div className="menu-divider"></div>
                        <button onClick={handleCopy} className="menu-item-button">
                            <Copy size={14} /> Copy
                        </button>
                        <button onClick={handlePaste} className="menu-item-button">
                            <Clipboard size={14} /> Paste
                        </button>
                        <div className="menu-divider"></div>
                        <button onClick={handleSelectAll} className="menu-item-button">
                            Select All
                        </button>
                        <button onClick={handleDeselectAll} className="menu-item-button">
                            Deselect All
                        </button>
                    </MenuDropdown>

                    <MenuDropdown 
                        label="View" 
                        isOpen={viewMenuOpen}
                        onToggle={() => {
                            setViewMenuOpen(!viewMenuOpen);
                            setFileMenuOpen(false);
                            setEditMenuOpen(false);
                            setToolsMenuOpen(false);
                            setExportMenuOpen(false);
                        }}
                    >
                        <button onClick={handleZoomIn} className="menu-item-button">
                            <ZoomIn size={14} /> Zoom In
                        </button>
                        <button onClick={handleZoomOut} className="menu-item-button">
                            <ZoomOut size={14} /> Zoom Out
                        </button>
                        <button onClick={handleFitToScreen} className="menu-item-button">
                            <Maximize2 size={14} /> Fit to Screen
                        </button>
                        <div className="menu-divider"></div>
                        <button 
                            onClick={handleToggleGrid}
                            className={`menu-item-button ${state.showGridOverlay ? 'active' : ''}`}
                        >
                            <Grid size={14} /> {state.showGridOverlay ? 'Hide' : 'Show'} Grid
                        </button>
                    </MenuDropdown>

                    <MenuDropdown 
                        label="Tools" 
                        isOpen={toolsMenuOpen}
                        onToggle={() => {
                            setToolsMenuOpen(!toolsMenuOpen);
                            setFileMenuOpen(false);
                            setEditMenuOpen(false);
                            setViewMenuOpen(false);
                            setExportMenuOpen(false);
                        }}
                    >
                        <button 
                            onClick={() => {
                                updateState({ currentPanel: 'color-replacer' });
                                setToolsMenuOpen(false);
                            }}
                            className="menu-item-button"
                        >
                            Color Replacer
                        </button>
                        <button 
                            onClick={() => {
                                updateState({ currentPanel: 'path-merger' });
                                setToolsMenuOpen(false);
                            }}
                            className="menu-item-button"
                        >
                            Path Merger
                        </button>
                        <button 
                            onClick={() => {
                                updateState({ currentPanel: 'boolean-ops' });
                                setToolsMenuOpen(false);
                            }}
                            className="menu-item-button"
                        >
                            Boolean Operations
                        </button>
                    </MenuDropdown>

                    <MenuDropdown 
                        label="Export" 
                        isOpen={exportMenuOpen}
                        onToggle={() => {
                            setExportMenuOpen(!exportMenuOpen);
                            setFileMenuOpen(false);
                            setEditMenuOpen(false);
                            setViewMenuOpen(false);
                            setToolsMenuOpen(false);
                        }}
                    >
                        <button 
                            onClick={() => {
                                updateState({ currentPanel: 'export' });
                                setExportMenuOpen(false);
                            }}
                            disabled={!state.svgElement}
                            className="menu-item-button"
                        >
                            <Download size={14} /> Export Manager
                        </button>
                    </MenuDropdown>
                </div>
            </div>

            <div className="header-right">
                <div className="zoom-controls">
                    <button 
                        className="btn-icon" 
                        onClick={handleZoomOut}
                        title="Zoom Out"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span className="zoom-level">{Math.round(state.currentZoom * 100)}%</span>
                    <button 
                        className="btn-icon" 
                        onClick={handleZoomIn}
                        title="Zoom In"
                    >
                        <ZoomIn size={16} />
                    </button>
                </div>
                <button 
                    className="btn-icon" 
                    title={currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    onClick={handleThemeToggle}
                >
                    {currentTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </header>
    );
};

export default Header;
