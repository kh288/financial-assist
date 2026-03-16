export interface Debt {
  id: string
  label: string
  balance: number
  apr: number
  minimumPayment: number
  pauseable: boolean
  paymentStrategy: 'minimum' | 'aggressive'
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
  strategyA: StrategyResult  // Defer: minimums only, invest everything else
  strategyB: StrategyResult  // Debt First: clear debt, then invest
  strategyC: StrategyResult  // Balanced: amortize debt by horizon while investing
  crossoverAB: number | null // month A net worth first overtakes B
  crossoverCB: number | null // month C net worth first overtakes B
}
