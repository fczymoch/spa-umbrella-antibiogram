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
