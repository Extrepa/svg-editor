import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useHistory } from '../hooks/useHistory';
import { usePathExtraction } from '../hooks/usePathExtraction';
import { useSVGRenderer } from '../hooks/useSVGRenderer';

const HistoryBar: React.FC = () => {
    const { state } = useAppContext();
    const { undo, redo } = useHistory();
    const { extractPaths, extractGroups } = usePathExtraction();
    const { renderSVG } = useSVGRenderer();

    const handleUndo = () => {
        undo();
        // Re-extract and re-render after undo
        setTimeout(() => {
            extractPaths();
            extractGroups();
            renderSVG();
        }, 0);
    };

    const handleRedo = () => {
        redo();
        // Re-extract and re-render after redo
        setTimeout(() => {
            extractPaths();
            extractGroups();
            renderSVG();
        }, 0);
    };

    return (
        <div className="history-bar">
            <button 
                className="btn btn-small"
                id="undoBtn"
                disabled={state.historyIndex <= 0}
                onClick={handleUndo}
            >
                ↶ Undo
            </button>
            <button 
                className="btn btn-small"
                id="redoBtn"
                disabled={state.historyIndex >= state.history.length - 1}
                onClick={handleRedo}
            >
                ↷ Redo
            </button>
            <span className="history-info" id="historyInfo">
                History: {state.historyIndex + 1} / {state.history.length || 1}
            </span>
            <div className="history-list" id="historyList"></div>
        </div>
    );
};

export default HistoryBar;
