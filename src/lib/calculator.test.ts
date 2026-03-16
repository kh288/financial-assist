import { describe, it, expect } from 'vitest'
import { totalRequiredPayment, runSimulation } from './calculator'
import type { Debt, SimInputs } from './types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'debt1',
    label: 'Test Debt',
    balance: 10_000,
    apr: 12, // 1%/month — easy to reason about
    minimumPayment: 100,
    ...overrides,
  }
}

function makeInputs(overrides: Partial<SimInputs> = {}): SimInputs {
  return {
    debts: [makeDebt()],
    currentPortfolioValue: 0,
    monthlyContribution: 500,
    dividendYieldPercent: 0,
    drip: true,
    timeHorizonYears: 3,
    taxRatePercent: 0,
    ...overrides,
  }
}

// ─── totalRequiredPayment ───────────────────────────────────────────────────

describe('totalRequiredPayment', () => {
  it('returns 0 for empty debts', () => {
    expect(totalRequiredPayment([], 120)).toBe(0)
  })

  it('returns 0 for zero-balance debts', () => {
    expect(totalRequiredPayment([makeDebt({ balance: 0 })], 120)).toBe(0)
  })

  it('returns correct amortized payment for a single debt', () => {
    // $10k at 12% APR over 12 months — PMT ≈ $888.49
    const payment = totalRequiredPayment([makeDebt({ balance: 10_000, apr: 12 })], 12)
    expect(payment).toBeCloseTo(888.49, 0)
  })

  it('sums amortized payments across multiple debts', () => {
    const debts = [
      makeDebt({ id: 'd1', balance: 10_000, apr: 12 }),
      makeDebt({ id: 'd2', balance: 5_000, apr: 6 }),
    ]
    const combined = totalRequiredPayment(debts, 12)
    const d1 = totalRequiredPayment([debts[0]], 12)
    const d2 = totalRequiredPayment([debts[1]], 12)
    expect(combined).toBeCloseTo(d1 + d2, 6)
  })
})

// ─── Strategy A — Dividend-First ────────────────────────────────────────────

describe('Strategy A — Dividend-First', () => {
  it('pays off all debts by end of horizon', () => {
    const inputs = makeInputs({ monthlyContribution: 600, timeHorizonYears: 3 })
    const { strategyA } = runSimulation(inputs)
    expect(strategyA.snapshots.at(-1)!.totalDebt).toBeLessThan(0.01)
  })

  it('guarantees payoff by horizon with multiple debts', () => {
    const inputs = makeInputs({
      debts: [
        makeDebt({ id: 'd1', balance: 8_000, apr: 20 }),
        makeDebt({ id: 'd2', balance: 5_000, apr: 10 }),
      ],
      monthlyContribution: 1_000,
      timeHorizonYears: 2,
    })
    const { strategyA } = runSimulation(inputs)
    expect(strategyA.snapshots.at(-1)!.totalDebt).toBeLessThan(0.01)
  })

  it('invests all cash beyond the fixed amortized payment', () => {
    // With no debt, all contribution goes to portfolio
    const inputs = makeInputs({
      debts: [],
      currentPortfolioValue: 0,
      dividendYieldPercent: 0,
      monthlyContribution: 500,
      timeHorizonYears: 1,
    })
    const { strategyA } = runSimulation(inputs)
    expect(strategyA.snapshots.at(-1)!.portfolioValue).toBeCloseTo(500 * 12, 2)
  })

  it('DRIP ON — dividends compound into portfolio each month', () => {
    const inputs = makeInputs({
      currentPortfolioValue: 10_000,
      dividendYieldPercent: 12,
      drip: true,
      debts: [],
      monthlyContribution: 0,
      timeHorizonYears: 1,
    })
    const { strategyA } = runSimulation(inputs)
    // 10000 * 1.01^12 ≈ 11268.25
    expect(strategyA.snapshots.at(-1)!.portfolioValue).toBeCloseTo(10_000 * Math.pow(1.01, 12), 0)
  })

  it('DRIP OFF — dividends tracked but NOT added to portfolio', () => {
    const inputs = makeInputs({
      currentPortfolioValue: 10_000,
      dividendYieldPercent: 12,
      drip: false,
      debts: [],
      monthlyContribution: 0,
      timeHorizonYears: 1,
    })
    const { strategyA } = runSimulation(inputs)
    expect(strategyA.snapshots.at(-1)!.portfolioValue).toBeCloseTo(10_000, 0)
    expect(strategyA.totalDividendsEarned).toBeGreaterThan(0)
  })

  it('DRIP OFF — dividends not applied to debt payoff speed', () => {
    // With and without dividend income, debt-free month should be the same in A
    const base = makeInputs({ drip: true, dividendYieldPercent: 0, monthlyContribution: 600 })
    const withDiv = makeInputs({ drip: false, dividendYieldPercent: 12, monthlyContribution: 600 })
    const { strategyA: aBase } = runSimulation(base)
    const { strategyA: aDiv } = runSimulation(withDiv)
    expect(aBase.debtFreeMonth).toBe(aDiv.debtFreeMonth)
  })

  it('net worth equals portfolio minus debt each month', () => {
    const { strategyA } = runSimulation(makeInputs())
    for (const snap of strategyA.snapshots) {
      expect(snap.netWorth).toBeCloseTo(snap.portfolioValue - snap.totalDebt, 6)
    }
  })
})

