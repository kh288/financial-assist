import type { SimInputs, StrategyResult, SimResults, MonthSnapshot } from './types'

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

// Pay down debts avalanche (highest APR first), returns amount actually paid
function applyPayment(debts: DebtState[], cash: number): void {
  const sorted = [...debts]
    .filter(d => d.balance > 0)
    .sort((a, b) => b.apr - a.apr)
  let remaining = cash
  for (const item of sorted) {
    if (remaining <= 0) break
    const debt = debts.find(d => d.id === item.id)!
    const payment = Math.min(debt.balance, remaining)
    debt.balance = Math.max(0, debt.balance - payment)
    remaining -= payment
  }
}

export function runSimulation(inputs: SimInputs): SimResults {
  const totalMonths = inputs.timeHorizonYears * 12
  const strategyA = simulateStrategyA(inputs, totalMonths)
  const strategyB = simulateStrategyB(inputs, totalMonths)

  // Find the first month where A net worth overtakes B (A must have started behind or equal)
  let crossoverMonth: number | null = null
  const aStart = strategyA.snapshots[0]?.netWorth ?? 0
  const bStart = strategyB.snapshots[0]?.netWorth ?? 0

  if (aStart <= bStart) {
    for (let i = 0; i < totalMonths; i++) {
      if (strategyA.snapshots[i].netWorth > strategyB.snapshots[i].netWorth) {
        crossoverMonth = strategyA.snapshots[i].month
        break
      }
    }
  }

  return { strategyA, strategyB, crossoverMonth }
}

function simulateStrategyA(inputs: SimInputs, totalMonths: number): StrategyResult {
  // Strategy A: Invest now. Pay minimums on non-pauseable debts from monthly cash.
  // Remaining cash → portfolio. Dividends → DRIP (add to portfolio) or → debts (avalanche, pauseable first).
  const debts = cloneDebts(inputs.debts)
  let portfolio = inputs.currentPortfolioValue
  let cumulativeInterest = 0
  let cumulativeDividends = 0
  let debtFreeMonth: number | null = null
  const snapshots: MonthSnapshot[] = []

  for (let month = 1; month <= totalMonths; month++) {
    // 1. Interest accrues on all debts
    cumulativeInterest += accrueInterest(debts)

    // 2. Calculate this month's dividend income
    const monthlyDividend = portfolio * (inputs.dividendYieldPercent / 100 / 12)
    cumulativeDividends += monthlyDividend

    // 3. Pay minimums on non-pauseable debts from monthly contribution
    let cashRemaining = inputs.monthlyContribution
    for (const debt of debts) {
      if (debt.balance <= 0 || debt.pauseable) continue
      const payment = Math.min(debt.minimumPayment, debt.balance, cashRemaining)
      debt.balance = Math.max(0, debt.balance - payment)
      cashRemaining = Math.max(0, cashRemaining - payment)
    }

    // 4. Apply dividends
    if (inputs.drip) {
      portfolio += monthlyDividend
    } else {
      // Direct dividends to debts: pauseable first (highest APR within group), then non-pauseable
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
      // Leftover dividend cash goes to portfolio
      if (divRemaining > 0) portfolio += divRemaining
    }

    // 5. Invest remaining monthly cash into portfolio
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

  return {
    snapshots,
    debtFreeMonth,
    totalInterestPaid: cumulativeInterest,
    totalDividendsEarned: cumulativeDividends,
  }
}

function simulateStrategyB(inputs: SimInputs, totalMonths: number): StrategyResult {
  // Strategy B: All monthly cash → debt until gone. Existing portfolio compounds (DRIP) during debt phase.
  // Once debt-free: full monthly contribution + dividends (per DRIP setting) → portfolio.
  const debts = cloneDebts(inputs.debts)
  let portfolio = inputs.currentPortfolioValue
  let cumulativeInterest = 0
  let cumulativeDividends = 0
  let debtFreeMonth: number | null = null
  const snapshots: MonthSnapshot[] = []

  for (let month = 1; month <= totalMonths; month++) {
    // 1. Interest accrues on all debts
    cumulativeInterest += accrueInterest(debts)

    // 2. Portfolio earns dividends regardless of debt status
    const monthlyDividend = portfolio * (inputs.dividendYieldPercent / 100 / 12)
    cumulativeDividends += monthlyDividend

    const totalDebt = sumBalances(debts)

    if (totalDebt > 0.01) {
      // Debt phase: all monthly contribution goes to debt (aggressive avalanche)
      applyPayment(debts, inputs.monthlyContribution)
      // Existing portfolio always reinvests during debt phase
      portfolio += monthlyDividend
    } else {
      // Investment phase: all cash + dividends go to portfolio
      portfolio += inputs.monthlyContribution
      if (inputs.drip) {
        portfolio += monthlyDividend
      }
      // If DRIP off, dividends are pocketed (tracked but not compounded)
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

  return {
    snapshots,
    debtFreeMonth,
    totalInterestPaid: cumulativeInterest,
    totalDividendsEarned: cumulativeDividends,
  }
}
