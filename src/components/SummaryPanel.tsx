import type { SimResults } from '../lib/types'

interface Props {
  results: SimResults
  taxRatePercent: number
  timeHorizonYears: number
  paycheckA: number        // A: fixed amortized payment across all debts
  requiredPaycheckC: number // C: amortization of non-pauseable debts
  requiredPaycheckB: number // B: amortization of all debts
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

type W = 'a' | 'b' | 'c'

function lowestOf(a: number, b: number, c: number): W {
  if (a <= b && a <= c) return 'a'
  if (b <= a && b <= c) return 'b'
  return 'c'
}

function highestOf(a: number, b: number, c: number): W {
  if (a >= b && a >= c) return 'a'
  if (b >= a && b >= c) return 'b'
  return 'c'
}

function debtFreeWinner(a: number | null, b: number | null, c: number | null): W {
  const av = a ?? Infinity
  const bv = b ?? Infinity
  const cv = c ?? Infinity
  return lowestOf(av, bv, cv)
}

export function SummaryPanel({
  results,
  taxRatePercent,
  timeHorizonYears,
  paycheckA,
  requiredPaycheckC,
  requiredPaycheckB,
}: Props) {
  const { strategyA, strategyB, strategyC, crossoverAB, crossoverCB } = results
  const lastA = strategyA.snapshots.at(-1)!
  const lastB = strategyB.snapshots.at(-1)!
  const lastC = strategyC.snapshots.at(-1)!

  const rows: { label: string; a: string; b: string; c: string; winner: W }[] = [
    {
      label: 'Debt-Free',
      a: monthLabel(strategyA.debtFreeMonth),
      b: monthLabel(strategyB.debtFreeMonth),
      c: monthLabel(strategyC.debtFreeMonth),
      winner: debtFreeWinner(strategyA.debtFreeMonth, strategyB.debtFreeMonth, strategyC.debtFreeMonth),
    },
    {
      label: 'Paycheck/mo to Debt',
      a: fmt$(paycheckA),
      b: fmt$(requiredPaycheckB),
      c: fmt$(requiredPaycheckC),
      winner: lowestOf(paycheckA, requiredPaycheckB, requiredPaycheckC),
    },
    {
      label: 'Total Interest Paid',
      a: fmt$(strategyA.totalInterestPaid),
      b: fmt$(strategyB.totalInterestPaid),
      c: fmt$(strategyC.totalInterestPaid),
      winner: lowestOf(strategyA.totalInterestPaid, strategyB.totalInterestPaid, strategyC.totalInterestPaid),
    },
    {
      label: 'Total Dividends Earned',
      a: fmt$(strategyA.totalDividendsEarned),
      b: fmt$(strategyB.totalDividendsEarned),
      c: fmt$(strategyC.totalDividendsEarned),
      winner: highestOf(strategyA.totalDividendsEarned, strategyB.totalDividendsEarned, strategyC.totalDividendsEarned),
    },
    {
      label: `Portfolio (Yr ${timeHorizonYears})`,
      a: fmt$(lastA.portfolioValue),
      b: fmt$(lastB.portfolioValue),
      c: fmt$(lastC.portfolioValue),
      winner: highestOf(lastA.portfolioValue, lastB.portfolioValue, lastC.portfolioValue),
    },
    {
      label: `Net Worth (Yr ${timeHorizonYears})`,
      a: fmt$(lastA.netWorth),
      b: fmt$(lastB.netWorth),
      c: fmt$(lastC.netWorth),
      winner: highestOf(lastA.netWorth, lastB.netWorth, lastC.netWorth),
    },
  ]

  const taxOnA = taxRatePercent > 0 ? strategyA.totalDividendsEarned * (taxRatePercent / 100) : null
  const taxOnB = taxRatePercent > 0 ? strategyB.totalDividendsEarned * (taxRatePercent / 100) : null
  const taxOnC = taxRatePercent > 0 ? strategyC.totalDividendsEarned * (taxRatePercent / 100) : null

  return (
    <div className="summary-panel">
      <h2>Summary</h2>

      <div className="crossover-group">
        {crossoverAB ? (
          <div className="crossover-banner crossover-a">
            A overtakes B at <strong>{monthLabel(crossoverAB)}</strong>
          </div>
        ) : (
          <div className="crossover-banner crossover-none">
            A never overtakes B within {timeHorizonYears} yrs
          </div>
        )}
        {crossoverCB ? (
          <div className="crossover-banner crossover-c">
            C overtakes B at <strong>{monthLabel(crossoverCB)}</strong>
          </div>
        ) : (
          <div className="crossover-banner crossover-none">
            C never overtakes B within {timeHorizonYears} yrs
          </div>
        )}
      </div>

      <table className="summary-table">
        <thead>
          <tr>
            <th></th>
            <th className="col-a">A<span className="col-sub">Scheduled</span></th>
            <th className="col-b">B<span className="col-sub">Aggressive</span></th>
            <th className="col-c">C<span className="col-sub">Balanced</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label}>
              <td className="row-label">{row.label}</td>
              <td className={row.winner === 'a' ? 'winner winner-a' : ''}>
                {row.winner === 'a' && <span className="win-dot win-dot-a" />}
                {row.a}
              </td>
              <td className={row.winner === 'b' ? 'winner winner-b' : ''}>
                {row.winner === 'b' && <span className="win-dot win-dot-b" />}
                {row.b}
              </td>
              <td className={row.winner === 'c' ? 'winner winner-c' : ''}>
                {row.winner === 'c' && <span className="win-dot win-dot-c" />}
                {row.c}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {taxOnA !== null && taxOnB !== null && taxOnC !== null && (
        <p className="tax-note">
          <strong>Tax estimate ({taxRatePercent}% rate):</strong>{' '}
          A ≈ {fmt$(taxOnA)} · B ≈ {fmt$(taxOnB)} · C ≈ {fmt$(taxOnC)} — ordinary dividend income; actual liability may vary.
        </p>
      )}
    </div>
  )
}