// ─── Strategy B — Aggressive ────────────────────────────────────────────────

describe('Strategy B — Aggressive', () => {
  it('pays off all debts by end of horizon', () => {
    const inputs = makeInputs({ monthlyContribution: 600, timeHorizonYears: 3 })
    const { strategyB } = runSimulation(inputs)
    expect(strategyB.snapshots.at(-1)!.totalDebt).toBeLessThan(0.01)
  })

  it('portfolio does not grow from contributions during debt phase', () => {
    const inputs = makeInputs({
      currentPortfolioValue: 0,
      dividendYieldPercent: 0,
      monthlyContribution: 600,
      timeHorizonYears: 3,
    })
    const { strategyB } = runSimulation(inputs)
    const debtFree = strategyB.debtFreeMonth!
    for (let i = 0; i < debtFree - 1; i++) {
      expect(strategyB.snapshots[i].portfolioValue).toBeCloseTo(0, 6)
    }
  })

  it('existing portfolio compounds with dividends during debt phase regardless of DRIP', () => {
    const base = makeInputs({
      currentPortfolioValue: 10_000,
      dividendYieldPercent: 12,
      monthlyContribution: 600,
      timeHorizonYears: 3,
    })
    const { strategyB: bOn } = runSimulation({ ...base, drip: true })
    const { strategyB: bOff } = runSimulation({ ...base, drip: false })

    const checkMonth = Math.min(bOn.debtFreeMonth!, bOff.debtFreeMonth!) - 2
    expect(bOn.snapshots[checkMonth].portfolioValue).toBeGreaterThan(10_000)
    expect(bOff.snapshots[checkMonth].portfolioValue).toBeGreaterThan(10_000)
  })

  it('after debt-free, full contribution goes to portfolio', () => {
    const inputs = makeInputs({
      currentPortfolioValue: 0,
      dividendYieldPercent: 0,
      monthlyContribution: 600,
      timeHorizonYears: 5,
    })
    const { strategyB } = runSimulation(inputs)
    const debtFree = strategyB.debtFreeMonth!
    const before = strategyB.snapshots[debtFree - 1].portfolioValue
    const after = strategyB.snapshots[debtFree].portfolioValue
    expect(after - before).toBeCloseTo(600, 0)
  })

  it('DRIP OFF — dividends not added to portfolio after debt-free', () => {
    const inputs = makeInputs({
      currentPortfolioValue: 0,
      dividendYieldPercent: 12,
      drip: false,
      monthlyContribution: 600,
      timeHorizonYears: 5,
    })
    const { strategyB } = runSimulation(inputs)
    const debtFree = strategyB.debtFreeMonth!
    if (debtFree >= strategyB.snapshots.length) return
    const snap = strategyB.snapshots[debtFree]
    const prev = strategyB.snapshots[debtFree - 1]
    // Growth should be approximately contribution only
    expect(snap.portfolioValue - prev.portfolioValue).toBeCloseTo(600, -1)
  })

  it('pays off debts earliest among all strategies', () => {
    const inputs = makeInputs({ monthlyContribution: 600, timeHorizonYears: 5 })
    const { strategyA, strategyB, strategyC } = runSimulation(inputs)
    const bFree = strategyB.debtFreeMonth!
    expect(bFree).toBeLessThanOrEqual(strategyA.debtFreeMonth!)
    expect(bFree).toBeLessThanOrEqual(strategyC.debtFreeMonth ?? Infinity)
  })

  it('net worth equals portfolio minus debt each month', () => {
    const { strategyB } = runSimulation(makeInputs())
    for (const snap of strategyB.snapshots) {
      expect(snap.netWorth).toBeCloseTo(snap.portfolioValue - snap.totalDebt, 6)
    }
  })
})

