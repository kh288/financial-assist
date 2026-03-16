import type { Debt, SimInputs, StrategyResult, SimResults, MonthSnapshot } from './types'

interface DebtState {
  id: string
  balance: number
  apr: number
  minimumPayment: number
  pauseable: boolean
}

function cloneDebts(debts: SimInputs['debts']): DebtState[] {
  return debts.map(d => ({
    id: d.id,
    balance: d.balance,
    apr: d.apr,
    minimumPayment: d.minimumPayment,
    pauseable: d.pauseable,
  }))
}

function sumBalances(debts: DebtState[]): number {
  return debts.reduce((sum, d) => sum + Math.max(0, d.balance), 0)
}

function accrueInterest(debts: DebtState[]): number {
  let totalInterest = 0
  for (const debt of debts) {
    if (debt.balance > 0) {
      const interest = debt.balance * (debt.apr / 100 / 12)
      debt.balance += interest
      totalInterest += interest
    }
  }
  return totalInterest
}

// Standard amortization: payment to pay off `balance` in `monthsRemaining` months
function amortizePayment(balance: number, aprPercent: number, monthsRemaining: number): number {
  if (balance <= 0 || monthsRemaining <= 0) return 0
  if (monthsRemaining === 1) return balance
  const r = aprPercent / 100 / 12
  if (r === 0) return balance / monthsRemaining
  return (balance * r * Math.pow(1 + r, monthsRemaining)) / (Math.pow(1 + r, monthsRemaining) - 1)
}

// Total monthly amortization payment to clear the given debts by the horizon
export function totalRequiredPayment(debts: Debt[], totalMonths: number): number {
  return debts.reduce((sum, d) => {
    if (d.balance <= 0) return sum
    return sum + amortizePayment(d.balance, d.apr, totalMonths)
  }, 0)
}

// Pay down debts avalanche (highest APR first)
function applyPayment(debts: DebtState[], cash: number): void {
  const sorted = [...debts].filter(d => d.balance > 0).sort((a, b) => b.apr - a.apr)
  let remaining = cash
  for (const item of sorted) {
    if (remaining <= 0) break
    const debt = debts.find(d => d.id === item.id)!
    const payment = Math.min(debt.balance, remaining)
    debt.balance = Math.max(0, debt.balance - payment)
    remaining -= payment
  }
}

function findCrossover(a: StrategyResult, b: StrategyResult, totalMonths: number): number | null {
  const aStart = a.snapshots[0]?.netWorth ?? 0
  const bStart = b.snapshots[0]?.netWorth ?? 0
  if (aStart > bStart) return null // A already ahead — no crossover needed
  for (let i = 0; i < totalMonths; i++) {
    if (a.snapshots[i].netWorth > b.snapshots[i].netWorth) return a.snapshots[i].month
  }
  return null
}

export function runSimulation(inputs: SimInputs): SimResults {
  const totalMonths = inputs.timeHorizonYears * 12
  const strategyA = simulateStrategyA(inputs, totalMonths)
  const strategyB = simulateStrategyB(inputs, totalMonths)
  const strategyC = simulateStrategyC(inputs, totalMonths)

  return {
    strategyA,
    strategyB,
    strategyC,
    crossoverAB: findCrossover(strategyA, strategyB, totalMonths),
    crossoverCB: findCrossover(strategyC, strategyB, totalMonths),
  }
}

