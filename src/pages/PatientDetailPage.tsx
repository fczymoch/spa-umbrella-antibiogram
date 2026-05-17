import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPatient } from '../api/patients.ts'
import { listExams } from '../api/exams.ts'
import { Spinner } from '../components/Spinner.tsx'
import { extractErrorMessage } from '../api/client.ts'
import { statusClass } from '../utils/status.ts'

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()

  const patientQuery = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatient(id!),
    enabled: Boolean(id),
  })

  const examsQuery = useQuery({
    queryKey: ['exams', { patientId: id }],
    queryFn: () => listExams({ patientId: id, limit: 100 }),
    enabled: Boolean(id),
  })

  const patient = patientQuery.data
  const patientExams = (examsQuery.data?.data ?? []).slice().sort(
    (a, b) =>
      new Date((b.collectedAt || '').replace(' ', 'T')).getTime() -
      new Date((a.collectedAt || '').replace(' ', 'T')).getTime(),
  )

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

  if (patientQuery.isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (patientQuery.isError || !patient) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Paciente não encontrado</h1>
        </div>
        <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
          {patientQuery.error ? extractErrorMessage(patientQuery.error) : 'Não foi possível carregar os dados do paciente.'}
        </p>
        <Link className="pill subtle" to="/app/patients">
          ← Voltar para pacientes
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="pill subtle" to="/app/patients" style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>
            ← Voltar para pacientes
          </Link>
          <p className="muted">Detalhes do paciente</p>
          <h1>{patient.name}</h1>
          <p className="muted small">
            {patient.age} anos{patient.gender ? ` • ${patient.gender}` : ''}{patient.cpf ? ` • CPF: ${patient.cpf}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <span className={`pill status ${statusClass(patient.risk)}`}>{patient.risk}</span>
          <span className="pill subtle">{patientExams.length} antibiogramas</span>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h3>Dados do paciente</h3>
        </div>
        <div className="patient-detail-grid">
          <div className="patient-detail-field">
            <span className="patient-detail-label">Nome completo</span>
            <span className="patient-detail-value">{patient.name}</span>
          </div>
          <div className="patient-detail-field">
            <span className="patient-detail-label">Idade</span>
            <span className="patient-detail-value">{patient.age} anos</span>
          </div>
          {patient.birthDate && (
            <div className="patient-detail-field">
              <span className="patient-detail-label">Data de nascimento</span>
              <span className="patient-detail-value">
                {new Date(patient.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          {patient.gender && (
            <div className="patient-detail-field">
              <span className="patient-detail-label">Sexo</span>
              <span className="patient-detail-value">{patient.gender}</span>
            </div>
          )}
          {patient.cpf && (
            <div className="patient-detail-field">
              <span className="patient-detail-label">CPF</span>
              <span className="patient-detail-value">{patient.cpf}</span>
            </div>
          )}
          {patient.rg && (
            <div className="patient-detail-field">
              <span className="patient-detail-label">RG</span>
              <span className="patient-detail-value">{patient.rg}</span>
            </div>
          )}
          {patient.phone && (
            <div className="patient-detail-field">
              <span className="patient-detail-label">Telefone</span>
              <span className="patient-detail-value">{patient.phone}</span>
            </div>
          )}
          <div className="patient-detail-field">
            <span className="patient-detail-label">Risco</span>
            <span className={`pill status ${statusClass(patient.risk)}`}>{patient.risk}</span>
          </div>
          {patient.observations && (
            <div className="patient-detail-field patient-detail-field--full">
              <span className="patient-detail-label">Observações clínicas</span>
              <span className="patient-detail-value">{patient.observations}</span>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Antibiogramas do paciente</h3>
        </div>
        {examsQuery.isLoading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <Spinner />
          </div>
        ) : patientExams.length === 0 ? (
          <p className="muted" style={{ padding: 'var(--space-4)' }}>
            Nenhum antibiograma registrado para este paciente.
          </p>
        ) : (
          <ul className="list">
            {patientExams.map((exam) => (
              <li key={exam.id} className="list-row list-row--stacked">
                <div className="list-row__body">
                  <Link className="list-title" to={`/app/exams/${exam.id}`}>{exam.organism}</Link>
                  <p className="muted small">
                    {exam.specimen} • {exam.site}
                  </p>
                  <p className="muted small">Médico solicitante: {exam.doctorName ?? 'Médico'}</p>
                  {exam.notes && (
                    <p className="muted small" style={{ marginTop: 'var(--space-1)', fontStyle: 'italic' }}>
                      Observações: {exam.notes}
                    </p>
                  )}
                  <div className="list-row__footer">
                    <span className={`pill status ${statusClass(exam.status)}`}>{exam.status}</span>
                    <span className="list-row__elapsed">{formatDateTime(exam.collectedAt)}</span>
                    <span className="list-row__elapsed">Origem: {exam.source}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