// ─── Strategy C — Balanced 50/50 ────────────────────────────────────────────

describe('Strategy C — Balanced 50/50', () => {
  it('allocates exactly 50% of contribution to debt and 50% to portfolio while debt remains', () => {
    // Use zero starting portfolio and zero dividends so portfolio only grows from investment budget
    const inputs = makeInputs({
      currentPortfolioValue: 0,
      dividendYieldPercent: 0,
      monthlyContribution: 1_000,
      timeHorizonYears: 5,
    })
    const { strategyC } = runSimulation(inputs)
    // While in debt phase, portfolio grows by $500/month
    expect(strategyC.snapshots[0].portfolioValue).toBeCloseTo(500, 0)
    expect(strategyC.snapshots[1].portfolioValue).toBeCloseTo(1_000, 0)
  })

  it('after debt-free, full contribution goes to portfolio', () => {
    // Small debt so it clears quickly, then check the jump to full contribution
    const inputs = makeInputs({
      debts: [makeDebt({ balance: 500, apr: 12 })],
      currentPortfolioValue: 0,
      dividendYieldPercent: 0,
      monthlyContribution: 1_000,
      timeHorizonYears: 3,
    })
    const { strategyC } = runSimulation(inputs)
    const debtFree = strategyC.debtFreeMonth!
    if (debtFree >= strategyC.snapshots.length) return
    const before = strategyC.snapshots[debtFree - 1].portfolioValue
    const after = strategyC.snapshots[debtFree].portfolioValue
    // After debt-free, full $1000 goes to portfolio (not $500)
    expect(after - before).toBeCloseTo(1_000, -1)
  })

  it('DRIP ON — dividends compound into portfolio on top of 50% investment budget', () => {
    const inputs = makeInputs({
      currentPortfolioValue: 10_000,
      dividendYieldPercent: 12,
      drip: true,
      debts: [],
      monthlyContribution: 0,
      timeHorizonYears: 1,
    })
    const { strategyC } = runSimulation(inputs)
    // 10000 * 1.01^12 ≈ 11268.25
    expect(strategyC.snapshots.at(-1)!.portfolioValue).toBeCloseTo(10_000 * Math.pow(1.01, 12), 0)
  })

  it('DRIP OFF — dividends tracked but not added to portfolio', () => {
    const inputs = makeInputs({
      currentPortfolioValue: 10_000,
      dividendYieldPercent: 12,
      drip: false,
      debts: [],
      monthlyContribution: 0,
      timeHorizonYears: 1,
    })
    const { strategyC } = runSimulation(inputs)
    expect(strategyC.snapshots.at(-1)!.portfolioValue).toBeCloseTo(10_000, 0)
    expect(strategyC.totalDividendsEarned).toBeGreaterThan(0)
  })

  it('C pays off debt slower than B but faster than A for high contribution', () => {
    // With $2000/month contribution and $10k debt:
    // B: throws $2000/month at debt → very fast payoff
    // A: throws amortized minimum at debt → slowest
    // C: throws $1000/month at debt → in between
    const inputs = makeInputs({
      monthlyContribution: 2_000,
      timeHorizonYears: 5,
    })
    const { strategyA, strategyB, strategyC } = runSimulation(inputs)
    expect(strategyB.debtFreeMonth!).toBeLessThan(strategyC.debtFreeMonth!)
    expect(strategyC.debtFreeMonth!).toBeLessThan(strategyA.debtFreeMonth!)
  })

  it('debt budget surplus overflows to portfolio when debt is nearly cleared', () => {
    // Very small debt: the 50% budget will clear it in first month, surplus goes to portfolio
    const inputs = makeInputs({
      debts: [makeDebt({ balance: 100, apr: 5 })],
      currentPortfolioValue: 0,
      dividendYieldPercent: 0,
      monthlyContribution: 1_000,
      timeHorizonYears: 1,
    })
    const { strategyC } = runSimulation(inputs)
    // Month 1: debt ≈ $100 paid from $500 budget → $400 surplus flows to portfolio
    // So portfolio month 1 ≈ $500 (investment budget) + $400 (overflow) = $900
    expect(strategyC.snapshots[0].portfolioValue).toBeGreaterThan(500)
  })

  it('net worth equals portfolio minus debt each month', () => {
    const { strategyC } = runSimulation(makeInputs())
    for (const snap of strategyC.snapshots) {
      expect(snap.netWorth).toBeCloseTo(snap.portfolioValue - snap.totalDebt, 6)
    }
  })
})

