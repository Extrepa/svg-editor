import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import type { HistoryState } from '../types';

export function useHistory() {
    const { state, updateState } = useAppContext();

    const saveState = useCallback(() => {
        if (!state.svgElement) return;

        const serializer = new XMLSerializer();
        const historyState: HistoryState = {
            svgData: serializer.serializeToString(state.svgElement),
            timestamp: Date.now(),
        };

        const last = state.history[state.historyIndex];
        if (last && last.svgData === historyState.svgData) {
            return; // No changes
        }

        // Remove any states after current index (for redo)
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyState);
        let newIndex = state.historyIndex + 1;

        // Limit history size
        if (newHistory.length > state.maxHistory) {
            newHistory.shift();
            newIndex--;
        }

        updateState({
            history: newHistory,
            historyIndex: newIndex,
        });
    }, [state.svgElement, state.history, state.historyIndex, state.maxHistory, updateState]);

    const undo = useCallback(() => {
        if (state.historyIndex <= 0) return;
        const newIndex = state.historyIndex - 1;
        restoreState(state.history[newIndex]);
        updateState({ historyIndex: newIndex });
    }, [state.history, state.historyIndex, updateState]);

    const redo = useCallback(() => {
        if (state.historyIndex >= state.history.length - 1) return;
        const newIndex = state.historyIndex + 1;
        restoreState(state.history[newIndex]);
        updateState({ historyIndex: newIndex });
    }, [state.history, state.historyIndex, updateState]);

    const restoreState = useCallback((historyState: HistoryState) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(historyState.svgData, 'image/svg+xml');
        const svgElement = doc.documentElement as unknown as SVGSVGElement;
        
        updateState({
            svgElement,
            svgData: historyState.svgData,
        });

        // Re-extract paths and groups
        // This will be handled by the component that calls restoreState
    }, [updateState]);

    return {
        saveState,
        undo,
        redo,
        restoreState,
    };
}

