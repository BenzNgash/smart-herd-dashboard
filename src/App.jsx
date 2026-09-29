import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  BrainCircuit,
  Cloud,
  Database,
  LogOut,
  Radio,
  RefreshCw,
  Thermometer,
  BatteryCharging,
  ShieldCheck
} from 'lucide-react'

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


// ============================================================
// CONFIG
// ============================================================

const HEALTH_URL =
  import.meta.env.VITE_RENDER_HEALTH_URL ||
  'https://smart-herd-ai-service-1.onrender.com/health'


// ============================================================
// FORMATTERS
// ============================================================

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


// General percentage
const pct = (v) =>
  Number.isFinite(Number(v))
    ? `${(Number(v) * 100).toFixed(1)}%`
    : '—'


// Model 2 probability needs more precision because
// values can be much smaller than 0.1%.
const modelPct = (v) =>
  Number.isFinite(Number(v))
    ? `${(Number(v) * 100).toFixed(2)}%`
    : '—'


const num = (v, d = 2) =>
  Number.isFinite(Number(v))
    ? Number(v).toFixed(d)
    : '—'


const score = (v, d = 1) =>
  Number.isFinite(Number(v))
    ? Number(v).toFixed(d)
    : '—'


const ageMin = (v) =>
  v
    ? Math.max(
        0,
        (Date.now() - new Date(v).getTime()) / 60000
      )
    : Infinity


const latestByCow = (rows = []) =>
  rows.reduce((m, r) => {
    if (!m[r.cow_id]) {
      m[r.cow_id] = r
    }

    return m
  }, {})


// ============================================================
// LOGIN
// ============================================================

function Login() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)


  const submit = async (e) => {

    e.preventDefault()

    setBusy(true)
    setError('')

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      })

    setBusy(false)

    if (error) {
      setError(error.message)
    }
  }


  return (

    <main className="login-shell">

      <section className="login-card">

        <div className="logo">
          <Activity />
        </div>

        <p className="eyebrow">
          SMART HERD
        </p>

        <h1>
          Live Monitoring Dashboard
        </h1>

        <p className="muted">
          Sign in to inspect the edge-to-cloud livestock
          monitoring pipeline.
        </p>


        <form onSubmit={submit}>

          <label>
            Email

            <input
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

          </label>


          <label>
            Password

            <input
              type="password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

          </label>


          {error && (
            <div className="error">
              {error}
            </div>
          )}


          <button disabled={busy}>
            {busy
              ? 'Signing in…'
              : 'Sign in'}
          </button>

        </form>

      </section>

    </main>
  )
}


// ============================================================
// STATUS CARD
// ============================================================

function StatusCard({
  icon: Icon,
  label,
  status,
  detail,
  ok
}) {

  return (

    <article className="status-card">

      <div className="status-icon">
        <Icon size={20} />
      </div>


      <div>

        <div className="status-head">

          <strong>
            {label}
          </strong>

          <span
            className={
              ok
                ? 'pill ok'
                : 'pill warn'
            }
          >
            {status}
          </span>

        </div>


        <p>
          {detail}
        </p>

      </div>

    </article>
  )
}


// ============================================================
// METRIC CARD
// ============================================================

function Metric({
  icon: Icon,
  label,
  value
}) {

  return (

    <div className="metric">

      <Icon size={18} />

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  )
}


// ============================================================
// MAIN APP
// ============================================================

