import { useMemo } from 'react'
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
import { UNBRELLA_BASE } from '../api/unbrella.ts'
import { Spinner } from '../components/Spinner.tsx'
import { extractErrorMessage } from '../api/client.ts'
import { colorFromInterpretation, mapInterpretation, statusClass } from '../utils/status.ts'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()

  const examQuery = useQuery({
    queryKey: ['exam', id],
    queryFn: () => getExam(id!),
    enabled: Boolean(id),
  })

  const exam = examQuery.data

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
                  {isActive && exam.previewUrl ? (
                    // previewUrl vem do backend 8080; se não existir usamos a API Unbrella (5055) para imagens mockadas
                    <img src={exam.previewUrl || `${UNBRELLA_BASE}/paciente/${encodeURIComponent(exam.patientId)}/imagem/geral`} alt={step.label} />
                  ) : (
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

      {/* Galeria de imagens */}
      <section className="card">
        <div className="card-header">
          <h3>Galeria de imagens</h3>
          <span className="pill subtle">3 slots</span>
        </div>
        <div className="gallery-grid">
          {[0, 1, 2].map((index) => (
            <div key={index} className="gallery-slot">
              {exam.previewUrl && index === 0 ? (
                <img src={exam.previewUrl} alt={`Foto ${index + 1}`} />
              ) : (
                <div className="gallery-slot-empty">
                  {/* tenta buscar imagem mockada no serviço Unbrella para este paciente */}
                  <img src={`${UNBRELLA_BASE}/paciente/${encodeURIComponent(exam.patientId)}/imagem/grid`} alt={`Grid ${index + 1}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid">
        <section className="card">
          <div className="card-header">
            <h3>Dados clínicos</h3>
            <span className="pill subtle">Coletado em {formatDateTime(exam.collectedAt)}</span>
          </div>
          <p className="muted">Paciente: <strong>{exam.patientName ?? 'Paciente'}</strong></p>
          <p className="muted" style={{ marginTop: 'var(--space-2)' }}>Médico: <strong>{exam.doctorName ?? 'Equipe'}</strong></p>
          {exam.notes && (
            <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
              Observações: {exam.notes}
            </p>
          )}
        </section>

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
      </div>

      {chartData && (
        <section className="card">
          <div className="card-header">
            <h3>Perfil de sensibilidade</h3>
          </div>
          <Bar data={chartData} options={{ plugins: { legend: { display: false } } }} />
        </section>
      )}
    </div>
  )
}
