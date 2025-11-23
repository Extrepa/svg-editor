# SVG Layer Toolkit - React + TypeScript Setup

This project has been refactored to use React with TypeScript.

## Project Structure

```
src/
├── components/          # React components (.tsx)
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── PreviewArea.tsx
│   ├── ToolPanel.tsx
│   └── HistoryBar.tsx
├── context/            # React Context providers
│   └── AppContext.tsx  # App-wide state management
├── hooks/              # Custom React hooks
│   └── useAppState.ts  # State management hook
├── types/              # TypeScript type definitions
│   ├── index.ts        # Main type definitions
│   └── global.d.ts     # Global type declarations
├── utils/              # Utility functions
│   └── helpers.ts      # SVG manipulation utilities
├── App.tsx             # Main App component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Preview Production Build**
   ```bash
   npm run preview
   ```

## TypeScript Configuration

- **tsconfig.json** - Main TypeScript configuration
- **tsconfig.node.json** - Node-specific TypeScript config for Vite
- Strict mode enabled for type safety

## React Architecture

- **Context API**: Used for global state management via `AppContext`
- **Custom Hooks**: `useAppState` manages application state
- **Components**: Functional components with TypeScript
- **Props**: All components use proper TypeScript interfaces

## Key Features

- ✅ Full TypeScript support
- ✅ React 18 with hooks
- ✅ Context-based state management
- ✅ Type-safe component props
- ✅ Vite for fast development and building
- ✅ Strict TypeScript checking

## Next Steps

1. Migrate logic from `app.js` to React components
2. Create tool panel components for each tool
3. Implement SVG manipulation hooks
4. Add file operation hooks
5. Convert all `render*` methods to React components

