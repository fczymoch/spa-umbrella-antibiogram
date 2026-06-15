import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar } from 'react-chartjs-2'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { getExam } from '../api/exams.ts'
import { getPatient } from '../api/patients.ts'
import { antibiogramaDiscoAnaliseUrl, getAntibiogramaStatus, UNBRELLA_BASE } from '../api/unbrella.ts'
import { Spinner } from '../components/Spinner.tsx'
import { extractErrorMessage } from '../api/client.ts'
import { colorFromInterpretation, mapInterpretation, statusClass } from '../utils/status.ts'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const examQuery = useQuery({
    queryKey: ['exam', id],
    queryFn: () => getExam(id!),
    enabled: Boolean(id),
  })

  const exam = examQuery.data

  // Buscar detalhes do paciente
  const patientQuery = useQuery({
    queryKey: ['patient', exam?.patientId],
    queryFn: () => getPatient(exam!.patientId),
    enabled: Boolean(exam?.patientId),
  })

  const patient = patientQuery.data

  // Buscar status da análise na API Unbrella
  const antibiogramaStatusQuery = useQuery({
    queryKey: ['antibiograma-status', exam?.patientId],
    queryFn: () => getAntibiogramaStatus(exam!.patientId),
    enabled: Boolean(exam?.patientId),
    staleTime: 30_000,
  })

  const antibiogramaStatus = antibiogramaStatusQuery.data

  const formatDateTime = (value: string) => {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T')
    const date = new Date(normalized)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('pt-BR')
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatGender = (gender?: string) => {
    if (!gender) return 'Não informado'
    const genderMap: Record<string, string> = {
      MALE: 'Masculino',
      FEMALE: 'Feminino',
      OTHER: 'Outro'
    }
    return genderMap[gender] || gender
  }

  const formatRisk = (risk: string) => {
    const riskMap: Record<string, string> = {
      Verde: 'Baixo',
      Amarelo: 'Médio',
      Vermelho: 'Alto'
    }
    return riskMap[risk] || risk
  }

  const statusSteps = [
    { label: 'Pendente',              description: 'Antibiograma criado, aguardando início da análise' },
    { label: 'Em análise',            description: 'IA processando as fotos do exame'                  },
    { label: 'Pendente de avaliação', description: 'Análise de IA concluída, aguardando avaliação médica' },
    { label: 'Finalizado',            description: 'Médico avaliou e o laudo está disponível'          },
  ]
  const currentStatusIndex = exam ? statusSteps.findIndex((s) => s.label === exam.status) : -1

  const chartData = useMemo(() => {
    if (!exam || !exam.antibiogram?.length) return null
    return {
      labels: exam.antibiogram.map((entry) => entry.antibiotic),
      datasets: [
        {
          label: 'Índice de eficácia',
          data: exam.antibiogram.map((entry) =>
            entry.interpretation === 'S' ? 90 : entry.interpretation === 'I' ? 50 : 15,
          ),
          backgroundColor: exam.antibiogram.map((entry) =>
            colorFromInterpretation(entry.interpretation, 0.7),
          ),
        },
      ],
    }
  }, [exam])

  if (examQuery.isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (examQuery.isError || !exam) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Antibiograma não encontrado</h1>
        </div>
        <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
          {examQuery.error ? extractErrorMessage(examQuery.error) : 'Não foi possível carregar o exame.'}
        </p>
        <Link className="pill subtle" to="/app/exams">← Voltar para antibiogramas</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="pill subtle" to="/app/exams" style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>
            ← Voltar para antibiogramas
          </Link>
          <p className="muted">Antibiograma — detalhe completo</p>
          <h1>{exam.organism}</h1>
          <p className="muted">{exam.specimen} • {exam.site}</p>
        </div>
        <div className="chips">
          <span className={`pill status ${statusClass(exam.status)}`}>{exam.status}</span>
          <span className="pill subtle">Origem: {exam.source}</span>
        </div>
      </div>

      {/* Pipeline de status */}
      <section className="card">
        <div className="card-header">
          <h3>Pipeline de status</h3>
          <span className="pill subtle">Acompanhamento</span>
        </div>
        <div className="pipeline-steps">
          {statusSteps.map((step, index) => {
            const isActive = index <= currentStatusIndex
            const isCurrent = index === currentStatusIndex
            return (
              <div
                key={step.label}
                className={`pipeline-step${!isActive ? ' inactive' : ''}`}
              >
                <div className={`pipeline-thumb${isCurrent ? ' current' : ''}`}>
                  {isActive ? (() => {
                    // Step "Em análise" → usa painel 4-quadros do disco 1 da API Unbrella
                    const imgSrc = step.label === 'Em análise'
                      ? antibiogramaDiscoAnaliseUrl(exam.patientId, 1)
                      : (exam.previewUrl || `${UNBRELLA_BASE}/paciente/${encodeURIComponent(exam.patientId)}/disco/1/imagem`)
                    return (
                      <img
                        src={imgSrc}
                        alt={step.label}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setLightboxImage(imgSrc)}
                      />
                    )
                  })() : (
                    <span className="muted small">Aguardando</span>
                  )}
                </div>
                <span className={`pill ${isCurrent ? `status ${statusClass(step.label)}` : 'subtle'}`}>{step.label}</span>
                <p className="muted small" style={{ marginTop: 4, textAlign: 'center' }}>{step.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Seção de análise completa — 18 painéis de 4 quadros da API Unbrella */}
      <section className="card">
        <div className="card-header">
          <h3>Análise por disco</h3>
          {antibiogramaStatus ? (
            <span className="pill subtle">{antibiogramaStatus.total_discos} discos · {antibiogramaStatus.total_frames} frames · {antibiogramaStatus.calibracao}</span>
          ) : (
            <span className="pill subtle">18 discos</span>
          )}
        </div>
        {antibiogramaStatusQuery.isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
            <Spinner />
          </div>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-4)'
        }}>
          {(antibiogramaStatus?.discos ?? Array.from({ length: 18 }, (_, i) => ({ disco_id: i + 1, halo_largura_mm: null as number | null }))).map((disco) => {
            const analiseUrl = antibiogramaDiscoAnaliseUrl(exam.patientId, disco.disco_id)
            const halo = 'halo_largura_mm' in disco && disco.halo_largura_mm != null ? disco.halo_largura_mm as number : null
            const resistente = halo !== null && halo < 7
            return (
              <div key={disco.disco_id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <div
                  style={{ cursor: 'pointer', lineHeight: 0 }}
                  onClick={() => setLightboxImage(analiseUrl)}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <img
                    src={analiseUrl}
                    alt={`Análise Disco ${disco.disco_id}`}
                    style={{ width: '100%', display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <div style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted small"><strong>Disco {disco.disco_id}</strong></span>
                  {halo !== null && (
                    <span className={`pill status ${resistente ? 'error' : 'success'}`} style={{ fontSize: '11px' }}>
                      {halo.toFixed(2)} mm {resistente ? '⚠ Resistência' : '✓ Sensível'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Galeria de imagens - 18 discos individuais */}
      <section className="card">
        <div className="card-header">
          <h3>Galeria de discos</h3>
          <span className="pill subtle">18 discos</span>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
          gap: 'var(--space-3)' 
        }}>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((discoId) => {
            const imageUrl = `${UNBRELLA_BASE}/paciente/${encodeURIComponent(exam.patientId)}/disco/${discoId}/imagem`
            return (
              <div key={discoId} style={{ textAlign: 'center' }}>
                <div 
                  style={{ 
                    aspectRatio: '1', 
                    overflow: 'hidden', 
                    borderRadius: 'var(--radius)', 
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onClick={() => setLightboxImage(imageUrl)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <img 
                    src={imageUrl}
                    alt={`Disco ${discoId}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
                <span className="muted small" style={{ marginTop: 'var(--space-1)', display: 'block' }}>
                  Disco {discoId}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid">
        <section className="card">
          <div className="card-header">
            <h3>Dados do Paciente</h3>
            {patient && (
              <span className={`pill status ${patient.risk === 'Vermelho' ? 'error' : patient.risk === 'Amarelo' ? 'warning' : 'success'}`}>
                Risco {formatRisk(patient.risk)}
              </span>
            )}
          </div>
          {patientQuery.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
              <Spinner />
            </div>
          ) : patient ? (
            <>
              <p className="muted">
                <strong>Nome:</strong> {patient.name}
              </p>
              {patient.birthDate && (
                <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
                  <strong>Idade:</strong> {calculateAge(patient.birthDate)} anos ({formatDate(patient.birthDate)})
                </p>
              )}
              {patient.gender && (
                <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
                  <strong>Sexo:</strong> {formatGender(patient.gender)}
                </p>
              )}
              {patient.cpf && (
                <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
                  <strong>CPF:</strong> {patient.cpf}
                </p>
              )}
              {patient.phone && (
                <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
                  <strong>Telefone:</strong> {patient.phone}
                </p>
              )}
              {patient.observations && (
                <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
                  <strong>Observações:</strong> {patient.observations}
                </p>
              )}
            </>
          ) : (
            <p className="muted">Paciente: <strong>{exam.patientName ?? 'Não disponível'}</strong></p>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Dados do Exame</h3>
            <span className="pill subtle">Coletado em {formatDateTime(exam.collectedAt)}</span>
          </div>
          <p className="muted">
            <strong>Organismo:</strong> {exam.organism}
          </p>
          <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
            <strong>Amostra:</strong> {exam.specimen}
          </p>
          {exam.site && (
            <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
              <strong>Local:</strong> {exam.site}
            </p>
          )}
          <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
            <strong>Médico responsável:</strong> {exam.doctorName ?? 'Equipe'}
          </p>
          <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
            <strong>Origem:</strong> {exam.source}
          </p>
          {exam.notes && (
            <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
              <strong>Observações:</strong> {exam.notes}
            </p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h3>Interpretação</h3>
          <span className="pill subtle">MIC</span>
        </div>
        <table className="table">
            <thead>
              <tr>
                <th>Antibiótico</th>
                <th>MIC</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {(exam.antibiogram ?? []).map((entry) => (
                <tr key={entry.id ?? entry.antibiotic}>
                  <td>{entry.antibiotic}</td>
                  <td>{entry.mic}</td>
                  <td>
                    <span className={`pill status ${statusClass(mapInterpretation(entry.interpretation))}`}>
                      {mapInterpretation(entry.interpretation)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

      {chartData && (
        <section className="card">
          <div className="card-header">
            <h3>Perfil de sensibilidade</h3>
          </div>
          <Bar data={chartData} options={{ plugins: { legend: { display: false } } }} />
        </section>
      )}

      {/* Modal Lightbox para expandir imagens */}
      {lightboxImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
            padding: 'var(--space-6)'
          }}
          onClick={() => setLightboxImage(null)}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src={lightboxImage}
              alt="Imagem expandida"
              style={{ 
                width: 'auto',
                height: 'auto',
                maxWidth: '95vw', 
                maxHeight: '95vh',
                minWidth: '600px',
                minHeight: '600px',
                objectFit: 'contain',
                borderRadius: 'var(--radius)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}
            />
            <button
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                cursor: 'pointer',
                color: '#000',
                fontSize: '24px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onClick={(e) => {
                e.stopPropagation()
                setLightboxImage(null)
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
