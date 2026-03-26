import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sparkles, Loader2 } from 'lucide-react'
import { loadFieldCommandBundle } from '../lib/fieldAnalytics.js'
import { callClaudeProxy } from '../lib/claudeClient.js'
import {
  FIELD_ANALYST_SYSTEM,
  weeklyFieldReportUserMessage,
  monthlyCommanderUserMessage,
  journalMiningUserMessage,
  correlationNarrativeUserMessage,
} from '../lib/claudeContext.js'
import SectionLabel from '../components/SectionLabel'

function Stat({ label, value, sub }) {
  return (
    <div className="ios-card">
      <p className="ff-mono text-[9px] text-realm-muted uppercase tracking-widest">{label}</p>
      <p className="ff-mono text-lg text-realm-text tabular-nums mt-0.5">{value}</p>
      {sub && <p className="ff-mono text-[9px] text-realm-faint mt-1">{sub}</p>}
    </div>
  )
}

function AiBlock({ title, text, loading, error, onRun }) {
  return (
    <div className="ios-card mt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="ff-mono text-[9px] text-realm-gold uppercase tracking-widest">{title}</span>
        <button
          type="button"
          disabled={loading}
          onClick={onRun}
          className="flex items-center gap-1.5 ff-mono text-[9px] uppercase tracking-wider text-realm-soft border border-realm-border px-2 py-1 hover:border-realm-gold/35 hover:text-realm-gold disabled:opacity-40"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {loading ? '…' : 'Run pass'}
        </button>
      </div>
      {error && <p className="ff-mono text-[11px] text-realm-ember">{error}</p>}
      {text && (
        <p className="ff-mono text-[12px] text-realm-text-soft leading-relaxed whitespace-pre-wrap">{text}</p>
      )}
      {!text && !error && !loading && (
        <p className="ff-mono text-[10px] text-realm-faint">Run pass to synthesize from your logs.</p>
      )}
    </div>
  )
}

