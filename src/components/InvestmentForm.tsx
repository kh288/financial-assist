interface Props {
  currentPortfolioValue: number
  monthlyContribution: number
  dividendYieldPercent: number
  drip: boolean
  onChange: {
    setCurrentPortfolioValue: (v: number) => void
    setMonthlyContribution: (v: number) => void
    setDividendYieldPercent: (v: number) => void
    setDrip: (v: boolean) => void
  }
}

export function InvestmentForm({
  currentPortfolioValue,
  monthlyContribution,
  dividendYieldPercent,
  drip,
  onChange,
}: Props) {
  return (
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
            onChange={e => onChange.setCurrentPortfolioValue(parseFloat(e.target.value) || 0)}
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
            onChange={e => onChange.setMonthlyContribution(parseFloat(e.target.value) || 0)}
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
            onChange={e => onChange.setDividendYieldPercent(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="field-group toggle-group">
          <label htmlFor="drip">DRIP (Reinvest Dividends)</label>
          <label className="toggle">
            <input
              id="drip"
              type="checkbox"
              checked={drip}
              onChange={e => onChange.setDrip(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
    </div>
  )
}
