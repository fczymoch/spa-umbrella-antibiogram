import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listPatients, createPatient } from '../api/patients.ts'
import { Spinner } from '../components/Spinner.tsx'
import { extractErrorMessage } from '../api/client.ts'
import { useToast } from '../contexts/useToast.ts'
import { validatePatientForm, hasFormErrors, maskCpf, maskPhone, maskRg, type PatientFormErrors } from '../utils/patientValidation.ts'
import { createExam } from '../api/exams.ts'
import { useQueryClient } from '@tanstack/react-query'
import type { Patient, PatientRisk, PatientGender } from '../types.ts'

type Step = 'select' | 'confirm' | 'running' | 'done'
interface TerminalLine { text: string; type: string }
interface ImageItem    { label: string; url: string }
interface ImageGroup   { name: string; images: ImageItem[] }
interface ImagesResult { groups: ImageGroup[]; flat: ImageItem[] }

// Servidor Express local que executa o script Python via SSE.
// Mantido separado do backend Spring porque o script vive no host onde o
// usuário roda o front (e o backend pode estar em outra máquina).
const SCRIPT_SERVER_URL = (import.meta.env.VITE_SCRIPT_SERVER_URL as string | undefined) ?? 'http://localhost:3333'

const is75px = (img: ImageItem) => img.label.includes('75px') || img.url.includes('75px')
const riskClass = (risk: string) =>
  risk === 'Vermelho' ? 'alert' : risk === 'Amarelo' ? 'warn' : 'ok'

