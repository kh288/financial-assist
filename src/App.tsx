import { useState } from 'react'
import { DebtInput } from './components/DebtInput'
import { StrategyChart } from './components/StrategyChart'
import { SummaryPanel } from './components/SummaryPanel'
import { runSimulation } from './lib/calculator'
import type { Debt, SimResults } from './lib/types'
import './App.css'

const DEFAULT_DEBTS: Debt[] = [
  {
    id: 'default-1',
    label: 'Credit Card',
    balance: 10000,
    apr: 22,
    minimumPayment: 200,
    pauseable: false,
    paymentStrategy: 'minimum',
  },
]

function App() {
  const [currentPortfolioValue, setCurrentPortfolioValue] = useState(5000)
  const [monthlyContribution, setMonthlyContribution] = useState(1000)
  const [dividendYieldPercent, setDividendYieldPercent] = useState(4)
  const [drip, setDrip] = useState(true)
  const [debts, setDebts] = useState<Debt[]>(DEFAULT_DEBTS)
  const [timeHorizonYears, setTimeHorizonYears] = useState(10)
  const [taxRatePercent, setTaxRatePercent] = useState(15)
  const [results, setResults] = useState<SimResults | null>(null)

  function handleCalculate() {
    const result = runSimulation({
      debts,
      currentPortfolioValue,
      monthlyContribution,
      dividendYieldPercent,
      drip,
      timeHorizonYears,
      taxRatePercent,
    })
    setResults(result)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dividend vs. Debt-First</h1>
        <p className="app-subtitle">
          Compare building dividends now vs. paying off debt first — and find your crossover point.
        </p>
      </header>

      <main className="app-main">
        <section className="form-section">
          <div className="form-block">
            <h2 className="form-block-title">Investment</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="portfolio">Current Portfolio ($)</label>
                <input
                  id="portfolio"
                  type="number"
                  min="0"
                  step="1000"
                  value={currentPortfolioValue}
                  onChange={e => setCurrentPortfolioValue(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="contribution">Monthly Contribution ($)</label>
                <input
                  id="contribution"
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyContribution}
                  onChange={e => setMonthlyContribution(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="yield">Dividend Yield (% annual)</label>
                <input
                  id="yield"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={dividendYieldPercent}
                  onChange={e => setDividendYieldPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="field-group toggle-group">
                <label htmlFor="drip">DRIP (Reinvest Dividends)</label>
                <label className="toggle">
                  <input
                    id="drip"
                    type="checkbox"
                    checked={drip}
                    onChange={e => setDrip(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          <div className="form-block">
            <h2 className="form-block-title">Debts</h2>
            <DebtInput debts={debts} onChange={setDebts} />
          </div>

          <div className="form-block">
            <h2 className="form-block-title">Settings</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="horizon">Time Horizon (years)</label>
                <input
                  id="horizon"
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={timeHorizonYears}
                  onChange={e => setTimeHorizonYears(parseInt(e.target.value) || 10)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="tax">Dividend Tax Rate (%)</label>
                <input
                  id="tax"
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={taxRatePercent}
                  onChange={e => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <button type="button" className="calculate-btn" onClick={handleCalculate}>
            Calculate
          </button>
        </section>

        {results && (
          <section className="results-section">
            <StrategyChart results={results} timeHorizonYears={timeHorizonYears} />
            <SummaryPanel
              results={results}
              taxRatePercent={taxRatePercent}
              timeHorizonYears={timeHorizonYears}
            />
          </section>
        )}
      </main>
    </div>
  )
}

export default App
