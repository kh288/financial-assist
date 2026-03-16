interface Props {
  timeHorizonYears: number
  taxRatePercent: number
  onChange: {
    setTimeHorizonYears: (v: number) => void
    setTaxRatePercent: (v: number) => void
  }
}

export function SettingsForm({ timeHorizonYears, taxRatePercent, onChange }: Props) {
  return (
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
            onChange={e => onChange.setTimeHorizonYears(parseInt(e.target.value) || 10)}
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
            onChange={e => onChange.setTaxRatePercent(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  )
}