// Strategy A — Scheduled: pay a fixed amortized amount per debt (calculated once from original balance
// over the full horizon), invest the rest. Guarantees payoff by end of horizon.
// DRIP ON: dividends compound. DRIP OFF: dividends are pocketed (not to debt, not reinvested).
function simulateStrategyA(inputs: SimInputs, totalMonths: number): StrategyResult {
  const debts = cloneDebts(inputs.debts)
  let portfolio = inputs.currentPortfolioValue
  let cumulativeInterest = 0
  let cumulativeDividends = 0
  let debtFreeMonth: number | null = null
  const snapshots: MonthSnapshot[] = []

  // Pre-calculate fixed monthly payment for every debt from its original balance.
  const fixedPayments = new Map<string, number>()
  for (const debt of debts) {
    if (debt.balance > 0) {
      fixedPayments.set(debt.id, amortizePayment(debt.balance, debt.apr, totalMonths))
    }
  }

  for (let month = 1; month <= totalMonths; month++) {
    cumulativeInterest += accrueInterest(debts)

    const monthlyDividend = portfolio * (inputs.dividendYieldPercent / 100 / 12)
    cumulativeDividends += monthlyDividend

    // Pay fixed amortized payment per debt (at least minimum, never more than balance)
    let cashRemaining = inputs.monthlyContribution
    for (const debt of debts) {
      if (debt.balance <= 0) continue
      const fixed = fixedPayments.get(debt.id) ?? debt.minimumPayment
      const payment = Math.min(Math.max(fixed, debt.minimumPayment), debt.balance, cashRemaining)
      debt.balance = Math.max(0, debt.balance - payment)
      cashRemaining = Math.max(0, cashRemaining - payment)
    }

    // Apply dividends: DRIP → portfolio. DRIP off → pocketed (tracked, not invested or used for debt)
    if (inputs.drip) {
      portfolio += monthlyDividend
    }

    // Invest all remaining cash
    portfolio += Math.max(0, cashRemaining)

    const totalDebt = sumBalances(debts)
    if (totalDebt < 0.01 && debtFreeMonth === null) debtFreeMonth = month

    snapshots.push({
      month,
      portfolioValue: portfolio,
      totalDebt,
      netWorth: portfolio - totalDebt,
      cumulativeDividends,
      cumulativeInterestPaid: cumulativeInterest,
      monthlyDividendIncome: monthlyDividend,
    })
  }

  return { snapshots, debtFreeMonth, totalInterestPaid: cumulativeInterest, totalDividendsEarned: cumulativeDividends }
}

// Strategy B — Debt First: all contribution to debt until clear, then invest.
// Existing portfolio compounds (DRIP) during debt phase regardless.
function simulateStrategyB(inputs: SimInputs, totalMonths: number): StrategyResult {
  const debts = cloneDebts(inputs.debts)
  let portfolio = inputs.currentPortfolioValue
  let cumulativeInterest = 0
  let cumulativeDividends = 0
  let debtFreeMonth: number | null = null
  const snapshots: MonthSnapshot[] = []

  for (let month = 1; month <= totalMonths; month++) {
    cumulativeInterest += accrueInterest(debts)

    const monthlyDividend = portfolio * (inputs.dividendYieldPercent / 100 / 12)
    cumulativeDividends += monthlyDividend

    const totalDebt = sumBalances(debts)

    if (totalDebt > 0.01) {
      const monthsRemaining = totalMonths - month + 1
      let cashRemaining = inputs.monthlyContribution

      // Pay amortization per debt (APR descending) — guarantees payoff by horizon
      const sorted = [...debts].filter(d => d.balance > 0).sort((a, b) => b.apr - a.apr)
      for (const item of sorted) {
        if (cashRemaining <= 0) break
        const debt = debts.find(d => d.id === item.id)!
        const required = amortizePayment(debt.balance, debt.apr, monthsRemaining)
        const payment = Math.min(required, debt.balance, cashRemaining)
        debt.balance = Math.max(0, debt.balance - payment)
        cashRemaining = Math.max(0, cashRemaining - payment)
      }
      // Throw any remaining cash at highest APR (extra aggressive)
      if (cashRemaining > 0) applyPayment(debts, cashRemaining)

      portfolio += monthlyDividend // existing portfolio always compounds during debt phase
    } else {
      portfolio += inputs.monthlyContribution
      if (inputs.drip) portfolio += monthlyDividend
    }

    const finalDebt = sumBalances(debts)
    if (finalDebt < 0.01 && debtFreeMonth === null) debtFreeMonth = month

    snapshots.push({
      month,
      portfolioValue: portfolio,
      totalDebt: finalDebt,
      netWorth: portfolio - finalDebt,
      cumulativeDividends,
      cumulativeInterestPaid: cumulativeInterest,
      monthlyDividendIncome: monthlyDividend,
    })
  }

  return { snapshots, debtFreeMonth, totalInterestPaid: cumulativeInterest, totalDividendsEarned: cumulativeDividends }
}

