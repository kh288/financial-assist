# financial-assist — Project Overview

## Stack

| Tool | Version |
|---|---|
| React | ^19.2.4 |
| TypeScript | ~5.9.3 |
| Vite | ^8.0.0 |
| ESLint | ^9.39.4 |

## Key Details

- **Module system**: ESM (`"type": "module"`)
- **JSX transform**: `@vitejs/plugin-react` ^6.0.0
- **React Compiler**: enabled via `babel-plugin-react-compiler` + `@rolldown/plugin-babel` (configured in [vite.config.ts](../vite.config.ts))
- **Linting**: `typescript-eslint` ^8.56.1 + `eslint-plugin-react-hooks` ^7.0.1 + `eslint-plugin-react-refresh`

## Project Structure (initial)

```
financial-assist/
├── public/
│   ├── favicon.svg
│   └── icons.svg          # SVG sprite sheet
├── src/
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── App.tsx            # Root component (boilerplate only)
│   ├── App.css
│   ├── index.css
│   └── main.tsx           # Entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── package.json
```

## Notes

- React Compiler is active — avoid manual `useMemo`/`useCallback` where the compiler can handle it.
- App.tsx is boilerplate; ready to be replaced with actual app structure.
- No routing, state management, or UI library installed yet.