export default function App() {

  const [session, setSession] =
    useState(null)

  const [checking, setChecking] =
    useState(true)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')


  const [animals, setAnimals] =
    useState([])

  const [b5, setB5] =
    useState([])

  const [b15, setB15] =
    useState([])

  const [preds, setPreds] =
    useState([])

  const [m3Preds, setM3Preds] =
    useState([])

  const [env, setEnv] =
    useState([])


  const [selectedCow, setSelectedCow] =
    useState('')

  const [history, setHistory] =
    useState([])

  const [predHistory, setPredHistory] =
    useState([])

  const [m3History, setM3History] =
    useState([])

  const [health, setHealth] =
    useState(null)

  const [rt, setRt] =
    useState('CONNECTING')


  const timer = useRef(null)


  // ==========================================================
  // LATEST RECORDS BY COW
  // ==========================================================

  const latest5 =
    useMemo(
      () => latestByCow(b5),
      [b5]
    )


  const latest15 =
    useMemo(
      () => latestByCow(b15),
      [b15]
    )


  const latestPred =
    useMemo(
      () => latestByCow(preds),
      [preds]
    )


  const latestM3 =
    useMemo(
      () => latestByCow(m3Preds),
      [m3Preds]
    )


  // ==========================================================
  // RENDER HEALTH
  // ==========================================================

  const fetchHealth = async () => {

    try {

      const r =
        await fetch(
          HEALTH_URL,
          {
            cache: 'no-store'
          }
        )


      const j =
        await r.json()


      setHealth({
        ok:
          r.ok &&
          j.status === 'healthy',

        ...j
      })

    } catch (e) {

      setHealth({
        ok: false,
        error: e.message
      })
    }
  }


  // ==========================================================
  // FETCH DASHBOARD DATA
  // ==========================================================

  const fetchAll = async () => {

    setLoading(true)
    setError('')


    const [
      a,
      x,
      y,
      p,
      m3,
      e
    ] =
      await Promise.all([

        supabase
          .from('animals')
          .select(
            'cow_id,farm_id,tag_id,breed,active'
          )
          .order('cow_id'),


        supabase
          .from('behavior_5min')
          .select('*')
          .order(
            'ts',
            {
              ascending: false
            }
          )
          .limit(1000),


        supabase
          .from('behavior_15min')
          .select('*')
          .order(
            'ts',
            {
              ascending: false
            }
          )
          .limit(1000),


        // IMPORTANT:
        // Order by created_at so the dashboard knows
        // which Model 2 inference ran most recently.
        supabase
          .from('estrus_predictions')
          .select('*')
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(1000),


        supabase
          .from('health_anomaly_predictions')
          .select('*')
          .order(
            'inference_run_at',
            {
              ascending: false
            }
          )
          .limit(1000),


        supabase
          .from('environment_readings')
          .select('*')
          .order(
            'ts',
            {
              ascending: false
            }
          )
          .limit(50)

      ])


    const err =
      [
        a.error,
        x.error,
        y.error,
        p.error,
        m3.error,
        e.error
      ].find(Boolean)


    if (err) {

      setError(
        err.message
      )

    } else {

      setAnimals(
        a.data || []
      )

      setB5(
        x.data || []
      )

      setB15(
        y.data || []
      )

      setPreds(
        p.data || []
      )

      setM3Preds(
        m3.data || []
      )

      setEnv(
        e.data || []
      )


      if (
        !selectedCow &&
        a.data?.length
      ) {

        setSelectedCow(
          a.data[0].cow_id
        )
      }
    }


    setLoading(false)
  }


  // ==========================================================
  // FETCH 24-HOUR HISTORY
  // ==========================================================

  const fetchHistory =
    async (cow) => {

      if (!cow) {
        return
      }


      const since =
        new Date(
          Date.now() -
          24 * 3600 * 1000
        ).toISOString()


      const [
        h,
        p,
        m3
      ] =
        await Promise.all([


          supabase
            .from(
              'behavior_15min'
            )
            .select(
              `
              ts,
              walking_prop,
              grazing_prop,
              resting_prop,
              other_prop,
              activity_intensity,
              data_quality
              `
            )
            .eq(
              'cow_id',
              cow
            )
            .gte(
              'ts',
              since
            )
            .order(
              'ts',
              {
                ascending: true
              }
            )
            .limit(200),


          // History remains ordered by the scientific/data
          // timestamp rather than created_at.
          supabase
            .from(
              'estrus_predictions'
            )
            .select(
              `
              ts,
              created_at,
              probability,
              baseline_quality,
              model_version
              `
            )
            .eq(
              'cow_id',
              cow
            )
            .gte(
              'ts',
              since
            )
            .order(
              'ts',
              {
                ascending: true
              }
            )
            .limit(200),


          supabase
            .from(
              'health_anomaly_predictions'
            )
            .select(
              `
              ts,
              inference_run_at,
              priority_score,
              status,
              actionable,
              decision_path,
              supervised_score,
              novelty_score,
              baseline_quality,
              data_quality,
              persistence_hours,
              primary_reason,
              secondary_reason,
              model_version
              `
            )
            .eq(
              'cow_id',
              cow
            )
            .gte(
              'inference_run_at',
              new Date(
                Date.now() -
                48 * 3600 * 1000
              ).toISOString()
            )
            .order(
              'inference_run_at',
              {
                ascending: true
              }
            )
            .limit(100)

        ])


      if (!h.error) {

        setHistory(

          (h.data || [])
            .map((r) => ({

              ...r,

              time:
                fmtTime(
                  r.ts
                ),

              walk:
                +r.walking_prop *
                100,

              graz:
                +r.grazing_prop *
                100,

              rest:
                +r.resting_prop *
                100

            }))
        )
      }


      if (!p.error) {

        setPredHistory(

          (p.data || [])
            .map((r) => ({

              ...r,

              time:
                fmtTime(
                  r.ts
                ),

              prob:
                +r.probability *
                100

            }))
        )
      }


      if (!m3.error) {

        setM3History(

          (m3.data || [])
            .map((r) => ({

              ...r,

              time:
                fmtTime(
                  r.inference_run_at ||
                  r.ts
                ),

              priority:
                +r.priority_score,

              supervised:
                +r.supervised_score,

              novelty:
                +r.novelty_score

            }))
        )
      }
    }


  // ==========================================================
  // REALTIME REFRESH
  // ==========================================================

  const scheduleRefresh = () => {

    clearTimeout(
      timer.current
    )


    timer.current =
      setTimeout(
        () => {

          fetchAll()

          fetchHistory(
            selectedCow
          )

        },
        500
      )
  }


  // ==========================================================
  // AUTH
  // ==========================================================

  useEffect(
    () => {

      supabase.auth
        .getSession()
        .then(
          ({ data }) => {

            setSession(
              data.session
            )

            setChecking(
              false
            )
          }
        )


      const {
        data: l
      } =
        supabase.auth
          .onAuthStateChange(
            (_e, s) =>
              setSession(s)
          )


      return () =>
        l.subscription
          .unsubscribe()

    },
    []
  )


  // ==========================================================
  // REALTIME SUBSCRIPTIONS
  // ==========================================================

  useEffect(
    () => {

      if (!session) {
        return
      }


      fetchAll()
      fetchHealth()


      const hi =
        setInterval(
          fetchHealth,
          5 * 60 * 1000
        )


      const ch =
        supabase
          .channel(
            'dashboard'
          )

          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table:
                'behavior_5min'
            },
            scheduleRefresh
          )

          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table:
                'behavior_15min'
            },
            scheduleRefresh
          )

          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table:
                'estrus_predictions'
            },
            scheduleRefresh
          )

          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table:
                'health_anomaly_predictions'
            },
            scheduleRefresh
          )

          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table:
                'environment_readings'
            },
            scheduleRefresh
          )

          .subscribe(
            setRt
          )


      return () => {

        clearInterval(
          hi
        )

        clearTimeout(
          timer.current
        )

        supabase
          .removeChannel(
            ch
          )
      }

    },
    [
      session,
      selectedCow
    ]
  )


  // ==========================================================
  // FETCH HISTORY WHEN COW CHANGES
  // ==========================================================

  useEffect(
    () => {

      if (
        session &&
        selectedCow
      ) {

        fetchHistory(
          selectedCow
        )
      }

    },
    [
      session,
      selectedCow
    ]
  )


  // ==========================================================
  // LOGIN STATE
  // ==========================================================

  if (checking) {

    return (
      <div className="center">
        Loading…
      </div>
    )
  }


  if (!session) {

    return (
      <Login />
    )
  }


  // ==========================================================
  // CURRENT DATA
  // ==========================================================

  const active =
    animals.filter(
      (a) =>
        a.active !== false
    )


  const current5 =
    latest5[
      selectedCow
    ]


  const current15 =
    latest15[
      selectedCow
    ]


  const currentPred =
    latestPred[
      selectedCow
    ]


  const currentM3 =
    latestM3[
      selectedCow
    ]


  const newest5 =
    b5[0]


  const newest15 =
    b15[0]


  const newestPred =
    preds[0]


  const newestM3 =
    m3Preds[0]


  // ==========================================================
  // PIPELINE HEALTH
  // ==========================================================

  const model1Ok =
    ageMin(
      newest5?.ts
    ) <= 12


  const aggOk =
    ageMin(
      newest15?.ts
    ) <= 30


  // IMPORTANT:
  // Model 2 freshness uses created_at.
  //
  // ts         = data/hour evaluated
  // created_at = when inference actually ran
  //
  // Model 2 runs every 15 minutes.
  // 35 minutes gives enough scheduling / cold-start margin.

  const model2Ok =
    ageMin(
      newestPred?.created_at ||
      newestPred?.ts
    ) <= 35


  const model3Ok =
    ageMin(
      newestM3?.inference_run_at ||
      newestM3?.created_at ||
      newestM3?.ts
    ) <= 95


  const m2SelfTest =
    health?.models?.model2
      ?.self_test?.passed ??
    health?.self_test?.passed


  const m3SelfTest =
    health?.models?.model3
      ?.self_test?.passed


  const renderOk =
    health?.ok &&
    m2SelfTest &&
    m3SelfTest


  const logout =
    () =>
      supabase.auth
        .signOut()


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div>

      <header>

        <div>

          <div className="brand">

            <Activity size={24} />

            <strong>
              Smart Herd
            </strong>

            <span className="shadow">
              MODELS 2 + 3 SHADOW
            </span>

          </div>


          <small>
            Live edge-to-cloud monitoring · DeKUT pilot
          </small>

        </div>


        <div className="actions">

          <button
            className="secondary"
            onClick={() => {

              fetchAll()
              fetchHealth()
              fetchHistory(
                selectedCow
              )

            }}
          >

            <RefreshCw
              size={16}
            />

            Refresh

          </button>


          <button
            className="ghost"
            onClick={
              logout
            }
          >

            <LogOut
              size={16}
            />

            Sign out

          </button>

        </div>

      </header>


      <main className="dashboard">

        {error && (

          <div className="error">

            {error}

          </div>

        )}


        {/* ====================================================
            SYSTEM HEALTH
        ==================================================== */}

        <section className="panel">

          <div className="section-title">

            <div>

              <p className="eyebrow">
                SYSTEM HEALTH
              </p>

              <h2>
                Pipeline status
              </h2>

            </div>


            <span className="realtime">

              <i
                className={
                  rt ===
                  'SUBSCRIBED'
                    ? 'dot on'
                    : 'dot'
                }
              />

              Realtime: {rt}

            </span>

          </div>


          <div className="status-grid">

            <StatusCard

              icon={Radio}

              label="Model 1 stream"

              status={
                model1Ok
                  ? 'LIVE'
                  : 'STALE'
              }

              ok={
                model1Ok
              }

              detail={
                newest5
                  ? `Latest 5-min summary ${fmt(newest5.ts)}`
                  : 'No behavior_5min data'
              }

            />


            <StatusCard

              icon={Database}

              label="15-min aggregation"

              status={
                aggOk
                  ? 'LIVE'
                  : 'STALE'
              }

              ok={
                aggOk
              }

              detail={
                newest15
                  ? `Latest aggregate ${fmt(newest15.ts)}`
                  : 'No behavior_15min data'
              }

            />


            <StatusCard

              icon={BrainCircuit}

              label="Model 2 shadow"

              status={
                model2Ok
                  ? 'LIVE'
                  : 'STALE'
              }

              ok={
                model2Ok
              }

              detail={
                newestPred
                  ? `Latest run ${fmt(
                      newestPred.created_at ||
                      newestPred.ts
                    )}`
                  : 'No predictions yet'
              }

            />


            <StatusCard

              icon={ShieldCheck}

              label="Model 3 shadow"

              status={
                model3Ok
                  ? 'LIVE'
                  : 'STALE'
              }

              ok={
                model3Ok
              }

              detail={
                newestM3
                  ? `Latest run ${fmt(
                      newestM3.inference_run_at ||
                      newestM3.created_at ||
                      newestM3.ts
                    )}`
                  : 'No health anomaly predictions yet'
              }

            />


            <StatusCard

              icon={Cloud}

              label="Render AI service"

              status={
                renderOk
                  ? 'HEALTHY'
                  : 'CHECK'
              }

              ok={
                renderOk
              }

              detail={
                health?.ok
                  ? `Model 2 ${m2SelfTest ? '✓' : '✕'} · Model 3 ${m3SelfTest ? '✓' : '✕'}`
                  : (
                      health?.error ||
                      'Health check pending'
                    )
              }

            />

          </div>

        </section>


        {/* ====================================================
            CURRENT COW
        ==================================================== */}

        <section className="panel">

          <div className="section-title">

            <div>

              <p className="eyebrow">
                ANIMAL MONITORING
              </p>

              <h2>
                Current cow status
              </h2>

            </div>


            <select
              value={selectedCow}
              onChange={
                (e) =>
                  setSelectedCow(
                    e.target.value
                  )
              }
            >

              {active.map(
                (c) => (

                  <option
                    key={
                      c.cow_id
                    }
                    value={
                      c.cow_id
                    }
                  >

                    {c.cow_id}

                    {c.tag_id
                      ? ` · ${c.tag_id}`
                      : ''
                    }

                  </option>

                )
              )}

            </select>

          </div>


          <div className="cow-grid">

            {/* BEHAVIOR */}

            <div className="subpanel">

              <p className="muted">
                Latest 15-minute behavior
              </p>

              <h3>
                {selectedCow ||
                  'No cow selected'}
              </h3>

              <small>
                {fmt(
                  current15?.ts
                )}
              </small>


              <div className="bars">

                {[
                  [
                    'Walking',
                    current15
                      ?.walking_prop
                  ],
                  [
                    'Grazing',
                    current15
                      ?.grazing_prop
                  ],
                  [
                    'Resting',
                    current15
                      ?.resting_prop
                  ],
                  [
                    'Other',
                    current15
                      ?.other_prop
                  ]
                ].map(
                  ([l, v]) => (

                    <div key={l}>

                      <div className="bar-label">

                        <span>
                          {l}
                        </span>

                        <strong>
                          {pct(v)}
                        </strong>

                      </div>


                      <div className="track">

                        <div

                          className="fill"

                          style={{
                            width:
                              `${
                                Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    +v *
                                    100 ||
                                    0
                                  )
                                )
                              }%`
                          }}

                        />

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>


            {/* SENSOR / MODEL 1 METRICS */}

            <div className="subpanel metrics">

              <Metric

                icon={
                  ShieldCheck
                }

                label="Data quality"

                value={
                  pct(
                    current15
                      ?.data_quality
                  )
                }

              />


              <Metric

                icon={
                  Thermometer
                }

                label="Collar temperature"

                value={
                  current15
                    ?.collar_temperature
                    != null

                    ? `${num(
                        current15
                          .collar_temperature,
                        1
                      )} °C`

                    : '—'
                }

              />


              <Metric

                icon={
                  BatteryCharging
                }

                label="Battery"

                value={
                  current5
                    ?.battery_v
                    != null

                    ? `${num(
                        current5
                          .battery_v,
                        2
                      )} V`

                    : '—'
                }

              />


              <Metric

                icon={
                  Radio
                }

                label="Model 1 confidence"

                value={
                  pct(
                    current15
                      ?.mean_model1_confidence
                  )
                }

              />

            </div>


            {/* MODEL 2 */}

            <div className="subpanel model2">

              <div className="model2-head">

                <div>

                  <p className="muted">
                    Model 2
                  </p>

                  <h3>
                    Estrus likelihood
                  </h3>

                </div>


                <span className="shadow">
                  SHADOW
                </span>

              </div>


              <div className="big-number">

                {currentPred
                  ? modelPct(
                      currentPred
                        .probability
                    )
                  : '—'
                }

              </div>


              <div className="track probability">

                <div

                  className="fill"

                  style={{
                    width:
                      `${
                        Math.min(
                          100,
                          +currentPred
                            ?.probability *
                          100 ||
                          0
                        )
                      }%`
                  }}

                />

                <i />

              </div>


              <p>

                Baseline quality{' '}

                <strong>

                  {pct(
                    currentPred
                      ?.baseline_quality
                  )}

                </strong>

              </p>


              <small>

                {currentPred
                  ?.model_version ||
                  'No prediction yet'
                }

              </small>


              <div className="warning">

                Research shadow mode only —
                not a farmer-facing production alert.

              </div>

            </div>


            {/* MODEL 3 */}

            <div className="subpanel model3">

              <div className="model2-head">

                <div>

                  <p className="muted">
                    Model 3
                  </p>

                  <h3>
                    Health anomaly monitor
                  </h3>

                </div>


                <span
                  className={
                    `health-state ${String(
                      currentM3?.status ||
                      'normal'
                    ).toLowerCase()}`
                  }
                >
                  {currentM3?.status ||
                    'NO DATA'}
                </span>

              </div>


              <div className="big-number">

                {currentM3
                  ? score(
                      currentM3
                        .priority_score,
                      1
                    )
                  : '—'
                }

                {currentM3 && (
                  <span className="score-denom">
                    {' '} / 100
                  </span>
                )}

              </div>


              <div className="track anomaly-score">

                <div
                  className="fill"
                  style={{
                    width:
                      `${
                        Math.min(
                          100,
                          +currentM3
                            ?.priority_score ||
                          0
                        )
                      }%`
                  }}
                />

              </div>


              <div className="model3-score-grid">

                <div>
                  <span>Supervised</span>
                  <strong>
                    {score(
                      currentM3
                        ?.supervised_score,
                      1
                    )}
                  </strong>
                </div>

                <div>
                  <span>Novelty</span>
                  <strong>
                    {score(
                      currentM3
                        ?.novelty_score,
                      2
                    )}
                  </strong>
                </div>

                <div>
                  <span>Baseline</span>
                  <strong>
                    {pct(
                      currentM3
                        ?.baseline_quality
                    )}
                  </strong>
                </div>

                <div>
                  <span>Persistence</span>
                  <strong>
                    {currentM3
                      ?.persistence_hours !=
                    null
                      ? `${currentM3.persistence_hours} h`
                      : '—'
                    }
                  </strong>
                </div>

              </div>


              <div className="reason-box">

                <strong>
                  {currentM3
                    ?.primary_reason ||
                    'No anomaly explanation yet'}
                </strong>

                {currentM3
                  ?.secondary_reason && (
                  <small>
                    {currentM3.secondary_reason}
                  </small>
                )}

              </div>


              <div className="threshold-note">
                <strong>Decision thresholds</strong>
                <span>
                  WATCH ≥ 97 · CHECK ≥ 99.5 with persistence
                </span>
                <span>
                  Novelty ≥ 99.8 plus deviation support and persistence
                </span>
                <small>
                  Priority score is for display; status is determined by branch-specific rules.
                </small>
              </div>


              <small>
                {currentM3
                  ?.model_version ||
                  'No Model 3 prediction yet'
                }
              </small>


              <div className="warning">
                Research observation-priority signal only — no disease diagnosis.
              </div>

            </div>

          </div>

        </section>


        {/* ====================================================
            CHARTS
        ==================================================== */}

        <section className="charts">

          {/* BEHAVIOR HISTORY */}

          <article className="panel">

            <p className="eyebrow">
              LAST 24 HOURS
            </p>

            <h3>
              Behavior history
            </h3>


            <div className="chart">

              <ResponsiveContainer
                width="100%"
                height={290}
              >

                <LineChart
                  data={history}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.12}
                  />

                  <XAxis
                    dataKey="time"
                    minTickGap={28}
                  />

                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                  />

                  <Tooltip />

                  <Legend />


                  <Line

                    dataKey="walk"

                    name="Walking"

                    stroke="#60a5fa"

                    dot={false}

                    strokeWidth={2}

                  />


                  <Line

                    dataKey="graz"

                    name="Grazing"

                    stroke="#34d399"

                    dot={false}

                    strokeWidth={2}

                  />


                  <Line

                    dataKey="rest"

                    name="Resting"

                    stroke="#c084fc"

                    dot={false}

                    strokeWidth={2}

                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </article>


          {/* MODEL 2 HISTORY */}

          <article className="panel">

            <p className="eyebrow">
              MODEL 2 HISTORY
            </p>

            <h3>
              Shadow probability
            </h3>


            <div className="chart">

              <ResponsiveContainer
                width="100%"
                height={290}
              >

                <LineChart
                  data={
                    predHistory
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.12}
                  />

                  <XAxis
                    dataKey="time"
                    minTickGap={28}
                  />

                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                  />

                  <Tooltip />

                  <Legend />


                  <Line

                    dataKey="prob"

                    name="Estrus likelihood"

                    stroke="#f59e0b"

                    dot={false}

                    strokeWidth={2.5}

                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </article>


          {/* MODEL 3 HISTORY */}

          <article className="panel model3-history">

            <p className="eyebrow">
              MODEL 3 HISTORY · LAST 48 HOURS
            </p>

            <h3>
              Health anomaly scores
            </h3>


            <div className="chart">

              <ResponsiveContainer
                width="100%"
                height={290}
              >

                <LineChart
                  data={m3History}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.12}
                  />

                  <XAxis
                    dataKey="time"
                    minTickGap={28}
                  />

                  <YAxis
                    domain={[0, 100]}
                  />

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

          </article>

        </section>


        {/* ====================================================
            HERD OVERVIEW
        ==================================================== */}

        <section className="panel">

          <div className="section-title">

            <div>

              <p className="eyebrow">
                HERD OVERVIEW
              </p>

              <h2>
                Active animals
              </h2>

            </div>


            <span className="muted">
              {active.length} active
            </span>

          </div>


          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>
                    Cow
                  </th>

                  <th>
                    Latest behavior
                  </th>

                  <th>
                    Data quality
                  </th>

                  <th>
                    Model 2
                  </th>

                  <th>
                    Model 3
                  </th>

                  <th>
                    M3 score
                  </th>

                  <th>
                    Baseline
                  </th>

                  <th>
                    Last update
                  </th>

                </tr>

              </thead>


              <tbody>

                {active.map(
                  (c) => {

                    const b =
                      latest15[
                        c.cow_id
                      ]


                    const p =
                      latestPred[
                        c.cow_id
                      ]


                    const m3 =
                      latestM3[
                        c.cow_id
                      ]


                    const dominant =
                      b
                        ? [
                            [
                              'Walking',
                              b.walking_prop
                            ],
                            [
                              'Grazing',
                              b.grazing_prop
                            ],
                            [
                              'Resting',
                              b.resting_prop
                            ],
                            [
                              'Other',
                              b.other_prop
                            ]
                          ]
                            .sort(
                              (a, z) =>
                                +z[1] -
                                +a[1]
                            )[0][0]

                        : '—'


                    return (

                      <tr

                        key={
                          c.cow_id
                        }

                        onClick={
                          () =>
                            setSelectedCow(
                              c.cow_id
                            )
                        }

                      >

                        <td>

                          <strong>
                            {c.cow_id}
                          </strong>

                          <small>

                            {c.tag_id ||
                              c.breed ||
                              ''}

                          </small>

                        </td>


                        <td>
                          {dominant}
                        </td>


                        <td>

                          {pct(
                            b?.data_quality
                          )}

                        </td>


                        <td>

                          {p
                            ? modelPct(
                                p.probability
                              )
                            : '—'
                          }

                        </td>


                        <td>

                          {m3
                            ? (
                              <span
                                className={
                                  `health-state compact ${String(
                                    m3.status ||
                                    'normal'
                                  ).toLowerCase()}`
                                }
                              >
                                {m3.status}
                              </span>
                            )
                            : '—'
                          }

                        </td>


                        <td>
                          {m3
                            ? score(
                                m3.priority_score,
                                1
                              )
                            : '—'
                          }
                        </td>


                        <td>

                          {pct(
                            m3?.baseline_quality ??
                            p?.baseline_quality
                          )}

                        </td>


                        <td>

                          {fmt(
                            m3?.inference_run_at ||
                            p?.created_at ||
                            b?.ts ||
                            p?.ts
                          )}

                        </td>

                      </tr>

                    )
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  )
}
