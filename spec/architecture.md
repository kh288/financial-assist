# Foundational Architecture Rules

**Status**: Active — applies to all features going forward
**Last updated**: 2026-03-16

---

## Core Principle

`App.tsx` is a **thin orchestrator only**. It owns top-level state and wires pieces together — it does not contain business logic, data transformation, or non-trivial side effects. Every new feature should be broken into the appropriate layer before any code touches `App.tsx`.

---

## Directory Structure

```
src/
├── lib/              # Pure logic — no React, no JSX
│   ├── types.ts      # All shared TypeScript interfaces and types
│   ├── calculator.ts # Simulation engine
│   └── *.ts          # Any future pure functions (formatters, validators, etc.)
│
├── hooks/            # Custom React hooks
│   └── *.ts          # Stateful logic extracted from components
│
├── components/       # UI components — presentational and self-contained
│   └── *.tsx
│
└── App.tsx           # State wiring, layout skeleton, route-level concerns only
```

---

## Rules by Layer

### `src/lib/` — Pure Logic
- No React imports, no hooks, no JSX
- All functions must be pure (same input → same output, no side effects)
- New calculation logic, data transformation, or formatting utilities go here first
- **Examples**: simulation engine, number formatters, debt sorters, validation helpers

### `src/hooks/` — Custom Hooks
- Stateful logic that doesn't belong in a single component goes here
- A hook should have a single clear responsibility
- **Examples**: `useLocalStorage`, `useTheme`, `useSimulation`
- If logic in App.tsx grows beyond a few lines, extract it to a hook

### `src/components/` — UI Components
- Each component owns its own local state and presentation
- Props in, events out — no direct access to global state
- If a component file exceeds ~150 lines, consider splitting it
- **Examples**: `DebtInput`, `StrategyChart`, `SummaryPanel`

### `App.tsx` — Orchestrator Only
- Allowed: `useState` for top-level shared state, `useEffect` for global side effects (theme, storage sync), layout JSX, passing props down, calling handlers
- Not allowed: calculation logic, data transformation, fetch calls, complex conditionals
- If App.tsx grows past ~120 lines of logic (excluding JSX), something needs to be extracted

---

## Decision Guide for New Features

| What you're adding | Where it goes |
|---|---|
| New calculation or formula | `src/lib/` |
| New TypeScript type or interface | `src/lib/types.ts` |
| Reusable stateful logic | `src/hooks/` |
| New UI section or input group | `src/components/` |
| New persistent state field | Hook or `App.tsx` state + localStorage sync |
| Global side effect (theme, title, etc.) | `App.tsx` `useEffect` or `src/hooks/useTheme.ts` |

---

## Current Tech Decisions to Respect

- **React Compiler is active** — do not add `useMemo` or `useCallback` manually unless there is a documented reason the compiler can't handle it
- **No routing yet** — everything is single-page; add a router only when a second distinct page is needed
- **No UI component library** — style with CSS variables from `index.css`; extend `App.css` for new component styles
- **Chart.js via react-chartjs-2** — all chart instances use the existing registered components; register new Chart.js plugins/scales at the top of the relevant component file
