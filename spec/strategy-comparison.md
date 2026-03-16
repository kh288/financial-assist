# Spec: Strategy Comparison Tool

**Status**: Active — reflects current implementation
**Last updated**: 2026-03-16

---

## Goal

Give users a visual tool to compare three financial strategies over time, so they can see which approach to balancing debt payoff and dividend investing leaves them in the best financial position — and exactly when each strategy overtakes another.

---

## The Three Strategies

### Strategy A — Dividend-First
- Calculate a **fixed amortized payment** per debt at simulation start (from original balance over the full horizon) — stays constant for the entire run, guaranteeing payoff by the end
- This is the **minimum required payment** to guarantee debt payoff at the horizon; all remaining cash is invested to maximize dividend income
- **DRIP ON**: dividends compound back into portfolio
- **DRIP OFF**: dividends are pocketed as income (tracked but not reinvested or applied to debt)
- Debt-free date is guaranteed at or before the end of the horizon

### Strategy B — Aggressive
- Put the **full monthly contribution** toward debt every month (avalanche — highest APR first) until all debts are eliminated
- Existing portfolio compounds with dividends during the debt phase regardless of the DRIP setting
- Once debt-free: full monthly contribution + dividends flow into portfolio per DRIP setting
- Debt-free date is the earliest of the three strategies

### Strategy C — Balanced 50/50
- Each month, **split the monthly contribution evenly**: 50% goes to debt (avalanche — highest APR first), 50% goes to the portfolio
- If the 50% debt allocation clears all remaining debt before it's exhausted, the surplus overflows to the portfolio that month
- Once debt-free: the full monthly contribution flows into the portfolio
- **DRIP ON**: dividends compound into portfolio
- **DRIP OFF**: dividends are pocketed as income (tracked but not reinvested)
- Debt-free date is **dynamic** — determined by when the 50% allocation outpaces accruing interest; may occur before or after the horizon

**Key constraint**: The total monthly cash input is the **same fixed amount** across all three strategies. This keeps the comparison fair.

**Payoff constraint**: Strategies A and B guarantee that every debt is paid off by the end of the time horizon. Strategy C does not — payoff depends on whether the 50% debt allocation is sufficient to outpace interest.

---

## How The Strategies Differ

| | Strategy A | Strategy B | Strategy C |
|---|---|---|---|
| **Debt payments** | Fixed amortized minimum (guarantees payoff at horizon end) | Full contribution, avalanche until clear | 50% of contribution, avalanche |
| **Investment** | Everything above the amortized minimum | $0 during debt phase | 50% of contribution |
| **Dividends (DRIP ON)** | → Portfolio | → Portfolio (during & after) | → Portfolio |
| **Dividends (DRIP OFF)** | Pocketed (tracked only) | → Portfolio after debt-free | Pocketed (tracked only) |
| **Debt-free timing** | Guaranteed by horizon (fixed schedule) | Earliest — all cash to debt | Dynamic (depends on 50% allocation vs interest) |
| **Early investment** | Maximum — investing from day one | None — waits until debt-free | Moderate — half invested from day one |

---

## Form Inputs

### Investment Section
- Current portfolio value ($)
- Monthly contribution ($) — shared across all strategies
- Dividend yield (% annually) — manual input; no live stock data in v1
- **DRIP toggle**: ON = reinvest dividends / OFF = pocket dividends

### Debts Section
- Add one or more debts via **+ Add Debt**
- Each debt includes:
  - Label (e.g. "Car Loan", "Credit Card")
  - Balance ($)
  - APR (%)
  - Minimum Monthly Payment ($)
- **Live paycheck callout** below the debt list: shows what each strategy allocates from paycheck per month toward debt, updated as debts and horizon change

### Settings Section
- Time horizon (years) — determines simulation length and Strategy A's amortization target
- Dividend tax rate (%) — used in post-calculation summary estimate only

---

## Calculation Engine

### Per-Month Tick (all strategies)
1. Accrue interest on all debts with remaining balance: `balance += balance × (APR / 12)`
2. Calculate dividend income: `portfolio × (yield% / 12)`
3. Apply payments and investments per strategy rules (see above)
4. Record snapshot

### Avalanche Ordering
Debt payments always target the **highest APR debt first**.

### Tracked Data Per Month Per Strategy
- Portfolio value
- Total debt remaining
- Net worth (portfolio − debt)
- Cumulative dividends earned
- Cumulative interest paid
- Monthly dividend income

---

## Visualization

### Multi-Line Chart (Chart.js)
- X-axis: Time in months, labeled at year boundaries (Yr 1, Yr 2…)
- Y-axis: Dollar value
- **9 datasets total** (3 strategies × net worth / portfolio / debt):
  - Net worth lines: solid, 2.5px — **visible by default**
  - Portfolio lines: dashed — **hidden by default**, togglable via legend
  - Debt lines: dotted, shown as negative values — **hidden by default**, togglable via legend
- Colors: A = green · B = blue · C = amber

### Crossover Annotations
- Two vertical dashed lines drawn on the chart:
  - **A > B**: when Strategy A net worth first overtakes Strategy B (green line)
  - **C > B**: when Strategy C net worth first overtakes Strategy B (amber line)
- If a crossover doesn't occur within the horizon, it's noted in the summary instead

### Summary Panel
- Three-column comparison table (A / B / C) with per-row winner highlighted
- Rows: Debt-Free date · Paycheck/mo to Debt · Total Interest Paid · Total Dividends Earned · Portfolio at Yr N · Net Worth at Yr N
- Two crossover banners (A > B and C > B) above the table
- Tax estimate note at the bottom if a tax rate was entered

---

## UX Decisions (resolved)

| Question | Decision |
|---|---|
| Real-time vs. Calculate button | **Calculate button** — avoids jitter on complex inputs |
| Debt payoff order | **Avalanche** (highest APR first) |
| Form persistence | **localStorage** — all inputs saved and restored on reload |
| Light/dark mode | **Manual toggle** — initializes from system preference |

---

## Architecture

See [architecture.md](./architecture.md) for full rules. Summary:
- `src/lib/` — pure TypeScript (types, calculator)
- `src/hooks/` — `useTheme`, `useFormState`
- `src/components/` — `InvestmentForm`, `SettingsForm`, `DebtInput`, `ThemeToggle`, `StrategyChart`, `SummaryPanel`
- `src/App.tsx` — thin orchestrator only

---

## Out of Scope (v1)

- Dividend stock/fund search (no free reliable API; manual yield input only)
- Dividend frequency selection (quarterly/annual) — currently simulated as monthly
- Inflation adjustment
- Retirement account rules (401k, IRA, Roth)
- Brokerage fee modeling
- Qualified vs. ordinary dividend tax rate distinction
- Mobile-optimized layout
- Starting date input (chart labels are relative to horizon, not calendar dates)
- Collapsible form sections

---

## Stretch Goals

- Free dividend data: Financial Modeling Prep free tier (250 req/day) or Yahoo Finance
- Snowball vs. avalanche toggle for debt payoff order
- Dividend frequency (monthly / quarterly / annual) affecting cash flow timing
- Export results as PDF or CSV
- Adjustable split ratio for Strategy C (e.g. 60/40 instead of fixed 50/50)
