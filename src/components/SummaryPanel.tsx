import type { SimResults } from '../lib/types'

interface Props {
  results: SimResults
  taxRatePercent: number
  timeHorizonYears: number
}

const fmt$ = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function monthLabel(m: number | null): string {
  if (m === null) return 'Not within horizon'
  const yr = Math.floor(m / 12)
  const mo = m % 12
  if (yr === 0) return `Month ${m}`
  if (mo === 0) return `Year ${yr}`
  return `Year ${yr}, Mo ${mo}`
}

export function SummaryPanel({ results, taxRatePercent, timeHorizonYears }: Props) {
  const { strategyA, strategyB, crossoverMonth } = results
  const lastA = strategyA.snapshots.at(-1)!
  const lastB = strategyB.snapshots.at(-1)!

  const rows: { label: string; a: string; b: string; winner: 'a' | 'b' | 'tie' }[] = [
    {
      label: 'Debt-Free',
      a: monthLabel(strategyA.debtFreeMonth),
      b: monthLabel(strategyB.debtFreeMonth),
      winner:
        strategyA.debtFreeMonth === null && strategyB.debtFreeMonth === null
          ? 'tie'
          : strategyA.debtFreeMonth === null
            ? 'b'
            : strategyB.debtFreeMonth === null
              ? 'a'
              : strategyA.debtFreeMonth <= strategyB.debtFreeMonth
                ? 'a'
                : 'b',
    },
    {
      label: 'Total Interest Paid',
      a: fmt$(strategyA.totalInterestPaid),
      b: fmt$(strategyB.totalInterestPaid),
      winner: strategyA.totalInterestPaid <= strategyB.totalInterestPaid ? 'a' : 'b',
    },
    {
      label: 'Total Dividends Earned',
      a: fmt$(strategyA.totalDividendsEarned),
      b: fmt$(strategyB.totalDividendsEarned),
      winner: strategyA.totalDividendsEarned >= strategyB.totalDividendsEarned ? 'a' : 'b',
    },
    {
      label: `Portfolio (Yr ${timeHorizonYears})`,
      a: fmt$(lastA.portfolioValue),
      b: fmt$(lastB.portfolioValue),
      winner: lastA.portfolioValue >= lastB.portfolioValue ? 'a' : 'b',
    },
    {
      label: `Net Worth (Yr ${timeHorizonYears})`,
      a: fmt$(lastA.netWorth),
      b: fmt$(lastB.netWorth),
      winner: lastA.netWorth >= lastB.netWorth ? 'a' : 'b',
    },
  ]

  const taxOnA = taxRatePercent > 0 ? strategyA.totalDividendsEarned * (taxRatePercent / 100) : null
  const taxOnB = taxRatePercent > 0 ? strategyB.totalDividendsEarned * (taxRatePercent / 100) : null

  return (
    <div className="summary-panel">
      <h2>Summary</h2>

      {crossoverMonth ? (
        <div className="crossover-banner">
          Strategy A overtakes Strategy B at <strong>{monthLabel(crossoverMonth)}</strong>
        </div>
      ) : (
        <div className="crossover-banner crossover-none">
          Strategy A does not overtake Strategy B within {timeHorizonYears} years
        </div>
      )}

      <table className="summary-table">
        <thead>
          <tr>
            <th></th>
            <th>
              Strategy A<span className="col-sub">Dividend First</span>
            </th>
            <th>
              Strategy B<span className="col-sub">Debt First</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label}>
              <td className="row-label">{row.label}</td>
              <td className={row.winner === 'a' ? 'winner' : ''}>
                {row.winner === 'a' && <span className="win-dot" />}
                {row.a}
              </td>
              <td className={row.winner === 'b' ? 'winner' : ''}>
                {row.winner === 'b' && <span className="win-dot" />}
                {row.b}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {taxOnA !== null && taxOnB !== null && (
        <p className="tax-note">
          <strong>Tax estimate ({taxRatePercent}% rate):</strong> Strategy A ≈ {fmt$(taxOnA)} ·
          Strategy B ≈ {fmt$(taxOnB)} — ordinary dividend income; actual liability may vary.
        </p>
      )}
    </div>
  )
}
