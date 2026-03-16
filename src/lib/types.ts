export interface Debt {
  id: string
  label: string
  balance: number
  apr: number
  minimumPayment: number
}

export interface SimInputs {
  debts: Debt[]
  currentPortfolioValue: number
  monthlyContribution: number
  dividendYieldPercent: number
  drip: boolean
  timeHorizonYears: number
  taxRatePercent: number
}

export interface MonthSnapshot {
  month: number
  portfolioValue: number
  totalDebt: number
  netWorth: number
  cumulativeDividends: number
  cumulativeInterestPaid: number
  monthlyDividendIncome: number
}

export interface StrategyResult {
  snapshots: MonthSnapshot[]
  debtFreeMonth: number | null
  totalInterestPaid: number
  totalDividendsEarned: number
}

export interface SimResults {
  strategyA: StrategyResult  // Dividend-First: amortized minimum payments, invest the rest
  strategyB: StrategyResult  // Aggressive: all cash to debt until clear, then invest
  strategyC: StrategyResult  // Balanced: 50/50 split between debt and investment each month
  crossoverAB: number | null // month A net worth first overtakes B
  crossoverCB: number | null // month C net worth first overtakes B
}
