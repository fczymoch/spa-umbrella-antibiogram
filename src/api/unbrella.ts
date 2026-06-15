// Cliente mínimo para a API Unbrella descrita em API_INTEGRACAO.md
// Não usa o `apiClient` (que aponta para o backend principal). Esta API roda em outro host/porta.

const BASE = (import.meta.env.VITE_UNBRELLA_URL as string | undefined) ?? 'http://localhost:5055'
export const UNBRELLA_BASE = BASE

export interface CreateAntibioParams {
  pacienteId: string
  /** campos opcionais que podemos passar */
  medico?: string
  preset?: string
  notes?: string
}

export interface AntibioCreateResponse {
  paciente_id: string
  resumoUrl?: string
  message?: string
}

export async function createAntibiogram(params: CreateAntibioParams): Promise<AntibioCreateResponse> {
  const res = await fetch(`${BASE}/paciente/${encodeURIComponent(params.pacienteId)}/resumo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medico: params.medico, preset: params.preset, notes: params.notes }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Unbrella API error: ${res.status} ${txt}`)
  }
  const data = await res.json()
  return data as AntibioCreateResponse
}

/** Helpers para imagens retornadas pelo serviço Unbrella */
export function imageUrl(pacienteId: string, tipo: 'geral' | 'grid' | 'barras' | 'evolucao_todos') {
  return `${BASE}/paciente/${encodeURIComponent(pacienteId)}/imagem/${tipo}`
}

export function diskImageUrl(pacienteId: string, discoId: number, tipo: 'analise' | 'evolucao' | 'dados') {
  // `dados` retorna JSON; `analise` e `evolucao` retornam PNG
  return `${BASE}/paciente/${encodeURIComponent(pacienteId)}/disco/${discoId}/${tipo}`
}

// ── Novos endpoints /antibiograma/ ────────────────────────────────────────────

export interface AntibiogramaDiscoDado {
  disco_id: number
  disco_preto_mm: number
  halo_fim_mm: number
  halo_largura_mm: number
  angulo_graus: number
  n_frames: number
  url_analise: string
}

export interface AntibiogramaStatus {
  paciente_id: string
  nome: string
  status: string
  total_discos: number
  total_frames: number
  calibracao: string
  discos: AntibiogramaDiscoDado[]
}

/** GET /antibiograma/{pid}/status — retorna status + dados dos 18 discos */
export async function getAntibiogramaStatus(pacienteId: string): Promise<AntibiogramaStatus> {
  const res = await fetch(`${BASE}/antibiograma/${encodeURIComponent(pacienteId)}/status`)
  if (!res.ok) throw new Error(`Unbrella API error: ${res.status}`)
  return res.json() as Promise<AntibiogramaStatus>
}

/** URL do PNG com 4 painéis de análise do disco — /antibiograma/{pid}/disco/{did}/analise */
export function antibiogramaDiscoAnaliseUrl(pacienteId: string, discoId: number): string {
  return `${BASE}/antibiograma/${encodeURIComponent(pacienteId)}/disco/${discoId}/analise`
}
