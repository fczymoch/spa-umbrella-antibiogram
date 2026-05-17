import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Legend, Tooltip } from 'chart.js'
import { getDashboardStats, getDashboardRecent } from '../api/dashboard.ts'
import { listExams } from '../api/exams.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { Spinner } from '../components/Spinner.tsx'
import { extractErrorMessage } from '../api/client.ts'
import { statusClass } from '../utils/status.ts'

ChartJS.register(ArcElement, Tooltip, Legend)

// ── Inline SVG icons ─────────────────────────────────────────
function IconFlask() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M9 3v7l-4.5 8A2 2 0 0 0 6.31 21h11.38a2 2 0 0 0 1.81-3L15 10V3M9 3H6M15 3h3" />
    </svg>
  )
}
function IconPaperclip() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
function IconBug() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V9z" />
      <path d="M5 8h2M17 8h2M5 16h2M17 16h2M9 3c0 0 1-1 3-1s3 1 3 1M9 21c0 0 1 1 3 1s3-1 3-1" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  )
}
function IconUpload() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
function IconFile() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
function IconClock() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
// ─────────────────────────────────────────────────────────────

/** Retorna string legível de tempo decorrido desde uma data 'YYYY-MM-DD HH:mm' ou ISO. */
function elapsedLabel(dateStr: string): string {
  if (!dateStr) return ''
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T')
  const then = new Date(normalized)
  if (Number.isNaN(then.getTime())) return dateStr
  const diffMs = Date.now() - then.getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  if (diffH < 1) return 'há menos de 1h'
  if (diffH < 24) return `há ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'há 1 dia'
  return `há ${diffD} dias`
}

const STATUS_LEGEND = [
  { key: 'Finalizado',             color: '#22c55e', label: 'Finalizado'             },
  { key: 'Pendente de avaliação',  color: '#3b82f6', label: 'Pend. de avaliação'     },
  { key: 'Em análise',             color: '#fbbf24', label: 'Em análise'             },
  { key: 'Pendente',               color: '#6366f1', label: 'Pendente'               },
] as const

export function HomePage() {
  const { user } = useAuth()

  // GET /v1/dashboard/stats — totais e contagem por status (gráfico)
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
  })

  // GET /v1/dashboard/recent — últimos exames finalizados (tabela)
  const recentQuery = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: getDashboardRecent,
  })

  // GET /v1/exams — últimos exames de todos os status para o card "Antibiogramas recentes"
  const recentExamsQuery = useQuery({
    queryKey: ['exams', 'home-recent'],
    queryFn: () => listExams({ page: 1, limit: 4 }),
  })

  // GET /v1/exams — apenas "Em análise" para o card dedicado
  const inAnalysisQuery = useQuery({
    queryKey: ['exams', 'home-in-analysis'],
    queryFn: () => listExams({ page: 1, limit: 8, status: ['Em análise'] }),
  })

  const stats         = statsQuery.data
  const recentExams   = recentExamsQuery.data?.data ?? []
  const inAnalysis    = inAnalysisQuery.data?.data ?? []
  const recentDone    = recentQuery.data ?? []
  const totalAttach   = 0      // attachments não fazem parte do split — virá na Fase 5
  const recentAttach: Array<{ id: string; fileName: string; uploadedAt: string }> = []

  const statusSummary = useMemo(() => stats?.byStatus ?? {}, [stats])
  const totalExams    = stats?.total ?? 0

  const chartData = useMemo(() => {
    const labels = STATUS_LEGEND.map((s) => s.key)
    const values = labels.map((label) => statusSummary[label] || 0)
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: STATUS_LEGEND.map((s) => s.color),
          borderWidth: 0,
        },
      ],
    }
  }, [statusSummary])

  const chartOptions = useMemo(() => ({
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    cutout: '68%',
  }), [])

  if (statsQuery.isLoading || recentQuery.isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (statsQuery.isError) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Painel de Antibiogramas</h1>
          </div>
        </div>
        <section className="card">
          <p className="muted">
            Não foi possível carregar o dashboard. {extractErrorMessage(statsQuery.error)}
          </p>
          <button className="btn btn--primary" onClick={() => { void statsQuery.refetch(); void recentQuery.refetch() }} style={{ marginTop: 'var(--space-3)' }}>
            Tentar novamente
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Painel de Antibiogramas</h1>
          {user && (
            <p className="muted">
              Bem-vindo(a), <strong>{user.name}</strong> · Turno: {user.shift}
            </p>
          )}
        </div>
        <div className="badge soft">Resistência bacteriana</div>
      </div>

      {/* ── Stat cards ─────────────────────────────────── */}
      <div className="stats-grid home-stats">
        <div className="stat stat--primary">
          <div className="stat__icon stat__icon--primary"><IconFlask /></div>
          <div className="stat__body">
            <p className="muted">Antibiogramas</p>
            <p className="stat-value">{totalExams}</p>
            <p className="muted small">Coletas monitoradas</p>
          </div>
        </div>
        <div className="stat stat--info">
          <div className="stat__icon stat__icon--info"><IconPaperclip /></div>
          <div className="stat__body">
            <p className="muted">Anexos</p>
            <p className="stat-value">{totalAttach}</p>
            <p className="muted small">Laudos e imagens</p>
          </div>
        </div>
        <div className="stat stat--accent">
          <div className="stat__icon stat__icon--accent"><IconCalendar /></div>
          <div className="stat__body">
            <p className="muted">Finalizados</p>
            <p className="stat-value">{statusSummary['Finalizado'] || 0}</p>
            <p className="muted small">Resultados disponíveis</p>
          </div>
        </div>
        <div className="stat stat--warn">
          <div className="stat__icon stat__icon--warn"><IconBug /></div>
          <div className="stat__body">
            <p className="muted">Pendentes</p>
            <p className="stat-value">{statusSummary['Pendente'] || 0}</p>
            <p className="muted small">Aguardando resultado</p>
          </div>
        </div>
      </div>

      {/* ── Dashboard — gráfico ────────────────────────── */}
      <section className="card">
        <div className="card-header">
          <h3>Dashboard</h3>
          <span className="pill subtle">Distribuição de status</span>
        </div>
        <div className="home-chart-wrap">
          <div className="home-chart-donut">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
          <ul className="home-chart-legend">
            {STATUS_LEGEND.map((s) => {
              const count = statusSummary[s.key] || 0
              const pct = totalExams > 0 ? Math.round((count / totalExams) * 100) : 0
              return (
                <li key={s.key} className="home-chart-legend__item">
                  <div className="home-chart-legend__row">
                    <span className="home-chart-legend__dot" style={{ background: s.color }} />
                    <span className="home-chart-legend__label">{s.label}</span>
                    <span className="home-chart-legend__count">{count}</span>
                  </div>
                  <div className="home-chart-legend__bar-track">
                    <div
                      className="home-chart-legend__bar-fill"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </div>
                </li>
              )
            })}
            <li style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
              <p className="muted small">Total de exames monitorados</p>
              <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', margin: '2px 0 0', color: 'var(--color-text)' }}>
                {totalExams}
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Sobre a aplicação ──────────────────────────── */}
      <div className="home-main-grid">
        {/* Guia de uso */}
        <section className="card">
          <div className="card-header">
            <h3>Sobre a aplicação</h3>
            <span className="pill subtle">Como usar</span>
          </div>
          <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
            Plataforma clínica para acompanhamento de <strong>antibiogramas</strong> em UTI e contextos de alta complexidade.
            Monitore resistência bacteriana, tempo de processamento e laudos em tempo real.
          </p>
          <div className="home-quick-actions">
            <div className="home-quick-action">
              <span className="home-quick-action__icon"><IconBarChart /></span>
              <div>
                <p className="list-title">Visão geral de status</p>
                <p className="muted small">Acompanhe o fluxo completo: <em>Pendente</em> → <em>Em análise</em> → <em>Pendente de avaliação</em> → <em>Finalizado</em>. Exames em análise por mais de 48h são sinalizados automaticamente.</p>
              </div>
            </div>
            <div className="home-quick-action">
              <span className="home-quick-action__icon home-quick-action__icon--warn"><IconClock /></span>
              <div>
                <p className="list-title">Tempo em andamento</p>
                <p className="muted small">Cada exame exibe quanto tempo decorreu desde a coleta. Exames <em>Pendentes</em> acima de 24h e <em>Pendentes de avaliação</em> acima de 12h indicam necessidade de atenção clínica.</p>
              </div>
            </div>
            <div className="home-quick-action">
              <span className="home-quick-action__icon"><IconSearch /></span>
              <div>
                <p className="list-title">Busca por paciente ou médico</p>
                <p className="muted small">Filtro avançado no submenu Antibiogramas — localise rapidamente um laudo por nome, leito ou especialidade.</p>
              </div>
            </div>
            <div className="home-quick-action">
              <span className="home-quick-action__icon"><IconFlask /></span>
              <div>
                <p className="list-title">Detalhe do laudo</p>
                <p className="muted small">Visualize MIC, interpretação (S/I/R) e perfil completo de sensibilidade com gráfico de concentração inibitória.</p>
              </div>
            </div>
            <div className="home-quick-action">
              <span className="home-quick-action__icon"><IconUpload /></span>
              <div>
                <p className="list-title">Anexos clínicos</p>
                <p className="muted small">Suba PDFs e imagens diretamente ao prontuário do paciente com notas de contexto clínico.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Últimos exames realizados */}
        <section className="card">
          <div className="card-header">
            <h3>Últimos exames finalizados</h3>
            <span className="pill subtle">{recentDone.length} finalizados</span>
          </div>
          <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
            Antibiogramas com laudo finalizado mais recentemente.
          </p>
          {recentDone.length === 0 ? (
            <p className="muted small">Nenhum exame finalizado ainda.</p>
          ) : (
            <ul className="list">
              {recentDone.map((exam) => (
                <li key={exam.id} className="list-row">
                  <div className="list-row__icon"><IconFlask /></div>
                  <div style={{ flex: 1 }}>
                    <Link className="list-title" to={`/app/exams/${exam.id}`}>{exam.patientName}</Link>
                    <p className="muted small">{exam.organism}</p>
                  </div>
                  <div className="list-meta">
                    <span className="pill status ok">Finalizado</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Second grid ────────────────────────────────── */}
      <div className="grid">
        {/* Antibiogramas recentes */}
        <section className="card">
          <div className="card-header">
            <h3>Antibiogramas recentes</h3>
            <span className="pill subtle">Monitoramento</span>
          </div>
          {recentExams.length === 0 ? (
            <p className="muted small">Nenhum antibiograma cadastrado.</p>
          ) : (
            <ul className="list">
              {recentExams.slice(0, 4).map((exam) => (
                <li key={exam.id} className="list-row list-row--stacked">
                  <div className="list-row__icon"><IconFlask /></div>
                  <div className="list-row__body">
                    <Link className="list-title" to={`/app/exams/${exam.id}`}>{exam.patientName ?? '—'}</Link>
                    <p className="muted small">{exam.organism} · {exam.specimen}</p>
                    <div className="list-row__footer">
                      <span className={`pill status ${statusClass(exam.status)}`}>{exam.status}</span>
                      {(exam.status === 'Em análise' || exam.status === 'Pendente') && (
                        <span className="muted small list-row__elapsed">
                          <IconClock /> {elapsedLabel(exam.collectedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Em análise */}
        <section className="card">
          <div className="card-header">
            <h3>Em análise</h3>
            <span className="pill subtle">Em processamento</span>
          </div>
          <ul className="list">
            {inAnalysis.length === 0 ? (
              <li className="list-row"><p className="muted small">Nenhum exame em análise no momento.</p></li>
            ) : inAnalysis.map((exam) => (
              <li key={exam.id} className="list-row list-row--stacked">
                <div className="list-row__icon"><IconFlask /></div>
                <div className="list-row__body">
                  <Link className="list-title" to={`/app/exams/${exam.id}`}>{exam.patientName ?? '—'}</Link>
                  <p className="muted small">{exam.organism} · {exam.specimen}</p>
                  <div className="list-row__footer">
                    <span className="pill status warn">Em análise</span>
                    <span className="muted small list-row__elapsed">
                      <IconClock /> {elapsedLabel(exam.collectedAt)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Anexos */}
        <section className="card">
          <div className="card-header">
            <h3>Últimos anexos</h3>
            <span className="pill subtle">Uploads</span>
          </div>
          {recentAttach.length === 0 ? (
            <p className="muted small">Nenhum anexo enviado ainda.</p>
          ) : (
            <ul className="list">
              {recentAttach.slice(0, 5).map((item) => (
                <li key={item.id} className="list-row">
                  <div className="list-row__icon list-row__icon--file"><IconFile /></div>
                  <div style={{ flex: 1 }}>
                    <p className="list-title">{item.fileName}</p>
                  </div>
                  <div className="list-meta">
                    <span className="muted list-meta__source">
                      <IconClock /> {item.uploadedAt}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
