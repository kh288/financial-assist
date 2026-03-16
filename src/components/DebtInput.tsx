import { useId } from 'react'
import type { Debt } from '../lib/types'

interface Props {
  debts: Debt[]
  onChange: (debts: Debt[]) => void
}

function newDebt(): Debt {
  return {
    id: Math.random().toString(36).slice(2),
    label: '',
    balance: 0,
    apr: 0,
    minimumPayment: 0,
  }
}

function DebtCard({
  debt,
  onChange,
  onRemove,
}: {
  debt: Debt
  onChange: (d: Debt) => void
  onRemove: () => void
}) {
  const id = useId()

  return (
    <div className="debt-card">
      <div className="debt-card-header">
        <input
          type="text"
          className="debt-label-input"
          value={debt.label}
          onChange={e => onChange({ ...debt, label: e.target.value })}
          placeholder="Debt name (e.g. Car Loan)"
        />
        <button className="remove-btn" onClick={onRemove} title="Remove debt">
          ×
        </button>
      </div>

      <div className="debt-card-fields">
        <div className="field-group">
          <label htmlFor={`${id}-balance`}>Balance ($)</label>
          <input
            id={`${id}-balance`}
            type="number"
            min="0"
            step="100"
            value={debt.balance || ''}
            onChange={e => onChange({ ...debt, balance: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="field-group">
          <label htmlFor={`${id}-apr`}>APR (%)</label>
          <input
            id={`${id}-apr`}
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={debt.apr || ''}
            onChange={e => onChange({ ...debt, apr: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="field-group">
          <label htmlFor={`${id}-min`}>Min. Payment ($)</label>
          <input
            id={`${id}-min`}
            type="number"
            min="0"
            step="10"
            value={debt.minimumPayment || ''}
            onChange={e =>
              onChange({ ...debt, minimumPayment: parseFloat(e.target.value) || 0 })
            }
          />
        </div>

      </div>
    </div>
  )
}

export function DebtInput({ debts, onChange }: Props) {
  function updateDebt(id: string, updated: Debt) {
    onChange(debts.map(d => (d.id === id ? updated : d)))
  }

  function removeDebt(id: string) {
    onChange(debts.filter(d => d.id !== id))
  }

  return (
    <div className="debt-section">
      <div className="debt-list">
        {debts.map(debt => (
          <DebtCard
            key={debt.id}
            debt={debt}
            onChange={updated => updateDebt(debt.id, updated)}
            onRemove={() => removeDebt(debt.id)}
          />
        ))}
      </div>
      <button type="button" className="add-debt-btn" onClick={() => onChange([...debts, newDebt()])}>
        + Add Debt
      </button>
    </div>
  )
}
