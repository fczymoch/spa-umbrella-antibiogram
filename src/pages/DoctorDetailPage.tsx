import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDoctor } from '../api/doctors.ts'
import { listExams } from '../api/exams.ts'
import { Spinner } from '../components/Spinner.tsx'
import { extractErrorMessage } from '../api/client.ts'
import { statusClass } from '../utils/status.ts'

export function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>()

  const doctorQuery = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => getDoctor(id!),
    enabled: Boolean(id),
  })

  const examsQuery = useQuery({
    queryKey: ['exams', { doctorId: id }],
    queryFn: () => listExams({ doctorId: id, limit: 100 }),
    enabled: Boolean(id),
  })

  const doctor = doctorQuery.data
  const doctorExams = (examsQuery.data?.data ?? []).slice().sort(
    (a, b) =>
      new Date((b.collectedAt || '').replace(' ', 'T')).getTime() -
      new Date((a.collectedAt || '').replace(' ', 'T')).getTime(),
  )

  const formatDateTime = (value: string) => {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T')
    const date = new Date(normalized)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const statusCounts = doctorExams.reduce(
    (acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc },
    {} as Record<string, number>,
  )

  if (doctorQuery.isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (doctorQuery.isError || !doctor) {
    return (
      <div className="page">
        <div className="page-header"><h1>Médico não encontrado</h1></div>
        <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
          {doctorQuery.error ? extractErrorMessage(doctorQuery.error) : 'Não foi possível carregar os dados do médico.'}
        </p>
        <Link className="pill subtle" to="/app/doctors">← Voltar para equipe</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="pill subtle" to="/app/doctors" style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>
            ← Voltar para equipe
          </Link>
          <p className="muted">Perfil profissional</p>
          <h1>{doctor.name}</h1>
          <p className="muted small">{doctor.specialty} · {doctor.shift}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <div className="topbar-avatar" style={{ width: '56px', height: '56px', fontSize: 'var(--font-size-xl)' }}>
            {doctor.name.replace('Dr. ', '').replace('Dra. ', '').charAt(0)}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <section className="card stat">
          <p className="muted">Antibiogramas</p>
          <p className="stat-value">{doctorExams.length}</p>
          <p className="muted small">Total solicitados</p>
        </section>
        <section className="card stat">
          <p className="muted">Finalizados</p>
          <p className="stat-value">{statusCounts['Finalizado'] || 0}</p>
          <p className="muted small">Laudos prontos</p>
        </section>
        <section className="card stat">
          <p className="muted">Pendentes</p>
          <p className="stat-value">{(statusCounts['Pendente'] || 0) + (statusCounts['Em análise'] || 0) + (statusCounts['Pendente de avaliação'] || 0)}</p>
          <p className="muted small">Aguardando resultado</p>
        </section>
      </div>

      {/* Exams list */}
      <section className="card">
        <div className="card-header">
          <h3>Antibiogramas solicitados</h3>
          <span className="pill subtle">{doctorExams.length} exame{doctorExams.length !== 1 ? 's' : ''}</span>
        </div>
        {examsQuery.isLoading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <Spinner />
          </div>
        ) : doctorExams.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
              </svg>
            </span>
            <p className="empty-state-title">Nenhum antibiograma registrado</p>
            <p className="empty-state-description">Este médico ainda não possui exames associados.</p>
          </div>
        ) : (
          <ul className="list">
            {doctorExams.map((exam) => (
              <li key={exam.id} className="list-row">
                <div>
                  <Link className="list-title" to={`/app/exams/${exam.id}`}>{exam.organism}</Link>
                  <p className="muted small">
                    {exam.patientName ?? 'Paciente'} · {exam.specimen} · {exam.site}
                  </p>
                  <p className="muted small">Coletado: {formatDateTime(exam.collectedAt)}</p>
                </div>
                <div className="list-meta">
                  <span className={`pill status ${statusClass(exam.status)}`}>{exam.status}</span>
                  <span className="pill subtle">{exam.source}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
