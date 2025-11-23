import { createContext, useContext, ReactNode } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { AppState } from '../types';

interface AppContextType {
    state: AppState;
    updateState: (updates: Partial<AppState>) => void;
    setSelectedPaths: (paths: Set<string>) => void;
    addSelectedPath: (pathId: string) => void;
    removeSelectedPath: (pathId: string) => void;
    clearSelection: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const appState = useAppState();

    return (
        <AppContext.Provider value={appState}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext(): AppContextType {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}

