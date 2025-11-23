import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useFileOperations } from '../../hooks/useFileOperations';

const Templates: React.FC = () => {
    const { state, updateState } = useAppContext();
    const { parseSVG } = useFileOperations();
    const [templateName, setTemplateName] = useState('');

    const handleSaveTemplate = () => {
        if (!state.svgElement || !templateName.trim()) {
            alert('Please load an SVG and enter a template name');
            return;
        }

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(state.svgElement);
        
        const templates = JSON.parse(localStorage.getItem('svgTemplates') || '[]');
        const newTemplate = {
            id: `template-${Date.now()}`,
            name: templateName,
            svgData: svgString,
            createdAt: Date.now(),
        };
        
        templates.push(newTemplate);
        localStorage.setItem('svgTemplates', JSON.stringify(templates));
        
        updateState({ templates });
        setTemplateName('');
        alert('Template saved successfully!');
    };

    const handleLoadTemplate = (template: typeof state.templates[0]) => {
        if (!template.svgData) {
            alert('Template data is missing');
            return;
        }
        parseSVG(template.svgData);
        alert(`Template "${template.name}" loaded successfully!`);
    };

    const handleDeleteTemplate = (templateId: string) => {
        const templates = state.templates.filter(t => t.id !== templateId);
        localStorage.setItem('svgTemplates', JSON.stringify(templates));
        updateState({ templates });
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Template System</h3>
                <p>Quick-start with pre-built SVG templates or save your current SVG as a template. Templates help you understand SVG structure and jump into editing quickly.</p>
                <p><strong>When to use:</strong> At the beginning of your workflow. Use templates to learn SVG structure or as starting points for new designs.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Saved Templates</label>
                {state.templates.length > 0 ? (
                    <div className="template-list" style={{ marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {state.templates.map((template) => (
                            <div key={template.id} className="template-item" style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{template.name}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button className="btn btn-small" onClick={() => handleLoadTemplate(template)}>
                                        Load
                                    </button>
                                    <button className="btn btn-small" onClick={() => handleDeleteTemplate(template.id)} style={{ background: 'var(--danger-color)' }}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        No saved templates yet. Save your current SVG as a template below.
                    </p>
                )}
            </div>

            <div className="tool-section" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <label className="form-label">Save Current SVG as Template</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                        type="text"
                        className="form-input"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name (e.g., 'My Icon')"
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={!state.svgElement}>
                        Save Template
                    </button>
                </div>
                {!state.svgElement && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Load an SVG first to save it as a template.
                    </p>
                )}
            </div>
        </div>
    );
};

export default Templates;

