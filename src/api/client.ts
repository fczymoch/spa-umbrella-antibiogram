import axios from 'axios'

// Backend Spring Boot roda em 8080 e expõe tudo sob /v1
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Interceptor de requisição ────────────────────────────────────────────────
// Injeta o Bearer token em todas as chamadas (se existir).
// Para uploads multipart/form-data, deixa o browser definir o Content-Type
// automaticamente (com o boundary correto).
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('biolab:token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// ── Interceptor de resposta ──────────────────────────────────────────────────
// Captura 401 (token expirado / inválido) e limpa a sessão
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('biolab:token')
      localStorage.removeItem('biolab:refresh')
      localStorage.removeItem('biolab:user')
      // Redireciona para o login sem depender do React Router
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

/** Helper para extrair mensagem de erro amigável das respostas do backend. */
export function extractErrorMessage(error: unknown, fallback = 'Erro inesperado'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error || data?.message || error.message || fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}