// Strategy C — Balanced: pay a fixed monthly amount per debt (calculated once from the original
// balance at the start of the simulation), invest the rest. The debt-free date emerges dynamically
// — dividends (when DRIP off) chip away at debt on top of the fixed payment, paying it off earlier.
// DRIP ON: dividends compound into portfolio. DRIP OFF: dividends → pauseable debts first, then portfolio.
function simulateStrategyC(inputs: SimInputs, totalMonths: number): StrategyResult {
  const debts = cloneDebts(inputs.debts)
  let portfolio = inputs.currentPortfolioValue
  let cumulativeInterest = 0
  let cumulativeDividends = 0
  let debtFreeMonth: number | null = null
  const snapshots: MonthSnapshot[] = []

  // Pre-calculate fixed monthly payment for each non-pauseable debt from its original balance.
  // This stays constant — payoff date emerges from cash flows rather than being forced.
  const fixedPayments = new Map<string, number>()
  for (const debt of debts) {
    if (!debt.pauseable && debt.balance > 0) {
      fixedPayments.set(debt.id, amortizePayment(debt.balance, debt.apr, totalMonths))
    }
  }

  for (let month = 1; month <= totalMonths; month++) {
    cumulativeInterest += accrueInterest(debts)

    const monthlyDividend = portfolio * (inputs.dividendYieldPercent / 100 / 12)
    cumulativeDividends += monthlyDividend

    // Pay fixed payment on non-pauseable debts (at least the minimum, never more than balance)
    let cashRemaining = inputs.monthlyContribution
    for (const debt of debts) {
      if (debt.balance <= 0 || debt.pauseable) continue
      const fixed = fixedPayments.get(debt.id) ?? debt.minimumPayment
      const payment = Math.min(Math.max(fixed, debt.minimumPayment), debt.balance, cashRemaining)
      debt.balance = Math.max(0, debt.balance - payment)
      cashRemaining = Math.max(0, cashRemaining - payment)
    }

    // Apply dividends
    if (inputs.drip) {
      portfolio += monthlyDividend
    } else {
      // Dividends → pauseable debts first (highest APR), then non-pauseable, then portfolio
      let divRemaining = monthlyDividend
      const prioritized = [
        ...debts.filter(d => d.balance > 0 && d.pauseable).sort((a, b) => b.apr - a.apr),
        ...debts.filter(d => d.balance > 0 && !d.pauseable).sort((a, b) => b.apr - a.apr),
      ]
      for (const item of prioritized) {
        if (divRemaining <= 0) break
        const debt = debts.find(d => d.id === item.id)!
        const payment = Math.min(debt.balance, divRemaining)
        debt.balance = Math.max(0, debt.balance - payment)
        divRemaining -= payment
      }
      if (divRemaining > 0) portfolio += divRemaining
    }

    // Invest remaining cash
    portfolio += Math.max(0, cashRemaining)

    const totalDebt = sumBalances(debts)
    if (totalDebt < 0.01 && debtFreeMonth === null) debtFreeMonth = month

    snapshots.push({
      month,
      portfolioValue: portfolio,
      totalDebt,
      netWorth: portfolio - totalDebt,
      cumulativeDividends,
      cumulativeInterestPaid: cumulativeInterest,
      monthlyDividendIncome: monthlyDividend,
    })
  }

  return { snapshots, debtFreeMonth, totalInterestPaid: cumulativeInterest, totalDividendsEarned: cumulativeDividends }
}
