import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useSVGRenderer } from '../../hooks/useSVGRenderer';

const Animator: React.FC = () => {
    const { state, updateState, setSelectedPaths } = useAppContext();
    const { saveState } = useHistory();
    const { renderSVG } = useSVGRenderer();

    const [animType, setAnimType] = useState('draw');
    const [duration, setDuration] = useState(2);
    const [delay, setDelay] = useState(0.1);
    const [loop, setLoop] = useState(false);
    const [direction, setDirection] = useState('normal');
    const [easing] = useState('ease-out');
    const [useGSAP, setUseGSAP] = useState(false);

    const selectedCount = state.selectedPaths.size;
    const targetPaths = selectedCount > 0 ? selectedCount : state.paths.length;
    const hasGSAP = typeof (window as any).gsap !== 'undefined';

    useEffect(() => {
        if (hasGSAP && !useGSAP) {
            setUseGSAP(false); // Default to CSS if both available
        }
    }, [hasGSAP]);

    const applyCSSAnimation = () => {
        if (!state.svgElement) return;

        saveState();

        const pathsToAnimate = selectedCount > 0 
            ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p)
            : state.paths;

        if (pathsToAnimate.length === 0) {
            alert('No paths to animate');
            return;
        }

        // Get or create style element
        let styleElement = document.getElementById('svg-animations') as HTMLStyleElement;
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'svg-animations';
            document.head.appendChild(styleElement);
        }

        const animations: Record<string, { keyframes: string; style: string }> = {
            draw: {
                keyframes: `@keyframes draw {
                    from { stroke-dashoffset: var(--path-length, 100); }
                    to { stroke-dashoffset: 0; }
                }`,
                style: `animation: draw ${duration}s ${easing} forwards;`
            },
            fade: {
                keyframes: `@keyframes fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }`,
                style: `animation: fade ${duration}s ${easing} forwards;`
            },
            scale: {
                keyframes: `@keyframes scale {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }`,
                style: `animation: scale ${duration}s ${easing} forwards;`
            },
            rotate: {
                keyframes: `@keyframes rotate {
                    from { transform: rotate(-180deg) scale(0); opacity: 0; }
                    to { transform: rotate(0deg) scale(1); opacity: 1; }
                }`,
                style: `animation: rotate ${duration}s ${easing} forwards;`
            },
            slide: {
                keyframes: `@keyframes slide {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }`,
                style: `animation: slide ${duration}s ${easing} forwards;`
            },
            pulse: {
                keyframes: `@keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.7; }
                }`,
                style: `animation: pulse ${duration}s ease-in-out ${loop ? 'infinite' : 'forwards'};`
            },
            spin: {
                keyframes: `@keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }`,
                style: `animation: spin ${duration}s linear ${loop ? 'infinite' : 'forwards'};`
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
                style: `animation: colorCycle ${duration}s linear ${loop ? 'infinite' : 'forwards'};`
            },
        };

        const anim = animations[animType] || animations.draw;
        let animationCSS = anim.keyframes;

        if (direction === 'reverse') {
            animationCSS = animationCSS.replace('from', 'TO_TEMP').replace('to', 'from').replace('TO_TEMP', 'to');
        } else if (direction === 'alternate') {
            animationCSS += '\n' + animationCSS.replace('@keyframes', '@keyframes reverse');
        }

        styleElement.textContent = (styleElement.textContent || '') + '\n' + animationCSS;

        // Apply to paths
        pathsToAnimate.forEach((path, index) => {
            if (!path) return;
            if (animType === 'draw') {
                try {
                    const pathLength = path.element.getTotalLength();
                    path.element.style.setProperty('--path-length', String(pathLength));
                    path.element.style.strokeDasharray = String(pathLength);
                    path.element.style.strokeDashoffset = String(pathLength);
                } catch (e) {
                    // Fallback
                }
            }
            path.element.style.cssText = (path.element.style.cssText || '') + anim.style;
            path.element.style.animationDelay = `${index * delay}s`;
            if (loop) {
                path.element.style.animationIterationCount = 'infinite';
            }
            if (direction === 'alternate') {
                path.element.style.animationDirection = 'alternate';
            }
        });

        renderSVG();
        alert(`CSS animation "${animType}" applied to ${pathsToAnimate.length} path(s)!`);
    };

    const applyGSAPAnimation = () => {
        if (!hasGSAP) {
            alert('GSAP is not loaded. Use CSS animations instead.');
            return;
        }

        if (!state.svgElement) return;

        saveState();

        const pathsToAnimate = selectedCount > 0 
            ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p)
            : state.paths;

        if (pathsToAnimate.length === 0) {
            alert('No paths to animate');
            return;
        }

        const gsap = (window as any).gsap;

        // Clear existing animations
        pathsToAnimate.forEach(path => {
            if (!path) return;
            if ((path.element as any)._gsap) {
                gsap.killTweensOf(path.element);
            }
        });

        const animations: Record<string, (el: SVGElement) => void> = {
            fade: (el) => gsap.from(el, { opacity: 0, duration, ease: easing }),
            scale: (el) => gsap.from(el, { scale: 0, opacity: 0, duration, ease: easing }),
            rotate: (el) => gsap.from(el, { rotation: -180, scale: 0, opacity: 0, duration, ease: easing }),
            slide: (el) => gsap.from(el, { y: -50, opacity: 0, duration, ease: easing }),
            bounce: (el) => gsap.from(el, { scale: 0, opacity: 0, duration, ease: 'bounce.out' }),
            pulse: (el) => gsap.to(el, { scale: 1.05, opacity: 0.7, duration: duration / 2, yoyo: true, repeat: loop ? -1 : 0, ease: easing }),
            spin: (el) => gsap.to(el, { rotation: 360, duration, repeat: loop ? -1 : 0, ease: 'none' }),
            draw: (el) => {
                try {
                    const pathLength = (el as SVGPathElement).getTotalLength();
                    gsap.fromTo(el,
                        { strokeDasharray: pathLength, strokeDashoffset: pathLength },
                        { strokeDashoffset: 0, duration, ease: easing }
                    );
                } catch (e) {
                    gsap.from(el, { opacity: 0, duration, ease: easing });
                }
            },
        };

        const animFunc = animations[animType];
        if (!animFunc) {
            alert('Animation type not supported');
            return;
        }

        pathsToAnimate.forEach((path, index) => {
            if (!path) return;
            gsap.delayedCall(index * delay, () => {
                animFunc(path.element);
            });
        });

        renderSVG();
        alert(`GSAP animation "${animType}" applied to ${pathsToAnimate.length} path(s)!`);
    };

    const removeAnimations = () => {
        if (!state.svgElement) return;

        saveState();

        const pathsToClean = selectedCount > 0 
            ? Array.from(state.selectedPaths).map(id => state.paths.find(p => p.id === id)).filter(p => p)
            : state.paths;

        pathsToClean.forEach(path => {
            if (!path) return;
            path.element.style.animation = '';
            path.element.style.strokeDasharray = '';
            path.element.style.strokeDashoffset = '';
            if (hasGSAP && (path.element as any)._gsap) {
                (window as any).gsap.killTweensOf(path.element);
            }
        });

        renderSVG();
        alert('Animations removed!');
    };

    return (
        <div className="tool-panel-content">
            <div className="tool-explanation">
                <h3>Path Animator</h3>
                <p>Create animations for your SVG paths. Choose from multiple animation types including drawing effects, fades, and more.</p>
                <p><strong>When to use:</strong> After finalizing your design, use this to add motion. Works best after optimizing your SVG.</p>
            </div>

            <div className="tool-section" style={{ 
                padding: '1rem', 
                background: selectedCount > 0 ? 'rgba(74, 144, 226, 0.1)' : 'var(--bg-secondary)', 
                borderRadius: 'var(--border-radius)', 
                border: `2px solid ${selectedCount > 0 ? 'var(--primary-color)' : 'var(--border-color)'}`, 
                marginBottom: '1.5rem' 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong style={{ fontSize: '1rem' }}>Animating:</strong>
                        <span style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginLeft: '0.5rem' }}>
                            {targetPaths}
                        </span> path(s)
                    </div>
                    {selectedCount > 0 ? (
                        <button className="btn btn-small" onClick={() => updateState({ currentPanel: 'workflow' })}>
                            Change Selection
                        </button>
                    ) : (
                        <button className="btn btn-small" onClick={() => {
                            const allIds = new Set(state.paths.map(p => p.id));
                            setSelectedPaths(allIds);
                        }}>
                            Select All
                        </button>
                    )}
                </div>
            </div>

            {hasGSAP && (
                <div className="tool-section">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={useGSAP}
                            onChange={(e) => setUseGSAP(e.target.checked)}
                        />
                        <span>✨ Use GSAP (smoother animations)</span>
                    </label>
                </div>
            )}

            <div className="tool-section">
                <label className="form-label">Animation Type</label>
                <select
                    className="form-input"
                    value={animType}
                    onChange={(e) => setAnimType(e.target.value)}
                >
                    <option value="draw">Draw (Stroke animation)</option>
                    <option value="fade">Fade In</option>
                    <option value="scale">Scale</option>
                    <option value="rotate">Rotate</option>
                    <option value="slide">Slide</option>
                    <option value="pulse">Pulse</option>
                    {hasGSAP && <option value="bounce">Bounce (GSAP only)</option>}
                    <option value="spin">Spin</option>
                    <option value="colorCycle">Color Cycle</option>
                </select>
            </div>

            <div className="tool-section">
                <label className="form-label">Duration: {duration}s</label>
                <input
                    type="range"
                    className="form-input"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value))}
                />
            </div>

            <div className="tool-section">
                <label className="form-label">Delay between paths: {delay}s</label>
                <input
                    type="range"
                    className="form-input"
                    min="0"
                    max="2"
                    step="0.1"
                    value={delay}
                    onChange={(e) => setDelay(parseFloat(e.target.value))}
                />
            </div>

            <div className="tool-section">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={loop}
                        onChange={(e) => setLoop(e.target.checked)}
                    />
                    <span>Loop animation</span>
                </label>
            </div>

            <div className="tool-section">
                <label className="form-label">Direction</label>
                <select
                    className="form-input"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                >
                    <option value="normal">Normal</option>
                    <option value="reverse">Reverse</option>
                    <option value="alternate">Alternate</option>
                </select>
            </div>

            <div className="tool-section">
                <button 
                    className="btn btn-primary" 
                    onClick={useGSAP && hasGSAP ? applyGSAPAnimation : applyCSSAnimation}
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                    disabled={targetPaths === 0}
                >
                    {useGSAP && hasGSAP ? '✨ Apply GSAP Animation' : 'Apply CSS Animation'}
                </button>
                <button 
                    className="btn btn-secondary" 
                    onClick={removeAnimations}
                    style={{ width: '100%' }}
                    disabled={targetPaths === 0}
                >
                    Remove Animations
                </button>
            </div>
        </div>
    );
};

export default Animator;

