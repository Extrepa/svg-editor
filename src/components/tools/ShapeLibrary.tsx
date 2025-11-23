import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';
import { usePathExtraction } from '../../hooks/usePathExtraction';

const ShapeLibrary: React.FC = () => {
    const { state } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();
    const { extractPaths } = usePathExtraction();

    const createShape = (type: string, params?: any) => {
        if (!state.svgElement) {
            alert('Please load an SVG first');
            return;
        }

        saveState();
        const svgNS = 'http://www.w3.org/2000/svg';
        let pathData = '';

        switch (type) {
            case 'star':
                const points = params.points || 5;
                const outerRadius = params.outerRadius || 50;
                const innerRadius = outerRadius * 0.5;
                const centerX = 100;
                const centerY = 100;
                pathData = `M ${centerX} ${centerY - outerRadius}`;
                for (let i = 1; i <= points * 2; i++) {
                    const angle = (i * Math.PI) / points - Math.PI / 2;
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    pathData += ` L ${x} ${y}`;
                }
                pathData += ' Z';
                break;
            case 'polygon':
                const sides = params.sides || 6;
                const radius = params.radius || 50;
                const cx = 100;
                const cy = 100;
                pathData = `M ${cx + radius} ${cy}`;
                for (let i = 1; i <= sides; i++) {
                    const angle = (i * 2 * Math.PI) / sides;
                    const x = cx + radius * Math.cos(angle);
                    const y = cy + radius * Math.sin(angle);
                    pathData += ` L ${x} ${y}`;
                }
                pathData += ' Z';
                break;
            case 'circle':
                pathData = `M 100,50 A 50,50 0 1,1 100,150 A 50,50 0 1,1 100,50 Z`;
                break;
            default:
                return;
        }

        const newPath = document.createElementNS(svgNS, 'path');
        newPath.setAttribute('d', pathData);
        newPath.setAttribute('fill', '#000000');
        newPath.id = `${type}-${Date.now()}`;
        
        state.svgElement.appendChild(newPath);
        extractPaths();
        renderSVG();
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Primitive Shape Library</h3>
                <p><strong>What it does:</strong> Quickly add pre-made shapes (stars, polygons, arrows, speech bubbles) to your SVG.</p>
                <p><strong>When to use:</strong> At the start of your design or when you need standard shapes.</p>
            </div>

            <div className="tool-section">
                <label className="form-label">Stars</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button className="btn" onClick={() => createShape('star', { points: 5 })}>
                        5-Point Star
                    </button>
                    <button className="btn" onClick={() => createShape('star', { points: 6 })}>
                        6-Point Star
                    </button>
                    <button className="btn" onClick={() => createShape('star', { points: 8 })}>
                        8-Point Star
                    </button>
                </div>
            </div>

            <div className="tool-section">
                <label className="form-label">Polygons</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button className="btn" onClick={() => createShape('polygon', { sides: 3 })}>
                        Triangle
                    </button>
                    <button className="btn" onClick={() => createShape('polygon', { sides: 4 })}>
                        Square
                    </button>
                    <button className="btn" onClick={() => createShape('polygon', { sides: 5 })}>
                        Pentagon
                    </button>
                    <button className="btn" onClick={() => createShape('polygon', { sides: 6 })}>
                        Hexagon
                    </button>
                    <button className="btn" onClick={() => createShape('polygon', { sides: 8 })}>
                        Octagon
                    </button>
                    <button className="btn" onClick={() => createShape('polygon', { sides: 12 })}>
                        Dodecagon
                    </button>
                </div>
            </div>

            <div className="tool-section">
                <label className="form-label">Basic Shapes</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    <button className="btn" onClick={() => createShape('circle')}>
                        Circle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShapeLibrary;

