import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { useScans, saveScan, deleteScan } from '../hooks/useScans'
import { awardXP } from '../hooks/useXP'
import { XP as XP_VALUES } from '../theme'
import { db } from '../db'
import SectionLabel from '../components/SectionLabel'

const BLANK = {
  date: format(new Date(), 'yyyy-MM-dd'),
  weight: '', bf: '', lean: '', fat: '',
  ffmi: '', visceral: '', bmd: '',
  arms: '', legs: '', trunk: '', android: '',
  notes: '',
}

function Stat({ label, value, unit, delta, deltaInvert }) {
  if (value == null || value === '') return null
  const deltaNum = parseFloat(delta)
  const positive = deltaNum > 0
  const improved = deltaInvert ? !positive : positive
  return (
    <div className="flex flex-col gap-0.5">
      <span className="ff-mono text-[9px] text-realm-faint uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="ff-mono text-[16px] text-realm-text tabular-nums">{value}</span>
        {unit && <span className="ff-mono text-[10px] text-realm-muted">{unit}</span>}
      </div>
      {!isNaN(deltaNum) && deltaNum !== 0 && (
        <span className="ff-mono text-[10px]" style={{ color: improved ? '#4ade80' : '#f87171' }}>
          {positive ? '+' : ''}{deltaNum} {unit}
        </span>
      )}
    </div>
  )
}

