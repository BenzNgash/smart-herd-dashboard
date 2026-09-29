import { useEffect, useMemo, useState } from 'react'
import { Activity, BrainCircuit, RefreshCw, ShieldCheck } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { supabase } from './lib/supabase'
import './model3.css'

const HEALTH_URL =
  import.meta.env.VITE_RENDER_HEALTH_URL ||
  'https://smart-herd-ai-service-1.onrender.com/health'

const fmt = (v) =>
  v
    ? new Intl.DateTimeFormat('en-KE', {
        timeZone: 'Africa/Nairobi',
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(v))
    : '—'

const fmtTime = (v) =>
  v
    ? new Intl.DateTimeFormat('en-KE', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(v))
    : ''

const pct = (v) =>
  Number.isFinite(Number(v)) ? (Number(v) * 100).toFixed(1) + '%' : '—'

const score = (v, d = 1) =>
  Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '—'

const ageMin = (v) =>
  v ? Math.max(0, (Date.now() - new Date(v).getTime()) / 60000) : Infinity

const stateClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'urgent_check') return 'urgent'
  if (s === 'check') return 'check'
  if (s === 'watch') return 'watch'
  return 'normal'
}

export default function Model3Dashboard() {
  const [session, setSession] = useState(null)
  const [animals, setAnimals] = useState([])
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
  const [selectedCow, setSelectedCow] = useState('')
  const [health, setHealth] = useState(null)
  const [rt, setRt] = useState('CONNECTING')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const latestByCow = useMemo(
    () =>
      rows.reduce((acc, row) => {
        if (!acc[row.cow_id]) acc[row.cow_id] = row
        return acc
      }, {}),
    [rows]
  )

  const activeAnimals = animals.filter((a) => a.active !== false)

  const fetchHealth = async () => {
    try {
      const r = await fetch(HEALTH_URL, { cache: 'no-store' })
      const j = await r.json()
      setHealth({ ok: r.ok && j.status === 'healthy', ...j })
    } catch (e) {
      setHealth({ ok: false, error: e.message })
    }
  }

  const fetchLatest = async () => {
    setBusy(true)
    setError('')

    const [a, p] = await Promise.all([
      supabase
        .from('animals')
        .select('cow_id,tag_id,breed,active')
        .order('cow_id'),
      supabase
        .from('health_anomaly_predictions')
        .select('*')
        .order('inference_run_at', { ascending: false })
        .limit(1000)
    ])

    const err = a.error || p.error

    if (err) {
      setError(err.message)
    } else {
      setAnimals(a.data || [])
      setRows(p.data || [])

      if (!selectedCow) {
        const preferred = p.data?.[0]?.cow_id || a.data?.find((x) => x.active !== false)?.cow_id
        if (preferred) setSelectedCow(preferred)
      }
    }

    setBusy(false)
  }

  const fetchHistory = async (cow) => {
    if (!cow) {
      setHistory([])
      return
    }

    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()

    const { data, error } = await supabase
      .from('health_anomaly_predictions')
      .select(
        'ts,inference_run_at,priority_score,status,supervised_score,novelty_score,baseline_quality,data_quality,primary_reason,secondary_reason,model_version'
      )
      .eq('cow_id', cow)
      .gte('inference_run_at', since)
      .order('inference_run_at', { ascending: true })
      .limit(100)

    if (!error) {
      setHistory(
        (data || []).map((r) => ({
          ...r,
          time: fmtTime(r.inference_run_at || r.ts),
          priority: Number(r.priority_score),
          supervised: Number(r.supervised_score),
          novelty: Number(r.novelty_score)
        }))
      )
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    fetchLatest()
    fetchHealth()

    const healthTimer = setInterval(fetchHealth, 5 * 60 * 1000)

    const channel = supabase
      .channel('model3-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_anomaly_predictions' },
        () => {
          fetchLatest()
          fetchHistory(selectedCow)
        }
      )
      .subscribe(setRt)

    return () => {
      clearInterval(healthTimer)
      supabase.removeChannel(channel)
    }
  }, [session, selectedCow])

  useEffect(() => {
    if (session && selectedCow) fetchHistory(selectedCow)
  }, [session, selectedCow])

  if (!session) return null

  const current = latestByCow[selectedCow]
  const newest = rows[0]
  const model3SelfTest = health?.models?.model3?.self_test?.passed === true
  const model3Live =
    ageMin(newest?.inference_run_at || newest?.created_at || newest?.ts) <= 95
  const currentFresh =
    ageMin(current?.inference_run_at || current?.created_at || current?.ts) <= 95

  return (
    <section className="m3-shell">
      <div className="m3-panel m3-header-panel">
        <div>
          <p className="m3-eyebrow">MODEL 3 · SHADOW RESEARCH</p>
          <h2>Personalized Health Anomaly Monitoring</h2>
          <p className="m3-muted">
            Observation-priority monitoring only. Model 3 does not diagnose disease.
          </p>
        </div>

        <div className="m3-actions">
          <span className={model3Live ? 'm3-pill ok' : 'm3-pill warn'}>
            {model3Live ? 'HOURLY LIVE' : 'STALE'}
          </span>
          <span className={model3SelfTest ? 'm3-pill ok' : 'm3-pill warn'}>
            SELF-TEST {model3SelfTest ? 'PASS' : 'CHECK'}
          </span>
          <span className={rt === 'SUBSCRIBED' ? 'm3-pill ok' : 'm3-pill warn'}>
            REALTIME {rt}
          </span>
          <button
            className="m3-refresh"
            onClick={() => {
              fetchLatest()
              fetchHealth()
              fetchHistory(selectedCow)
            }}
          >
            <RefreshCw size={15} />
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="m3-error">{error}</div>}

      <div className="m3-panel">
        <div className="m3-title-row">
          <div>
            <p className="m3-eyebrow">CURRENT ANIMAL</p>
            <h3>{selectedCow || 'No animal selected'}</h3>
          </div>

          <select value={selectedCow} onChange={(e) => setSelectedCow(e.target.value)}>
            {activeAnimals.map((a) => (
              <option key={a.cow_id} value={a.cow_id}>
                {a.cow_id}{a.tag_id ? ' · ' + a.tag_id : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="m3-current-grid">
          <article className="m3-card">
            <div className="m3-card-head">
              <div>
                <p className="m3-muted">Observation priority</p>
                <div className="m3-score">
                  {current ? score(current.priority_score, 1) : '—'}
                  {current && <small> / 100</small>}
                </div>
              </div>
              <span className={'m3-state ' + stateClass(current?.status)}>
                {current?.status || 'NO DATA'}
              </span>
            </div>

            <div className="m3-track">
              <div
                className="m3-fill"
                style={{ width: Math.min(100, Number(current?.priority_score) || 0) + '%' }}
              />
            </div>

            <div className="m3-mini-grid">
              <div>
                <span>Supervised</span>
                <strong>{score(current?.supervised_score, 1)}</strong>
              </div>
              <div>
                <span>Novelty</span>
                <strong>{score(current?.novelty_score, 1)}</strong>
              </div>
              <div>
                <span>Baseline quality</span>
                <strong>{pct(current?.baseline_quality)}</strong>
              </div>
              <div>
                <span>Data quality</span>
                <strong>{pct(current?.data_quality)}</strong>
              </div>
            </div>
          </article>

          <article className="m3-card">
            <div className="m3-card-head">
              <div>
                <p className="m3-muted">Decision engine</p>
                <h3>{current?.decision_path || 'No decision yet'}</h3>
              </div>
              <BrainCircuit size={22} />
            </div>

            <div className="m3-reason">
              <strong>{current?.primary_reason || 'No anomaly explanation yet'}</strong>
              {current?.secondary_reason && <span>{current.secondary_reason}</span>}
            </div>

            <div className="m3-detail-list">
              <span>
                Persistence <strong>{current?.persistence_hours != null ? current.persistence_hours + ' h' : '—'}</strong>
              </span>
              <span>
                Actionable research flag <strong>{current?.actionable ? 'YES' : 'NO'}</strong>
              </span>
              <span>
                Latest run <strong>{fmt(current?.inference_run_at || current?.ts)}</strong>
              </span>
              <span>
                Freshness <strong>{currentFresh ? 'CURRENT' : 'STALE'}</strong>
              </span>
            </div>
          </article>

          <article className="m3-card">
            <div className="m3-card-head">
              <div>
                <p className="m3-muted">Deployment</p>
                <h3>Decision-level hybrid v3</h3>
              </div>
              <ShieldCheck size={22} />
            </div>

            <div className="m3-detail-list">
              <span>
                Primary branch <strong>XGBoost</strong>
              </span>
              <span>
                Novelty branch <strong>Isolation Forest</strong>
              </span>
              <span>
                Features <strong>122</strong>
              </span>
              <span>
                Schedule <strong>Hourly at :08</strong>
              </span>
              <span>
                Version <strong>{current?.model_version || 'model3-decision-v3-shadow'}</strong>
              </span>
            </div>

            <div className="m3-warning">
              SHADOW_RESEARCH · No farmer-facing health alert · No disease diagnosis
            </div>
          </article>
        </div>
      </div>

      <div className="m3-panel">
        <div className="m3-title-row">
          <div>
            <p className="m3-eyebrow">LAST 48 HOURS</p>
            <h3>Model 3 score history</h3>
          </div>
          <Activity size={21} />
        </div>

        <div className="m3-chart">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="time" minTickGap={28} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                dataKey="priority"
                name="Priority"
                stroke="#22d3ee"
                dot={false}
                strokeWidth={2.5}
              />
              <Line
                dataKey="supervised"
                name="Supervised"
                stroke="#a78bfa"
                dot={false}
                strokeWidth={1.8}
              />
              <Line
                dataKey="novelty"
                name="Novelty"
                stroke="#fb7185"
                dot={false}
                strokeWidth={1.8}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="m3-panel">
        <div className="m3-title-row">
          <div>
            <p className="m3-eyebrow">HERD OVERVIEW</p>
            <h3>Latest Model 3 state by animal</h3>
          </div>
          <span className="m3-muted">{activeAnimals.length} active</span>
        </div>

        <div className="m3-table-wrap">
          <table className="m3-table">
            <thead>
              <tr>
                <th>Cow</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Supervised</th>
                <th>Novelty</th>
                <th>Baseline</th>
                <th>Reason</th>
                <th>Last run</th>
              </tr>
            </thead>
            <tbody>
              {activeAnimals.map((a) => {
                const row = latestByCow[a.cow_id]
                return (
                  <tr key={a.cow_id} onClick={() => setSelectedCow(a.cow_id)}>
                    <td>
                      <strong>{a.cow_id}</strong>
                      <small>{a.tag_id || a.breed || ''}</small>
                    </td>
                    <td>
                      {row ? (
                        <span className={'m3-state compact ' + stateClass(row.status)}>
                          {row.status}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{row ? score(row.priority_score, 1) : '—'}</td>
                    <td>{row ? score(row.supervised_score, 1) : '—'}</td>
                    <td>{row ? score(row.novelty_score, 1) : '—'}</td>
                    <td>{pct(row?.baseline_quality)}</td>
                    <td className="m3-reason-cell">{row?.primary_reason || '—'}</td>
                    <td>{fmt(row?.inference_run_at || row?.ts)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