export default function FieldCommand() {
  const bundle = useLiveQuery(() => loadFieldCommandBundle(), [])

  const [wAi, setWAi] = useState({ text: '', loading: false, err: '' })
  const [mAi, setMAi] = useState({ text: '', loading: false, err: '' })
  const [jAi, setJAi] = useState({ text: '', loading: false, err: '' })
  const [cAi, setCAi] = useState({ text: '', loading: false, err: '' })

  async function runWeekly() {
    if (!bundle) return
    setWAi({ text: '', loading: true, err: '' })
    try {
      const text = await callClaudeProxy({
        system: FIELD_ANALYST_SYSTEM,
        messages: [{ role: 'user', content: weeklyFieldReportUserMessage(bundle) }],
        max_tokens: 900,
      })
      setWAi({ text, loading: false, err: '' })
    } catch (e) {
      setWAi({ text: '', loading: false, err: e?.message || 'Failed' })
    }
  }

  async function runMonthly() {
    if (!bundle) return
    setMAi({ text: '', loading: true, err: '' })
    try {
      const text = await callClaudeProxy({
        system: FIELD_ANALYST_SYSTEM,
        messages: [{ role: 'user', content: monthlyCommanderUserMessage(bundle) }],
        max_tokens: 1200,
      })
      setMAi({ text, loading: false, err: '' })
    } catch (e) {
      setMAi({ text: '', loading: false, err: e?.message || 'Failed' })
    }
  }

  async function runJournal() {
    if (!bundle) return
    setJAi({ text: '', loading: true, err: '' })
    try {
      const text = await callClaudeProxy({
        system: FIELD_ANALYST_SYSTEM,
        messages: [{ role: 'user', content: journalMiningUserMessage(bundle) }],
        max_tokens: 700,
      })
      setJAi({ text, loading: false, err: '' })
    } catch (e) {
      setJAi({ text: '', loading: false, err: e?.message || 'Failed' })
    }
  }

  async function runCorr() {
    if (!bundle) return
    setCAi({ text: '', loading: true, err: '' })
    try {
      const text = await callClaudeProxy({
        system: FIELD_ANALYST_SYSTEM,
        messages: [{ role: 'user', content: correlationNarrativeUserMessage(bundle) }],
        max_tokens: 600,
      })
      setCAi({ text, loading: false, err: '' })
    } catch (e) {
      setCAi({ text: '', loading: false, err: e?.message || 'Failed' })
    }
  }

  const cur = bundle?.weekCompare?.current
  const pri = bundle?.weekCompare?.prior

  return (
    <div className="px-4 pt-4 pb-28 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="ios-title">
          Command
        </h1>
        <p className="mt-1 text-[11px] leading-relaxed text-[rgba(255,255,255,0.32)]">
          Structured stats. Run FORGE for 7d execution, cross-domain read, 30d roll-up, or journal pass.
        </p>
      </div>

      {!bundle ? (
        <p className="forge-mono text-[10px] text-[rgba(255,255,255,0.18)]">loading bundle…</p>
      ) : (
        <>
          <SectionLabel className="mt-8 first:mt-0">Execution · 7d</SectionLabel>
          <p className="ff-mono text-[10px] text-realm-muted mb-2">
            Last completed week: {bundle.lastWeekLabel} · vs {bundle.priorWeekLabel}
          </p>
          {cur && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Stat
                label="Avg weight (kg)"
                value={cur.body.avgWeightKg ?? '—'}
                sub={`Cal ≥88% target: ${cur.body.calorieTargetHitDays} hit · ${cur.body.daysWithCheckIn} check-ins`}
              />
              <Stat
                label="Protein hit days"
                value={`${cur.body.proteinTargetHitDays}`}
                sub={`Sessions: ${cur.body.workoutSessionsLogged} · Gym flags: ${cur.body.gymFlags}`}
              />
              <Stat label="Calls (week)" value={cur.sales.totalCalls} sub={`Meetings: ${cur.sales.meetingsBooked}`} />
              <Stat
                label="Connect %"
                value={cur.sales.connectRate != null ? `${cur.sales.connectRate}%` : '—'}
                sub={pri ? `Prior wk calls: ${pri.sales.totalCalls}` : ''}
              />
            </div>
          )}
          <AiBlock
            title="Weekly field report"
            text={wAi.text}
            loading={wAi.loading}
            error={wAi.err}
            onRun={runWeekly}
          />

          <SectionLabel className="mt-8 first:mt-0">Cross-domain</SectionLabel>
          <div className="ff-mono text-[11px] text-realm-soft space-y-1 ios-card">
            <p>
              Dialed/Solid avg dials:{' '}
              <span className="text-realm-text">
                {bundle.correlations.moodVsDials.avgCallsOnDialedSolidDays ?? '—'}
              </span>{' '}
              · Cooked/Drained:{' '}
              <span className="text-realm-text">
                {bundle.correlations.moodVsDials.avgCallsOnCookedDrainedDays ?? '—'}
              </span>
            </p>
            <p>
              Mood gap %:{' '}
              <span className="text-realm-text">
                {bundle.correlations.moodVsDials.pctMoreDialsWhenDialedVsLowMood ?? '—'}
              </span>{' '}
              (positive = more dials on good mood days)
            </p>
            <p>
              Pay-week vs other weeks (avg calls):{' '}
              <span className="text-realm-text">{bundle.correlations.payRhythm.avgCallsInPayWeek ?? '—'}</span> vs{' '}
              <span className="text-realm-text">{bundle.correlations.payRhythm.avgCallsOtherWeeks ?? '—'}</span>
            </p>
            {bundle.correlations.proteinVsBodyComp?.avgProteinBetweenScans != null && (
              <p>
                Protein between last two scans:{' '}
                <span className="text-realm-text">
                  {bundle.correlations.proteinVsBodyComp.avgProteinBetweenScans}g avg
                </span>
                , ΔBF: {bundle.correlations.proteinVsBodyComp.bfDeltaPoints ?? '—'} pts
              </p>
            )}
          </div>
          <AiBlock
            title="Correlation narrative"
            text={cAi.text}
            loading={cAi.loading}
            error={cAi.err}
            onRun={runCorr}
          />

          <SectionLabel className="mt-8 first:mt-0">Goal lines</SectionLabel>
          <div className="ios-group">
            {bundle.goals.map((g) => (
              <div key={g.title} className="px-3 py-2">
                <p className="ff-mono text-[12px] text-realm-text">{g.title}</p>
                <p className="ff-mono text-[10px] text-realm-muted mt-1">
                  Need ~{g.requiredPerDayToHit ?? '—'}/{g.unit || 'unit'} per day to deadline · implied weekly
                  from logs: {g.impliedWeeklyFromLastLogs ?? '—'} · on-track heuristic:{' '}
                  <span className={g.onTrackHeuristic === true ? 'text-[#4ade80]' : g.onTrackHeuristic === false ? 'text-[#f87171]' : 'text-realm-muted'}>
                    {g.onTrackHeuristic == null ? 'n/a' : g.onTrackHeuristic ? 'yes' : 'no'}
                  </span>
                </p>
              </div>
            ))}
            {bundle.goals.length === 0 && (
              <p className="ff-mono text-[11px] text-realm-faint p-3">No active goals.</p>
            )}
          </div>

          <SectionLabel className="mt-8 first:mt-0">Pipeline</SectionLabel>
          <div className="grid grid-cols-2 gap-2 text-[11px] ff-mono text-realm-soft">
            <Stat label="28d dials" value={bundle.sales.funnel.dials} />
            <Stat label="Meetings" value={bundle.sales.funnel.meetings} />
            <Stat label="Connect %" value={bundle.sales.funnel.pctConnected ?? '—'} />
            <Stat label="Meeting %" value={bundle.sales.funnel.pctMeetings ?? '—'} />
            <Stat label="Dials / meeting" value={bundle.sales.costPerMeeting ?? '—'} />
            <Stat label="Meetings (8d)" value={bundle.sales.momentum.meetingsLast8Days} />
          </div>

          <SectionLabel className="mt-8 first:mt-0">Body</SectionLabel>
          <div className="ff-mono text-[11px] text-realm-soft ios-card space-y-1">
            <p>
              7d avg weight:{' '}
              <span className="text-realm-text">{bundle.body.rollingAvgWeight7d ?? '—'} kg</span>
            </p>
            <p>
              ~21d Δ weight:{' '}
              <span className="text-realm-text">{bundle.body.weightDeltaApprox21d ?? '—'} kg</span>
            </p>
            {bundle.body.directionAlert && (
              <p className="text-[#f87171]">{bundle.body.directionAlert}</p>
            )}
          </div>

          <SectionLabel className="mt-8 first:mt-0">Capital</SectionLabel>
          <div className="ff-mono text-[11px] text-realm-soft ios-card space-y-1">
            <p>
              NW (latest):{' '}
              <span className="text-realm-text">
                {bundle.finance.netWorth != null ? `$${Math.round(bundle.finance.netWorth).toLocaleString()}` : '—'}
              </span>
            </p>
            <p>
              ~Monthly NW velocity (2-point):{' '}
              <span className="text-realm-text">
                {bundle.finance.monthlyNWVelocityApprox != null
                  ? `$${bundle.finance.monthlyNWVelocityApprox.toLocaleString()}`
                  : '—'}
              </span>
            </p>
            <p>HECS on file: {bundle.finance.hecsBalance != null ? `$${Math.round(bundle.finance.hecsBalance).toLocaleString()}` : '—'}</p>
            <p className="text-realm-faint text-[10px]">{bundle.finance.note}</p>
          </div>

          <SectionLabel className="mt-8 first:mt-0">Tasks</SectionLabel>
          <div className="ios-group">
            {bundle.tasks.rankedTop.map((t) => (
              <div key={t.title + (t.due || '')} className="px-3 py-2 flex justify-between gap-2">
                <span className="ff-mono text-[12px] text-realm-text truncate">{t.title}</span>
                <span className="ff-mono text-[10px] text-realm-muted shrink-0">
                  {t.due || '—'} · {t.score}
                </span>
              </div>
            ))}
          </div>

          <SectionLabel className="mt-8 first:mt-0">Journal</SectionLabel>
          <p className="ff-mono text-[10px] text-realm-muted mb-2">
            {bundle.journalCorpus.count} journal entries in sample · run journal pass below for themes.
          </p>
          <AiBlock
            title="Journal + win themes"
            text={jAi.text}
            loading={jAi.loading}
            error={jAi.err}
            onRun={runJournal}
          />

          <SectionLabel className="mt-8 first:mt-0">Command · 30d</SectionLabel>
          <AiBlock
            title="Board-meeting review"
            text={mAi.text}
            loading={mAi.loading}
            error={mAi.err}
            onRun={runMonthly}
          />
        </>
      )}
    </div>
  )
}