export default function BodyComp({ onXP }) {
  const scans     = useScans()
  const [showForm, setShowForm] = useState(false)
  const [form,    setForm]    = useState(BLANK)
  const [saving,  setSaving]  = useState(false)
  const [showAdv, setShowAdv] = useState(false)

  const latest = scans[0]
  const prev   = scans[1]

  function delta(field) {
    if (!latest || !prev) return null
    const a = parseFloat(latest[field])
    const b = parseFloat(prev[field])
    if (isNaN(a) || isNaN(b)) return null
    return +(a - b).toFixed(2)
  }

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.date) return
    setSaving(true)
    const rec = {
      id:       crypto.randomUUID(),
      date:     form.date,
      weight:   parseFloat(form.weight)   || null,
      bf:       parseFloat(form.bf)       || null,
      lean:     parseFloat(form.lean)     || null,
      fat:      parseFloat(form.fat)      || null,
      ffmi:     parseFloat(form.ffmi)     || null,
      visceral: parseFloat(form.visceral) || null,
      bmd:      parseFloat(form.bmd)      || null,
      arms:     parseFloat(form.arms)     || null,
      legs:     parseFloat(form.legs)     || null,
      trunk:    parseFloat(form.trunk)    || null,
      android:  parseFloat(form.android)  || null,
      notes:    form.notes.trim() || null,
    }
    await saveScan(rec)

    const totalScans = await db.scans.count()
    const { unlockedAchievements } = await awardXP(XP_VALUES.logScan, {
      totalScans,
      totalCheckIns: 0, checkInStreak: 0, totalWorkouts: 0,
      totalGoals: 0, completedGoals: 0, outboundDays: 0, totalCalls: 0,
      totalWeightLogs: 0, totalFinanceLogs: 0,
    })
    onXP?.({ amount: XP_VALUES.logScan, achievement: unlockedAchievements[0] ?? null })

    setForm(BLANK)
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="ff-heading text-[22px] font-bold text-realm-text tracking-tight leading-none">
            BODY SCAN
          </h1>
          <p className="ff-mono text-[11px] text-realm-faint mt-1 tracking-[0.15em] uppercase">
            DXA / InBody / Body Composition
          </p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1.5
          bg-realm-gold/10 border border-realm-gold/25">
          <Zap size={11} className="text-realm-gold" />
          <span className="ff-mono text-[11px] text-realm-gold">+{XP_VALUES.logScan} XP</span>
        </div>
      </div>

      {/* latest scan metrics */}
      {latest && (
        <div className="mb-5">
          <SectionLabel>Latest · {latest.date}</SectionLabel>
          <div className="border border-realm-border bg-realm-panel p-4">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Weight"   value={latest.weight}   unit="kg"  delta={delta('weight')}  deltaInvert />
              <Stat label="Body Fat" value={latest.bf}       unit="%"   delta={delta('bf')}       deltaInvert />
              <Stat label="Lean"     value={latest.lean}     unit="kg"  delta={delta('lean')} />
              <Stat label="Fat Mass" value={latest.fat}      unit="kg"  delta={delta('fat')}      deltaInvert />
              <Stat label="FFMI"     value={latest.ffmi}     unit=""    delta={delta('ffmi')} />
              <Stat label="Visceral" value={latest.visceral} unit=""    delta={delta('visceral')} deltaInvert />
            </div>
            {(latest.arms || latest.legs || latest.trunk) && (
              <div className="mt-4 pt-4 border-t border-realm-hairline grid grid-cols-3 gap-4">
                <Stat label="Arms"   value={latest.arms}   unit="kg" delta={delta('arms')} />
                <Stat label="Legs"   value={latest.legs}   unit="kg" delta={delta('legs')} />
                <Stat label="Trunk"  value={latest.trunk}  unit="kg" delta={delta('trunk')} />
              </div>
            )}
            {latest.notes && (
              <p className="ff-mono text-[11px] text-realm-muted mt-3 pt-3 border-t border-realm-hairline">
                {latest.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* new scan form */}
      {showForm && (
        <div className="mb-5">
          <SectionLabel>New Scan</SectionLabel>
          <div className="border border-realm-gold/25 bg-realm-panel p-4 space-y-3">
            <div>
              <label className="ff-mono text-[10px] text-realm-muted uppercase tracking-widest block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
                className="fl-input ff-mono text-sm py-2" style={{ colorScheme: 'dark' }} />
            </div>

            {/* essential */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: 'weight', label: 'Weight (kg)' },
                { k: 'bf',     label: 'Body Fat (%)' },
                { k: 'lean',   label: 'Lean (kg)' },
              ].map(({ k, label }) => (
                <div key={k}>
                  <label className="ff-mono text-[9px] text-realm-muted uppercase tracking-widest block mb-1">
                    {label}
                  </label>
                  <input type="number" inputMode="decimal" step="0.1"
                    value={form[k]} onChange={e => setField(k, e.target.value)}
                    placeholder="—" className="fl-input ff-mono text-sm text-center py-2" />
                </div>
              ))}
            </div>

            {/* advanced toggle */}
            <button type="button" onClick={() => setShowAdv(v => !v)}
              className="ff-mono text-[10px] text-realm-muted uppercase tracking-widest
                flex items-center gap-1.5 hover:text-realm-gold transition-colors">
              {showAdv ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              Advanced metrics
            </button>

            {showAdv && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: 'fat',      label: 'Fat (kg)' },
                  { k: 'ffmi',     label: 'FFMI' },
                  { k: 'visceral', label: 'Visceral' },
                  { k: 'bmd',      label: 'BMD' },
                  { k: 'arms',     label: 'Arms (kg)' },
                  { k: 'legs',     label: 'Legs (kg)' },
                  { k: 'trunk',    label: 'Trunk (kg)' },
                  { k: 'android',  label: 'Android (%)' },
                ].map(({ k, label }) => (
                  <div key={k}>
                    <label className="ff-mono text-[9px] text-realm-muted uppercase tracking-widest block mb-1">
                      {label}
                    </label>
                    <input type="number" inputMode="decimal" step="0.1"
                      value={form[k]} onChange={e => setField(k, e.target.value)}
                      placeholder="—" className="fl-input ff-mono text-sm text-center py-2" />
                  </div>
                ))}
              </div>
            )}

            <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)}
              placeholder="Notes…" className="fl-input ff-mono text-[12px] resize-none"
              style={{ padding: '0.6rem 0.75rem' }} />

            <div className="flex gap-2">
              <button type="button" disabled={saving} onClick={handleSave}
                className="flex-1 py-3 ff-mono text-[12px] uppercase tracking-[0.15em]
                  border border-realm-gold text-realm-gold bg-realm-gold/15 disabled:opacity-30">
                {saving ? 'Saving…' : 'Save Scan'}
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
            transition-all duration-150 flex items-center justify-center gap-1.5 mb-5">
          <Plus size={13} />
          Log New Scan
        </button>
      )}

      {/* scan history */}
      {scans.length > 1 && (
        <div>
          <SectionLabel>History</SectionLabel>
          <div className="border border-realm-border divide-y divide-realm-hairline">
            {scans.slice(1).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="ff-mono text-[11px] text-realm-muted w-24 shrink-0">{s.date}</span>
                <div className="flex gap-4 flex-1">
                  {s.weight != null && (
                    <span className="ff-mono text-[11px] text-realm-text tabular-nums">{s.weight}kg</span>
                  )}
                  {s.bf != null && (
                    <span className="ff-mono text-[11px] text-realm-soft tabular-nums">{s.bf}% bf</span>
                  )}
                  {s.lean != null && (
                    <span className="ff-mono text-[11px] text-realm-soft tabular-nums">{s.lean}kg lean</span>
                  )}
                </div>
                <button type="button" onClick={() => deleteScan(s.id)}
                  className="text-[#1e1e1e] hover:text-[#f87171] transition-colors shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {scans.length === 0 && !showForm && (
        <div className="py-12 text-center">
          <p className="ff-mono text-[11px] text-[#252525] uppercase tracking-widest">No scans logged</p>
          <p className="ff-mono text-[10px] text-[#1e1e1e] mt-1">Log a DXA or InBody scan above</p>
        </div>
      )}

    </div>
  )
}
