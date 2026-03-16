# Dividend vs. Debt-First

**Live site**: https://kh288.github.io/financial-assist/

A financial strategy comparison tool that simulates three approaches to balancing debt payoff and dividend investing over a custom time horizon. See exactly when each strategy overtakes another — and which leaves you in the best position at the end.

## Strategies

| | A — Dividend-First | B — Aggressive | C — Balanced |
|---|---|---|---|
| **Debt payment** | Fixed amortized minimum (guarantees payoff at horizon end) | Full contribution, avalanche until clear | 50% of contribution, avalanche |
| **Investment** | Everything above the minimum | $0 during debt phase | 50% of contribution |
| **Debt-free** | Guaranteed at horizon | Earliest possible | Dynamic |
| **Tradeoff** | Maximum early dividends | Lowest total interest | Steady balance of both |

All three strategies use the same monthly contribution, keeping the comparison fair.

## Features

- **Interactive chart** — net worth, portfolio value, and debt lines for all three strategies; toggle datasets via the legend
- **Crossover markers** — vertical lines showing when A or C first overtakes B in net worth
- **Summary table** — side-by-side comparison with winners highlighted per row (debt-free date, interest paid, dividends earned, final portfolio, final net worth)
- **DRIP toggle** — reinvest dividends into the portfolio or pocket them as income
- **Light / dark mode** — initializes from system preference, manually toggleable
- **Persistent form state** — all inputs saved to `localStorage` and restored on reload

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

```bash
npm run dev        # Development server with HMR
npm run build      # Type-check and build for production
npm run preview    # Preview the production build locally
npm run lint       # Run ESLint
npm test           # Run tests (Vitest)
npm run test:watch # Run tests in watch mode
```

## Project Structure

```
src/
├── lib/
│   ├── types.ts          # Shared TypeScript interfaces
│   └── calculator.ts     # Simulation engine (pure functions, no React)
├── hooks/
│   ├── useFormState.ts   # Form state + localStorage persistence
│   └── useTheme.ts       # Light/dark theme toggle
├── components/
│   ├── InvestmentForm.tsx # Portfolio value, contribution, yield, DRIP
│   ├── SettingsForm.tsx   # Time horizon, dividend tax rate
│   ├── DebtInput.tsx      # Debt card list with add/remove
│   ├── StrategyChart.tsx  # Chart.js multi-line chart with crossover markers
│   ├── SummaryPanel.tsx   # Comparison table and crossover banners
│   └── ThemeToggle.tsx    # Sun/moon toggle button
└── App.tsx               # Thin orchestrator — wires form → simulation → results
```

## How the Simulation Works

Each strategy runs a month-by-month tick over the full time horizon:

1. **Accrue interest** on all debts with remaining balance
2. **Calculate dividend income** from the current portfolio
3. **Apply payments and investments** per strategy rules
4. **Record a snapshot** (portfolio, debt, net worth, dividends, interest paid)

Debt payments always follow **avalanche order** (highest APR first). See [`spec/strategy-comparison.md`](spec/strategy-comparison.md) for the full specification.

## Tech Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite 8](https://vite.dev) with React Compiler
- [Chart.js 4](https://www.chartjs.org) via [react-chartjs-2](https://react-chartjs-2.js.org)
- [Vitest](https://vitest.dev) for unit tests
