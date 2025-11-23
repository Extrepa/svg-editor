// Utility functions for SVG manipulation and coordinate conversion

/**
 * Convert screen coordinates to SVG coordinates
 */
export function screenToSVG(svg: SVGSVGElement, screenX: number, screenY: number): { x: number; y: number } {
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

/**
 * Parse SVG path data into array of commands with coordinates
 */
export function parsePathData(d: string): Array<{
    cmd: string;
    args: number[];
    points: Array<{ x: number; y: number; type: string }>;
    original: string;
}> {
    const commands: Array<{
        cmd: string;
        args: number[];
        points: Array<{ x: number; y: number; type: string }>;
        original: string;
    }> = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match;
    let currentX = 0, currentY = 0;
    let startX = 0, startY = 0;
    
    while ((match = regex.exec(d)) !== null) {
        const cmd = match[1];
        const args = match[2].trim().split(/[\s,]+/).filter(s => s).map(Number);
        const isRelative = cmd === cmd.toLowerCase();
        const absCmd = cmd.toUpperCase();
        
        const points: Array<{ x: number; y: number; type: string }> = [];
        
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
                    points.push({ x: args[0], y: args[1], type: 'control' });
                    points.push({ x: args[2], y: args[3], type: 'control' });
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

/**
 * Get all attributes from an element as an object
 */
export function getAllAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    Array.from(element.attributes).forEach(attr => {
        attrs[attr.name] = attr.value;
    });
    return attrs;
}

/**
 * Find the parent group element of an SVG element
 */
export function findParentGroup(element: Element): string | null {
    let parent = element.parentElement;
    while (parent && parent.tagName !== 'svg') {
        if (parent.tagName === 'g') {
            return parent.id || null;
        }
        parent = parent.parentElement;
    }
    return null;
}

