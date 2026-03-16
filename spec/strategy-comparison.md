# Spec: Strategy Comparison Tool

**Status**: Active — reflects current implementation
**Last updated**: 2026-03-16

---

## Goal

Give users a visual tool to compare three financial strategies over time, so they can see which approach to balancing debt payoff and dividend investing leaves them in the best financial position — and exactly when each strategy overtakes another.

---

## The Three Strategies

### Strategy A — Scheduled
- Calculate a **fixed amortized payment** per debt at simulation start (from original balance over the full horizon) — stays constant for the entire run, guaranteeing payoff by the end
- Pay that fixed amount from the monthly contribution each month; invest the rest
- **DRIP ON**: dividends compound back into portfolio
- **DRIP OFF**: dividends are pocketed as income (tracked but not reinvested or applied to debt)
- Debt-free date is guaranteed at or before the end of the horizon (exactly at the horizon if no DRIP-off acceleration)

### Strategy B — Aggressive
- Put the **full monthly contribution** toward debt every month (avalanche — highest APR first) until all debts are eliminated
- Existing portfolio compounds with DRIP during the debt phase regardless of the DRIP setting
- Once debt-free: full monthly contribution + dividends flow into portfolio per DRIP setting
- Debt-free date is the earliest of the three strategies

### Strategy C — Balanced
- Calculate a **fixed monthly payment** per debt at simulation start (amortization from original balance over the full horizon) — this amount stays constant for the entire run
- Pay that fixed amount from the monthly contribution each month; invest the rest
- **DRIP ON**: dividends compound into portfolio
- **DRIP OFF**: dividends apply to pauseable debts first (highest APR), then non-pauseable, then portfolio
- Debt-free date is **dynamic** — because interest accrues before the fixed payment each month, and dividends may chip away at debt additionally, the actual payoff can come *before* the horizon

**Key constraint**: The total monthly cash input is the **same fixed amount** across all three strategies. This keeps the comparison fair.

**Payoff constraint**: All three strategies guarantee that every debt is paid off by the end of the time horizon. A does this via a fixed amortized schedule; B does this by throwing all available cash at debt aggressively; C does this via a fixed amortized schedule for non-pauseable debts, with dividends further accelerating payoff of pauseable ones.

---

## Pauseable Debts

A debt can be marked **Pauseable**:
- In Strategy A: all debts (pauseable or not) receive the same fixed amortized payment — pauseable has no effect
- In Strategy B: all debts receive aggressive paydown regardless of the flag
- In Strategy C with DRIP OFF: dividend income targets pauseable debts first (highest APR), then non-pauseable, then portfolio
- Pauseable debts **always continue to accrue interest** — there is no true payment pause

The "pauseable" flag is primarily a hint to direct dividend income toward certain debts first in Strategy C (DRIP OFF).

---

## Payment Rules Summary

| | Strategy A | Strategy B | Strategy C |
|---|---|---|---|
| Monthly debt payment | Fixed amortization (calculated once from original balance, covers all debts) | Full monthly contribution (avalanche until clear) | Fixed amortization (calculated once from original balance, non-pauseable debts only) |
| Monthly investment | Contribution minus fixed payments | $0 during debt phase | Contribution minus fixed payments |
| Dividends (DRIP ON) | → Portfolio | → Portfolio (during & after) | → Portfolio |
| Dividends (DRIP OFF) | Pocketed (tracked only) | → Portfolio after debt-free | → Pauseable debts → Non-pauseable debts → Portfolio |
| Debt-free timing | Guaranteed by horizon (fixed schedule) | Earliest — all cash to debt | Dynamic (typically before horizon via dividend acceleration) |

---

## Form Inputs

### Investment Section
- Current portfolio value ($)
- Monthly contribution ($) — shared across all strategies
- Dividend yield (% annually) — manual input; no live stock data in v1
- **DRIP toggle**: ON = reinvest dividends / OFF = pocket or redirect dividends

### Debts Section
- Add one or more debts via **+ Add Debt**
- Each debt includes:
  - Label (e.g. "Car Loan", "Credit Card")
  - Balance ($)
  - APR (%)
  - Minimum Monthly Payment ($)
  - **Pauseable?** toggle — directs dividend income to this debt first in Strategy C (DRIP OFF)
  - **Payment Strategy** selector (Minimum / Aggressive) — UI present, primarily affects Strategy B's ordering
- **Live paycheck callout** below the debt list: shows what each strategy pays from paycheck per month toward debt, updated as debts and horizon change

### Settings Section
- Time horizon (years) — determines simulation length and Strategy B/C amortization targets
- Dividend tax rate (%) — used in post-calculation summary estimate only

---

## Calculation Engine

### Per-Month Tick (all strategies)
1. Accrue interest on all debts with remaining balance: `balance += balance × (APR / 12)`
2. Calculate dividend income: `portfolio × (yield% / 12)`
3. Apply payments and investments per strategy rules (see above)
4. Record snapshot

### Avalanche Ordering
Debt payments always target the **highest APR debt first**. Within the pauseable/non-pauseable grouping in Strategy C (DRIP OFF), avalanche still applies within each group.

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
| Pauseable debt interest during pause | **Yes, always accrues** |
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
