// Global type definitions for external libraries

declare global {
    interface Window {
        app: any; // For backward compatibility with inline handlers
        SVG: any; // SVG.js
        paper: any; // Paper.js
        QRCode: any; // QRCode library
        gsap: any; // GSAP
    }
}

export {};

