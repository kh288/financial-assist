import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { ChartData, ChartOptions, Plugin } from 'chart.js'
import type { SimResults } from '../lib/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface Props {
  results: SimResults
  timeHorizonYears: number
}

function fmt(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

// A=green, B=blue, C=amber
const COLORS = {
  a: { net: '#22c55e', port: '#86efac', debt: '#fca5a5' },
  b: { net: '#3b82f6', port: '#93c5fd', debt: '#ef4444' },
  c: { net: '#f59e0b', port: '#fcd34d', debt: '#fb923c' },
}

export function StrategyChart({ results, timeHorizonYears }: Props) {
  const { strategyA, strategyB, strategyC, crossoverAB, crossoverCB } = results
  const totalMonths = timeHorizonYears * 12
  const labels = Array.from({ length: totalMonths }, (_, i) => i + 1)

  const crossoverPlugin: Plugin<'line'> = {
    id: 'crossoverLines',
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart

      const drawLine = (month: number, color: string, label: string) => {
        const x = scales.x.getPixelForValue(month - 1)
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(x, chartArea.top)
        ctx.lineTo(x, chartArea.bottom)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.stroke()
        ctx.fillStyle = color
        ctx.font = 'bold 11px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(label, x, chartArea.top + 14)
        ctx.restore()
      }

      if (crossoverAB) drawLine(crossoverAB, COLORS.a.net, 'A>B')
      if (crossoverCB) drawLine(crossoverCB, COLORS.c.net, 'C>B')
    },
  }

  const dataset = (
    label: string,
    data: number[],
    color: string,
    dash?: number[],
    hidden = false
  ) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: dash ? 1.5 : 2.5,
    borderDash: dash,
    pointRadius: 0,
    tension: 0.3,
    hidden,
  })

  const data: ChartData<'line'> = {
    labels,
    datasets: [
      dataset('A: Net Worth',  strategyA.snapshots.map(s => s.netWorth),      COLORS.a.net),
      dataset('B: Net Worth',  strategyB.snapshots.map(s => s.netWorth),      COLORS.b.net),
      dataset('C: Net Worth',  strategyC.snapshots.map(s => s.netWorth),      COLORS.c.net),
      dataset('A: Portfolio',  strategyA.snapshots.map(s => s.portfolioValue), COLORS.a.port, [5, 4], true),
      dataset('B: Portfolio',  strategyB.snapshots.map(s => s.portfolioValue), COLORS.b.port, [5, 4], true),
      dataset('C: Portfolio',  strategyC.snapshots.map(s => s.portfolioValue), COLORS.c.port, [5, 4], true),
      dataset('A: Debt',       strategyA.snapshots.map(s => -s.totalDebt),    COLORS.a.debt, [2, 3], true),
      dataset('B: Debt',       strategyB.snapshots.map(s => -s.totalDebt),    COLORS.b.debt, [2, 3], true),
      dataset('C: Debt',       strategyC.snapshots.map(s => -s.totalDebt),    COLORS.c.debt, [2, 3], true),
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyleWidth: 16,
          font: { size: 11 },
          padding: 12,
        },
      },
      tooltip: {
        callbacks: {
          title: items => {
            const month = items[0].dataIndex + 1
            const yr = Math.floor(month / 12)
            const mo = month % 12
            if (yr === 0) return `Month ${month}`
            if (mo === 0) return `Year ${yr}`
            return `Year ${yr}, Month ${mo} (Mo ${month})`
          },
          label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(128,128,128,0.1)' },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: timeHorizonYears + 2,
          callback(_, index) {
            const month = index + 1
            if (month === 1) return 'Start'
            if (month % 12 === 0) return `Yr ${month / 12}`
            return ''
          },
        },
      },
      y: {
        grid: { color: 'rgba(128,128,128,0.1)' },
        ticks: {
          color: '#9ca3af',
          callback: value => fmt(Number(value)),
        },
      },
    },
  }

  return (
    <div className="chart-wrapper">
      <p className="chart-hint">Portfolio &amp; debt lines hidden by default — click legend to show.</p>
      <Line data={data} options={options} plugins={[crossoverPlugin]} />
    </div>
  )
}
