// ── Tipos compartilhados (alinhados com os DTOs do backend) ─────────────────

export type UserStatus = 'Ativo' | 'Inativo'

/** Resposta de /v1/users/me e /v1/auth/login.user */
export type User = {
  id?: string
  name: string
  email: string
  role: string
  shift: string
  status?: UserStatus
  doctorId?: string
  createdAt?: string
}

/** Resposta de /v1/attachments */
export type Attachment = {
  id: string
  fileName: string
  /** O backend retorna `fileType`; alguns mocks legados ainda usam `type`. */
  fileType?: string
  type?: string
  /** Em bytes (do backend). Pode também vir como string formatada de mocks legados. */
  fileSize?: number
  size?: string
  storageUrl?: string
  uploadedBy?: string
  uploadedAt: string
  notes?: string
}

export type Appointment = {
  id: string
  patient?: string
  patientName?: string
  schedule?: string
  scheduledAt?: string
  location: string
  type: string
}

export type Interpretation = 'S' | 'I' | 'R'

export type AntibiogramEntry = {
  id?: string
  antibiotic: string
  mic: string
  interpretation: Interpretation
  sortOrder?: number
}

export type ExamStatus = 'Pendente' | 'Em análise' | 'Pendente de avaliação' | 'Finalizado'
export type ExamSource = 'OneDrive' | 'Bucket'

export type Exam = {
  id: string
  patientId: string
  patientName?: string
  doctorId: string
  doctorName?: string
  organism: string
  specimen: string
  /** Format "YYYY-MM-DD HH:mm" como retornado pelo backend */
  collectedAt: string
  status: ExamStatus
  source: ExamSource
  previewUrl: string
  antibiogram: AntibiogramEntry[]
  site: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type PatientRisk = 'Verde' | 'Amarelo' | 'Vermelho'
export type PatientGender = 'Masculino' | 'Feminino' | 'Outro'

export type Patient = {
  id: string
  name: string
  cpf?: string
  rg?: string
  birthDate: string
  age: number           // calculado pelo backend — somente leitura
  gender?: PatientGender
  phone?: string
  risk: PatientRisk
  observations?: string
  createdAt?: string
  updatedAt?: string
}

export type Doctor = {
  id: string
  name: string
  specialty: string
  shift: string
  recentExams?: Array<{ id: string; organism: string; status: string }>
}

/** Wrapper paginado retornado pelo backend (PageResponse<T>) */
export type PageResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}

// ── Reports ─────────────────────────────────────────────────────────────────

export type ReportStatus = 'pending' | 'generating' | 'ready' | 'error'

export type Report = {
  id: string
  examId: string
  title: string
  patientName?: string
  status: ReportStatus
  storageUrl?: string
  generatedAt?: string
  generatedBy?: string
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export type DashboardRecentExam = {
  id: string
  patientName: string
  organism: string
  collectedAt: string
  status: string
  previewUrl: string
}

export type DashboardExamStats = {
  total: number
  byStatus: Record<string, number>
  recentFinalized: DashboardRecentExam[]
}

export type DashboardResponse = {
  exams: DashboardExamStats
  attachments: {
    total: number
    recent: Array<{
      id: string
      fileName: string
      uploadedAt: string
    }>
  }
  appointments: Array<{
    id: string
    patientName: string
    scheduledAt: string
    location: string
    type: string
  }>
}

// ── Admin ───────────────────────────────────────────────────────────────────

export type AdminStats = {
  exams: {
    total: number
    pendente: number
    emAnalise: number
    pendenteAvaliacao: number
    finalizado: number
  }
  patients: { total: number }
  doctors: { total: number }
  users: { total: number; active: number }
}

export type AdminSettings = {
  scriptName: string
  serverPort: string
}

// ── OneDrive ────────────────────────────────────────────────────────────────

export type OneDriveStatus = {
  connected: boolean
  accountEmail: string
  syncFolder: string
  lastSync: string
}
