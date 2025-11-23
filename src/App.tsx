import { useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
import LeftToolbar from './components/LeftToolbar';
import PreviewArea from './components/PreviewArea';
import RightPanel from './components/RightPanel';
import HistoryBar from './components/HistoryBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

function AppContent() {
    // Initialize keyboard shortcuts
    useKeyboardShortcuts();

    return (
        <div className="app-container">
            <Header />
            <div className="main-content">
                <LeftToolbar />
                <PreviewArea />
                <RightPanel />
            </div>
            <HistoryBar />
        </div>
    );
}

function App() {
    useEffect(() => {
        // Initialize theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}

export default App;

