import { useState, useEffect } from 'react'
import type { Debt } from '../lib/types'

const STORAGE_KEY = 'financial-assist-form'

const DEFAULT_FORM = {
  currentPortfolioValue: 5000,
  monthlyContribution: 1000,
  dividendYieldPercent: 4,
  drip: true,
  debts: [
    {
      id: 'default-1',
      label: 'Credit Card',
      balance: 10000,
      apr: 22,
      minimumPayment: 200,
      pauseable: false,
      paymentStrategy: 'minimum' as const,
    },
  ] as Debt[],
  timeHorizonYears: 10,
  taxRatePercent: 15,
}

function loadForm() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_FORM, ...JSON.parse(raw) }
  } catch {
    // ignore malformed data
  }
  return DEFAULT_FORM
}

export function useFormState() {
  const saved = loadForm()

  const [currentPortfolioValue, setCurrentPortfolioValue] = useState(saved.currentPortfolioValue)
  const [monthlyContribution, setMonthlyContribution] = useState(saved.monthlyContribution)
  const [dividendYieldPercent, setDividendYieldPercent] = useState(saved.dividendYieldPercent)
  const [drip, setDrip] = useState(saved.drip)
  const [debts, setDebts] = useState<Debt[]>(saved.debts)
  const [timeHorizonYears, setTimeHorizonYears] = useState(saved.timeHorizonYears)
  const [taxRatePercent, setTaxRatePercent] = useState(saved.taxRatePercent)

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentPortfolioValue,
        monthlyContribution,
        dividendYieldPercent,
        drip,
        debts,
        timeHorizonYears,
        taxRatePercent,
      })
    )
  }, [currentPortfolioValue, monthlyContribution, dividendYieldPercent, drip, debts, timeHorizonYears, taxRatePercent])

  return {
    currentPortfolioValue, setCurrentPortfolioValue,
    monthlyContribution, setMonthlyContribution,
    dividendYieldPercent, setDividendYieldPercent,
    drip, setDrip,
    debts, setDebts,
    timeHorizonYears, setTimeHorizonYears,
    taxRatePercent, setTaxRatePercent,
  }
}
