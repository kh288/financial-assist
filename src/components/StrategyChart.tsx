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

export function StrategyChart({ results, timeHorizonYears }: Props) {
  const { strategyA, strategyB, crossoverMonth } = results
  const totalMonths = timeHorizonYears * 12

  const labels = Array.from({ length: totalMonths }, (_, i) => i + 1)

  const crossoverPlugin: Plugin<'line'> = {
    id: 'crossoverLine',
    afterDraw(chart) {
      if (!crossoverMonth) return
      const { ctx, chartArea, scales } = chart
      const x = scales.x.getPixelForValue(crossoverMonth - 1)
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.strokeStyle = 'rgba(170, 59, 255, 0.7)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.stroke()
      ctx.fillStyle = 'rgba(170, 59, 255, 0.85)'
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('A > B', x, chartArea.top + 14)
      ctx.restore()
    },
  }

  const data: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: 'A: Net Worth',
        data: strategyA.snapshots.map(s => s.netWorth),
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.3,
        order: 1,
      },
      {
        label: 'B: Net Worth',
        data: strategyB.snapshots.map(s => s.netWorth),
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.3,
        order: 2,
      },
      {
        label: 'A: Portfolio',
        data: strategyA.snapshots.map(s => s.portfolioValue),
        borderColor: '#86efac',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        tension: 0.3,
        order: 3,
      },
      {
        label: 'B: Portfolio',
        data: strategyB.snapshots.map(s => s.portfolioValue),
        borderColor: '#93c5fd',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        tension: 0.3,
        order: 4,
      },
      {
        label: 'A: Debt',
        data: strategyA.snapshots.map(s => -s.totalDebt),
        borderColor: '#fb923c',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [2, 3],
        pointRadius: 0,
        tension: 0.1,
        order: 5,
      },
      {
        label: 'B: Debt',
        data: strategyB.snapshots.map(s => -s.totalDebt),
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [2, 3],
        pointRadius: 0,
        tension: 0.1,
        order: 6,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyleWidth: 16,
          font: { size: 12 },
          padding: 16,
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
      <Line data={data} options={options} plugins={[crossoverPlugin]} />
    </div>
  )
}
