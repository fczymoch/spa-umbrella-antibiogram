import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { listDoctors, type ListDoctorsParams } from '../api/doctors.ts'
import { listExams } from '../api/exams.ts'
import { Spinner } from '../components/Spinner.tsx'
import { extractErrorMessage } from '../api/client.ts'

const ITEMS_PER_PAGE = 20

export function DoctorsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const params = useMemo<ListDoctorsParams>(() => ({
    search: search.trim() || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  }), [search, page])

  const doctorsQuery = useQuery({
    queryKey: ['doctors', params],
    queryFn: () => listDoctors(params),
    placeholderData: keepPreviousData,
  })

  // Para a contagem de antibiogramas por médico
  const examsQuery = useQuery({
    queryKey: ['exams', { all: true }],
    queryFn: () => listExams({ page: 1, limit: 200 }),
  })

  const doctors = doctorsQuery.data?.data ?? []
  const total   = doctorsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const examsByDoctor = useMemo(() => {
    const map: Record<string, number> = {}
    for (const ex of examsQuery.data?.data ?? []) {
      map[ex.doctorId] = (map[ex.doctorId] || 0) + 1
    }
    return map
  }, [examsQuery.data])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="muted">Escala e atuação</p>
          <h1>Equipe médica</h1>
          <p className="muted small">{total} profissionais ativos</p>
        </div>
      </div>

      <div className="card filter-panel">
        <div className="filter-search-grid">
          <div>
            <label className="filter-label" htmlFor="search-doctor">Buscar:</label>
            <input
              id="search-doctor"
              type="text"
              className="filter-search-input"
              placeholder="Nome ou especialidade..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h3>Plantonistas</h3>
          <span className="pill subtle">{total} profissionais</span>
        </div>

        {doctorsQuery.isLoading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <Spinner size="lg" />
          </div>
        ) : doctorsQuery.isError ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p className="muted">Erro ao carregar médicos: {extractErrorMessage(doctorsQuery.error)}</p>
            <button className="btn btn--primary" onClick={() => doctorsQuery.refetch()} style={{ marginTop: 'var(--space-3)' }}>
              Tentar novamente
            </button>
          </div>
        ) : doctors.length === 0 ? (
          <p className="muted" style={{ padding: 'var(--space-4)' }}>
            Nenhum médico encontrado.
          </p>
        ) : (
          <ul className="list">
            {doctors.map((doctor) => (
              <li key={doctor.id} className="list-row list-row--stacked">
                <div className="list-row__body" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <div className="topbar-avatar" style={{ width: '40px', height: '40px', fontSize: 'var(--font-size-base)', flexShrink: 0 }}>
                    {doctor.name.replace('Dr. ', '').replace('Dra. ', '').charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link className="list-title" to={`/app/doctors/${doctor.id}`}>{doctor.name}</Link>
                    <p className="muted small">{doctor.specialty}</p>
                    <div className="list-row__footer">
                      <span className="pill subtle">{doctor.shift}</span>
                      <span className="list-row__elapsed">
                        {examsByDoctor[doctor.id] ?? 0} antibiograma{(examsByDoctor[doctor.id] ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Paginação de resultados">
            <button
              className="pill subtle pagination-btn"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ← Anterior
            </button>
            <span className="muted small">Página {page} de {totalPages}</span>
            <button
              className="pill subtle pagination-btn"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima →
            </button>
          </nav>
        )}
      </section>
    </div>
  )
}