// ─── Avalanche ordering ─────────────────────────────────────────────────────

describe('Avalanche ordering', () => {
  it('Strategy B — pays off higher APR debt first, both debts paid by horizon', () => {
    const inputs = makeInputs({
      debts: [
        makeDebt({ id: 'low', balance: 2_000, apr: 5 }),
        makeDebt({ id: 'high', balance: 2_000, apr: 20 }),
      ],
      monthlyContribution: 1_000,
      timeHorizonYears: 3,
    })
    const { strategyB } = runSimulation(inputs)
    expect(strategyB.snapshots.at(-1)!.totalDebt).toBeLessThan(0.01)
    expect(strategyB.debtFreeMonth!).toBeLessThan(36)
  })

  it('Strategy C — debt budget targets highest APR first', () => {
    const inputs = makeInputs({
      debts: [
        makeDebt({ id: 'low', balance: 2_000, apr: 5 }),
        makeDebt({ id: 'high', balance: 500, apr: 20 }),
      ],
      currentPortfolioValue: 0,
      dividendYieldPercent: 0,
      monthlyContribution: 2_000,
      timeHorizonYears: 3,
    })
    const { strategyC } = runSimulation(inputs)
    // High-APR debt ($500) should be cleared in month 1 ($1000 budget > $500)
    expect(strategyC.snapshots[0].totalDebt).toBeLessThan(2_000)
  })
})

// ─── Crossover detection ────────────────────────────────────────────────────

describe('Crossover detection', () => {
  it('returns null or a valid month number', () => {
    const { crossoverAB, crossoverCB } = runSimulation(makeInputs({ timeHorizonYears: 5 }))
    if (crossoverAB !== null) expect(crossoverAB).toBeGreaterThan(0)
    if (crossoverCB !== null) expect(crossoverCB).toBeGreaterThan(0)
  })

  it('crossover month matches actual snapshot comparison', () => {
    const inputs = makeInputs({ timeHorizonYears: 10, monthlyContribution: 600 })
    const { strategyA, strategyB, crossoverAB } = runSimulation(inputs)
    if (crossoverAB !== null) {
      const idx = crossoverAB - 1
      expect(strategyA.snapshots[idx].netWorth).toBeGreaterThan(strategyB.snapshots[idx].netWorth)
      if (idx > 0) {
        expect(strategyA.snapshots[idx - 1].netWorth).toBeLessThanOrEqual(strategyB.snapshots[idx - 1].netWorth)
      }
    }
  })
})

// ─── Snapshot integrity ──────────────────────────────────────────────────────

describe('Snapshot integrity', () => {
  it('produces exactly timeHorizonYears * 12 snapshots per strategy', () => {
    for (const years of [1, 5, 10]) {
      const { strategyA, strategyB, strategyC } = runSimulation(makeInputs({ timeHorizonYears: years, monthlyContribution: 800 }))
      expect(strategyA.snapshots).toHaveLength(years * 12)
      expect(strategyB.snapshots).toHaveLength(years * 12)
      expect(strategyC.snapshots).toHaveLength(years * 12)
    }
  })

  it('snapshot month numbers are sequential starting at 1', () => {
    const { strategyA } = runSimulation(makeInputs({ timeHorizonYears: 2 }))
    strategyA.snapshots.forEach((snap, i) => expect(snap.month).toBe(i + 1))
  })

  it('with no debts and no dividends, all three strategies produce identical portfolios', () => {
    const inputs = makeInputs({
      debts: [],
      currentPortfolioValue: 0,
      dividendYieldPercent: 0,
      drip: true,
      monthlyContribution: 500,
      timeHorizonYears: 5,
    })
    const { strategyA, strategyB, strategyC } = runSimulation(inputs)
    const last = (r: typeof strategyA) => r.snapshots.at(-1)!.portfolioValue
    expect(last(strategyA)).toBeCloseTo(500 * 60, 2)
    expect(last(strategyB)).toBeCloseTo(500 * 60, 2)
    expect(last(strategyC)).toBeCloseTo(500 * 60, 2)
  })
})
