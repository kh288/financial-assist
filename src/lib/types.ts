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
  strategyA: StrategyResult
  strategyB: StrategyResult
  crossoverMonth: number | null
}
