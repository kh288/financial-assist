import { useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { useFormState } from './hooks/useFormState'
import { runSimulation, totalRequiredPayment } from './lib/calculator'
import type { SimResults } from './lib/types'
import { ThemeToggle } from './components/ThemeToggle'
import { InvestmentForm } from './components/InvestmentForm'
import { SettingsForm } from './components/SettingsForm'
import { DebtInput } from './components/DebtInput'
import { StrategyChart } from './components/StrategyChart'
import { SummaryPanel } from './components/SummaryPanel'
import './App.css'

const fmt$ = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function App() {
  const { theme, toggleTheme } = useTheme()
  const form = useFormState()
  const [results, setResults] = useState<SimResults | null>(null)

  const totalMonths = form.timeHorizonYears * 12
  const paycheckA = totalRequiredPayment(form.debts, totalMonths)
  const paycheckB = form.monthlyContribution
  const paycheckC = totalRequiredPayment(form.debts.filter(d => !d.pauseable), totalMonths)

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
              Compare three strategies — defer debt, clear debt first, or balance both — and find your crossover point.
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
            {form.debts.length > 0 && (
              <div className="paycheck-callout">
                <span>Monthly paycheck toward debt by Yr {form.timeHorizonYears}:</span>
                <span className="paycheck-amounts">
                  <span className="pc-a">A (scheduled): <strong>{fmt$(paycheckA)}/mo</strong></span>
                  <span className="pc-b">B (aggressive): <strong>{fmt$(paycheckB)}/mo</strong></span>
                  <span className="pc-c">C (balanced): <strong>{fmt$(paycheckC)}/mo</strong></span>
                </span>
              </div>
            )}
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
              paycheckA={paycheckA}
              requiredPaycheckB={paycheckB}
              requiredPaycheckC={paycheckC}
            />
          </section>
        )}
      </main>
    </div>
  )
}

export default App