export function NewExamPage() {
  const navigate = useNavigate()
  const toast = useToast()

  // Carrega pacientes do backend para o seletor inicial
  const patientsQuery = useQuery({
    queryKey: ['patients', { limit: 200, page: 1 }],
    queryFn: () => listPatients({ page: 1, limit: 200 }),
  })
  const patients: Patient[] = patientsQuery.data?.data ?? []

  const [step, setStep]         = useState<Step>('select')
  const [query, setQuery]       = useState('')
  const [patient, setPatient]   = useState<Patient | null>(null)
  const [lines, setLines]       = useState<TerminalLine[]>([])
  const [images, setImages]     = useState<ImagesResult | null>(null)
  const [logOpen, setLogOpen]   = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const terminalRef             = useRef<HTMLDivElement>(null)

  // Modal de criação de paciente
  const [showCreateModal, setShowCreateModal] = useState(false)
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

  const openCreateModal = () => {
    setCreateName(''); setCreateBirthDate(''); setCreateGender('')
    setCreateCpf(''); setCreateRg(''); setCreatePhone('')
    setCreateRisk('Verde'); setCreateObs('')
    setFieldErrors({ name: '', birthDate: '', cpf: '', rg: '', phone: '' })
    setSubmitError('')
    setShowCreateModal(true)
  }

  const submitCreatePatient = async () => {
    const errors = validatePatientForm({
      name: createName, birthDate: createBirthDate, gender: createGender,
      cpf: createCpf, rg: createRg, phone: createPhone, observations: createObs,
    })
    setFieldErrors(errors)
    if (hasFormErrors(errors)) return

    setCreating(true)
    setSubmitError('')
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
      setShowCreateModal(false)
      setPatient(novo)
      setStep('confirm')
      toast(`Paciente ${novo.name} criado com sucesso.`, 'success')
    } catch (err) {
      setSubmitError(extractErrorMessage(err, 'Erro ao criar paciente.'))
    } finally {
      setCreating(false)
    }
  }

  // no-op cleanup (SSE removed from flow)
  useEffect(() => () => {}, [])

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.cpf ?? '').toLowerCase().includes(query.toLowerCase())
  )

  // pushLine/terminal removed from main flow but kept for potential logs

  const reset = () => {
    setStep('select'); setPatient(null); setQuery('')
    setLines([]); setImages(null); setLogOpen(false)
  }

  // Note: SSE/local execution removed from the creation flow. Exams are created
  // on the main backend (POST /v1/exams). The external Unbrella service (5055)
  // is used only for serving images; we don't call it to create exams.

  const queryClient = useQueryClient()

  // Modal / state para criar o exame no backend
  const [showExamCreateModal, setShowExamCreateModal] = useState(false)
  const [examOrganism, setExamOrganism] = useState('')
  const [examSpecimen, setExamSpecimen] = useState('Swab')
  const [examCollectedAt, setExamCollectedAt] = useState(() => {
    // default to today YYYY-MM-DD HH:mm
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [creatingExam, setCreatingExam] = useState(false)
  const [createExamError, setCreateExamError] = useState('')
  const [showCreationOverlay, setShowCreationOverlay] = useState(false)


  const createViaBackend = async () => {
    if (!patient) return
    setCreateExamError('')
    // open modal to collect missing fields
    setShowExamCreateModal(true)
  }

  // Helper: tenta extrair response.data de um erro axios-like de forma segura
  function extractResponseData(err: unknown): { code?: string; error?: string } | undefined {
    if (typeof err !== 'object' || err === null) return undefined
    const maybe = err as { response?: { data?: unknown } }
    const data = maybe.response?.data
    if (!data || typeof data !== 'object') return undefined
    const d = data as Record<string, unknown>
    return { code: typeof d.code === 'string' ? d.code : undefined, error: typeof d.error === 'string' ? d.error : undefined }
  }

  const submitCreateExam = async () => {
    if (!patient) return
    if (!examOrganism.trim() || !examSpecimen.trim()) {
      setCreateExamError('Organismo e espécime são obrigatórios.')
      return
    }
    setCreatingExam(true)
    setCreateExamError('')
    try {
  // Use the DB doctor id provided (always)
  const doctorId = 'caafb56a-48e4-4f0d-b10b-cc58ac374658'
      if (!doctorId) {
        setCreateExamError('Usuário logado não tem doctorId associado. Entre como médico para criar o exame.')
        setCreatingExam(false)
        return
      }

      const payload = {
        patientId: patient.id,
        doctorId,
        organism: examOrganism.trim(),
        specimen: examSpecimen.trim(),
        collectedAt: examCollectedAt,
      }
      const created = await createExam(payload)
      toast(`Exame criado: ${created.id}`, 'success')
      // invalida lista de exames para puxar o novo
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      setShowExamCreateModal(false)
  // Após criar no backend, mostramos um overlay não bloqueante indicando
  // que a criação/processing está em andamento. O usuário pode continuar
  // navegando enquanto o processamento assíncrono ocorre no backend.
  setShowCreationOverlay(true)
    } catch (err) {
      // Try to parse backend validation / not found errors
      const parsed = extractResponseData(err)
      if (parsed) {
        const code = parsed.code
        const serverError = parsed.error
        if (code === 'NOT_FOUND' && serverError && serverError.includes('Doctor not found')) {
          setCreateExamError(`Médico não encontrado (id informado). Mensagem do servidor: ${serverError}`)
          setCreatingExam(false)
          return
        }
        if (code === 'VALIDATION_ERROR') {
          setCreateExamError(serverError || 'Dados inválidos')
          setCreatingExam(false)
          return
        }
      }
      setCreateExamError((err as Error).message || 'Erro ao criar exame')
    } finally {
      setCreatingExam(false)
    }
  }

  const lineClass = (type: string) => {
    if (type === 'cmd' || type === 'info')    return 'terminal-line terminal-line--cmd'
    if (type === 'error' || type === 'err')   return 'terminal-line terminal-line--err'
    if (type === 'stderr' || type === 'warn') return 'terminal-line terminal-line--warn'
    if (type === 'ok')                        return 'terminal-line terminal-line--ok'
    return 'terminal-line'
  }

  const galleryGroups = images
    ? images.groups
        .map(g => ({ ...g, images: g.images.filter(is75px) }))
        .filter(g => g.images.length > 0)
    : []

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <Link className="pill subtle" to="/app/exams"
            style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>
            ← Voltar
          </Link>
          <p className="eyebrow">Novo antibiograma</p>
          <h1>Criar análise</h1>
        </div>
      </div>

      <div className="new-exam-steps">
        <div className={`new-exam-step ${step === 'select' ? 'active' : 'done'}`}>
          <span className="new-exam-step__num">1</span>
          <span className="new-exam-step__label">Paciente</span>
        </div>
        <div className="new-exam-step__connector" />
        <div className={`new-exam-step ${step === 'confirm' ? 'active' : ['running','done'].includes(step) ? 'done' : ''}`}>
          <span className="new-exam-step__num">2</span>
          <span className="new-exam-step__label">Confirmar</span>
        </div>
        <div className="new-exam-step__connector" />
        <div className={`new-exam-step ${step === 'running' ? 'active' : step === 'done' ? 'done' : ''}`}>
          <span className="new-exam-step__num">3</span>
          <span className="new-exam-step__label">Executando</span>
        </div>
        <div className="new-exam-step__connector" />
        <div className={`new-exam-step ${step === 'done' ? 'done active' : ''}`}>
          <span className="new-exam-step__num">4</span>
          <span className="new-exam-step__label">Resultados</span>
        </div>
      </div>

      {/* Step 1 */}
      {step === 'select' && (
        <section className="card">
          <div className="card-header">
            <h3>Buscar paciente</h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span className="pill subtle">{patients.length} pacientes</span>
              <button type="button" className="btn btn--primary btn--sm" onClick={openCreateModal}>
                + Criar novo paciente
              </button>
            </div>
          </div>

          <div className="new-exam-search-wrap">
            <span className="new-exam-search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input autoFocus type="text" className="new-exam-search-input"
              placeholder="Nome ou leito..." value={query}
              onChange={e => setQuery(e.target.value)} />
          </div>

          {patientsQuery.isLoading ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <Spinner />
            </div>
          ) : patientsQuery.isError ? (
            <div style={{ padding: 'var(--space-4)' }}>
              <p className="muted">Erro ao carregar pacientes: {extractErrorMessage(patientsQuery.error)}</p>
              <button className="btn btn--primary" onClick={() => patientsQuery.refetch()} style={{ marginTop: 'var(--space-3)' }}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {query.trim() && filtered.length === 0 && (
                <p className="muted small" style={{ marginTop: 'var(--space-3)' }}>
                  Nenhum resultado para "{query}".
                </p>
              )}

              <ul className="new-exam-patient-list">
                {(query.trim() ? filtered : patients).map(p => (
                  <li key={p.id}>
                    <button type="button" className="new-exam-patient-btn" onClick={() => {
                      setPatient(p)
                      setStep('confirm')
                    }}>
                      <span className="new-exam-patient-avatar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                      </span>
                      <span className="new-exam-patient-info">
                        <span className="new-exam-patient-name">{p.name}</span>
                        <span className="new-exam-patient-meta">{p.age} anos{p.gender ? ` • ${p.gender}` : ''}{p.cpf ? ` • CPF: ${p.cpf}` : ''}</span>
                      </span>
                      <span className={`pill status ${riskClass(p.risk)}`}>{p.risk}</span>
                      <span className="new-exam-patient-arrow">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Step 2 — Confirmar paciente */}
      {step === 'confirm' && patient && (
        <section className="card new-exam-confirm-card">
          <div className="card-header">
            <h3>Confirmar paciente</h3>
          </div>
          <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
            Verifique os dados do paciente antes de iniciar a análise.
          </p>

          <div className="new-exam-confirm-info">
            <div className="new-exam-confirm-row">
              <span className="new-exam-confirm-label">Nome</span>
              <span className="new-exam-confirm-value">{patient.name}</span>
            </div>
            <div className="new-exam-confirm-row">
              <span className="new-exam-confirm-label">Idade</span>
              <span className="new-exam-confirm-value">{patient.age} anos</span>
            </div>
            {patient.birthDate && (
              <div className="new-exam-confirm-row">
                <span className="new-exam-confirm-label">Nascimento</span>
                <span className="new-exam-confirm-value">
                  {new Date(patient.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            {patient.gender && (
              <div className="new-exam-confirm-row">
                <span className="new-exam-confirm-label">Sexo</span>
                <span className="new-exam-confirm-value">{patient.gender}</span>
              </div>
            )}
            {patient.cpf && (
              <div className="new-exam-confirm-row">
                <span className="new-exam-confirm-label">CPF</span>
                <span className="new-exam-confirm-value">{patient.cpf}</span>
              </div>
            )}
            {patient.phone && (
              <div className="new-exam-confirm-row">
                <span className="new-exam-confirm-label">Telefone</span>
                <span className="new-exam-confirm-value">{patient.phone}</span>
              </div>
            )}
            <div className="new-exam-confirm-row">
              <span className="new-exam-confirm-label">Risco</span>
              <span className={`pill status ${riskClass(patient.risk)}`}>{patient.risk}</span>
            </div>
            {patient.observations && (
              <div className="new-exam-confirm-row">
                <span className="new-exam-confirm-label">Observações</span>
                <span className="new-exam-confirm-value">{patient.observations}</span>
              </div>
            )}
          </div>

          <div className="new-exam-confirm-actions">
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('select')}>
                ← Alterar paciente
              </button>
              <button type="button" className="btn btn--primary" onClick={createViaBackend}>
                Confirmar e criar exame →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Modal para criar exame no backend (coleta fields mínimos) */}
      {showExamCreateModal && (
        <div className="exam-create-modal-overlay" onClick={() => setShowExamCreateModal(false)}>
          <div className="exam-create-modal" onClick={e => e.stopPropagation()} role="dialog">
            <div className="exam-create-modal__header">
              <h3>Criar exame para {patient?.name}</h3>
              <button type="button" className="exam-create-modal__close" onClick={() => setShowExamCreateModal(false)}>✕</button>
            </div>
            <div className="exam-create-form">
              <label className="form-label">
                Organismo *
                <input className="input" value={examOrganism} onChange={e => setExamOrganism(e.target.value)} />
              </label>
              <label className="form-label">
                Espécime *
                <input className="input" value={examSpecimen} onChange={e => setExamSpecimen(e.target.value)} />
              </label>
              <label className="form-label">
                Coletado em
                <input className="input" value={examCollectedAt} onChange={e => setExamCollectedAt(e.target.value)} />
              </label>
              {createExamError && <p className="form-error">{createExamError}</p>}
            </div>
            <div className="exam-create-modal__footer">
              <button type="button" className="btn btn--ghost" onClick={() => setShowExamCreateModal(false)} disabled={creatingExam}>Cancelar</button>
              <button type="button" className="btn btn--primary" onClick={submitCreateExam} disabled={creatingExam}>{creatingExam ? 'Criando…' : 'Criar exame'}</button>
            </div>
          </div>
        </div>
      )}

      

      {/* Overlay não bloqueante exibido após criação do exame */}
      {showCreationOverlay && (
        <div className="exam-create-modal-overlay" onClick={() => setShowCreationOverlay(false)}>
          <div className="exam-create-modal" onClick={e => e.stopPropagation()} role="dialog">
            <div className="exam-create-modal__header">
              <h3>Criação do exame em andamento</h3>
            </div>
            <div style={{ padding: 'var(--space-4)' }}>
              <p>O exame foi criado no servidor e está sendo processado. Você pode continuar navegando — o processamento continuará em segundo plano.</p>
              <p style={{ marginTop: 'var(--space-2)' }}><strong>Clique para continuar navegando</strong></p>
            </div>
            <div className="exam-create-modal__footer">
              <button type="button" className="btn btn--ghost" onClick={() => setShowCreationOverlay(false)}>Fechar</button>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/app/exams')}>Continuar para antibiogramas</button>
            </div>
          </div>
        </div>
      )}

      {/* Steps 3 e 4 */}
      {(step === 'running' || step === 'done') && patient && (
        <>
          <div className="new-exam-selected-patient">
            <span className="new-exam-selected-patient__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3h6M9 3v7l-4.5 8A2 2 0 0 0 6.31 21h11.38a2 2 0 0 0 1.81-3L15 10V3M9 3H6M15 3h3" />
              </svg>
            </span>
            <div>
              <p className="list-title">{patient.name}</p>
              <p className="muted small">{patient.age} anos{patient.gender ? ` • ${patient.gender}` : ''}{patient.cpf ? ` • CPF: ${patient.cpf}` : ''}</p>
            </div>
            <span className={`pill status ${riskClass(patient.risk)}`}>{patient.risk}</span>
          </div>

          {/* Terminal */}
          <section className="card">
            <div className="card-header">
              <h3>Log de execução</h3>
              <div className="chips">
                <span className="terminal-dot terminal-dot--red" />
                <span className="terminal-dot terminal-dot--yellow" />
                <span className="terminal-dot terminal-dot--green" />
                {step === 'running'
                  ? <span className="pill status warn" style={{ marginLeft: 'var(--space-2)' }}>Em execução…</span>
                  : <span className="pill status ok"   style={{ marginLeft: 'var(--space-2)' }}>Concluído</span>
                }
                {step === 'done' && (
                  <button type="button" className="ghost small"
                    style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}
                    onClick={() => setLogOpen(v => !v)}>
                    {logOpen ? '▲ Recolher' : '▼ Ver log'}
                  </button>
                )}
              </div>
            </div>
            <div className="terminal-window" ref={terminalRef}
              style={step === 'done' && !logOpen ? { maxHeight: '120px', overflow: 'hidden' } : undefined}>
              {lines.length === 0 && step === 'running' && (
                <div className="terminal-line terminal-line--cmd">Aguardando saída…</div>
              )}
              {lines.map((l, i) => (
                <div key={i} className={lineClass(l.type)}>{l.text}</div>
              ))}
              {step === 'running' && (
                <div className="terminal-line"><span className="terminal-cursor__blink">█</span></div>
              )}
            </div>
          </section>

          {/* Galeria 75px */}
          {step === 'done' && galleryGroups.length > 0 && (
            <section className="card">
              <div className="card-header">
                <h3>Resultados</h3>
                <span className="pill subtle">{galleryGroups.length} discos</span>
              </div>
              {galleryGroups.map(group => (
                <div key={group.name} className="results-section">
                  <p className="results-section__title">{group.name}</p>
                  <div className="results-gallery">
                    {group.images.map(img => (
                      <button key={img.url} type="button" className="results-gallery__item"
                        onClick={() => setLightbox(`${SCRIPT_SERVER_URL}${img.url}`)} title={img.label}>
                        <img src={`${SCRIPT_SERVER_URL}${img.url}`} alt={img.label} className="results-gallery__img" />
                        <span className="results-gallery__label">{img.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {step === 'done' && (
            <div className="new-exam-done__actions" style={{ paddingBottom: 'var(--space-8)' }}>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/app/exams')}>
                Ver antibiogramas
              </button>
              <button type="button" className="ghost" onClick={reset}>
                Nova análise
              </button>
            </div>
          )}
        </>
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}
          role="dialog" aria-modal="true" aria-label="Imagem ampliada">
          <img src={lightbox} alt="Resultado" className="lightbox-img" />
          <button type="button" className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      {/* Modal — criar paciente */}
      {showCreateModal && (
        <div className="exam-create-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="exam-create-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="create-patient-title">
            <div className="exam-create-modal__header">
              <h3 id="create-patient-title">Criar novo paciente</h3>
              <button type="button" className="exam-create-modal__close" onClick={() => setShowCreateModal(false)} aria-label="Fechar">✕</button>
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
              <button type="button" className="btn btn--ghost" onClick={() => setShowCreateModal(false)} disabled={creating}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" onClick={submitCreatePatient} disabled={creating}>
                {creating ? <Spinner /> : 'Criar paciente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
