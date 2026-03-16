import { useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { useFormState } from './hooks/useFormState'
import { runSimulation } from './lib/calculator'
import type { SimResults } from './lib/types'
import { ThemeToggle } from './components/ThemeToggle'
import { InvestmentForm } from './components/InvestmentForm'
import { SettingsForm } from './components/SettingsForm'
import { DebtInput } from './components/DebtInput'
import { StrategyChart } from './components/StrategyChart'
import { SummaryPanel } from './components/SummaryPanel'
import './App.css'

function App() {
  const { theme, toggleTheme } = useTheme()
  const form = useFormState()
  const [results, setResults] = useState<SimResults | null>(null)

  function handleCalculate() {
    setResults(runSimulation({
      debts: form.debts,
      currentPortfolioValue: form.currentPortfolioValue,
      monthlyContribution: form.monthlyContribution,
      dividendYieldPercent: form.dividendYieldPercent,
      drip: form.drip,
      timeHorizonYears: form.timeHorizonYears,
      taxRatePercent: form.taxRatePercent,
    }))
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1>Dividend vs. Debt-First</h1>
            <p className="app-subtitle">
              Compare building dividends now vs. paying off debt first — and find your crossover
              point.
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="app-main">
        <section className="form-section">
          <InvestmentForm
            currentPortfolioValue={form.currentPortfolioValue}
            monthlyContribution={form.monthlyContribution}
            dividendYieldPercent={form.dividendYieldPercent}
            drip={form.drip}
            onChange={{
              setCurrentPortfolioValue: form.setCurrentPortfolioValue,
              setMonthlyContribution: form.setMonthlyContribution,
              setDividendYieldPercent: form.setDividendYieldPercent,
              setDrip: form.setDrip,
            }}
          />

          <div className="form-block">
            <h2 className="form-block-title">Debts</h2>
            <DebtInput debts={form.debts} onChange={form.setDebts} />
          </div>

          <SettingsForm
            timeHorizonYears={form.timeHorizonYears}
            taxRatePercent={form.taxRatePercent}
            onChange={{
              setTimeHorizonYears: form.setTimeHorizonYears,
              setTaxRatePercent: form.setTaxRatePercent,
            }}
          />

          <button type="button" className="calculate-btn" onClick={handleCalculate}>
            Calculate
          </button>
        </section>

        {results && (
          <section className="results-section">
            <StrategyChart results={results} timeHorizonYears={form.timeHorizonYears} />
            <SummaryPanel
              results={results}
              taxRatePercent={form.taxRatePercent}
              timeHorizonYears={form.timeHorizonYears}
            />
          </section>
        )}
      </main>
    </div>
  )
}

export default App
