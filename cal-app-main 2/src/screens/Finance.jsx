import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, Zap, TrendingUp, TrendingDown } from 'lucide-react'
import { useFinanceRecords, saveFinanceRecord, deleteFinanceRecord } from '../hooks/useFinance'
import { awardXP } from '../hooks/useXP'
import { XP as XP_VALUES } from '../theme'
import { db } from '../db'
import SectionLabel from '../components/SectionLabel'

const BLANK = {
  date: format(new Date(), 'yyyy-MM-dd'),
  cash: '', super: '', invest: '', propval: '',
  mortgage: '', hecs: '',
  income: '', expenses: '',
  notes: '',
}

function fmt(n) {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function FinField({ label, value, onChange, placeholder = '0' }) {
  return (
    <div>
      <label className="ios-label block mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 ff-mono text-[12px] text-realm-muted">
          $
        </span>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="fl-input ff-mono text-sm py-2 pl-6"
        />
      </div>
    </div>
  )
}

function calcNW(r) {
  const assets = (r.cash || 0) + (r.super || 0) + (r.invest || 0) + (r.propval || 0)
  const liabs  = (r.mortgage || 0) + (r.hecs || 0)
  return assets - liabs
}

export default function Finance({ onXP }) {
  const records   = useFinanceRecords()
  const [showForm, setShowForm] = useState(false)
  const [form,    setForm]    = useState(BLANK)
  const [saving,  setSaving]  = useState(false)

  const latest = records[0]
  const prev   = records[1]

  const latestNW = latest ? calcNW({
    cash: latest.cash, super: latest.super, invest: latest.invest, propval: latest.propval,
    mortgage: latest.mortgage, hecs: latest.hecs,
  }) : null
  const prevNW = prev ? calcNW({
    cash: prev.cash, super: prev.super, invest: prev.invest, propval: prev.propval,
    mortgage: prev.mortgage, hecs: prev.hecs,
  }) : null
  const nwDelta = latestNW != null && prevNW != null ? latestNW - prevNW : null

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function n(v) { return parseFloat(v) || null }

  const previewNW = calcNW({
    cash: n(form.cash), super: n(form.super), invest: n(form.invest), propval: n(form.propval),
    mortgage: n(form.mortgage), hecs: n(form.hecs),
  })

  async function handleSave() {
    if (!form.date) return
    setSaving(true)
    const assets = (n(form.cash)||0) + (n(form.super)||0) + (n(form.invest)||0) + (n(form.propval)||0)
    const liabs  = (n(form.mortgage)||0) + (n(form.hecs)||0)
    await saveFinanceRecord({
      id:          crypto.randomUUID(),
      date:        form.date,
      cash:        n(form.cash),
      super:       n(form.super),
      invest:      n(form.invest),
      propval:     n(form.propval),
      mortgage:    n(form.mortgage),
      hecs:        n(form.hecs),
      income:      n(form.income),
      expenses:    n(form.expenses),
      assets,
      liabilities: liabs,
      netWorth:    assets - liabs,
      notes:       form.notes.trim() || null,
    })
    const totalFinanceLogs = await db.finance.count()
    const { unlockedAchievements } = await awardXP(XP_VALUES.logFinance, {
      totalFinanceLogs,
      totalCheckIns: 0, checkInStreak: 0, totalWorkouts: 0,
      totalGoals: 0, completedGoals: 0, outboundDays: 0, totalCalls: 0,
      totalWeightLogs: 0, totalScans: 0,
    })
    onXP?.({ amount: XP_VALUES.logFinance, achievement: unlockedAchievements[0] ?? null })
    setForm(BLANK)
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="ios-title">
            BALANCE SHEET
          </h1>
          <p className="text-[11px] text-realm-faint mt-1">
            Net Worth Tracker
          </p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1.5
          bg-realm-gold/10 border border-realm-gold/25">
          <Zap size={11} className="text-realm-gold" />
          <span className="ff-mono text-[11px] text-realm-gold">+{XP_VALUES.logFinance} XP</span>
        </div>
      </div>

      {/* current net worth */}
      {latestNW != null && (
        <div className="mb-5">
          <SectionLabel>Net Worth · {latest.date}</SectionLabel>
          <div className="ios-card">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="ios-label mb-0.5">Total Net Worth</p>
                <p className="ff-heading text-[28px] font-bold tabular-nums"
                  style={{ color: latestNW >= 0 ? '#4ade80' : '#f87171' }}>
                  {fmt(latestNW)}
                </p>
              </div>
              {nwDelta != null && (
                <div className="flex items-center gap-1 pb-1">
                  {nwDelta >= 0
                    ? <TrendingUp size={14} className="text-[#4ade80]" />
                    : <TrendingDown size={14} className="text-[#f87171]" />}
                  <span className="ff-mono text-[12px]"
                    style={{ color: nwDelta >= 0 ? '#4ade80' : '#f87171' }}>
                    {nwDelta >= 0 ? '+' : ''}{fmt(nwDelta)}
                  </span>
                </div>
              )}
            </div>

            {/* breakdown */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-realm-hairline">
              <div>
                <p className="ff-mono text-[9px] text-realm-muted uppercase tracking-wider mb-1.5">Assets</p>
                {[
                  { k: 'cash',    label: 'Cash'        },
                  { k: 'super',   label: 'Super'       },
                  { k: 'invest',  label: 'Investments' },
                  { k: 'propval', label: 'Property'    },
                ].map(({ k, label }) => latest[k] != null && (
                  <div key={k} className="flex justify-between mb-0.5">
                    <span className="ff-mono text-[10px] text-realm-faint">{label}</span>
                    <span className="ff-mono text-[10px] text-realm-soft tabular-nums">{fmt(latest[k])}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="ff-mono text-[9px] text-realm-muted uppercase tracking-wider mb-1.5">Liabilities</p>
                {[
                  { k: 'mortgage', label: 'Mortgage' },
                  { k: 'hecs',     label: 'HECS'     },
                ].map(({ k, label }) => latest[k] != null && (
                  <div key={k} className="flex justify-between mb-0.5">
                    <span className="ff-mono text-[10px] text-realm-faint">{label}</span>
                    <span className="ff-mono text-[10px] text-[#f87171] tabular-nums">({fmt(latest[k])})</span>
                  </div>
                ))}
                {(latest.income || latest.expenses) && (
                  <div className="mt-2 pt-2 border-t border-realm-hairline">
                    <p className="ff-mono text-[9px] text-realm-muted uppercase tracking-wider mb-1">Cashflow</p>
                    {latest.income && (
                      <div className="flex justify-between mb-0.5">
                        <span className="ff-mono text-[10px] text-realm-faint">Income</span>
                        <span className="ff-mono text-[10px] text-[#4ade80] tabular-nums">{fmt(latest.income)}</span>
                      </div>
                    )}
                    {latest.expenses && (
                      <div className="flex justify-between">
                        <span className="ff-mono text-[10px] text-realm-faint">Expenses</span>
                        <span className="ff-mono text-[10px] text-[#f87171] tabular-nums">({fmt(latest.expenses)})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* add snapshot form */}
      {showForm && (
        <div className="mb-5">
          <SectionLabel>New Snapshot</SectionLabel>
          <div className="ios-card space-y-4 border border-realm-gold/25">
            <div>
              <label className="ios-label block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
                className="fl-input ff-mono text-sm py-2" style={{ colorScheme: 'dark' }} />
            </div>

            <div>
              <p className="ff-mono text-[10px] text-[#4ade80] uppercase tracking-widest mb-2">Assets</p>
              <div className="grid grid-cols-2 gap-2">
                <FinField label="Cash / Savings"  value={form.cash}    onChange={v => setField('cash', v)} />
                <FinField label="Superannuation"  value={form.super}   onChange={v => setField('super', v)} />
                <FinField label="Investments"     value={form.invest}  onChange={v => setField('invest', v)} />
                <FinField label="Property Value"  value={form.propval} onChange={v => setField('propval', v)} />
              </div>
            </div>

            <div>
              <p className="ff-mono text-[10px] text-[#f87171] uppercase tracking-widest mb-2">Liabilities</p>
              <div className="grid grid-cols-2 gap-2">
                <FinField label="Mortgage"   value={form.mortgage} onChange={v => setField('mortgage', v)} />
                <FinField label="HECS Debt"  value={form.hecs}     onChange={v => setField('hecs', v)} />
              </div>
            </div>

            <div>
              <p className="ff-mono text-[10px] text-realm-gold uppercase tracking-widest mb-2">Cashflow (monthly)</p>
              <div className="grid grid-cols-2 gap-2">
                <FinField label="Income"   value={form.income}   onChange={v => setField('income', v)} />
                <FinField label="Expenses" value={form.expenses} onChange={v => setField('expenses', v)} />
              </div>
            </div>

            {/* preview NW */}
            {previewNW !== 0 && (
              <div className="flex items-center justify-between px-3 py-2
                bg-[#4ade8010] border border-[#4ade8028]">
                <span className="ff-mono text-[10px] text-realm-muted uppercase">Preview Net Worth</span>
                <span className="ff-mono text-[14px]"
                  style={{ color: previewNW >= 0 ? '#4ade80' : '#f87171' }}>
                  {fmt(previewNW)}
                </span>
              </div>
            )}

            <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)}
              placeholder="Notes…" className="fl-input ff-mono text-[12px] resize-none"
              style={{ padding: '0.6rem 0.75rem' }} />

            <div className="flex gap-2">
              <button type="button" disabled={saving} onClick={handleSave}
                className="flex-1 py-3 ff-mono text-[12px] uppercase tracking-[0.15em]
                  border border-realm-gold text-realm-gold bg-realm-gold/15 disabled:opacity-30">
                {saving ? 'Saving…' : 'Save Snapshot'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-3 ff-mono text-[12px] border border-realm-border text-realm-muted">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)}
          className="w-full py-3 ff-mono text-[12px] uppercase tracking-[0.2em]
            border border-dashed border-realm-border text-realm-faint
            hover:border-realm-gold/45 hover:text-realm-muted
            transition-all flex items-center justify-center gap-1.5 mb-5">
          <Plus size={13} />
          New Snapshot
        </button>
      )}

      {/* history */}
      {records.length > 1 && (
        <div>
          <SectionLabel>History</SectionLabel>
          <div className="ios-group">
            {records.slice(1).map(r => {
              const nw = calcNW({ cash: r.cash, super: r.super, invest: r.invest, propval: r.propval, mortgage: r.mortgage, hecs: r.hecs })
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="ff-mono text-[11px] text-realm-muted w-24 shrink-0">{r.date}</span>
                  <span className="ff-mono text-[13px] flex-1 tabular-nums"
                    style={{ color: nw >= 0 ? '#8a8a8a' : '#f87171' }}>
                    {fmt(nw)}
                  </span>
                  <button type="button" onClick={() => deleteFinanceRecord(r.id)}
                    className="text-[#1e1e1e] hover:text-[#f87171] transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {records.length === 0 && !showForm && (
        <div className="py-12 text-center">
          <p className="ff-mono text-[11px] text-[#252525] uppercase tracking-widest">No snapshots yet</p>
          <p className="ff-mono text-[10px] text-[#1e1e1e] mt-1">Log your first balance sheet above</p>
        </div>
      )}

    </div>
  )
}
