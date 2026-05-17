import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { listPatients, createPatient, type ListPatientsParams } from '../api/patients.ts'
import { listExams } from '../api/exams.ts'
import { Spinner } from '../components/Spinner.tsx'
import { extractErrorMessage } from '../api/client.ts'
import { statusClass } from '../utils/status.ts'
import { useToast } from '../contexts/useToast.ts'
import { validatePatientForm, hasFormErrors, maskCpf, maskPhone, maskRg, type PatientFormErrors } from '../utils/patientValidation.ts'
import type { PatientRisk, PatientGender } from '../types.ts'

const RISKS: PatientRisk[] = ['Verde', 'Amarelo', 'Vermelho']
const ITEMS_PER_PAGE = 20

export function PatientsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [risk, setRisk] = useState<PatientRisk | ''>('')
  const [page, setPage] = useState(1)

  // ── Estado aplicado — só muda ao clicar em Pesquisar ──────────────────────
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedRisk, setAppliedRisk]     = useState<PatientRisk | ''>('')

  const applyFilters = () => {
    setAppliedSearch(search.trim())
    setAppliedRisk(risk)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch(''); setRisk('')
    setAppliedSearch(''); setAppliedRisk('')
    setPage(1)
  }

  const hasActiveFilters = Boolean(appliedSearch || appliedRisk)

  // ── modal criar paciente ──
  const [showModal, setShowModal]             = useState(false)
  const [creating, setCreating]               = useState(false)
  const [createName, setCreateName]           = useState('')
  const [createBirthDate, setCreateBirthDate] = useState('')
  const [createGender, setCreateGender]       = useState<PatientGender | ''>('')
  const [createCpf, setCreateCpf]             = useState('')
  const [createRg, setCreateRg]               = useState('')
  const [createPhone, setCreatePhone]         = useState('')
  const [createRisk, setCreateRisk]           = useState<PatientRisk>('Verde')
  const [createObs, setCreateObs]             = useState('')
  const [fieldErrors, setFieldErrors]         = useState<PatientFormErrors>({ name: '', birthDate: '', cpf: '', rg: '', phone: '' })
  const [submitError, setSubmitError]         = useState('')

  const openModal = () => {
    setCreateName(''); setCreateBirthDate(''); setCreateGender('')
    setCreateCpf(''); setCreateRg(''); setCreatePhone('')
    setCreateRisk('Verde'); setCreateObs('')
    setFieldErrors({ name: '', birthDate: '', cpf: '', rg: '', phone: '' })
    setSubmitError('')
    setShowModal(true)
  }

  const submitCreate = async () => {
    const errors = validatePatientForm({
      name: createName, birthDate: createBirthDate, gender: createGender,
      cpf: createCpf, rg: createRg, phone: createPhone, observations: createObs,
    })
    setFieldErrors(errors)
    if (hasFormErrors(errors)) return

    setCreating(true); setSubmitError('')
    try {
      const novo = await createPatient({
        name: createName.trim(),
        birthDate: createBirthDate,
        gender: createGender || undefined,
        cpf: createCpf.trim() || undefined,
        rg: createRg.trim() || undefined,
        phone: createPhone.trim() || undefined,
        risk: createRisk,
        observations: createObs.trim() || undefined,
      })
      setShowModal(false)
      toast(`Paciente ${novo.name} criado com sucesso.`, 'success')
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    } catch (err) {
      setSubmitError(extractErrorMessage(err, 'Erro ao criar paciente.'))
    } finally {
      setCreating(false)
    }
  }

  const params = useMemo<ListPatientsParams>(() => ({
    search: appliedSearch || undefined,
    risk: appliedRisk || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  }), [appliedSearch, appliedRisk, page])

  const patientsQuery = useQuery({
    queryKey: ['patients', params],
    queryFn: () => listPatients(params),
    placeholderData: keepPreviousData,
  })

  // Para a contagem "X antibiogramas" por paciente, fazemos uma busca
  // simples nos exames carregados (limitada — apenas para a página atual).
  // Quando há muitos exames, o backend deveria retornar essa contagem.
  const examsQuery = useQuery({
    queryKey: ['exams', { all: true }],
    queryFn: () => listExams({ page: 1, limit: 200 }),
  })

  const patients = patientsQuery.data?.data ?? []
  const total    = patientsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const examsByPatient = useMemo(() => {
    const map: Record<string, number> = {}
    for (const ex of examsQuery.data?.data ?? []) {
      map[ex.patientId] = (map[ex.patientId] || 0) + 1
    }
    return map
  }, [examsQuery.data])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="muted">Risco assistencial</p>
          <h1>Pacientes (antibiogramas)</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={openModal}>
          + Novo paciente
        </button>
      </div>

      <div className="card filter-panel">
        <div className="filter-row">
          <span className="filter-label">Risco:</span>
          <div className="filter-status-buttons">
            <button
              type="button"
              className={`filter-status-btn${risk === '' ? ' active' : ''}`}
              onClick={() => setRisk('')}
            >
              Todos
            </button>
            {RISKS.map((r) => (
              <button
                key={r}
                type="button"
                className={`filter-status-btn${risk === r ? ' active' : ''}`}
                onClick={() => setRisk(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-search-grid">
          <div>
            <label className="filter-label" htmlFor="search-patient">Buscar:</label>
            <input
              id="search-patient"
              type="text"
              className="filter-search-input"
              placeholder="Nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
        </div>
        <div className="filter-actions">
          <span className="filter-actions__spacer" />
          {hasActiveFilters && (
            <button className="btn btn--ghost" type="button" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
          <button className="btn btn--primary" type="button" onClick={applyFilters}>
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            Pesquisar
          </button>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h3>Pacientes monitorados</h3>
          <span className="pill subtle">{total} ativos</span>
        </div>

        {patientsQuery.isLoading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <Spinner size="lg" />
          </div>
        ) : patientsQuery.isError ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p className="muted">Erro ao carregar pacientes: {extractErrorMessage(patientsQuery.error)}</p>
            <button className="btn btn--primary" onClick={() => patientsQuery.refetch()} style={{ marginTop: 'var(--space-3)' }}>
              Tentar novamente
            </button>
          </div>
        ) : patients.length === 0 ? (
          <p className="muted" style={{ padding: 'var(--space-4)' }}>
            Nenhum paciente encontrado.
          </p>
        ) : (
          <ul className="list">
            {patients.map((patient) => (
              <li key={patient.id} className="list-row list-row--stacked">
                <div className="list-row__body">
                  <Link className="list-title" to={`/app/patients/${patient.id}`}>{patient.name}</Link>
                  <p className="muted small">
                    {patient.age} anos{patient.gender ? ` • ${patient.gender}` : ''}{patient.cpf ? ` • CPF: ${patient.cpf}` : ''}
                  </p>
                  <div className="list-row__footer">
                    <span className={`pill status ${statusClass(patient.risk)}`}>{patient.risk}</span>
                    <span className="list-row__elapsed">{examsByPatient[patient.id] ?? 0} antibiogramas</span>
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

      {/* Modal — criar paciente */}
      {showModal && (
        <div className="exam-create-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="exam-create-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="create-patient-title-page">
            <div className="exam-create-modal__header">
              <h3 id="create-patient-title-page">Novo paciente</h3>
              <button type="button" className="exam-create-modal__close" onClick={() => setShowModal(false)} aria-label="Fechar">✕</button>
            </div>

            <div className="exam-create-form">
              <label className="form-label form-label--full">
                Nome completo *
                <input type="text" className={`input${fieldErrors.name ? ' input--error' : ''}`} placeholder="Ex: Pedro Lima" value={createName} onChange={e => setCreateName(e.target.value)} />
                {fieldErrors.name && <span className="form-error">{fieldErrors.name}</span>}
              </label>
              <label className="form-label">
                Data de nascimento *
                <input type="date" className={`input${fieldErrors.birthDate ? ' input--error' : ''}`} value={createBirthDate} onChange={e => setCreateBirthDate(e.target.value)} />
                {fieldErrors.birthDate && <span className="form-error">{fieldErrors.birthDate}</span>}
              </label>
              <label className="form-label">
                Sexo
                <select className="input" value={createGender} onChange={e => setCreateGender(e.target.value as PatientGender | '')}>
                  <option value="">Não informado</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>
              <label className="form-label">
                CPF
                <input type="text" className={`input${fieldErrors.cpf ? ' input--error' : ''}`} placeholder="000.000.000-00" value={createCpf} onChange={e => setCreateCpf(maskCpf(e.target.value))} />
                {fieldErrors.cpf && <span className="form-error">{fieldErrors.cpf}</span>}
              </label>
              <label className="form-label">
                RG
                <input type="text" className={`input${fieldErrors.rg ? ' input--error' : ''}`} placeholder="00.000.000-0" value={createRg} onChange={e => setCreateRg(maskRg(e.target.value))} />
                {fieldErrors.rg && <span className="form-error">{fieldErrors.rg}</span>}
              </label>
              <label className="form-label">
                Telefone
                <input type="text" className={`input${fieldErrors.phone ? ' input--error' : ''}`} placeholder="(11) 99999-0000" value={createPhone} onChange={e => setCreatePhone(maskPhone(e.target.value))} />
                {fieldErrors.phone && <span className="form-error">{fieldErrors.phone}</span>}
              </label>
              <label className="form-label">
                Risco *
                <select className="input" value={createRisk} onChange={e => setCreateRisk(e.target.value as PatientRisk)}>
                  <option value="Verde">Verde</option>
                  <option value="Amarelo">Amarelo</option>
                  <option value="Vermelho">Vermelho</option>
                </select>
              </label>
              <label className="form-label form-label--full">
                Observações clínicas
                <textarea className="input" rows={3} placeholder="Alergias, histórico relevante..." value={createObs} onChange={e => setCreateObs(e.target.value)} style={{ resize: 'vertical' }} />
              </label>
              {submitError && <p className="form-error form-label--full">{submitError}</p>}
            </div>

            <div className="exam-create-modal__footer">
              <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)} disabled={creating}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" onClick={submitCreate} disabled={creating}>
                {creating ? <Spinner /> : 'Criar paciente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
