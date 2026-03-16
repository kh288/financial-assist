# Spec: Dividend vs. Debt-First Strategy Comparison

**Status**: Draft v1 — subject to change
**Last updated**: 2026-03-16

---

## Goal

Give users a visual tool to compare two financial strategies side-by-side over time, so they can see *when* (or if) investing in dividends first outperforms paying off debt first.

---

## The Two Strategies

### Strategy A — Dividend First
- User invests monthly into dividends immediately
- Dividend income is directed toward debt payoff (and/or reinvested — user's choice)
- Debt shrinks over time via dividend income + any minimum/extra payments

### Strategy B — Debt First
- All available monthly cash goes toward debt until it's eliminated
- Once debt-free, the full monthly amount pivots to dividend investing
- No dividends until debt is resolved

**Key constraint**: The total monthly cash input is the **same fixed amount** across both strategies. This keeps the comparison fair.

---

## Form Inputs

### Debts Section
- Add one or more debts via a **+ Add Debt** button
- Each debt entry includes:
  - Label (e.g. "Car Loan", "Credit Card")
  - Balance ($)
  - Interest Rate (APR %)
  - Minimum Monthly Payment ($)
  - **Pauseable?** — toggle (yes/no). Determines if this debt's payments can be paused in Strategy A to redirect cash toward dividends
  - Payment strategy selector: **Minimum only** vs **All extra cash**

### Dividend / Investment Section
- Total amount currently invested ($)
- Monthly contribution ($) — shared input used by both strategies
- Dividend Yield (% annually) — manual input field
  - Stretch goal: dividend stock search if a free API is available (e.g. Yahoo Finance unofficial, Financial Modeling Prep free tier)
- **DRIP toggle** (Dividend Reinvestment Plan):
  - ON: dividends are reinvested back into principal
  - OFF: dividends are pocketed / directed toward debt
- Dividend frequency: Monthly / Quarterly / Annually (select)

### Simulation Settings
- Time horizon (years) — e.g. 1–30 year slider or input
- Tax rate on dividends (%) — optional field; used in summary callouts
  - Qualified vs ordinary dividend rate toggle (stretch)
- Starting date (defaults to today, used for labeling chart x-axis)

---

## Calculation Engine

### Shared Inputs Per Month (tick)
- Available cash = monthly contribution
- Dividend income = (portfolio value × annual yield) ÷ 12

### Strategy A Monthly Tick
1. Collect dividend income
2. If DRIP ON: reinvest dividends (add to portfolio)
3. If DRIP OFF: apply dividends to debt (highest rate first, or order entered)
4. Pay minimums (or extra) on non-paused debts
5. Invest remaining cash into portfolio

### Strategy B Monthly Tick
1. No dividends yet (portfolio = 0 until debt is cleared)
2. Apply all available cash to debt (minimum or aggressive payoff)
3. Once all debt = $0: switch to full investment mode
4. From that point: same as Strategy A but from a later start

### Tracked Data Points (per month, per strategy)
- Portfolio value
- Total debt remaining
- Net worth (portfolio − debt)
- Cumulative dividends earned
- Cumulative interest paid on debt
- Monthly dividend income

---

## Visualization

### Primary: Multi-Line Chart (Chart.js)
- X-axis: Time (months or years)
- Y-axis: Dollar value
- Lines:
  - Strategy A — Net Worth
  - Strategy B — Net Worth
  - Strategy A — Portfolio Value
  - Strategy B — Portfolio Value
  - Strategy A — Remaining Debt
  - Strategy B — Remaining Debt
- Lines can be toggled on/off via legend clicks (Chart.js supports this natively)

### Crossover Point
- Visually marked on the chart (vertical dashed line + annotation label)
- "Strategy A overtakes Strategy B at Month X (Year Y)"
- If Strategy B never loses, note that too

### Summary Panel (below or beside chart)
- Side-by-side stat cards:
  - Debt-free date (each strategy)
  - Total interest paid (each strategy)
  - Portfolio value at end of horizon (each strategy)
  - Total dividends earned (each strategy)
  - Net worth at end of horizon (each strategy)
- Tax callout: estimated tax owed on dividends if tax rate was provided

---

## Page Layout

- **Top**: Form (collapsible sections — Debts, Investment, Settings)
- **Bottom**: Chart + Summary panel
- Form changes update the chart in real-time (or via a "Calculate" button — TBD)
- Single-page layout, no routing needed initially

---

## Tech Notes

- **Chart.js** for visualization (multi-dataset line chart)
- No paid APIs for now; dividend yield is manual input
  - Revisit: Yahoo Finance scrape or Financial Modeling Prep free tier (250 req/day)
- Calculation engine will be a pure TypeScript function (no side effects) for easy testing
- All state lives in the single page component for now; can be lifted later

---

## Out of Scope (v1)

- Multiple portfolios / asset types
- Inflation adjustment
- Social Security / retirement account rules (401k, IRA)
- Brokerage fee modeling
- Mobile-optimized layout (can revisit)

---

## Open Questions

- Should debt payoff in Strategy A follow avalanche (highest rate first) or avalanche/snowball toggle?
- Real-time recalculation vs. explicit "Run" button — which feels better UX-wise?
- If a debt is pauseable in Strategy A, does it still accrue interest during the pause?
